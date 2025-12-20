/**
 * AutoGit Pro - VS Code Extension
 * Main entry point for the extension
 * 
 * Automate Git workflows with AI-powered commit message generation.
 * Supports OpenAI and Google Gemini for intelligent commit messages.
 */

import * as vscode from 'vscode';
import { executeAutoCommit } from './commands/autoCommit';
import { executeAutoPull } from './commands/autoPull';
import { isGitInstalled } from './utils/git';
import { initTemplatesManager, getTemplatesManager } from './utils/templates';
import { initAnalyticsManager, getAnalyticsManager } from './utils/analytics';
import { HistoryPanel } from './ui/historyPanel';
import { initAutoCommit } from './utils/autoSave';
import { initStatusBarMenu } from './ui/statusBarMenu';


/**
 * Extension activation
 * Called when the extension is activated (on command execution)
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('AutoGit Pro is now active');
    
    // Initialize templates manager
    initTemplatesManager(context);
    
    // Initialize analytics manager
    initAnalyticsManager(context);
    
    // Initialize auto-commit manager
    initAutoCommit(context);
    
    // Initialize status bar menu
    initStatusBarMenu(context);
    
    // Verify Git is available
    const gitAvailable = await isGitInstalled();
    if (!gitAvailable) {
        void vscode.window.showWarningMessage(
            'AutoGit Pro: Git is not installed or not in PATH. Some features may not work.'
        );
    }

    
    // Register the main commit command
    const commitCommand = vscode.commands.registerCommand(
        'autogit-pro.commit',
        async () => {
            try {
                await executeAutoCommit(false);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                void vscode.window.showErrorMessage(`AutoGit Pro Error: ${message}`);
                console.error('AutoGit Pro Error:', error);
            }
        }
    );
    
    // Register the quick commit command (AI-first)
    const quickCommitCommand = vscode.commands.registerCommand(
        'autogit-pro.quickCommit',
        async () => {
            try {
                await executeAutoCommit(true);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                void vscode.window.showErrorMessage(`AutoGit Pro Error: ${message}`);
                console.error('AutoGit Pro Error:', error);
            }
        }
    );
    
    // Add commands to subscriptions for cleanup
    context.subscriptions.push(commitCommand);
    context.subscriptions.push(quickCommitCommand);
    
    // Register the pull command
    const pullCommand = vscode.commands.registerCommand(
        'autogit-pro.pull',
        async () => {
            try {
                await executeAutoPull();
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                void vscode.window.showErrorMessage(`AutoGit Pro Error: ${message}`);
                console.error('AutoGit Pro Error:', error);
            }
        }
    );
    context.subscriptions.push(pullCommand);

    // Register the manage templates command
    const manageTemplatesCommand = vscode.commands.registerCommand(
        'autogit-pro.manageTemplates',
        async () => {
            try {
                const manager = getTemplatesManager();
                if (manager) {
                    await manager.manageTemplates();
                } else {
                    void vscode.window.showErrorMessage('Templates manager not initialized.');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                void vscode.window.showErrorMessage(`AutoGit Pro Error: ${message}`);
                console.error('AutoGit Pro Error:', error);
            }
        }
    );
    context.subscriptions.push(manageTemplatesCommand);

    // Register the show stats command
    const showStatsCommand = vscode.commands.registerCommand(
        'autogit-pro.showStats',
        async () => {
            try {
                const manager = getAnalyticsManager();
                if (manager) {
                    await manager.showStats();
                } else {
                    void vscode.window.showErrorMessage('Analytics not initialized.');
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                void vscode.window.showErrorMessage(`AutoGit Pro Error: ${message}`);
                console.error('AutoGit Pro Error:', error);
            }
        }
    );
    context.subscriptions.push(showStatsCommand);

    // Register the show history command
    const showHistoryCommand = vscode.commands.registerCommand(
        'autogit-pro.showHistory',
        async () => {
            try {
                await HistoryPanel.createOrShow(context.extensionUri);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                void vscode.window.showErrorMessage(`AutoGit Pro Error: ${message}`);
                console.error('AutoGit Pro Error:', error);
            }
        }
    );
    context.subscriptions.push(showHistoryCommand);

    
    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get<boolean>('autogit-pro.welcomeShown');
    if (!hasShownWelcome) {
        const action = await vscode.window.showInformationMessage(
            'AutoGit Pro activated! Use Ctrl+Alt+G to commit & push.',
            'Configure AI',
            'Got it'
        );
        
        if (action === 'Configure AI') {
            await vscode.commands.executeCommand(
                'workbench.action.openSettings',
                'autogit-pro'
            );
        }
        
        await context.globalState.update('autogit-pro.welcomeShown', true);
    }
}

/**
 * Extension deactivation
 * Called when the extension is deactivated
 */
export function deactivate(): void {
    console.log('AutoGit Pro deactivated');
}
