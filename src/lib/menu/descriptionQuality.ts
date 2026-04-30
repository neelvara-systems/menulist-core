const MIN_DESCRIPTION_QUALITY_CHARS = 8;
const DESCRIPTION_NOISE_CHARS = new Set([
    ' ', '.', ',', '!', '?', ':', ';', '-', '_', '/', '\\', '\'', '"', '(', ')', '[', ']', '{', '}', '&',
]);

export function normalizeDescriptionQualityText(value: unknown): string {
    if (typeof value !== 'string') return '';

    return Array.from(value.trim())
        .filter((char) => !DESCRIPTION_NOISE_CHARS.has(char))
        .join('');
}

export function hasMeaningfulDescription(value: unknown): boolean {
    return normalizeDescriptionQualityText(value).length >= MIN_DESCRIPTION_QUALITY_CHARS;
}

export function hasMeaningfulDescriptionsForLanguages(
    descriptions: unknown,
    languageCodes: string[]
): boolean {
    if (!descriptions || typeof descriptions !== 'object') return false;

    return languageCodes.every((languageCode) => (
        hasMeaningfulDescription((descriptions as Record<string, unknown>)[languageCode])
    ));
}

