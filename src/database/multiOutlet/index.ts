/**
 * Multi-Outlet Database Access Layer
 *
 * DAL functions for multi-store brand consistency feature.
 * All functions are feature-flag gated.
 *
 * @see __docs__/multi-outlet-consistency/multi-outlet-consistency_impl.md Section 7
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { getProjectDataByStore } from "@database/projects";
import { replaceUndefined } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from "@lib/auth/getActiveSession";
import {
    revalidatePublicClientCache,
    revalidatePublicClientCacheForProject,
} from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    createOverrideAppliedEvent,
    createStoreLinkEvent,
    createStoreSwitchMasterEvent,
    createStoreUnlinkEvent,
    logMultiOutletEvent,
} from "@lib/multiOutlet/molEvents";
import { createEmptyOverrides } from "@lib/multiOutlet/overrideUtils";
import { parseProjectId } from "@lib/multiOutlet/resolveProject";
import {
    CategoryOverride,
    ItemOverride,
    ProjectOverrides,
} from "@template/main-app/projects/types/project.types";
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";

const COLLECTION = DB_COLLECTIONS.PROJECTS;

// ══════════════════════════════════════════════════════════════════════════
// MASTER PROJECT OPERATIONS
// Designate and manage master projects
// ══════════════════════════════════════════════════════════════════════════

/**
 * Set a project as master (source of truth for linked outlets)
 *
 * Per spec:
 * - isMaster = true
 * - masterProjectId removed (master cannot link to another master)
 * - overrides removed (master never has overrides)
 *
 * ⚠️ FEATURE FLAG GATED: ENABLE_CHANGE_MASTER_STORE
 * If a master already exists and this flag is false, changing master is blocked.
 *
 * @throws Error if multi-outlet feature is disabled
 * @throws Error if project not found
 * @throws Error if project is multi-file (single-file constraint)
 * @throws Error if changing master when ENABLE_CHANGE_MASTER_STORE is false
 */
export const setProjectAsMaster = async (
    projectId: string,
    options?: { force?: boolean },
) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const projectRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                projectId,
            );

            const projectSnap = await getDoc(projectRef);

            if (!projectSnap.exists()) {
                throw new Error("Project not found");
            }

            const projectData = projectSnap.data();

            // Already a master - no action needed
            if (projectData.isMaster === true) {
                return { success: true, alreadyMaster: true };
            }

            // Single-file constraint for master projects
            if (projectData.files?.length > 1) {
                throw new Error(
                    "Master project must be single-file menu. Multi-file menus cannot be designated as master.",
                );
            }

            // If project was linked to a master, check if changing master is allowed
            if (
                projectData.masterProjectId &&
                !FEATURE_FLAGS.ENABLE_CHANGE_MASTER_STORE &&
                !options?.force
            ) {
                throw new Error(
                    "Cannot change master designation. This project is linked to another master. " +
                    "Enable ENABLE_CHANGE_MASTER_STORE flag or unlink first.",
                );
            }

            // Update project to be master
            const updateData = {
                isMaster: true,
                masterProjectId: deleteField(), // Master cannot link to another master
                overrides: deleteField(), // Master never has overrides
            };

            await updateDoc(projectRef, updateData);
            await revalidatePublicClientCacheForProject(projectId, "setProjectAsMaster");

            // Log MOL event
            await logMultiOutletEvent({
                type: "MASTER_MENU_UPDATED",
                tId: session.tId,
                sId: session.sId,
                projectId: projectId,
                actorUserId: session.uId,
                metadata: {
                    action: "designated_as_master",
                    previousMasterProjectId: projectData.masterProjectId || null,
                },
            });

            return { success: true };
        },
        { projectId },
        "setProjectAsMaster",
    );
};

