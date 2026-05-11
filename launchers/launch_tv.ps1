<#
.SYNOPSIS
    Auto-detect and launch TradingView with CDP support.
.DESCRIPTION
    Searches for TradingView installation in multiple locations and launches with remote debugging.
.PARAMETER Port
    CDP port number (default: 9222)
.PARAMETER NoWait
    Don't wait for CDP connection
.EXAMPLE
    .\launch_tv.ps1
.EXAMPLE
    .\launch_tv.ps1 -Port 9223
#>

param(
    [int]$Port = 9222,
    [switch]$NoWait
)

$ErrorActionPreference = "Stop"

function Get-TradingViewPath {
    $searchPaths = @(
        # Registry (HKCU)
        { Get-ItemProperty -Path "HKCU:\Software\TradingView" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty InstallPath },
        # Registry (HKLM)
        { Get-ItemProperty -Path "HKLM:\Software\TradingView" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty InstallPath },
        # LocalAppData
        { Join-Path $env:LOCALAPPDATA "TradingView" },
        # ProgramFiles
        { Join-Path $env:PROGRAMFILES "TradingView" },
        # ProgramFiles (x86)
        { Join-Path ${env:PROGRAMFILES(X86)} "TradingView" },
        # WindowsApps - MSIX
        {
            $windowsAppsPath = Join-path $env:LOCALAPPDATA "Microsoft\WindowsApps"
            if (Test-Path $windowsAppsPath) {
                $tvApp = Get-ChildItem $windowsAppsPath -Filter "TradingView*" -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($tvApp) { $tvApp.FullName }
            }
        },
        # Known MSIX path from user discovery
        { "C:\Program Files\WindowsApps\TradingView.Desktop_3.1.0.7818_x64__n534cwy3pjxzj\TradingView.exe" }
    )

    foreach ($pathGetter in $searchPaths) {
        try {
            $path = & $pathGetter
            if ($path -and (Test-Path $path)) {
                return $path
            }
            # Check for .exe inside path
            $exePath = if (Test-Path "$path\TradingView.exe") { "$path\TradingView.exe" }
            if ($exePath) { return $exePath }
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

function Start-TradingViewWithCDP {
    param([string]$ExePath, [int]$CDPPort)

    $args = @(
        "--remote-debugging-port=$CDPPort",
        "--no-sandbox",
        "--disable-setuid-sandbox"
    )

    $process = Start-Process -FilePath $ExePath -ArgumentList $args -PassThru -ErrorAction Stop
    return $process.Id
}

# Main execution
Write-Host "Searching for TradingView..." -ForegroundColor Cyan

$tvPath = Get-TradingViewPath

if (-not $tvPath) {
    Write-Error "TradingView not found in any known location"
    exit 1
}

Write-Host "Found: $tvPath" -ForegroundColor Green

# Verify CDP
$maxRetries = 3
$retryCount = 0
$cdpActive = $false

while ($retryCount -lt $maxRetries -and -not $cdpActive) {
    if (Test-CDPConnection -TestPort $Port) {
        $cdpActive = $true
        break
    }

    if ($retryCount -eq 0) {
        Write-Host "Launching TradingView with CDP on port $Port..." -ForegroundColor Yellow

        try {
            $pid = Start-TradingViewWithCDP -ExePath $tvPath -CDPPort $Port
            Write-Host "Process started with PID: $pid" -ForegroundColor Green
        }
        catch {
            Write-Error "Failed to launch: $_"
            exit 1
        }
    }

    $retryCount++
    Start-Sleep -Seconds 2
}

if ($cdpActive) {
    $debugUrl = "http://localhost:$Port/json"
    $result = @{
        success = $true
        url = $debugUrl
        port = $Port
        path = $tvPath
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}
else {
    if (-not $NoWait) {
        Write-Warning "CDP not active after $maxRetries attempts"
    }
    $result = @{
        success = $false
        message = "CDP connection not established"
        port = $Port
    }
    Write-Output ($result | ConvertTo-Json -Compress)
}