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

import { getBusinessCategory } from '@data/shared/businessTypes';

// ═══════════════════════════════════════════════════════════════
// FIELD DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type MetadataFieldKey =
    | 'allergens'
    | 'dietaryTags'
    | 'spiceLevel'
    | 'nutritionInfo'
    | 'duration'
    | 'skillLevel'
    | 'targetAudience'
    | 'materials'
    | 'warranty';

export interface MetadataFieldConfig {
    key: MetadataFieldKey;
    label: string;
    tooltip: string;
    type: 'multiSelect' | 'singleSelect' | 'number' | 'text' | 'group';
    options?: { label: string; value: string }[];
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
    },
    dietaryTags: {
        key: 'dietaryTags',
        label: 'Dietary Tags',
        tooltip: 'Dietary classifications for this item',
        type: 'multiSelect',
        options: DIETARY_TAG_OPTIONS,
    },
    spiceLevel: {
        key: 'spiceLevel',
        label: 'Spice Level',
        tooltip: 'How spicy is this item',
        type: 'singleSelect',
        options: SPICE_LEVEL_OPTIONS,
    },
    nutritionInfo: {
        key: 'nutritionInfo',
        label: 'Nutrition Info',
        tooltip: 'Nutritional information per serving',
        type: 'group',
    },
    duration: {
        key: 'duration',
        label: 'Duration',
        tooltip: 'How long this service takes (in minutes)',
        type: 'number',
    },
    skillLevel: {
        key: 'skillLevel',
        label: 'Skill Level',
        tooltip: 'Required skill or fitness level',
        type: 'singleSelect',
        options: SKILL_LEVEL_OPTIONS,
    },
    targetAudience: {
        key: 'targetAudience',
        label: 'Target Audience',
        tooltip: 'Who this item/service is designed for',
        type: 'singleSelect',
        options: TARGET_AUDIENCE_OPTIONS,
    },
    materials: {
        key: 'materials',
        label: 'Materials',
        tooltip: 'Materials used in this product',
        type: 'text',
    },
    warranty: {
        key: 'warranty',
        label: 'Warranty',
        tooltip: 'Warranty information for this product',
        type: 'text',
    },
};

// ═══════════════════════════════════════════════════════════════
// BUSINESS CATEGORY → FIELDS MAPPING
// ═══════════════════════════════════════════════════════════════

/**
 * Which metadata fields are relevant per business category.
 * Fields are listed in display order.
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

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get metadata field configs for a business type.
 * Returns only the fields relevant to the store's business category.
 *
 * @param businessType — e.g., "Restaurant", "Salon", "Gym"
 * @returns Array of field configs to show in the editor
 */
export function getMetadataFieldsForBusiness(businessType?: string): MetadataFieldConfig[] {
    const category = getBusinessCategory(businessType) || 'food'; // default to food
    const fieldKeys = CATEGORY_METADATA_FIELDS[category] || CATEGORY_METADATA_FIELDS.food;
    return fieldKeys.map(key => METADATA_FIELDS[key]).filter(Boolean);
}

/**
 * Get the AI extraction hint for a business category.
 * Used in the extraction prompt to tell AI what metadata to look for.
 */
export function getExtractionHintForCategory(businessCategory: string): string {
    switch (businessCategory) {
        case 'food':
            return `Look for: allergen warnings (nuts, dairy, gluten, etc.), dietary labels (V/VG/GF, green dot/red dot, vegan/vegetarian/halal/kosher), spice indicators (🌶️, mild/medium/hot), and nutrition info (calories, protein) if visible.`;
        case 'service':
            return `Look for: service duration (30 min, 1 hour, etc.), target audience labels (For Men/Women/Unisex/Kids).`;
        case 'retail':
            return `Look for: material descriptions (cotton, leather, etc.), warranty information, product dimensions.`;
        case 'health':
            return `Look for: session duration (30 min, 1 hour), difficulty/skill level (beginner/intermediate/advanced), target audience (men/women/all ages).`;
        case 'creative':
            return `Look for: session/service duration, materials used or included.`;
        case 'professional':
            return `Look for: service duration, consultation format.`;
        default:
            return `Look for: service duration, target audience labels if visible.`;
    }
}
