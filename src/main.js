const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 800, // Increased height for the new UI
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadFile("src/ui/index.html");
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

// Dialog for selecting video files for scanning
async function handleFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "Videos", extensions: ["mp4", "avi", "mov", "mkv"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return canceled ? null : filePaths;
}

// Dialog for selecting a single image file for extraction
async function handleImageOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Disk Images", extensions: ["dd", "e01", "ewf", "img", "raw"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return canceled ? null : filePaths[0];
}

// Dialog for selecting the JSON master file
async function handleMasterFileOpen() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "JSON Files", extensions: ["json"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  return canceled ? null : filePaths[0];
}

// Dialog for selecting an output directory
async function handleOpenOutput() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Select Output Directory",
    properties: ["openDirectory", "createDirectory"],
  });
  return canceled ? null : filePaths[0];
}

app.whenReady().then(() => {
  ipcMain.handle("dialog:openFile", handleFileOpen);
  ipcMain.handle("dialog:openImage", handleImageOpen);
  ipcMain.handle("dialog:openMasterFile", handleMasterFileOpen);
  ipcMain.handle("dialog:openOutput", handleOpenOutput);
  createWindow();
});

function runPythonEngine(event, executablePath, commandArgs, options) {
  console.log(
    `[DEBUG] Running command: ${executablePath} ${commandArgs.join(" ")}`
  );

  const dvrScanProcess = spawn(executablePath, commandArgs, options);

  dvrScanProcess.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim() !== "");
    lines.forEach((line) => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.type === "extract_complete") {
          event.sender.send("extraction-complete", parsed);
        } else {
          event.sender.send("scan-update", parsed);
        }
      } catch (e) {
        event.sender.send("scan-log", `[PYTHON LOG] ${line}`);
      }
    });
  });

  dvrScanProcess.stderr.on("data", (data) => {
    event.sender.send("scan-error", data.toString());
  });

  dvrScanProcess.on("close", (code) => {
    event.sender.send("scan-complete", `Process exited with code ${code}`);
  });
}

// Function to get the base command arguments for the Python engine
function getBaseCommandArgs() {
  let executablePath;
  let commandArgs = [];
  let options = {};

  if (!app.isPackaged) {
    // CORRECTED: Use 'python' on Linux/macOS as that's the name in the venv
    const pythonExecutableName =
      process.platform === "win32" ? "python.exe" : "python";
    const venvPath = process.platform === "win32" ? "Scripts" : "bin";
    executablePath = path.join(
      __dirname,
      "..",
      "dvr-scan-py",
      ".venv",
      venvPath,
      pythonExecutableName
    );
    options.cwd = path.join(__dirname, "..", "dvr-scan-py");
    commandArgs.push("-m", "dvr_scan");
  } else {
    const engineName =
      process.platform === "win32" ? "dvr-scan-engine.exe" : "dvr-scan-engine";
    executablePath = path.join(process.resourcesPath, engineName);
  }

  // CORRECT ORDER: Add global arguments BEFORE the subcommand
  commandArgs.push("--ignore-user-config", "--json-output");

  return { executablePath, commandArgs, options };
}

ipcMain.on("start-scan", (event, scanSettings) => {
  const { executablePath, commandArgs, options } = getBaseCommandArgs();

  // Add the subcommand and its specific arguments
  commandArgs.push("scan");

  if (scanSettings.input && scanSettings.input.length > 0)
    commandArgs.push("-i", ...scanSettings.input);
  if (scanSettings.threshold) commandArgs.push("-t", scanSettings.threshold);
  if (scanSettings.minEventLength)
    commandArgs.push("-l", scanSettings.minEventLength);
  if (scanSettings.scanOnly) {
    commandArgs.push("--scan-only");
  } else {
    if (scanSettings.outputMode)
      commandArgs.push("-m", scanSettings.outputMode);
    if (scanSettings.outputDir) commandArgs.push("-d", scanSettings.outputDir);
  }
  if (scanSettings.boundingBox) commandArgs.push("--bounding-box");
  if (scanSettings.timeCode) commandArgs.push("--time-code");
  if (scanSettings.frameMetrics) commandArgs.push("--frame-metrics");
  if (scanSettings.frameSkip && parseInt(scanSettings.frameSkip, 10) > 0)
    commandArgs.push("--frame-skip", scanSettings.frameSkip);
  if (
    scanSettings.downscaleFactor &&
    parseInt(scanSettings.downscaleFactor, 10) > 1
  )
    commandArgs.push("--downscale-factor", scanSettings.downscaleFactor);
  if (scanSettings.regionData && scanSettings.regionData.trim() !== "") {
    const points = scanSettings.regionData.trim().split(/\s+/);
    if (points.length >= 6 && points.length % 2 === 0) {
      commandArgs.push("-a", ...points);
    } else {
      event.sender.send(
        "scan-error",
        "Invalid Region Data: Must be pairs of numbers (at least 3 pairs)."
      );
      return;
    }
  }

  runPythonEngine(event, executablePath, commandArgs, options);
});

ipcMain.on("start-extraction", (event, extractSettings) => {
  const { executablePath, commandArgs, options } = getBaseCommandArgs();

  // Add the subcommand and its specific arguments
  commandArgs.push("extract");

  if (extractSettings.imagePath)
    commandArgs.push("--image", extractSettings.imagePath);
  if (extractSettings.masterFile)
    commandArgs.push("--master-file", extractSettings.masterFile);
  if (extractSettings.offset)
    commandArgs.push("--offset", extractSettings.offset);
  if (extractSettings.outputDir)
    commandArgs.push("-d", extractSettings.outputDir);

  runPythonEngine(event, executablePath, commandArgs, options);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