/**
 * Remove master designation from a project
 *
 * ⚠️ CRITICAL: This should only be used when:
 * 1. No outlets are linked to this master (use hasLinkedOutlets() to check)
 * 2. Admin is restructuring the chain
 *
 * @throws Error if multi-outlet feature is disabled
 * @throws Error if project has linked outlets (use hasLinkedOutlets() first)
 */
export const unsetProjectAsMaster = async (projectId: string) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            // Check if outlets are linked to this master
            const linkedOutlets = await hasLinkedOutlets(projectId);
            if (linkedOutlets) {
                throw new Error(
                    "Cannot remove master designation: outlets are still linked. " +
                    "Unlink or reassign all outlets first.",
                );
            }

            const projectRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                projectId,
            );

            const projectSnap = await getDoc(projectRef);

            if (!projectSnap.exists()) {
                throw new Error("Project not found");
            }

            const projectData = projectSnap.data();

            // Not a master - no action needed
            if (projectData.isMaster !== true) {
                return { success: true, wasNotMaster: true };
            }

            // Remove master designation
            await updateDoc(projectRef, {
                isMaster: deleteField(),
            });
            await revalidatePublicClientCacheForProject(projectId, "removeMasterDesignation");

            // Log MOL event
            await logMultiOutletEvent({
                type: "MASTER_MENU_UPDATED",
                tId: session.tId,
                sId: session.sId,
                projectId: projectId,
                actorUserId: session.uId,
                metadata: {
                    action: "master_designation_removed",
                },
            });

            return { success: true };
        },
        { projectId },
        "unsetProjectAsMaster",
    );
};

// ══════════════════════════════════════════════════════════════════════════
// STORE LINKING OPERATIONS
// Connect and disconnect stores from master projects
// ══════════════════════════════════════════════════════════════════════════

/**
 * Link store project to master project
 *
 * NOTE: tId and sId extracted from masterProjectId format.
 * No need to pass them separately.
 *
 * @throws Error if multi-outlet feature is disabled
 * @throws Error if master project not found
 * @throws Error if master project is multi-file
 * @throws Error if store project is multi-file
 */
export const linkStoreToMaster = async (
    storeProjectId: string,
    masterProjectId: string,
) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            // Extract tId and sId from masterProjectId format: {tId}-{timestamp}-{sId}
            const { tId, sId: masterStoreId } = parseProjectId(masterProjectId);

            // SECURITY: Validate master is within same tenant (prevents cross-tenant access)
            if (tId !== session.tId) {
                throw new Error("Cross-tenant master reference is not allowed");
            }

            // Validate master exists at extracted store
            const masterProject = await getProjectDataByStore(
                tId,
                masterStoreId,
                masterProjectId,
            );

            if (!masterProject) {
                throw new Error("Master project not found");
            }

            // CONSTRAINT: Master must be single-file menu
            if (masterProject.files?.length > 1) {
                throw new Error(
                    "Master project must be single-file. Multi-file projects cannot be masters.",
                );
            }

            // Validate store project is in current session's store
            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            // CONSTRAINT: Store project must also be single-file
            const storeSnap = await getDoc(storeRef);
            if (storeSnap.exists() && storeSnap.data()?.files?.length > 1) {
                throw new Error("Store project must be single-file to link to master.");
            }

            // Master Updates Awareness: Create initial snapshot so outlet
            // has a baseline and doesn't see a banner for pre-existing data.
            // @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md §10.2
            let initialSnapshot: Record<string, unknown> | undefined;
            if (FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS) {
                try {
                    const { createMasterSnapshot } = await import(
                        "@lib/multiOutlet/masterUpdateDiff"
                    );

                    const masterItems =
                        masterProject.files?.flatMap(
                            (f) => f.extractedData?.data?.items || [],
                        ) || [];
                    const masterCategories =
                        masterProject.files?.flatMap(
                            (f) => f.extractedData?.data?.categories || [],
                        ) || [];

                    // Read current operationalVersion from signal doc (if exists)
                    let currentVersion = 0;
                    const signalRef = doc(
                        firebaseClient,
                        DB_COLLECTIONS.MASTER_OPERATIONAL_STATE,
                        masterProjectId,
                    );
                    const signalSnap = await getDoc(signalRef);
                    if (signalSnap.exists()) {
                        currentVersion =
                            signalSnap.data()?.operationalVersion ?? 0;
                    }

                    initialSnapshot = createMasterSnapshot(
                        masterItems,
                        masterCategories,
                        currentVersion,
                        session.uId,
                        null, // No lastDiff on initial link
                    ) as unknown as Record<string, unknown>;
                } catch (e) {
                    // Silent fail — don't block linking
                    console.warn(
                        "[MasterUpdateAwareness] Initial snapshot creation failed (non-blocking):",
                        e,
                    );
                }
            }

            // Store only masterProjectId at top level — tId/sId extracted at read time
            const updateData = replaceUndefined({
                masterProjectId,
                overrides: createEmptyOverrides(),
                ...(initialSnapshot ? { masterSnapshot: initialSnapshot } : {}),
            });

            await updateDoc(storeRef, updateData);
            await revalidatePublicClientCacheForProject(storeProjectId, "linkStoreToMaster");

            // Log MOL event
            await logMultiOutletEvent(
                createStoreLinkEvent(
                    session.tId,
                    session.sId,
                    storeProjectId,
                    session.uId,
                    masterProjectId,
                ),
            );

            return { success: true };
        },
        { storeProjectId, masterProjectId },
        "linkStoreToMaster",
    );
};

