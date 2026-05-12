/**
 * Canonica — Releases DAL (Version Management)
 * 
 * Append-only product release timeline.
 * Releases are IMMUTABLE after creation.
 * 
 * RULES:
 * - Release timeline is strictly increasing (versionNormalized)
 * - Releases cannot be edited after creation
 * - entityChanges[] must be explicitly declared
 * - Two-phase model: pending → processing → active
 * - Drift engine must process before release becomes active
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from "@firebase/firestore";
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { CanonicaRelease } from "@type/canonica";

const COLLECTION = DB_COLLECTIONS.CANONICA_RELEASES;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(canonicaFirebaseClient, COLLECTION, docId);

/**
 * Get all releases for a tenant+store, ordered by version descending
 */
export const getReleases = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('versionNormalized', 'desc'),
                limit(100)
            );
            const snapshot = await getDocs(q);
            const list: CanonicaRelease[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as CanonicaRelease);
            });
            return list;
        },
        "getReleases"
    );
};

/**
 * Get the latest active release for a tenant+store
 */
export const getLatestRelease = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('status', '==', 'active'),
                orderBy('versionNormalized', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            const doc = snapshot.docs[0];
            return { ...doc.data(), id: doc.id } as CanonicaRelease;
        },
        "getLatestRelease"
    );
};

/**
 * Get a single release by ID
 */
export const getReleaseById = async (releaseId: string) => {
    return await apiCallComposer(
        async () => {
            const docSnap = await getDoc(getDocRef(releaseId));
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as CanonicaRelease;
            }
            return null;
        },
        "getReleaseById"
    );
};

/**
 * Register a new release (append-only, immutable after creation)
 * Starts in 'pending' status — must be activated after drift processing
 */
export const addRelease = async (data: Omit<CanonicaRelease, 'id'>) => {
    return await apiCallComposer(
        async () => {
            if (!data.entityChanges || data.entityChanges.length === 0) {
                throw new Error('Release must declare entityChanges[]');
            }
            if (!data.versionNormalized || data.versionNormalized <= 0) {
                throw new Error('Release must have valid versionNormalized');
            }
            const submitData = await canonicaRequestBodyComposer({
                ...data,
                status: 'pending', // Always start as pending
            });
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as CanonicaRelease;
        },
        data,
        "addRelease"
    );
};

/**
 * Activate a release (after drift engine processing)
 * Only status field can be updated — everything else is immutable
 * 
 * Flow: mark processing → evaluate version drift (Class A) → activate
 * Drift evaluation is advisory — it flags answers but does not block activation.
 */
export const activateRelease = async (releaseId: string) => {
    return await apiCallComposer(
        async () => {
            // 1. Fetch release to get entityChanges + version context
            const releaseSnap = await getDoc(getDocRef(releaseId));
            if (!releaseSnap.exists()) {
                throw new Error(`Release ${releaseId} not found`);
            }
            const release = { ...releaseSnap.data(), id: releaseSnap.id } as CanonicaRelease;

            // 2. Mark as processing
            await setDoc(getDocRef(releaseId), await canonicaRequestBodyComposer({ status: 'processing' }), { merge: true });

            // 3. Run drift evaluation with release context (Class A: version drift)
            //    Advisory — flags drifted answers but does not block activation
            try {
                const { evaluateDriftForTenant } = await import('@lib/canonica/driftDetection');
                await evaluateDriftForTenant(release.tId, release.sId, {
                    releaseVersion: release.versionNormalized,
                    changedEntityIds: release.entityChanges,
                });
            } catch (error) {
                // Drift evaluation failure must not block release activation
                // Log failure to audit trail for observability
                try {
                    const { addAuditLog } = await import('@database/canonica/auditLogs');
                    const { Timestamp } = await import('firebase/firestore');
                    await addAuditLog({
                        tId: release.tId,
                        sId: release.sId,
                        action: 'drift_evaluation_failed',
                        entityType: 'release',
                        entityId: releaseId,
                        previousState: null,
                        newState: { error: error instanceof Error ? error.message : String(error) },
                        performedBy: 'system:release_activation',
                        timestamp: Timestamp.now(),
                    });
                } catch { /* audit log failure must not cascade */ }
            }

            // 4. Activate
            const composedData = await canonicaRequestBodyComposer({ status: 'active' });
            await setDoc(getDocRef(releaseId), composedData, { merge: true });
            return composedData;
        },
        { releaseId },
        "activateRelease"
    );
};

/**
 * Mark release as processing (drift engine is evaluating)
 */
export const markReleaseProcessing = async (releaseId: string) => {
    return await apiCallComposer(
        async () => {
            const composedData = await canonicaRequestBodyComposer({ status: 'processing' });
            await setDoc(getDocRef(releaseId), composedData, { merge: true });
            return composedData;
        },
        { releaseId },
        "markReleaseProcessing"
    );
};
