import {
    DIETARY_TAG_OPTIONS,
    getMetadataFieldKeysForBusiness,
    METADATA_FIELDS,
    SPICE_LEVEL_OPTIONS,
} from '@config/itemMetadataConfig';
import { getBusinessTypeConfig } from '@data/shared/businessTypes';

const MAX_METADATA_TEXT_LENGTH = 2000;

type InputAttribute = {
    id: string;
    name?: string;
};

export type GeneratedItemMetadataAttribute = {
    id: string;
    name: Record<string, string>;
};

export type GeneratedItemMetadata = {
    attributes?: GeneratedItemMetadataAttribute[];
    description: Record<string, string>;
    dietaryTags?: string[];
    duration?: number;
    name: Record<string, string>;
    spiceLevel?: 'none' | 'mild' | 'medium' | 'hot' | 'very-hot';
};

type NormalizeNewItemMetadataOptions = {
    businessType?: string;
    item: {
        attributes?: InputAttribute[];
        description?: string;
        name: string;
    };
    sourceLanguageCode: string;
    targetLanguageCodes: string[];
};

export function createNewItemMetadataProviderAliases<
    T extends { id: string; attributes?: Array<{ id: string }> },
>(item: T): {
    originalAttributeIdsByAlias: Readonly<Record<string, string>>;
    providerItem: T;
} {
    const attributeAliases = (item.attributes || []).map((attribute, index) => {
        const alias = `attribute_${index + 1}`;
        return {
            alias,
            attribute: { ...attribute, id: alias },
            originalAttributeId: attribute.id,
        };
    });

    return {
        originalAttributeIdsByAlias: Object.fromEntries(
            attributeAliases.map(({ alias, originalAttributeId }) => [alias, originalAttributeId]),
        ),
        providerItem: {
            ...item,
            id: 'item_1',
            ...(item.attributes ? {
                attributes: attributeAliases.map(({ attribute }) => attribute),
            } : {}),
        } as T,
    };
}

const hasOwn = (value: object, key: string): boolean =>
    Object.prototype.hasOwnProperty.call(value, key);

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

export function restoreNewItemMetadataProviderAttributeIds(
    value: unknown,
    originalAttributeIdsByAlias: Readonly<Record<string, string>>,
): unknown {
    if (!isRecord(value) || !Array.isArray(value.attributes)) return value;

    return {
        ...value,
        attributes: value.attributes.map((attribute) => {
            if (!isRecord(attribute) || typeof attribute.id !== 'string') return attribute;
            const originalAttributeId = originalAttributeIdsByAlias[attribute.id];
            return originalAttributeId
                ? { ...attribute, id: originalAttributeId }
                : attribute;
        }),
    };
}

function normalizeText(value: unknown, maxLength = MAX_METADATA_TEXT_LENGTH): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
        .trim()
        .slice(0, maxLength)
        .trim();
    return normalized || null;
}

function normalizeLanguageMap(
    value: unknown,
    targetLanguageCodes: string[],
    sourceLanguageCode: string,
    protectedSourceValue?: string,
    maxLength = MAX_METADATA_TEXT_LENGTH,
): Record<string, string> | null {
    if (!isRecord(value)) return null;

    const normalized: Record<string, string> = {};
    for (const languageCode of targetLanguageCodes) {
        const protectedValue = languageCode === sourceLanguageCode
            ? normalizeText(protectedSourceValue, maxLength)
            : null;
        const generatedValue = hasOwn(value, languageCode)
            ? normalizeText(value[languageCode], maxLength)
            : null;
        const resolvedValue = protectedValue || generatedValue;
        if (!resolvedValue) return null;
        normalized[languageCode] = resolvedValue;
    }
    return normalized;
}

function getAiSuggestibleFields(businessType?: string): Set<string> {
    const canonicalBusiness = getBusinessTypeConfig(businessType);
    if (!canonicalBusiness) return new Set();

    return new Set(
        getMetadataFieldKeysForBusiness(canonicalBusiness.value)
            .filter((key) => METADATA_FIELDS[key].aiSuggestible),
    );
}

function normalizeDietaryTags(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const allowed = new Set(DIETARY_TAG_OPTIONS.map((option) => option.value));
    const tags = Array.from(new Set(
        value
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim().toLowerCase())
            .filter((entry) => allowed.has(entry)),
    ));
    return tags.length > 0 ? tags : undefined;
}

function normalizeSpiceLevel(value: unknown): GeneratedItemMetadata['spiceLevel'] | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    return SPICE_LEVEL_OPTIONS.some((option) => option.value === normalized)
        ? normalized as GeneratedItemMetadata['spiceLevel']
        : undefined;
}

function normalizeDuration(value: unknown): number | undefined {
    const duration = typeof value === 'number' ? value : Number.NaN;
    return Number.isSafeInteger(duration) && duration > 0 && duration <= 24 * 60
        ? duration
        : undefined;
}

/**
 * Projects untrusted provider/client data onto the only fields this operation
 * owns. Source-language text and attribute identity are always owner-owned.
 */
export function normalizeNewItemMetadataOutput(
    value: unknown,
    options: NormalizeNewItemMetadataOptions,
): GeneratedItemMetadata | null {
    if (!isRecord(value) || options.targetLanguageCodes.length === 0) return null;

    const targetLanguageCodes = Array.from(new Set(options.targetLanguageCodes));
    if (targetLanguageCodes.length !== options.targetLanguageCodes.length) return null;

    const name = normalizeLanguageMap(
        value.name,
        targetLanguageCodes,
        options.sourceLanguageCode,
        options.item.name,
        500,
    );
    const description = normalizeLanguageMap(
        value.description,
        targetLanguageCodes,
        options.sourceLanguageCode,
        options.item.description,
    );
    if (!name || !description) return null;

    const expectedAttributes = (options.item.attributes || [])
        .filter((attribute) => normalizeText(attribute.name, 500));
    let attributes: GeneratedItemMetadataAttribute[] | undefined;
    if (expectedAttributes.length > 0) {
        if (!Array.isArray(value.attributes)) return null;
        const generatedById = new Map<string, Record<string, unknown>>();
        for (const generatedAttribute of value.attributes) {
            if (!isRecord(generatedAttribute)) return null;
            const id = normalizeText(generatedAttribute.id, 100);
            if (!id || generatedById.has(id)) return null;
            generatedById.set(id, generatedAttribute);
        }

        attributes = [];
        for (const expectedAttribute of expectedAttributes) {
            const generatedAttribute = generatedById.get(expectedAttribute.id);
            if (!generatedAttribute) return null;
            const translatedName = normalizeLanguageMap(
                generatedAttribute.name,
                targetLanguageCodes,
                options.sourceLanguageCode,
                expectedAttribute.name,
                500,
            );
            if (!translatedName) return null;
            attributes.push({ id: expectedAttribute.id, name: translatedName });
        }
    }

    const result: GeneratedItemMetadata = { name, description };
    if (attributes) result.attributes = attributes;

    const suggestibleFields = getAiSuggestibleFields(options.businessType);
    if (suggestibleFields.has('dietaryTags')) {
        const dietaryTags = normalizeDietaryTags(value.dietaryTags);
        if (dietaryTags) result.dietaryTags = dietaryTags;
    }
    if (suggestibleFields.has('spiceLevel')) {
        const spiceLevel = normalizeSpiceLevel(value.spiceLevel);
        if (spiceLevel) result.spiceLevel = spiceLevel;
    }
    if (suggestibleFields.has('duration')) {
        const duration = normalizeDuration(value.duration);
        if (duration) result.duration = duration;
    }

    return result;
}
