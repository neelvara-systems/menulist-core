"use client";

/**
 * Master Update Awareness Hook
 *
 * Listens to masterOperationalState signal doc via onSnapshot.
 * When operationalVersion increases, fetches master project,
 * computes diff against outlet's stored snapshot, and shows banner.
 *
 * Architecture:
 * 1. Attach onSnapshot listener to masterOperationalState/{masterProjectId}
 * 2. Compare signal.operationalVersion vs snapshot.operationalVersion
 * 3. If version changed: fetch master project (debounced 5s)
 * 4. Compute structured diff (items added/removed, prices, etc.)
 * 5. Show banner with diff summary
 * 6. On acknowledge: write new snapshot + lastDiff to outlet project
 * 7. Cleanup: detach listener on unmount or tab hidden
 *
 * Why onSnapshot on signal doc (not polling master project):
 * - Signal doc is ~100 bytes (vs 200-400KB master project)
 * - Fires ONLY on operational changes (not UI config/theme saves)
 * - At 500 outlets: ~5,000 reads/day vs ~120,000 reads/day with polling
 * - Instant awareness (no 2-minute delay)
 * - No stability window needed (operationalVersion doesn't change on autosave noise)
 *
 * @see __docs__/multi-outlet-consistency/master-updates-awareness_impl.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { getProjectDataByStore } from "@database/projects";
import getActiveSession from "@lib/auth/getActiveSession";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import {
    computeMasterUpdateDiff,
    createMasterSnapshot,
    extractCategoriesFromProject,
    extractItemsFromProject,
} from "@lib/multiOutlet/masterUpdateDiff";
import { parseMasterOperationalState } from "@lib/multiOutlet/masterOperationalState";
import {
    createAcknowledgeEvent,
    logMultiOutletEvent,
} from "@lib/multiOutlet/molEvents";
import { getMultiOutletProjectLogContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import { parseProjectId, populateMasterCache } from "@lib/multiOutlet/resolveProject";
import type { Project } from "@template/main-app/projects/types/project.types";
import type {
    MasterSnapshot,
    MasterUpdateDiff,
} from "@type/multiOutlet.types";
import { doc, onSnapshot, Timestamp, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Debounce for listener callback — prevents wasted computation
 * if master makes rapid operational changes (e.g., adding 5 items quickly).
 * Much simpler than old 30s stability window because operationalVersion
 * only changes on intentional operational saves, not noisy autosaves.
 */
const LISTENER_DEBOUNCE_MS = 5 * 1000;

export interface MasterUpdateAwarenessState {
    /** Whether the banner should be visible */
    showBanner: boolean;

    /** The computed diff (null if no changes or still loading) */
    diff: MasterUpdateDiff | null;

    /** Whether the hook is currently checking for changes */
    isChecking: boolean;

    /** Error message if check failed */
    error: string | null;

    /** Function to acknowledge changes (writes snapshot, hides banner) */
    acknowledge: () => Promise<void>;

    /** Whether acknowledge is in progress */
    isAcknowledging: boolean;

    /** Force re-check for changes */
    recheck: () => void;

    /** Whether there is a previously acknowledged diff available for re-viewing */
    hasHistory: boolean;

    /** The last acknowledged diff (for "Last changes" link re-view) */
    lastDiff: MasterUpdateDiff | null;
}

/**
 * Callback to update outlet project in local state after acknowledge.
 * Fixes SWR stale cache: local activeProject gets new masterSnapshot
 * immediately instead of waiting for SWR re-fetch.
 * Also triggers Editor's resolve useEffect (depends on activeProject).
 */
export type OnProjectUpdate = (updates: Partial<Project>) => void;

/**
 * Hook to detect and display master menu changes for outlet projects.
 *
 * @param outletProject - The current outlet project (null if not loaded)
 * @returns Awareness state for UI rendering
 */
