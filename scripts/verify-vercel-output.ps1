$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$outputDir = Join-Path $root '.vercel\output'
$staticDir = Join-Path $root '.vercel\output\static'
$configPath = Join-Path $outputDir 'config.json'

if (!(Test-Path -LiteralPath $staticDir)) {
  Write-Error "Missing .vercel/output/static. Run vercel build before using --prebuilt."
}

if (!(Test-Path -LiteralPath $configPath)) {
  Write-Error "Missing .vercel/output/config.json. Run vercel build before using --prebuilt."
}

$required = [ordered]@{
  'index.html' = 'public\index.html'
  'services.html' = 'public\services.html'
  'gutter-cleaning-guards.html' = 'public\gutter-cleaning-guards.html'
  'photos.html' = 'public\photos.html'
  'areas.html' = 'public\areas.html'
  'process.html' = 'public\process.html'
  'contact.html' = 'public\contact.html'
  'assets/css/site.css' = 'public\assets\css\site.css'
  'sitemap.xml' = 'public\sitemap.xml'
  'robots.txt' = 'public\robots.txt'
  'llms.txt' = 'public\llms.txt'
  'ai.txt' = 'public\ai.txt'
  'agents.txt' = 'public\agents.txt'
  '.well-known/ai.txt' = 'public\.well-known\ai.txt'
  '.well-known/agents.json' = 'public\.well-known\agents.json'
}

foreach ($relative in $required.Keys) {
  $outputPath = Join-Path $staticDir $relative
  $sourcePath = Join-Path $root $required[$relative]

  if (!(Test-Path -LiteralPath $sourcePath)) {
    Write-Error "Missing source file for prebuilt output check: $($required[$relative])"
  }

  if (!(Test-Path -LiteralPath $outputPath)) {
    Write-Error "Missing prebuilt output file: $relative"
  }

  $length = (Get-Item -LiteralPath $outputPath).Length
  if ($length -lt 20) {
    Write-Error "Prebuilt output file is unexpectedly small: $relative ($length bytes)"
  }

  $sourceInfo = Get-Item -LiteralPath $sourcePath
  $outputInfo = Get-Item -LiteralPath $outputPath
  if ($outputInfo.LastWriteTimeUtc -lt $sourceInfo.LastWriteTimeUtc) {
    Write-Error "Prebuilt output is older than source: $relative"
  }

  $sourceHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $sourcePath).Hash
  $outputHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $outputPath).Hash
  if ($sourceHash -ne $outputHash) {
    Write-Error "Prebuilt output hash differs from source: $relative"
  }
}

Write-Host "Vercel prebuilt output is present, fresh, and matches the required public files."
