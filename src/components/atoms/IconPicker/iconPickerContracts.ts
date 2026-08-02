export interface EmojiSearchResult {
    id: string;
    name: string;
    native: string;
}

const safeRead = (value: object, key: string): unknown => {
    try {
        return Reflect.get(value, key);
    } catch {
        return undefined;
    }
};

export function normalizeLucideIconName(
    value: unknown,
    availableIconNames: ReadonlySet<string>,
): string | null {
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    const iconName = trimmed.startsWith('lu:') ? trimmed.slice(3) : trimmed;
    return availableIconNames.has(iconName) ? iconName : null;
}

export function normalizeSuggestedLucideIcons(
    values: readonly unknown[],
    availableIconNames: ReadonlySet<string>,
): string[] {
    const normalized = values
        .map((value) => normalizeLucideIconName(value, availableIconNames))
        .filter((value): value is string => value !== null);

    return Array.from(new Set(normalized));
}

export function normalizeEmojiSearchResult(value: unknown): EmojiSearchResult | null {
    if (!value || typeof value !== 'object') return null;

    const id = safeRead(value, 'id');
    const name = safeRead(value, 'name');
    const skins = safeRead(value, 'skins');
    if (!Array.isArray(skins) || !skins[0] || typeof skins[0] !== 'object') return null;

    const native = safeRead(skins[0], 'native');
    if (typeof native !== 'string' || native.length === 0) return null;

    return {
        id: typeof id === 'string' && id.length > 0 ? id : native,
        name: typeof name === 'string' && name.length > 0 ? name : native,
        native,
    };
}
