/**
 * AutoGit Pro - AI Commit Message Generator
 * Supports OpenAI and Google Gemini for generating commit messages
 */

import * as https from 'https';
import type { AIProviderConfig, AICommitResult, GitDiffContext } from '../types';

/**
 * System prompt for generating commit messages following industry standards
 */
const SYSTEM_PROMPT = `Generate a short, concise git commit message (ONE LINE ONLY, max 72 chars).

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

/**
 * AI Provider interface for extensibility
 */
interface AIProvider {
    generateCommitMessage(context: GitDiffContext): Promise<AICommitResult>;
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

    async generateCommitMessage(context: GitDiffContext): Promise<AICommitResult> {
        try {
            const userPrompt = buildUserPrompt(context);
            
            const requestBody = JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 500,
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

    async generateCommitMessage(context: GitDiffContext): Promise<AICommitResult> {
        try {
            const userPrompt = buildUserPrompt(context);
            const fullPrompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`;
            
            const requestBody = JSON.stringify({
                contents: [
                    {
                        parts: [{ text: fullPrompt }],
                    },
                ],
                generationConfig: {
                    maxOutputTokens: 500,
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

    async generateCommitMessage(context: GitDiffContext): Promise<AICommitResult> {
        try {
            const userPrompt = buildUserPrompt(context);
            
            const requestBody = JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userPrompt },
                ],
                max_tokens: 500,
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
    context: GitDiffContext
): Promise<AICommitResult> {
    const provider = createAIProvider(config);
    
    if (!provider) {
        return {
            success: false,
            error: 'AI provider not configured. Please set up an API key in settings.',
        };
    }
    
    return provider.generateCommitMessage(context);
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
