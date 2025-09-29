// --- General & Shared Elements ---
const outputArea = document.getElementById("output-area");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");
const progressText = document.getElementById("progress-text");

// --- Tab Elements ---
const tabButtons = document.querySelectorAll(".tab-button");
const panels = document.querySelectorAll(".panel");

// --- Motion Detection Elements ---
const startScanButton = document.getElementById("start-scan-button");
const chooseFilesButton = document.getElementById("choose-files-button");
const removeButton = document.getElementById("remove-button");
const videoListContainer = document.getElementById("video-list-container");
let selectedFilePaths = [];

// --- Hikvision Forensics Elements ---
const hikChooseImageButton = document.getElementById("hik-choose-image-button");
const hikChooseOutputButton = document.getElementById(
  "hik-choose-output-button"
);
const hikImageDisplay = document.getElementById("hik-image-display");
const hikOutputDisplay = document.getElementById("hik-output-display");
const hikStep2Fieldset = document.getElementById("hik-step2-fieldset");
const hikParseAllButton = document.getElementById("hik-parse-all-button");
const masterStatus = document.getElementById("master-status");
const hikbtreeStatus = document.getElementById("hikbtree-status");
const logsStatus = document.getElementById("logs-status");
const hikStep3Fieldset = document.getElementById("hik-step3-fieldset");
const hikOffsetInput = document.getElementById("hik-offset-input");
const hikExtractButton = document.getElementById("hik-extract-button");

// --- Forensic Explorer Elements ---
const explorerOutputDisplay = document.getElementById(
  "explorer-output-display"
);
const loadExplorerDataButton = document.getElementById(
  "load-explorer-data-button"
);
const explorerTableContainer = document.getElementById(
  "explorer-table-container"
);

// --- State Variables ---
let selectedImagePath = null;
let selectedOutputDir = null;
let masterFilePath = null;
let extraOffset = 0;

// ===================================================================
//  INITIALIZATION & TAB SWITCHING
// ===================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Tab Switching Logic
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      panels.forEach((panel) => panel.classList.add("hidden"));
      button.classList.add("active");
      const panelId = button.getAttribute("data-for-panel");
      document.getElementById(panelId).classList.remove("hidden");
      // Clear the shared output area when switching tabs
      outputArea.textContent = "";
      progressContainer.classList.add("hidden");
    });
  });

  // Attach all event listeners
  setupMotionDetectionListeners();
  setupHikvisionListeners();
  setupExplorerListeners(); // New listener setup
  setupIPCListeners();
});

// ===================================================================
//  MOTION DETECTION LOGIC
// ===================================================================
function setupMotionDetectionListeners() {
  chooseFilesButton.addEventListener("click", async () => {
    const filePaths = await window.electronAPI.openFileDialog();
    if (filePaths) {
      selectedFilePaths = filePaths;
      updateVideoList();
    }
  });

  removeButton.addEventListener("click", () => {
    selectedFilePaths = [];
    updateVideoList();
  });

  startScanButton.addEventListener("click", async () => {
    if (selectedFilePaths.length === 0)
      return alert("Please select at least one video file.");
    const scanOnly = document.getElementById("scan-only").checked;
    let outputDir = null;
    if (!scanOnly) {
      outputDir = await window.electronAPI.openOutputDialog();
      if (!outputDir)
        return logToOutput("Scan canceled: No output directory selected.");
    }
    const settings = {
      input: selectedFilePaths,
      outputDir: outputDir,
      threshold: document.getElementById("threshold").value,
      minEventLength: document.getElementById("min-event-length").value,
      outputMode: document.getElementById("output-mode").value,
      scanOnly: scanOnly,
      boundingBox: document.getElementById("bounding-box").checked,
      timeCode: document.getElementById("time-code").checked,
      frameMetrics: document.getElementById("frame-metrics").checked,
      frameSkip: document.getElementById("frame-skip").value,
      downscaleFactor: document.getElementById("downscale-factor").value,
      regionData: document.getElementById("region-data").value,
    };
    startProcess("scan", settings);
  });
}

function updateVideoList() {
  videoListContainer.innerHTML = "";
  selectedFilePaths.forEach((filePath) => {
    const fileElement = document.createElement("div");
    fileElement.textContent = getFileName(filePath);
    videoListContainer.appendChild(fileElement);
  });
  removeButton.disabled = selectedFilePaths.length === 0;
}

