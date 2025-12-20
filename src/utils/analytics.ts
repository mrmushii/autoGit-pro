/**
 * AutoGit Pro - Local Usage Analytics
 * Tracks usage patterns locally to show users their productivity gains
 * All data is stored locally in VS Code globalState - no external telemetry
 */

import * as vscode from 'vscode';

/**
 * Daily stats structure
 */
interface DayStats {
    commits: number;
    pushes: number;
    pulls: number;
    conflictsResolved: number;
    aiMessagesGenerated: number;
}

/**
 * Complete analytics data structure
 */
export interface AnalyticsData {
    totalCommits: number;
    totalPushes: number;
    totalPulls: number;
    totalConflictsResolved: number;
    totalAiMessagesGenerated: number;
    timeSavedMinutes: number;
    firstUsed: string;
    lastUsed: string;
    dailyStats: Record<string, DayStats>;
    streakDays: number;
    longestStreak: number;
}

/**
 * Default analytics data
 */
const DEFAULT_ANALYTICS: AnalyticsData = {
    totalCommits: 0,
    totalPushes: 0,
    totalPulls: 0,
    totalConflictsResolved: 0,
    totalAiMessagesGenerated: 0,
    timeSavedMinutes: 0,
    firstUsed: '',
    lastUsed: '',
    dailyStats: {},
    streakDays: 0,
    longestStreak: 0,
};

/**
 * Time saved estimates (in minutes) per operation
 */
const TIME_SAVED = {
    commit: 0.5,        // 30 seconds saved per AI commit message
    push: 0.25,         // 15 seconds saved for automated push
    pull: 0.25,         // 15 seconds saved for automated pull
    conflictHelp: 2,    // 2 minutes saved with AI conflict help
    aiMessage: 1,       // 1 minute saved per AI-generated message
};

/**
 * Storage key for analytics
 */
const ANALYTICS_STORAGE_KEY = 'autogit-pro.analytics';

/**
 * Analytics Manager class
 */