/**
 * Switch store from one master to another
 *
 * ✅ FR-11 COMPLIANT: Chain invariant maintained — store always has a master.
 * This is the ONLY way to change a store's master.
 */
export const switchStoreMaster = async (
    storeProjectId: string,
    newMasterProjectId: string,
) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            // Extract tId and sId from newMasterProjectId
            const { tId, sId: newMasterStoreId } = parseProjectId(newMasterProjectId);

            // SECURITY: Validate master is within same tenant (prevents cross-tenant access)
            if (tId !== session.tId) {
                throw new Error("Cross-tenant master reference is not allowed");
            }

            // Validate new master exists
            const newMasterProject = await getProjectDataByStore(
                tId,
                newMasterStoreId,
                newMasterProjectId,
            );

            if (!newMasterProject) {
                throw new Error("New master project not found");
            }

            // Single-file constraint
            if (newMasterProject.files?.length > 1) {
                throw new Error("New master must be single-file menu");
            }

            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            // Get current master for logging
            const storeSnap = await getDoc(storeRef);
            const previousMasterProjectId = storeSnap.data()?.masterProjectId;

            // Master Updates Awareness: Create fresh snapshot for new master baseline
            // Same pattern as linkStoreToMaster — prevents stale diff banners.
            let initialSnapshot: Record<string, unknown> | undefined;
            if (FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS) {
                try {
                    const { createMasterSnapshot } = await import(
                        "@lib/multiOutlet/masterUpdateDiff"
                    );

                    const masterItems =
                        newMasterProject.files?.flatMap(
                            (f) => f.extractedData?.data?.items || [],
                        ) || [];
                    const masterCategories =
                        newMasterProject.files?.flatMap(
                            (f) => f.extractedData?.data?.categories || [],
                        ) || [];

                    let currentVersion = 0;
                    const signalRef = doc(
                        firebaseClient,
                        DB_COLLECTIONS.MASTER_OPERATIONAL_STATE,
                        newMasterProjectId,
                    );
                    const signalSnap = await getDoc(signalRef);
                    if (signalSnap.exists()) {
                        currentVersion =
                            signalSnap.data()?.operationalVersion ?? 0;
                    }

                    initialSnapshot = createMasterSnapshot(
                        masterItems,
                        masterCategories,
                        currentVersion,
                        session.uId,
                        null,
                    ) as unknown as Record<string, unknown>;
                } catch (e) {
                    console.warn(
                        "[MasterUpdateAwareness] Switch master snapshot failed (non-blocking):",
                        e,
                    );
                }
            }

            // Update store to point to new master (clears old overrides)
            const updateData = replaceUndefined({
                masterProjectId: newMasterProjectId,
                overrides: createEmptyOverrides(), // Fresh start with new master
                ...(initialSnapshot ? { masterSnapshot: initialSnapshot } : {}),
            });

            await updateDoc(storeRef, updateData);
            await revalidatePublicClientCacheForProject(storeProjectId, "switchStoreMaster");

            // Log MOL event
            await logMultiOutletEvent(
                createStoreSwitchMasterEvent(
                    session.tId,
                    session.sId,
                    storeProjectId,
                    session.uId,
                    newMasterProjectId,
                    previousMasterProjectId,
                ),
            );

            return { success: true };
        },
        { storeProjectId, newMasterProjectId },
        "switchStoreMaster",
    );
};

