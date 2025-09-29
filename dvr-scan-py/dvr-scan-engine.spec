# dvr-scan-engine.spec

import os
from PyInstaller.utils.hooks import collect_data_files

block_cipher = None

# List of data files to bundle. This remains the same.
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
    pathex=['.'], 
    binaries=[], # PyInstaller will now find the system-installed libewf.so automatically
    datas=datas_to_bundle,
    # This is still crucial to ensure the Python wrapper module is included.
    hiddenimports=['pyewf'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    name='dvr-scan-engine'
)
pyz = PYZ(a.pure)

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
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)