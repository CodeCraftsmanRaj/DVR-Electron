const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // Scan functions
  openFileDialog: () => ipcRenderer.invoke("dialog:openFile"),
  startScan: (settings) => ipcRenderer.send("start-scan", settings),

  // Extractor functions
  openImageDialog: () => ipcRenderer.invoke("dialog:openImage"),
  openMasterFileDialog: () => ipcRenderer.invoke("dialog:openMasterFile"),
  startExtraction: (settings) => ipcRenderer.send("start-extraction", settings),

  // Shared functions
  openOutputDialog: () => ipcRenderer.invoke("dialog:openOutput"),
  onScanUpdate: (callback) => ipcRenderer.on("scan-update", callback),
  onExtractionComplete: (callback) =>
    ipcRenderer.on("extraction-complete", callback),
  onScanError: (callback) => ipcRenderer.on("scan-error", callback),
  onScanComplete: (callback) => ipcRenderer.on("scan-complete", callback),
  onScanLog: (callback) => ipcRenderer.on("scan-log", callback),
});
