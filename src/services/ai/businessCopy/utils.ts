import { getAllSemanticAttributes } from '@lib/infrastructure/semantics/attributeRegistry';

export function firstText(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (value && typeof value === 'object') {
        const firstValue = Object.values(value as Record<string, unknown>).find((entry) => typeof entry === 'string' && entry.trim());
        return typeof firstValue === 'string' ? firstValue.trim() : '';
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
