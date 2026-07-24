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
export const MENU_CHANGE_TYPES = [
    "PRICE",
    "AVAILABILITY",
    "ITEM_ADDED",
    "ITEM_REMOVED",
    "ITEM_ACTIVE",
    "CATEGORY_ADDED",
    "CATEGORY_REMOVED",
    "CATEGORY_REORDER",
    "ITEM_REORDER",
    "NAME_CHANGE",
    "DESCRIPTION_CHANGE",
    "IMAGE_CHANGE",
    "STRUCTURE",
    "MENU_REVISION_SUMMARY",
    "PUBLISH",
    "EXTRACTION_CORRECTION",
] as const;

export type MenuChangeType = typeof MENU_CHANGE_TYPES[number];

/**
 * Who made the change
 */
export const MENU_CHANGE_ACTORS = ["OWNER", "STAFF", "SYSTEM"] as const;

export type ChangeActor = typeof MENU_CHANGE_ACTORS[number];

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
    oldValue: unknown;             // Previous value (sanitized)
    newValue: unknown;             // New value (sanitized)
    changedBy: ChangeActor;        // Who made the change
    userId?: string;               // User ID if available
    metadata?: Record<string, unknown>; // Compact source/mode metadata
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
 * Debounce key for change log batching
 * Format: {tId}_{sId}_{projectId}_{itemId}_{changeType}
 */
export type ChangeLogDebounceKey = string;

export interface MenuChangeScope {
    readonly tId: number;
    readonly sId: number;
}

/**
 * Pending change for debounced write
 */
export interface PendingMenuChange {
    entry: MenuChangeLogInput;
    scope: MenuChangeScope;
    debounceKey: ChangeLogDebounceKey;
    queuedAt: number;              // Date.now()
}
