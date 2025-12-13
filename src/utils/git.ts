/**
 * AutoGit Pro - Git Utilities
 * Core Git operations using child process execution
 */

import { spawn } from 'child_process';
import type { GitOperationResult, GitRemote, GitStatus, GitDiffContext } from '../types';


/**
 * Execute a Git command in the specified directory using spawn.
 * This avoids shell escaping issues by passing arguments as an array.
 */
async function executeGit(cwd: string, args: string): Promise<GitOperationResult<string>> {
    // Split the args string into an array for spawn
    // This is a simple split; complex args should use executeGitWithArgs directly
    const argsArray = args.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
    // Remove quotes from args
    const cleanArgs = argsArray.map(arg => arg.replace(/^"|"$/g, '').replace(/^'|'$/g, ''));
    return executeGitWithArgs(cwd, cleanArgs);
}

/**
 * Execute a Git command with explicit argument array (safer for special characters).
 */
async function executeGitWithArgs(cwd: string, args: string[]): Promise<GitOperationResult<string>> {
    return new Promise((resolve) => {
        const child = spawn('git', args, {
            cwd,
            shell: false, // Important: no shell interpolation
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
        });


        child.on('close', (code) => {
            if (code === 0) {
                resolve({
                    success: true,
                    data: stdout.trim(),
                });
            } else {
                resolve({
                    success: false,
                    error: stderr.trim() || `Git command failed with code ${code}`,
                });
            }
        });

        child.on('error', (err) => {
            resolve({
                success: false,
                error: err.message || 'Failed to execute git command',
            });
        });
    });
}


/**
 * Check if Git is installed and available
 */
export async function isGitInstalled(): Promise<boolean> {
    const result = await executeGitWithArgs('.', ['--version']);
    return result.success;
}


/**
 * Check if the directory is inside a Git work tree
 */
export async function isInsideWorkTree(cwd: string): Promise<GitOperationResult<boolean>> {
    const result = await executeGit(cwd, 'rev-parse --is-inside-work-tree');
    
    if (result.success && result.data === 'true') {
        return { success: true, data: true };
    }
    
    return {
        success: false,
        data: false,
        error: 'Not inside a Git repository',
    };
}

/**
 * Get the root directory of the Git repository
 */
export async function getRepositoryRoot(cwd: string): Promise<GitOperationResult<string>> {
    return executeGit(cwd, 'rev-parse --show-toplevel');
}

/**
 * Initialize a new Git repository with main as default branch
 */
