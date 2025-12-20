/**
 * AutoGit Pro - Commit History Panel
 * WebView-based dashboard for viewing commit history and AI analysis
 */

import * as vscode from 'vscode';
import { detectRepository } from '../utils/repoDetector';
import { getGitLog, getTotalCommitCount, type CommitInfo } from '../utils/git';
import { analyzeCommitHistory, type CodeAnalysis } from '../utils/codeAnalysis';

/**
 * History Panel Manager
 */
export class HistoryPanel {
    public static currentPanel: HistoryPanel | undefined;
    private readonly panel: vscode.WebviewPanel;
    private disposables: vscode.Disposable[] = [];
    private repoPath: string = '';

    private constructor(panel: vscode.WebviewPanel) {
        this.panel = panel;

        // Set initial content
        this.panel.webview.html = this.getLoadingHtml();

        // Handle messages from the WebView
        this.panel.webview.onDidReceiveMessage(
            async (message: { command: string; page?: number }) => {
                switch (message.command) {
                    case 'refresh':
                        await this.loadData();
                        break;
                    case 'loadMore':
                        await this.loadMoreCommits(message.page || 1);
                        break;
                }
            },
            null,
            this.disposables
        );

        // Handle panel disposal
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    }

    /**
     * Create or show the panel
     */
    public static async createOrShow(_extensionUri: vscode.Uri): Promise<void> {
        const column = vscode.window.activeTextEditor?.viewColumn || vscode.ViewColumn.One;

        if (HistoryPanel.currentPanel) {
            HistoryPanel.currentPanel.panel.reveal(column);
            await HistoryPanel.currentPanel.loadData();
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'autogitHistory',
            'AutoGit Pro: Commit History',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        HistoryPanel.currentPanel = new HistoryPanel(panel);
        await HistoryPanel.currentPanel.loadData();
    }

    /**
     * Load data and render
     */
    private async loadData(): Promise<void> {
        try {
            // Detect repository
            this.repoPath = await detectRepository() || '';
            
            if (!this.repoPath) {
                this.panel.webview.html = this.getErrorHtml('No Git repository found');
                return;
            }

            // Load data in parallel
            const [commitsResult, analysisResult, countResult] = await Promise.all([
                getGitLog(this.repoPath, 20),
                analyzeCommitHistory(this.repoPath, 30),
                getTotalCommitCount(this.repoPath),
            ]);

            const commits = commitsResult.data || [];
            const analysis = analysisResult.data;
            const totalCount = countResult.data || 0;

            this.panel.webview.html = this.getHtml(commits, analysis, totalCount);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            this.panel.webview.html = this.getErrorHtml(message);
        }
    }

    /**
     * Load more commits
     */
    private async loadMoreCommits(page: number): Promise<void> {
        const skip = page * 20;
        const result = await getGitLog(this.repoPath, 20, skip);
        
        if (result.success && result.data) {
            // Send commits to WebView
            void this.panel.webview.postMessage({
                command: 'moreCommits',
                commits: result.data,
                page,
            });
        }
    }

    /**
     * Get loading HTML
     */
    private getLoadingHtml(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loading...</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .loader {
            text-align: center;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--vscode-editor-foreground);
            border-top: 3px solid var(--vscode-button-background);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loader">
        <div class="spinner"></div>
        <p>Loading commit history...</p>
    </div>
</body>
</html>`;
    }

    /**
     * Get error HTML
     */
    private getErrorHtml(message: string): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Error</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .error {
            text-align: center;
            padding: 20px;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
    </style>
</head>
<body>
    <div class="error">
        <div class="error-icon">⚠️</div>
        <h2>Unable to Load History</h2>
        <p>${message}</p>
    </div>
</body>
</html>`;
    }

    /**
     * Get main HTML content
     */
    private getHtml(commits: CommitInfo[], analysis: CodeAnalysis | undefined, totalCount: number): string {
        const scoreColor = this.getScoreColor(analysis?.overallScore || 0);
        const score = analysis?.overallScore || 0;
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Commit History & Analysis</title>
    <style>
        :root {
            --bg-primary: var(--vscode-editor-background);
            --bg-secondary: var(--vscode-sideBar-background);
            --text-primary: var(--vscode-editor-foreground);
            --text-muted: var(--vscode-descriptionForeground);
            --accent: var(--vscode-button-background);
            --border: var(--vscode-panel-border);
            --success: #4ade80;
            --warning: #fbbf24;
            --error: #f87171;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--vscode-font-family);
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 24px;
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--border);
        }
        
        .header h1 {
            font-size: 24px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .refresh-btn {
            background: var(--accent);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .refresh-btn:hover {
            opacity: 0.9;
        }
        
        .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
            margin-bottom: 32px;
        }
        
        @media (max-width: 900px) {
            .grid {
                grid-template-columns: 1fr;
            }
        }
        
        .card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
        }
        
        .card-title {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .score-card {
            text-align: center;
            padding: 32px 20px;
        }
        
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: conic-gradient(${scoreColor} ${score * 3.6}deg, var(--border) 0deg);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 16px;
            position: relative;
        }
        
        .score-inner {
            width: 100px;
            height: 100px;
            background: var(--bg-secondary);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .score-value {
            font-size: 36px;
            font-weight: bold;
            color: ${scoreColor};
        }
        
        .score-label {
            font-size: 12px;
            color: var(--text-muted);
        }
        
        .insights-list {
            list-style: none;
        }
        
        .insights-list li {
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }
        
        .insights-list li:last-child {
            border-bottom: none;
        }
        
        .strength {
            color: var(--success);
        }
        
        .improvement {
            color: var(--warning);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }
        
        .stat-item {
            text-align: center;
            padding: 12px;
            background: var(--bg-primary);
            border-radius: 8px;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--accent);
        }
        
        .stat-label {
            font-size: 11px;
            color: var(--text-muted);
            margin-top: 4px;
        }
        
        .commits-section {
            margin-top: 32px;
        }
        
        .commits-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .commits-header h2 {
            font-size: 18px;
            font-weight: 600;
        }
        
        .commit-count {
            color: var(--text-muted);
            font-size: 14px;
        }
        
        .commits-list {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
        }
        
        .commit-item {
            padding: 16px 20px;
            border-bottom: 1px solid var(--border);
            display: flex;
            gap: 16px;
            align-items: flex-start;
        }
        
        .commit-item:last-child {
            border-bottom: none;
        }
        
        .commit-hash {
            font-family: monospace;
            font-size: 12px;
            background: var(--bg-primary);
            padding: 4px 8px;
            border-radius: 4px;
            color: var(--accent);
            min-width: 70px;
            text-align: center;
        }
        
        .commit-content {
            flex: 1;
        }
        
        .commit-message {
            font-size: 14px;
            margin-bottom: 4px;
        }
        
        .commit-type {
            display: inline-block;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            margin-right: 8px;
        }
        
        .commit-type.feat { background: #3b82f6; color: white; }
        .commit-type.fix { background: #ef4444; color: white; }
        .commit-type.docs { background: #8b5cf6; color: white; }
        .commit-type.refactor { background: #f59e0b; color: white; }
        .commit-type.chore { background: #6b7280; color: white; }
        .commit-type.test { background: #10b981; color: white; }
        .commit-type.style { background: #ec4899; color: white; }
        
        .commit-meta {
            font-size: 12px;
            color: var(--text-muted);
        }
        
        .tips-section {
            margin-top: 24px;
        }
        
        .tip-item {
            padding: 12px 16px;
            background: var(--bg-primary);
            border-radius: 8px;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .empty-state {
            text-align: center;
            padding: 48px 20px;
            color: var(--text-muted);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Commit History & Analysis</h1>
        <button class="refresh-btn" onclick="refresh()">🔄 Refresh</button>
    </div>
    
    ${analysis ? this.renderAnalysis(analysis) : ''}
    
    <div class="commits-section">
        <div class="commits-header">
            <h2>📜 Recent Commits</h2>
            <span class="commit-count">${totalCount} total commits</span>
        </div>
        
        ${commits.length > 0 ? this.renderCommits(commits) : '<div class="empty-state">No commits yet</div>'}
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
    </script>
</body>
</html>`;
    }

    /**
     * Render analysis section
     */
    private renderAnalysis(analysis: CodeAnalysis): string {
        const strengthsHtml = analysis.strengths.map(s => 
            `<li><span class="strength">✓</span> ${s}</li>`
        ).join('');
        
        const improvementsHtml = analysis.improvements.map(i => 
            `<li><span class="improvement">→</span> ${i}</li>`
        ).join('');
        
        const tipsHtml = analysis.personalizedTips.map(t => 
            `<div class="tip-item">${t}</div>`
        ).join('');

        return `
        <div class="grid">
            <div class="card score-card">
                <div class="score-circle">
                    <div class="score-inner">
                        <div class="score-value">${analysis.overallScore}</div>
                        <div class="score-label">Score</div>
                    </div>
                </div>
                <h3 style="margin-bottom: 8px;">Code Quality Score</h3>
                <p style="color: var(--text-muted); font-size: 14px;">
                    Based on ${analysis.codeQuality.commitMessageQuality}% conventional commits
                </p>
            </div>
            
            <div class="card">
                <div class="card-title">📈 Statistics</div>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">${analysis.codeQuality.avgFilesPerCommit}</div>
                        <div class="stat-label">Avg Files/Commit</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${analysis.codeQuality.avgLinesChanged}</div>
                        <div class="stat-label">Avg Lines Changed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${analysis.commitPatterns.mostActiveDay.substring(0, 3)}</div>
                        <div class="stat-label">Most Active Day</div>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-title">💪 Strengths</div>
                <ul class="insights-list">
                    ${strengthsHtml || '<li style="color: var(--text-muted);">Make more commits to see strengths</li>'}
                </ul>
            </div>
            
            <div class="card">
                <div class="card-title">📈 Areas to Improve</div>
                <ul class="insights-list">
                    ${improvementsHtml || '<li style="color: var(--text-muted);">Looking good! No improvements needed.</li>'}
                </ul>
            </div>
        </div>
        
        <div class="tips-section">
            <div class="card">
                <div class="card-title">💡 Personalized Tips</div>
                ${tipsHtml}
            </div>
        </div>`;
    }

    /**
     * Render commits list
     */
    private renderCommits(commits: CommitInfo[]): string {
        const items = commits.map(commit => {
            const typeMatch = commit.subject.match(/^(feat|fix|docs|style|refactor|test|chore|perf|build|ci)(\([^)]+\))?:?\s*/i);
            const type = typeMatch ? typeMatch[1].toLowerCase() : '';
            const message = typeMatch 
                ? commit.subject.replace(typeMatch[0], '')
                : commit.subject;
            
            const date = new Date(commit.date);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
            
            return `
            <div class="commit-item">
                <span class="commit-hash">${commit.shortHash}</span>
                <div class="commit-content">
                    <div class="commit-message">
                        ${type ? `<span class="commit-type ${type}">${type}</span>` : ''}
                        ${this.escapeHtml(message)}
                    </div>
                    <div class="commit-meta">
                        ${this.escapeHtml(commit.author)} • ${formattedDate}
                    </div>
                </div>
            </div>`;
        }).join('');
        
        return `<div class="commits-list">${items}</div>`;
    }

    /**
     * Get score color
     */
    private getScoreColor(score: number): string {
        if (score >= 80) {
            return '#4ade80';
        }
        if (score >= 60) {
            return '#fbbf24';
        }
        if (score >= 40) {
            return '#fb923c';
        }
        return '#f87171';
    }

    /**
     * Escape HTML
     */
    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /**
     * Dispose panel
     */
    public dispose(): void {
        HistoryPanel.currentPanel = undefined;
        this.panel.dispose();
        
        while (this.disposables.length) {
            const x = this.disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
