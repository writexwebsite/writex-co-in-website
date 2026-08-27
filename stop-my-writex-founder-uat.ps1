[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDirectory = Join-Path $projectRoot ".local\my-writex-founder-uat"
$processFile = Join-Path $runtimeDirectory "process.json"

if (-not (Test-Path -LiteralPath $processFile -PathType Leaf)) {
  Write-Host "No My WriteX Founder UAT process marker was found. Nothing was stopped."
  exit 0
}

$marker = Get-Content -LiteralPath $processFile -Raw | ConvertFrom-Json
if ($marker.projectRoot -ne $projectRoot -or $marker.integrationMode -ne "disabled") {
  throw "The process marker is not a valid local My WriteX Founder UAT marker. Nothing was stopped."
}

$rootProcess = Get-Process -Id ([int]$marker.processId) -ErrorAction SilentlyContinue
if (-not $rootProcess) {
  $archivedMarker = Join-Path $runtimeDirectory ("process.not-running.{0}.json" -f (Get-Date -Format "yyyyMMddTHHmmss"))
  Move-Item -LiteralPath $processFile -Destination $archivedMarker
  Write-Host "The recorded local UAT process is no longer running. No unrelated process was stopped."
  exit 0
}

$recordedStart = ([DateTimeOffset]$marker.processStartTimeUtc).UtcDateTime
$actualStart = $rootProcess.StartTime.ToUniversalTime()
if ([Math]::Abs(($actualStart - $recordedStart).TotalSeconds) -gt 2) {
  throw "PID reuse was detected. Nothing was stopped."
}

$allProcesses = Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId
$targets = [System.Collections.Generic.HashSet[int]]::new()
[void]$targets.Add([int]$marker.processId)
$added = $true
while ($added) {
  $added = $false
  foreach ($candidate in $allProcesses) {
    if ($targets.Contains([int]$candidate.ParentProcessId) -and -not $targets.Contains([int]$candidate.ProcessId)) {
      [void]$targets.Add([int]$candidate.ProcessId)
      $added = $true
    }
  }
}

$orderedTargets = @($targets) | Sort-Object -Descending
foreach ($processId in $orderedTargets) {
  Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
}

$archivedMarker = Join-Path $runtimeDirectory ("process.stopped.{0}.json" -f (Get-Date -Format "yyyyMMddTHHmmss"))
Move-Item -LiteralPath $processFile -Destination $archivedMarker

Write-Host "Stopped only the recorded local My WriteX Founder UAT process tree." -ForegroundColor Green
Write-Host "Production, LTS, PMT, HRMS, Nginx, PM2, databases, and unrelated applications were untouched."
