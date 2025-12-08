# Changelog

All notable changes to AutoGit Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-08

### Added

- **Core Features**
  - One-click commit & push workflow
  - Branch selection and creation before commit
  - Automatic remote configuration when missing
  - Multi-repository workspace support

- **AI Commit Message Generation**
  - OpenAI GPT integration
  - Google Gemini integration
  - Commit messages following Conventional Commits specification
  - Message preview and editing before commit

- **Commands**
  - `AutoGit Pro: Commit & Push` - Full workflow with prompts
  - `AutoGit Pro: Quick Commit (AI Message)` - Fast AI-powered commit

- **Keyboard Shortcuts**
  - `Ctrl+Shift+G Ctrl+Shift+C` - Commit & Push
  - `Ctrl+Shift+G Ctrl+Shift+Q` - Quick Commit

- **Configuration Options**
  - AI provider selection (OpenAI, Gemini, None)
  - API key configuration for each provider
  - Model selection for AI providers
  - Auto-stage all changes option
  - Confirm before push option
  - Push after commit toggle
  - Default remote name setting

- **User Experience**
  - Progress indicators during operations
  - Clear error messages with troubleshooting hints
  - Welcome message on first activation
  - Settings link for easy configuration

### Security

- API keys stored in VS Code settings (user-level)
- API calls made directly to provider endpoints
- No telemetry or data collection

## [Unreleased]

### Planned

- Auto-push on file save (opt-in)
- GitHub Actions integration
- Smart branch naming suggestions
- Team workflow templates
- Commit message linting
- Git hooks integration
- Changelog generation
- Multi-language commit messages
