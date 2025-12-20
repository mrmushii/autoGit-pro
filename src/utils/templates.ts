/**
 * AutoGit Pro - Commit Templates Manager
 * Allows users to create, save, and reuse commit message templates
 */

import * as vscode from 'vscode';

/**
 * Commit template structure
 */
export interface CommitTemplate {
    name: string;
    template: string;
    description?: string;
    isDefault?: boolean;
}

/**
 * Template variable placeholders that can be used in templates
 */
export const TEMPLATE_VARIABLES = {
    '{type}': 'Commit type (feat, fix, docs, etc.)',
    '{scope}': 'Affected module or component',
    '{subject}': 'Short description of the change',
    '{body}': 'Detailed explanation (optional)',
    '{breaking}': 'Breaking change note (optional)',
    '{issues}': 'Related issue numbers (optional)',
};

/**
 * Default templates provided out of the box
 */
export const DEFAULT_TEMPLATES: CommitTemplate[] = [
    {
        name: 'Feature',
        template: 'feat({scope}): {subject}',
        description: 'A new feature',
        isDefault: true,
    },
    {
        name: 'Bug Fix',
        template: 'fix({scope}): {subject}',
        description: 'A bug fix',
        isDefault: true,
    },
    {
        name: 'Documentation',
        template: 'docs({scope}): {subject}',
        description: 'Documentation changes',
        isDefault: true,
    },
    {
        name: 'Refactor',
        template: 'refactor({scope}): {subject}',
        description: 'Code refactoring',
        isDefault: true,
    },
    {
        name: 'Chore',
        template: 'chore({scope}): {subject}',
        description: 'Maintenance tasks',
        isDefault: true,
    },
    {
        name: 'Feature (Detailed)',
        template: 'feat({scope}): {subject}\n\n- {body}\n- Closes #{issues}',
        description: 'Feature with detailed body',
        isDefault: true,
    },
    {
        name: 'Breaking Change',
        template: 'feat({scope})!: {subject}\n\nBREAKING CHANGE: {breaking}',
        description: 'Feature with breaking change',
        isDefault: true,
    },
];

/**
 * Template storage key in VS Code global state
 */
const TEMPLATES_STORAGE_KEY = 'autogit-pro.customTemplates';

/**
 * Templates Manager class
 */
