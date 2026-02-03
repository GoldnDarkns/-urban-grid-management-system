# Run backend with CORS fix (any localhost port allowed)
# Usage: .\scripts\run_backend.ps1
# Or from project root: $env:PYTHONPATH = (Get-Location).Path; python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $root
$env:PYTHONPATH = $root
Write-Host "Starting backend at http://localhost:8000 (CORS allows any localhost port)"
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