// ===================================================================
//  HIKVISION FORENSICS LOGIC
// ===================================================================
function setupHikvisionListeners() {
  hikChooseImageButton.addEventListener("click", async () => {
    const filePath = await window.electronAPI.openImageDialog();
    if (filePath) {
      selectedImagePath = filePath;
      hikImageDisplay.textContent = getFileName(filePath);
      resetHikvisionState();
      checkHikvisionStep1();
    }
  });

  hikChooseOutputButton.addEventListener("click", async () => {
    const dirPath = await window.electronAPI.openOutputDialog();
    if (dirPath) {
      selectedOutputDir = dirPath;
      hikOutputDisplay.textContent = dirPath;
      // Also update the explorer tab display
      explorerOutputDisplay.textContent = dirPath;
      resetHikvisionState();
      checkHikvisionStep1();
      // Enable the load button on the explorer tab
      loadExplorerDataButton.disabled = false;
    }
  });

  hikParseAllButton.addEventListener("click", () => {
    logToOutput("Starting forensic parsing...");
    setHikvisionButtonsState(false);
    masterFilePath = path.join(selectedOutputDir, "master_sector.json");
    window.electronAPI.startHikvisionTask("master", {
      image: selectedImagePath,
      output_file: masterFilePath,
    });
  });

  hikExtractButton.addEventListener("click", () => {
    const offset = hikOffsetInput.value.trim();
    if (!offset) return alert("Please enter a block offset.");
    logToOutput(`Starting extraction for offset ${offset}...`);
    setHikvisionButtonsState(false);
    window.electronAPI.startHikvisionTask("extract", {
      image: selectedImagePath,
      master_file: masterFilePath,
      offset: offset,
      output_dir: selectedOutputDir,
      extra_offset: extraOffset,
    });
  });
}

function checkHikvisionStep1() {
  hikStep2Fieldset.disabled = !(selectedImagePath && selectedOutputDir);
}

function resetHikvisionState() {
  hikStep2Fieldset.disabled = true;
  hikStep3Fieldset.disabled = true;
  masterStatus.className = "status-pending";
  masterStatus.textContent = "Pending...";
  hikbtreeStatus.className = "status-pending";
  hikbtreeStatus.textContent = "Pending...";
  logsStatus.className = "status-pending";
  logsStatus.textContent = "Pending...";
  masterFilePath = null;
  extraOffset = 0;
}

function updateStatus(element, success, message) {
  element.textContent = message;
  element.className = success ? "status-success" : "status-fail";
}

// ===================================================================
//  FORENSIC EXPLORER LOGIC (NEW SECTION)
// ===================================================================
function setupExplorerListeners() {
  loadExplorerDataButton.addEventListener("click", async () => {
    if (!selectedOutputDir) {
      alert(
        "Please select an output directory on the 'Hikvision Forensics' tab first."
      );
      return;
    }
    logToOutput("Loading forensic data from JSON files...");
    explorerTableContainer.innerHTML = "<p>Loading...</p>";

    const result = await window.electronAPI.readHikvisionResults(
      selectedOutputDir
    );

    if (result.success) {
      logToOutput("Data loaded successfully. Rendering table...\n");
      renderExplorerTable(result.data.hikbtree);
    } else {
      logToOutput(`Error loading data: ${result.error}\n`);
      explorerTableContainer.innerHTML = `<p class="status-fail">Error: Could not load data. Ensure you have run the parsing step first. Details: ${result.error}</p>`;
    }
  });
}

function renderExplorerTable(hikbtreeData) {
  const table = document.createElement("table");
  table.className = "results-table";

  // Create table header
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  const headers = [
    "Ch",
    "Start Time (UTC)",
    "End Time (UTC)",
    "Data Block Offset",
    "Actions",
  ];
  headers.forEach((text) => {
    const th = document.createElement("th");
    th.textContent = text;
    headerRow.appendChild(th);
  });

  // Create table body
  const tbody = table.createTBody();
  let entriesFound = 0;

  // Iterate through pages and entries to populate the table
  if (hikbtreeData && hikbtreeData.pages) {
    Object.values(hikbtreeData.pages).forEach((page) => {
      if (page.entries) {
        page.entries.forEach((entry) => {
          if (entry.existence === "Has Video Data") {
            entriesFound++;
            const row = tbody.insertRow();
            row.dataset.offset = entry.data_block_offset; // Store offset in the row

            row.insertCell().textContent = entry.channel;
            row.insertCell().textContent = entry.start_time.readable;
            row.insertCell().textContent = entry.end_time.readable;
            row.insertCell().textContent = entry.data_block_offset;

            const actionCell = row.insertCell();
            actionCell.className = "extract-button-cell";
            const extractBtn = document.createElement("button");
            extractBtn.textContent = "Extract";
            extractBtn.className = "extract-button";
            extractBtn.onclick = () => {
              const offset = row.dataset.offset;
              logToOutput(`Starting extraction for offset ${offset}...\n`);
              // Also disable buttons on the other tab to prevent conflicts
              setHikvisionButtonsState(false);
              window.electronAPI.startHikvisionTask("extract", {
                image: selectedImagePath,
                master_file: masterFilePath,
                offset: offset,
                output_dir: selectedOutputDir,
                extra_offset: extraOffset,
              });
            };
            actionCell.appendChild(extractBtn);
          }
        });
      }
    });
  }

  // Update the container
  explorerTableContainer.innerHTML = "";
  if (entriesFound > 0) {
    explorerTableContainer.appendChild(table);
  } else {
    explorerTableContainer.innerHTML =
      "<p>No video recording entries found in hikbtree.json. Make sure you have parsed the image successfully.</p>";
  }
}

