# PowerShell script to push to GitHub
# Usage: .\push_to_github.ps1 -GitHubUsername "yourusername" -RepoName "urban-grid-management-system"

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,
    
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "urban-grid-management-system"
)

Write-Host "=== Pushing to GitHub ===" -ForegroundColor Green
Write-Host ""

# Check if remote already exists
$remoteExists = git remote get-url origin 2>$null
if ($remoteExists) {
    Write-Host "Remote 'origin' already exists: $remoteExists" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to update it? (y/n)"
    if ($overwrite -eq "y") {
        git remote remove origin
    } else {
        Write-Host "Exiting. Please update remote manually." -ForegroundColor Red
        exit 1
    }
}

# Add remote
$repoUrl = "https://github.com/$GitHubUsername/$RepoName.git"
Write-Host "Adding remote: $repoUrl" -ForegroundColor Cyan
git remote add origin $repoUrl

# Ensure we're on main branch
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "Renaming branch to 'main'..." -ForegroundColor Cyan
    git branch -M main
}

# Push
Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Successfully pushed to GitHub!" -ForegroundColor Green
    Write-Host "Repository URL: https://github.com/$GitHubUsername/$RepoName" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "✗ Push failed. Please check:" -ForegroundColor Red
    Write-Host "  1. Repository exists on GitHub" -ForegroundColor Yellow
    Write-Host "  2. You have push access" -ForegroundColor Yellow
    Write-Host "  3. Your credentials are correct" -ForegroundColor Yellow
}