/**
 * Unlink store from master
 *
 * ⚠️ FEATURE FLAG GATED: ENABLE_UNLINK_FROM_MASTER
 * By default, stores cannot unlink from master (chain invariant).
 * Enable only if client requests standalone store capability.
 */
export const unlinkStoreFromMaster = async (storeProjectId: string) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    if (!FEATURE_FLAGS.ENABLE_UNLINK_FROM_MASTER) {
        throw new Error("Unlinking from master is disabled. Contact support.");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            // Get current master for logging
            const storeSnap = await getDoc(storeRef);
            const previousMasterProjectId = storeSnap.data()?.masterProjectId;

            // Remove masterProjectId — store becomes standalone
            // Keep overrides in case they re-link later
            // Clear masterSnapshot — stale once unlinked (no master to diff against)
            await updateDoc(storeRef, {
                masterProjectId: null,
                masterSnapshot: null,
            });
            await revalidatePublicClientCacheForProject(storeProjectId, "unlinkStoreFromMaster");

            // Log MOL event
            await logMultiOutletEvent(
                createStoreUnlinkEvent(
                    session.tId,
                    session.sId,
                    storeProjectId,
                    session.uId,
                    previousMasterProjectId,
                ),
            );

            return { success: true };
        },
        { storeProjectId },
        "unlinkStoreFromMaster",
    );
};

// ══════════════════════════════════════════════════════════════════════════
// OVERRIDE OPERATIONS
// Apply and remove overrides on store projects
// ══════════════════════════════════════════════════════════════════════════

/**
 * Apply item override to store project
 *
 * ⚠️ CRITICAL: Validates item exists in master before writing override.
 * This prevents garbage overrides for non-existent items.
 */
export const applyItemOverride = async (
    storeProjectId: string,
    itemId: string,
    override: ItemOverride,
) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            // Get store project to find master reference
            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );
            const storeSnap = await getDoc(storeRef);

            if (!storeSnap.exists()) {
                throw new Error("Store project not found");
            }

            const storeData = storeSnap.data();
            const masterProjectId = storeData.masterProjectId;

            if (!masterProjectId) {
                throw new Error("Store is not linked to a master");
            }

            // Extract tId and sId from masterProjectId format
            const { tId, sId: masterStoreId } = parseProjectId(masterProjectId);

            // SECURITY: Validate master is within same tenant (prevents cross-tenant access)
            if (tId !== session.tId) {
                throw new Error("Cross-tenant master reference is not allowed");
            }

            // CRITICAL: Validate item exists in master before allowing override
            const masterProject = await getProjectDataByStore(
                tId,
                masterStoreId,
                masterProjectId,
            );

            const masterItems =
                masterProject.files?.flatMap(
                    (f: any) => f.extractedData?.data?.items || [],
                ) || [];
            const masterItemIds = new Set(masterItems.map((i: any) => i.id));

            if (!masterItemIds.has(itemId)) {
                throw new Error(
                    `Cannot override item "${itemId}": Item does not exist in master. ` +
                    `For local-only items, add directly to store's extractedData.`,
                );
            }

            // Get old value for logging
            const oldOverride = storeData.overrides?.items?.[itemId];

            // Write override
            const updateData = replaceUndefined({
                [`overrides.items.${itemId}`]: override,
            });

            await updateDoc(storeRef, updateData);
            await revalidatePublicClientCacheForProject(storeProjectId, "applyItemOverride");

            // Log MOL event
            await logMultiOutletEvent(
                createOverrideAppliedEvent(
                    session.tId,
                    session.sId,
                    storeProjectId,
                    session.uId,
                    itemId,
                    override.price !== undefined
                        ? "price"
                        : override.available !== undefined
                            ? "availability"
                            : override.active !== undefined
                                ? "active"
                                : "multiple",
                    override,
                    oldOverride,
                ),
            );

            return { success: true };
        },
        { storeProjectId, itemId, override },
        "applyItemOverride",
    );
};

