const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });
    mainWindow.loadFile('src/ui/index.html');
    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }
}

async function handleFileOpen() {
    const { canceled, filePaths } = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [
            { name: 'Videos', extensions: ['mp4', 'avi', 'mov', 'mkv'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (!canceled) {
        return filePaths;
    }
}

app.whenReady().then(() => {
    ipcMain.handle('dialog:openFile', handleFileOpen);
    createWindow();
});

ipcMain.on('start-scan', (event, scanSettings) => {
    let executablePath;
    let commandArgs = [];
    let options = {};

    if (!app.isPackaged) {
        // DEVELOPMENT
        const pythonExecutableName = process.platform === 'win32' ? 'python.exe' : 'python3';
        const venvPath = process.platform === 'win32' ? 'Scripts' : 'bin';
        executablePath = path.join(__dirname, '..', 'dvr-scan-py', '.venv', venvPath, pythonExecutableName);
        options.cwd = path.join(__dirname, '..', 'dvr-scan-py');
        commandArgs.push('-m', 'dvr_scan');
    } else {
        // PRODUCTION
        const engineName = process.platform === 'win32' ? 'dvr-scan-engine.exe' : 'dvr-scan-engine';
        executablePath = path.join(process.resourcesPath, engineName);
    }
    
    // --- Build Command Arguments from UI Settings ---
    
    // Basic Settings
    if (scanSettings.input && scanSettings.input.length > 0) {
        commandArgs.push('-i', ...scanSettings.input);
    }
    if (scanSettings.threshold) {
        commandArgs.push('-t', scanSettings.threshold);
    }
    if (scanSettings.minEventLength) {
        commandArgs.push('-l', scanSettings.minEventLength);
    }
    if (scanSettings.scanOnly) {
        commandArgs.push('--scan-only');
    } else if (scanSettings.outputMode) {
        commandArgs.push('-m', scanSettings.outputMode);
    }

    // Overlays (Flags that don't take a value)
    if (scanSettings.boundingBox) {
        commandArgs.push('--bounding-box');
    }
    if (scanSettings.timeCode) {
        commandArgs.push('--time-code');
    }
    if (scanSettings.frameMetrics) {
        commandArgs.push('--frame-metrics');
    }
    
    // Performance (Flags that take a value)
    if (scanSettings.frameSkip && parseInt(scanSettings.frameSkip, 10) > 0) {
        commandArgs.push('--frame-skip', scanSettings.frameSkip);
    }
    if (scanSettings.downscaleFactor && parseInt(scanSettings.downscaleFactor, 10) > 1) {
        commandArgs.push('--downscale-factor', scanSettings.downscaleFactor);
    }

    // Region of Interest (Complex flag)
    if (scanSettings.regionData && scanSettings.regionData.trim() !== '') {
        // Split the string by any whitespace (spaces, newlines, tabs)
        const points = scanSettings.regionData.trim().split(/\s+/);
        
        // Basic validation: must have at least 6 coordinates (3 points) and be an even number
        if (points.length >= 6 && points.length % 2 === 0) {
             commandArgs.push('-a', ...points);
        } else {
             event.sender.send('scan-error', 'Invalid Region Data: Must be pairs of numbers (at least 3 pairs).');
             return; // Stop the scan
        }
    }
    
    // --- End of Argument Building ---

    commandArgs.push('--ignore-user-config');
    commandArgs.push('--json-output');

    // For debugging, print the exact command we're about to run
    console.log(`[DEBUG] Running command: ${executablePath} ${commandArgs.join(' ')}`);
    
    const dvrScanProcess = spawn(executablePath, commandArgs, options);
    
    dvrScanProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim() !== '');
        lines.forEach(line => {
            try {
                const parsed = JSON.parse(line);
                event.sender.send('scan-update', parsed);
            } catch (e) {
                event.sender.send('scan-log', `[PYTHON LOG] ${line}`);
            }
        });
    });

    dvrScanProcess.stderr.on('data', (data) => {
        event.sender.send('scan-error', data.toString());
    });

    dvrScanProcess.on('close', (code) => {
        event.sender.send('scan-complete', `Process exited with code ${code}`);
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});