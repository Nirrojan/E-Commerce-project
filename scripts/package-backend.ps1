$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$BackendPath = Join-Path $RepoRoot "backend"
$ZipPath = Join-Path $RepoRoot "ecommerce-backend-eb.zip"

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

# Python's zipfile includes hidden files such as .ebextensions, unlike some
# PowerShell wildcard/Compress-Archive combinations.
@'
import os
import sys
import zipfile

source = sys.argv[1]
destination = sys.argv[2]
with zipfile.ZipFile(destination, "w", zipfile.ZIP_DEFLATED) as archive:
    for root, dirs, files in os.walk(source):
        dirs[:] = [d for d in dirs if d not in {"__pycache__", "venv", ".venv"}]
        for filename in files:
            full_path = os.path.join(root, filename)
            relative_path = os.path.relpath(full_path, source)
            archive.write(full_path, relative_path)
print(f"Created {destination}")
'@ | python - $BackendPath $ZipPath

if (-not (Test-Path $ZipPath)) { throw "Backend ZIP was not created." }
Write-Host "Ready to upload to Elastic Beanstalk: $ZipPath"
