$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$pages = @('index', 'services', 'gutter-cleaning-guards', 'photos', 'areas', 'process', 'contact')

foreach ($page in $pages) {
  $source = Join-Path $root "public\$page.html"
  $dest = Join-Path $root "$page.html"
  Copy-Item -LiteralPath $source -Destination $dest -Force
  Write-Host "Synced public/$page.html -> $page.html"
}
