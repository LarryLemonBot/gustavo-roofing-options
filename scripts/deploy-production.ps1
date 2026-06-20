param(
  [switch]$SkipDeploy,
  [switch]$SkipIndexNow
)

$ErrorActionPreference = "Stop"

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][scriptblock]$Command
  )

  Write-Host ""
  Write-Host "==> $Label"
  $global:LASTEXITCODE = 0
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE"
  }
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Invoke-Step "Sync public HTML mirrors" {
  & ".\scripts\sync-public-index.ps1"
}

Invoke-Step "Verify public/root mirrors" {
  & ".\scripts\verify-public-mirrors.ps1"
}

Invoke-Step "Report local state" {
  node ".\qa\scripts\report-local-state.mjs"
}

Invoke-Step "Check git status" {
  git status --short --branch
}

Invoke-Step "Run release gate" {
  node ".\qa\scripts\run-release-gate.mjs"
}

if ($SkipDeploy) {
  Write-Host ""
  Write-Host "SkipDeploy set; production deploy, live QA, automation triage, and IndexNow submission were not run."
  exit 0
}

Invoke-Step "Deploy production with Vercel CLI" {
  vercel deploy --prod --yes --scope orbitals-projects
}

Invoke-Step "Run live custom-domain QA" {
  node ".\qa\scripts\capture-live-custom-domain-final-qa.mjs"
}

if (-not $SkipIndexNow) {
  Invoke-Step "Submit sitemap URLs to IndexNow" {
    node ".\scripts\submit-indexnow.mjs"
  }
}

Invoke-Step "Triage automation outputs" {
  node ".\qa\scripts\triage-automation-outputs.mjs"
}
