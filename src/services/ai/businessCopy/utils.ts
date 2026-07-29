import { getAllSemanticAttributes } from '@lib/infrastructure/semantics/attributeRegistry';

export function firstText(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';

    let keys: string[];
    try {
        keys = Object.keys(value).slice(0, 64);
    } catch {
        return '';
    }

    for (const key of keys) {
        try {
            const entry = Reflect.get(value, key);
            if (typeof entry === 'string' && entry.trim()) return entry.trim();
        } catch {
            // A malformed localized field must not hide later valid translations.
        }
    }

    return '';
}

export function getActiveBusinessAttributeLabels(attributes?: Record<string, boolean>): string[] {
    if (!attributes) return [];

    return getAllSemanticAttributes()
        .filter((attribute) => attribute.storeField && attributes[attribute.storeField] === true)
        .map((attribute) => attribute.label)
        .slice(0, 12);
}
