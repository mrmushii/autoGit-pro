/**
 * AutoGit Pro - Auto Save & Commit
 * Automatically commits changes on file save with debouncing
 */

import * as vscode from 'vscode';
import { getExtensionConfig, getAIProviderConfig } from '../types';
import { detectRepository } from './repoDetector';
import { stageAll, commit, push, getDiffContext, getStatus, hasUpstream } from './git';
import { generateCommitMessage } from './ai';
import { trackCommit, trackPush, trackAiMessage } from './analytics';

/**
 * Auto-save configuration from settings
 */
interface AutoSaveConfig {
    enabled: boolean;
    delay: number;
    patterns: string[];
    commitOnSave: boolean;
    pushAfterCommit: boolean;
    generateAiMessage: boolean;
}

/**
 * Get auto-save configuration
 */
function getAutoSaveConfig(): AutoSaveConfig {
    const config = vscode.workspace.getConfiguration('autogit-pro');
    return {
        enabled: config.get<boolean>('autoCommit.enabled', false),
        delay: config.get<number>('autoCommit.delay', 30),
        patterns: config.get<string[]>('autoCommit.patterns', ['**/*']),
        commitOnSave: config.get<boolean>('autoCommit.commitOnSave', true),
        pushAfterCommit: config.get<boolean>('autoCommit.pushAfterCommit', false),
        generateAiMessage: config.get<boolean>('autoCommit.useAiMessage', true),
    };
}

/**
 * Auto-commit manager class
 */
export class AutoCommitManager {
    private static instance: AutoCommitManager | undefined;
    private disposables: vscode.Disposable[] = [];
    private debounceTimer: NodeJS.Timeout | undefined;
    private pendingChanges: Set<string> = new Set();
    private isCommitting: boolean = false;
    private statusBarItem: vscode.StatusBarItem;