export async function initRepository(cwd: string): Promise<GitOperationResult<string>> {
    return executeGit(cwd, 'init -b main');
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(cwd: string): Promise<GitOperationResult<string>> {
    const result = await executeGit(cwd, 'rev-parse --abbrev-ref HEAD');
    
    if (result.success && result.data) {
        return result;
    }
    
    // Fallback for detached HEAD state
    const hashResult = await executeGit(cwd, 'rev-parse --short HEAD');
    if (hashResult.success) {
        return {
            success: true,
            data: `HEAD detached at ${hashResult.data}`,
        };
    }
    
    return {
        success: false,
        error: 'Unable to determine current branch',
    };
}

/**
 * List all local branches
 */
export async function listBranches(cwd: string): Promise<GitOperationResult<string[]>> {
    const result = await executeGit(cwd, 'branch --format="%(refname:short)"');
    
    if (result.success && result.data) {
        const branches = result.data
            .split('\n')
            .map(b => b.trim().replace(/^["']|["']$/g, ''))
            .filter(b => b.length > 0);
        return { success: true, data: branches };
    }
    
    return {
        success: false,
        data: [],
        error: result.error || 'Unable to list branches',
    };
}

/**
 * Checkout (switch to) a branch
 */
export async function checkoutBranch(cwd: string, branch: string): Promise<GitOperationResult<void>> {
    const result = await executeGit(cwd, `checkout "${branch}"`);
    
    if (result.success || result.error?.includes('Already on')) {
        return { success: true };
    }
    
    return {
        success: false,
        error: result.error || `Failed to checkout branch: ${branch}`,
    };
}

/**
 * Create and checkout a new branch
 */
export async function createBranch(cwd: string, branch: string): Promise<GitOperationResult<void>> {
    // Validate branch name (no spaces, special chars)
    if (!branch || branch.trim().length === 0) {
        return {
            success: false,
            error: 'Branch name cannot be empty',
        };
    }
    
    // Check for invalid characters
    if (/[\s~^:?*\[\]\\]/.test(branch)) {
        return {
            success: false,
            error: 'Branch name contains invalid characters (spaces or special chars)',
        };
    }
    
    const result = await executeGit(cwd, `checkout -b "${branch}"`);
    
    if (result.success) {
        return { success: true };
    }
    
    return {
        success: false,
        error: result.error || `Failed to create branch: ${branch}`,
    };
}

/**
 * Get list of configured remotes
 */
export async function getRemotes(cwd: string): Promise<GitOperationResult<GitRemote[]>> {
    const result = await executeGit(cwd, 'remote -v');
    
    if (!result.success) {
        return { success: false, data: [], error: result.error };
    }
    
    if (!result.data) {
        return { success: true, data: [] };
    }
    
    const remotes: GitRemote[] = [];
    const lines = result.data.split('\n').filter(l => l.trim());
    
    for (const line of lines) {
        const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
        if (match) {
            remotes.push({
                name: match[1],
                url: match[2],
                type: match[3] as 'fetch' | 'push',
            });
        }
    }
    
    return { success: true, data: remotes };
}

/**
 * Check if a specific remote exists
 */
export async function hasRemote(cwd: string, remoteName: string): Promise<boolean> {
    const result = await getRemotes(cwd);
    return result.success && (result.data?.some(r => r.name === remoteName) || false);
}

/**
 * Add a new remote
 */
export async function addRemote(cwd: string, name: string, url: string): Promise<GitOperationResult<void>> {
    const result = await executeGit(cwd, `remote add "${name}" "${url}"`);
    
    if (result.success) {
        return { success: true };
    }
    
    return {
        success: false,
        error: result.error || `Failed to add remote: ${name}`,
    };
}

/**
 * Set remote URL
 */
export async function setRemoteUrl(cwd: string, name: string, url: string): Promise<GitOperationResult<void>> {
    const result = await executeGit(cwd, `remote set-url "${name}" "${url}"`);
    
    if (result.success) {
        return { success: true };
    }
    
    return {
        success: false,
        error: result.error || `Failed to set remote URL for: ${name}`,
    };
}

/**
 * Stage all changes (git add .)
 */
export async function stageAll(cwd: string): Promise<GitOperationResult<void>> {
    const result = await executeGit(cwd, 'add .');
    
    if (result.success) {
        return { success: true };
    }
    
    return {
        success: false,
        error: result.error || 'Failed to stage changes',
    };
}

/**
 * Stage specific files
 */
export async function stageFiles(cwd: string, files: string[]): Promise<GitOperationResult<void>> {
    const escapedFiles = files.map(f => `"${f}"`).join(' ');
    const result = await executeGit(cwd, `add ${escapedFiles}`);
    
    if (result.success) {
        return { success: true };
    }
    
    return {
        success: false,
        error: result.error || 'Failed to stage files',
    };
}

/**
 * Create a commit with the specified message
 */
export async function commit(cwd: string, message: string): Promise<GitOperationResult<string>> {
    // Validate message
    if (!message || message.trim().length === 0) {
        return {
            success: false,
            error: 'Commit message cannot be empty',
        };
    }

    // Use executeGitWithArgs to safely pass the message without shell escaping
    const result = await executeGitWithArgs(cwd, ['commit', '-m', message.trim()]);

    if (result.success) {
        return result;
    }

    return {
        success: false,
        error: result.error || 'Failed to create commit',
    };
}


/**
 * Push to remote
 */
export async function push(
    cwd: string,
    remote: string,
    branch: string,
    setUpstream: boolean = false
): Promise<GitOperationResult<void>> {
    const upstreamFlag = setUpstream ? '-u ' : '';
    const result = await executeGit(cwd, `push ${upstreamFlag}${remote} ${branch}`);
    
    if (result.success) {
        return { success: true };
    }
    
    return {
        success: false,
        error: result.error || 'Failed to push changes',
    };
}

/**
 * Get the porcelain status (for parsing)
 */
export async function getStatus(cwd: string): Promise<GitOperationResult<GitStatus>> {
    const result = await executeGit(cwd, 'status --porcelain');
    
    if (!result.success) {
        return {
            success: false,
            error: result.error,
        };
    }
    
    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];
    
    const lines = (result.data || '').split('\n').filter(l => l.trim());
    
    for (const line of lines) {
        const indexStatus = line[0];
        const workTreeStatus = line[1];
        const filename = line.substring(3);
        
        if (indexStatus === '?') {
            untracked.push(filename);
        } else {
            if (indexStatus !== ' ' && indexStatus !== '?') {
                staged.push(filename);
            }
            if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
                unstaged.push(filename);
            }
        }
    }
    
    return {
        success: true,
        data: {
            staged,
            unstaged,
            untracked,
            hasChanges: staged.length > 0 || unstaged.length > 0 || untracked.length > 0,
        },
    };
}

/**
 * Get the diff of staged changes
 */
export async function getStagedDiff(cwd: string): Promise<GitOperationResult<string>> {
    return executeGit(cwd, 'diff --cached');
}

/**
 * Get the diff of all changes (staged and unstaged)
 */
export async function getAllDiff(cwd: string): Promise<GitOperationResult<string>> {
    const stagedResult = await executeGit(cwd, 'diff --cached');
    const unstagedResult = await executeGit(cwd, 'diff');
    
    if (!stagedResult.success || !unstagedResult.success) {
        return {
            success: false,
            error: stagedResult.error || unstagedResult.error,
        };
    }
    
    const combinedDiff = [stagedResult.data, unstagedResult.data]
        .filter(Boolean)
        .join('\n');
    
    return { success: true, data: combinedDiff };
}

/**
 * Get full context for AI commit message generation
 */
export async function getDiffContext(cwd: string): Promise<GitOperationResult<GitDiffContext>> {
    const [statusResult, diffResult, branchResult] = await Promise.all([
        getStatus(cwd),
        getAllDiff(cwd),
        getCurrentBranch(cwd),
    ]);
    
    if (!statusResult.success || !diffResult.success || !branchResult.success) {
        return {
            success: false,
            error: statusResult.error || diffResult.error || branchResult.error,
        };
    }
    
    const status = statusResult.data!;
    
    return {
        success: true,
        data: {
            status,
            diff: diffResult.data || '',
            branch: branchResult.data || 'unknown',
            filesChanged: status.staged.length + status.unstaged.length + status.untracked.length,
        },
    };
}

/**
 * Check if there's an upstream branch set
 */
export async function hasUpstream(cwd: string, branch: string): Promise<boolean> {
    const result = await executeGit(cwd, `config branch.${branch}.remote`);
    return result.success && Boolean(result.data);
}

/**
 * Fetch from remote
 */
export async function fetch(cwd: string, remote: string): Promise<GitOperationResult<void>> {
    const result = await executeGit(cwd, `fetch ${remote}`);
    
    if (result.success) {
        return { success: true };
    }
    
    return {
        success: false,
        error: result.error || 'Failed to fetch from remote',
    };
}

/**
 * Pull from remote (with rebase option)
 */
export async function pull(
    cwd: string,
    remote: string = 'origin',
    branch: string = '',
    rebase: boolean = false,
    allowUnrelatedHistories: boolean = false
): Promise<GitOperationResult<string>> {
    const args: string[] = ['pull'];
    
    if (rebase) {
        args.push('--rebase');
    }
    
    if (allowUnrelatedHistories) {
        args.push('--allow-unrelated-histories');
    }
    
    args.push(remote);
    
    if (branch) {
        args.push(branch);
    }
    
    const result = await executeGitWithArgs(cwd, args);

    if (result.success) {
        return { success: true, data: result.data };
    }

    return {
        success: false,
        error: result.error || 'Failed to pull from remote',
    };
}

