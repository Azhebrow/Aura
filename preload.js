const { contextBridge } = require('electron');

// Здесь можно добавить безопасные API для renderer процесса
// Пока оставляем пустым, так как у нас есть nodeIntegration: false

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  dialog: {
    showOpenDialog: (options) => ipcRenderer.invoke('dialog:showOpenDialog', options),
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options)
  }
});


















