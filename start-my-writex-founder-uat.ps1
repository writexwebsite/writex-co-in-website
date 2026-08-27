[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$expectedBranch = "feature/my-writex-v1"
$frozenCommit = "1f805b06d1cb88d2cdeea2b4e0e6ca6f9110298b"
$frozenTag = "my-writex-stage3a-founder-uat-candidate"
$runtimeDirectory = Join-Path $projectRoot ".local\my-writex-founder-uat"
$processFile = Join-Path $runtimeDirectory "process.json"
$requestStore = Join-Path $runtimeDirectory "requests.json"
$stdoutLog = Join-Path $runtimeDirectory "server.stdout.log"
$stderrLog = Join-Path $runtimeDirectory "server.stderr.log"

function Assert-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' is not available."
  }
}

function Assert-SharedFileHash([string]$RelativePath, [string]$ExpectedHash) {
  $target = Join-Path $projectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $target -PathType Leaf)) {
    throw "Frozen shared file is missing: $RelativePath"
  }
  $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $ExpectedHash) {
    throw "Frozen shared file changed: $RelativePath. Restore the Stage 3A UAT workspace before starting."
  }
}

Set-Location -LiteralPath $projectRoot
Assert-Command "git"
Assert-Command "node"
Assert-Command "pnpm"

$branch = (git branch --show-current).Trim()
if ($branch -ne $expectedBranch) {
  throw "Wrong branch '$branch'. Expected '$expectedBranch'."
}

$tagTarget = (git rev-list -n 1 $frozenTag 2>$null).Trim()
if ($tagTarget -ne $frozenCommit) {
  throw "The Stage 3A tag is missing or does not resolve to the frozen commit $frozenCommit."
}

$frozenPathspecs = @(
  "app/my-writex",
  "components/my-writex",
  "app/client",
  "components/client",
  "lib/client",
  "app/api/client",
  "app/api/my-writex",
  "app/api/dev/my-writex-requests",
  "app/dev/my-writex-requests",
  ":(glob)lib/my-writex/*.ts"
)
$frozenProductChanges = @(git diff --name-only $frozenCommit -- @frozenPathspecs)
if ($frozenProductChanges.Count -gt 0) {
  throw "Frozen Stage 3A product files changed after checkpoint: $($frozenProductChanges -join ', ')"
}

Assert-SharedFileHash "components/AppChrome.tsx" "8cda3ab9a2286e4ad079790a86462da87cd36aa68a7e99d45305ad724584fbd0"
Assert-SharedFileHash "app/layout.tsx" "0108a3586be096b236b011fbe0ef1635845d8f589443928f21d375646a40bfc8"
Assert-SharedFileHash "components/auth/AuthShell.tsx" "7e15149b5caffb1b534ae666fe05c01ba5e7fdb136bbd2f6213f33e236bb6542"
Assert-SharedFileHash "components/auth/axo/AxoLoginTransition.tsx" "c8fc47e4c2870c4931c7761aae7789bcfe0730fc41bd20533b05a4894c2e60f4"
Assert-SharedFileHash "components/auth/axo/AxoScrollStory.tsx" "fa4b6ce2c0f6d3db20a63bf0e42e3bab130d2402ebc54514010c6fc17a743003"
Assert-SharedFileHash "components/auth/DesignerLoginThemeRenderer.tsx" "120fbdfd203cdb0cc4354864df8ffc025a4484d528f51ac29d5ac37988b611f8"
Assert-SharedFileHash "components/auth/LoginPreviewAppearance.tsx" "d1a3c2f06afa35e5e2a61df67c40d7dba42bfd9374fb9bed761129ab5aa5016a"

$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
  throw "Port 3000 is already in use. This launcher will not stop or reuse an unrelated process."
}

New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
if (Test-Path -LiteralPath $processFile) {
  $archivedProcessFile = Join-Path $runtimeDirectory ("process.previous.{0}.json" -f (Get-Date -Format "yyyyMMddTHHmmss"))
  Move-Item -LiteralPath $processFile -Destination $archivedProcessFile
}
if (Test-Path -LiteralPath $requestStore) {
  $archivedRequestStore = Join-Path $runtimeDirectory ("requests.previous.{0}.json" -f (Get-Date -Format "yyyyMMddTHHmmss"))
  Move-Item -LiteralPath $requestStore -Destination $archivedRequestStore
}

$env:NODE_ENV = "development"
$env:MY_WRITEX_DEV_FIXTURES = "true"
$env:MY_WRITEX_REQUEST_STORE_PATH = $requestStore
$env:INTEGRATION_MODE = "disabled"
$env:LTS_API_BASE_URL = ""
$env:LTS_API_KEY = ""
$env:PMT_API_BASE_URL = ""
$env:PMT_API_KEY = ""
$env:DATABASE_URL = ""

if ($env:MY_WRITEX_DEV_FIXTURES -ne "true" -or $env:INTEGRATION_MODE -ne "disabled") {
  throw "Safe local fixture environment could not be established."
}

$pnpmPath = (Get-Command pnpm.cmd -ErrorAction SilentlyContinue).Source
if (-not $pnpmPath) {
  $pnpmPath = (Get-Command pnpm).Source
}

$process = Start-Process `
  -FilePath $pnpmPath `
  -ArgumentList @("dev", "--hostname", "127.0.0.1", "--port", "3000") `
  -WorkingDirectory $projectRoot `
  -WindowStyle Hidden `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -PassThru

@{
  processId = $process.Id
  processStartTimeUtc = $process.StartTime.ToUniversalTime().ToString("O")
  projectRoot = $projectRoot
  frozenCommit = $frozenCommit
  integrationMode = "disabled"
} | ConvertTo-Json | Set-Content -LiteralPath $processFile -Encoding utf8

$ready = $false
for ($attempt = 1; $attempt -le 60; $attempt += 1) {
  if ($process.HasExited) {
    throw "The local server stopped during startup. Review $stderrLog."
  }
  try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/client-login" -UseBasicParsing -TimeoutSec 2
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      $ready = $true
      break
    }
  } catch {}
  if (-not $ready) { Start-Sleep -Seconds 1 }
}
if (-not $ready) {
  throw "The local UAT server did not become ready within 60 seconds. Review $stderrLog."
}

$urls = @(
  "http://127.0.0.1:3000/client-login",
  "http://127.0.0.1:3000/my-writex",
  "http://127.0.0.1:3000/my-writex/new-requirement",
  "http://127.0.0.1:3000/my-writex/requests",
  "http://127.0.0.1:3000/my-writex/upcoming",
  "http://127.0.0.1:3000/client/overview",
  "http://127.0.0.1:3000/dev/my-writex-requests"
)

Write-Host ""
Write-Host "My WriteX Founder UAT is ready (localhost only)." -ForegroundColor Green
Write-Host "Frozen tag: $frozenTag -> $frozenCommit"
Write-Host "Full customer fixture: WriteX ID rahulsharma.7k2 | Registered phone +447700900001"
Write-Host "Invoice-only fixture: Invoice WX-MW-1001 | Registered phone +447700900001"
Write-Host "Founder UAT URLs:"
$urls | ForEach-Object { Write-Host "  $_" }
Write-Host "Integration mode: disabled; LTS/PMT/database endpoints cleared for this child process."
Write-Host "Stop with: .\stop-my-writex-founder-uat.ps1"

Start-Process "http://127.0.0.1:3000/client-login"