// ===================================================================
//  SHARED PROCESS LOGIC & IPC LISTENERS
// ===================================================================
function startProcess(type, settings) {
  outputArea.textContent = `Starting ${type}...\n`;
  progressContainer.classList.remove("hidden");
  progressBar.value = 0;
  progressText.textContent = "Initializing...";
  setAllButtonsState(false);
  if (type === "scan") {
    window.electronAPI.startScan(settings);
  }
}

function setupIPCListeners() {
  window.electronAPI.onScanUpdate((_event, data) => {
    if (data.type === "progress") {
      progressText.textContent = `Scanning... ${data.percent}% (${data.eventsFound} events found)`;
      progressBar.value = data.percent;
    } else if (data.type === "complete") {
      progressText.textContent = `Scan Complete! Found ${data.events.length} events.`;
      let summary = "Detected Events:\n";
      data.events.forEach((e) => {
        summary += `  - Event ${e.event}: ${e.start} to ${e.end}\n`;
      });
      outputArea.textContent = summary;
    }
  });

  window.electronAPI.onHikvisionUpdate((_event, data) => {
    if (data.type === "hik_master_complete") {
      updateStatus(
        masterStatus,
        data.success,
        data.success ? `Success (Offset: ${data.extra_offset})` : "Failed"
      );
      if (data.success) {
        extraOffset = data.extra_offset;
        const hikbtreeFile = path.join(selectedOutputDir, "hikbtree.json");
        window.electronAPI.startHikvisionTask("hikbtree", {
          image: selectedImagePath,
          master_file: masterFilePath,
          output_file: hikbtreeFile,
          extra_offset: extraOffset,
        });
      } else {
        setHikvisionButtonsState(true);
      }
    } else if (data.type === "hik_hikbtree_complete") {
      updateStatus(
        hikbtreeStatus,
        data.success,
        data.success ? "Success" : "Failed"
      );
      if (data.success) {
        const logsFile = path.join(selectedOutputDir, "system_logs.json");
        window.electronAPI.startHikvisionTask("logs", {
          image: selectedImagePath,
          master_file: masterFilePath,
          output_file: logsFile,
          extra_offset: extraOffset,
        });
      } else {
        setHikvisionButtonsState(true);
      }
    } else if (data.type === "hik_logs_complete") {
      updateStatus(
        logsStatus,
        data.success,
        data.success ? "Success" : "Failed"
      );
      if (data.success) {
        logToOutput(
          "\nAll parsing complete. You may now extract video blocks manually or use the Forensic Explorer tab.\n"
        );
        hikStep3Fieldset.disabled = false;
      }
      setHikvisionButtonsState(true);
    } else if (data.type === "hik_extract_complete") {
      logToOutput(`\nSUCCESS! Video extracted to: ${data.path}\n`);
      setHikvisionButtonsState(true);
    }
  });

  window.electronAPI.onScanLog((_event, log) => {
    logToOutput(`${log}\n`);
  });

  window.electronAPI.onScanError((_event, error) => {
    logToOutput(`\n--- ERROR ---\n${error}\n`);
    progressText.textContent = "Process failed!";
    setAllButtonsState(true);
  });

  window.electronAPI.onScanComplete((_event, message) => {
    if (!message.includes("exit code 0")) {
      logToOutput(`\n--- PROCESS FINISHED ---\n${message}\n`);
    }
    setAllButtonsState(true);
  });
}

// --- UTILITY FUNCTIONS ---
const path = { join: (...args) => args.join("/") }; // Simple path joiner for renderer
function logToOutput(message) {
  outputArea.textContent += message;
}
function getFileName(filePath) {
  return filePath.split(/\/|\\/).pop();
}
function setAllButtonsState(enabled) {
  startScanButton.disabled = !enabled;
  setHikvisionButtonsState(enabled);
}
function setHikvisionButtonsState(enabled) {
  hikParseAllButton.disabled = !enabled;
  hikExtractButton.disabled = !enabled;
}
