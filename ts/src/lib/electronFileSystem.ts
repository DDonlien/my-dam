interface ElectronItem {
  name: string
  isDirectory: boolean
  absolutePath: string
}

type ElectronBridge = {
  selectDirectory: () => Promise<string | null>
  readDirectory: (dirPath: string) => Promise<ElectronItem[]>
  readFile: (filePath: string) => Promise<{
    buffer: ArrayBuffer | Uint8Array | number[]
    lastModified: number
    size: number
  }>
  writeFile: (filePath: string, data: Uint8Array | string) => Promise<boolean>
  mkdir: (dirPath: string) => Promise<boolean>
  remove: (itemPath: string) => Promise<boolean>
  joinPath: (...parts: string[]) => Promise<string>
  createEmptyFile: (filePath: string) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI?: ElectronBridge
  }
}

const electronFilePaths = new WeakMap<Blob, string>()

const getElectronAPI = () => {
  if (!window.electronAPI) throw new Error('Electron API is not available.')
  return window.electronAPI
}

export class ElectronDirectoryHandle {
  readonly kind = 'directory'
  readonly absolutePath: string
  readonly name: string

  constructor(absolutePath: string, name: string) {
    this.absolutePath = absolutePath
    this.name = name
  }

  async *entries(): AsyncIterableIterator<[string, FileSystemHandle]> {
    const items = await getElectronAPI().readDirectory(this.absolutePath)
    for (const item of items) {
      if (item.isDirectory) {
        yield [item.name, new ElectronDirectoryHandle(item.absolutePath, item.name) as unknown as FileSystemDirectoryHandle]
      } else {
        yield [item.name, new ElectronFileHandle(item.absolutePath, item.name) as unknown as FileSystemFileHandle]
      }
    }
  }

  async *keys(): AsyncIterableIterator<string> {
    const items = await getElectronAPI().readDirectory(this.absolutePath)
    for (const item of items) yield item.name
  }

