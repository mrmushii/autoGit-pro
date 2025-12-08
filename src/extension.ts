/**
 * AutoGit Pro - VS Code Extension
 * Main entry point for the extension
 * 
 * Automate Git workflows with AI-powered commit message generation.
 * Supports OpenAI and Google Gemini for intelligent commit messages.
 */

import * as vscode from 'vscode';
import { executeAutoCommit } from './commands/autoCommit';
import { isGitInstalled } from './utils/git';

/**
 * Extension activation
 * Called when the extension is activated (on command execution)
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('AutoGit Pro is now active');
    
    // Verify Git is available
    const gitAvailable = await isGitInstalled();
    if (!gitAvailable) {
        vscode.window.showWarningMessage(
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
                vscode.window.showErrorMessage(`AutoGit Pro Error: ${message}`);
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
                vscode.window.showErrorMessage(`AutoGit Pro Error: ${message}`);
                console.error('AutoGit Pro Error:', error);
            }
        }
    );
    
    // Add commands to subscriptions for cleanup
    context.subscriptions.push(commitCommand);
    context.subscriptions.push(quickCommitCommand);
    
    // Show welcome message on first activation
    const hasShownWelcome = context.globalState.get<boolean>('autogit-pro.welcomeShown');
    if (!hasShownWelcome) {
        const action = await vscode.window.showInformationMessage(
            'AutoGit Pro activated! Use Ctrl+Shift+G Ctrl+Shift+C to commit & push.',
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
