$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'public\index.html'
$dest = Join-Path $root 'index.html'

Copy-Item -LiteralPath $source -Destination $dest -Force
Write-Host "Synced public/index.html -> index.html"