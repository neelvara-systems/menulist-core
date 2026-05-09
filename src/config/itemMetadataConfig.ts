/**
 * Item Metadata Configuration — Business-Category-Aware
 * ═══════════════════════════════════════════════════════
 *
 * Defines which metadata fields are relevant per business category.
 * The ExtractedDataItem type has ALL fields (universal superset),
 * but the editor UI shows only fields relevant to the store's businessType.
 *
 * Categories: food, service, retail, health, creative, professional, specialty
 * @see src/data/shared/businessTypes.ts — BUSINESS_CATEGORIES
 */

import { resolveBusinessCategory } from '@data/shared/businessTypes';
import type { ItemDecisionFactKey } from '@lib/menu/itemDecisionFacts';

// ═══════════════════════════════════════════════════════════════
// FIELD DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type MetadataFieldKey = ItemDecisionFactKey;

export interface MetadataFieldConfig {
    key: MetadataFieldKey;
    label: string;
    tooltip: string;
    type: 'multiSelect' | 'singleSelect' | 'number' | 'text' | 'group';
    options?: { label: string; value: string }[];
    ownerEditable: boolean;
    publicVisible: boolean;
    filterable: boolean;
    aiSuggestible: boolean;
    requiresOwnerConfirmation: boolean;
    schemaOrgMapping?: 'suitableForDiet' | 'nutrition' | 'additionalProperty';
    confirmationText?: string;
}

// ═══════════════════════════════════════════════════════════════
// FIELD OPTION PRESETS
// ═══════════════════════════════════════════════════════════════

export const ALLERGEN_OPTIONS = [
    { label: 'Dairy', value: 'dairy' },
    { label: 'Nuts', value: 'nuts' },
    { label: 'Gluten', value: 'gluten' },
    { label: 'Shellfish', value: 'shellfish' },
    { label: 'Soy', value: 'soy' },
    { label: 'Eggs', value: 'eggs' },
    { label: 'Fish', value: 'fish' },
    { label: 'Sesame', value: 'sesame' },
    { label: 'Mustard', value: 'mustard' },
    { label: 'Celery', value: 'celery' },
    { label: 'Lupin', value: 'lupin' },
    { label: 'Sulphites', value: 'sulphites' },
    { label: 'Peanuts', value: 'peanuts' },
    { label: 'Tree Nuts', value: 'tree-nuts' },
];

export const DIETARY_TAG_OPTIONS = [
    { label: 'Vegetarian', value: 'vegetarian' },
    { label: 'Vegan', value: 'vegan' },
    { label: 'Gluten-Free', value: 'gluten-free' },
    { label: 'Halal', value: 'halal' },
    { label: 'Kosher', value: 'kosher' },
    { label: 'Keto', value: 'keto' },
    { label: 'Sugar-Free', value: 'sugar-free' },
    { label: 'Dairy-Free', value: 'dairy-free' },
    { label: 'Organic', value: 'organic' },
    { label: 'Paleo', value: 'paleo' },
];

export const SPICE_LEVEL_OPTIONS = [
    { label: 'No Spice', value: 'none' },
    { label: 'Mild', value: 'mild' },
    { label: 'Medium', value: 'medium' },
    { label: 'Hot', value: 'hot' },
    { label: 'Very Hot', value: 'very-hot' },
];

export const SKILL_LEVEL_OPTIONS = [
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' },
    { label: 'All Levels', value: 'all-levels' },
];

export const TARGET_AUDIENCE_OPTIONS = [
    { label: 'For Men', value: 'for-men' },
    { label: 'For Women', value: 'for-women' },
    { label: 'Unisex', value: 'unisex' },
    { label: 'Kids', value: 'kids' },
    { label: 'Adults', value: 'adults' },
    { label: 'Seniors', value: 'seniors' },
];

// ═══════════════════════════════════════════════════════════════
// FIELD REGISTRY — All possible metadata fields
// ═══════════════════════════════════════════════════════════════

