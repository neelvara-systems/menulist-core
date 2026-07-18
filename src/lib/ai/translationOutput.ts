import { AI_ACTIONS_TYPES } from '@constant/common';

export type TranslationBillingAction =
    | typeof AI_ACTIONS_TYPES.IMAGE_TRANSLATION
    | typeof AI_ACTIONS_TYPES.ITEM_TRANSLATION
    | typeof AI_ACTIONS_TYPES.LANGUAGE_ADDITION;

const TRANSLATION_TEXT_MAX_LENGTH = 2000;

const hasOwn = (value: object, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(value, key);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export type TranslationCoverageSummary = {
    fallbackKeyCount: number;
    hasPartialCoverage: boolean;
    translatedKeyCount: number;
    translationCoverageCount: number;
};

export type TranslationCoverageExpectations = {
    inputKeyCount: number;
    targetLanguageCount: number;
};

const isNonNegativeSafeInteger = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
);

export function normalizeTranslationCoverageSummary(
    value: unknown,
    expectations?: TranslationCoverageExpectations,
): TranslationCoverageSummary | null {
    if (!isRecord(value) || typeof value.hasPartialCoverage !== 'boolean') return null;
    if (
        !isNonNegativeSafeInteger(value.fallbackKeyCount)
        || !isNonNegativeSafeInteger(value.translatedKeyCount)
        || !isNonNegativeSafeInteger(value.translationCoverageCount)
        || value.translationCoverageCount === 0
        || value.hasPartialCoverage !== (value.fallbackKeyCount > 0)
    ) {
        return null;
    }

    if (expectations) {
        const { inputKeyCount, targetLanguageCount } = expectations;
        const expectedTranslatedValueCount = inputKeyCount * targetLanguageCount;
        const actualTranslatedValueCount = value.fallbackKeyCount + value.translatedKeyCount;
        if (
            !isNonNegativeSafeInteger(inputKeyCount)
            || !isNonNegativeSafeInteger(targetLanguageCount)
            || inputKeyCount === 0
            || targetLanguageCount === 0
            || !Number.isSafeInteger(expectedTranslatedValueCount)
            || !Number.isSafeInteger(actualTranslatedValueCount)
            || value.translationCoverageCount !== targetLanguageCount
            || actualTranslatedValueCount !== expectedTranslatedValueCount
        ) {
            return null;
        }
    }

    return {
        fallbackKeyCount: value.fallbackKeyCount,
        hasPartialCoverage: value.hasPartialCoverage,
        translatedKeyCount: value.translatedKeyCount,
        translationCoverageCount: value.translationCoverageCount,
    };
}

/** The request shape, not target count, determines the provider response shape. */
export function isBatchTranslationRequest(targetLang: unknown): boolean {
    return Array.isArray(targetLang);
}

function isSingleMenuEntityTranslation(inputKeys: string[]): boolean {
    if (inputKeys.length === 1 && inputKeys[0].endsWith('_c')) return true;
    if (inputKeys.some((key) => key.endsWith('_c'))) return false;

    const itemRoots = new Set(
        inputKeys
            .filter((key) => key.endsWith('_i') || key.endsWith('_d'))
            .map((key) => key.slice(0, -2)),
    );
    if (itemRoots.size !== 1) return false;

    const [itemRoot] = Array.from(itemRoots);
    return inputKeys.every((key) =>
        key === `${itemRoot}_i`
        || key === `${itemRoot}_d`
        || (key.startsWith(`${itemRoot}_`) && key.endsWith('_a')),
    );
}

/**
 * Never permits the request payload to downgrade a broader translation to the
 * cheaper single-item operation. Explicit higher-cost actions remain intact.
 */
export function resolveTranslationBillingAction(
    requestedAction: TranslationBillingAction,
    inputKeys: string[],
    targetLanguageCount: number,
): TranslationBillingAction {
    if (requestedAction === AI_ACTIONS_TYPES.IMAGE_TRANSLATION) return requestedAction;
    if (requestedAction === AI_ACTIONS_TYPES.LANGUAGE_ADDITION) return requestedAction;

    return targetLanguageCount === 1 && isSingleMenuEntityTranslation(inputKeys)
        ? AI_ACTIONS_TYPES.ITEM_TRANSLATION
        : AI_ACTIONS_TYPES.LANGUAGE_ADDITION;
}

export function normalizeTranslationText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
        .trim()
        .slice(0, TRANSLATION_TEXT_MAX_LENGTH)
        .trim();
    return normalized || null;
}

/** Projects an untrusted response to the exact keys requested by the caller. */
export function normalizeTranslationMap(
    value: unknown,
    requestedKeys: readonly string[],
): Record<string, string> | null {
    if (!isRecord(value) || requestedKeys.length === 0) return null;

    const normalized: Record<string, string> = {};
    for (const key of requestedKeys) {
        if (!hasOwn(value, key)) return null;
        const translated = normalizeTranslationText(value[key]);
        if (!translated) return null;
        normalized[key] = translated;
    }
    return normalized;
}

/** Projects a batch response to the exact languages and keys requested. */
export function normalizeBatchTranslationMaps(
    value: unknown,
    targetLanguageCodes: readonly string[],
    requestedKeys: readonly string[],
): Record<string, Record<string, string>> | null {
    if (!isRecord(value) || targetLanguageCodes.length === 0 || requestedKeys.length === 0) return null;

    const seenLanguageCodes = new Set<string>();
    const normalized: Record<string, Record<string, string>> = {};
    for (const languageCode of targetLanguageCodes) {
        if (!languageCode || seenLanguageCodes.has(languageCode)) return null;
        seenLanguageCodes.add(languageCode);

        const translations = normalizeTranslationMap(value[languageCode], requestedKeys);
        if (!translations) return null;
        normalized[languageCode] = translations;
    }

    return normalized;
}
