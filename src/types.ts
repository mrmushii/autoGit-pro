/**
 * AutoGit Pro - Type Definitions
 * Core TypeScript interfaces and types for the extension
 */

import * as vscode from 'vscode';

/**
 * Result wrapper for Git operations with success/error handling
 */
export interface GitOperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Git repository information
 */
export interface GitRepository {
    path: string;
    branch: string;
    remotes: GitRemote[];
    hasChanges: boolean;
}

/**
 * Git remote configuration
 */
export interface GitRemote {
    name: string;
    url: string;
    type: 'fetch' | 'push';
}

/**
 * Git status information
 */
export interface GitStatus {
    staged: string[];
    unstaged: string[];
    untracked: string[];
    hasChanges: boolean;
}

/**
 * Git diff context for AI commit message generation
 */
export interface GitDiffContext {
    status: GitStatus;
    diff: string;
    branch: string;
    filesChanged: number;
}

/**
 * Commit message generation options
 */
export interface CommitOptions {
    message: string;
    branch: string;
    remote: string;
    push: boolean;
    stageAll: boolean;
}

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
    provider: 'openai' | 'gemini' | 'groq' | 'none';
    apiKey: string;
    model: string;
}

/**
 * AI commit message generation result
 */
export interface AICommitResult {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Commit message style for AI generation
 */
export type CommitStyle = 'basic' | 'conventional' | 'detailed';

/**
 * Extension configuration from VS Code settings
 */
export interface ExtensionConfig {
    aiProvider: 'openai' | 'gemini' | 'groq' | 'none';
    openaiApiKey: string;
    openaiModel: string;
    geminiApiKey: string;
    geminiModel: string;
    groqApiKey: string;
    groqModel: string;
    defaultRemote: string;
    autoStageAll: boolean;
    confirmBeforePush: boolean;
    pushAfterCommit: boolean;
    commitMessageTemplate: string;
    commitStyle: CommitStyle;
    includeScope: boolean;
}

/**
 * User selection for commit message mode
 */
export type CommitMessageMode = 'ai' | 'manual';

/**
 * Branch selection result
 */
export interface BranchSelection {
    branch: string;
    switched: boolean;
}

/**
 * Workflow step status
 */
export interface WorkflowStep {
    name: string;
    status: 'pending' | 'running' | 'success' | 'error';
    message?: string;
}

/**
 * Get extension configuration from VS Code settings
 */
export function getExtensionConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration('autogit-pro');
    
    return {
        aiProvider: config.get<'openai' | 'gemini' | 'groq' | 'none'>('aiProvider', 'none'),
        openaiApiKey: config.get<string>('openaiApiKey', ''),
        openaiModel: config.get<string>('openaiModel', 'gpt-4o-mini'),
        geminiApiKey: config.get<string>('geminiApiKey', ''),
        geminiModel: config.get<string>('geminiModel', 'gemini-2.0-flash-001'),
        groqApiKey: config.get<string>('groqApiKey', ''),
        groqModel: config.get<string>('groqModel', 'llama-3.1-8b-instant'),
        defaultRemote: config.get<string>('defaultRemote', 'origin'),
        autoStageAll: config.get<boolean>('autoStageAll', true),
        confirmBeforePush: config.get<boolean>('confirmBeforePush', true),
        pushAfterCommit: config.get<boolean>('pushAfterCommit', true),
        commitMessageTemplate: config.get<string>('commitMessageTemplate', ''),
        commitStyle: config.get<CommitStyle>('commitStyle', 'conventional'),
        includeScope: config.get<boolean>('includeScope', true),
    };
}

/**
 * Get AI provider configuration from extension settings
 * Determines the correct API key and model based on provider selection
 */
export function getAIProviderConfig(): AIProviderConfig {
    const config = getExtensionConfig();
    
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
            model: config.openaiModel || 'gpt-4o-mini',
        };
    }
    
    // Default: try groq if key is set, otherwise return 'none'
    if (config.groqApiKey) {
        return {
            provider: 'groq',
            apiKey: config.groqApiKey,
            model: config.groqModel || 'llama-3.1-8b-instant',
        };
    }
    
    // No provider configured
    return {
        provider: 'none',
        apiKey: '',
        model: '',
    };
}
