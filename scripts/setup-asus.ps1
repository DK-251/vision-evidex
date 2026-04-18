# Vision-EviDex - setup-asus.ps1
# Run once on the Asus TUF after cloning the repo. Installs only what is
# missing (Node, VS Build Tools, Git), rebuilds native modules for Electron,
# then hands off to verify-setup.js. Safe to re-run.
#
#   powershell -ExecutionPolicy Bypass -File scripts\setup-asus.ps1

$ErrorActionPreference = 'Stop'

function Write-Pass($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Info($msg) { Write-Host "[ .. ] $msg" -ForegroundColor Cyan }

Write-Host "`n=== Vision-EviDex Asus TUF setup ===`n"

# 1) Windows version check
$winBuild = [System.Environment]::OSVersion.Version.Build
if ($winBuild -lt 19041) {
    Write-Fail "Windows build $winBuild is too old; need 19041 (20H1) or newer"
    exit 1
}
Write-Pass "Windows build $winBuild"

# 2) Node.js
try {
    $nodeVersion = node --version 2>$null
    $major = [int]($nodeVersion -replace '[^\d.]', '').Split('.')[0]
    if ($major -lt 22) {
        Write-Warn "Node $nodeVersion too old - need v22 LTS or newer. Install via nvm-windows: https://github.com/coreybutler/nvm-windows"
        exit 1
    }
    Write-Pass "Node $nodeVersion"
}
catch {
    Write-Fail "Node not installed. Install nvm-windows and run: nvm install lts"
    exit 1
}

# 3) Git
try {
    $gitVersion = git --version 2>$null
    Write-Pass $gitVersion
}
catch {
    Write-Fail "Git not installed. Get it from https://git-scm.com/download/win"
    exit 1
}

# 4) VS Build Tools - required for native module builds (R-04)
$vsPath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vsPath) {
    $hasCpp = & $vsPath -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($hasCpp) {
        Write-Pass "Visual Studio Build Tools with C++ workload detected"
    }
    else {
        Write-Warn "Visual Studio found but C++ workload missing. Install Desktop development with C++ from VS Installer."
    }
}
else {
    Write-Warn "VS Build Tools not found. Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/ and install Desktop development with C++ workload with Windows SDK."
}

# 5) npm install
Write-Info "Running npm install..."
Push-Location "$PSScriptRoot\.."
try {
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install exited $LASTEXITCODE" }
    Write-Pass "npm install completed"
}
catch {
    Write-Fail "npm install failed: $_"
    Pop-Location
    exit 1
}

# 6) electron-rebuild (native modules rebuilt against Electron ABI)
Write-Info "Running electron-rebuild for better-sqlite3, sharp, node-machine-id..."
try {
    npx electron-rebuild
    if ($LASTEXITCODE -ne 0) { throw "electron-rebuild exited $LASTEXITCODE" }
    Write-Pass "Native modules rebuilt against Electron"
}
catch {
    Write-Fail "electron-rebuild failed: $_"
    Write-Warn "Likely VS Build Tools missing or Python not on PATH. See Risk R-04."
    Pop-Location
    exit 1
}

# 7) Verify scaffold
Write-Info "Running verify-setup.js..."
npm run verify-setup
$verifyExit = $LASTEXITCODE

Pop-Location

if ($verifyExit -eq 0) {
    Write-Host "`n=== Asus TUF setup complete. Try: npm run dev ===`n" -ForegroundColor Green
    exit 0
}

Write-Host "`n=== Setup reported failures above. Resolve before running npm run dev. ===`n" -ForegroundColor Red
exit 1
