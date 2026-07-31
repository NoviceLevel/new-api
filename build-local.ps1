[CmdletBinding()]
param(
    [switch]$SkipWeb
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
$webRoot = Join-Path $repoRoot 'web'
$binRoot = Join-Path $repoRoot 'bin'
$outputPath = Join-Path $binRoot 'new-api-preview.exe'

if (-not $SkipWeb) {
    $bun = Get-Command bun -ErrorAction Stop

    Push-Location $webRoot
    try {
        & $bun.Source run build
        if ($LASTEXITCODE -ne 0) {
            throw "Frontend build failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

$runningProcesses = Get-Process -Name 'new-api-preview' -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -eq $outputPath }

foreach ($process in $runningProcesses) {
    Write-Host "Stopping $($process.ProcessName) (PID $($process.Id))..."
    Stop-Process -Id $process.Id -Force
    Wait-Process -Id $process.Id -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $binRoot -Force | Out-Null

$goExecutable = Join-Path $repoRoot '.tools\go\bin\go.exe'
if (-not (Test-Path -LiteralPath $goExecutable -PathType Leaf)) {
    $goExecutable = (Get-Command go -ErrorAction Stop).Source
}

Push-Location $repoRoot
try {
    & $goExecutable build -o $outputPath .
    if ($LASTEXITCODE -ne 0) {
        throw "Go build failed with exit code $LASTEXITCODE."
    }
}
finally {
    Pop-Location
}

Write-Host "Built $outputPath"
