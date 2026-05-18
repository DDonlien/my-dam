export {}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: {
      id?: string
      mode?: 'read' | 'readwrite'
      startIn?:
        | 'desktop'
        | 'documents'
        | 'downloads'
        | 'music'
        | 'pictures'
        | 'videos'
    }) => Promise<FileSystemDirectoryHandle>
  }

  interface FileSystemHandle {
    readonly kind: 'file' | 'directory'
    readonly name: string
    isSameEntry?: (other: FileSystemHandle) => Promise<boolean>
    queryPermission?: (descriptor?: {
      mode?: 'read' | 'readwrite'
    }) => Promise<PermissionState>
    requestPermission?: (descriptor?: {
      mode?: 'read' | 'readwrite'
    }) => Promise<PermissionState>
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    readonly kind: 'file'
    getFile: () => Promise<File>
    createWritable: () => Promise<FileSystemWritableFileStream>
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    readonly kind: 'directory'
    entries: () => AsyncIterableIterator<[string, FileSystemHandle]>
    values: () => AsyncIterableIterator<FileSystemHandle>
    getDirectoryHandle: (
      name: string,
      options?: { create?: boolean },
    ) => Promise<FileSystemDirectoryHandle>
    getFileHandle: (
      name: string,
      options?: { create?: boolean },
    ) => Promise<FileSystemFileHandle>
    removeEntry: (
      name: string,
      options?: { recursive?: boolean },
    ) => Promise<void>
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write: (data: BufferSource | Blob | string) => Promise<void>
    close: () => Promise<void>
  }
}
