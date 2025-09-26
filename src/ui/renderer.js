// --- General Elements ---
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

// --- Image Extraction Elements ---
const startExtractionButton = document.getElementById(
  "start-extraction-button"
);
const chooseImageButton = document.getElementById("choose-image-button");
const chooseMasterFileButton = document.getElementById(
  "choose-master-file-button"
);
const imageFileDisplay = document.getElementById("image-file-display");
const masterFileDisplay = document.getElementById("master-file-display");
let selectedImagePath = null;
let selectedMasterFile = null;

// ===================================================================
//  TAB SWITCHING LOGIC
// ===================================================================
tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    // Deactivate all tabs and panels
    tabButtons.forEach((btn) => btn.classList.remove("active"));
    panels.forEach((panel) => panel.classList.add("hidden"));

    // Activate the clicked tab and its corresponding panel
    button.classList.add("active");
    const panelId = button.getAttribute("data-for-panel");
    document.getElementById(panelId).classList.remove("hidden");
  });
});

// ===================================================================
//  MOTION DETECTION LOGIC
// ===================================================================
chooseFilesButton.addEventListener("click", async () => {
  const filePaths = await window.electronAPI.openFileDialog();
  if (filePaths) {
    selectedFilePaths = filePaths;
    updateVideoList();
  }
});

function updateVideoList() {
  videoListContainer.innerHTML = "";
  selectedFilePaths.forEach((filePath) => {
    const fileElement = document.createElement("div");
    fileElement.textContent = filePath.split(/\/|\\/).pop();
    videoListContainer.appendChild(fileElement);
  });
  removeButton.disabled = selectedFilePaths.length === 0;
}

removeButton.addEventListener("click", () => {
  selectedFilePaths = [];
  updateVideoList();
});

startScanButton.addEventListener("click", async () => {
  if (selectedFilePaths.length === 0) {
    alert("Please select at least one video file.");
    return;
  }
  const scanOnly = document.getElementById("scan-only").checked;
  let outputDir = null;
  if (!scanOnly) {
    outputDir = await window.electronAPI.openOutputDialog();
    if (!outputDir) {
      outputArea.textContent =
        "Scan canceled: No output directory was selected.\n";
      return;
    }
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

// ===================================================================
//  IMAGE EXTRACTION LOGIC
// ===================================================================
chooseImageButton.addEventListener("click", async () => {
  const filePath = await window.electronAPI.openImageDialog();
  if (filePath) {
    selectedImagePath = filePath;
    imageFileDisplay.textContent = filePath.split(/\/|\\/).pop();
  }
});

chooseMasterFileButton.addEventListener("click", async () => {
  const filePath = await window.electronAPI.openMasterFileDialog();
  if (filePath) {
    selectedMasterFile = filePath;
    masterFileDisplay.textContent = filePath.split(/\/|\\/).pop();
  }
});

startExtractionButton.addEventListener("click", async () => {
  const offset = document.getElementById("offset-input").value.trim();
  if (!selectedImagePath || !selectedMasterFile || !offset) {
    alert("Please select an image file, a master file, and provide an offset.");
    return;
  }
  let outputDir = await window.electronAPI.openOutputDialog();
  if (!outputDir) {
    outputArea.textContent =
      "Extraction canceled: No output directory was selected.\n";
    return;
  }
  const settings = {
    imagePath: selectedImagePath,
    masterFile: selectedMasterFile,
    offset: offset,
    outputDir: outputDir,
  };
  startProcess("extract", settings);
});

// ===================================================================
//  SHARED LOGIC (Process Starting & IPC Handlers)
// ===================================================================
function startProcess(type, settings) {
  outputArea.textContent = `Starting ${type}...\n`;
  progressContainer.classList.remove("hidden");
  progressBar.value = 0;
  progressText.textContent = "Initializing...";
  startScanButton.disabled = true;
  startExtractionButton.disabled = true;

  if (type === "scan") {
    window.electronAPI.startScan(settings);
  } else if (type === "extract") {
    window.electronAPI.startExtraction(settings);
  }
}

window.electronAPI.onScanUpdate((_event, data) => {
  if (data.type === "progress") {
    progressText.textContent = `Scanning... ${data.percent}% (${data.eventsFound} events found)`;
    progressBar.value = data.percent;
  } else if (data.type === "complete") {
    progressText.textContent = `Scan Complete! Found ${data.events.length} events.`;
    let eventSummary = "Detected Events:\n";
    data.events.forEach((e) => {
      eventSummary += `  - Event ${e.event}: ${e.start} to ${e.end}\n`;
    });
    outputArea.textContent = eventSummary;
  }
});

window.electronAPI.onExtractionComplete((_event, data) => {
  progressText.textContent = "Extraction Complete!";
  progressBar.value = 100;
  outputArea.textContent = `Successfully extracted video file to:\n${data.path}`;
});

window.electronAPI.onScanLog((_event, log) => {
  outputArea.textContent += `${log}\n`;
});

window.electronAPI.onScanError((_event, error) => {
  outputArea.textContent += `ERROR: ${error}\n`;
  progressText.textContent = "Process failed!";
  startScanButton.disabled = false;
  startExtractionButton.disabled = false;
});

window.electronAPI.onScanComplete((_event, message) => {
  outputArea.textContent += `\n${message}\n`;
  startScanButton.disabled = false;
  startExtractionButton.disabled = false;
});