    private constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.command = 'autogit-pro.toggleAutoCommit';
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): AutoCommitManager {
        if (!AutoCommitManager.instance) {
            AutoCommitManager.instance = new AutoCommitManager();
        }
        return AutoCommitManager.instance;
    }

    /**
     * Initialize the auto-commit watcher
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Register toggle command
        const toggleCommand = vscode.commands.registerCommand(
            'autogit-pro.toggleAutoCommit',
            () => this.toggleAutoCommit()
        );
        context.subscriptions.push(toggleCommand);
        this.disposables.push(toggleCommand);

        // Watch for file saves
        const saveWatcher = vscode.workspace.onDidSaveTextDocument(
            (doc) => this.onDocumentSave(doc)
        );
        context.subscriptions.push(saveWatcher);
        this.disposables.push(saveWatcher);

        // Watch for config changes
        const configWatcher = vscode.workspace.onDidChangeConfiguration(
            (e) => {
                if (e.affectsConfiguration('autogit-pro.autoCommit')) {
                    this.updateStatusBar();
                }
            }
        );
        context.subscriptions.push(configWatcher);
        this.disposables.push(configWatcher);

        // Update status bar
        this.updateStatusBar();
    }

    /**
     * Update status bar display
     */
    private updateStatusBar(): void {
        const config = getAutoSaveConfig();
        
        if (config.enabled) {
            this.statusBarItem.text = '$(sync~spin) AutoGit: ON';
            this.statusBarItem.tooltip = `Auto-commit enabled (${config.delay}s delay). Click to disable.`;
            this.statusBarItem.backgroundColor = undefined;
        } else {
            this.statusBarItem.text = '$(sync) AutoGit: OFF';
            this.statusBarItem.tooltip = 'Auto-commit disabled. Click to enable.';
            this.statusBarItem.backgroundColor = undefined;
        }
        
        this.statusBarItem.show();
    }

    /**
     * Toggle auto-commit on/off
     */
    private async toggleAutoCommit(): Promise<void> {
        const config = vscode.workspace.getConfiguration('autogit-pro');
        const currentValue = config.get<boolean>('autoCommit.enabled', false);
        
        await config.update('autoCommit.enabled', !currentValue, vscode.ConfigurationTarget.Global);
        
        const newState = !currentValue ? 'enabled' : 'disabled';
        void vscode.window.showInformationMessage(`AutoGit Pro: Auto-commit ${newState}`);
        
        this.updateStatusBar();
    }

    /**
     * Handle document save event
     */
    private onDocumentSave(document: vscode.TextDocument): void {
        const config = getAutoSaveConfig();
        
        if (!config.enabled) {
            return;
        }

        // Check if this file matches our patterns
        if (!this.matchesPatterns(document.uri.fsPath, config.patterns)) {
            return;
        }

        // Add to pending changes
        this.pendingChanges.add(document.uri.fsPath);

        // Update status bar to show pending
        this.statusBarItem.text = '$(sync~spin) AutoGit: Pending...';

        // Debounce the commit
        this.scheduleCommit(config.delay);
    }

    /**
     * Check if file matches patterns
     */
    private matchesPatterns(filePath: string, patterns: string[]): boolean {
        // Simple pattern matching - in production, use micromatch or similar
        for (const pattern of patterns) {
            if (pattern === '**/*') {
                return true;
            }
            // Basic extension matching
            if (pattern.startsWith('*.')) {
                const ext = pattern.slice(1);
                if (filePath.endsWith(ext)) {
                    return true;
                }
            }
        }
        return patterns.length === 0 || patterns.includes('**/*');
    }

    /**
     * Schedule a debounced commit
     */
    private scheduleCommit(delaySeconds: number): void {
        // Clear existing timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        // Set new timer
        this.debounceTimer = setTimeout(
            () => void this.executeAutoCommit(),
            delaySeconds * 1000
        );
    }

    /**
     * Execute the auto-commit
     */
    private async executeAutoCommit(): Promise<void> {
        if (this.isCommitting || this.pendingChanges.size === 0) {
            return;
        }

        this.isCommitting = true;
        const changedFiles = Array.from(this.pendingChanges);
        this.pendingChanges.clear();

        try {
            const config = getAutoSaveConfig();
            const repoPath = await detectRepository();
            
            if (!repoPath) {
                return;
            }

            // Check if there are actual changes
            const statusResult = await getStatus(repoPath);
            if (!statusResult.success || !statusResult.data?.hasChanges) {
                this.updateStatusBar();
                return;
            }

            // Update status bar
            this.statusBarItem.text = '$(sync~spin) AutoGit: Committing...';

            // Stage changes
            await stageAll(repoPath);

            // Generate or create commit message
            let commitMessage = `Auto-commit: ${changedFiles.length} file(s) changed`;

            if (config.generateAiMessage) {
                const aiConfig = getAIProviderConfig();
                if (aiConfig.apiKey && aiConfig.provider !== 'none') {
                    const contextResult = await getDiffContext(repoPath);
                    if (contextResult.success && contextResult.data) {
                        const extConfig = getExtensionConfig();
                        const aiResult = await generateCommitMessage(
                            aiConfig,
                            contextResult.data,
                            extConfig.commitStyle,
                            extConfig.includeScope
                        );
                        if (aiResult.success && aiResult.message) {
                            commitMessage = aiResult.message;
                            await trackAiMessage();
                        }
                    }
                }
            }

            // Commit
            const commitResult = await commit(repoPath, commitMessage);
            if (!commitResult.success) {
                void vscode.window.showErrorMessage(`Auto-commit failed: ${commitResult.error}`);
                this.updateStatusBar();
                return;
            }

            await trackCommit();

            // Push if enabled
            if (config.pushAfterCommit) {
                this.statusBarItem.text = '$(cloud-upload) AutoGit: Pushing...';
                
                const extConfig = getExtensionConfig();
                const branch = 'HEAD';
                const hasUp = await hasUpstream(repoPath, branch);
                const pushResult = await push(repoPath, extConfig.defaultRemote, branch, !hasUp);
                
                if (pushResult.success) {
                    await trackPush();
                }
            }

            // Show success notification
            void vscode.window.showInformationMessage(
                `AutoGit Pro: Committed ${changedFiles.length} file(s)`,
                'View Changes'
            ).then(action => {
                if (action === 'View Changes') {
                    void vscode.commands.executeCommand('git.viewChanges');
                }
            });

        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            void vscode.window.showErrorMessage(`Auto-commit error: ${message}`);
        } finally {
            this.isCommitting = false;
            this.updateStatusBar();
        }
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.statusBarItem.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}

/**
 * Initialize auto-commit manager
 */
export function initAutoCommit(context: vscode.ExtensionContext): void {
    const manager = AutoCommitManager.getInstance();
    manager.initialize(context);
}
