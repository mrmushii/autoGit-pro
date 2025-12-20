# Changelog

All notable changes to AutoGit Pro will be documented in this file.

## [1.2.0] - 2025-12-21

### 🚀 Major Feature Release

This release brings **6 powerful new features** to supercharge your Git workflow!

### Added

#### 🎨 Advanced AI Commit Styles
- Choose between **Basic**, **Conventional**, or **Detailed** commit message styles
- Conventional format: `feat(scope): description`
- Detailed format: Multi-line with bullet points explaining changes
- New settings: `commitStyle` and `includeScope`

#### 📝 Custom Commit Templates  
- Save and reuse your favorite commit message templates
- 7 built-in templates (Feature, Bug Fix, Docs, Refactor, etc.)
- Create custom templates with variables: `{type}`, `{scope}`, `{subject}`
- New command: **"AutoGit Pro: Manage Commit Templates"**

#### 🔀 Multi-Repo Support
- Work with multiple Git repositories in single workspace
- Support for **monorepo** structures with nested repos
- Three modes: `ask` (prompt), `all` (commit all), `active` (use active file's repo)
- New settings: `multiRepoMode`, `scanNestedRepos`

#### 📊 Local Usage Analytics
- Track your productivity: commits, pushes, pulls, AI messages
- Estimated **time saved** displayed after each operation
- Daily streak tracking for consistent developers
- New command: **"AutoGit Pro: Show My Stats"**
- 100% local - no external telemetry!

#### 📈 Commit History Dashboard
- Beautiful **WebView dashboard** for commit analysis
- **Code Quality Score** (0-100) based on your practices
- Statistics: avg files/commit, lines changed, most active day
- Strengths & Areas to Improve with personalized tips
- Recent commits timeline with type badges
- New command: **"AutoGit Pro: Commit History & Analysis"**

#### ⚡ Auto-Commit on Save
- Automatically commit when you save files
- **Debounced commits** - batches saves with configurable delay (default 30s)
- AI-generated commit messages for auto-commits
- Optional auto-push after commit
- **Status bar indicator** - click to toggle ON/OFF
- File pattern filtering with glob support
- New command: **"AutoGit Pro: Toggle Auto-Commit"**

---

## [1.1.2] - 2025-12-14

### Fixed


- 🖼️ **README Images** - Fixed images not displaying on VS Code Marketplace 

---

## [1.1.1] - 2025-12-14

### Added

- 🤖 **AI-Powered Error Analysis** - When Git errors or conflicts occur, AI explains in plain language and suggests fixes
  - Works with Groq (FREE), OpenAI, and Gemini providers
  - Provides step-by-step resolution instructions for conflicts
  - Detects rebase, merge, and pull conflicts with tailored guidance
  - Gracefully falls back to formatted display if AI is not configured

### Improved

- 🎨 **Professional Error Display** - Raw Git output is now cleaned and formatted with emojis and clear structure
- 📋 **Smart Conflict Detection** - Automatically identifies conflict type and provides relevant instructions

---

## [1.1.0] - 2025-12-13

### Added

- 🔄 **Auto Sync Command** - New `AutoGit Pro: Pull from Remote` command
  - Keyboard shortcut: `Ctrl+Shift+Alt+P` (Windows) / `Cmd+Shift+Alt+P` (Mac)
  - **Full Sync**: Pulls remote changes AND pushes local commits in one action
  - Select remote and branch to sync with
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
