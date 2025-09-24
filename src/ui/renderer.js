const startButton = document.getElementById('start-button');
const chooseFilesButton = document.getElementById('choose-files-button');
const removeButton = document.getElementById('remove-button');
const videoListContainer = document.getElementById('video-list-container');
const outputArea = document.getElementById('output-area');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

let selectedFilePaths = [];

chooseFilesButton.addEventListener('click', async () => {
    const filePaths = await window.electronAPI.openFileDialog();
    if (filePaths) {
        selectedFilePaths = filePaths;
        updateVideoList();
    }
});

function updateVideoList() {
    videoListContainer.innerHTML = '';
    selectedFilePaths.forEach(filePath => {
        const fileElement = document.createElement('div');
        fileElement.textContent = filePath.split(/\/|\\/).pop();
        videoListContainer.appendChild(fileElement);
    });
    removeButton.disabled = selectedFilePaths.length === 0;
}

removeButton.addEventListener('click', () => {
    selectedFilePaths = [];
    updateVideoList();
});

startButton.addEventListener('click', () => {
    if (selectedFilePaths.length === 0) {
        alert('Please select at least one video file.');
        return;
    }

    const settings = {
        input: selectedFilePaths,
        threshold: document.getElementById('threshold').value,
        minEventLength: document.getElementById('min-event-length').value,
        outputMode: document.getElementById('output-mode').value,
        scanOnly: document.getElementById('scan-only').checked,
        boundingBox: document.getElementById('bounding-box').checked,
        timeCode: document.getElementById('time-code').checked,
        frameMetrics: document.getElementById('frame-metrics').checked,
        frameSkip: document.getElementById('frame-skip').value,
        downscaleFactor: document.getElementById('downscale-factor').value,
        regionData: document.getElementById('region-data').value,
    };

    outputArea.textContent = 'Starting scan...\n';
    progressContainer.classList.remove('hidden');
    progressBar.value = 0;
    progressText.textContent = 'Initializing...';
    startButton.disabled = true;

    window.electronAPI.startScan(settings);
});

window.electronAPI.onScanUpdate((_event, data) => {
    if (data.type === 'progress') {
        progressText.textContent = `Scanning... ${data.percent}% (${data.eventsFound} events found)`;
        progressBar.value = data.percent;
    } else if (data.type === 'complete') {
        progressText.textContent = `Scan Complete! Found ${data.events.length} events.`;
        let eventSummary = 'Detected Events:\n';
        data.events.forEach(e => {
            eventSummary += `  - Event ${e.event}: ${e.start} to ${e.end}\n`;
        });
        outputArea.textContent = eventSummary;
    }
});

window.electronAPI.onScanLog((_event, log) => {
    outputArea.textContent += `${log}\n`;
});

window.electronAPI.onScanError((_event, error) => {
    outputArea.textContent += `ERROR: ${error}\n`;
    progressText.textContent = 'Scan failed!';
    startButton.disabled = false;
});

window.electronAPI.onScanComplete((_event, message) => {
    outputArea.textContent += `\n${message}\n`;
    startButton.disabled = false;
});