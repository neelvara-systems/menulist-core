/**
 * Multi-Outlet Types
 *
 * Types for multi-store brand consistency feature (Feature #4).
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md
 */

import {
    ExtractedDataCategory,
    ExtractedDataItem,
} from "@template/main-app/projects/types/extractedData.types";
import { Timestamp } from "firebase/firestore";

// Re-export override types from project types
export type {
    AttributeOverride, CategoryOverride, CategoryTimeSlot, ItemOverride, ProjectOverrides
} from "@template/main-app/projects/types/project.types";

// ══════════════════════════════════════════════════════════════════════════
// RESOLVED PROJECT TYPES
// Used at render time to show merged master + store data
// ══════════════════════════════════════════════════════════════════════════

/**
 * Inheritance state for items and categories
 */
export type InheritanceState = "inherited" | "overridden" | "local-only";

/**
 * Resolved item with inheritance state
 */
export interface ResolvedItem {
    item: ExtractedDataItem;
    inheritanceState: InheritanceState;
    masterPrice?: string; // Original price if overridden
}

/**
 * Resolved category with inheritance state
 */
export interface ResolvedCategory {
    category: ExtractedDataCategory;
    inheritanceState: InheritanceState;
}

/**
 * Resolved project metadata - ephemeral, not persisted
 */
export interface ResolvedProjectMeta {
    isMasterLinked: boolean;
    masterProjectId?: string;
    itemStates: Record<string, InheritanceState>;
    categoryStates: Record<string, InheritanceState>;
    /** Languages available in master project (for outlet language activation) */
    masterProjectLanguages?: string[];
    /** Master prices for overridden items - for visual diff display (FR-8, US-3) */
    masterPrices?: Record<string, string>;
}

// ══════════════════════════════════════════════════════════════════════════
// MOL EVENT TYPES
// Menu Observation Layer events for multi-store actions
// ══════════════════════════════════════════════════════════════════════════

/**
 * Multi-store MOL event types
 */
export type MultiStoreMOLEventType =
    | "MASTER_MENU_UPDATED"      // Master store edited its menu (propagates to outlets)
    | "OUTLET_MENU_UPDATED"      // Outlet store edited local items or overrides
    | "STANDALONE_MENU_UPDATED"  // Single-store (no multi-outlet) edited menu
    | "STORE_LINKED_TO_MASTER"
    | "STORE_UNLINKED_FROM_MASTER"
    | "STORE_SWITCHED_MASTER"
    | "STORE_OVERRIDE_APPLIED"
    | "STORE_OVERRIDE_REMOVED"
    | "STORE_LOCAL_ITEM_ADDED"
    | "STORE_LOCAL_CATEGORY_ADDED"
    | "MASTER_PROPAGATION_COMPLETED"
    | "MASTER_UPDATE_ACKNOWLEDGED";

/**
 * Multi-store MOL event structure
 */