/**
 * Apply category override to store project
 */
export const applyCategoryOverride = async (
    storeProjectId: string,
    categoryId: string,
    override: CategoryOverride,
) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            const updateData = replaceUndefined({
                [`overrides.categories.${categoryId}`]: override,
            });

            await updateDoc(storeRef, updateData);
            await revalidatePublicClientCacheForProject(storeProjectId, "applyCategoryOverride");

            return { success: true };
        },
        { storeProjectId, categoryId, override },
        "applyCategoryOverride",
    );
};

/**
 * Remove item override (revert to master value)
 */
export const removeItemOverride = async (
    storeProjectId: string,
    itemId: string,
) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            // Get current overrides
            const storeSnap = await getDoc(storeRef);
            const currentOverrides: ProjectOverrides =
                storeSnap.data()?.overrides || createEmptyOverrides();

            // Remove the item override
            const { [itemId]: removed, ...remainingItems } = currentOverrides.items;

            const updateData = replaceUndefined({
                overrides: {
                    ...currentOverrides,
                    items: remainingItems,
                },
            });

            await updateDoc(storeRef, updateData);
            await revalidatePublicClientCacheForProject(storeProjectId, "removeItemOverride");

            return { success: true };
        },
        { storeProjectId, itemId },
        "removeItemOverride",
    );
};

/**
 * Remove category override (revert to master value)
 */
export const removeCategoryOverride = async (
    storeProjectId: string,
    categoryId: string,
) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            // Get current overrides
            const storeSnap = await getDoc(storeRef);
            const currentOverrides: ProjectOverrides =
                storeSnap.data()?.overrides || createEmptyOverrides();

            // Remove the category override
            const { [categoryId]: removed, ...remainingCategories } =
                currentOverrides.categories;

            const updateData = replaceUndefined({
                overrides: {
                    ...currentOverrides,
                    categories: remainingCategories,
                },
            });

            await updateDoc(storeRef, updateData);
            await revalidatePublicClientCacheForProject(storeProjectId, "removeCategoryOverride");

            return { success: true };
        },
        { storeProjectId, categoryId },
        "removeCategoryOverride",
    );
};

// ══════════════════════════════════════════════════════════════════════════
// QUERY OPERATIONS
// Get linked stores and related data
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if a store project is linked to a master
 */
export const isStoreLinkedToMaster = async (
    storeProjectId: string,
): Promise<boolean> => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return false;
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            const storeSnap = await getDoc(storeRef);
            return !!storeSnap.data()?.masterProjectId;
        },
        { storeProjectId },
        "isStoreLinkedToMaster",
    );
};

/**
 * Get the master project ID for a store project
 */
