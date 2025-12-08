/**
 * AutoGit Pro - UI Prompts
 * User interface interactions using VS Code API
 */

import * as vscode from 'vscode';
import type { CommitMessageMode, BranchSelection } from '../types';

/**
 * Show a branch picker with the current branch highlighted
 */
export async function showBranchPicker(
    branches: string[],
    currentBranch: string
): Promise<BranchSelection | undefined> {
    const items = branches.map(branch => ({
        label: branch === currentBranch ? `$(check) ${branch}` : branch,
        description: branch === currentBranch ? '(current)' : '',
        branch,
        isCurrent: branch === currentBranch,
    }));

    // Add option to create new branch
    items.push({
        label: '$(add) Create new branch...',
        description: '',
        branch: '__new__',
        isCurrent: false,
    });

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: `Current branch: ${currentBranch}`,
        title: 'AutoGit Pro: Select Branch',
    });

    if (!selected) {
        return undefined;
    }

    if (selected.branch === '__new__') {
        const newBranchName = await vscode.window.showInputBox({
            prompt: 'Enter new branch name',
            placeHolder: 'feature/my-new-feature',
            validateInput: (value: string) => {
                if (!value || value.trim().length === 0) {
                    return 'Branch name cannot be empty';
                }
                if (!/^[\w\-./]+$/.test(value)) {
                    return 'Branch name contains invalid characters';
                }
                if (branches.includes(value)) {
                    return 'Branch already exists';
                }
                return undefined;
            },
        });

        if (!newBranchName) {
            return undefined;
        }

        return {
            branch: newBranchName,
            switched: true,
        };
    }

    return {
        branch: selected.branch,
        switched: !selected.isCurrent,
    };
}

/**
 * Show commit message mode selection
 */
export async function showCommitMessageModeChoice(
    aiAvailable: boolean
): Promise<CommitMessageMode | undefined> {
    const items: vscode.QuickPickItem[] = [];

    if (aiAvailable) {
        items.push({
            label: '$(sparkle) AI-Generated',
            description: 'Generate commit message using AI',
            detail: 'Analyzes your changes and creates a descriptive commit message',
        });
    } else {
        items.push({
            label: '$(sparkle) AI-Generated (Not Configured)',
            description: 'Configure AI provider in settings',
            detail: 'Set up OpenAI or Gemini API key to enable',
        });
    }

    items.push({
        label: '$(edit) Manual',
        description: 'Type your own commit message',
        detail: 'Enter a custom commit message',
    });

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'How would you like to create the commit message?',
        title: 'AutoGit Pro: Commit Message',
    });

    if (!selected) {
        return undefined;
    }

    if (selected.label.includes('AI-Generated')) {
        if (!aiAvailable) {
            const action = await vscode.window.showWarningMessage(
                'AI provider not configured. Set up an API key in settings?',
                'Open Settings',
                'Use Manual'
            );
            
            if (action === 'Open Settings') {
                await vscode.commands.executeCommand(
                    'workbench.action.openSettings',
                    'autogit-pro'
                );
                return undefined;
            }
            
            if (action === 'Use Manual') {
                return 'manual';
            }
            
            return undefined;
        }
        return 'ai';
    }

    return 'manual';
}

/**
 * Show input box for manual commit message
 */
export async function showCommitMessageInput(
    suggestedMessage?: string
): Promise<string | undefined> {
    return vscode.window.showInputBox({
        prompt: 'Enter commit message',
        placeHolder: 'feat: add new feature',
        value: suggestedMessage,
        validateInput: (value: string) => {
            if (!value || value.trim().length === 0) {
                return 'Commit message cannot be empty';
            }
            if (value.length > 200) {
                return 'Subject line should be concise (max 200 characters)';
            }
            return undefined;
        },
    });
}

/**
 * Show input box for remote URL
 */
