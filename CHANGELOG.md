# Changelog

All notable changes to AutoGit Pro will be documented in this file.

## [1.0.3] - 2025-12-10

### Added

- ⚡ **Quick Mode** for Quick Commit command - skips prompts for faster workflow
  - Uses AI-generated message directly without confirmation
  - Stays on current branch (no branch selection prompt)
  - Skips final confirmation for instant commit & push

### Changed

- ⌨️ Updated Quick Commit shortcut to `Ctrl+Shift+Alt+C` (avoids conflicts)

### Fixed

- 🔧 Fixed "uncommitted changes would be overwritten" error when pushing to different branch
- 🔄 Reordered workflow: now commits changes first, then switches branches safely
- 📝 Improved branch selection UI with "Push to branch" prompt
- ℹ️ Better feedback showing current branch and target branch during confirmation

---

## [1.0.1] - 2025-12-08

### Added

- 👨‍💻 Developer information in README and package.json
- 🔗 Updated repository links to GitHub

### Fixed

- 🔒 Improved commit message escaping for shell safety
- ✅ Branch name validation
- 🔄 Auto-pull when push is rejected

## [1.0.0] - 2025-12-08

### Added

- 🚀 One-click commit and push workflow with interactive terminal UI
- 🤖 AI-powered commit message generation (Groq, OpenAI, Gemini)
- 📁 Auto-initialize Git repositories with GitHub URL
- 🌿 Branch switching and creation inline
- ⌨️ Keyboard shortcuts: `Ctrl+Alt+G` and `Ctrl+Alt+Q`
- ⚙️ Configurable AI providers and Git settings
