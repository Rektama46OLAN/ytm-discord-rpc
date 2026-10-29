# Adds a Startup shortcut that launches the bridge hidden at Windows login.
# Usage:  powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1
#         powershell -ExecutionPolicy Bypass -File .\install-autostart.ps1 -Remove
param([switch]$Remove)

$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'YTM Discord Bridge.lnk'

if ($Remove) {
    if (Test-Path $lnk) { Remove-Item $lnk; "Removed: $lnk" } else { "Nothing to remove." }
    return
}

$vbs = Join-Path $PSScriptRoot 'start-bridge.vbs'
$s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$s.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$s.Arguments = '"' + $vbs + '"'
$s.WorkingDirectory = $PSScriptRoot
$s.WindowStyle = 7
$s.Save()
"Created: $lnk"
