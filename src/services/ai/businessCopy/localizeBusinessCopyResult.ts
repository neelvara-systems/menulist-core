import GlobalLanguagesList from '@data/languages';
import { LocalizedText, toLocalizedText } from '@lib/localization/text';
import { syncBalanceFromResponse } from '@services/ai/balanceSync';
import { AICapacityError, checkCapacityResponse } from '@services/ai/capacityError';
import { LanguageType } from '../../../components/templates/main-app/projects/types/common.types';
import { BusinessCopyGenerationResult } from './generateBusinessCopyViaAPI';

export type LocalizedBusinessCopyFields = {
    descriptor?: LocalizedText;
    displayName?: LocalizedText;
    knownFor?: LocalizedText;
    metaDescription?: LocalizedText;
    metaTitle?: LocalizedText;
    pwaShortName?: LocalizedText;
    tagline?: LocalizedText;
};

const FIELD_LIMITS: Record<keyof LocalizedBusinessCopyFields, number> = {
    descriptor: 140,
    displayName: 80,
    knownFor: 120,
    metaDescription: 160,
    metaTitle: 60,
    pwaShortName: 12,
    tagline: 100,
};

const LANGUAGE_INDEX = new Map(
    GlobalLanguagesList.map((language) => [language.code.toLowerCase(), language]),
);

const resolveLanguageCode = (code?: string | null) => code?.trim().toLowerCase() || '';

const resolveLanguage = (code?: string | null): LanguageType | null => {
    const normalized = resolveLanguageCode(code);
    if (!normalized) return null;
    return LANGUAGE_INDEX.get(normalized) || null;
};

const clampValue = (value: unknown, maxLength: number) => String(value || '').trim().slice(0, maxLength);

const toFieldPayload = (generated: BusinessCopyGenerationResult): Record<keyof LocalizedBusinessCopyFields, string> => ({
    descriptor: clampValue(generated.descriptor, FIELD_LIMITS.descriptor),
    displayName: clampValue(generated.displayName, FIELD_LIMITS.displayName),
    knownFor: clampValue(generated.knownFor, FIELD_LIMITS.knownFor),
    metaDescription: clampValue(generated.metaDescription, FIELD_LIMITS.metaDescription),
    metaTitle: clampValue(generated.metaTitle, FIELD_LIMITS.metaTitle),
    pwaShortName: clampValue(generated.pwaShortName, FIELD_LIMITS.pwaShortName),
    tagline: clampValue(generated.tagline, FIELD_LIMITS.tagline),
});

function buildLocalizedFields(
    sourceLanguage: string,
    payload: Record<keyof LocalizedBusinessCopyFields, string>,
): LocalizedBusinessCopyFields {
    return Object.fromEntries(
        Object.entries(payload).map(([field, value]) => [
            field,
            toLocalizedText(value, sourceLanguage),
        ]),
    ) as LocalizedBusinessCopyFields;
}

async function getBatchTranslations({
    fileId,
    inputJson,
    projectId,
    sourceLang,
    targetLang,
}: {
    fileId: string;
    inputJson: Record<string, string>;
    projectId: string;
    sourceLang: LanguageType;
    targetLang: LanguageType[];
}): Promise<Record<string, Record<string, string>> | null> {
    try {
        const response = await fetch('/api/translations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'language_addition',
                fileId,
                inputJson,
                projectId,
                sourceLang,
                targetLang,
            }),
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`Translation request failed: ${response.statusText}`);
        }

        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        return responseJson?.data?.translationsByLanguage || null;
    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        console.error('Error calling batch translation API:', error);
        return null;
    }
}

function getEnabledLanguageCodes(storeDetails?: any): string[] {
    const base = [
        storeDetails?.defaultLanguage,
        ...(Array.isArray(storeDetails?.activeLanguages) ? storeDetails.activeLanguages : []),
        storeDetails?.language,
        'en',
    ];

    return Array.from(new Set(base.map(resolveLanguageCode).filter(Boolean)));
}

export function mergeLocalizedField(
    existingValue: unknown,
    nextValue?: LocalizedText,
): LocalizedText | undefined {
    const existing = toLocalizedText(existingValue as any, 'en') || {};
    const next = nextValue || {};
    const merged = {
        ...existing,
        ...next,
    };

    const normalized = Object.fromEntries(
        Object.entries(merged).filter(
            ([key, value]) => key && typeof value === 'string' && value.trim().length > 0,
        ),
    ) as LocalizedText;

    return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export default async function localizeBusinessCopyResult({
    generated,
    projectId,
    storeDetails,
}: {
    generated: BusinessCopyGenerationResult;
    projectId?: string;
    storeDetails?: any;
}): Promise<LocalizedBusinessCopyFields> {
    const enabledLanguageCodes = getEnabledLanguageCodes(storeDetails);
    const sourceLanguage = enabledLanguageCodes[0] || 'en';
    const sourceLanguageDef = resolveLanguage(sourceLanguage);
    const payload = toFieldPayload(generated);
    const localized = buildLocalizedFields(sourceLanguage, payload);

    if (!sourceLanguageDef) {
        return localized;
    }

    const targetLanguages = enabledLanguageCodes
        .filter((code) => code !== sourceLanguage)
        .map(resolveLanguage)
        .filter(Boolean) as LanguageType[];

    if (!targetLanguages.length) {
        return localized;
    }

    const translatedByLanguage = await getBatchTranslations({
        fileId: `business-copy-${storeDetails?.storeId || 'store'}-batch`,
        inputJson: payload,
        projectId: projectId || String(storeDetails?.storeId || 'business-copy'),
        sourceLang: sourceLanguageDef,
        targetLang: targetLanguages,
    });

    if (!translatedByLanguage) {
        return localized;
    }

    targetLanguages.forEach((targetLanguage) => {
        const translated = translatedByLanguage[targetLanguage.code];
        if (!translated) return;

        (Object.keys(payload) as Array<keyof LocalizedBusinessCopyFields>).forEach((field) => {
            const nextValue = clampValue(translated[field], FIELD_LIMITS[field]);
            if (!nextValue) return;
            const current = localized[field] || {};
            localized[field] = {
                ...current,
                [targetLanguage.code]: nextValue,
            };
        });
    });

    return localized;
}
