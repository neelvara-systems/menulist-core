/**
 * Menu Observation Layer (MOL v0) Types
 * 
 * Purpose: Silent, backend-only infrastructure for tracking menu changes.
 * This is foundational memory - NO UI, NO owner visibility.
 * 
 * Implements:
 * - Category D (Owner Intervention Tracking) from Internal Tracking System
 * - Category E (Output Stability) via drift counters
 * 
 * @see __docs__/internal-tracking/mol-v0-implementation-plan.md
 * @see __docs__/internal-tracking/menulist-internal-tracking-system.md
 */

import { Timestamp } from "firebase/firestore";

/**
 * Types of menu changes that can be tracked
 */
export type MenuChangeType =
    | "PRICE"              // Price changed
    | "AVAILABILITY"       // Available toggle changed
    | "ITEM_ADDED"         // New item added
    | "ITEM_REMOVED"       // Item deleted
    | "ITEM_ACTIVE"        // Active toggle changed
    | "CATEGORY_ADDED"     // New category
    | "CATEGORY_REMOVED"   // Category deleted
    | "CATEGORY_REORDER"   // Category order changed
    | "ITEM_REORDER"       // Item order changed within category
    | "NAME_CHANGE"        // Item/category name changed
    | "DESCRIPTION_CHANGE" // Item description changed
    | "IMAGE_CHANGE"       // Item image added/removed/changed
    | "STRUCTURE"          // Other structural changes
    | "MENU_REVISION_SUMMARY" // Compact per-save/publish summary
    | "PUBLISH"            // Menu published (canonical truth event)
    | "EXTRACTION_CORRECTION"; // Owner corrected AI-extracted data (Infrastructure Compounding 10.2)

/**
 * Who made the change
 */
export type ChangeActor =
    | "OWNER"   // Business owner
    | "STAFF"   // Team member
    | "SYSTEM"; // Automated (future - AI, scheduled jobs)

/**
 * Immutable log entry for a menu change
 * Path: menuChangeLog/{tId}/{sId}/{entryId}
 */
export interface MenuChangeLogEntry {
    id: string;                    // UUID
    projectId: string;             // Which project/menu
    itemId?: string;               // Which item (null for category/structure changes)
    categoryId?: string;           // Which category (for category-level changes)
    changeType: MenuChangeType;    // What changed
    oldValue: any;                 // Previous value (sanitized)
    newValue: any;                 // New value (sanitized)
    changedBy: ChangeActor;        // Who made the change
    userId?: string;               // User ID if available
    metadata?: Record<string, any>; // Compact source/mode metadata
    timestamp: Timestamp;          // When the change was made

    // Session context (auto-populated by requestBodyComposer pattern)
    tId?: number;
    sId?: number;
}

/**
 * Input for creating a change log entry (without auto-generated fields)
 */
export type MenuChangeLogInput = Omit<MenuChangeLogEntry, 'id' | 'timestamp' | 'tId' | 'sId'>;

/**
 * Denormalized flat view of current item state
 * Path: menuItemState/{tId}/{sId}/{projectId}/items/{itemId}
 * 
 * Purpose: Quick reads without traversing nested project structure
 */
export interface MenuItemState {
    itemId: string;
    projectId: string;
    currentPrice: string | null;
    currentAvailability: boolean;
    currentActive: boolean;
    lastHumanChangeAt: Timestamp | null;
    lastHumanChangeBy: string | null;     // userId
    lastChangeType: MenuChangeType | null;
    updatedAt: Timestamp;

    // Session context
    tId?: number;
    sId?: number;
}

/**
 * Computed drift metrics for pattern detection
 * Path: menuItemState/{tId}/{sId}/{projectId}/metrics/{itemId}
 * 
 * Computed nightly by Cloud Function
 * 
 * CRITICAL: Internal flags (_prefixed) are NEVER exposed to UI
 */
export interface DerivedItemMetrics {
    itemId: string;
    projectId: string;

    // Counters (30-day rolling window)
    priceChangeCount30d: number;
    availabilityToggleCount30d: number;

    // Computed values
    daysSinceLastPriceChange: number | null;
    daysSinceLastAvailabilityChange: number | null;

    // Internal flags (NEVER exposed to UI - for system use only)
    _priceStale: boolean;          // daysSinceLastPriceChange > 180
    _availabilityChurn: boolean;   // toggleCount30d > 10
    _highVolatility: boolean;      // priceChangeCount30d > 5

    // Metadata
    computedAt: Timestamp;
    windowStart: string;           // YYYY-MM-DD
    windowEnd: string;             // YYYY-MM-DD

    // Session context
    tId?: number;
    sId?: number;
}

/**
 * Cost telemetry for Cloud Function monitoring
 * Path: telemetry/costs/{functionName}/{date}
 * 
 * Per Category F of Internal Tracking System
 */
export interface CostTelemetry {
    functionName: string;
    date: string;                  // YYYY-MM-DD
    readsCount: number;
    writesCount: number;
    executionMs: number;
    storesProcessed: number;
    itemsProcessed: number;
    errors: number;
    timestamp: Timestamp;
}

/**
 * Debounce key for change log batching
 * Format: {tId}_{sId}_{projectId}_{itemId}_{changeType}
 */
export type ChangeLogDebounceKey = string;

/**
 * Pending change for debounced write
 */
export interface PendingMenuChange {
    entry: MenuChangeLogInput;
    debounceKey: ChangeLogDebounceKey;
    queuedAt: number;              // Date.now()
}