export interface MultiStoreMOLEvent {
    type: MultiStoreMOLEventType;
    tId: number;
    sId: number;
    projectId: string;
    actorUserId: string;
    metadata?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════
// LOCAL ID CONSTANTS
// Prefixes to distinguish local-only items/categories from master items
// ══════════════════════════════════════════════════════════════════════════

/**
 * Local-only ID prefixes
 * These prevent collision between master IDs and store-specific IDs
 */
export const LOCAL_ITEM_PREFIX = "L_I_";
export const LOCAL_CATEGORY_PREFIX = "L_C_";

/**
 * Check if ID is a local-only item
 */
export function isLocalItem(itemId: string): boolean {
    return itemId.startsWith(LOCAL_ITEM_PREFIX);
}

/**
 * Check if ID is a local-only category
 */
export function isLocalCategory(categoryId: string): boolean {
    return categoryId.startsWith(LOCAL_CATEGORY_PREFIX);
}

/**
 * Generate unique local item ID
 */
export function generateLocalItemId(): string {
    return `${LOCAL_ITEM_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate unique local category ID
 */
export function generateLocalCategoryId(): string {
    return `${LOCAL_CATEGORY_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ══════════════════════════════════════════════════════════════════════════
// STORE PERMISSIONS (FR-12)
// Master-controlled permissions for what stores can do
// ══════════════════════════════════════════════════════════════════════════

/**
 * Outlet policy — unified chain-wide gate for outlet capabilities
 * Merged from StorePermissions + OutletCapabilities per architecture audit §2.
 * Stored on: master store doc ONLY (stores/{masterStoreId}.outletPolicy)
 * @see __docs__/multi-outlet-consistency/store-onboarding-architecture-audit.md §2
 */
export interface OutletPolicy {
    priceOverride: boolean;
    availabilityOverride: boolean;
    descriptionOverride: boolean;
    imageOverride: boolean;
    allowLocalItems: boolean;
    allowLocalCategories: boolean;
    allowLocalProjects: boolean;
    allowProjectDeactivate: boolean;
    canUseMenuExtraction: boolean;
    canGenerateDescriptions: boolean;
    canGenerateImages: boolean;
    canOverrideTheme: boolean;
    canOverrideBrandIdentity: boolean;
    canOverrideLayout: boolean;
    canAddLanguages: boolean;
}

/**
 * Default outlet policy (conservative — master controls everything)
 */
export const DEFAULT_OUTLET_POLICY: OutletPolicy = {
    priceOverride: true,
    availabilityOverride: true,
    descriptionOverride: false,
    imageOverride: false,
    allowLocalItems: true,
    allowLocalCategories: true,
    allowLocalProjects: false,
    allowProjectDeactivate: true,
    canUseMenuExtraction: false,
    canGenerateDescriptions: true,
    canGenerateImages: false,
    canOverrideTheme: false,
    canOverrideBrandIdentity: false,
    canOverrideLayout: false,
    canAddLanguages: true,
};

/** @deprecated Use OutletPolicy instead. Kept for backward compatibility. */
export type StorePermissions = OutletPolicy;
/** @deprecated Use DEFAULT_OUTLET_POLICY instead. */
export const DEFAULT_STORE_PERMISSIONS = DEFAULT_OUTLET_POLICY;

// ══════════════════════════════════════════════════════════════════════════
// MASTER UPDATE AWARENESS (Feature #4.1)
// Per-outlet snapshot of master menu state at time of acknowledgment
// @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
// ══════════════════════════════════════════════════════════════════════════

/**
 * Minimal snapshot of a master item — only operational fields
 *
 * Why minimal: Firestore 1MB document limit. A menu with 200 items
 * at ~100 bytes each = ~20KB. Well within limits.
 */
export interface SnapshotItem {
    id: string;
    name: string; // Primary language name only (en)
    price: string; // e.g., "₹899"
    categoryId: string; // Category this item belongs to
    active: boolean; // Whether item is active in master
    available?: boolean; // Sold-out status from master (default true)
    isBestSeller?: boolean; // Bestseller marker from master
    duration?: number; // Prep time in minutes from master
    attributes?: SnapshotAttribute[]; // Variant snapshots
}

/**
 * Minimal snapshot of a master item variant (attribute)
 * Tracks only override-eligible operational fields: active, price
 */
export interface SnapshotAttribute {
    id: string;
    name: string; // Primary language name only (en)
    price: string;
    active: boolean;
}

/**
 * Minimal snapshot of a master category — only operational fields
 */
export interface SnapshotCategory {
    id: string;
    name: string; // Primary language name only (en)
    active: boolean; // Whether category is active in master
}

/**
 * Signal document stored in masterOperationalState/{masterProjectId}.
 * Updated ONLY on operational changes (items/categories/prices).
 * Outlets listen to this via onSnapshot — fires ONLY when real change happens.
 *
 * Collection: masterOperationalState (top-level, NOT nested under tenants)
 * Doc ID: masterProjectId
 */
export interface MasterOperationalState {
    /** Monotonically increasing counter — increments ONLY on operational change */
    operationalVersion: number;

    /** When the last operational change occurred */
    lastUpdatedAt: Timestamp;
}

export interface MasterSnapshot {
    /** When the outlet owner last acknowledged master changes */
    acknowledgedOn: Timestamp;

    /** User ID who acknowledged */
    acknowledgedBy: string;

    /** operationalVersion at time of acknowledgment — sole trigger for awareness */
    operationalVersion: number;

    /** Minimal snapshot of master items at acknowledgment time */
    items: SnapshotItem[];

    /** Minimal snapshot of master categories at acknowledgment time */
    categories: SnapshotCategory[];

    /**
     * Persisted diff from last acknowledgment — enables "Last changes" re-view.
     * Stored so outlet owner can reopen the modal anytime without re-computing.
     * Set to null on initial link (no diff yet).
     */
    lastDiff?: MasterUpdateDiff | null;
}

/**
 * Operational change types that trigger the awareness banner.
 * Cosmetic changes (theme, images, descriptions) are EXCLUDED.
 */
export type OperationalChangeType =
    | "ITEM_ADDED" // New item in master
    | "ITEM_REMOVED" // Item deleted from master
    | "ITEM_PRICE_CHANGED" // Price changed
    | "ITEM_DISABLED" // Item set to active=false
    | "ITEM_ENABLED" // Item set back to active=true
    | "ITEM_AVAILABILITY_CHANGED" // Sold-out status changed (available toggle)
    | "ITEM_BESTSELLER_CHANGED" // Bestseller marker changed
    | "ITEM_DURATION_CHANGED" // Prep time changed
    | "CATEGORY_ADDED" // New category
    | "CATEGORY_REMOVED" // Category deleted
    | "CATEGORY_DISABLED" // Category set to active=false
    | "CATEGORY_ENABLED" // Category set back to active=true
    | "ITEM_MOVED_CATEGORY" // Item changed category
    | "ATTRIBUTE_ADDED" // New variant on item
    | "ATTRIBUTE_REMOVED" // Variant removed from item
    | "ATTRIBUTE_PRICE_CHANGED" // Variant price changed
    | "ATTRIBUTE_DISABLED" // Variant set to active=false
    | "ATTRIBUTE_ENABLED"; // Variant set back to active=true

/**
 * Single operational change with outlet context
 */
export interface OperationalChange {
    type: OperationalChangeType;

    /** Item or category ID */
    entityId: string;

    /** Display name (primary language) */
    entityName: string;

    /** Previous value (for changes, not adds/removes) */
    oldValue?: string;

    /** New value */
    newValue?: string;

    /** Outlet-specific context */
    outletContext?: {
        /** Whether outlet has an override on this item */
        hasOverride: boolean;
        /** What the outlet's override value is (e.g., outlet price) */
        overrideValue?: string;
        /** Human-readable impact description */
        impactNote?: string;
    };
}

/**
 * Complete diff result from awareness computation
 */
export interface MasterUpdateDiff {
    /** Whether there are any operational changes */
    hasChanges: boolean;

    /** Individual changes grouped by type */
    changes: OperationalChange[];

    /** Summary counts for banner display */
    summary: {
        itemsAdded: number;
        itemsRemoved: number;
        priceChanges: number;
        itemsDisabled: number;
        itemsEnabled: number;
        availabilityChanges: number;
        bestsellerChanges: number;
        durationChanges: number;
        categoriesAdded: number;
        categoriesRemoved: number;
        categoriesDisabled: number;
        categoriesEnabled: number;
        itemsMovedCategory: number;
        attributesAdded: number;
        attributesRemoved: number;
        attributePriceChanges: number;
        attributesDisabled: number;
        attributesEnabled: number;
    };

    /** When the master was last modified */
    masterModifiedOn: Timestamp;

    /** Total count of all changes */
    totalChanges: number;
}