export class AnalyticsManager {
    private context: vscode.ExtensionContext;
    private data: AnalyticsData;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.data = this.loadAnalytics();
    }

    /**
     * Load analytics from global state
     */
    private loadAnalytics(): AnalyticsData {
        const stored = this.context.globalState.get<AnalyticsData>(ANALYTICS_STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_ANALYTICS, ...stored };
        }
        return { ...DEFAULT_ANALYTICS };
    }

    /**
     * Save analytics to global state
     */
    private async saveAnalytics(): Promise<void> {
        await this.context.globalState.update(ANALYTICS_STORAGE_KEY, this.data);
    }

    /**
     * Get current date string in YYYY-MM-DD format
     */
    private getDateString(): string {
        return new Date().toISOString().split('T')[0];
    }

    /**
     * Get or create today's stats
     */
    private getTodayStats(): DayStats {
        const today = this.getDateString();
        if (!this.data.dailyStats[today]) {
            this.data.dailyStats[today] = {
                commits: 0,
                pushes: 0,
                pulls: 0,
                conflictsResolved: 0,
                aiMessagesGenerated: 0,
            };
        }
        return this.data.dailyStats[today];
    }

    /**
     * Update last used and streak
     */
    private updateActivity(): void {
        const today = this.getDateString();
        const lastUsed = this.data.lastUsed;
        
        if (!this.data.firstUsed) {
            this.data.firstUsed = today;
        }
        
        if (lastUsed !== today) {
            // Check if yesterday was used for streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            if (lastUsed === yesterdayStr) {
                this.data.streakDays++;
                if (this.data.streakDays > this.data.longestStreak) {
                    this.data.longestStreak = this.data.streakDays;
                }
            } else if (lastUsed !== today) {
                this.data.streakDays = 1;
            }
        }
        
        this.data.lastUsed = today;
    }

    /**
     * Track a commit operation
     */
    async trackCommit(): Promise<void> {
        this.updateActivity();
        this.data.totalCommits++;
        this.data.timeSavedMinutes += TIME_SAVED.commit;
        this.getTodayStats().commits++;
        await this.saveAnalytics();
    }

    /**
     * Track a push operation
     */
    async trackPush(): Promise<void> {
        this.updateActivity();
        this.data.totalPushes++;
        this.data.timeSavedMinutes += TIME_SAVED.push;
        this.getTodayStats().pushes++;
        await this.saveAnalytics();
    }

    /**
     * Track a pull operation
     */
    async trackPull(): Promise<void> {
        this.updateActivity();
        this.data.totalPulls++;
        this.data.timeSavedMinutes += TIME_SAVED.pull;
        this.getTodayStats().pulls++;
        await this.saveAnalytics();
    }

    /**
     * Track conflict resolution help
     */
    async trackConflictResolved(): Promise<void> {
        this.updateActivity();
        this.data.totalConflictsResolved++;
        this.data.timeSavedMinutes += TIME_SAVED.conflictHelp;
        this.getTodayStats().conflictsResolved++;
        await this.saveAnalytics();
    }

    /**
     * Track AI message generation
     */
    async trackAiMessage(): Promise<void> {
        this.updateActivity();
        this.data.totalAiMessagesGenerated++;
        this.data.timeSavedMinutes += TIME_SAVED.aiMessage;
        this.getTodayStats().aiMessagesGenerated++;
        await this.saveAnalytics();
    }

    /**
     * Get current analytics data
     */
    getAnalytics(): AnalyticsData {
        return { ...this.data };
    }

    /**
     * Get formatted time saved string
     */
    getTimeSavedString(): string {
        const minutes = Math.round(this.data.timeSavedMinutes);
        if (minutes < 60) {
            return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''}`;
        }
        return `${hours}h ${remainingMinutes}m`;
    }

    /**
     * Get today's stats summary
     */
    getTodaySummary(): string {
        const today = this.getTodayStats();
        const parts: string[] = [];
        
        if (today.commits > 0) {
            parts.push(`${today.commits} commit${today.commits !== 1 ? 's' : ''}`);
        }
        if (today.pushes > 0) {
            parts.push(`${today.pushes} push${today.pushes !== 1 ? 'es' : ''}`);
        }
        if (today.pulls > 0) {
            parts.push(`${today.pulls} pull${today.pulls !== 1 ? 's' : ''}`);
        }
        
        if (parts.length === 0) {
            return 'No activity today yet';
        }
        
        return `Today: ${parts.join(', ')}`;
    }

    /**
     * Show stats quick pick
     */
    async showStats(): Promise<void> {
        const data = this.getAnalytics();
        const timeSaved = this.getTimeSavedString();
        
        const items = [
            {
                label: '$(clock) Time Saved',
                description: timeSaved,
                detail: 'Estimated time saved using AutoGit Pro',
            },
            {
                label: '$(git-commit) Total Commits',
                description: data.totalCommits.toString(),
                detail: 'Commits made with AutoGit Pro',
            },
            {
                label: '$(cloud-upload) Total Pushes',
                description: data.totalPushes.toString(),
                detail: 'Pushes made with AutoGit Pro',
            },
            {
                label: '$(cloud-download) Total Pulls',
                description: data.totalPulls.toString(),
                detail: 'Pulls made with AutoGit Pro',
            },
            {
                label: '$(sparkle) AI Messages Generated',
                description: data.totalAiMessagesGenerated.toString(),
                detail: 'Commit messages generated by AI',
            },
            {
                label: '$(warning) Conflicts Resolved',
                description: data.totalConflictsResolved.toString(),
                detail: 'Conflicts where AI helped with resolution',
            },
            {
                label: '$(flame) Current Streak',
                description: `${data.streakDays} day${data.streakDays !== 1 ? 's' : ''}`,
                detail: `Longest streak: ${data.longestStreak} days`,
            },
            {
                label: '$(calendar) First Used',
                description: data.firstUsed || 'Never',
                detail: 'When you started using AutoGit Pro',
            },
        ];
        
        await vscode.window.showQuickPick(items, {
            title: 'AutoGit Pro - Your Stats',
            placeHolder: 'Your productivity stats',
        });
    }

    /**
     * Reset all analytics (for testing)
     */
    async resetAnalytics(): Promise<void> {
        this.data = { ...DEFAULT_ANALYTICS };
        await this.saveAnalytics();
    }
}

/**
 * Global analytics manager instance
 */
let analyticsManager: AnalyticsManager | undefined;

/**
 * Initialize the analytics manager
 */
export function initAnalyticsManager(context: vscode.ExtensionContext): AnalyticsManager {
    analyticsManager = new AnalyticsManager(context);
    return analyticsManager;
}

/**
 * Get the analytics manager instance
 */
export function getAnalyticsManager(): AnalyticsManager | undefined {
    return analyticsManager;
}

/**
 * Quick helper to track a commit
 */
export async function trackCommit(): Promise<void> {
    await analyticsManager?.trackCommit();
}

/**
 * Quick helper to track a push
 */
export async function trackPush(): Promise<void> {
    await analyticsManager?.trackPush();
}

/**
 * Quick helper to track a pull
 */
export async function trackPull(): Promise<void> {
    await analyticsManager?.trackPull();
}

/**
 * Quick helper to track AI message
 */
export async function trackAiMessage(): Promise<void> {
    await analyticsManager?.trackAiMessage();
}

/**
 * Quick helper to track conflict resolved
 */
export async function trackConflictResolved(): Promise<void> {
    await analyticsManager?.trackConflictResolved();
}

/**
 * Get time saved estimate string
 */
export function getTimeSavedEstimate(): string {
    return analyticsManager?.getTimeSavedString() || '0 minutes';
}
