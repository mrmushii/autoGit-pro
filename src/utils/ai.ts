/**
 * AutoGit Pro - AI Commit Message Generator
 * Supports OpenAI, Google Gemini, and Groq for generating commit messages
 */

import * as https from 'https';
import type { AIProviderConfig, AICommitResult, GitDiffContext, CommitStyle } from '../types';

/**
 * System prompts for different commit message styles
 */

// BASIC: Short one-line messages (max 72 chars)
const BASIC_PROMPT = `Generate a short, concise git commit message (ONE LINE ONLY, max 72 chars).

Format: <type>: <short description>

Types: feat, fix, docs, style, refactor, test, chore

Rules:
- Use imperative mood (Add, Fix, Update - not Added, Fixed, Updated)
- NO period at end
- Be specific but brief
- ONE LINE ONLY - no body, no bullet points

Examples:
- feat: add user authentication
- fix: resolve null pointer in login
- refactor: simplify error handling
- chore: update dependencies

Output ONLY the commit message, nothing else.`;

// CONVENTIONAL: With type and optional scope
const CONVENTIONAL_PROMPT = `Generate a Conventional Commits format message (ONE LINE, max 72 chars).

Format: <type>(<scope>): <subject>

Types:
- feat: new feature
- fix: bug fix
- docs: documentation changes
- style: formatting, no code change
- refactor: code restructuring
- perf: performance improvement
- test: adding tests
- build: build system changes
- ci: CI configuration
- chore: maintenance tasks

Scope: optional, the module/component affected (e.g., auth, api, ui)

Rules:
- Use imperative mood (add, fix, update - not added, fixed, updated)
- Subject max 50 chars, lowercase
- NO period at end
- ONE LINE ONLY

Examples:
- feat(auth): add JWT token refresh
- fix(ui): resolve button alignment on mobile
- refactor(api): simplify error handling logic
- docs(readme): update installation instructions

Output ONLY the commit message, nothing else.`;

// DETAILED: Multi-line with subject and body
const DETAILED_PROMPT = `Generate a detailed git commit message with subject line and body.

Format:
<type>(<scope>): <subject>

- <bullet point 1: what changed>
- <bullet point 2: why it changed>
- <bullet point 3: any additional context> (optional)

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore

Rules:
- Subject line: max 50 chars, imperative mood, no period
- Blank line between subject and body
- Body: 2-4 bullet points explaining WHAT and WHY
- Each bullet starts with "- "
- Be specific and helpful for future readers

Example:
feat(auth): add password reset functionality

- Add forgot password form with email validation
- Implement reset token generation and verification
- Send reset email using configured SMTP provider

Output the complete commit message with subject and body.`;

/**
 * Get the appropriate system prompt based on commit style
 */
export function getSystemPrompt(style: CommitStyle, includeScope: boolean = true): string {
    switch (style) {
        case 'basic':
            return BASIC_PROMPT;
        case 'conventional':
            if (!includeScope) {
                // Return modified prompt without scope
                return CONVENTIONAL_PROMPT.replace(/\(<scope>\)/g, '').replace(/\(e\.g\., auth, api, ui\)/g, '');
            }
            return CONVENTIONAL_PROMPT;
        case 'detailed':
            return DETAILED_PROMPT;
        default:
            return CONVENTIONAL_PROMPT;
    }
}

/**
 * AI Provider interface for extensibility
 */
interface AIProvider {
    generateCommitMessage(context: GitDiffContext, style?: CommitStyle, includeScope?: boolean): Promise<AICommitResult>;
}

/**
 * Make an HTTPS POST request
 */
function httpsPost(
    hostname: string,
    path: string,
    headers: Record<string, string>,
    body: string
): Promise<string> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname,
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                ...headers,
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data);
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

/**
 * Build the user prompt from git context
 */
