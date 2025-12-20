import * as vscode from 'vscode';
import { getExtensionConfig, getAIProviderConfig, type AIProviderConfig, type ExtensionConfig } from '../types';
import { detectRepository, getWorkspaceFolderPath } from '../utils/repoDetector';
import {
    isGitInstalled,
    getCurrentBranch,
    listBranches,
    checkoutBranch,
    createBranch,
    addRemote,
    hasRemote,
    stageAll,
    commit,
    push,
    pull,
    getStatus,
    getDiffContext,
    hasUpstream,
    initRepository,
} from '../utils/git';
import { generateCommitMessage, validateAIConfig, analyzeGitError } from '../utils/ai';
import { TerminalWorkflow } from '../ui/terminal';
import { trackCommit, trackPush, trackAiMessage, getTimeSavedEstimate } from '../utils/analytics';


/**
 * Execute the AutoGit Pro workflow in terminal
 */
export async function executeAutoCommit(quickMode: boolean = false): Promise<void> {
    const terminal = new TerminalWorkflow();
    
    try {
        await terminal.createTerminal();
        await runWorkflow(terminal, quickMode);
    } catch (err) {
        terminal.showError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        terminal.showInfo('Terminal will remain open. Close it manually when ready.');
        // Don't close terminal on error - let user read the error
    }
}


/**
 * Main workflow logic
 */
