<#
.SYNOPSIS
    Launch TradingView from Windows Store (MSIX)
.DESCRIPTION
    Specialized launcher for MSIX/Store version of TradingView.
    MSIX apps cannot accept --remote-debugging-port due to sandbox.
    For CDP support, use launch_tv_cdp.ps1 (Chrome + web) instead.
.PARAMETER Port
    CDP port (default: 9222 - for reference only, will not work with MSIX)
.EXAMPLE
    .\launch_tv_msix.ps1
#>

param(
    [int]$Port = 9222
)

$ErrorActionPreference = "Stop"

function Get-MSIXTradingViewPath {
    $progFilesApps = "C:\Program Files\WindowsApps"
    if (Test-Path $progFilesApps) {
        $msixDirs = Get-ChildItem "$progFilesApps\TradingView.Desktop_*" -Directory -ErrorAction SilentlyContinue
        foreach ($dir in $msixDirs) {
            $exePath = Join-Path $dir.FullName "TradingView.exe"
            if (Test-Path $exePath) {
                return $exePath
            }
        }
    }

    $windowsApps = "$env:LOCALAPPDATA\Microsoft\WindowsApps"
    if (Test-Path $windowsApps) {
        $msixApps = Get-ChildItem $windowsApps -Filter "TradingView*" -Directory -ErrorAction SilentlyContinue
        if ($msixApps) {
            $tvExe = Join-Path $msixApps[0].FullName "TradingView.exe"
            if (Test-Path $tvExe) {
                return $tvExe
            }
        }
    }

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

# Main
Write-Host "Searching for TradingView MSIX..." -ForegroundColor Cyan

$tvPath = Get-MSIXTradingViewPath

if (-not $tvPath) {
    Write-Error "TradingView MSIX not found. Is it installed from Microsoft Store?"
    exit 1
}

Write-Host "Found: $tvPath" -ForegroundColor Green
Write-Host ""
Write-Host "WARNING - MSIX SECURITY RESTRICTION:" -ForegroundColor Yellow
Write-Host "  Windows Store apps cannot accept --remote-debugging-port" -ForegroundColor Yellow
Write-Host "  The MCP server (CDP) will NOT be able to connect." -ForegroundColor Yellow
Write-Host "  For CDP + MCP use: launch_tv_cdp.ps1 (Chrome + web)" -ForegroundColor Cyan
Write-Host ""

if (Test-CDPConnection -TestPort $Port) {
    Write-Host "CDP already active on port $Port" -ForegroundColor Green
    $result = @{ success = $true; url = "http://localhost:$Port/json"; port = $Port; path = $tvPath; type = "msix" }
    Write-Output ($result | ConvertTo-Json -Compress)
    exit 0
}

Write-Host "Launching TradingView Desktop (MSIX)..." -ForegroundColor Cyan
Write-Host "  (no CDP - MSIX sandbox restriction)" -ForegroundColor Gray

try {
    $process = Start-Process -FilePath $tvPath -PassThru
    Write-Host "  Process started: PID $($process.Id)" -ForegroundColor Green
    Write-Host ""
    Write-Host "OK - TradingView Desktop is running." -ForegroundColor Green
    Write-Host "Note: CDP/MCP tools will NOT connect to this instance." -ForegroundColor Yellow
    Write-Host "Keep Chrome+CDP (launch_tv_cdp.ps1) for MCP tools." -ForegroundColor Cyan

    $result = @{
        success = $true
        type = "msix"
        path = $tvPath
        message = "MSIX launched without CDP (MSIX sandbox restriction)"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
catch {
    Write-Error "Failed to launch: $_"
    exit 1
}