function buildUserPrompt(context: GitDiffContext): string {
    const parts: string[] = [];
    
    parts.push(`Branch: ${context.branch}`);
    parts.push(`Files changed: ${context.filesChanged}`);
    
    if (context.status.staged.length > 0) {
        parts.push(`\nStaged files:\n${context.status.staged.map(f => `  - ${f}`).join('\n')}`);
    }
    
    if (context.status.unstaged.length > 0) {
        parts.push(`\nModified files:\n${context.status.unstaged.map(f => `  - ${f}`).join('\n')}`);
    }
    
    if (context.status.untracked.length > 0) {
        parts.push(`\nNew files:\n${context.status.untracked.map(f => `  - ${f}`).join('\n')}`);
    }
    
    if (context.diff) {
        // Truncate diff if too long (keep under 8000 chars for API limits)
        const maxDiffLength = 8000;
        const diffPreview = context.diff.length > maxDiffLength
            ? context.diff.substring(0, maxDiffLength) + '\n... (diff truncated)'
            : context.diff;
        parts.push(`\nDiff:\n\`\`\`\n${diffPreview}\n\`\`\``);
    }
    
    return parts.join('\n');
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIProvider implements AIProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gpt-4o-mini') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(context: GitDiffContext, style: CommitStyle = 'conventional', includeScope: boolean = true): Promise<AICommitResult> {
        try {
            const userPrompt = buildUserPrompt(context);
            const systemPrompt = getSystemPrompt(style, includeScope);
            
            const requestBody = JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: style === 'detailed' ? 800 : 500,
                temperature: 0.3,
            });

            const response = await httpsPost(
                'api.openai.com',
                '/v1/chat/completions',
                { 'Authorization': `Bearer ${this.apiKey}` },
                requestBody
            );

            const data = JSON.parse(response) as {
                choices?: Array<{ message?: { content?: string } }>;
                error?: { message?: string };
            };
            
            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'OpenAI API error',
                };
            }

            const message = data.choices?.[0]?.message?.content?.trim();
            
            if (!message) {
                return {
                    success: false,
                    error: 'No commit message generated',
                };
            }

            return { success: true, message };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

/**
 * Google Gemini Provider Implementation
 */
