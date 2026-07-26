$errors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
    'C:\Users\5 de julio\Proyects\tradingview-opencode-agent\launchers\launch_tv_cdp.ps1',
    [ref] $errors,
    [ref] $null
)
if ($errors.Count -gt 0) {
    Write-Host "Found $($errors.Count) parse errors:" -ForegroundColor Red
    foreach ($err in $errors) {
        $line = $err.Token.Extent.StartLineNumber
        $col = $err.Token.Extent.StartColumnNumber
        Write-Host "  Line $line, Col $col : $($err.Message)"
    }
} else {
    Write-Host "Syntax OK" -ForegroundColor Green
}