export const METADATA_FIELDS: Record<MetadataFieldKey, MetadataFieldConfig> = {
    allergens: {
        key: 'allergens',
        label: 'Allergens',
        tooltip: 'Allergens present in this item (helps customers with food allergies)',
        type: 'multiSelect',
        options: ALLERGEN_OPTIONS,
        ownerEditable: true,
        publicVisible: true,
        filterable: false,
        aiSuggestible: false,
        requiresOwnerConfirmation: true,
        confirmationText: 'Only add allergens you have confirmed.',
    },
    dietaryTags: {
        key: 'dietaryTags',
        label: 'Dietary Tags',
        tooltip: 'Dietary classifications for this item',
        type: 'multiSelect',
        options: DIETARY_TAG_OPTIONS,
        ownerEditable: true,
        publicVisible: true,
        filterable: true,
        aiSuggestible: true,
        requiresOwnerConfirmation: false,
        schemaOrgMapping: 'suitableForDiet',
    },
    spiceLevel: {
        key: 'spiceLevel',
        label: 'Spice Level',
        tooltip: 'How spicy is this item',
        type: 'singleSelect',
        options: SPICE_LEVEL_OPTIONS,
        ownerEditable: true,
        publicVisible: true,
        filterable: false,
        aiSuggestible: true,
        requiresOwnerConfirmation: false,
    },
    nutritionInfo: {
        key: 'nutritionInfo',
        label: 'Nutrition Info',
        tooltip: 'Nutritional information per serving',
        type: 'group',
        ownerEditable: true,
        publicVisible: true,
        filterable: false,
        aiSuggestible: false,
        requiresOwnerConfirmation: true,
        schemaOrgMapping: 'nutrition',
        confirmationText: 'Only add nutrition values you have confirmed.',
    },
    duration: {
        key: 'duration',
        label: 'Duration',
        tooltip: 'How long this service takes (in minutes)',
        type: 'number',
        ownerEditable: true,
        publicVisible: true,
        filterable: false,
        aiSuggestible: true,
        requiresOwnerConfirmation: false,
        schemaOrgMapping: 'additionalProperty',
    },
    skillLevel: {
        key: 'skillLevel',
        label: 'Skill Level',
        tooltip: 'Required skill or fitness level',
        type: 'singleSelect',
        options: SKILL_LEVEL_OPTIONS,
        ownerEditable: true,
        publicVisible: true,
        filterable: false,
        aiSuggestible: false,
        requiresOwnerConfirmation: false,
        schemaOrgMapping: 'additionalProperty',
    },
    targetAudience: {
        key: 'targetAudience',
        label: 'Target Audience',
        tooltip: 'Who this item/service is designed for',
        type: 'singleSelect',
        options: TARGET_AUDIENCE_OPTIONS,
        ownerEditable: true,
        publicVisible: true,
        filterable: true,
        aiSuggestible: false,
        requiresOwnerConfirmation: false,
        schemaOrgMapping: 'additionalProperty',
    },
    materials: {
        key: 'materials',
        label: 'Materials',
        tooltip: 'Materials used in this product',
        type: 'text',
        ownerEditable: true,
        publicVisible: true,
        filterable: false,
        aiSuggestible: false,
        requiresOwnerConfirmation: false,
        schemaOrgMapping: 'additionalProperty',
    },
    warranty: {
        key: 'warranty',
        label: 'Warranty',
        tooltip: 'Warranty information for this product',
        type: 'text',
        ownerEditable: true,
        publicVisible: true,
        filterable: false,
        aiSuggestible: false,
        requiresOwnerConfirmation: false,
        schemaOrgMapping: 'additionalProperty',
    },
};

export const AI_BLOCKED_METADATA_FIELDS = Object.values(METADATA_FIELDS)
    .filter(field => !field.aiSuggestible)
    .map(field => field.key);

// ═══════════════════════════════════════════════════════════════
// BUSINESS CATEGORY → FIELDS MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Which metadata fields are owner-facing per business category.
 * Fields are listed in display order.
 *
 * AI extraction is intentionally stricter than this mapping: owners may enter
 * known metadata manually, but MenuList should not invent high-liability or
 * low-maintenance fields from weak context.
 */
export const CATEGORY_METADATA_FIELDS: Record<string, MetadataFieldKey[]> = {
    food: ['allergens', 'dietaryTags', 'spiceLevel', 'nutritionInfo'],
    service: ['duration', 'targetAudience'],
    retail: ['materials', 'warranty'],
    health: ['duration', 'skillLevel', 'targetAudience'],
    creative: ['duration', 'materials'],
    professional: ['duration'],
    specialty: ['duration', 'targetAudience'],
};

/**
 * Exact business-type overrides for cases where the broad category would show
 * misleading fields. Keep this list small; category defaults remain the main
 * metadata model.
 */
