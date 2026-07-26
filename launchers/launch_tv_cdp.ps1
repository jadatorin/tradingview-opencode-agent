<#
.SYNOPSIS
    Launch Chrome with CDP pointing to TradingView.com for MCP server connection.
.DESCRIPTION
    This is the RELIABLE solution for CDP connectivity. Since MSIX-packaged
    TradingView Desktop cannot accept --remote-debugging-port (sandbox limitation),
    this launches a separate Chrome instance with CDP enabled and opens TradingView.
    
    USES A PERSISTENT PROFILE so your TradingView session (login, layouts, favorites)
    is saved between launches. You only need to log in ONCE.
    
    The MCP server's cdp-client.js connects to localhost:9222 to control the chart
    in real-time (screenshots, OHLCV, indicators, drawings, etc.).
.PARAMETER Port
    CDP port number (default: 9222)
.PARAMETER Url
    TradingView URL to open (default: https://www.tradingview.com)
.PARAMETER NoWait
    Don't wait for CDP connection
.PARAMETER ProfilePath
    Custom path for the persistent Chrome profile (default: ~\.tv-cdp-profile)
.PARAMETER ResetProfile
    Delete the existing profile and start fresh (e.g., to log in with a different account)
.EXAMPLE
    .\launch_tv_cdp.ps1
    .\launch_tv_cdp.ps1 -Port 9223
    .\launch_tv_cdp.ps1 -ProfilePath "D:\TradingViewProfile"
    .\launch_tv_cdp.ps1 -ResetProfile
    .\launch_tv_cdp.ps1 -Url "https://www.tradingview.com/chart/?symbol=BITSTAMP:BTCUSD"
#>

param(
    [int]$Port = 9222,
    [string]$Url = "https://www.tradingview.com",
    [switch]$NoWait,
    [string]$ProfilePath = "",
    [switch]$ResetProfile
)

$ErrorActionPreference = "Stop"

# Chrome paths to check
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:LOCALAPPDATA}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe"
)

function Find-Chrome {
    foreach ($path in $chromePaths) {
        if (Test-Path $path) {
            return $path
        }
    }
    # Try PATH
    $fromPath = (Get-Command "chrome" -ErrorAction SilentlyContinue).Source
    if ($fromPath) { return $fromPath }
    return $null
}

function Test-CDPConnection {
    param([int]$TestPort)
    try {
        $response = Invoke-RestMethod "http://localhost:$TestPort/json" -TimeoutSec 3 -ErrorAction SilentlyContinue
        return $response -ne $null
    }
    catch { return $false }
}

function Start-ChromeWithCDP {
    param([string]$ExePath, [int]$CDPPort, [string]$TargetUrl)

    # Persistent profile so TradingView login is saved across launches
    # Uses C:\Users\5dejulio (junction for "5 de Julio") to avoid path-with-spaces issues
    $profileDir = if ($ProfilePath) { $ProfilePath } else { Join-Path "C:\Users\5dejulio" ".tv-cdp-profile" }
    
    if ($ResetProfile -and (Test-Path $profileDir)) {
        Write-Host "  Resetting profile at: $profileDir" -ForegroundColor Yellow
        Remove-Item -Path $profileDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    if (-not (Test-Path $profileDir)) {
        New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
        Write-Host "  New profile created: $profileDir" -ForegroundColor Cyan
        Write-Host "  ⚠️  You'll need to log in to TradingView this first time." -ForegroundColor Yellow
        Write-Host "  The session will be saved for next launches." -ForegroundColor Green
    } else {
        Write-Host "  Using existing persistent profile: $profileDir" -ForegroundColor Green
    }

    $args = @(
        "--remote-debugging-port=$CDPPort",
        "--user-data-dir=$profileDir",
        "--no-first-run",
        "--no-default-browser-check",
        "--new-window",
        $TargetUrl
    )

    Write-Host "Launching Chrome with CDP on port $CDPPort..." -ForegroundColor Cyan
    Write-Host "  Exe: $ExePath" -ForegroundColor Gray
    Write-Host "  Args: $($args -join ' ')" -ForegroundColor Gray
    Write-Host "  Profile: $profileDir" -ForegroundColor Gray

    $process = Start-Process -FilePath $ExePath -ArgumentList $args -PassThru -ErrorAction Stop
    return $process.Id
}

# === Main ===
Write-Host "=== TradingView CDP Launcher ===" -ForegroundColor Magenta
Write-Host "`n[1/4] Checking if CDP is already active on port $Port..." -ForegroundColor Cyan

if (Test-CDPConnection -TestPort $Port) {
    Write-Host "  CDP already active on port $Port ✓" -ForegroundColor Green
    $result = @{
        success = $true
        method = "existing"
        port = $Port
        url = "http://localhost:$Port/json"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
    exit 0
}

Write-Host "  No CDP connection found on port $Port" -ForegroundColor Yellow

Write-Host "`n[2/4] Finding Chrome..." -ForegroundColor Cyan
$chromePath = Find-Chrome
if (-not $chromePath) {
    Write-Error "Chrome not found in any known location"
    exit 1
}
Write-Host "  Found: $chromePath ✓" -ForegroundColor Green

Write-Host "`n[3/4] Launching Chrome with CDP..." -ForegroundColor Cyan
try {
    $chromePid = Start-ChromeWithCDP -ExePath $chromePath -CDPPort $Port -TargetUrl $Url
    Write-Host "  Process started with PID: $chromePid ✓" -ForegroundColor Green
}
catch {
    Write-Error "Failed to launch Chrome: $_"
    exit 1
}

Write-Host "`n[4/4] Waiting for CDP connection..." -ForegroundColor Cyan
$maxRetries = 10
$retryCount = 0
$cdpActive = $false

while ($retryCount -lt $maxRetries -and -not $cdpActive) {
    $retryCount++
    Write-Host "  Attempt $retryCount/$maxRetries..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
    
    if (Test-CDPConnection -TestPort $Port) {
        $cdpActive = $true
        break
    }
}

if ($cdpActive) {
    Write-Host "  CDP connected successfully! ✓" -ForegroundColor Green
    Write-Host "  CDP endpoint: http://localhost:$Port/json" -ForegroundColor Green
    Write-Host "`nTradingView is ready. The MCP server can now connect." -ForegroundColor Magenta
    
    $profileDir = if ($ProfilePath) { $ProfilePath } else { Join-Path "C:\Users\5dejulio" ".tv-cdp-profile" }
    $result = @{
        success = $true
        method = "launched"
        port = $Port
        pid = $chromePid
        url = "http://localhost:$Port/json"
        chrome_path = $chromePath
        profile_dir = $profileDir
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
else {
    if (-not $NoWait) {
        Write-Warning "CDP not active after $maxRetries attempts"
        Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
        Write-Host "  1. Check if Chrome is blocked by antivirus" -ForegroundColor Yellow
        Write-Host "  2. Try running as Administrator" -ForegroundColor Yellow
        Write-Host "  3. Try a different port: .\launch_tv_cdp.ps1 -Port 9223" -ForegroundColor Yellow
    }
    $result = @{
        success = $false
        message = "CDP connection not established after $maxRetries attempts"
        port = $Port
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
