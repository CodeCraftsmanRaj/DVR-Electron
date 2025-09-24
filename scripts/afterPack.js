// scripts/afterPack.js
const fs = require('fs');
const path = require('path');

// This function is called by electron-builder
exports.default = async function(context) {
    console.log("  • [afterPack Hook] Starting...");

    // This hook is only for Linux and macOS.
    if (process.platform === 'win32') {
        console.log("  • [afterPack Hook] Skipping for Windows.");
        return;
    }

    // Get the path to the packaged app's resources directory
    const { appOutDir, packager } = context;
    const platformName = packager.platform.name;

    let resourcesPath;
    if (platformName === 'mac') {
        // The path is different on macOS builds
        const appName = context.packager.appInfo.productFilename;
        resourcesPath = path.join(appOutDir, `${appName}.app`, 'Contents', 'Resources');
    } else {
        // For Linux (AppImage), it's in the root of the unpacked files
        resourcesPath = path.join(appOutDir, 'resources');
    }

    const engineName = 'dvr-scan-engine';
    const enginePath = path.join(resourcesPath, engineName);

    // --- CRITICAL DIAGNOSTIC LOGS ---
    console.log(`  • [afterPack Hook] Platform: ${platformName}`);
    console.log(`  • [afterPack Hook] App output directory: ${appOutDir}`);
    console.log(`  • [afterPack Hook] Calculated resources path: ${resourcesPath}`);
    console.log(`  • [afterPack Hook] Full path to engine: ${enginePath}`);
    // --------------------------------

    try {
        if (fs.existsSync(enginePath)) {
            console.log(`  • [afterPack Hook] Engine found! Setting permissions...`);
            // Set permissions to rwxr-xr-x (0755)
            fs.chmodSync(enginePath, '755');
            console.log(`  ✔ [afterPack Hook] Successfully set +x permission on dvr-scan-engine`);
        } else {
            console.error(`  ⨯ [afterPack Hook] ERROR: dvr-scan-engine not found at the expected path!`);
            // To help debug, let's list the contents of the resources directory
            if (fs.existsSync(resourcesPath)) {
                const files = fs.readdirSync(resourcesPath);
                console.log(`  • [afterPack Hook] Contents of resources directory:`, files);
            } else {
                 console.error(`  ⨯ [afterPack Hook] ERROR: The resources directory itself was not found at ${resourcesPath}`);
            }
        }
    } catch (error) {
        console.error(`  ⨯ [afterPack Hook] ERROR while setting permissions: ${error}`);
        throw error; // Fail the build if we can't set permissions
    }
};