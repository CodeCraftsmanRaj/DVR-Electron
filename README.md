# DVR-Scan-Raj Electron GUI

[![Build Cross-Platform Releases](https://github.com/rand0misguyhere-dotcom/DVR_Raj/actions/workflows/build.yml/badge.svg)](https://github.com/rand0misguyhere-dotcom/DVR_Raj/actions/workflows/build.yml)

A modern, cross-platform desktop application for the powerful `DVR-Scan` video motion detection engine.

This project provides a user-friendly graphical interface (GUI) built with Electron.js that acts as a frontend for the original Python-based `DVR-Scan` command-line tool. It allows users to easily select videos, configure motion detection parameters, and view results without needing to use the terminal.

## 🏛️ Architecture

The application is built on a robust two-part architecture:

1.  **Electron Frontend (The UI):**
    *   Handles all user interaction, settings, and display of progress/results.
    *   Built with HTML, CSS, and JavaScript.
    *   Does **not** perform any video processing itself.

2.  **Python Backend (The Engine):**
    *   The original, powerful `DVR-Scan` project, packaged into a single, self-contained executable using PyInstaller.
    *   Receives commands and settings from the Electron frontend.
    *   Performs all heavy-duty video analysis using OpenCV and NumPy.
    *   Communicates progress and results back to the Electron app via structured JSON output.

The Electron app runs the Python engine as a **child process** and communicates with it via standard input/output, ensuring a clean and stable separation between the interface and the core logic.

## 📋 Features

*   Modern, intuitive user interface for all major platforms (Windows, macOS, Linux).
*   Select one or multiple video files using a native file dialog.
*   Configure core motion detection settings like threshold and event length.
*   Real-time progress bar and status updates during a scan.
*   View a clean, formatted list of detected motion events upon completion.

## 📂 Directory Structure

```
COMPLETE_DVR/
├── .github/workflows/      # Automated build scripts for GitHub Actions
│   └── build.yml
├── dvr-scan-py/            # The original Python backend project
│   ├── .venv/              # Python virtual environment (ignored by git)
│   ├── dvr_scan/           # Python source code
│   ├── dist/               # Output for the PyInstaller executable (ignored)
│   └── ...
├── src/                    # The Electron frontend source code
│   ├── main.js             # Electron main process (the "brain")
│   ├── preload.js          # Secure bridge between main and renderer
│   └── ui/                 # UI files (the "face")
│       ├── index.html
│       ├── styles.css
│       └── renderer.js
├── dist/                   # Output for the final packaged app (ignored)
├── node_modules/           # Node.js dependencies (ignored)
├── package.json            # Project definition and scripts
└── README.md               # This file
```

## 🚀 Getting Started (Development)

Follow these steps to set up a local development environment.

### Prerequisites

*   [**Node.js**](https://nodejs.org/) (v20 or later recommended)
*   [**Python**](https://www.python.org/downloads/) (v3.9 or later recommended)

### 1. Setup the Python Backend

First, set up the Python environment and its dependencies.

```bash
# Navigate to the Python project directory
cd dvr-scan-py/

# Create and activate a Python virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install the required Python packages
pip install -r requirements.txt
```

### 2. Setup the Electron Frontend

Next, install the Node.js dependencies for the Electron app.

```bash
# Navigate to the root project directory
cd .. 

# Install Node.js packages
npm install
```

### 3. Running the Application

To run the application in development mode with live reloading and developer tools:

```bash
# Make sure your Python virtual environment is active first!
# If it's not, run: source dvr-scan-py/.venv/bin/activate

# From the root project directory, start the Electron app
npm start```

This will launch the application window. Any changes you make to the files in `src/` will be reflected when you reload the app (`Ctrl+R` or `Cmd+R`).

## 📦 Building for Production

To package the application into a distributable format (e.g., `.AppImage`, `.exe`, `.dmg`), follow this two-step process.

### Step 1: Build the Python Engine

First, you must create the standalone Python executable using PyInstaller.

```bash
# Navigate to the Python project directory
cd dvr-scan-py/

# Ensure the virtual environment is active
source .venv/bin/activate

# Build the executable using the spec file
pyinstaller dvr-scan-engine.spec

# (Optional) Set executable permissions on Linux/macOS
chmod +x dist/dvr-scan-engine
```
This will create a single file named `dvr-scan-engine` inside the `dvr-scan-py/dist/` directory.

### Step 2: Build the Electron App

Now, you can build the final Electron application, which will automatically bundle the Python engine you just created.

```bash
# Navigate back to the root project directory
cd ..

# Run the build script
npm run build
```

The final, distributable application will be located in the root `dist/` folder.

## ⚙️ Automated Builds (GitHub Actions)

This repository is configured with a GitHub Actions workflow to automatically build the application for Windows, macOS, and Linux.

*   **Trigger:** The workflow runs automatically whenever a new Git tag starting with `v` (e.g., `v1.0.0`, `v1.1.0`) is pushed to the repository.
*   **Artifacts:** Upon successful completion, the packaged applications for all three platforms can be downloaded directly from the "Artifacts" section of the workflow run on the "Actions" tab of the GitHub repository.

## 📄 License

This project is licensed under the BSD 2-Clause License. See the `LICENSE` file for details.