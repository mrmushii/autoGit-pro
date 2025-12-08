# AutoGit Pro - VS Code Extension

<p align="center">
  <img src="images/icon.png" alt="AutoGit Pro" width="128">
</p>

**Automate Git workflows with AI-powered commit message generation.**

AutoGit Pro streamlines your Git workflow by providing a single keyboard shortcut to stage, commit, and push your changes. With optional AI integration (OpenAI or Google Gemini), it can automatically generate meaningful commit messages following best practices.

## ✨ Features

- **🚀 One-Click Commit & Push** - Stage, commit, and push with a single keyboard shortcut
- **🤖 AI-Powered Commit Messages** - Generate intelligent commit messages using OpenAI GPT or Google Gemini
- **🌿 Branch Management** - Switch branches or create new ones before committing
- **📡 Remote Auto-Configuration** - Automatically prompt for remote URL if not configured
- **📦 Multi-Repo Support** - Works with multiple repositories in your workspace
- **⚡ Quick Mode** - Skip prompts for faster commits with AI-generated messages

## 📥 Installation

### From VS Code Marketplace

1. Open VS Code
2. Press `Ctrl+P` / `Cmd+P`
3. Type `ext install autogit-pro`
4. Press Enter

### From VSIX File

1. Download the `.vsix` file from releases
2. Open VS Code
3. Press `Ctrl+Shift+P` / `Cmd+Shift+P`
4. Type "Install from VSIX" and select it
5. Choose the downloaded `.vsix` file

## ⌨️ Keyboard Shortcuts

| Command | Shortcut (Windows/Linux) | Shortcut (Mac) |
|---------|--------------------------|----------------|
| Commit & Push | `Ctrl+Shift+G Ctrl+Shift+C` | `Cmd+Shift+G Cmd+Shift+C` |
| Quick Commit (AI) | `Ctrl+Shift+G Ctrl+Shift+Q` | `Cmd+Shift+G Cmd+Shift+Q` |

You can customize these in VS Code's Keyboard Shortcuts settings.

## ⚙️ Configuration

Open VS Code settings (`Ctrl+,` / `Cmd+,`) and search for "AutoGit Pro".

### AI Provider Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `autogit-pro.aiProvider` | AI provider for commit messages (`openai`, `gemini`, `none`) | `none` |
| `autogit-pro.openaiApiKey` | Your OpenAI API key | - |
| `autogit-pro.openaiModel` | OpenAI model to use | `gpt-4o-mini` |
| `autogit-pro.geminiApiKey` | Your Google Gemini API key | - |
| `autogit-pro.geminiModel` | Gemini model to use | `gemini-1.5-flash` |

### Workflow Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `autogit-pro.defaultRemote` | Default remote name for push | `origin` |
| `autogit-pro.autoStageAll` | Automatically stage all changes | `true` |
| `autogit-pro.confirmBeforePush` | Show confirmation before pushing | `true` |
| `autogit-pro.pushAfterCommit` | Automatically push after commit | `true` |

### Example Configuration (settings.json)

```json
{
  "autogit-pro.aiProvider": "openai",
  "autogit-pro.openaiApiKey": "sk-...",
  "autogit-pro.openaiModel": "gpt-4o-mini",
  "autogit-pro.confirmBeforePush": true,
  "autogit-pro.autoStageAll": true
}
```

## 🤖 AI Commit Message Examples

When using AI-powered commit generation, AutoGit Pro analyzes your changes and generates messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat(auth): Add OAuth2 login with Google provider

- Implement OAuth2 flow using passport.js
- Add Google strategy configuration
- Create user session management
- Add logout endpoint
```

```
fix(api): Handle null response in user endpoint

Prevents crash when user service returns null for
non-existent users. Now returns 404 with proper error message.
```

```
refactor(core): Simplify error handling logic

Replace nested try-catch blocks with async error middleware.
Reduces code duplication and improves readability.
```

```
docs(readme): Update installation instructions

Add VSIX installation method and troubleshooting section.
```

## 🔧 Workflow

When you trigger AutoGit Pro (default: `Ctrl+Shift+G Ctrl+Shift+C`):

1. **Detect Repository** - Finds the Git repository from your active file or workspace
2. **Check Changes** - Verifies there are changes to commit
3. **Branch Selection** - Optionally switch to a different branch or create a new one
4. **Commit Message** - Choose between AI-generated or manual commit message
5. **Remote Check** - If no remote is configured, prompts for the URL
6. **Confirm & Execute** - Shows summary and executes git add, commit, push

### Quick Mode

Use `Ctrl+Shift+G Ctrl+Shift+Q` for a faster workflow:
- Automatically generates AI commit message (if configured)
- Skips branch selection
- Minimal confirmations

## 🛠️ Requirements

- **VS Code** 1.85.0 or higher
- **Git** installed and available in PATH
- **API Key** (optional) - OpenAI or Google Gemini for AI features

## 🐛 Troubleshooting

### "Git is not installed or not in PATH"
- Ensure Git is installed: Download from [git-scm.com](https://git-scm.com/)
- Verify by running `git --version` in a terminal

### "No Git repository found"
- Open a folder containing a Git repository
- Initialize a repo with `git init` if needed

### AI message generation fails
- Check your API key is correctly set in settings
- Verify you have API credits/quota remaining
- Try switching to a different AI provider

### Push fails
- Ensure you have write access to the remote repository
- Check for uncommitted merge conflicts
- Verify branch tracking is set up correctly

## 📦 Building from Source

```bash
# Clone the repository
git clone https://github.com/autogit-pro/autogit-pro-vscode.git
cd autogit-pro-vscode

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npm run package
```

## 🚀 Future Enhancements

- [ ] Auto-push on file save (opt-in)
- [ ] GitHub Actions integration
- [ ] Smart branch naming suggestions
- [ ] Team workflow templates
- [ ] Commit message linting
- [ ] Git hooks integration
- [ ] Changelog generation
- [ ] Multi-language commit messages

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

---

**Enjoy hassle-free Git workflows with AutoGit Pro!** 🚀