class GeminiProvider implements AIProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gemini-2.0-flash-001') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(context: GitDiffContext, style: CommitStyle = 'conventional', includeScope: boolean = true): Promise<AICommitResult> {
        try {
            const userPrompt = buildUserPrompt(context);
            const systemPrompt = getSystemPrompt(style, includeScope);
            const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
            
            const requestBody = JSON.stringify({
                contents: [
                    {
                        parts: [{ text: fullPrompt }],
                    },
                ],
                generationConfig: {
                    maxOutputTokens: style === 'detailed' ? 800 : 500,
                    temperature: 0.3,
                },
            });

            const response = await httpsPost(
                'generativelanguage.googleapis.com',
                `/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
                {},
                requestBody
            );

            const data = JSON.parse(response) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                error?: { message?: string };
            };
            
            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'Gemini API error',
                };
            }

            const message = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            
            if (!message) {
                return {
                    success: false,
                    error: 'No commit message generated',
                };
            }

            return { success: true, message };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

/**
 * Groq Provider Implementation (OpenAI-compatible API)
 */
class GroqProvider implements AIProvider {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'llama-3.1-8b-instant') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async generateCommitMessage(context: GitDiffContext, style: CommitStyle = 'conventional', includeScope: boolean = true): Promise<AICommitResult> {
        try {
            const userPrompt = buildUserPrompt(context);
            const systemPrompt = getSystemPrompt(style, includeScope);
            
            const requestBody = JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: style === 'detailed' ? 800 : 500,
                temperature: 0.3,
            });

            const response = await httpsPost(
                'api.groq.com',
                '/openai/v1/chat/completions',
                { 'Authorization': `Bearer ${this.apiKey}` },
                requestBody
            );

            const data = JSON.parse(response) as {
                choices?: Array<{ message?: { content?: string } }>;
                error?: { message?: string };
            };
            
            if (data.error) {
                return {
                    success: false,
                    error: data.error.message || 'Groq API error',
                };
            }

            const message = data.choices?.[0]?.message?.content?.trim();
            
            if (!message) {
                return {
                    success: false,
                    error: 'No commit message generated',
                };
            }

            return { success: true, message };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}

/**
 * Create an AI provider based on configuration
 */
export function createAIProvider(config: AIProviderConfig): AIProvider | null {
    switch (config.provider) {
        case 'openai':
            if (!config.apiKey) {
                return null;
            }
            return new OpenAIProvider(config.apiKey, config.model);
        
        case 'gemini':
            if (!config.apiKey) {
                return null;
            }
            return new GeminiProvider(config.apiKey, config.model);
        
        case 'groq':
            if (!config.apiKey) {
                return null;
            }
            return new GroqProvider(config.apiKey, config.model);
        
        case 'none':
        default:
            return null;
    }
}

/**
 * Generate a commit message using the configured AI provider
 */
export async function generateCommitMessage(
    config: AIProviderConfig,
    context: GitDiffContext,
    style: CommitStyle = 'conventional',
    includeScope: boolean = true
): Promise<AICommitResult> {
    const provider = createAIProvider(config);
    
    if (!provider) {
        return {
            success: false,
            error: 'AI provider not configured. Please set up an API key in settings.',
        };
    }
    
    return provider.generateCommitMessage(context, style, includeScope);
}

/**
 * Validate AI provider configuration
 */
export function validateAIConfig(config: AIProviderConfig): { valid: boolean; error?: string } {
    if (config.provider === 'none') {
        return { valid: true };
    }
    
    if (!config.apiKey) {
        return {
            valid: false,
            error: `${config.provider === 'openai' ? 'OpenAI' : 'Gemini'} API key is not configured`,
        };
    }
    
    return { valid: true };
}

/**
 * Result of AI error analysis
 */
export interface AIErrorAnalysis {
    success: boolean;
    explanation?: string;
    suggestions?: string[];
    error?: string;
}

/**
 * System prompt for analyzing Git errors
 */
const ERROR_ANALYSIS_PROMPT = `You are a Git expert helping a developer understand and fix Git errors.

Analyze the Git error and provide:
1. A simple, plain-language explanation of what went wrong (2-3 sentences max)
2. Specific steps to fix the issue (numbered list, max 5 steps)

Rules:
- Be concise and developer-friendly
- Focus on practical solutions
- If it's a merge conflict, explain which files conflict and suggest resolution strategies
- If it's a rebase issue, explain the state and how to continue or abort
- Use simple language, avoid jargon

Format your response EXACTLY like this:
EXPLANATION: [your explanation here]

STEPS:
1. [first step]
2. [second step]
...

Do not include any other text.`;

/**
 * Analyze a Git error using AI
 */
export async function analyzeGitError(
    config: AIProviderConfig,
    errorMessage: string,
    context?: { branch?: string; remote?: string; operation?: string }
): Promise<AIErrorAnalysis> {
    // Check if AI is configured
    if (config.provider === 'none' || !config.apiKey) {
        return {
            success: false,
            error: 'AI not configured',
        };
    }

    try {
        // Build the user prompt with context
        const contextParts: string[] = [];
        if (context?.operation) {
            contextParts.push(`Operation: git ${context.operation}`);
        }
        if (context?.branch) {
            contextParts.push(`Branch: ${context.branch}`);
        }
        if (context?.remote) {
            contextParts.push(`Remote: ${context.remote}`);
        }
        
        const userPrompt = `${contextParts.length > 0 ? contextParts.join('\n') + '\n\n' : ''}Git Error:\n${errorMessage}`;

        let response: string;

        // Use the appropriate API based on provider
        if (config.provider === 'groq') {
            const requestBody = JSON.stringify({
                model: config.model || 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: ERROR_ANALYSIS_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 800,
                temperature: 0.3,
            });

            response = await httpsPost(
                'api.groq.com',
                '/openai/v1/chat/completions',
                { 'Authorization': `Bearer ${config.apiKey}` },
                requestBody
            );
        } else if (config.provider === 'openai') {
            const requestBody = JSON.stringify({
                model: config.model || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: ERROR_ANALYSIS_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 800,
                temperature: 0.3,
            });

            response = await httpsPost(
                'api.openai.com',
                '/v1/chat/completions',
                { 'Authorization': `Bearer ${config.apiKey}` },
                requestBody
            );
        } else if (config.provider === 'gemini') {
            const fullPrompt = `${ERROR_ANALYSIS_PROMPT}\n\n${userPrompt}`;
            const requestBody = JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: {
                    maxOutputTokens: 800,
                    temperature: 0.3,
                },
            });

            response = await httpsPost(
                'generativelanguage.googleapis.com',
                `/v1beta/models/${config.model || 'gemini-2.0-flash-001'}:generateContent?key=${config.apiKey}`,
                {},
                requestBody
            );
        } else {
            return { success: false, error: 'Unknown AI provider' };
        }

        // Parse the response based on provider
        let content: string | undefined;
        
        if (config.provider === 'gemini') {
            const data = JSON.parse(response) as {
                candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            content = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        } else {
            const data = JSON.parse(response) as {
                choices?: Array<{ message?: { content?: string } }>;
            };
            content = data.choices?.[0]?.message?.content?.trim();
        }

        if (!content) {
            return { success: false, error: 'No analysis generated' };
        }

        // Parse the structured response
        const explanationMatch = content.match(/EXPLANATION:\s*(.+?)(?=\n\nSTEPS:|$)/s);
        const stepsMatch = content.match(/STEPS:\s*([\s\S]+)$/);

        const explanation = explanationMatch?.[1]?.trim() || content;
        const stepsText = stepsMatch?.[1]?.trim() || '';
        
        const suggestions = stepsText
            .split('\n')
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .filter(line => line.length > 0);

        return {
            success: true,
            explanation,
            suggestions: suggestions.length > 0 ? suggestions : undefined,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'AI analysis failed',
        };
    }
}
