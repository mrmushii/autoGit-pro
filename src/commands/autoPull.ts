/**
 * AutoGit Pro - Auto Pull Command
 * Terminal-based workflow for pulling from remote
 */

import * as vscode from 'vscode';
import { getExtensionConfig, getAIProviderConfig } from '../types';
import { detectRepository } from '../utils/repoDetector';
import {
    isGitInstalled,
    getCurrentBranch,
    getRemotes,
    pull,
    push,
    getStatus,
    fetch,
    hasUpstream,
} from '../utils/git';
import { analyzeGitError } from '../utils/ai';
import { TerminalWorkflow } from '../ui/terminal';
import { trackPull, trackPush, getTimeSavedEstimate } from '../utils/analytics';

/**
 * Format raw Git error output into clean, readable lines
 */
function formatGitError(rawError: string): string[] {
    // Normalize line endings and split
    const normalized = rawError
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    
    // Split by newlines and filter empty lines
    const lines = normalized.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    
    return lines;
}

/**
 * Detect the type of conflict from Git error message
 */
function detectConflictType(error: string): 'merge' | 'rebase' | 'pull' | null {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('rebase') && (lowerError.includes('conflict') || lowerError.includes('could not apply'))) {
        return 'rebase';
    }
    if (lowerError.includes('merge') && lowerError.includes('conflict')) {
        return 'merge';
    }
    if (lowerError.includes('conflict') || lowerError.includes('would be overwritten')) {
        return 'pull';
    }
    
    return null;
}

/**
 * Get user-friendly conflict instructions based on type
 */
function getConflictInstructions(type: 'merge' | 'rebase' | 'pull'): string[] {
    switch (type) {
        case 'rebase':
            return [
                'A rebase conflict occurred. Your changes conflict with remote commits.',
                '',
                'To resolve:',
                '  1. Open Source Control to see conflicting files',
                '  2. Edit files to resolve conflicts (look for <<<<<<< markers)',
                '  3. Stage resolved files with: git add <file>',
                '  4. Continue rebase with: git rebase --continue',
                '',
                'Or to abort: git rebase --abort',
            ];
        case 'merge':
            return [
                'A merge conflict occurred. Your changes conflict with remote commits.',
                '',
                'To resolve:',
                '  1. Open Source Control to see conflicting files',
                '  2. Edit files to resolve conflicts (look for <<<<<<< markers)',
                '  3. Stage resolved files',
                '  4. Complete the merge by committing',
            ];
        case 'pull':
            return [
                'Your local changes conflict with remote changes.',
                '',
                'To resolve:',
                '  1. Commit or stash your local changes first',
                '  2. Then try pulling again',
            ];
    }
}

/**
 * Execute the AutoGit Pro pull workflow in terminal
 */
export async function executeAutoPull(): Promise<void> {
    const terminal = new TerminalWorkflow();
    
    try {
        await terminal.createTerminal();
        await runPullWorkflow(terminal);
    } catch (err) {
        terminal.showError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        terminal.showInfo('Terminal will remain open. Close it manually when ready.');
    }
}

/**
 * Main pull workflow logic
 */
