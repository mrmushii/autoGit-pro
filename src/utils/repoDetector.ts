/**
 * AutoGit Pro - Repository Detector
 * Detects Git repositories from workspace and active editor
 * Supports multiple repositories and monorepo structures
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { isInsideWorkTree, getRepositoryRoot } from './git';
import { getExtensionConfig } from '../types';

/**
 * Repository info with additional metadata
 */
export interface RepositoryInfo {
    path: string;
    name: string;
    isNested: boolean;
}

/**
 * Detect the active repository based on current context and settings
 * Returns single repo or undefined (for 'ask' and 'active' modes)
 */
export async function detectRepository(): Promise<string | undefined> {
    const config = getExtensionConfig();
    const mode = config.multiRepoMode;
    
    // For 'active' mode, always try to use the active file's repo
    if (mode === 'active') {
        const activeRepo = await getActiveFileRepository();
        if (activeRepo) {
            return activeRepo;
        }
        // Fall back to asking if no active file
    }
    
    // Try to get repository from active editor first
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const documentPath = activeEditor.document.uri.fsPath;
        const dirPath = path.dirname(documentPath);
        
        const repoResult = await getRepositoryRoot(dirPath);
        if (repoResult.success && repoResult.data) {
            return repoResult.data;
        }
    }
    
    // Fall back to workspace repositories
    const repositories = await getAllRepositories();
    
    if (repositories.length === 0) {
        return undefined;
    }
    
    if (repositories.length === 1) {
        return repositories[0].path;
    }
    
    // Multiple repos found - handle based on mode
    if (mode === 'ask') {
        return await promptForRepository(repositories);
    }
    
    // For 'all' mode, we return the first one here
    // The actual multi-commit is handled in autoCommit.ts
    return repositories[0].path;
}

/**
 * Get repository from the active file
 */
export async function getActiveFileRepository(): Promise<string | undefined> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        return undefined;
    }
    
    const documentPath = activeEditor.document.uri.fsPath;
    const dirPath = path.dirname(documentPath);
    
    const repoResult = await getRepositoryRoot(dirPath);
    if (repoResult.success && repoResult.data) {
        return repoResult.data;
    }
    
    return undefined;
}

/**
 * Get the first workspace folder path (even if not a git repo)
 */
export function getWorkspaceFolderPath(): string | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    return undefined;
}

/**
 * Get all Git repositories in the workspace
 * Includes nested repos if scanNestedRepos is enabled
 */
export async function getAllRepositories(): Promise<RepositoryInfo[]> {
    const config = getExtensionConfig();
    const repositories: RepositoryInfo[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) {
        return repositories;
    }
    
    const addedPaths = new Set<string>();
    
    for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        
        // Check if workspace folder is a repo
        const isRepo = await isInsideWorkTree(folderPath);
        if (isRepo.success && isRepo.data) {
            const repoRoot = await getRepositoryRoot(folderPath);
            if (repoRoot.success && repoRoot.data && !addedPaths.has(repoRoot.data)) {
                addedPaths.add(repoRoot.data);
                repositories.push({
                    path: repoRoot.data,
                    name: path.basename(repoRoot.data),
                    isNested: false,
                });
            }
        }
        
        // Scan for nested repos if enabled
        if (config.scanNestedRepos) {
            const nestedRepos = await scanForNestedRepos(folderPath, addedPaths);
            repositories.push(...nestedRepos);
        }
    }
    
    return repositories;
}

/**
 * Scan directory for nested Git repositories (1 level deep for performance)
 */
async function scanForNestedRepos(
    rootPath: string,
    excludePaths: Set<string>
): Promise<RepositoryInfo[]> {
    const nestedRepos: RepositoryInfo[] = [];
    
    try {
        const entries = fs.readdirSync(rootPath, { withFileTypes: true });
        
        for (const entry of entries) {
            if (!entry.isDirectory()) {
                continue;
            }
            if (entry.name.startsWith('.')) {
                continue; // Skip hidden dirs
            }
            if (entry.name === 'node_modules') {
                continue; // Skip node_modules
            }
            
            const subPath = path.join(rootPath, entry.name);
            
            // Check if this subfolder is a git repo
            const gitDir = path.join(subPath, '.git');
            if (fs.existsSync(gitDir)) {
                const repoRoot = await getRepositoryRoot(subPath);
                if (repoRoot.success && repoRoot.data && !excludePaths.has(repoRoot.data)) {
                    excludePaths.add(repoRoot.data);
                    nestedRepos.push({
                        path: repoRoot.data,
                        name: path.basename(repoRoot.data),
                        isNested: true,
                    });
                }
            }
        }
    } catch {
        // Ignore errors (permission issues, etc.)
    }
    
    return nestedRepos;
}

/**
 * Prompt user to select a repository
 */
async function promptForRepository(repositories: RepositoryInfo[]): Promise<string | undefined> {
    const items = repositories.map(repo => ({
        label: repo.isNested ? `$(folder) ${repo.name}` : `$(repo) ${repo.name}`,
        description: repo.isNested ? '(nested)' : '',
        detail: repo.path,
        path: repo.path,
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a repository to commit to',
        title: 'AutoGit Pro: Multiple Repositories Found',
    });
    
    return selected?.path;
}

/**
 * Get all repositories for multi-commit mode
 */
export async function getRepositoriesForMultiCommit(): Promise<string[]> {
    const repos = await getAllRepositories();
    return repos.map(r => r.path);
}

/**
 * Legacy function - Get all Git repositories in the workspace
 */
export async function getWorkspaceRepositories(): Promise<string[]> {
    const repos = await getAllRepositories();
    return repos.map(r => r.path);
}

/**
 * Show repository picker if multiple repositories exist
 */
export async function selectRepository(): Promise<string | undefined> {
    const repositories = await getAllRepositories();
    
    if (repositories.length === 0) {
        void vscode.window.showErrorMessage('AutoGit Pro: No Git repository found in workspace');
        return undefined;
    }
    
    if (repositories.length === 1) {
        return repositories[0].path;
    }
    
    return await promptForRepository(repositories);
}

/**
 * Check if multi-commit mode is enabled
 */
export function isMultiCommitMode(): boolean {
    const config = getExtensionConfig();
    return config.multiRepoMode === 'all';
}

/**
 * Validate that a path is a valid Git repository
 */
export async function validateRepository(repoPath: string): Promise<boolean> {
    const result = await isInsideWorkTree(repoPath);
    return result.success && result.data === true;
}

