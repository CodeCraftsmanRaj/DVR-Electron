const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // === Scan Functions ===
  openFileDialog: () => ipcRenderer.invoke("dialog:openFile"),
  startScan: (settings) => ipcRenderer.send("start-scan", settings),

  // === Hikvision Functions ===
  openImageDialog: () => ipcRenderer.invoke("dialog:openImage"),
  openMasterFileDialog: () => ipcRenderer.invoke("dialog:openMasterFile"),
  startHikvisionTask: (task, settings) =>
    ipcRenderer.send("start-hikvision-task", { task, settings }),

  // ADD THIS NEW FUNCTION TO READ PARSED DATA
  readHikvisionResults: (outputDir) =>
    ipcRenderer.invoke("files:readHikvisionResults", outputDir),

  // === Shared Functions ===
  openOutputDialog: () => ipcRenderer.invoke("dialog:openOutput"),

  // === Listeners from Main Process ===
  onScanUpdate: (callback) => ipcRenderer.on("scan-update", callback),
  onHikvisionUpdate: (callback) => ipcRenderer.on("hikvision-update", callback),
  onScanError: (callback) => ipcRenderer.on("scan-error", callback),
  onScanComplete: (callback) => ipcRenderer.on("scan-complete", callback),
  onScanLog: (callback) => ipcRenderer.on("scan-log", callback),
});
