/**
 * AutoGit Pro - Repository Detector
 * Detects Git repositories from workspace and active editor
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { isInsideWorkTree, getRepositoryRoot } from './git';

/**
 * Detect the active repository based on current context
 * Priority: Active editor > First workspace folder
 */
export async function detectRepository(): Promise<string | undefined> {
    // Try to get repository from active editor
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const documentPath = activeEditor.document.uri.fsPath;
        const dirPath = path.dirname(documentPath);
        
        const repoResult = await getRepositoryRoot(dirPath);
        if (repoResult.success && repoResult.data) {
            return repoResult.data;
        }
    }
    
    // Fall back to first workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        for (const folder of workspaceFolders) {
            const folderPath = folder.uri.fsPath;
            const repoResult = await getRepositoryRoot(folderPath);
            if (repoResult.success && repoResult.data) {
                return repoResult.data;
            }
        }
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
 */
export async function getWorkspaceRepositories(): Promise<string[]> {
    const repositories: string[] = [];
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (!workspaceFolders) {
        return repositories;
    }
    
    for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        const isRepo = await isInsideWorkTree(folderPath);
        
        if (isRepo.success && isRepo.data) {
            const repoRoot = await getRepositoryRoot(folderPath);
            if (repoRoot.success && repoRoot.data) {
                // Avoid duplicates
                if (!repositories.includes(repoRoot.data)) {
                    repositories.push(repoRoot.data);
                }
            }
        }
    }
    
    return repositories;
}

/**
 * Show repository picker if multiple repositories exist
 */
export async function selectRepository(): Promise<string | undefined> {
    const repositories = await getWorkspaceRepositories();
    
    if (repositories.length === 0) {
        vscode.window.showErrorMessage('AutoGit Pro: No Git repository found in workspace');
        return undefined;
    }
    
    if (repositories.length === 1) {
        return repositories[0];
    }
    
    // Show picker for multiple repos
    const items = repositories.map(repo => ({
        label: path.basename(repo),
        description: repo,
        path: repo,
    }));
    
    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a repository',
        title: 'AutoGit Pro: Multiple Repositories Found',
    });
    
    return selected?.path;
}

/**
 * Validate that a path is a valid Git repository
 */
export async function validateRepository(repoPath: string): Promise<boolean> {
    const result = await isInsideWorkTree(repoPath);
    return result.success && result.data === true;
}
