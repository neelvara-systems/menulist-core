import { AI_ACTIONS_TYPES } from '@constant/common';

export type DescriptionGenerationResult = Record<string, Record<string, string>>;

type DescriptionAction =
    | typeof AI_ACTIONS_TYPES.ADD_DESCRIPTION
    | typeof AI_ACTIONS_TYPES.REWRITE_DESCRIPTION;

const cleanDescription = (value: string): string => (
    value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 2000)
        .trim()
);

export function resolveDescriptionBillingAction(
    requestedAction: DescriptionAction,
    items: ReadonlyArray<{ description?: unknown }>,
): DescriptionAction {
    if (requestedAction === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION) {
        return requestedAction;
    }
    return items.some((item) => typeof item.description === 'string' && item.description.trim().length > 0)
        ? AI_ACTIONS_TYPES.REWRITE_DESCRIPTION
        : AI_ACTIONS_TYPES.ADD_DESCRIPTION;
}

export function normalizeDescriptionGenerationResult(
    value: unknown,
    requestedItemIds: readonly string[],
    targetLanguageCodes: readonly string[],
): DescriptionGenerationResult | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const uniqueItemIds = Array.from(new Set(requestedItemIds));
    const uniqueLanguageCodes = Array.from(new Set(targetLanguageCodes));
    const normalized: DescriptionGenerationResult = {};

    for (const itemId of uniqueItemIds) {
        const bucket = record[itemId];
        if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) continue;
        const languageRecord = bucket as Record<string, unknown>;
        const descriptions = Object.fromEntries(
            uniqueLanguageCodes.flatMap((languageCode) => {
                const candidate = languageRecord[languageCode];
                if (typeof candidate !== 'string') return [];
                const cleaned = cleanDescription(candidate);
                return cleaned ? [[languageCode, cleaned] as const] : [];
            }),
        );
        if (Object.keys(descriptions).length > 0) normalized[itemId] = descriptions;
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
}
