/**
 * Override Utilities
 *
 * Helper functions for applying and managing store overrides.
 *
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md Section 15
 */

import {
    ExtractedDataCategory,
    ExtractedDataItem,
} from "@template/main-app/projects/types/extractedData.types";
import {
    AttributeOverride,
    CategoryOverride,
    ItemOverride,
    ProjectOverrides,
} from "@template/main-app/projects/types/project.types";

// ══════════════════════════════════════════════════════════════════════════
// OVERRIDE APPLICATION
// Apply overrides to master items/categories
// ══════════════════════════════════════════════════════════════════════════

/**
 * Apply item override to a master item
 * Returns the item with override values applied
 */
export function applyItemOverride(
    item: ExtractedDataItem,
    override: ItemOverride | undefined,
): ExtractedDataItem {
    if (!override) return item;

    return {
        ...item,
        // Apply override values if present, else keep original
        price: override.price ?? item.price,
        available: override.available ?? item.available,
        active: override.active ?? item.active,
        isBestSeller: override.isBestSeller ?? item.isBestSeller,
        duration: override.duration ?? item.duration,
        ownerBoost: override.ownerBoost ?? item.ownerBoost,
    };
}

/**
 * Apply category override to a master category
 * Returns the category with override values applied
 */
export function applyCategoryOverride(
    category: ExtractedDataCategory,
    override: CategoryOverride | undefined,
): ExtractedDataCategory {
    if (!override) return category;

    return {
        ...category,
        active: override.active ?? category.active,
        timeSlots: override.timeSlots ?? category.timeSlots,
    };
}

// ══════════════════════════════════════════════════════════════════════════
// OVERRIDE DETECTION
// Check if items/categories have overrides
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if an item has any override applied
 */
export function hasItemOverride(
    itemId: string,
    overrides: ProjectOverrides | undefined,
): boolean {
    return !!overrides?.items[itemId];
}

/**
 * Check if a category has any override applied
 */
export function hasCategoryOverride(
    categoryId: string,
    overrides: ProjectOverrides | undefined,
): boolean {
    return !!overrides?.categories[categoryId];
}

/**
 * Check if an attribute has any override applied
 */
export function hasAttributeOverride(
    attributeId: string,
    overrides: ProjectOverrides | undefined,
): boolean {
    return !!overrides?.attributes[attributeId];
}

// ══════════════════════════════════════════════════════════════════════════
// OVERRIDE TYPE DETECTION
// Determine what type of override is applied
// ══════════════════════════════════════════════════════════════════════════

export type OverrideType =
    | "price"
    | "availability"
    | "hidden"
    | "multiple"
    | "none";

/**
 * Get the type of override applied to an item
 */
export function getItemOverrideType(
    itemId: string,
    overrides: ProjectOverrides | undefined,
): OverrideType {
    const override = overrides?.items[itemId];
    if (!override) return "none";

    const types: string[] = [];

    if (override.active === false) types.push("hidden");
    if (override.available !== undefined) types.push("availability");
    if (override.price !== undefined) types.push("price");

    if (types.length === 0) return "none";
    if (types.length === 1) return types[0] as OverrideType;
    return "multiple";
}

/**
 * Get the type of override applied to a category
 */
export function getCategoryOverrideType(
    categoryId: string,
    overrides: ProjectOverrides | undefined,
): OverrideType {
    const override = overrides?.categories[categoryId];
    if (!override) return "none";

    if (override.active === false) return "hidden";
    if (override.orderIndex !== undefined || override.timeSlots !== undefined) {
        return "multiple";
    }

    return "none";
}

// ══════════════════════════════════════════════════════════════════════════
// OVERRIDE CREATION
// Build override objects for saving
// ══════════════════════════════════════════════════════════════════════════

/**
 * Create an item override object
 * Only includes fields that have values
 */
