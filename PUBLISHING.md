# Publishing AutoGit Pro to VS Code Marketplace

## Prerequisites

1. **Azure DevOps Account** — [dev.azure.com](https://dev.azure.com)
2. **Personal Access Token (PAT)** with Marketplace scope
3. **Publisher ID** — Create at [marketplace.visualstudio.com/manage](https://marketplace.visualstudio.com/manage)

## Quick Publish

```bash
# Install vsce (if not installed)
npm install -g @vscode/vsce

# Login with your PAT
vsce login autogit-pro

# Package the extension
npm run package

# Publish
npm run publish
```

## Pre-Publish Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Test extension with `F5`
- [ ] Verify icon exists at `images/icon.png` (128x128 recommended)
- [ ] Run `npm run compile` (no errors)

## Creating a PAT

1. Go to [dev.azure.com](https://dev.azure.com) → User Settings → Personal Access Tokens
2. Create new token with:
   - **Organization**: All accessible organizations
   - **Scopes**: Marketplace → Manage
3. Copy and save the token securely

## Files Required

| File | Purpose |
|------|---------|
| `package.json` | Extension manifest |
| `README.md` | Marketplace page content |
| `CHANGELOG.md` | Version history |
| `LICENSE` | License file |
| `images/icon.png` | Extension icon |

## Version Updates

```bash
# Patch update (1.0.0 → 1.0.1)
npm version patch

# Minor update (1.0.0 → 1.1.0)
npm version minor

# Major update (1.0.0 → 2.0.0)
npm version major
```

## Troubleshooting

**"Publisher not found"** — Create publisher at marketplace manage page

**"Invalid PAT"** — Regenerate token with Marketplace scope

**"Missing files"** — Check `.vscodeignore` isn't excluding required files
