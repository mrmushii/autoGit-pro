/**
 * AutoGit Pro - Auto Commit Command (Terminal Version)
 * Terminal-based workflow for commit & push
 */

import { getExtensionConfig, type AIProviderConfig, type ExtensionConfig } from '../types';
import { detectRepository } from '../utils/repoDetector';
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
    getStatus,
    getDiffContext,
    hasUpstream,
} from '../utils/git';
import { generateCommitMessage, validateAIConfig } from '../utils/ai';
import { TerminalWorkflow } from '../ui/terminal';

// Default Gemini API key (user can override in settings)
const DEFAULT_GEMINI_API_KEY = 'AIzaSyD4BEiEgsp5lMZUrJOOI9ORMBy69WUoPp4';

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
        terminal.close();
    }
}

/**
 * Main workflow logic
 */
async function runWorkflow(terminal: TerminalWorkflow, _quickMode: boolean): Promise<void> {
    const config = getExtensionConfig();
    
    // Step 1: Check Git installation
    terminal.showProgress('Checking Git installation');
    const gitInstalled = await isGitInstalled();
    if (!gitInstalled) {
        terminal.showError('Git is not installed or not in PATH');
        terminal.close();
        return;
    }
    terminal.showSuccess('Git is available');
    
    // Step 2: Detect repository
    terminal.showProgress('Detecting repository');
    const repoPath = await detectRepository();
    if (!repoPath) {
        terminal.showError('No Git repository found. Please open a folder with a Git repository.');
        terminal.close();
        return;
    }
    terminal.showSuccess(`Repository: ${repoPath}`);
    
    // Step 3: Get current branch
    const branchResult = await getCurrentBranch(repoPath);
    if (!branchResult.success || !branchResult.data) {
        terminal.showError(branchResult.error || 'Failed to detect current branch');
        terminal.close();
        return;
    }
    let currentBranch = branchResult.data;
    terminal.showInfo(`Current branch: ${currentBranch}`);
    
    // Step 4: Check for changes
    const statusResult = await getStatus(repoPath);
    if (!statusResult.success || !statusResult.data) {
        terminal.showError(statusResult.error || 'Failed to get repository status');
        terminal.close();
        return;
    }
    
    if (!statusResult.data.hasChanges) {
        terminal.showError('No changes to commit');
        terminal.close();
        return;
    }
    
    const status = statusResult.data;
    terminal.showInfo(`Changes: ${status.staged.length} staged, ${status.unstaged.length} modified, ${status.untracked.length} new`);
    terminal.separator();
    
    // Step 5: Branch selection
    terminal.writeLine('');
    const branchInput = await terminal.input('Branch', currentBranch);
    
    if (branchInput !== currentBranch) {
        const branchesResult = await listBranches(repoPath);
        const branches = branchesResult.success ? branchesResult.data || [] : [];
        
        if (branches.includes(branchInput)) {
            terminal.showProgress(`Switching to branch: ${branchInput}`);
            const checkoutResult = await checkoutBranch(repoPath, branchInput);
            if (!checkoutResult.success) {
                terminal.showError(checkoutResult.error || 'Failed to switch branch');
                terminal.close();
                return;
            }
            terminal.showSuccess(`Switched to ${branchInput}`);
        } else {
            terminal.showProgress(`Creating new branch: ${branchInput}`);
            const createResult = await createBranch(repoPath, branchInput);
            if (!createResult.success) {
                terminal.showError(createResult.error || 'Failed to create branch');
                terminal.close();
                return;
            }
            terminal.showSuccess(`Created and switched to ${branchInput}`);
        }
        currentBranch = branchInput;
    }
    
    // Step 6: Generate AI commit message
    terminal.separator();
    let commitMessage = '';
    
    const aiConfig = getAIConfig(config);
    const aiConfigValid = validateAIConfig(aiConfig);
    
    if (aiConfigValid.valid && aiConfig.provider !== 'none') {
        terminal.showProgress('Generating AI commit message');
        
        const contextResult = await getDiffContext(repoPath);
        if (contextResult.success && contextResult.data) {
            const aiResult = await generateCommitMessage(aiConfig, contextResult.data);
            if (aiResult.success && aiResult.message) {
                commitMessage = aiResult.message;
                terminal.showSuccess('AI generated commit message:');
                terminal.writeLine(`  ${commitMessage}`);
                terminal.writeLine('');
            } else {
                terminal.showError(`AI generation failed: ${aiResult.error}`);
            }
        }
    }
    
    // Step 7: Get/confirm commit message
    const messageInput = await terminal.input('Commit message', commitMessage || 'Update files');
    commitMessage = messageInput;
    
    if (!commitMessage) {
        terminal.showError('Commit message cannot be empty');
        terminal.close();
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
    terminal.showInfo(`Branch: ${currentBranch}`);
    terminal.showInfo(`Message: ${commitMessage}`);
    terminal.writeLine('');
    
    const confirmed = await terminal.confirm('Proceed with commit and push', true);
    
    if (!confirmed) {
        terminal.showError('Cancelled');
        terminal.close();
        return;
    }
    
    terminal.separator();
    
    // Step 10: Stage changes
    if (config.autoStageAll) {
        terminal.showProgress('Staging all changes');
        const stageResult = await stageAll(repoPath);
        if (!stageResult.success) {
            terminal.showError(stageResult.error || 'Failed to stage changes');
            terminal.close();
            return;
        }
        terminal.showSuccess('Changes staged');
    }
    
    // Step 11: Commit
    terminal.showProgress('Creating commit');
    const commitResult = await commit(repoPath, commitMessage);
    if (!commitResult.success) {
        terminal.showError(commitResult.error || 'Failed to commit');
        terminal.close();
        return;
    }
    terminal.showSuccess('Commit created');
    
    // Step 12: Push
    const shouldPush = config.pushAfterCommit && await hasRemote(repoPath, remoteName);
    
    if (shouldPush) {
        terminal.showProgress(`Pushing to ${remoteName}/${currentBranch}`);
        const upstreamSet = await hasUpstream(repoPath, currentBranch);
        const pushResult = await push(repoPath, remoteName, currentBranch, !upstreamSet);
        
        if (!pushResult.success) {
            terminal.showError(pushResult.error || 'Failed to push');
            terminal.close();
            return;
        }
        terminal.showSuccess(`Pushed to ${remoteName}/${currentBranch}`);
    }
    
    // Done!
    terminal.separator();
    terminal.writeLine('');
    terminal.showSuccess('✨ All done! Commit and push completed successfully.');
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
        const apiKey = config.geminiApiKey || DEFAULT_GEMINI_API_KEY;
        return {
            provider: 'gemini',
            apiKey: apiKey,
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
    
    // Default: try groq if key is set, otherwise gemini with default key
    if (config.groqApiKey) {
        return {
            provider: 'groq',
            apiKey: config.groqApiKey,
            model: config.groqModel || 'llama-3.1-8b-instant',
        };
    }
    
    return {
        provider: 'gemini',
        apiKey: DEFAULT_GEMINI_API_KEY,
        model: 'gemini-2.0-flash-001',
    };
}
