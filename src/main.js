const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs").promises; // Use the promise-based version of fs

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadFile("src/ui/index.html");
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}

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

async function handleOpenOutput() {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Select Output Directory",
    properties: ["openDirectory", "createDirectory"],
  });
  return canceled ? null : filePaths[0];
}

// New handler to read the JSON results files
ipcMain.handle("files:readHikvisionResults", async (event, outputDir) => {
  try {
    const hikbtreePath = path.join(outputDir, "hikbtree.json");
    // You could also read system_logs.json here if you want to display that data too
    // const logsPath = path.join(outputDir, "system_logs.json");

    const hikbtreeData = await fs.readFile(hikbtreePath, "utf-8");

    return {
      success: true,
      data: {
        hikbtree: JSON.parse(hikbtreeData),
      },
    };
  } catch (error) {
    console.error("Failed to read forensic result files:", error);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(() => {
  ipcMain.handle("dialog:openFile", handleFileOpen);
  ipcMain.handle("dialog:openImage", handleImageOpen);
  ipcMain.handle("dialog:openMasterFile", handleMasterFileOpen);
  ipcMain.handle("dialog:openOutput", handleOpenOutput);
  createWindow();
});

function getBaseCommandArgs() {
  let executablePath,
    commandArgs = [],
    options = {};
  if (!app.isPackaged) {
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
  commandArgs.push("--ignore-user-config", "--json-output");
  return { executablePath, commandArgs, options };
}

function runPythonEngine(event, executablePath, commandArgs, options) {
  console.log(
    `[DEBUG] Running command: ${executablePath} ${commandArgs.join(" ")}`
  );
  const childProcess = spawn(executablePath, commandArgs, options);

  childProcess.stdout.on("data", (data) => {
    const lines = data
      .toString()
      .split("\n")
      .filter((line) => line.trim() !== "");
    lines.forEach((line) => {
      try {
        const parsed = JSON.parse(line);
        if (
          parsed.type &&
          (parsed.type.startsWith("hik_") || parsed.type === "extract_complete")
        ) {
          event.sender.send("hikvision-update", parsed);
        } else {
          event.sender.send("scan-update", parsed);
        }
      } catch (e) {
        event.sender.send("scan-log", `[PYTHON LOG] ${line}`);
      }
    });
  });
  childProcess.stderr.on("data", (data) =>
    event.sender.send("scan-error", data.toString())
  );
  childProcess.on("close", (code) =>
    event.sender.send("scan-complete", `Process exited with code ${code}`)
  );
}

ipcMain.on("start-scan", (event, settings) => {
  const { executablePath, commandArgs, options } = getBaseCommandArgs();
  commandArgs.push("scan");
  if (settings.input?.length) commandArgs.push("-i", ...settings.input);
  if (settings.threshold) commandArgs.push("-t", settings.threshold);
  if (settings.minEventLength) commandArgs.push("-l", settings.minEventLength);
  if (settings.scanOnly) {
    commandArgs.push("--scan-only");
  } else {
    if (settings.outputMode) commandArgs.push("-m", settings.outputMode);
    if (settings.outputDir) commandArgs.push("-d", settings.outputDir);
  }
  if (settings.boundingBox) commandArgs.push("--bounding-box");
  if (settings.timeCode) commandArgs.push("--time-code");
  if (settings.frameMetrics) commandArgs.push("--frame-metrics");
  if (settings.frameSkip && parseInt(settings.frameSkip, 10) > 0)
    commandArgs.push("--frame-skip", settings.frameSkip);
  if (settings.downscaleFactor && parseInt(settings.downscaleFactor, 10) > 1)
    commandArgs.push("--downscale-factor", settings.downscaleFactor);
  if (settings.regionData && settings.regionData.trim() !== "") {
    const points = settings.regionData.trim().split(/\s+/);
    if (points.length >= 6 && points.length % 2 === 0) {
      commandArgs.push("-a", ...points);
    } else {
      return event.sender.send(
        "scan-error",
        "Invalid Region Data: Must be pairs of numbers (at least 3 pairs)."
      );
    }
  }
  runPythonEngine(event, executablePath, commandArgs, options);
});

ipcMain.on("start-hikvision-task", (event, { task, settings }) => {
  const { executablePath, commandArgs, options } = getBaseCommandArgs();
  commandArgs.push("hikvision", task);
  if (settings.image) commandArgs.push("--image", settings.image);
  if (settings.output_file) commandArgs.push("-o", settings.output_file);
  if (settings.output_dir) commandArgs.push("-d", settings.output_dir);
  if (settings.master_file)
    commandArgs.push("--master-file", settings.master_file);
  if (settings.extra_offset)
    commandArgs.push("--extra-offset", settings.extra_offset.toString());
  if (settings.offset) commandArgs.push("--offset", settings.offset);
  runPythonEngine(event, executablePath, commandArgs, options);
});

app.on("window-all-closed", () => process.platform !== "darwin" && app.quit());
app.on(
  "activate",
  () => BrowserWindow.getAllWindows().length === 0 && createWindow()
);
