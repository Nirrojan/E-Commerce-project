param(
    [Parameter(Mandatory = $true)] [string] $BucketName,
    [Parameter(Mandatory = $true)] [string] $DistributionId
)
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$FrontendPath = Join-Path $RepoRoot "frontend"

Push-Location $FrontendPath
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw "npm ci failed" }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "npm run build failed" }
    aws s3 sync .\dist "s3://$BucketName/" --delete
    if ($LASTEXITCODE -ne 0) { throw "S3 upload failed" }
    aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
    if ($LASTEXITCODE -ne 0) { throw "CloudFront invalidation failed" }
}
finally {
    Pop-Location
}
