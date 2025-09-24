# dvr-scan-engine.spec

# This block ensures we can find our source files
import os
from PyInstaller.utils.hooks import collect_data_files

block_cipher = None

# List of data files to bundle. This part is correct and remains the same.
datas_to_bundle = [
    ('LICENSE', '.'),
    ('dvr-scan.cfg', '.'),
    ('dvr_scan/LICENSE', 'dvr_scan'),
    ('dvr_scan/LICENSE-THIRDPARTY', 'dvr_scan'),
    ('dvr_scan/dvr-scan.ico', 'dvr_scan'),
    ('dvr_scan/dvr-scan.png', 'dvr_scan'),
    ('dvr_scan/dvr-scan-logo.png', 'dvr_scan'),
    ('dvr_scan/docs', 'dvr_scan/docs')
]

a = Analysis(
    ['dvr_scan/__main__.py'],
    pathex=['.'], # Add current directory to path
    binaries=[],
    datas=datas_to_bundle,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    name='dvr-scan-engine'
)
pyz = PYZ(a.pure)


# --- THIS IS THE CRITICAL CHANGE ---
# The EXE object is now the final output. We pass all the necessary data
# directly to it to create a single, self-contained executable file.
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='dvr-scan-engine',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    runtime_tmpdir=None, # Important for single-file executables
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)