  async *values(): AsyncIterableIterator<FileSystemHandle> {
    const items = await getElectronAPI().readDirectory(this.absolutePath)
    for (const item of items) {
      if (item.isDirectory) {
        yield new ElectronDirectoryHandle(item.absolutePath, item.name) as unknown as FileSystemDirectoryHandle
      } else {
        yield new ElectronFileHandle(item.absolutePath, item.name) as unknown as FileSystemFileHandle
      }
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<[string, FileSystemHandle]> {
    yield* this.entries()
  }

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle> {
    const subPath = await getElectronAPI().joinPath(this.absolutePath, name)
    if (options?.create) {
      await getElectronAPI().mkdir(subPath)
    }
    return new ElectronDirectoryHandle(subPath, name) as unknown as FileSystemDirectoryHandle
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle> {
    const filePath = await getElectronAPI().joinPath(this.absolutePath, name)
    if (options?.create) {
      await getElectronAPI().createEmptyFile(filePath)
    }
    return new ElectronFileHandle(filePath, name) as unknown as FileSystemFileHandle
  }

  async removeEntry(name: string): Promise<void> {
    const itemPath = await getElectronAPI().joinPath(this.absolutePath, name)
    await getElectronAPI().remove(itemPath)
  }

  async resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null> {
    const desc = possibleDescendant as ElectronDirectoryHandle | ElectronFileHandle
    if (typeof desc.absolutePath !== 'string') return null
    if (!desc.absolutePath.startsWith(this.absolutePath)) return null
    const relative = desc.absolutePath.slice(this.absolutePath.length).split(/[/\\]/).filter(Boolean)
    return relative
  }

  async isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return other instanceof ElectronDirectoryHandle && other.absolutePath === this.absolutePath
  }

  queryPermission(): Promise<PermissionState> {
    return Promise.resolve('granted')
  }

  requestPermission(): Promise<PermissionState> {
    return Promise.resolve('granted')
  }
}

export class ElectronFileHandle {
  readonly kind = 'file'
  readonly absolutePath: string
  readonly name: string

  constructor(absolutePath: string, name: string) {
    this.absolutePath = absolutePath
    this.name = name
  }

  async getFile(): Promise<File> {
    const { buffer, lastModified } = await getElectronAPI().readFile(this.absolutePath)
    const bytes = buffer instanceof Uint8Array
      ? buffer
      : buffer instanceof ArrayBuffer
        ? new Uint8Array(buffer)
        : new Uint8Array(buffer)
    const blob = new Blob([bytes.slice().buffer])
    const file = new File([blob], this.name, { lastModified })
    electronFilePaths.set(file, this.absolutePath)
    return file
  }

  async createWritable(): Promise<FileSystemWritableFileStream> {
    return new ElectronWritableFileStream(this.absolutePath) as unknown as FileSystemWritableFileStream
  }

  async isSameEntry(other: FileSystemHandle): Promise<boolean> {
    return other instanceof ElectronFileHandle && other.absolutePath === this.absolutePath
  }

  queryPermission(): Promise<PermissionState> {
    return Promise.resolve('granted')
  }

  requestPermission(): Promise<PermissionState> {
    return Promise.resolve('granted')
  }
}

class ElectronWritableFileStream {
  private readonly absolutePath: string
  private chunks: Array<Blob | Uint8Array | string> = []

  constructor(absolutePath: string) {
    this.absolutePath = absolutePath
  }

  async write(content: Blob | BufferSource | string): Promise<void> {
    if (ArrayBuffer.isView(content)) {
      this.chunks.push(new Uint8Array(content.buffer, content.byteOffset, content.byteLength))
      return
    }
    if (content instanceof ArrayBuffer) {
      this.chunks.push(new Uint8Array(content))
      return
    }
    this.chunks.push(content)
  }

  async seek(): Promise<void> {
    throw new Error('Seek is not supported in Electron polyfill.')
  }

  async truncate(): Promise<void> {
    throw new Error('Truncate is not supported in Electron polyfill.')
  }

  async close(): Promise<void> {
    let data: Uint8Array | string
    if (this.chunks.length === 1 && (typeof this.chunks[0] === 'string' || this.chunks[0] instanceof Uint8Array)) {
      data = this.chunks[0]
    } else {
      const parts: Uint8Array[] = []
      for (const chunk of this.chunks) {
        if (chunk instanceof Blob || chunk instanceof File) {
          parts.push(new Uint8Array(await chunk.arrayBuffer()))
        } else if (typeof chunk === 'string') {
          parts.push(new TextEncoder().encode(chunk))
        } else {
          parts.push(chunk)
        }
      }
      const totalLength = parts.reduce((acc, val) => acc + val.length, 0)
      const combined = new Uint8Array(totalLength)
      let offset = 0
      for (const part of parts) {
        combined.set(part, offset)
        offset += part.length
      }
      data = combined
    }
    await getElectronAPI().writeFile(this.absolutePath, data)
  }
}

export function installElectronFileSystem() {
  if (typeof window === 'undefined' || !window.electronAPI) return

  document.documentElement.classList.add('is-electron')

  window.showDirectoryPicker = async () => {
    const selectedPath = await getElectronAPI().selectDirectory()
    if (!selectedPath) {
      throw new DOMException('The user aborted a request.', 'AbortError')
    }
    const name = selectedPath.split(/[/\\]/).filter(Boolean).pop() || 'root'
    return new ElectronDirectoryHandle(selectedPath, name) as unknown as FileSystemDirectoryHandle
  }

  const originalCreateObjectURL = URL.createObjectURL
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    if (obj instanceof Blob) {
      const filePath = electronFilePaths.get(obj)
      if (filePath) {
        return `media://${encodeURIComponent(filePath.replace(/\\/g, '/'))}`
      }
    }
    return originalCreateObjectURL(obj)
  }
}
