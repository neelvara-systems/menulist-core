/**
 * Master Project Utilities
 *
 * Helper functions for working with master projects and stores.
 *
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { parseProjectId } from "./resolveProject";

// ══════════════════════════════════════════════════════════════════════════
// LOCKED FIELDS
// Fields that cannot be modified on inherited items
// ══════════════════════════════════════════════════════════════════════════

/**
 * Fields locked on inherited items (brand-critical)
 * Store managers cannot modify these on items inherited from master
 */
export const LOCKED_ITEM_FIELDS = [
    "name",
    "description",
    "images",
    "category",
    "servingInfo",
    "allergens",
    "tags",
] as const;

/**
 * Fields locked on inherited categories
 */
export const LOCKED_CATEGORY_FIELDS = [
    "name",
    "description",
    "images",
] as const;

/**
 * Fields that stores CAN override on inherited items
 */
export const OVERRIDABLE_ITEM_FIELDS = [
    "price",
    "available",
    "active",
    "orderIndex",
    "isBestSeller",
    "duration",
    "ownerBoost",
] as const;

/**
 * Fields that stores CAN override on inherited categories
 */
export const OVERRIDABLE_CATEGORY_FIELDS = [
    "active",
    "orderIndex",
    "timeSlots",
] as const;

// ══════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// Check permissions and field access
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if a field is locked for inherited items
 */
export function isLockedItemField(field: string): boolean {
    return (LOCKED_ITEM_FIELDS as readonly string[]).includes(field);
}

/**
 * Check if a field is locked for inherited categories
 */
export function isLockedCategoryField(field: string): boolean {
    return (LOCKED_CATEGORY_FIELDS as readonly string[]).includes(field);
}

/**
 * Check if a field can be overridden on inherited items
 */
export function isOverridableItemField(field: string): boolean {
    return (OVERRIDABLE_ITEM_FIELDS as readonly string[]).includes(field);
}

/**
 * Check if a field can be overridden on inherited categories
 */
export function isOverridableCategoryField(field: string): boolean {
    return (OVERRIDABLE_CATEGORY_FIELDS as readonly string[]).includes(field);
}

/**
 * Validate that an edit doesn't modify locked fields on inherited items
 * @throws Error if locked field is modified
 */
export function validateInheritedItemEdit<T extends Record<string, unknown>>(
    originalItem: T,
    editedFields: Partial<T>,
    isInheritedItem: boolean,
): void {
    if (!isInheritedItem) return; // Local items can edit anything

    for (const field of LOCKED_ITEM_FIELDS) {
        if (
            field in editedFields &&
            editedFields[field as keyof T] !== originalItem[field as keyof T]
        ) {
            throw new Error(
                `Cannot modify locked field "${field}" on inherited item. ` +
                `Only price, availability, and active status can be changed.`,
            );
        }
    }
}

/**
 * Validate that an edit doesn't modify locked fields on inherited categories
 * @throws Error if locked field is modified
 */
export function validateInheritedCategoryEdit<
    T extends Record<string, unknown>,
>(
    originalCategory: T,
    editedFields: Partial<T>,
    isInheritedCategory: boolean,
): void {
    if (!isInheritedCategory) return; // Local categories can edit anything

    for (const field of LOCKED_CATEGORY_FIELDS) {
        if (
            field in editedFields &&
            editedFields[field as keyof T] !== originalCategory[field as keyof T]
        ) {
            throw new Error(
                `Cannot modify locked field "${field}" on inherited category. ` +
                `Only active status and time slots can be changed.`,
            );
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// MASTER STORE UTILITIES
// Helpers for working with master store designation
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if multi-store feature is enabled
 */
export function isMultiStoreEnabled(): boolean {
    return FEATURE_FLAGS.ENABLE_MULTI_OUTLET;
}

/**
 * Check if changing master store is allowed
 */
export function canChangeMasterStore(): boolean {
    return (
        FEATURE_FLAGS.ENABLE_MULTI_OUTLET &&
        FEATURE_FLAGS.ENABLE_CHANGE_MASTER_STORE
    );
}

/**
 * Check if unlinking from master is allowed
 */
export function canUnlinkFromMaster(): boolean {
    return (
        FEATURE_FLAGS.ENABLE_MULTI_OUTLET && FEATURE_FLAGS.ENABLE_UNLINK_FROM_MASTER
    );
}

/**
 * Get master store ID from a project ID
 * Returns undefined if project is not linked to a master
 */
export function getMasterStoreIdFromProjectId(
    masterProjectId: string | undefined,
): number | undefined {
    if (!masterProjectId) return undefined;
    return parseProjectId(masterProjectId).sId;
}

/**
 * Get tenant ID from a project ID
 */
export function getTenantIdFromProjectId(projectId: string): number {
    return parseProjectId(projectId).tId;
}