export async function showRemoteUrlInput(): Promise<string | undefined> {
    return vscode.window.showInputBox({
        prompt: 'Enter remote repository URL',
        placeHolder: 'https://github.com/username/repo.git',
        validateInput: (value: string) => {
            if (!value || value.trim().length === 0) {
                return 'Remote URL cannot be empty';
            }
            // Basic URL validation
            if (!value.includes('://') && !value.includes('@')) {
                return 'Please enter a valid Git URL (HTTPS or SSH)';
            }
            return undefined;
        },
    });
}

/**
 * Show a confirmation dialog
 */
export async function showConfirmation(
    message: string,
    detail?: string
): Promise<boolean> {
    const result = await vscode.window.showWarningMessage(
        message,
        { modal: true, detail },
        'Confirm',
        'Cancel'
    );
    
    return result === 'Confirm';
}

/**
 * Show a quick confirmation (non-modal)
 */
export async function showQuickConfirmation(message: string): Promise<boolean> {
    const result = await vscode.window.showInformationMessage(
        message,
        'Yes',
        'No'
    );
    
    return result === 'Yes';
}

/**
 * Show progress indicator for long operations
 */
export async function showProgress<T>(
    title: string,
    task: (
        progress: vscode.Progress<{ message?: string; increment?: number }>,
        token: vscode.CancellationToken
    ) => Promise<T>
): Promise<T> {
    return vscode.window.withProgress(
        {
            location: vscode.ProgressLocation.Notification,
            title,
            cancellable: true,
        },
        task
    );
}

/**
 * Show error message
 */
export function showError(message: string, ...actions: string[]): PromiseLike<string | undefined> {
    return vscode.window.showErrorMessage(`AutoGit Pro: ${message}`, ...actions);
}

/**
 * Show warning message
 */
export function showWarning(message: string, ...actions: string[]): PromiseLike<string | undefined> {
    return vscode.window.showWarningMessage(`AutoGit Pro: ${message}`, ...actions);
}

/**
 * Show success message
 */
export function showSuccess(message: string): PromiseLike<string | undefined> {
    return vscode.window.showInformationMessage(`AutoGit Pro: ${message}`);
}

/**
 * Show info message
 */
export function showInfo(message: string): PromiseLike<string | undefined> {
    return vscode.window.showInformationMessage(message);
}

/**
 * Show the generated AI commit message for editing
 */
export async function showAICommitMessagePreview(
    generatedMessage: string
): Promise<string | undefined> {
    const items: vscode.QuickPickItem[] = [
        {
            label: '$(check) Use this message',
            description: generatedMessage,
        },
        {
            label: '$(edit) Edit message',
            description: 'Modify the generated message',
        },
        {
            label: '$(refresh) Regenerate',
            description: 'Generate a new message',
        },
    ];

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'AI Generated: ' + generatedMessage,
        title: 'AutoGit Pro: Review Commit Message',
    });

    if (!selected) {
        return undefined;
    }

    if (selected.label.includes('Use this message')) {
        return generatedMessage;
    }

    if (selected.label.includes('Edit message')) {
        return showCommitMessageInput(generatedMessage);
    }

    if (selected.label.includes('Regenerate')) {
        return '__regenerate__';
    }

    return undefined;
}

/**
 * Show summary of changes before commit
 */
export async function showChangesSummary(
    stagedFiles: string[],
    unstagedFiles: string[],
    untrackedFiles: string[]
): Promise<boolean> {
    const totalChanges = stagedFiles.length + unstagedFiles.length + untrackedFiles.length;
    
    if (totalChanges === 0) {
        await showWarning('No changes to commit');
        return false;
    }

    const detail = [
        stagedFiles.length > 0 ? `Staged: ${stagedFiles.length} files` : '',
        unstagedFiles.length > 0 ? `Modified: ${unstagedFiles.length} files` : '',
        untrackedFiles.length > 0 ? `New: ${untrackedFiles.length} files` : '',
    ].filter(Boolean).join('\n');

    return showConfirmation(
        `Ready to commit ${totalChanges} file(s)?`,
        detail
    );
}
