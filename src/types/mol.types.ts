/**
 * Menu Observation Layer (MOL) Types
 * ═══════════════════════════════════════════════════════════════
 *
 * Immutable audit logging for price changes and system events.
 * Part of Pricing Integrity System (Feature #1).
 *
 * Collection: menuChangeLog/{tId}/{sId}/{eventId}
 * Uses existing DB_COLLECTIONS.MENU_CHANGE_LOG
 */

import { Timestamp } from "firebase/firestore";

/**
 * Types of events logged by MOL
 */
export type MOLEventType =
    | "PRICE_CHANGED"
    | "ATTRIBUTE_PRICE_CHANGED"
    | "TIME_SLOT_CHANGED"
    | "PDF_REGEN_QUEUED"
    | "PDF_REGEN_SUCCESS"
    | "PDF_REGEN_FAILED"
    | "PDF_GENERATED_ON_DEMAND"
    | "SCREEN_CACHE_BUSTED"
    | "HOURS_WEEKLY_UPDATED" // Feature #2A: Hours Status Display
    // Feature #3: GBP Sync
    // @see __docs__/gbp-sync/GBP_SYNC_impl.md
    | "GBP_CONNECTED"
    | "GBP_DISCONNECTED"
    | "GBP_SYNC_CHECKED"
    | "GBP_MENU_LINK_AUTO_FIXED"
    | "GBP_HOURS_MISMATCH_DETECTED"
    | "GBP_HOURS_APPLIED_MANUAL"
    | "GBP_AUTH_REVOKED"
    | "POS_SYNC_SECRET_REGENERATED"
    // AI Extraction
    | "EXTRACTION_APPLIED";

/**
 * Entity types that can trigger MOL events
 */
export type MOLEntityType =
    | "ITEM"
    | "ATTRIBUTE"
    | "CATEGORY"
    | "PRESET"
    | "SYSTEM"
    | "STORE_HOURS" // Feature #2A: Hours Status Display
    | "GBP_INTEGRATION" // Feature #3: GBP Sync
    | "POS_SYNC"
    | "EXTRACTION"; // AI Data Extraction apply

/**
 * MOL Event structure - immutable audit record
 */
export interface MOLEvent {
    /** Unique event ID (auto-generated) */
    id: string;

    /** Type of change/event */
    type: MOLEventType;

    /** Project this event belongs to */
    projectId: string;

    /** User who triggered the change (or 'SYSTEM') */
    actorUserId: string;

    /** Type of entity changed */
    entityType: MOLEntityType;

    /** ID of the specific entity (item, attribute, etc.) */
    entityId: string;

    /** State before change (null for create events) */
    before: Record<string, any> | null;

    /** State after change (null for delete events) */
    after: Record<string, any> | null;

    /** Integrity version at time of event */
    version: number;

    /** Timestamp when event was created */
    createdOn: Timestamp;
}

/**
 * Parameters for logging a MOL event
 */
export interface LogMOLParams {
    type: MOLEventType;
    projectId: string;
    actorUserId: string;
    entityType: MOLEntityType;
    entityId: string;
    before: Record<string, any> | null;
    after: Record<string, any> | null;
    version: number;
    tId: number;
    sId: number;
}
