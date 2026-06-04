const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
  mkdir: (dirPath) => ipcRenderer.invoke('mkdir', dirPath),
  remove: (itemPath) => ipcRenderer.invoke('remove', itemPath),
  joinPath: (...parts) => ipcRenderer.invoke('join-path', ...parts),
  createEmptyFile: (filePath) => ipcRenderer.invoke('create-empty-file', filePath),
  isElectron: () => ipcRenderer.invoke('is-electron')
})
