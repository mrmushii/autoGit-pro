/**
 * AutoGit Pro - Code Analysis with AI
 * Analyzes commit history and provides AI-powered insights
 */

import type { AIProviderConfig } from '../types';
import type { CommitInfo, CommitStats } from './git';
import { getCommitStats, getRecentCommits } from './git';
import * as https from 'https';

/**
 * Analysis result structure
 */
export interface CodeAnalysis {
    overallScore: number;  // 1-100
    strengths: string[];
    improvements: string[];
    commitPatterns: {
        averageCommitsPerDay: number;
        mostActiveDay: string;
        commitTypes: Record<string, number>;
    };
    codeQuality: {
        avgFilesPerCommit: number;
        avgLinesChanged: number;
        commitMessageQuality: number;  // 1-100
    };
    personalizedTips: string[];
}

/**
 * Analyze recent commits
 */
export async function analyzeCommitHistory(
    repoPath: string,
    days: number = 30
): Promise<{ success: boolean; data?: CodeAnalysis; error?: string }> {
    try {
        // Get recent commits
        const commitsResult = await getRecentCommits(repoPath, days);
        if (!commitsResult.success || !commitsResult.data) {
            return { success: false, error: commitsResult.error || 'Failed to get commits' };
        }
        
        const commits = commitsResult.data;
        if (commits.length === 0) {
            return {
                success: true,
                data: getEmptyAnalysis(),
            };
        }
        
        // Get stats for each commit (sample up to 20 for performance)
        const sampleCommits = commits.slice(0, 20);
        const statsPromises = sampleCommits.map(c => getCommitStats(repoPath, c.hash));
        const statsResults = await Promise.all(statsPromises);
        
        // Calculate metrics
        const analysis = calculateAnalysis(commits, statsResults.map(r => r.data));
        
        return { success: true, data: analysis };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Analysis failed',
        };
    }
}

/**
 * Calculate analysis from commits and stats
 */
function calculateAnalysis(
    commits: CommitInfo[],
    stats: (CommitStats | undefined)[]
): CodeAnalysis {
    // Commit type analysis
    const commitTypes: Record<string, number> = {
        feat: 0,
        fix: 0,
        docs: 0,
        style: 0,
        refactor: 0,
        test: 0,
        chore: 0,
        other: 0,
    };
    
    let goodMessages = 0;
    const commitDays: Record<string, number> = {};
    
    for (const commit of commits) {
        // Parse commit type
        const typeMatch = commit.subject.match(/^(feat|fix|docs|style|refactor|test|chore|perf|build|ci)\b/i);
        if (typeMatch) {
            const type = typeMatch[1].toLowerCase();
            if (commitTypes[type] !== undefined) {
                commitTypes[type]++;
            }
            goodMessages++;
        } else {
            commitTypes['other']++;
        }
        
        // Track commits by day
        const day = new Date(commit.date).toLocaleDateString('en-US', { weekday: 'long' });
        commitDays[day] = (commitDays[day] || 0) + 1;
    }
    
    // Calculate stats averages
    const validStats = stats.filter((s): s is CommitStats => s !== undefined);
    const avgFiles = validStats.length > 0
        ? validStats.reduce((sum, s) => sum + s.filesChanged, 0) / validStats.length
        : 0;
    const avgLines = validStats.length > 0
        ? validStats.reduce((sum, s) => sum + s.insertions + s.deletions, 0) / validStats.length
        : 0;
    
    // Find most active day
    const mostActiveDay = Object.entries(commitDays)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    // Calculate scores
    const messageQuality = Math.round((goodMessages / commits.length) * 100);
    
    // Calculate overall score (weighted average)
    const overallScore = calculateOverallScore(messageQuality, avgFiles, avgLines, commitTypes);
    
    // Generate strengths and improvements
    const { strengths, improvements } = generateInsights(
        messageQuality,
        avgFiles,
        avgLines,
        commitTypes,
        commits.length
    );
    
    // Generate personalized tips
    const personalizedTips = generateTips(messageQuality, avgFiles, avgLines, commitTypes);
    
    return {
        overallScore,
        strengths,
        improvements,
        commitPatterns: {
            averageCommitsPerDay: commits.length / 30, // Assuming 30 days
            mostActiveDay,
            commitTypes,
        },
        codeQuality: {
            avgFilesPerCommit: Math.round(avgFiles * 10) / 10,
            avgLinesChanged: Math.round(avgLines),
            commitMessageQuality: messageQuality,
        },
        personalizedTips,
    };
}

/**
 * Calculate overall score
 */
function calculateOverallScore(
    messageQuality: number,
    avgFiles: number,
    _avgLines: number,
    commitTypes: Record<string, number>
): number {
    // Message quality: 40% weight
    let score = messageQuality * 0.4;
    
    // Commit size: 30% weight (smaller is better, up to 5 files)
    const sizeScore = Math.max(0, 100 - (avgFiles - 5) * 10);
    score += Math.min(100, Math.max(0, sizeScore)) * 0.3;
    
    // Variety in commit types: 20% weight
    const typesUsed = Object.values(commitTypes).filter(v => v > 0).length;
    const varietyScore = Math.min(100, typesUsed * 20);
    score += varietyScore * 0.2;
    
    // Feature vs fix ratio: 10% weight
    const total = commitTypes.feat + commitTypes.fix;
    const featureRatio = total > 0 ? commitTypes.feat / total : 0.5;
    const ratioScore = featureRatio >= 0.4 && featureRatio <= 0.7 ? 100 : 70;
    score += ratioScore * 0.1;
    
    return Math.round(score);
}

/**
 * Generate insights based on metrics
 */
