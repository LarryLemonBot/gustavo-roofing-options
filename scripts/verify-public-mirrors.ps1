$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$pages = @('index', 'services', 'gutter-cleaning-guards', 'photos', 'areas', 'process', 'contact')
$failed = $false

foreach ($page in $pages) {
  $publicPath = Join-Path $root "public\$page.html"
  $rootPath = Join-Path $root "$page.html"

  if (!(Test-Path -LiteralPath $publicPath) -or !(Test-Path -LiteralPath $rootPath)) {
    Write-Error "Missing mirror file for $page"
    $failed = $true
    continue
  }

  $publicHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $publicPath).Hash
  $rootHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $rootPath).Hash

  if ($publicHash -ne $rootHash) {
    Write-Error "Mirror mismatch: public/$page.html != $page.html"
    $failed = $true
  } else {
    Write-Host "Mirror OK: $page"
  }
}

if ($failed) {
  exit 1
}

Write-Host "All public/root HTML mirrors match."