export const getMasterProjectId = async (
    storeProjectId: string,
): Promise<string | null> => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return null;
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            const storeSnap = await getDoc(storeRef);
            return storeSnap.data()?.masterProjectId || null;
        },
        { storeProjectId },
        "getMasterProjectId",
    );
};

// ══════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// Reset and clear operations for multi-outlet
// ══════════════════════════════════════════════════════════════════════════

/**
 * Clear all overrides for a store project (reset to master)
 *
 * This resets all item and category overrides back to master values.
 * Local-only items are preserved.
 */
export const clearAllOverrides = async (storeProjectId: string) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const storeRef = doc(
                firebaseClient,
                `${COLLECTION}/${session.tId}/${session.sId}`,
                storeProjectId,
            );

            // Reset overrides to empty (preserves local-only items in extractedData)
            const updateData = replaceUndefined({
                overrides: createEmptyOverrides(),
            });

            await updateDoc(storeRef, updateData);
            await revalidatePublicClientCacheForProject(storeProjectId, "clearAllOverrides");

            return { success: true };
        },
        { storeProjectId },
        "clearAllOverrides",
    );
};

// ══════════════════════════════════════════════════════════════════════════
// MASTER PROJECT QUERIES
// Functions for checking master project relationships
// ══════════════════════════════════════════════════════════════════════════

/**
 * Check if a project has any linked outlets
 *
 * Used before master deletion to prevent orphaning outlets.
 * NOTE: This is an expensive query - only use for delete protection.
 *
 * OPTIMIZATION OPPORTUNITY:
 * Client-side code can early-exit before calling this function by checking:
 * 1. If tenant has only 1 store (storesList.length === 1) → no outlets possible
 * 2. If no store has isMaster: true → no master projects exist
 * 
 * Use `canHaveLinkedOutlets(tenantDetails)` from this module for client-side check.
 *
 * @returns Array of store IDs that are linked to this master project
 */
export const getLinkedOutletStoreIds = async (
    masterProjectId: string,
): Promise<number[]> => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return [];
    }

    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const { tId } = parseProjectId(masterProjectId);

            // Security: Only allow checking within same tenant
            if (tId !== session.tId) {
                throw new Error("Cross-tenant query not allowed");
            }

            // Query all stores in tenant for projects linked to this master
            // This requires iterating stores - expensive but necessary for delete protection
            const { collection, getDocs, query, where } =
                await import("firebase/firestore");

            const linkedStoreIds: number[] = [];

            // Get stores from platformSummary/storesSummary (single doc for all stores)
            // Then filter by tId to get only this tenant's stores
            const storesSummaryRef = doc(firebaseClient, `${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`,);
            const storesSummarySnap = await getDoc(storesSummaryRef);

            if (!storesSummarySnap.exists()) {
                return [];
            }

            const allStores = storesSummarySnap.data()?.stores || {};
            // Filter stores by tenant ID (storesSummary contains ALL stores across tenants)
            const storeIds = Object.entries(allStores)
                .filter(([_, storeData]: [string, any]) => storeData.tId === tId)
                .map(([sId]) => Number(sId));

            // Check each store for projects linked to this master
            for (const sId of storeIds) {
                const projectsRef = collection(
                    firebaseClient,
                    `${COLLECTION}/${tId}/${sId}`,
                );
                const linkedQuery = query(
                    projectsRef,
                    where("masterProjectId", "==", masterProjectId),
                );
                const linkedSnap = await getDocs(linkedQuery);

                if (!linkedSnap.empty) {
                    linkedStoreIds.push(sId);
                }
            }

            return linkedStoreIds;
        },
        { masterProjectId },
        "getLinkedOutletStoreIds",
    );
};

/**
 * Check if a project is used as a master by any outlets
 */
export const hasLinkedOutlets = async (
    masterProjectId: string,
): Promise<boolean> => {
    const linkedStores = await getLinkedOutletStoreIds(masterProjectId);
    return linkedStores.length > 0;
};

