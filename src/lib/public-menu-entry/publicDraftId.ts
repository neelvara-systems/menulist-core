const PUBLIC_MENU_DRAFT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizePublicMenuDraftId(value: unknown): string | null {
    if (typeof value !== 'string' || value !== value.trim()) return null;
    return PUBLIC_MENU_DRAFT_ID_PATTERN.test(value) ? value : null;
}