export const BUSINESS_TYPE_METADATA_FIELDS: Record<string, MetadataFieldKey[]> = {
    // Service businesses
    'Pet Grooming Service': ['duration'],
    'Pet Grooming Salon': ['duration'],
    'Pet Grooming Studio': ['duration'],
    'Cleaning Services Company': ['duration'],
    'Car Wash & Detailing Service': ['duration'],
    'Landscaping Service': ['duration'],
    'Landscaping Company': ['duration'],

    // Retail businesses
    'Bookstore': [],
    'Florist Shop': [],
    'Aquarium Store': [],
    'Fashion Boutique': ['materials'],
    'Craft Supply Store': ['materials'],
    'Handmade Crafts': ['materials'],
    'Etsy Shop': ['materials'],
    'Jewelry Store': ['materials', 'warranty'],
    'Furniture Store': ['materials', 'warranty'],
    'Luxury Watch Dealer': ['materials', 'warranty'],
    'Shoe Store': ['materials', 'warranty'],
    'Electronics Store': ['warranty'],
    'Music Store': ['warranty'],
    'Fitness Equipment Seller': ['materials', 'warranty'],

    // Creative businesses
    'Photography Studio': ['duration'],
    'Photography Tour Operator': ['duration'],
    'Tattoo Studio': ['duration'],
    'Makeup Studio': ['duration', 'targetAudience'],
    'Music School': ['duration', 'skillLevel', 'targetAudience'],
    'Art Gallery': ['materials'],
    'Handmade Jewelry Brand': ['materials', 'warranty'],
    'Furniture Maker': ['materials', 'warranty'],
    'Florist': [],
    'Event Decorator': ['duration'],
    'Tailoring Shop': ['duration', 'materials', 'targetAudience'],

    // Health & wellness
    'Dental Clinic': ['duration'],
    'Veterinary Clinic': ['duration'],
    'Spa Resort': ['duration', 'targetAudience'],
    'Yoga Studio': ['duration', 'skillLevel', 'targetAudience'],
    'Fitness Bootcamp': ['duration', 'skillLevel', 'targetAudience'],
    'Gym': ['duration', 'skillLevel', 'targetAudience'],
    'Fitness Center': ['duration', 'skillLevel', 'targetAudience'],
    'Personal Trainer': ['duration', 'skillLevel', 'targetAudience'],
    'Martial Arts Academy': ['duration', 'skillLevel', 'targetAudience'],

    // Specialty businesses
    'Car Dealership': ['warranty'],
    'Auto Repair Shop': ['duration', 'warranty'],
    '3D Printing Studio': ['duration', 'materials'],
    'Drone Services Company': ['duration'],
    'Boutique Hotel': [],
    "Children's Daycare": ['duration', 'targetAudience'],
    'Daycare Center': ['duration', 'targetAudience'],
    'Coworking Space': [],
    'Bike Rental Shop': ['duration', 'targetAudience'],
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getMetadataFieldKeysForBusiness(businessType?: string): MetadataFieldKey[] {
    const normalizedBusinessType = businessType?.trim().toLowerCase();
    const exactOverride = normalizedBusinessType
        ? Object.entries(BUSINESS_TYPE_METADATA_FIELDS).find(([type]) => type.toLowerCase() === normalizedBusinessType)?.[1]
        : undefined;

    if (exactOverride) {
        return exactOverride;
    }

    const category = resolveBusinessCategory(businessType) || 'food'; // default to food
    return CATEGORY_METADATA_FIELDS[category] || CATEGORY_METADATA_FIELDS.food;
}

/**
 * Get metadata field configs for a business type.
 * Returns only the fields relevant to the store's business type/category.
 *
 * @param businessType — e.g., "Restaurant", "Salon", "Gym"
 * @returns Array of field configs to show in the editor
 */
export function getMetadataFieldsForBusiness(businessType?: string): MetadataFieldConfig[] {
    const fieldKeys = getMetadataFieldKeysForBusiness(businessType);
    return fieldKeys.map(key => METADATA_FIELDS[key]).filter(Boolean);
}

/**
 * Get the AI extraction hint for a business category.
 * Used in the extraction prompt to tell AI what metadata to look for.
 */
export function getExtractionHintForCategory(businessCategory: string): string {
    switch (businessCategory) {
        case 'food':
            return `Look for only low-risk customer decision signals: dietary labels (V/VG/GF, green dot/red dot, vegan/vegetarian/halal/kosher) and spice indicators (🌶️, mild/medium/hot) when clearly visible. Do not infer allergens or nutrition.`;
        case 'service':
            return `Look for: service duration (30 min, 1 hour, etc.) only when clearly visible.`;
        case 'retail':
            return `Do not infer extra item metadata for retail products. Preserve owner-provided item name, description, price, and images.`;
        case 'health':
            return `Look for: session duration (30 min, 1 hour) only when clearly visible.`;
        case 'creative':
            return `Look for: session/service duration only when clearly visible.`;
        case 'professional':
            return `Look for: service duration only when clearly visible.`;
        default:
            return `Look for: service duration only when clearly visible.`;
    }
}