// ══════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE OPTIMIZATION UTILITIES
// Use these before calling expensive DAL queries
// ══════════════════════════════════════════════════════════════════════════

/**
 * Client-side check: Can this tenant have linked outlets?
 * 
 * Use this to early-exit before calling expensive `hasLinkedOutlets()` query.
 * 
 * @param tenantDetails - From PlatformGlobalDataContext
 * @returns true if tenant could have linked outlets (multi-store + has master)
 * 
 * @example
 * ```typescript
 * const { tenantDetails } = useContext(PlatformGlobalDataContext);
 * 
 * // Early exit if no multi-store setup
 * if (!canHaveLinkedOutlets(tenantDetails)) {
 *   // Safe to delete without expensive query
 *   await deleteProject(projectId);
 *   return;
 * }
 * 
 * // Only call expensive query if needed
 * const hasOutlets = await hasLinkedOutlets(projectId);
 * ```
 */
export function canHaveLinkedOutlets(tenantDetails: {
    storesList?: Array<{ isMaster?: boolean }>;
} | null): boolean {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) return false;
    if (!tenantDetails?.storesList) return false;

    // Single store = no multi-chain possible
    if (tenantDetails.storesList.length <= 1) return false;

    // Multiple stores but no master = no linked outlets
    const hasMasterStore = tenantDetails.storesList.some(s => s.isMaster === true);
    return hasMasterStore;
}

// ══════════════════════════════════════════════════════════════════════════
// OUTLET POLICY OPERATIONS
// Update chain-wide outlet policy on master store
// ══════════════════════════════════════════════════════════════════════════

/**
 * Update outlet policy on the master store.
 *
 * Only callable by master store owners. Updates the chain-wide policy
 * that controls what all outlet stores can do.
 *
 * @param storeId - The master store's ID
 * @param policy - Full or partial OutletPolicy to merge
 * @returns { success: true } on success
 * @throws Error if multi-outlet feature is disabled
 */
export const updateOutletPolicy = async (
    storeId: number,
    policy: Partial<import("@type/multiOutlet.types").OutletPolicy>,
) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        throw new Error("Multi-store feature is disabled");
    }

    return await apiCallComposer(
        async () => {
            const storeRef = doc(firebaseClient, `${DB_COLLECTIONS.STORES}`, `${storeId}`);
            const storeSnap = await getDoc(storeRef);

            if (!storeSnap.exists()) {
                throw new Error("Store not found");
            }

            const storeData = storeSnap.data();
            if (!storeData.isMaster) {
                throw new Error("Outlet policy can only be set on master store");
            }

            // Merge with existing policy (or DEFAULT_OUTLET_POLICY if none)
            const { DEFAULT_OUTLET_POLICY } = await import("@type/multiOutlet.types");
            const currentPolicy = storeData.outletPolicy || DEFAULT_OUTLET_POLICY;
            const mergedPolicy = { ...currentPolicy, ...policy };

            await updateDoc(storeRef, { outletPolicy: mergedPolicy });
            await revalidatePublicClientCache(storeId, "updateOutletPolicy");

            return { success: true };
        },
        { storeId, policy },
        "updateOutletPolicy",
    );
};

// ══════════════════════════════════════════════════════════════════════════
// LOCAL-ONLY ITEM/CATEGORY OPERATIONS
// ══════════════════════════════════════════════════════════════════════════
//
// NOTE: Local item/category creation is handled via the UI flow:
// 1. editorOperations.ts - createNewItem/createNewCategory use L_I_/L_C_ prefix
//    when masterProjectId is present
// 2. The existing updateProject DAL handles saving to Firestore
//
// This avoids redundant Firestore reads (project data is already in React state)
// and integrates with the existing sync flow in Editor.tsx
//
// See: src/components/templates/main-app/projects/editorView/utils/editorOperations.ts
// ══════════════════════════════════════════════════════════════════════════
