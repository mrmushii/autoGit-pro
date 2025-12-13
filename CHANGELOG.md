# Changelog

All notable changes to AutoGit Pro will be documented in this file.

## [1.1.0] - 2025-12-13

### Added

- 🔄 **Auto Pull Command** - New `AutoGit Pro: Pull from Remote` command
  - Keyboard shortcut: `Ctrl+Shift+Alt+P` (Windows) / `Cmd+Shift+Alt+P` (Mac)
  - Select remote and branch to pull from
  - Automatic conflict detection with Source Control handover

### Changed

- 🔐 **Security**: Removed hardcoded API key - users must now configure their own
- ⚙️ **Reliability**: Refactored Git commands to use `spawn` instead of `exec` for safer argument handling
- 🔀 **UX**: Multi-repo workspaces now prompt for repository selection instead of defaulting to first

### Fixed

- 🌿 **Unrelated Histories**: Pushing to GitHub repos initialized with README now works automatically
- ⚠️ **Conflict Handling**: Merge conflicts now gracefully open the Source Control view
- 🖥️ **Terminal Persistence**: Errors no longer auto-close the terminal - users can read what went wrong
- 📝 **Commit Messages**: Special characters in messages no longer break the commit

---

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
