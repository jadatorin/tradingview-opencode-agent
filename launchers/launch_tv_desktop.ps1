<#
.SYNOPSIS
    Launch TradingView Desktop (downloaded from tradingview.com)
.DESCRIPTION
    For the standard desktop installer version.
.PARAMETER Port
    CDP port number (default: 9222)
.EXAMPLE
    .\launch_tv_desktop.ps1
#>

param(
    [int]$Port = 9222
)

$ErrorActionPreference = "Stop"

function Get-DesktopTradingViewPath {
    # Standard installation paths for desktop version
    $searchPaths = @(
        # LocalAppData (most common for Desktop)
        { Join-Path $env:LOCALAPPDATA "Programs\TradingView" },
        { Join-Path $env:LOCALAPPDATA "TradingView" },
        # Program Files
        { Join-Path $env:PROGRAMFILES "TradingView" },
        { Join-Path $env:PROGRAMFILES "TradingView Desktop" },
        # Program Files (x86)
        { Join-Path ${env:PROGRAMFILES(X86)} "TradingView" }
    )

    foreach ($pathGetter in $searchPaths) {
        try {
            $path = & $pathGetter
            if ($path -and (Test-Path "$path\TradingView.exe")) {
                return "$path\TradingView.exe"
            }
        }
        catch { continue }
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
Write-Host "Searching for TradingView Desktop..." -ForegroundColor Cyan

$tvPath = Get-DesktopTradingViewPath

if (-not $tvPath) {
    Write-Error "TradingView Desktop not found. Install from https://tradingview.com/"
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
        type = "desktop"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
    exit 0
}

# Launch with CDP
Write-Host "Launching TradingView Desktop with CDP on port $Port..." -ForegroundColor Yellow

$args = @(
    "--remote-debugging-port=$Port",
    "--no-sandbox",
    "--disable-setuid-sandbox"
)

try {
    $process = Start-Process -FilePath $tvPath -ArgumentList $args -PassThru -ErrorAction Stop
    Write-Host "Process started with PID: $($process.Id)" -ForegroundColor Green

    # Wait for CDP
    for ($i = 0; $i -lt 10; $i++) {
        Start-Sleep -Seconds 1
        if (Test-CDPConnection -TestPort $Port) {
            Write-Host "CDP active!" -ForegroundColor Green
            $result = @{
                success = $true
                url = "http://localhost:$Port/json"
                port = $Port
                path = $tvPath
                type = "desktop"
            }
            Write-Output ($result | ConvertTo-Json -Compress)
            exit 0
        }
    }

    Write-Warning "CDP not active after 10 seconds"
    $result = @{
        success = $true
        message = "Launched but CDP not established"
        port = $Port
        path = $tvPath
        type = "desktop"
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
catch {
    Write-Error "Failed to launch: $_"
    exit 1
}