<#
.SYNOPSIS
    Launch TradingView from Windows Store (MSIX)
.DESCRIPTION
    Specialized launcher for MSIX/Store version of TradingView.
    MSIX apps may not accept --remote-debugging-port directly.
.EXAMPLE
    .\launch_tv_msix.ps1
#>

param(
    [int]$Port = 9222
)

$ErrorActionPreference = "Stop"

function Get-MSIXTradingViewPath {
    # Known MSIX installation paths
    $msixPaths = @(
        "C:\Program Files\WindowsApps\TradingView.Desktop_3.1.0.7818_x64__n534cwy3pjxzj\TradingView.exe",
        "C:\Program Files\WindowsApps\TradingView.Desktop_*\TradingView.exe"
    )

    # Try direct path first
    if (Test-Path "C:\Program Files\WindowsApps\TradingView.Desktop_3.1.0.7818_x64__n534cwy3pjxzj\TradingView.exe") {
        return "C:\Program Files\WindowsApps\TradingView.Desktop_3.1.0.7818_x64__n534cwy3pjxzj\TradingView.exe"
    }

    # Search for any TradingView MSIX installation
    $windowsApps = "$env:LOCALAPPDATA\Microsoft\WindowsApps"
    if (Test-Path $windowsApps) {
        $msixApps = Get-ChildItem $windowsApps -Filter "TradingView*" -ErrorAction SilentlyContinue
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
    catch {
        return $false
    }
}

# Main execution
Write-Host "Searching for TradingView MSIX..." -ForegroundColor Cyan

$tvPath = Get-MSIXTradingViewPath

if (-not $tvPath) {
    Write-Error "TradingView MSIX not found. Is it installed from Microsoft Store?"
    exit 1
}

Write-Host "Found: $tvPath" -ForegroundColor Green

# Check if already running with CDP
if (Test-CDPConnection -TestPort $Port) {
    Write-Host "TradingView already running with CDP on port $Port" -ForegroundColor Green
    $result = @{
        success = $true
        url = "http://localhost:$Port/json"
        port = $Port
        path = $tvPath
        type = "msix"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
    exit 0
}

# MSIX workaround: Try to launch with Shell to pass arguments
# Note: MSIX apps often ignore command line arguments for security
Write-Host "Attempting to launch MSIX with CDP..." -ForegroundColor Yellow

try {
    # Try using Start-Process with arguments (may not work for MSIX)
    $args = "--remote-debugging-port=$Port"
    $process = Start-Process -FilePath $tvPath -ArgumentList $args -PassThru

    Start-Sleep -Seconds 3

    if (Test-CDPConnection -TestPort $Port) {
        Write-Host "CDP active!" -ForegroundColor Green
        $result = @{
            success = $true
            url = "http://localhost:$Port/json"
            port = $Port
            path = $tvPath
            type = "msix"
        }
        Write-Output ($result | ConvertTo-Json -Compress)
        exit 0
    }

    # Fallback: launch without args (standard MSIX behavior)
    Write-Host "MSIX doesn't accept remote debugging args. Launching normally..." -ForegroundColor Yellow

    if ($process -and -not $process.HasExited) {
        # Already running, just report
    }
    else {
        $process = Start-Process -FilePath $tvPath -PassThru
    }

    $result = @{
        success = $true
        message = "MSIX launched but CDP may not be available (MSIX security restriction)"
        port = $Port
        path = $tvPath
        type = "msix"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
catch {
    Write-Error "Failed to launch: $_"
    exit 1
}