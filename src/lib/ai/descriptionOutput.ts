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

/**
 * Keep project item IDs out of the provider prompt. Imported IDs can contain
 * characters or lengths that the prompt sanitizer intentionally changes, so
 * stable provider-only aliases prevent valid responses from losing their key.
 */
export function createDescriptionProviderItemAliases<T extends { id?: string }>(
    items: readonly T[],
): {
    aliasedItems: Array<T & { id: string }>;
    originalItemIdsByAlias: Readonly<Record<string, string>>;
} {
    const aliases = items.map((item, index) => {
        const alias = `item_${index + 1}`;
        return {
            alias,
            item: { ...item, id: alias } as T & { id: string },
            originalItemId: String(item.id || ''),
        };
    });

    return {
        aliasedItems: aliases.map(({ item }) => item),
        originalItemIdsByAlias: Object.fromEntries(
            aliases.map(({ alias, originalItemId }) => [alias, originalItemId]),
        ),
    };
}

export function restoreDescriptionProviderItemIds(
    value: DescriptionGenerationResult,
    originalItemIdsByAlias: Readonly<Record<string, string>>,
): DescriptionGenerationResult {
    return Object.fromEntries(
        Object.entries(value).flatMap(([alias, descriptions]) => {
            const originalItemId = originalItemIdsByAlias[alias];
            return originalItemId
                ? [[originalItemId, descriptions] as const]
                : [];
        }),
    );
}

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
        if (!Object.prototype.hasOwnProperty.call(record, itemId)) continue;
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
        if (Object.keys(descriptions).length > 0) {
            Object.defineProperty(normalized, itemId, {
                configurable: true,
                enumerable: true,
                value: descriptions,
                writable: true,
            });
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : null;
}

/**
 * A description request is atomic from the owner's point of view. Do not
 * accept a provider response that silently omits an item or language because
 * the client would otherwise save a partial menu while reporting success.
 */
export function isCompleteDescriptionGenerationResult(
    value: DescriptionGenerationResult | null,
    requestedItemIds: readonly string[],
    targetLanguageCodes: readonly string[],
): value is DescriptionGenerationResult {
    if (!value) return false;

    const uniqueItemIds = Array.from(new Set(requestedItemIds));
    const uniqueLanguageCodes = Array.from(new Set(targetLanguageCodes));
    if (uniqueItemIds.length === 0 || uniqueLanguageCodes.length === 0) return false;

    return uniqueItemIds.every((itemId) => (
        uniqueLanguageCodes.every((languageCode) => (
            typeof value[itemId]?.[languageCode] === 'string'
            && value[itemId][languageCode].trim().length > 0
        ))
    ));
}
