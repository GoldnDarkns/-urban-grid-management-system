# Push to GitHub - Instructions

## Step 1: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `urban-grid-management-system` (or your preferred name)
3. Description: "Climate- and Constraint-Aware Urban Grid & Emission Management System - Phase 1: MongoDB Foundation"
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click **"Create repository"**

## Step 2: Push Your Code

After creating the repository, GitHub will show you commands. Use these instead (already configured):

```bash
cd "C:\Users\goldn\Downloads\Urban City Manager\urban-grid-ai"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/urban-grid-management-system.git

# Rename branch to main if needed
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using SSH (if you have SSH keys set up)

```bash
git remote add origin git@github.com:YOUR_USERNAME/urban-grid-management-system.git
git branch -M main
git push -u origin main
```

## Quick Copy-Paste Commands

After creating the repo on GitHub, copy the repository URL and run:

```powershell
# Navigate to project
cd "C:\Users\goldn\Downloads\Urban City Manager\urban-grid-ai"

# Add remote (replace URL with your actual repo URL)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Push
git push -u origin main
```

## Verify

After pushing, visit your repository on GitHub to verify all files are uploaded.
