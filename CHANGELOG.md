# Changelog

All notable changes to AutoGit Pro will be documented in this file.

## [1.0.0] - 2024-12-08

### Added

- 🚀 One-click commit and push workflow with interactive terminal UI
- 🤖 AI-powered commit message generation (Groq, OpenAI, Gemini)
- 📁 Auto-initialize Git repositories with GitHub URL
- 🌿 Branch switching and creation inline
- 🔄 Auto-pull when push is rejected (remote ahead)
- ⌨️ Keyboard shortcuts: `Ctrl+Alt+G` and `Ctrl+Alt+Q`
- ⚙️ Configurable AI providers and Git settings

### AI Providers

- **Groq** (FREE - Recommended) - Llama 3.1 for fast, free commit messages
- **OpenAI** - GPT-4o-mini for high-quality messages
- **Gemini** - Google's AI for commit generation

### Security

- Commit message sanitization (escapes special shell characters)
- Branch name validation (prevents invalid characters)
- Empty message protection
