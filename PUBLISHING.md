# Publishing AutoGit Pro to VS Code Marketplace

This guide covers publishing AutoGit Pro to the Visual Studio Code Marketplace.

## Prerequisites

1. **Azure DevOps Account** - [Create one here](https://dev.azure.com/)
2. **Personal Access Token (PAT)** - Required for authentication
3. **Publisher Account** - Created through the VS Marketplace

## Step 1: Create Azure DevOps Personal Access Token

1. Sign in to [Azure DevOps](https://dev.azure.com/)
2. Click on your profile icon → **Personal access tokens**
3. Click **New Token**
4. Configure the token:
   - **Name**: `vscode-extension-publish`
   - **Organization**: Select "All accessible organizations"
   - **Expiration**: Choose an appropriate duration
   - **Scopes**: Select **Custom defined** → **Marketplace** → **Manage**
5. Click **Create** and copy the token (you won't see it again!)

## Step 2: Create Publisher Account

1. Visit [Visual Studio Marketplace Management](https://marketplace.visualstudio.com/manage)
2. Click **Create Publisher**
3. Fill in:
   - **Publisher ID**: `autogit-pro` (must match `package.json`)
   - **Display Name**: `AutoGit Pro`
   - **Description**: Optional description
4. Click **Create**

## Step 3: Install VSCE

```bash
npm install -g @vscode/vsce
```

Or use npx (no global install needed):
```bash
npx @vscode/vsce --version
```

## Step 4: Login to VSCE

```bash
npx vsce login autogit-pro
# Enter your Personal Access Token when prompted
```

## Step 5: Package the Extension

Before publishing, always test locally:

```bash
# Compile TypeScript
npm run compile

# Create the .vsix package
npx vsce package
```

This creates `autogit-pro-1.0.0.vsix`.

### Test the Package Locally

1. Open VS Code
2. Press `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
3. Select the `.vsix` file
4. Test all functionality

## Step 6: Publish to Marketplace

```bash
npx vsce publish
```

Or publish with version bump:
```bash
# Patch version (1.0.0 → 1.0.1)
npx vsce publish patch

# Minor version (1.0.0 → 1.1.0)
npx vsce publish minor

# Major version (1.0.0 → 2.0.0)
npx vsce publish major

# Specific version
npx vsce publish 1.2.3
```

## Updating the Extension

1. Make your changes
2. Update `CHANGELOG.md`
3. Run: `npx vsce publish patch` (or minor/major)

## Pre-Publish Checklist

- [ ] Update version in `package.json`
- [ ] Update `CHANGELOG.md`
- [ ] Run `npm run compile` (no errors)
- [ ] Run `npm run lint` (no errors)
- [ ] Test extension locally
- [ ] Create and test `.vsix` package
- [ ] Verify `README.md` is complete
- [ ] Add extension icon (`images/icon.png` - 128x128px)
- [ ] Review all configuration options
- [ ] Test on Windows, macOS, and Linux if possible

## Extension Icon

Create a 128x128 pixel PNG icon and save it to `images/icon.png`.

The icon appears:
- In the VS Code Extensions sidebar
- On the Marketplace listing page
- In search results

## Marketplace Page Optimization

### Good README Practices
- Include screenshots/GIFs of the extension in action
- List all features clearly
- Provide clear installation instructions
- Document all configuration options
- Include troubleshooting section

### Badges (Optional)

Add badges to your README for visibility:

```markdown
[![Version](https://img.shields.io/visual-studio-marketplace/v/autogit-pro.autogit-pro)](https://marketplace.visualstudio.com/items?itemName=autogit-pro.autogit-pro)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/autogit-pro.autogit-pro)](https://marketplace.visualstudio.com/items?itemName=autogit-pro.autogit-pro)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/autogit-pro.autogit-pro)](https://marketplace.visualstudio.com/items?itemName=autogit-pro.autogit-pro)
```

## Unpublishing

To remove an extension from the Marketplace:

```bash
npx vsce unpublish autogit-pro.autogit-pro
```

**Warning**: This is permanent and the extension ID cannot be reused.

## Troubleshooting

### "ERROR: ENEEDAUTH"
- Re-run `npx vsce login <publisher-name>`
- Ensure PAT has Marketplace → Manage scope

### "ERROR: Missing publisher name"
- Ensure `publisher` in `package.json` matches your publisher ID

### "ERROR: No Personal Access Token"
- Create a new PAT in Azure DevOps
- Run `npx vsce login` again

### Extension not appearing after publish
- Wait 5-10 minutes for Marketplace to update
- Check [Marketplace Management](https://marketplace.visualstudio.com/manage) for status

## Resources

- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Extension Manifest Reference](https://code.visualstudio.com/api/references/extension-manifest)
- [Marketplace Management](https://marketplace.visualstudio.com/manage)
- [vsce on npm](https://www.npmjs.com/package/@vscode/vsce)
