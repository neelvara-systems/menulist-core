/**
 * Business Attribute Inference — Shared Data (Self-Contained)
 * ============================================================
 *
 * PRIMARY SOURCE — This file is the single source of truth for business
 * attribute keys that extraction is allowed to suggest as owner-editable
 * defaults.
 *
 * COPY RULE: This exact file is copied as-is to:
 *   functions/src/sharedData/businessAttributeInference.ts
 *
 * When updating this file, copy-paste the ENTIRE file to the backend.
 * Do NOT cherry-pick or modify — always full file replacement.
 *
 * Keep this file self-contained. Do not import app or Functions modules.
 */

export type BusinessAttributeKind = 'food' | 'retail' | 'service' | 'venue';

export interface BusinessAttributeInferenceConfig {
    key: string;
    businessKinds?: BusinessAttributeKind[];
    dietaryTagIds?: string[];
}

export const BUSINESS_ATTRIBUTE_INFERENCE_CONFIG: BusinessAttributeInferenceConfig[] = [
    { key: 'vegetarian', businessKinds: ['food'], dietaryTagIds: ['vegetarian'] },
    { key: 'vegan', businessKinds: ['food'], dietaryTagIds: ['vegan'] },
    { key: 'halal', businessKinds: ['food'], dietaryTagIds: ['halal'] },
    { key: 'glutenFree', businessKinds: ['food'], dietaryTagIds: ['gluten_free', 'gluten-free', 'glutenfree'] },
    { key: 'wifi' },
    { key: 'outdoorSeating' },
    { key: 'parking' },
    { key: 'airConditioning' },
    { key: 'liveMusic', businessKinds: ['food', 'venue'] },
    { key: 'petFriendly' },
    { key: 'dineIn', businessKinds: ['food', 'venue'] },
    { key: 'takeaway', businessKinds: ['food', 'retail'] },
    { key: 'delivery' },
    { key: 'driveThrough', businessKinds: ['food'] },
    { key: 'acceptsCards' },
    { key: 'acceptsUPI' },
    { key: 'acceptsCash' },
];

export const BUSINESS_ATTRIBUTE_KEY_ALIASES: Record<string, string> = {
    card: 'acceptsCards',
    cards: 'acceptsCards',
    acceptscard: 'acceptsCards',
    acceptscards: 'acceptsCards',
    creditcard: 'acceptsCards',
    creditcards: 'acceptsCards',
    cash: 'acceptsCash',
    acceptscash: 'acceptsCash',
    upi: 'acceptsUPI',
    acceptupi: 'acceptsUPI',
    acceptsupi: 'acceptsUPI',
    'gluten-free': 'glutenFree',
    glutenfree: 'glutenFree',
    gluten_free: 'glutenFree',
    'air-conditioning': 'airConditioning',
    airconditioning: 'airConditioning',
    air_conditioning: 'airConditioning',
    ac: 'airConditioning',
    'drive-through': 'driveThrough',
    drivethrough: 'driveThrough',
    drive_through: 'driveThrough',
    'dine-in': 'dineIn',
    dinein: 'dineIn',
    dine_in: 'dineIn',
    'outdoor-seating': 'outdoorSeating',
    outdoorseating: 'outdoorSeating',
    outdoor_seating: 'outdoorSeating',
    'live-music': 'liveMusic',
    livemusic: 'liveMusic',
    live_music: 'liveMusic',
    'pet-friendly': 'petFriendly',
    petfriendly: 'petFriendly',
    pet_friendly: 'petFriendly',
};

function normalizeAliasToken(value: string): string {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function getBusinessAttributeKindForCategory(businessCategory?: string): BusinessAttributeKind {
    const normalized = String(businessCategory || '').trim().toLowerCase();
    if (normalized === 'food') return 'food';
    if (normalized === 'retail') return 'retail';
    if (normalized === 'venue') return 'venue';
    if (['service', 'professional', 'creative', 'health', 'specialty'].includes(normalized)) return 'service';
    return 'food';
}

export function getBusinessAttributeInferenceConfigForCategory(
    businessCategory?: string,
): BusinessAttributeInferenceConfig[] {
    const kind = getBusinessAttributeKindForCategory(businessCategory);
    return BUSINESS_ATTRIBUTE_INFERENCE_CONFIG.filter((attribute) => (
        !attribute.businessKinds || attribute.businessKinds.includes(kind)
    ));
}

export function getAllowedBusinessAttributeKeysForCategory(businessCategory?: string): string[] {
    return getBusinessAttributeInferenceConfigForCategory(businessCategory)
        .map((attribute) => attribute.key);
}

export function getAllBusinessAttributeInferenceKeys(): string[] {
    return BUSINESS_ATTRIBUTE_INFERENCE_CONFIG.map((attribute) => attribute.key);
}

export function getDietaryTagToBusinessAttributeMapForCategory(
    businessCategory?: string,
): Record<string, string> {
    return getBusinessAttributeInferenceConfigForCategory(businessCategory)
        .reduce<Record<string, string>>((map, attribute) => {
            (attribute.dietaryTagIds || []).forEach((tagId) => {
                const normalizedTag = String(tagId || '').trim().toLowerCase();
                if (normalizedTag) map[normalizedTag] = attribute.key;
            });
            return map;
        }, {});
}

export function normalizeBusinessAttributeInferenceKey(
    rawKey: unknown,
    allowedKeys?: Iterable<string>,
): string | undefined {
    if (typeof rawKey !== 'string') return undefined;

    const trimmedKey = rawKey.trim();
    if (!trimmedKey) return undefined;

    const allowedSet = new Set(allowedKeys || getAllBusinessAttributeInferenceKeys());
    if (allowedSet.has(trimmedKey)) return trimmedKey;

    const lowerKey = trimmedKey.toLowerCase();
    for (const key of Array.from(allowedSet)) {
        if (key.toLowerCase() === lowerKey) return key;
    }

    const aliasKey = BUSINESS_ATTRIBUTE_KEY_ALIASES[lowerKey]
        || BUSINESS_ATTRIBUTE_KEY_ALIASES[normalizeAliasToken(lowerKey)];
    return aliasKey && allowedSet.has(aliasKey) ? aliasKey : undefined;
}
