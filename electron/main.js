const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron')
const path = require('path')
const url = require('url')
const fs = require('fs')

// Register privilege schemes for custom protocols
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
  { scheme: 'media', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
])

let mainWindow = null

function getRendererDistPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ts/dist')
  }
  return path.join(__dirname, '../ts/dist')
}

function createWindow() {
  const useHiddenInsetTitlebar = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#f5f5f7',
    icon: path.join(__dirname, 'build', 'icon.png'),
    titleBarStyle: useHiddenInsetTitlebar ? 'hiddenInset' : 'hidden',
    ...(useHiddenInsetTitlebar
      ? { trafficLightPosition: { x: 14, y: 14 } }
      : {
          titleBarOverlay: {
            color: '#f5f5f7',
            symbolColor: '#222222',
            height: 32
          }
        }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Load custom dev URL if in development, else load using app custom protocol
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  if (isDev) {
    mainWindow.loadURL('http://localhost:48673/my-dam/')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadURL('app://./index.html')
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Set up protocol handlers
app.whenReady().then(() => {
  // App Protocol Handler (production static asset routing)
  protocol.handle('app', (request) => {
    const requestUrl = new URL(request.url)
    let pathname = decodeURIComponent(requestUrl.pathname)
    
    // Strip Vite sub-directory base path prefix if present
    if (pathname.startsWith('/my-dam/')) {
      pathname = pathname.slice('/my-dam/'.length)
    }
    if (pathname === '' || pathname === '/') {
      pathname = 'index.html'
    }
    
    const filePath = path.join(getRendererDistPath(), pathname)
    return net.fetch(url.pathToFileURL(filePath).toString())
  })

  // Media Protocol Handler (CORS-enabled direct local media player loading)
  protocol.handle('media', (request) => {
    let filePath = decodeURIComponent(request.url.slice('media://'.length))
    // On Windows, resolve leading slash (e.g. /C:/Users/...)
    if (process.platform === 'win32' && filePath.startsWith('/')) {
      filePath = filePath.slice(1)
    }
    return net.fetch(url.pathToFileURL(filePath).toString())
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC File System Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  })
  if (result.canceled) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle('read-directory', async (event, dirPath) => {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
  return entries.map(entry => {
    const absolutePath = path.join(dirPath, entry.name)
    return {
      name: entry.name,
      isDirectory: entry.isDirectory(),
      absolutePath: absolutePath
    }
  })
})

ipcMain.handle('read-file', async (event, filePath) => {
  const stats = await fs.promises.stat(filePath)
  const buffer = await fs.promises.readFile(filePath)
  return {
    buffer: new Uint8Array(buffer),
    lastModified: stats.mtimeMs,
    size: stats.size
  }
})

ipcMain.handle('write-file', async (event, filePath, data) => {
  // Convert standard buffer types to Node buffer
  let writeBuffer = data
  if (typeof data === 'object' && data.buffer) {
    writeBuffer = Buffer.from(data.buffer)
  }
  await fs.promises.writeFile(filePath, writeBuffer)
  return true
})

ipcMain.handle('mkdir', async (event, dirPath) => {
  await fs.promises.mkdir(dirPath, { recursive: true })
  return true
})

ipcMain.handle('remove', async (event, itemPath) => {
  await fs.promises.rm(itemPath, { recursive: true, force: true })
  return true
})

ipcMain.handle('join-path', (event, ...parts) => {
  return path.join(...parts)
})

ipcMain.handle('create-empty-file', async (event, filePath) => {
  await fs.promises.writeFile(filePath, '')
  return true
})

ipcMain.handle('is-electron', () => true)
