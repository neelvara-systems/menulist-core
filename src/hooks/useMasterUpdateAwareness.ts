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
import {
    createAcknowledgeEvent,
    logMultiOutletEvent,
} from "@lib/multiOutlet/molEvents";
import { getMultiOutletProjectLogContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import { parseProjectId, populateMasterCache } from "@lib/multiOutlet/resolveProject";
import type { Project } from "@template/main-app/projects/types/project.types";
import type {
    MasterOperationalState,
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
    // Ref for acknowledged version — updated after acknowledge() so the
    // onSnapshot listener always compares against the latest baseline,
    // even before SWR re-fetches the outlet project with the new snapshot.
    const acknowledgedVersionRef = useRef<number>(0);

    // ── FETCH MASTER + COMPUTE DIFF ───────────────────────────────

    const computeAndShowDiff = useCallback(async () => {
        // Gate: Must be an outlet project with masterProjectId
        if (!outletProject?.masterProjectId || !outletProject?.projectId) {
            return;
        }

        setIsChecking(true);
        setError(null);

        try {
            // 1. Fetch current master project
            const { tId, sId: masterStoreId } = parseProjectId(
                outletProject.masterProjectId,
            );

            const masterProject = await getProjectDataByStore(
                tId,
                masterStoreId,
                outletProject.masterProjectId,
            );

            masterProjectRef.current = masterProject;

            // Share fetched master with resolver cache so Editor's
            // resolveProjectForRender reuses it (0 extra Firestore reads)
            if (masterProject && outletProject.masterProjectId) {
                populateMasterCache(outletProject.masterProjectId, masterProject);
            }

            if (!masterProject?.files?.length) {
                setShowBanner(false);
                setDiff(null);
                setIsChecking(false);
                return;
            }

            // 2. Get outlet's stored snapshot
            const snapshot = outletProject.masterSnapshot as
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
                outletProject.overrides,
                masterModifiedOn,
            );

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
            logMultiOutletFailure('master_update_awareness_check_failed', err, {
                ...getMultiOutletProjectLogContext(outletProject.projectId, outletProject.masterProjectId),
                acknowledgedVersion: acknowledgedVersionRef.current,
                latestVersion: latestVersionRef.current,
            });
            setError("Failed to check for master updates");
            // Fail open — don't show banner on error
            setShowBanner(false);
        } finally {
            setIsChecking(false);
        }
    }, [outletProject]);

    // ── ACKNOWLEDGE CHANGES ───────────────────────────────────────

    const acknowledge = useCallback(async () => {
        if (!outletProject?.projectId || !masterProjectRef.current) return;

        setIsAcknowledging(true);

        try {
            const session = await getActiveSession();
            const masterProject = masterProjectRef.current;

            // Create new snapshot from current master state
            const currentItems = extractItemsFromProject(masterProject);
            const currentCategories = extractCategoriesFromProject(masterProject);

            // Persist the current diff so "Last changes" link can re-show it
            const diffToStore = diff;

            const newSnapshot = createMasterSnapshot(
                currentItems,
                currentCategories,
                latestVersionRef.current, // Store current operationalVersion
                session?.uId || "unknown",
                diffToStore, // Persist diff for "Last changes" re-view
            );

            // Write snapshot to outlet project document
            // Path: projects/{tId}/{sId}/{projectId} — use OUTLET's own tId/sId
            const { tId, sId } = parseProjectId(outletProject.projectId);
            const projectRef = doc(
                firebaseClient,
                `${DB_COLLECTIONS.PROJECTS}/${tId}/${sId}`,
                outletProject.projectId,
            );

            await updateDoc(projectRef, {
                masterSnapshot: newSnapshot,
            });

            // Update acknowledgedVersion ref so the listener skips
            // signals at or below the just-acknowledged version.
            acknowledgedVersionRef.current = latestVersionRef.current;

            // MOL: Log acknowledge event (fire-and-forget, non-blocking)
            try {
                const { tId, sId } = parseProjectId(outletProject.projectId);
                logMultiOutletEvent(
                    createAcknowledgeEvent(
                        tId,
                        sId,
                        outletProject.projectId,
                        session?.uId || "unknown",
                        outletProject.masterProjectId!,
                        latestVersionRef.current,
                        diffToStore?.changes?.length ?? 0,
                    ),
                );
            } catch (err) {
                // Silent fail — MOL is non-critical
                logMultiOutletFailure('master_update_awareness_acknowledge_event_failed', err, {
                    ...getMultiOutletProjectLogContext(outletProject.projectId, outletProject.masterProjectId),
                    latestVersion: latestVersionRef.current,
                    diffChangeCount: diffToStore?.changes?.length ?? 0,
                });
            }

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
                ...getMultiOutletProjectLogContext(outletProject.projectId, outletProject.masterProjectId),
                latestVersion: latestVersionRef.current,
                hasDiff: Boolean(diff),
                diffChangeCount: diff?.changes?.length ?? 0,
            });
            setError("Failed to acknowledge changes");
        } finally {
            setIsAcknowledging(false);
        }
    }, [outletProject, diff, onProjectUpdate]);

    // ── RECHECK ───────────────────────────────────────────────────

    const recheck = useCallback(() => {
        computeAndShowDiff();
    }, [computeAndShowDiff]);

    // ── LIFECYCLE: onSnapshot LISTENER ────────────────────────────

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
            setShowBanner(false);
            setDiff(null);
            return;
        }

        const snapshot = outletProject.masterSnapshot as MasterSnapshot | undefined;
        const acknowledgedVersion = snapshot?.operationalVersion ?? 0;
        // Sync ref with latest snapshot version (covers SWR re-fetch + initial mount)
        acknowledgedVersionRef.current = acknowledgedVersion;

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

                    const signalData = docSnap.data() as MasterOperationalState;
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
            if (unsubscribe) unsubscribe();
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [outletProject?.projectId, outletProject?.masterProjectId]);

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
