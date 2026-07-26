export type SeoGenerationResult = {
    keywords: string[];
    metaDescription: string;
    metaTitle: string;
    tagline: string;
};

const TEXT_LIMITS = {
    metaDescription: 160,
    metaTitle: 60,
    tagline: 100,
} as const;

const REQUIRED_TEXT_FIELDS = Object.keys(TEXT_LIMITS) as Array<keyof typeof TEXT_LIMITS>;

const cleanText = (value: string, maxLength: number): string => (
    value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
        .trim()
);

export function normalizeSeoGenerationResult(
    value: unknown,
): SeoGenerationResult | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;

    if (REQUIRED_TEXT_FIELDS.some((field) => typeof record[field] !== 'string')) return null;
    if (!Array.isArray(record.keywords) || record.keywords.length === 0) return null;
    if (record.keywords.some((keyword) => typeof keyword !== 'string')) return null;

    const keywords = Array.from(new Set(
        record.keywords
            .map((keyword) => cleanText(keyword, 80))
            .filter(Boolean),
    )).slice(0, 10);
    if (keywords.length === 0) return null;

    const normalized = Object.fromEntries(
        REQUIRED_TEXT_FIELDS.map((field) => [field, cleanText(record[field] as string, TEXT_LIMITS[field])]),
    ) as Omit<SeoGenerationResult, 'keywords'>;

    if (!normalized.metaDescription || !normalized.metaTitle || !normalized.tagline) return null;
    return { ...normalized, keywords };
}
