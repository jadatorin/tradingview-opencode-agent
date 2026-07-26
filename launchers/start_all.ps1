<#
.SYNOPSIS
    Start TradingView + MCP server for OpenCode workflow.
.DESCRIPTION
    Launches TradingView Desktop with CDP support, then starts the MCP server.
    Use this for a complete TradingView + OpenCode setup.
.EXAMPLE
    .\start_all.ps1
#>

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=== TradingView + OpenCode Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Launch Chrome + TradingView via CDP launcher (persistent profile)
Write-Host "[1/2] Launching Chrome with CDP for TradingView..." -ForegroundColor Yellow
try {
    $tvResult = & "$scriptDir\launch_tv_cdp.ps1" -NoWait | ConvertFrom-Json
    if ($tvResult.success) {
        Write-Host "      TradingView started on port $($tvResult.port)" -ForegroundColor Green
        Write-Host "      Profile: $($tvResult.profile_dir)" -ForegroundColor Gray
    } else {
        Write-Host "      Warning: CDP not ready, will retry..." -ForegroundColor Yellow
    }
}
catch {
    Write-Warning "Could not auto-launch TradingView. Please open it manually."
}

Write-Host ""

# Step 2: Start MCP Server
Write-Host "[2/2] Starting MCP server..." -ForegroundColor Yellow

$projectPath = Split-Path -Parent $scriptDir
$serverPath = Join-Path $projectPath "src\index.js"

if (-not (Test-Path $serverPath)) {
    Write-Error "Server not found at: $serverPath"
    exit 1
}

Write-Host ""
Write-Host "MCP Server running. Keep both windows open." -ForegroundColor Green
Write-Host "TradingView tools will be available in OpenCode." -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

node $serverPath