async function runPullWorkflow(terminal: TerminalWorkflow): Promise<void> {
    const config = getExtensionConfig();
    
    // Step 1: Check Git installation
    terminal.showProgress('Checking Git installation');
    const gitInstalled = await isGitInstalled();
    if (!gitInstalled) {
        terminal.showError('Git is not installed or not in PATH');
        terminal.showInfo('Please install Git and try again.');
        return;
    }
    terminal.showSuccess('Git is available');
    
    // Step 2: Detect repository
    terminal.showProgress('Detecting repository');
    const repoPath = await detectRepository();
    
    if (!repoPath) {
        terminal.showError('No Git repository found. Please open a folder with a Git repository.');
        return;
    }
    terminal.showSuccess(`Repository: ${repoPath}`);
    
    // Step 3: Check for uncommitted changes
    terminal.showProgress('Checking working directory status');
    const statusResult = await getStatus(repoPath);
    
    if (statusResult.success && statusResult.data?.hasChanges) {
        terminal.showError('You have uncommitted changes.');
        terminal.showInfo('Please commit or stash your changes before pulling.');
        terminal.showInfo('Staged: ' + statusResult.data.staged.length);
        terminal.showInfo('Modified: ' + statusResult.data.unstaged.length);
        terminal.showInfo('Untracked: ' + statusResult.data.untracked.length);
        return;
    }
    terminal.showSuccess('Working directory is clean');
    
    // Step 4: Get current branch
    const branchResult = await getCurrentBranch(repoPath);
    const currentBranch = branchResult.data || 'main';
    terminal.showInfo(`Current branch: ${currentBranch}`);
    
    // Step 5: Get available remotes
    terminal.showProgress('Fetching remotes');
    const remotesResult = await getRemotes(repoPath);
    
    if (!remotesResult.success || !remotesResult.data || remotesResult.data.length === 0) {
        terminal.showError('No remote repositories configured.');
        terminal.showInfo('Add a remote with: git remote add origin <url>');
        return;
    }
    
    // Get unique remote names
    const remoteNames = [...new Set(remotesResult.data.map(r => r.name))];
    terminal.showSuccess(`Found ${remoteNames.length} remote(s): ${remoteNames.join(', ')}`);
    
    // Step 6: Select remote (default to config or origin)
    let selectedRemote = config.defaultRemote;
    
    if (remoteNames.length > 1) {
        terminal.separator();
        selectedRemote = await terminal.select('Select remote to pull from', remoteNames, 
            remoteNames.indexOf(config.defaultRemote) >= 0 ? remoteNames.indexOf(config.defaultRemote) : 0);
    } else {
        selectedRemote = remoteNames[0];
    }
    terminal.showInfo(`Using remote: ${selectedRemote}`);
    
    // Step 7: Fetch latest from remote
    terminal.separator();
    terminal.showProgress(`Fetching from ${selectedRemote}`);
    const fetchResult = await fetch(repoPath, selectedRemote);
    
    if (!fetchResult.success) {
        terminal.showError(fetchResult.error || 'Failed to fetch from remote');
        return;
    }
    terminal.showSuccess('Fetch complete');
    
    // Step 8: Ask for branch to pull
    terminal.writeLine('');
    const pullBranch = await terminal.input('Pull branch', currentBranch);
    
    // Step 9: Confirm pull
    terminal.separator();
    terminal.showInfo(`Will pull from: ${selectedRemote}/${pullBranch}`);
    terminal.showInfo(`Into local branch: ${currentBranch}`);
    terminal.writeLine('');
    
    const confirmed = await terminal.confirm('Proceed with pull', true);
    if (!confirmed) {
        terminal.showInfo('Cancelled by user.');
        terminal.close();
        return;
    }
    
    // Step 10: Execute pull
    terminal.separator();
    terminal.showProgress('Pulling from remote');
    
    // Try normal pull first
    let pullResult = await pull(repoPath, selectedRemote, pullBranch, false, false);
    
    // If failed due to unrelated histories, retry with flag
    if (!pullResult.success && pullResult.error?.includes('unrelated histories')) {
        terminal.showInfo('Detected unrelated histories. Attempting merge...');
        pullResult = await pull(repoPath, selectedRemote, pullBranch, false, true);
    }
    
    // Check for conflicts or errors
    if (!pullResult.success) {
        const errorText = pullResult.error || '';
        const conflictType = detectConflictType(errorText);
        
        // Try AI analysis for smart error explanation
        terminal.writeLine('');
        terminal.showProgress('Analyzing error with AI');
        
        const aiConfig = getAIProviderConfig();
        const aiAnalysis = await analyzeGitError(aiConfig, errorText, {
            operation: 'pull',
            branch: currentBranch,
            remote: selectedRemote,
        });
        
        if (conflictType) {
            // Show professional conflict error with AI insights
            terminal.writeLine('');
            terminal.showError('⚠️  Conflict Detected');
            terminal.separator();
            
            // Show AI explanation if available
            if (aiAnalysis.success && aiAnalysis.explanation) {
                terminal.showInfo('🤖 AI Analysis:');
                terminal.writeLine('');
                terminal.writeLine(`   ${aiAnalysis.explanation}`);
                terminal.writeLine('');
                
                if (aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0) {
                    terminal.showInfo('📋 Suggested Steps:');
                    terminal.writeLine('');
                    for (let i = 0; i < aiAnalysis.suggestions.length; i++) {
                        terminal.writeLine(`   ${i + 1}. ${aiAnalysis.suggestions[i]}`);
                    }
                    terminal.writeLine('');
                }
            } else {
                // Fallback to static instructions
                const instructions = getConflictInstructions(conflictType);
                for (const line of instructions) {
                    if (line === '') {
                        terminal.writeLine('');
                    } else if (line.startsWith('  ')) {
                        terminal.writeLine(`   ${line}`);
                    } else {
                        terminal.showInfo(line);
                    }
                }
            }
            
            terminal.separator();
            terminal.showInfo('Opening Source Control panel...');
            await vscode.commands.executeCommand('workbench.view.scm');
            terminal.writeLine('');
            terminal.showInfo('Terminal will remain open for reference.');
            return;
        }
        
        // Non-conflict error - show AI analysis or formatted error
        terminal.writeLine('');
        terminal.showError('Pull failed');
        terminal.separator();
        
        if (aiAnalysis.success && aiAnalysis.explanation) {
            // Show AI-powered explanation
            terminal.showInfo('🤖 AI Analysis:');
            terminal.writeLine('');
            terminal.writeLine(`   ${aiAnalysis.explanation}`);
            terminal.writeLine('');
            
            if (aiAnalysis.suggestions && aiAnalysis.suggestions.length > 0) {
                terminal.showInfo('📋 How to Fix:');
                terminal.writeLine('');
                for (let i = 0; i < aiAnalysis.suggestions.length; i++) {
                    terminal.writeLine(`   ${i + 1}. ${aiAnalysis.suggestions[i]}`);
                }
            }
        } else {
            // Fallback to formatted raw output
            const errorLines = formatGitError(errorText);
            if (errorLines.length > 0) {
                terminal.showInfo('Git said:');
                terminal.writeLine('');
                for (const line of errorLines.slice(0, 10)) {
                    const cleanLine = line
                        .replace(/^hint:\s*/i, '💡 ')
                        .replace(/^error:\s*/i, '❌ ')
                        .replace(/^warning:\s*/i, '⚠️ ')
                        .replace(/^fatal:\s*/i, '🛑 ');
                    terminal.writeLine(`   ${cleanLine}`);
                }
                if (errorLines.length > 10) {
                    terminal.writeLine(`   ... and ${errorLines.length - 10} more lines`);
                }
            } else {
                terminal.showInfo('Unknown error occurred during pull.');
            }
        }
        
        terminal.separator();
        terminal.showInfo('Terminal will remain open for reference.');
        return;
    }
    
    // Success!
    terminal.showSuccess('Pull completed successfully!');
    
    // Track pull in analytics
    await trackPull();
    
    // Show what was pulled
    if (pullResult.data) {
        terminal.writeLine('');
        terminal.showInfo('Summary:');
        const lines = pullResult.data.split('\n').slice(0, 5);
        for (const line of lines) {
            if (line.trim()) {
                terminal.writeLine(`  ${line}`);
            }
        }
    }
    
    // Step 11: Push local commits if any exist
    terminal.separator();
    terminal.showProgress('Checking for local commits to push');
    
    // Try to push - if there are commits ahead, this will push them
    const upstreamSet = await hasUpstream(repoPath, currentBranch);
    const pushResult = await push(repoPath, selectedRemote, currentBranch, !upstreamSet);
    
    if (pushResult.success) {
        terminal.showSuccess(`Pushed local commits to ${selectedRemote}/${currentBranch}`);
        await trackPush();
    } else if (pushResult.error?.includes('Everything up-to-date')) {
        terminal.showInfo('No local commits to push - already up to date');
    } else {
        terminal.showError(pushResult.error || 'Failed to push local commits');
        terminal.showInfo('You may need to push manually: git push');
        return;
    }
    
    terminal.separator();
    terminal.writeLine('');
    terminal.showSuccess('✨ All done! Pull and push completed successfully.');
    terminal.showInfo(`📊 Total time saved with AutoGit Pro: ${getTimeSavedEstimate()}`);
    terminal.writeLine('');
    terminal.showInfo('Terminal will close in 3 seconds...');
    
    // Close terminal after delay
    setTimeout(() => {
        terminal.closeImmediately();
    }, 3000);
}

