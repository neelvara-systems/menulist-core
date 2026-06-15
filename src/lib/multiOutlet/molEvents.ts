/**
 * Multi-Store MOL Event Logging
 *
 * Menu Observation Layer events for multi-store actions.
 * Fire-and-forget logging - non-blocking, silent failures.
 *
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md Section 8
 */

import { FEATURE_FLAGS } from "@config/features";
import { logMenuChangeForScope } from "@database/menuChangeLog";
import { secureLog } from "@lib/security/secureLogger";
import { MultiStoreMOLEvent } from "@type/multiOutlet.types";

// ══════════════════════════════════════════════════════════════════════════
// MOL EVENT LOGGING
// Fire-and-forget logging for multi-store actions
// ══════════════════════════════════════════════════════════════════════════

/**
 * Log multi-store event to MOL
 * Fire-and-forget, non-blocking
 */
export async function logMultiOutletEvent(
    event: MultiStoreMOLEvent,
): Promise<void> {
    // Check both feature flags
    if (
        !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
        !FEATURE_FLAGS.ENABLE_MENU_OBSERVATION
    ) {
        secureLog("[MOL] Multi-store event skipped (feature flag off)", {
            type: event.type,
        });
        return;
    }

    try {
        logMenuChangeForScope(
            {
                projectId: event.projectId,
                changeType: "MENU_REVISION_SUMMARY",
                oldValue: null,
                newValue: {
                    source: "multi-outlet",
                    eventType: event.type,
                    metadata: event.metadata || {},
                },
                changedBy: "OWNER",
                userId: event.actorUserId,
                metadata: {
                    source: "multi-outlet",
                    eventType: event.type,
                },
            },
            { tId: event.tId, sId: event.sId },
        ).catch((err) => {
            secureLog("[MOL] Failed to log multi-store event", {
                error: err.message,
            });
        });
    } catch (error) {
        // Silent failure - MOL is non-critical
        secureLog("[MOL] Error preparing multi-store event", { error });
    }
}

// ══════════════════════════════════════════════════════════════════════════
// EVENT BUILDERS
// Helper functions to create properly typed events
// ══════════════════════════════════════════════════════════════════════════

/**
 * Create a store linked to master event
 */
export function createStoreLinkEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    masterProjectId: string,
): MultiStoreMOLEvent {
    return {
        type: "STORE_LINKED_TO_MASTER",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: { masterProjectId },
    };
}

/**
 * Create a store unlinked from master event
 */
export function createStoreUnlinkEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    previousMasterProjectId?: string,
): MultiStoreMOLEvent {
    return {
        type: "STORE_UNLINKED_FROM_MASTER",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: previousMasterProjectId ? { previousMasterProjectId } : undefined,
    };
}

/**
 * Create a store switched master event
 */
export function createStoreSwitchMasterEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    newMasterProjectId: string,
    previousMasterProjectId?: string,
): MultiStoreMOLEvent {
    return {
        type: "STORE_SWITCHED_MASTER",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: {
            newMasterProjectId,
            previousMasterProjectId,
        },
    };
}

/**
 * Create an override applied event
 */
export function createOverrideAppliedEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    itemId: string,
    overrideType: "price" | "availability" | "active" | "multiple",
    newValue?: unknown,
    oldValue?: unknown,
): MultiStoreMOLEvent {
    return {
        type: "STORE_OVERRIDE_APPLIED",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: {
            itemId,
            overrideType,
            newValue,
            oldValue,
        },
    };
}

/**
 * Create an override removed event
 */
export function createOverrideRemovedEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    itemId: string,
): MultiStoreMOLEvent {
    return {
        type: "STORE_OVERRIDE_REMOVED",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: { itemId },
    };
}

/**
 * Create a local item added event
 */
export function createLocalItemAddedEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    itemId: string,
    itemName?: string,
): MultiStoreMOLEvent {
    return {
        type: "STORE_LOCAL_ITEM_ADDED",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: {
            itemId,
            itemName,
        },
    };
}

/**
 * Create a local category added event
 */
export function createLocalCategoryAddedEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    categoryId: string,
    categoryName?: string,
): MultiStoreMOLEvent {
    return {
        type: "STORE_LOCAL_CATEGORY_ADDED",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: {
            categoryId,
            categoryName,
        },
    };
}

/**
 * Create a master menu updated event
 */
export function createMasterMenuUpdatedEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    changeType:
        | "item_added"
        | "item_removed"
        | "item_updated"
        | "category_changed",
    affectedItemIds?: string[],
): MultiStoreMOLEvent {
    return {
        type: "MASTER_MENU_UPDATED",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: {
            changeType,
            affectedItemIds,
        },
    };
}

/**
 * Create a master update acknowledged event
 * Logged when outlet owner clicks "Got it" on the awareness banner.
 */
export function createAcknowledgeEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    masterProjectId: string,
    acknowledgedVersion: number,
    changeCount: number,
): MultiStoreMOLEvent {
    return {
        type: "MASTER_UPDATE_ACKNOWLEDGED",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: {
            masterProjectId,
            acknowledgedVersion,
            changeCount,
        },
    };
}

/**
 * Create a propagation completed event
 */
export function createPropagationCompletedEvent(
    tId: number,
    sId: number,
    projectId: string,
    actorUserId: string,
    affectedStores: number[],
): MultiStoreMOLEvent {
    return {
        type: "MASTER_PROPAGATION_COMPLETED",
        tId,
        sId,
        projectId,
        actorUserId,
        metadata: {
            affectedStores,
            storeCount: affectedStores.length,
        },
    };
}
