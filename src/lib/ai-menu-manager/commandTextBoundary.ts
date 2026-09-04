export const AI_MENU_MANAGER_COMMAND_TEXT_MAX_LENGTH = 1000;

export type AiMenuManagerCommandTextIssue = 'missing' | 'too_long' | null;

export function getAiMenuManagerCommandTextIssue(value: string): AiMenuManagerCommandTextIssue {
    const normalized = value.trim();
    if (!normalized) return 'missing';
    if (normalized.length > AI_MENU_MANAGER_COMMAND_TEXT_MAX_LENGTH) return 'too_long';
    return null;
}

export function getAiMenuManagerCommandTextError(value: string): string | null {
    return getAiMenuManagerCommandTextIssue(value) === 'too_long'
        ? `Menu Manager messages can be up to ${AI_MENU_MANAGER_COMMAND_TEXT_MAX_LENGTH.toLocaleString('en-IN')} characters, including selected context.`
        : null;
}
