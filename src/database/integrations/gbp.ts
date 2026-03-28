/**
 * Google Business Profile Integration DAL (Server-Only)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Token storage for GBP OAuth.
 * Path: tenants/{tId}/integrations/gbp/{sId}
 *
 * SECURITY: Tokens are SERVER-ONLY. Never expose to client.
 * Firestore rules must deny all client access to this path.
 *
 * @see __docs__/gbp-sync/GBP_SYNC_impl.md
 * @see __docs__/gbp-sync/GBP_SYNC_spec.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { Timestamp } from "firebase/firestore";

/**
 * GBP Token document structure
 * Stored at: tenants/{tId}/integrations/gbp/{sId}
 */
export interface GBPTokenDoc {
    accessToken: string;
    refreshToken: string;
    expiryDate: number; // epoch ms
    scope: string;
    tokenType: string;

    // Audit fields
    createdOn: Timestamp;
    createdBy: string;
    modifiedOn: Timestamp;
    modifiedBy: string;
}

/**
 * GBP connection status for store document
 * This is the shape of store.gbp field
 */
export interface GBPConnectionStatus {
    isConnected: boolean;
    accountId?: string;
    locationId?: string;
    locationName?: string;
    locationAddress?: string;
    connectedOn?: Timestamp;
    connectedBy?: string;
    modifiedOn?: Timestamp;
    modifiedBy?: string;
    menuLinkMode: "MANAGED" | "OFF";
}

/**
 * GBP sync state for store document
 * This is the shape of store.gbpState field
 */
export interface GBPSyncState {
    lastCheckedOn?: Timestamp;
    expectedUrl?: string;
    currentUrl?: string | null;
    linkStatus: "OK" | "MISSING" | "WRONG" | "UNKNOWN" | "NOT_WRITABLE";
    hoursStatus: "OK" | "MISMATCH" | "UNKNOWN" | "NOT_WRITABLE";
    lastHoursSnapshotHash?: string;
    lastFixAttemptOn?: Timestamp;
    lastFixResult?: "SUCCESS" | "FAILED" | "SKIPPED";
    failureReason?: string;
}

/**
 * Collection path constants
 * Uses DB_COLLECTIONS.INTEGRATIONS for the subcollection
 */
export const GBP_COLLECTION_PATH = {
    /**
     * Token storage path
     * Full path: tenants/{tId}/integrations/gbp/{sId}
     */
    getTokenPath: (tId: string | number, sId: string | number): string => {
        return `tenants/${tId}/${DB_COLLECTIONS.INTEGRATIONS}/gbp/${sId}`;
    },
} as const;

/**
 * ═══════════════════════════════════════════════════════════════════════
 * SERVER-ONLY FUNCTIONS (To be implemented in Phase 1)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * These functions will be implemented after GBP API access is approved.
 * They should only be called from API routes, never from client code.
 *
 * Phase 1 will implement:
 * - saveGBPTokens(tId, sId, tokens) - Save OAuth tokens
 * - getGBPTokens(tId, sId) - Retrieve tokens for API calls
 * - refreshGBPTokens(tId, sId) - Refresh expired tokens
 * - deleteGBPTokens(tId, sId) - Remove tokens on disconnect
 */

// Placeholder exports for Phase 1 implementation
// These will be implemented in api/integrations/gbp/* routes

/**
 * Phase 1: Save GBP OAuth tokens (server-only)
 * @param tId - Tenant ID
 * @param sId - Store ID
 * @param tokens - OAuth tokens from Google
 * @param userId - User who initiated the connection
 */
export async function saveGBPTokens(
    _tId: string | number,
    _sId: string | number,
    _tokens: Omit<
        GBPTokenDoc,
        "createdOn" | "createdBy" | "modifiedOn" | "modifiedBy"
    >,
    _userId: string,
): Promise<void> {
    // TODO: Implement in Phase 1 after GBP API access approved
    throw new Error("GBP Sync not yet implemented. Awaiting API access.");
}

/**
 * Phase 1: Get GBP OAuth tokens (server-only)
 * @param tId - Tenant ID
 * @param sId - Store ID
 * @returns Tokens or null if not connected
 */
export async function getGBPTokens(
    _tId: string | number,
    _sId: string | number,
): Promise<GBPTokenDoc | null> {
    // TODO: Implement in Phase 1 after GBP API access approved
    throw new Error("GBP Sync not yet implemented. Awaiting API access.");
}

/**
 * Phase 1: Refresh expired GBP tokens (server-only)
 * @param tId - Tenant ID
 * @param sId - Store ID
 * @returns New tokens or null if refresh failed
 */
export async function refreshGBPTokens(
    _tId: string | number,
    _sId: string | number,
): Promise<GBPTokenDoc | null> {
    // TODO: Implement in Phase 1 after GBP API access approved
    throw new Error("GBP Sync not yet implemented. Awaiting API access.");
}

/**
 * Phase 1: Delete GBP tokens on disconnect (server-only)
 * @param tId - Tenant ID
 * @param sId - Store ID
 */
export async function deleteGBPTokens(
    _tId: string | number,
    _sId: string | number,
): Promise<void> {
    // TODO: Implement in Phase 1 after GBP API access approved
    throw new Error("GBP Sync not yet implemented. Awaiting API access.");
}