function generateInsights(
    messageQuality: number,
    avgFiles: number,
    avgLines: number,
    commitTypes: Record<string, number>,
    totalCommits: number
): { strengths: string[]; improvements: string[] } {
    const strengths: string[] = [];
    const improvements: string[] = [];
    
    // Message quality insights
    if (messageQuality >= 80) {
        strengths.push('Excellent commit message format - using conventional commits');
    } else if (messageQuality >= 50) {
        improvements.push('Consider using conventional commit format (feat:, fix:, etc.) more consistently');
    } else {
        improvements.push('Start using conventional commits format for better clarity');
    }
    
    // Commit size insights
    if (avgFiles <= 3) {
        strengths.push('Great atomic commits - small, focused changes');
    } else if (avgFiles <= 6) {
        strengths.push('Good commit sizes for code review');
    } else {
        improvements.push('Try to make smaller, more focused commits (< 5 files)');
    }
    
    // Lines changed insights
    if (avgLines <= 100) {
        strengths.push('Manageable changes per commit');
    } else if (avgLines > 300) {
        improvements.push('Consider breaking down large changes into smaller commits');
    }
    
    // Commit variety insights
    if (commitTypes.test > 0) {
        strengths.push('Including test commits shows good testing practices');
    } else {
        improvements.push('Consider adding test: commits for your tests');
    }
    
    if (commitTypes.docs > 0) {
        strengths.push('Documentation commits help maintain project knowledge');
    }
    
    // Activity insights
    if (totalCommits >= 20) {
        strengths.push('Active development with regular commits');
    } else if (totalCommits >= 5) {
        // Normal activity
    } else {
        improvements.push('More frequent commits help track progress');
    }
    
    return { strengths, improvements };
}

/**
 * Generate personalized tips
 */
function generateTips(
    messageQuality: number,
    avgFiles: number,
    avgLines: number,
    commitTypes: Record<string, number>
): string[] {
    const tips: string[] = [];
    
    if (messageQuality < 80) {
        tips.push('Use prefixes like "feat:", "fix:", "docs:" for clearer commit history');
    }
    
    if (avgFiles > 5) {
        tips.push('Smaller commits (< 5 files) are easier to review and revert');
    }
    
    if (commitTypes.refactor === 0) {
        tips.push('Regular refactoring commits help maintain code quality');
    }
    
    if (avgLines > 200) {
        tips.push('Large diffs are hard to review - aim for < 200 lines per commit');
    }
    
    if (commitTypes.other > commitTypes.feat + commitTypes.fix) {
        tips.push('Use conventional commit types for better changelog generation');
    }
    
    // Always add a positive tip
    if (tips.length === 0) {
        tips.push('Your commit practices are excellent! Keep up the great work.');
    }
    
    return tips;
}

/**
 * Get empty analysis for repos with no commits
 */
function getEmptyAnalysis(): CodeAnalysis {
    return {
        overallScore: 0,
        strengths: [],
        improvements: ['Start making commits to see analysis'],
        commitPatterns: {
            averageCommitsPerDay: 0,
            mostActiveDay: 'N/A',
            commitTypes: {},
        },
        codeQuality: {
            avgFilesPerCommit: 0,
            avgLinesChanged: 0,
            commitMessageQuality: 0,
        },
        personalizedTips: ['Make your first commit to get started!'],
    };
}

/**
 * Get AI-powered insights for commits (uses AI provider)
 */
export async function getAIInsights(
    config: AIProviderConfig,
    commits: CommitInfo[],
    analysis: CodeAnalysis
): Promise<{ success: boolean; insights?: string; error?: string }> {
    if (!config.apiKey || config.provider === 'none') {
        return { success: false, error: 'AI not configured' };
    }
    
    const prompt = buildInsightsPrompt(commits, analysis);
    
    try {
        const response = await callAI(config, prompt);
        return { success: true, insights: response };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'AI analysis failed',
        };
    }
}

/**
 * Build prompt for AI insights
 */
function buildInsightsPrompt(commits: CommitInfo[], analysis: CodeAnalysis): string {
    const recentCommits = commits.slice(0, 10).map(c => c.subject).join('\n');
    
    return `Analyze this developer's recent commit activity and provide 3 brief, actionable insights:

Recent Commits:
${recentCommits}

Metrics:
- Commit message quality: ${analysis.codeQuality.commitMessageQuality}%
- Avg files per commit: ${analysis.codeQuality.avgFilesPerCommit}
- Avg lines changed: ${analysis.codeQuality.avgLinesChanged}

Provide 3 concise, personalized tips (one per line, max 15 words each) to improve their development workflow.`;
}

/**
 * Simple AI call wrapper
 */
async function callAI(config: AIProviderConfig, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
        let hostname = '';
        let path = '';
        let body = '';
        
        if (config.provider === 'groq') {
            hostname = 'api.groq.com';
            path = '/openai/v1/chat/completions';
            body = JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.7,
            });
        } else if (config.provider === 'gemini') {
            hostname = 'generativelanguage.googleapis.com';
            path = `/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;
            body = JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 200, temperature: 0.7 },
            });
        } else {
            hostname = 'api.openai.com';
            path = '/v1/chat/completions';
            body = JSON.stringify({
                model: config.model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 200,
                temperature: 0.7,
            });
        }
        
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        
        if (config.provider !== 'gemini') {
            headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
        
        const req = https.request({
            hostname,
            path,
            method: 'POST',
            headers,
        }, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    interface AIResponse {
                        choices?: Array<{ message?: { content?: string } }>;
                        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                    }
                    const json = JSON.parse(data) as AIResponse;
                    const content = json.choices?.[0]?.message?.content ||
                                  json.candidates?.[0]?.content?.parts?.[0]?.text ||
                                  'No insights generated';
                    resolve(content);
                } catch {
                    resolve('Analysis complete');
                }
            });
        });
        
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
