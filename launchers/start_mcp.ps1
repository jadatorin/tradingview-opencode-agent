<#
.SYNOPSIS
    Start the TradingView MCP server for OpenCode.
.DESCRIPTION
    Launches the MCP server that provides TradingView tools to OpenCode.
    Keep this running while using OpenCode with TradingView.
.EXAMPLE
    .\start_mcp.ps1
#>

param(
    [string]$ProjectPath = "C:\Users\Proyects\tradingview-opencode-agent"
)

$ErrorActionPreference = "Continue"

$serverPath = Join-Path $ProjectPath "src\index.js"

if (-not (Test-Path $serverPath)) {
    Write-Error "Server not found at: $serverPath"
    exit 1
}

Write-Host "Starting TradingView MCP server..." -ForegroundColor Cyan
Write-Host "Path: $serverPath" -ForegroundColor Gray
Write-Host ""
Write-Host "Keep this window open while using OpenCode" -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

node $serverPath