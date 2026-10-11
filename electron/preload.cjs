const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, minimal desktop API to renderer with context isolation
contextBridge.exposeInMainWorld('lbookDesktop', {
  isDesktop: true,
  platform: process.platform,
  getApiBaseUrl: () => ipcRenderer.invoke('get-api-base-url'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
});
