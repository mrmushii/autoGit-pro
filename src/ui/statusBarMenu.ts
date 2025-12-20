/**
 * AutoGit Pro - Status Bar Menu
 * Main status bar icon with dropdown menu for all commands
 */

import * as vscode from 'vscode';

/**
 * Create and manage the main status bar menu
 */
export class StatusBarMenu {
    private static instance: StatusBarMenu | undefined;
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];

    private constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            200  // Higher priority = more left
        );
        this.statusBarItem.command = 'autogit-pro.showMenu';
        this.statusBarItem.text = '$(git-merge) AutoGit Pro';
        this.statusBarItem.tooltip = 'Click for AutoGit Pro commands';
        this.statusBarItem.show();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): StatusBarMenu {
        if (!StatusBarMenu.instance) {
            StatusBarMenu.instance = new StatusBarMenu();
        }
        return StatusBarMenu.instance;
    }

    /**
     * Initialize and register commands
     */
    public initialize(context: vscode.ExtensionContext): void {
        // Register the menu command
        const menuCommand = vscode.commands.registerCommand(
            'autogit-pro.showMenu',
            () => this.showMenu()
        );
        context.subscriptions.push(menuCommand);
        this.disposables.push(menuCommand);
        context.subscriptions.push(this.statusBarItem);
    }

    /**
     * Show the command menu
     */
    private async showMenu(): Promise<void> {
        interface MenuItem extends vscode.QuickPickItem {
            command?: string;
        }

        const items: MenuItem[] = [
            {
                label: '$(git-commit) Commit & Push',
                description: 'Ctrl+Alt+G',
                detail: 'Stage, commit with AI message, and push',
                command: 'autogit-pro.commit',
            },
            {
                label: '$(zap) Quick Commit',
                description: 'Ctrl+Shift+Alt+C',
                detail: 'Instant commit with AI - no prompts',
                command: 'autogit-pro.quickCommit',
            },
            {
                label: '$(cloud-download) Pull & Sync',
                description: 'Ctrl+Shift+Alt+P',
                detail: 'Pull from remote and push local commits',
                command: 'autogit-pro.pull',
            },
            {
                kind: vscode.QuickPickItemKind.Separator,
                label: 'Analytics & History',
            },
            {
                label: '$(graph) My Stats',
                detail: 'View commits, time saved, and streaks',
                command: 'autogit-pro.showStats',
            },
            {
                label: '$(history) Commit History & Analysis',
                detail: 'Dashboard with code quality score and insights',
                command: 'autogit-pro.showHistory',
            },
            {
                kind: vscode.QuickPickItemKind.Separator,
                label: 'Tools',
            },
            {
                label: '$(notebook-template) Manage Templates',
                detail: 'Create and manage commit message templates',
                command: 'autogit-pro.manageTemplates',
            },
            {
                label: '$(sync) Toggle Auto-Commit',
                detail: 'Enable/disable automatic commits on save',
                command: 'autogit-pro.toggleAutoCommit',
            },
            {
                kind: vscode.QuickPickItemKind.Separator,
                label: 'Settings',
            },
            {
                label: '$(gear) Open Settings',
                detail: 'Configure AI provider, commit style, and more',
                command: 'workbench.action.openSettings',
            },
        ];

        const selected = await vscode.window.showQuickPick(items, {
            title: 'AutoGit Pro',
            placeHolder: 'Select a command',
        });

        if (selected?.command) {
            if (selected.command === 'workbench.action.openSettings') {
                await vscode.commands.executeCommand(selected.command, 'autogit-pro');
            } else {
                await vscode.commands.executeCommand(selected.command);
            }
        }
    }

    /**
     * Update status bar text
     */
    public updateText(text: string): void {
        this.statusBarItem.text = text;
    }

    /**
     * Dispose resources
     */
    public dispose(): void {
        this.statusBarItem.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
        this.disposables = [];
    }
}

/**
 * Initialize the status bar menu
 */
export function initStatusBarMenu(context: vscode.ExtensionContext): void {
    const menu = StatusBarMenu.getInstance();
    menu.initialize(context);
}
