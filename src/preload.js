const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // This is our new function to call the file dialog
    openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),

    startScan: (settings) => ipcRenderer.send('start-scan', settings),
    onScanUpdate: (callback) => ipcRenderer.on('scan-update', callback),
    onScanError: (callback) => ipcRenderer.on('scan-error', callback),
    onScanComplete: (callback) => ipcRenderer.on('scan-complete', callback),
    onScanLog: (callback) => ipcRenderer.on('scan-log', callback)
});