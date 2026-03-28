/**
 * Multi-Outlet Module
 *
 * Main entry point for multi-store brand consistency feature.
 * Re-exports all utilities for easy importing.
 *
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md
 */

// Core resolver
export {
    clearMasterCache,
    extractStoreIdFromProjectId, getCategoryInheritanceState, getItemInheritanceState, invalidateMasterCache, isMasterLinked, parseProjectId, populateMasterCache, resolveProjectForRender, type ResolvedProject
} from "./resolveProject";

// Master utilities
export {
    LOCKED_CATEGORY_FIELDS, LOCKED_ITEM_FIELDS, OVERRIDABLE_CATEGORY_FIELDS, OVERRIDABLE_ITEM_FIELDS, canChangeMasterStore,
    canUnlinkFromMaster,
    getMasterStoreIdFromProjectId,
    getTenantIdFromProjectId, isLockedCategoryField, isLockedItemField, isMultiStoreEnabled, isOverridableCategoryField, isOverridableItemField, validateInheritedCategoryEdit, validateInheritedItemEdit
} from "./masterUtils";

// Override utilities
export {
    applyCategoryOverride, applyItemOverride, createAttributeOverride, createCategoryOverride, createEmptyOverrides, createItemOverride, getCategoryOverrideType, getItemOverrideType, hasAttributeOverride, hasCategoryOverride, hasItemOverride, isAvailabilityOverrideRedundant, isCategoryOverrideEmpty, isItemOverrideEmpty, isPriceOverrideRedundant, mergeItemOverride,
    removeItemOverride,
    type OverrideType
} from "./overrideUtils";

// MOL event logging
export {
    createLocalCategoryAddedEvent, createLocalItemAddedEvent, createMasterMenuUpdatedEvent, createOverrideAppliedEvent,
    createOverrideRemovedEvent, createPropagationCompletedEvent, createStoreLinkEvent, createStoreSwitchMasterEvent, createStoreUnlinkEvent, logMultiOutletEvent
} from "./molEvents";

// Master Update Awareness (Feature #4.1)
export {
    buildSummaryText, computeMasterUpdateDiff, createMasterSnapshot, detectOperationalChange, extractCategoriesFromProject, extractItemsFromProject
} from "./masterUpdateDiff";

// Client-side optimization utilities (from DAL)
export { canHaveLinkedOutlets } from "@database/multiOutlet";