async function runWorkflow(terminal: TerminalWorkflow, quickMode: boolean): Promise<void> {
    const config = getExtensionConfig();
    
    if (quickMode) {
        terminal.showInfo('⚡ Quick Mode: Using AI message, current branch, no confirmations');
    }
    
    // Step 1: Check Git installation
    terminal.showProgress('Checking Git installation');
    const gitInstalled = await isGitInstalled();
    if (!gitInstalled) {
        terminal.showError('Git is not installed or not in PATH');
        terminal.showInfo('Please install Git and try again.');
        return;
    }
    terminal.showSuccess('Git is available');

    
    // Step 2: Detect repository (or initialize new one)
    terminal.showProgress('Detecting repository');
    let repoPath = await detectRepository();
    
    if (!repoPath) {
        // No repo found - offer to initialize
        const workspacePath = getWorkspaceFolderPath();
        if (!workspacePath) {
            terminal.showError('No folder open. Please open a folder first.');
            return;
        }

        
        terminal.showInfo('No Git repository found in this folder.');
        terminal.writeLine('');
        const repoUrl = await terminal.input('GitHub repo URL (or press Enter to skip)', '');
        
        if (!repoUrl) {
            terminal.showError('No repository URL provided. Exiting.');
            return;
        }

        
        // Initialize git
        terminal.showProgress('Initializing Git repository');
        const initResult = await initRepository(workspacePath);
        if (!initResult.success) {
            terminal.showError(initResult.error || 'Failed to initialize repository');
            return;
        }
        terminal.showSuccess('Git repository initialized');

        
        // Add remote
        terminal.showProgress('Adding remote origin');
        const addRemoteResult = await addRemote(workspacePath, 'origin', repoUrl);
        if (!addRemoteResult.success) {
            terminal.showError(addRemoteResult.error || 'Failed to add remote');
            return;
        }
        terminal.showSuccess(`Remote added: ${repoUrl}`);

        
        repoPath = workspacePath;
    }
    
    terminal.showSuccess(`Repository: ${repoPath}`);
    
    // Step 3: Get current branch (default to 'main' for new repos)
    const branchResult = await getCurrentBranch(repoPath);
    let currentBranch = branchResult.data || 'main';
    
    // For new repos, there's no branch until first commit - use 'main' as default
    if (!branchResult.success || currentBranch === 'HEAD') {
        currentBranch = 'main';
        terminal.showInfo('New repository - will use branch: main');
    } else {
        terminal.showInfo(`Current branch: ${currentBranch}`);
    }
    
    const statusResult = await getStatus(repoPath);
    if (!statusResult.success || !statusResult.data) {
        terminal.showError(statusResult.error || 'Failed to get repository status');
        return;
    }
    
    if (!statusResult.data.hasChanges) {
        terminal.showInfo('No changes to commit. Working tree clean.');
        terminal.close();
        return;
    }

    
    const status = statusResult.data;
    terminal.showInfo(`Changes: ${status.staged.length} staged, ${status.unstaged.length} modified, ${status.untracked.length} new`);
    terminal.separator();
    
    // Step 5: Target branch selection (we'll switch AFTER committing if needed)
    let targetBranch = currentBranch;
    let needsBranchSwitch = false;
    let createNewBranch = false;
    
    if (!quickMode) {
        terminal.writeLine('');
        const branchInput = await terminal.input('Push to branch', currentBranch);
        targetBranch = branchInput;
        needsBranchSwitch = targetBranch !== currentBranch;
        
        // Validate target branch (check if it exists or will be created)
        if (needsBranchSwitch) {
            const branchesResult = await listBranches(repoPath);
            const branches = branchesResult.success ? branchesResult.data || [] : [];
            createNewBranch = !branches.includes(targetBranch);
            
            if (createNewBranch) {
                terminal.showInfo(`Will create new branch: ${targetBranch}`);
            } else {
                terminal.showInfo(`Will switch to existing branch: ${targetBranch}`);
            }
        }
    }
    
    // Step 6: Generate AI commit message
    terminal.separator();
    let commitMessage = '';
    
    const aiConfig = getAIConfig(config);
    const aiConfigValid = validateAIConfig(aiConfig);
    
    if (aiConfigValid.valid && aiConfig.provider !== 'none') {
        terminal.showProgress(`Generating AI commit message (${config.commitStyle} style)`);
        
        const contextResult = await getDiffContext(repoPath);
        if (contextResult.success && contextResult.data) {
            const aiResult = await generateCommitMessage(
                aiConfig, 
                contextResult.data,
                config.commitStyle,
                config.includeScope
            );
            if (aiResult.success && aiResult.message) {
                commitMessage = aiResult.message;
                terminal.showSuccess('AI generated commit message:');
                // Handle multi-line messages (detailed style)
                const messageLines = commitMessage.split('\n');
                for (const line of messageLines) {
                    terminal.writeLine(`  ${line}`);
                }
                terminal.writeLine('');
                
                // Track AI message generation
                await trackAiMessage();
            } else {
                terminal.showError(`AI generation failed: ${aiResult.error}`);
            }
        }
    }
    
    // Step 7: Get/confirm commit message (skip in quick mode if AI message exists)
    if (!quickMode || !commitMessage) {
        const messageInput = await terminal.input('Commit message', commitMessage || 'Update files');
        commitMessage = messageInput;
    }
    
    if (!commitMessage) {
        terminal.showError('Commit message cannot be empty');
        return;
    }

    
    // Step 8: Check remote
    terminal.separator();
    const remoteName = config.defaultRemote;
    const hasRemoteConfigured = await hasRemote(repoPath, remoteName);
    
    if (!hasRemoteConfigured) {
        terminal.showInfo('No remote repository configured');
        const remoteUrl = await terminal.input('Remote URL (leave empty to skip push)', '');
        
        if (remoteUrl) {
            terminal.showProgress(`Adding remote: ${remoteName}`);
            const addResult = await addRemote(repoPath, remoteName, remoteUrl);
            if (!addResult.success) {
                terminal.showError(addResult.error || 'Failed to add remote');
            } else {
                terminal.showSuccess(`Remote added: ${remoteUrl}`);
            }
        }
    }
    
    // Step 9: Confirm and execute
    terminal.separator();
    terminal.writeLine('');
    terminal.showInfo(`Current branch: ${currentBranch}`);
    if (needsBranchSwitch) {
        terminal.showInfo(`Target branch: ${targetBranch}${createNewBranch ? ' (new)' : ''}`);
    }
    terminal.showInfo(`Message: ${commitMessage}`);
    terminal.writeLine('');
    
    // Skip confirmation in quick mode
    if (!quickMode) {
        const confirmed = await terminal.confirm('Proceed with commit and push', true);
        
        if (!confirmed) {
            terminal.showInfo('Cancelled by user.');
            terminal.close();
            return;
        }

    }
    
    terminal.separator();
    
    // Step 10: Stage changes
    if (config.autoStageAll) {
        terminal.showProgress('Staging all changes');
        const stageResult = await stageAll(repoPath);
        if (!stageResult.success) {
            terminal.showError(stageResult.error || 'Failed to stage changes');
            return;
        }
        terminal.showSuccess('Changes staged');

    }
    
    // Step 11: Commit
    terminal.showProgress('Creating commit');
    const commitResult = await commit(repoPath, commitMessage);
    if (!commitResult.success) {
        terminal.showError(commitResult.error || 'Failed to commit');
        return;
    }
    terminal.showSuccess('Commit created');
    
    // Track commit in analytics
    await trackCommit();

    
    // Step 12: Branch switch (if needed) - NOW safe because changes are committed
    let pushBranch = currentBranch;
    if (needsBranchSwitch) {
        if (createNewBranch) {
            terminal.showProgress(`Creating new branch: ${targetBranch}`);
            const createResult = await createBranch(repoPath, targetBranch);
            if (!createResult.success) {
                terminal.showError(createResult.error || 'Failed to create branch');
                terminal.showInfo('Commit was created on current branch. You can switch manually.');
                return;
            }

            terminal.showSuccess(`Created and switched to ${targetBranch}`);
            pushBranch = targetBranch;
        } else {
            // Switch to existing branch and cherry-pick the commit
            terminal.showProgress(`Switching to branch: ${targetBranch}`);
            const checkoutResult = await checkoutBranch(repoPath, targetBranch);
            if (!checkoutResult.success) {
                terminal.showError(checkoutResult.error || 'Failed to switch branch');
                terminal.showInfo('Commit was created on current branch. You can switch manually.');
                return;
            }

            terminal.showSuccess(`Switched to ${targetBranch}`);
            pushBranch = targetBranch;
        }
    }
    
    // Step 13: Push
    const shouldPush = config.pushAfterCommit && await hasRemote(repoPath, remoteName);
    
    if (shouldPush) {
        terminal.showProgress(`Pushing to ${remoteName}/${pushBranch}`);
        const upstreamSet = await hasUpstream(repoPath, pushBranch);
        let pushResult = await push(repoPath, remoteName, pushBranch, !upstreamSet);
        
        // If push failed, try pulling first (with unrelated histories support)
        if (!pushResult.success && pushResult.error?.includes('rejected')) {
            terminal.showInfo('Remote has new changes. Pulling first...');
            terminal.showProgress('Pulling from remote');
            
            // Try normal pull first, then with allow-unrelated-histories if needed
            let pullResult = await pull(repoPath, remoteName, pushBranch, true, false);
            
            // If pull failed due to unrelated histories, try again with the flag
            if (!pullResult.success && pullResult.error?.includes('unrelated histories')) {
                terminal.showInfo('Detected unrelated histories. Merging...');
                pullResult = await pull(repoPath, remoteName, pushBranch, false, true);
            }
            
            // Check for errors during pull
            if (!pullResult.success) {
                const errorText = pullResult.error || '';
                
                // Try AI analysis for smart error explanation
                terminal.writeLine('');
                terminal.showProgress('Analyzing error with AI');
                
                const pullAiConfig = getAIProviderConfig();
                const aiAnalysis = await analyzeGitError(pullAiConfig, errorText, {
                    operation: 'pull --rebase',
                    branch: pushBranch,
                    remote: remoteName,
                });
                
                // Check for conflicts
                const isConflict = errorText.toLowerCase().includes('conflict') || 
                                   errorText.toLowerCase().includes('could not apply') ||
                                   errorText.toLowerCase().includes('merge') ||
                                   errorText.toLowerCase().includes('rebase');
                
                if (isConflict) {
                    terminal.writeLine('');
                    terminal.showError('⚠️  Conflict Detected');
                    terminal.separator();
                    
                    if (aiAnalysis.success && aiAnalysis.explanation) {
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
                        terminal.showInfo('Your changes conflict with remote changes.');
                        terminal.writeLine('');
                        terminal.showInfo('To resolve:');
                        terminal.writeLine('   1. Open Source Control to see conflicting files');
                        terminal.writeLine('   2. Resolve conflicts (look for <<<<<<< markers)');
                        terminal.writeLine('   3. Stage resolved files');
                        terminal.writeLine('   4. Run: git rebase --continue (or git rebase --abort)');
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
                    terminal.showInfo('Please resolve the issue manually.');
                    terminal.writeLine('');
                    // Show formatted error lines
                    const errorLines = errorText.split(/[\r\n]+/).filter(l => l.trim());
                    for (const line of errorLines.slice(0, 8)) {
                        const cleanLine = line.trim()
                            .replace(/^hint:\s*/i, '💡 ')
                            .replace(/^error:\s*/i, '❌ ')
                            .replace(/^fatal:\s*/i, '🛑 ');
                        terminal.writeLine(`   ${cleanLine}`);
                    }
                }
                
                terminal.separator();
                terminal.showInfo('Terminal will remain open for reference.');
                return;
            }
            terminal.showSuccess('Pulled successfully');
            
            // Retry push
            terminal.showProgress(`Pushing to ${remoteName}/${pushBranch}`);
            pushResult = await push(repoPath, remoteName, pushBranch, false);
        }
        
        if (!pushResult.success) {
            terminal.showError(pushResult.error || 'Failed to push');
            return;
        }
        terminal.showSuccess(`Pushed to ${remoteName}/${pushBranch}`);
        
        // Track push in analytics
        await trackPush();
    }

    
    // Done!
    terminal.separator();
    terminal.writeLine('');
    terminal.showSuccess('✨ All done! Commit and push completed successfully.');
    terminal.showInfo(`📊 Total time saved with AutoGit Pro: ${getTimeSavedEstimate()}`);
    terminal.writeLine('');
    terminal.showInfo('Terminal will close in 3 seconds...');
    
    // Close terminal after delay
    setTimeout(() => {
        terminal.closeImmediately();
    }, 3000);
}

/**
 * Get AI configuration with defaults
 */
function getAIConfig(config: ExtensionConfig): AIProviderConfig {
    // Handle explicit provider selection
    if (config.aiProvider === 'groq') {
        return {
            provider: 'groq',
            apiKey: config.groqApiKey,
            model: config.groqModel || 'llama-3.1-8b-instant',
        };
    }
    
    if (config.aiProvider === 'gemini') {
        return {
            provider: 'gemini',
            apiKey: config.geminiApiKey,
            model: config.geminiModel || 'gemini-2.0-flash-001',
        };
    }
    
    if (config.aiProvider === 'openai') {
        return {
            provider: 'openai',
            apiKey: config.openaiApiKey,
            model: config.openaiModel,
        };
    }
    
    // Default: try groq if key is set, otherwise gemini (user must provide key)
    if (config.groqApiKey) {
        return {
            provider: 'groq',
            apiKey: config.groqApiKey,
            model: config.groqModel || 'llama-3.1-8b-instant',
        };
    }
    
    // Fall back to gemini with user-provided key (or empty if not configured)
    return {
        provider: 'gemini',
        apiKey: config.geminiApiKey,
        model: config.geminiModel || 'gemini-2.0-flash-001',
    };
}

