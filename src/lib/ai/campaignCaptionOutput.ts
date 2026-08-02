export type CampaignCaptionGenerationResult = {
    caption: string;
    hashtags: string[];
    shortCaption: string;
};

const cleanText = (value: string, maxLength: number): string => (
    value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
        .trim()
);

export function normalizeCampaignCaptionGenerationResult(
    value: unknown,
): CampaignCaptionGenerationResult | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.caption !== 'string' || typeof record.shortCaption !== 'string') return null;
    if (!Array.isArray(record.hashtags) || record.hashtags.some((hashtag) => typeof hashtag !== 'string')) {
        return null;
    }

    const caption = cleanText(record.caption, 500);
    const shortCaption = cleanText(record.shortCaption, 100);
    const hashtags = Array.from(new Set(
        record.hashtags
            .map((hashtag) => cleanText(hashtag, 80))
            .filter(Boolean),
    )).slice(0, 5);
    if (!caption || !shortCaption) return null;

    return { caption, hashtags, shortCaption };
}