export function useMasterUpdateAwareness(
    outletProject: Project | null,
    onProjectUpdate?: OnProjectUpdate,
): MasterUpdateAwarenessState {
    const [showBanner, setShowBanner] = useState(false);
    const [diff, setDiff] = useState<MasterUpdateDiff | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAcknowledging, setIsAcknowledging] = useState(false);

    // Refs for debounce timer, master project cache, and latest signal version
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const masterProjectRef = useRef<Project | null>(null);
    const latestVersionRef = useRef<number>(0);
    const outletProjectRef = useRef<Project | null>(outletProject);
    const awarenessRequestSequenceRef = useRef(0);
    // Ref for acknowledged version — updated after acknowledge() so the
    // onSnapshot listener always compares against the latest baseline,
    // even before SWR re-fetches the outlet project with the new snapshot.
    const acknowledgedVersionRef = useRef<number>(0);

    // The signal listener is intentionally keyed only by project identity so a
    // normal SWR refresh does not tear down and recreate the Firestore socket.
    // Keep the current project data in a ref so listener callbacks and delayed
    // diff work never retain an old snapshot or old outlet overrides.
    outletProjectRef.current = outletProject;

    // ── FETCH MASTER + COMPUTE DIFF ───────────────────────────────

    const computeAndShowDiff = useCallback(async () => {
        const requestedOutletProject = outletProjectRef.current;

        // Gate: Must be an outlet project with masterProjectId
        if (
            !requestedOutletProject?.masterProjectId
            || !requestedOutletProject.projectId
        ) {
            return;
        }

        const requestSequence = ++awarenessRequestSequenceRef.current;
        const isCurrentRequest = () => {
            const currentOutletProject = outletProjectRef.current;
                return awarenessRequestSequenceRef.current === requestSequence
                && currentOutletProject?.projectId === requestedOutletProject.projectId
                && currentOutletProject?.masterProjectId === requestedOutletProject.masterProjectId;
        };

        setIsChecking(true);
        setError(null);

        try {
            // 1. Fetch current master project
            const { tId, sId: masterStoreId } = parseProjectId(
                requestedOutletProject.masterProjectId,
            );

            const masterProject = await getProjectDataByStore(
                tId,
                masterStoreId,
                requestedOutletProject.masterProjectId,
            );

            if (!isCurrentRequest()) return;

            masterProjectRef.current = masterProject;

            // Share fetched master with resolver cache so Editor's
            // resolveProjectForRender reuses it (0 extra Firestore reads)
            if (masterProject) {
                populateMasterCache(requestedOutletProject.masterProjectId, masterProject);
            }

            if (!masterProject?.files?.length) {
                setShowBanner(false);
                setDiff(null);
                setIsChecking(false);
                return;
            }

            // 2. Get outlet's stored snapshot
            const currentOutletProject = outletProjectRef.current;
            if (!currentOutletProject || !isCurrentRequest()) return;

            const snapshot = currentOutletProject.masterSnapshot as
                | MasterSnapshot
                | undefined;

            // If no snapshot exists — no banner (initial snapshot created on link)
            if (!snapshot) {
                setShowBanner(false);
                setDiff(null);
                setIsChecking(false);
                return;
            }

            // 3. Compute full diff against snapshot
            const currentItems = extractItemsFromProject(masterProject);
            const currentCategories = extractCategoriesFromProject(masterProject);
            const masterModifiedOn = (masterProject as Record<string, unknown>).modifiedOn as Timestamp;

            const computedDiff = computeMasterUpdateDiff(
                snapshot.items,
                snapshot.categories,
                currentItems,
                currentCategories,
                currentOutletProject.overrides,
                masterModifiedOn,
            );

            if (!isCurrentRequest()) return;

            // 4. Update state
            if (computedDiff.hasChanges) {
                setDiff(computedDiff);
                setShowBanner(true);
            } else {
                // Version changed but no operational diff detected
                // (edge case: could happen if changes cancel out)
                setDiff(null);
                setShowBanner(false);
            }
        } catch (err) {
            if (!isCurrentRequest()) return;
            logMultiOutletFailure('master_update_awareness_check_failed', err, {
                ...getMultiOutletProjectLogContext(
                    requestedOutletProject.projectId,
                    requestedOutletProject.masterProjectId,
                ),
                acknowledgedVersion: acknowledgedVersionRef.current,
                latestVersion: latestVersionRef.current,
            });
            setError("Failed to check for master updates");
            // Fail open — don't show banner on error
            setShowBanner(false);
        } finally {
            if (isCurrentRequest()) setIsChecking(false);
        }
    }, []);

    // ── ACKNOWLEDGE CHANGES ───────────────────────────────────────

    const acknowledge = useCallback(async () => {
        const requestedOutletProject = outletProjectRef.current;
        const requestedMasterProject = masterProjectRef.current;
        const requestedOperationalVersion = latestVersionRef.current;
        const requestedDiff = diff;
        if (
            !requestedOutletProject?.projectId
            || !requestedOutletProject.masterProjectId
            || !requestedMasterProject
        ) {
            return;
        }

        const isCurrentAcknowledgement = () => {
            const currentOutletProject = outletProjectRef.current;
            return currentOutletProject?.projectId === requestedOutletProject.projectId
                && currentOutletProject?.masterProjectId === requestedOutletProject.masterProjectId
                && masterProjectRef.current === requestedMasterProject;
        };

        setIsAcknowledging(true);

        try {
            const session = await getActiveSession();
            if (!isCurrentAcknowledgement()) return;
            if (!session) {
                throw new Error("Active outlet session is unavailable");
            }

            const { tId, sId } = parseProjectId(requestedOutletProject.projectId);
            if (String(session.tId) !== String(tId) || String(session.sId) !== String(sId)) {
                throw new Error("Active outlet session changed before acknowledgement");
            }

            // Create new snapshot from current master state
            const currentItems = extractItemsFromProject(requestedMasterProject);
            const currentCategories = extractCategoriesFromProject(requestedMasterProject);

            const newSnapshot = createMasterSnapshot(
                currentItems,
                currentCategories,
                requestedOperationalVersion,
                session?.uId || "unknown",
                requestedDiff,
            );

            // Write snapshot to outlet project document
            // Path: projects/{tId}/{sId}/{projectId} — use OUTLET's own tId/sId
            const projectRef = doc(
                firebaseClient,
                `${DB_COLLECTIONS.PROJECTS}/${tId}/${sId}`,
                requestedOutletProject.projectId,
            );

            await updateDoc(projectRef, {
                masterSnapshot: newSnapshot,
            });

            // MOL: Log acknowledge event (fire-and-forget, non-blocking)
            try {
                logMultiOutletEvent(
                    createAcknowledgeEvent(
                        tId,
                        sId,
                        requestedOutletProject.projectId,
                        session?.uId || "unknown",
                        requestedOutletProject.masterProjectId,
                        requestedOperationalVersion,
                        requestedDiff?.changes?.length ?? 0,
                    ),
                );
            } catch (err) {
                // Silent fail — MOL is non-critical
                logMultiOutletFailure('master_update_awareness_acknowledge_event_failed', err, {
                    ...getMultiOutletProjectLogContext(
                        requestedOutletProject.projectId,
                        requestedOutletProject.masterProjectId,
                    ),
                    latestVersion: requestedOperationalVersion,
                    diffChangeCount: requestedDiff?.changes?.length ?? 0,
                });
            }

            if (!isCurrentAcknowledgement()) return;

            // Update acknowledgedVersion ref so the listener skips
            // signals at or below the just-acknowledged version.
            acknowledgedVersionRef.current = requestedOperationalVersion;

            // Update local activeProject with new snapshot so:
            // 1. hasHistory/lastDiff derive from current data (fixes SWR stale cache)
            // 2. Editor's resolve useEffect re-fires (depends on activeProject)
            //    → resolver hits populated cache → 0 extra Firestore reads
            onProjectUpdate?.({ masterSnapshot: newSnapshot });

            // Hide banner but keep lastDiff accessible for "Last changes" link
            setShowBanner(false);
            setDiff(null);
        } catch (err) {
            logMultiOutletFailure('master_update_awareness_acknowledge_failed', err, {
                ...getMultiOutletProjectLogContext(
                    requestedOutletProject.projectId,
                    requestedOutletProject.masterProjectId,
                ),
                latestVersion: requestedOperationalVersion,
                hasDiff: Boolean(requestedDiff),
                diffChangeCount: requestedDiff?.changes?.length ?? 0,
            });
            setError("Failed to acknowledge changes");
        } finally {
            setIsAcknowledging(false);
        }
    }, [diff, onProjectUpdate]);

    // ── RECHECK ───────────────────────────────────────────────────

    const recheck = useCallback(() => {
        computeAndShowDiff();
    }, [computeAndShowDiff]);

    // ── LIFECYCLE: onSnapshot LISTENER ────────────────────────────

    // A same-project refresh can advance the locally acknowledged snapshot
    // without changing listener identity. Synchronize that baseline without
    // reconnecting the socket, and clear a now-obsolete pending notification.
    const persistedOperationalVersion = outletProject?.masterSnapshot?.operationalVersion ?? 0;
    useEffect(() => {
        acknowledgedVersionRef.current = persistedOperationalVersion;
        if (latestVersionRef.current <= persistedOperationalVersion) {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            setShowBanner(false);
            setDiff(null);
        }
    }, [persistedOperationalVersion]);

    useEffect(() => {
        // Gate: Feature flags
        if (
            !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
            !FEATURE_FLAGS.ENABLE_MASTER_UPDATE_AWARENESS
        ) {
            return;
        }

        // Gate: Must be an outlet project with masterProjectId
        if (!outletProject?.masterProjectId || !outletProject?.projectId) {
            awarenessRequestSequenceRef.current += 1;
            masterProjectRef.current = null;
            latestVersionRef.current = 0;
            setShowBanner(false);
            setDiff(null);
            return;
        }

        const snapshot = outletProject.masterSnapshot as MasterSnapshot | undefined;
        const acknowledgedVersion = snapshot?.operationalVersion ?? 0;
        // Reset all project-specific state before attaching the new listener.
        // This prevents a previous outlet's banner or fetched master from being
        // actionable during the first snapshot round trip for the new outlet.
        awarenessRequestSequenceRef.current += 1;
        masterProjectRef.current = null;
        latestVersionRef.current = acknowledgedVersion;
        acknowledgedVersionRef.current = acknowledgedVersion;
        setShowBanner(false);
        setDiff(null);
        setError(null);

        // Attach listener to signal doc
        const signalDocRef = doc(
            firebaseClient,
            DB_COLLECTIONS.MASTER_OPERATIONAL_STATE,
            outletProject.masterProjectId,
        );

        // Listener setup extracted so it can be called on attach + re-attach (tab visibility)
        let unsubscribe: (() => void) | null = null;

        const attachListener = () => {
            // Detach any existing listener before re-attaching
            if (unsubscribe) {
                unsubscribe();
                unsubscribe = null;
            }

            unsubscribe = onSnapshot(
                signalDocRef,
                (docSnap) => {
                    if (!docSnap.exists()) {
                        // Signal doc doesn't exist yet (master hasn't been set up)
                        setShowBanner(false);
                        return;
                    }

                    const signalData = parseMasterOperationalState(docSnap.data());
                    if (!signalData) {
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        logMultiOutletFailure(
                            'master_update_awareness_signal_invalid',
                            new Error('Invalid master operational state'),
                            getMultiOutletProjectLogContext(
                                outletProject.projectId,
                                outletProject.masterProjectId,
                            ),
                        );
                        setShowBanner(false);
                        setDiff(null);
                        return;
                    }
                    const incomingVersion = signalData.operationalVersion;
                    latestVersionRef.current = incomingVersion;

                    // Compare against acknowledged version (use ref for latest value)
                    if (incomingVersion <= acknowledgedVersionRef.current) {
                        // No new changes since last acknowledgment
                        setShowBanner(false);
                        setDiff(null);
                        return;
                    }

                    // Version changed — debounce the fetch + diff computation
                    // This handles rapid operational edits (e.g., adding 5 items quickly)
                    if (debounceTimerRef.current) {
                        clearTimeout(debounceTimerRef.current);
                    }

                    debounceTimerRef.current = setTimeout(() => {
                        computeAndShowDiff();
                    }, LISTENER_DEBOUNCE_MS);
                },
                (err) => {
                    logMultiOutletFailure('master_update_awareness_listener_failed', err, {
                        ...getMultiOutletProjectLogContext(outletProject.projectId, outletProject.masterProjectId),
                        acknowledgedVersion: acknowledgedVersionRef.current,
                        latestVersion: latestVersionRef.current,
                    });
                    // Fail open — don't show banner on error
                    setShowBanner(false);
                },
            );
        };

        // Initial attach
        attachListener();

        // Tab visibility: detach when hidden (saves idle socket cost),
        // re-attach + immediate diff check when visible (catches missed changes).
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Tab hidden — detach listener to save resources
                if (unsubscribe) {
                    unsubscribe();
                    unsubscribe = null;
                }
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            } else {
                // Tab visible again — re-attach listener (fires immediately with current state)
                attachListener();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Cleanup: detach listener + remove visibility handler
        return () => {
            awarenessRequestSequenceRef.current += 1;
            if (unsubscribe) unsubscribe();
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [computeAndShowDiff, outletProject?.projectId, outletProject?.masterProjectId]);

    // Derive history state from outlet project's persisted snapshot
    const persistedSnapshot = outletProject?.masterSnapshot as MasterSnapshot | undefined;
    const hasHistory = Boolean(persistedSnapshot?.lastDiff);
    const persistedLastDiff = persistedSnapshot?.lastDiff || null;

    return {
        showBanner,
        diff,
        isChecking,
        error,
        acknowledge,
        isAcknowledging,
        recheck,
        hasHistory,
        lastDiff: persistedLastDiff,
    };
}

export default useMasterUpdateAwareness;
