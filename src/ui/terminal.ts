/**
 * AutoGit Pro - Terminal UI
 * Interactive terminal-based user interface
 */

import * as vscode from 'vscode';

export interface TerminalSession {
    terminal: vscode.Terminal;
    writeEmitter: vscode.EventEmitter<string>;
    inputResolver: ((value: string) => void) | null;
    closed: boolean;
}

/**
 * ANSI color codes for terminal styling
 */
const Colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
};

/**
 * Create a styled header
 */
function header(text: string): string {
    return `\n${Colors.bgBlue}${Colors.white}${Colors.bold} ${text} ${Colors.reset}\n`;
}

/**
 * Create a success message
 */
function success(text: string): string {
    return `${Colors.green}✓ ${text}${Colors.reset}`;
}

/**
 * Create an error message
 */
function error(text: string): string {
    return `${Colors.yellow}✗ ${text}${Colors.reset}`;
}

/**
 * Create an info message
 */
function info(text: string): string {
    return `${Colors.cyan}ℹ ${text}${Colors.reset}`;
}

/**
 * Create a prompt
 */
function prompt(text: string, defaultValue?: string): string {
    const defaultStr = defaultValue ? ` ${Colors.dim}[${defaultValue}]${Colors.reset}` : '';
    return `${Colors.magenta}▸${Colors.reset} ${text}${defaultStr}: `;
}

/**
 * Terminal-based workflow runner
 */
export class TerminalWorkflow {
    private terminal: vscode.Terminal | null = null;
    private writeEmitter: vscode.EventEmitter<string>;
    private currentInput: string = '';
    private inputResolver: ((value: string) => void) | null = null;
    private isRunning: boolean = false;

    constructor() {
        this.writeEmitter = new vscode.EventEmitter<string>();
    }

    /**
     * Create and show the terminal
     */
    async createTerminal(): Promise<void> {
        // Close existing terminal if any
        if (this.terminal) {
            this.terminal.dispose();
        }

        const pty: vscode.Pseudoterminal = {
            onDidWrite: this.writeEmitter.event,
            open: () => {
                this.writeLine(header('AutoGit Pro - Commit & Push'));
                this.writeLine('');
            },
            close: () => {
                this.isRunning = false;
            },
            handleInput: (data: string) => {
                // Handle input character by character
                if (data === '\r') { // Enter key
                    this.writeEmitter.fire('\r\n');
                    if (this.inputResolver) {
                        const resolver = this.inputResolver;
                        this.inputResolver = null;
                        resolver(this.currentInput);
                        this.currentInput = '';
                    }
                } else if (data === '\x7f') { // Backspace
                    if (this.currentInput.length > 0) {
                        this.currentInput = this.currentInput.slice(0, -1);
                        // Move cursor back, write space, move back again
                        this.writeEmitter.fire('\b \b');
                    }
                } else if (data === '\x03') { // Ctrl+C
                    this.writeLine('\n' + error('Cancelled by user'));
                    this.close();
                } else if (data >= ' ') { // Printable characters
                    this.currentInput += data;
                    this.writeEmitter.fire(data);
                }
            }
        };

        this.terminal = vscode.window.createTerminal({
            name: 'AutoGit Pro',
            pty
        });
        
        this.terminal.show();
        this.isRunning = true;
    }

    /**
     * Write text to terminal
     */
    write(text: string): void {
        this.writeEmitter.fire(text);
    }

    /**
     * Write line to terminal
     */
    writeLine(text: string): void {
        this.writeEmitter.fire(text + '\r\n');
    }

    /**
     * Prompt for input with default value
     */
    async input(promptText: string, defaultValue?: string): Promise<string> {
        return new Promise((resolve) => {
            this.write(prompt(promptText, defaultValue));
            this.inputResolver = (value: string) => {
                resolve(value.trim() || defaultValue || '');
            };
        });
    }

    /**
     * Prompt for yes/no confirmation
     */
    async confirm(promptText: string, defaultYes: boolean = true): Promise<boolean> {
        const defaultStr = defaultYes ? 'Y/n' : 'y/N';
        const response = await this.input(promptText, defaultStr);
        
        if (response === defaultStr || response === '') {
            return defaultYes;
        }
        
        return response.toLowerCase() === 'y' || response.toLowerCase() === 'yes';
    }

    /**
     * Show a selection menu
     */
    async select(promptText: string, options: string[], defaultIndex: number = 0): Promise<string> {
        this.writeLine('');
        this.writeLine(`${Colors.cyan}${promptText}${Colors.reset}`);
        
        options.forEach((opt, i) => {
            const marker = i === defaultIndex ? `${Colors.green}▸${Colors.reset}` : ' ';
            const num = `${Colors.dim}${i + 1}.${Colors.reset}`;
            this.writeLine(`  ${marker} ${num} ${opt}`);
        });
        
        const response = await this.input('Enter number', String(defaultIndex + 1));
        const index = parseInt(response) - 1;
        
        if (index >= 0 && index < options.length) {
            return options[index];
        }
        
        return options[defaultIndex];
    }

    /**
     * Show success message
     */
    showSuccess(text: string): void {
        this.writeLine(success(text));
    }

    /**
     * Show error message
     */
    showError(text: string): void {
        this.writeLine(error(text));
    }

    /**
     * Show info message
     */
    showInfo(text: string): void {
        this.writeLine(info(text));
    }

    /**
     * Show progress spinner
     */
    showProgress(text: string): void {
        this.writeLine(`${Colors.blue}⟳ ${text}...${Colors.reset}`);
    }

    /**
     * Show a separator line
     */
    separator(): void {
        this.writeLine(`${Colors.dim}${'─'.repeat(50)}${Colors.reset}`);
    }

    /**
     * Close the terminal
     */
    close(): void {
        this.isRunning = false;
        setTimeout(() => {
            if (this.terminal) {
                this.terminal.dispose();
                this.terminal = null;
            }
        }, 2000); // Wait 2 seconds before closing so user can see the result
    }

    /**
     * Close immediately
     */
    closeImmediately(): void {
        if (this.terminal) {
            this.terminal.dispose();
            this.terminal = null;
        }
        this.isRunning = false;
    }

    /**
     * Check if terminal is still running
     */
    get running(): boolean {
        return this.isRunning;
    }
}