export class TemplatesManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Get all templates (default + custom)
     */
    getAllTemplates(): CommitTemplate[] {
        const customTemplates = this.getCustomTemplates();
        return [...DEFAULT_TEMPLATES, ...customTemplates];
    }

    /**
     * Get only custom templates
     */
    getCustomTemplates(): CommitTemplate[] {
        return this.context.globalState.get<CommitTemplate[]>(TEMPLATES_STORAGE_KEY, []);
    }

    /**
     * Save a new custom template
     */
    async saveTemplate(template: CommitTemplate): Promise<void> {
        const templates = this.getCustomTemplates();
        
        // Check if template with same name exists
        const existingIndex = templates.findIndex(t => t.name === template.name);
        if (existingIndex >= 0) {
            templates[existingIndex] = template;
        } else {
            templates.push(template);
        }
        
        await this.context.globalState.update(TEMPLATES_STORAGE_KEY, templates);
    }

    /**
     * Delete a custom template
     */
    async deleteTemplate(name: string): Promise<boolean> {
        const templates = this.getCustomTemplates();
        const filteredTemplates = templates.filter(t => t.name !== name);
        
        if (filteredTemplates.length === templates.length) {
            return false; // Template not found
        }
        
        await this.context.globalState.update(TEMPLATES_STORAGE_KEY, filteredTemplates);
        return true;
    }

    /**
     * Get a template by name
     */
    getTemplate(name: string): CommitTemplate | undefined {
        return this.getAllTemplates().find(t => t.name === name);
    }

    /**
     * Apply variables to a template
     */
    applyTemplate(template: string, values: Record<string, string>): string {
        let result = template;
        
        for (const [placeholder, value] of Object.entries(values)) {
            const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
            result = result.replace(regex, value);
        }
        
        // Remove unfilled optional placeholders
        result = result.replace(/\{[^}]+\}/g, '');
        
        // Clean up empty lines and trailing spaces
        result = result.split('\n')
            .map(line => line.trimEnd())
            .join('\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
        
        return result;
    }

    /**
     * Show quick pick to select a template
     */
    async selectTemplate(): Promise<CommitTemplate | undefined> {
        const templates = this.getAllTemplates();
        
        const items = templates.map(t => ({
            label: t.isDefault ? `$(bookmark) ${t.name}` : `$(file) ${t.name}`,
            description: t.description || '',
            detail: t.template.replace(/\n/g, ' ↵ '),
            template: t,
        }));
        
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a commit template',
            matchOnDescription: true,
            matchOnDetail: true,
        });
        
        return selected?.template;
    }

    /**
     * Create a new template interactively
     */
    async createTemplateInteractively(): Promise<CommitTemplate | undefined> {
        // Get template name
        const name = await vscode.window.showInputBox({
            prompt: 'Template name',
            placeHolder: 'e.g., My Feature Template',
            validateInput: (value) => {
                if (!value.trim()) {
                    return 'Name is required';
                }
                const existing = this.getTemplate(value);
                if (existing && !existing.isDefault) {
                    return 'A template with this name already exists';
                }
                return undefined;
            },
        });
        
        if (!name) {
            return undefined;
        }
        
        // Get template content
        const template = await vscode.window.showInputBox({
            prompt: 'Template format (use {type}, {scope}, {subject}, {body})',
            placeHolder: 'e.g., feat({scope}): {subject}',
            value: 'feat({scope}): {subject}',
        });
        
        if (!template) {
            return undefined;
        }
        
        // Get description
        const description = await vscode.window.showInputBox({
            prompt: 'Description (optional)',
            placeHolder: 'e.g., My custom feature template',
        });
        
        const newTemplate: CommitTemplate = {
            name: name.trim(),
            template: template,
            description: description || undefined,
            isDefault: false,
        };
        
        await this.saveTemplate(newTemplate);
        void vscode.window.showInformationMessage(`Template "${name}" saved!`);
        
        return newTemplate;
    }

    /**
     * Manage templates (view, create, delete)
     */
    async manageTemplates(): Promise<void> {
        const actions = [
            { label: '$(add) Create New Template', action: 'create' },
            { label: '$(list-unordered) View All Templates', action: 'view' },
            { label: '$(trash) Delete Custom Template', action: 'delete' },
        ];
        
        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Manage commit templates',
        });
        
        if (!selected) {
            return;
        }
        
        switch (selected.action) {
            case 'create':
                await this.createTemplateInteractively();
                break;
            
            case 'view': {
                const template = await this.selectTemplate();
                if (template) {
                    const action = await vscode.window.showInformationMessage(
                        `Template: ${template.name}`,
                        { modal: true, detail: `Format: ${template.template}` },
                        'Copy to Clipboard',
                        'Close'
                    );
                    if (action === 'Copy to Clipboard') {
                        await vscode.env.clipboard.writeText(template.template);
                        void vscode.window.showInformationMessage('Template copied!');
                    }
                }
                break;
            }
            
            case 'delete': {
                const customTemplates = this.getCustomTemplates();
                if (customTemplates.length === 0) {
                    void vscode.window.showInformationMessage('No custom templates to delete.');
                    return;
                }
                
                const items = customTemplates.map(t => ({
                    label: t.name,
                    description: t.description || '',
                }));
                
                const toDelete = await vscode.window.showQuickPick(items, {
                    placeHolder: 'Select template to delete',
                });
                
                if (toDelete) {
                    const confirm = await vscode.window.showWarningMessage(
                        `Delete template "${toDelete.label}"?`,
                        { modal: true },
                        'Delete'
                    );
                    
                    if (confirm === 'Delete') {
                        await this.deleteTemplate(toDelete.label);
                        void vscode.window.showInformationMessage(`Template "${toDelete.label}" deleted.`);
                    }
                }
                break;
            }
        }
    }
}

/**
 * Global templates manager instance
 */
let templatesManager: TemplatesManager | undefined;

/**
 * Initialize the templates manager
 */
export function initTemplatesManager(context: vscode.ExtensionContext): TemplatesManager {
    templatesManager = new TemplatesManager(context);
    return templatesManager;
}

/**
 * Get the templates manager instance
 */
export function getTemplatesManager(): TemplatesManager | undefined {
    return templatesManager;
}
