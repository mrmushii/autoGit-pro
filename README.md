# AutoGit Pro

> **One-click Git workflow automation with AI-powered commit messages**

[![VS Code](https://img.shields.io/badge/VS%20Code-1.85+-blue.svg)](https://code.visualstudio.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ Features

- 🚀 **One-Click Commit & Push** — Stage, commit, and push with a single shortcut
- 🤖 **AI Commit Messages** — Auto-generate meaningful commits using Groq (FREE), OpenAI, or Gemini
- 📁 **Auto-Initialize Repos** — No Git? Provide a GitHub URL and we'll set it up
- 🌿 **Branch Management** — Switch or create branches inline
- 🔄 **Smart Sync** — Auto-pull when remote has new commits
- 🔧 **Terminal-Based UI** — Clean, interactive workflow

## 🎯 Quick Start

### 1. Install

Search for **"AutoGit Pro"** in VS Code Extensions.

### 2. Get FREE API Key (Recommended)

For AI commit messages, get a free Groq API key:

1. Go to [console.groq.com](https://console.groq.com)
2. Create account (no credit card needed)
3. Generate an API key

### 3. Configure

Open VS Code Settings (`Ctrl+,`) → search "autogit-pro":

- Set **AI Provider** to `groq`
- Paste your **Groq API Key**

### 4. Use It

Press **`Ctrl+Alt+G`** and follow the prompts!

## ⌨️ Keyboard Shortcuts

| Command | Shortcut | Description |
|---------|----------|-------------|
| Commit & Push | `Ctrl+Alt+G` | Full interactive workflow |
| Quick Commit | `Ctrl+Alt+Q` | AI-first quick commit |

## 📋 Workflow Demo

```text
 AutoGit Pro - Commit & Push 

✓ Git is available
✓ Repository: D:\Projects\my-app
ℹ Current branch: main
ℹ Changes: 2 modified, 1 new
──────────────────────────────────────
▸ Branch [main]: 
⟳ Generating AI commit message...
✓ AI generated: feat: add user authentication
▸ Commit message [feat: add user authentication]: 
▸ Proceed with commit and push [Y/n]: 
──────────────────────────────────────
✓ Changes staged
✓ Commit created
✓ Pushed to origin/main
✓ ✨ All done!
```

**Press Enter** to accept defaults — it's that simple!

## 🤖 AI Providers

| Provider | Cost | Speed | Get Key |
|----------|------|-------|---------|
| **Groq** | FREE | ⚡ Fast | [console.groq.com](https://console.groq.com) |
| OpenAI | Paid | Fast | [platform.openai.com](https://platform.openai.com) |
| Gemini | Free tier | Fast | [aistudio.google.com](https://aistudio.google.com) |

## ⚙️ Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `aiProvider` | `groq` | AI provider (groq/openai/gemini/none) |
| `groqApiKey` | — | Your Groq API key |
| `autoStageAll` | `true` | Auto-stage all changes |
| `pushAfterCommit` | `true` | Auto-push after commit |
| `confirmBeforePush` | `true` | Confirm before pushing |

## 🆕 New Repo Setup

Open a folder without Git initialized:

1. Extension prompts for GitHub repo URL
2. Runs `git init -b main`
3. Adds remote origin
4. Ready to commit!

## 📦 Requirements

- VS Code 1.85+
- Git installed and in PATH
- (Optional) API key for AI commits

## 🔧 Troubleshooting

**"Git not found"** — Install Git and add to PATH

**"AI failed"** — Check API key and internet connection

**"Push rejected"** — Extension auto-pulls and retries

## 📄 License

MIT License

---

**Made with ❤️ for developers**
