const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dmfv', {
  getState: () => ipcRenderer.invoke('dashboard:get-state'),
  refreshPrinters: () => ipcRenderer.invoke('dashboard:refresh-printers'),
  saveConfig: (value) => ipcRenderer.invoke('dashboard:save-config', value),
  testProfile: (profile) => ipcRenderer.invoke('dashboard:test-profile', profile),
  openConfigFolder: () => ipcRenderer.invoke('dashboard:open-config-folder'),
  onChanged: (callback) => ipcRenderer.on('dashboard:changed', callback)
});