export function createItemOverride(params: {
    price?: string;
    available?: boolean;
    active?: boolean;
    orderIndex?: number;
    isBestSeller?: boolean;
    duration?: number;
    ownerBoost?: number;
}): ItemOverride {
    const override: ItemOverride = {};

    if (params.price !== undefined) override.price = params.price;
    if (params.available !== undefined) override.available = params.available;
    if (params.active !== undefined) override.active = params.active;
    if (params.orderIndex !== undefined) override.orderIndex = params.orderIndex;
    if (params.isBestSeller !== undefined)
        override.isBestSeller = params.isBestSeller;
    if (params.duration !== undefined) override.duration = params.duration;
    if (params.ownerBoost !== undefined) override.ownerBoost = params.ownerBoost;

    return override;
}

/**
 * Create a category override object
 * Only includes fields that have values
 */
export function createCategoryOverride(params: {
    active?: boolean;
    orderIndex?: number;
    timeSlots?: CategoryOverride["timeSlots"];
}): CategoryOverride {
    const override: CategoryOverride = {};

    if (params.active !== undefined) override.active = params.active;
    if (params.orderIndex !== undefined) override.orderIndex = params.orderIndex;
    if (params.timeSlots !== undefined) override.timeSlots = params.timeSlots;

    return override;
}

/**
 * Create an attribute override object
 */
export function createAttributeOverride(params: {
    active?: boolean;
    price?: string;
    orderIndex?: number;
}): AttributeOverride {
    const override: AttributeOverride = {};

    if (params.active !== undefined) override.active = params.active;
    if (params.price !== undefined) override.price = params.price;
    if (params.orderIndex !== undefined) override.orderIndex = params.orderIndex;

    return override;
}

// ══════════════════════════════════════════════════════════════════════════
// OVERRIDE COMPARISON
// Check if override is redundant (matches master value)
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if a price override is redundant (same as master price)
 * Per spec Rule C: Redundant override cleanup is safe
 */
export function isPriceOverrideRedundant(
    masterPrice: string | undefined,
    overridePrice: string | undefined,
): boolean {
    return masterPrice === overridePrice;
}

/**
 * Check if an availability override is redundant
 */
export function isAvailabilityOverrideRedundant(
    masterAvailable: boolean | undefined,
    overrideAvailable: boolean | undefined,
): boolean {
    return masterAvailable === overrideAvailable;
}

/**
 * Check if an entire item override is redundant (no real changes)
 * Used for cleanup purposes
 */
export function isItemOverrideEmpty(override: ItemOverride): boolean {
    return (
        override.price === undefined &&
        override.available === undefined &&
        override.active === undefined &&
        override.orderIndex === undefined &&
        override.isBestSeller === undefined &&
        override.duration === undefined &&
        override.ownerBoost === undefined
    );
}

/**
 * Check if an entire category override is redundant (no real changes)
 */
export function isCategoryOverrideEmpty(override: CategoryOverride): boolean {
    return (
        override.active === undefined &&
        override.orderIndex === undefined &&
        override.timeSlots === undefined
    );
}

// ══════════════════════════════════════════════════════════════════════════
// OVERRIDE INITIALIZATION
// Create empty override structures
// ══════════════════════════════════════════════════════════════════════════

/**
 * Create an empty ProjectOverrides object
 */
export function createEmptyOverrides(): ProjectOverrides {
    return {
        items: {},
        categories: {},
        attributes: {},
    };
}

/**
 * Merge new override into existing overrides
 */
export function mergeItemOverride(
    existing: ProjectOverrides,
    itemId: string,
    newOverride: ItemOverride,
): ProjectOverrides {
    return {
        ...existing,
        items: {
            ...existing.items,
            [itemId]: {
                ...existing.items[itemId],
                ...newOverride,
            },
        },
    };
}

/**
 * Remove an item override
 */
export function removeItemOverride(
    existing: ProjectOverrides,
    itemId: string,
): ProjectOverrides {
    const { [itemId]: removed, ...remainingItems } = existing.items;
    return {
        ...existing,
        items: remainingItems,
    };
}
