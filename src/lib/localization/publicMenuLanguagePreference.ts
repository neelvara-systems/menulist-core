const PUBLIC_MENU_LANGUAGE_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;

export function getPublicMenuLanguageStorageKey(projectId: unknown): string | null {
    if (
        typeof projectId !== 'string'
        || !PUBLIC_MENU_LANGUAGE_PROJECT_ID_PATTERN.test(projectId)
    ) {
        return null;
    }
    return `menulist_preferred_language_${projectId}`;
}
