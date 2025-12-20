# AutoGit Pro

> **One-click Git workflow automation with AI-powered commit messages**

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue.svg)](https://code.visualstudio.com/)
[![Version](https://img.shields.io/badge/Version-1.2.0-brightgreen.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

![AutoGit Pro Hero](https://raw.githubusercontent.com/mrmushii/autoGit-pro/main/images/hero-banner.png)

---

## ✨ Features

### 🚀 One-Click Commit & Push
Stage, commit, and push all your changes with a single keyboard shortcut. No more switching between terminal and editor.

![Commit Demo](https://raw.githubusercontent.com/mrmushii/autoGit-pro/main/images/commit-demo.png)

### 🤖 AI-Powered Commit Messages
Let AI analyze your changes and generate meaningful, conventional commit messages. Supports:
- **Groq** (FREE - Recommended!)
- **OpenAI** (GPT-4)
- **Google Gemini**

### 🔄 Full Git Sync
Pull remote changes AND push local commits in one action. Perfect for team collaboration.

### ⚡ Quick Mode
Skip all prompts and commit instantly with AI-generated messages. Ideal for rapid iteration.

### 🛡️ AI-Powered Error Analysis (NEW in v1.1.1!)
When conflicts or errors occur, AI explains what went wrong in plain language and provides step-by-step fixes.

![AI Error Analysis](https://raw.githubusercontent.com/mrmushii/autoGit-pro/main/images/ai-error-analysis.png)


- Detects rebase, merge, and pull conflicts
- Provides tailored resolution instructions
- Works with Groq, OpenAI, and Gemini
- Falls back to formatted display if AI isn't configured

### 🎨 Advanced Commit Styles (NEW in v1.2.0!)
Choose your preferred commit message format:
- **Basic**: Simple descriptive messages
- **Conventional**: `feat(scope): description` format
- **Detailed**: Multi-line with bullet points

![AI Commit Styles](https://raw.githubusercontent.com/mrmushii/autoGit-pro/main/images/feature-ai-styles.png)

### 📝 Custom Templates (NEW in v1.2.0!)
Save and reuse your favorite commit message patterns with variable support.

![Custom Templates](https://raw.githubusercontent.com/mrmushii/autoGit-pro/main/images/feature-templates.png)

### 📊 Analytics Dashboard (NEW in v1.2.0!)
- Track commits, pushes, pulls, and AI messages
- See your estimated **time saved**
- View **Commit History & Analysis** with quality scoring

![Analytics Dashboard](https://raw.githubusercontent.com/mrmushii/autoGit-pro/main/images/feature-analytics.png)

### ⚡ Auto-Commit on Save (NEW in v1.2.0!)
Enable automatic commits when you save files with debounced batching.

![Auto-Commit](https://raw.githubusercontent.com/mrmushii/autoGit-pro/main/images/feature-auto-commit.png)

### 🎛️ Status Bar Menu (NEW in v1.2.0!)
Click the **AutoGit Pro** icon in the status bar for a dropdown with all commands - no more Command Palette hunting!

---


## 🎯 Quick Start

### Step 1: Install

Search for **"AutoGit Pro"** in VS Code Extensions, or:

```bash
code --install-extension autogit-pro.autogit-pro
```

### Step 2: Get a FREE API Key

For AI commit messages, get a free Groq API key (no credit card needed):

1. Go to [console.groq.com](https://console.groq.com)
2. Create an account
3. Generate an API key

### Step 3: Configure

1. Open VS Code Settings (`Ctrl+,` or `Cmd+,`)
2. Search for "autogit-pro"
3. Set **AI Provider** to `groq`
4. Paste your **Groq API Key**

<!-- Uncomment when you have screenshot:
![Settings Screenshot](images/settings.png)
-->

### Step 4: Use It!

Press **`Ctrl+Alt+G`** (Windows/Linux) or **`Cmd+Alt+G`** (Mac) and follow the prompts!

---

## ⌨️ Keyboard Shortcuts

| Command | Windows/Linux | Mac | Description |
|---------|---------------|-----|-------------|
| **Commit & Push** | `Ctrl+Alt+G` | `Cmd+Alt+G` | Full interactive workflow with prompts |
| **Quick Commit** | `Ctrl+Shift+Alt+C` | `Cmd+Shift+Alt+C` | ⚡ Instant commit with AI message (no prompts) |
| **Sync (Pull & Push)** | `Ctrl+Shift+Alt+P` | `Cmd+Shift+Alt+P` | 🔄 Pull remote + push local commits |
| **Show My Stats** | — | — | 📊 View usage analytics and time saved |
| **Commit History** | — | — | 📈 Open history dashboard with AI analysis |
| **Toggle Auto-Commit** | — | — | ⚡ Enable/disable auto-commit on save |
| **Manage Templates** | — | — | 📝 Create and manage commit templates |

---

## 📋 Workflow Examples

### Standard Commit & Push

```
╔══════════════════════════════════════════╗
║  AutoGit Pro - Commit & Push             ║
╚══════════════════════════════════════════╝

✓ Git is available
✓ Repository: D:\Projects\my-app
ℹ Current branch: main
ℹ Changes: 2 staged, 1 modified, 3 new
──────────────────────────────────────────────
▸ Push to branch [main]: 
⟳ Generating AI commit message...
✓ AI generated commit message:
  feat: add user authentication with JWT tokens
▸ Commit message [feat: add user authentication...]: 
──────────────────────────────────────────────
ℹ Current branch: main
ℹ Message: feat: add user authentication with JWT tokens
▸ Proceed with commit and push [Y/n]: 
──────────────────────────────────────────────
✓ Changes staged
✓ Commit created
✓ Pushed to origin/main
✨ All done! Commit and push completed successfully.
```

### Sync (Pull & Push)

```
╔══════════════════════════════════════════╗
║  AutoGit Pro - Commit & Push             ║
╚══════════════════════════════════════════╝

✓ Git is available
✓ Repository: D:\Projects\my-app
✓ Working directory is clean
ℹ Current branch: feature-branch
✓ Found 1 remote(s): origin
──────────────────────────────────────────────
⟳ Fetching from origin...
✓ Fetch complete
▸ Pull branch [feature-branch]: 
──────────────────────────────────────────────
ℹ Will pull from: origin/feature-branch
ℹ Into local branch: feature-branch
▸ Proceed with pull [Y/n]: 
──────────────────────────────────────────────
✓ Pull completed successfully!
✓ Pushed local commits to origin/feature-branch
✨ All done! Pull and push completed successfully.
```

---

## 🤖 AI Providers Comparison

| Provider | Cost | Speed | Best For |
|----------|------|-------|----------|
| **Groq** ⭐ | FREE | ⚡ Fastest | Everyone (Recommended!) |
| OpenAI | Paid ($) | Fast | Enterprise with existing OpenAI usage |
| Gemini | Free tier | Fast | Google Cloud users |

### Getting API Keys

- **Groq**: [console.groq.com](https://console.groq.com) - Free, no credit card
- **OpenAI**: [platform.openai.com](https://platform.openai.com) - Requires payment method
- **Gemini**: [aistudio.google.com](https://aistudio.google.com) - Free tier available

---

## ⚙️ All Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `autogit-pro.aiProvider` | `groq` | AI provider: `groq`, `openai`, `gemini`, or `none` |
| `autogit-pro.groqApiKey` | — | Your Groq API key |
| `autogit-pro.groqModel` | `llama-3.1-8b-instant` | Groq model to use |
| `autogit-pro.openaiApiKey` | — | Your OpenAI API key |
| `autogit-pro.openaiModel` | `gpt-4o-mini` | OpenAI model to use |
| `autogit-pro.geminiApiKey` | — | Your Gemini API key |
| `autogit-pro.geminiModel` | `gemini-2.0-flash-001` | Gemini model to use |
| `autogit-pro.defaultRemote` | `origin` | Default remote for push/pull |
| `autogit-pro.autoStageAll` | `true` | Automatically stage all changes |
| `autogit-pro.pushAfterCommit` | `true` | Automatically push after commit |
| `autogit-pro.confirmBeforePush` | `true` | Show confirmation before pushing |
| `autogit-pro.commitStyle` | `basic` | AI commit style: `basic`, `conventional`, `detailed` |
| `autogit-pro.includeScope` | `true` | Include scope in conventional commits |
| `autogit-pro.multiRepoMode` | `ask` | Multi-repo handling: `ask`, `all`, `active` |
| `autogit-pro.scanNestedRepos` | `false` | Scan for nested repos (monorepos) |
| `autogit-pro.autoCommit.enabled` | `false` | Enable auto-commit on file save |
| `autogit-pro.autoCommit.delay` | `30` | Seconds to wait before auto-committing |

---

## 🆕 New Repository Setup

Don't have Git initialized? No problem!

1. Open a folder without `.git`
2. Run **Commit & Push** (`Ctrl+Alt+G`)
3. Enter your GitHub repository URL when prompted
4. Extension runs `git init -b main` and adds remote
5. Ready to commit!

---

## 🔧 Troubleshooting

### "Git not found"
- Install Git from [git-scm.com](https://git-scm.com)
- Ensure Git is in your system PATH
- Restart VS Code after installation

### "AI generation failed"
- Check your API key is correct
- Verify internet connection
- Try a different AI provider

### "Push rejected"
- Extension automatically pulls and retries
- If conflicts exist, Source Control view opens automatically

### "Unrelated histories" error
- Fixed in v1.1.0! Extension now handles this automatically
- Occurs when remote repo was initialized with README

### Terminal closes too fast
- Fixed in v1.1.0! Terminal now stays open on errors

---

## 📦 Requirements

- **VS Code** 1.85 or higher
- **Git** installed and in PATH
- **API Key** (optional) for AI commit messages

---

## 🔄 What's New in v1.2.0

🎉 **Major Feature Release!** This version brings 6 powerful new features:

- 🎨 **Advanced AI Commit Styles** - Choose Basic, Conventional, or Detailed format
- 📝 **Custom Commit Templates** - Save and reuse your favorite patterns
- 🔀 **Multi-Repo Support** - Work with monorepos and multiple repositories
- 📊 **Local Analytics** - Track productivity and time saved
- 📈 **Commit History Dashboard** - Beautiful WebView with quality scoring
- ⚡ **Auto-Commit on Save** - Automatic commits with debouncing

See [CHANGELOG.md](CHANGELOG.md) for full history.

---

## 👨‍💻 Developer

**Mushfiqur Rahman**

- 🔗 GitHub: [@mrmushii](https://github.com/mrmushii)
- 💼 LinkedIn: [Mushfiqur Rahman](https://www.linkedin.com/in/mushfiqur-rahman-7bb295289/)
- 🌐 Portfolio: [my-portfolio-eight-phi-80.vercel.app](https://my-portfolio-eight-phi-80.vercel.app/)

---

## 📄 License

MIT License © 2025 Mushfiqur Rahman

See [LICENSE](LICENSE) for details.

---

## 🙏 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

**Made with ❤️ by Mushfiqur Rahman**

*Star ⭐ this repo if you find it useful!*
