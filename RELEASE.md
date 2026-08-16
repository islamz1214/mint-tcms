# 🚀 Mint TCMS v0.1.0 - First Release Guide

## Step 1: Prepare

### 1.1 Update Version
Edit `package.json`:
```json
"version": "0.1.0"
```

### 1.2 Create CHANGELOG.md
Create file at project root:
```markdown
# Changelog

## [0.1.0] - 2026-08-16

### Added
- Initial release of Mint TCMS
- Full test case management system
- AI-powered test case generation
- REST API with OpenAPI documentation
- Modern web interface with dark mode
- Docker Compose setup for easy deployment
- Comprehensive test reporting
- Organization support with role-based access
```

### 1.3 Commit Changes
```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v0.1.0"
```

---

## Step 2: Create Git Tag

```bash
# Create annotated tag
git tag -a v0.1.0 -m "Mint TCMS v0.1.0 - Initial Release"

# Push to GitHub
git push origin main
git push origin v0.1.0
```

---

## Step 3: Create GitHub Release

1. Go to: `https://github.com/yourusername/mint-tcms/releases`
2. Click: **"Draft a new release"**
3. Fill in:
   - **Tag:** v0.1.0
   - **Title:** Mint TCMS v0.1.0 - Initial Release
   - **Description:** Copy content from CHANGELOG.md

4. Click: **"Publish Release"**

---

## ✅ Done!

Your v0.1.0 is now live on GitHub!

Users can:
- Visit landing page: `minttcms.com`
- Clone: `git clone https://github.com/yourusername/mint-tcms.git`
- Checkout release: `git checkout v0.1.0`
- Follow README.md for setup
