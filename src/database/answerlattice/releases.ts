/**
 * Answerlattice — Releases DAL (Version Management)
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
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { markAnswerlatticeCompiledContextSourceChanged } from '@lib/answerlattice/compiledSourceVersionsClient';
import { normalizeAnswerlatticeReleaseId } from '@lib/answerlattice/releaseIdBoundary';
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { AnswerlatticeRelease } from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_RELEASES;
const ANSWERLATTICE_RELEASE_DRIFT_EVALUATION_FAILED = 'ANSWERLATTICE_RELEASE_DRIFT_EVALUATION_FAILED';

type ReleaseActivationErrorLike = Error & {
    code?: unknown;
    status?: unknown;
    statusCode?: unknown;
};

const getReleaseActivationSourceErrorName = (error: unknown): string | undefined => {
    if (error === undefined) return undefined;
    if (error instanceof Error) return error.name || 'Error';
    return typeof error;
};

const getReleaseActivationSourceErrorCode = (error: unknown): string | undefined => {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as ReleaseActivationErrorLike).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
};

const getReleaseActivationSourceStatusCode = (error: unknown): number | undefined => {
    if (!error || typeof error !== 'object') return undefined;
    const statusValue = 'status' in error
        ? (error as ReleaseActivationErrorLike).status
        : (error as ReleaseActivationErrorLike).statusCode;
    const status = Number(statusValue);
    return Number.isFinite(status) ? status : undefined;
};

const getReleaseActivationAuditState = (error: unknown) => {
    const sourceErrorCode = getReleaseActivationSourceErrorCode(error);
    const sourceStatusCode = getReleaseActivationSourceStatusCode(error);

    return {
        failureCode: ANSWERLATTICE_RELEASE_DRIFT_EVALUATION_FAILED,
        sourceErrorName: getReleaseActivationSourceErrorName(error),
        ...(sourceErrorCode ? { sourceErrorCode } : {}),
        ...(sourceStatusCode !== undefined ? { sourceStatusCode } : {}),
    };
};

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => {
    const normalizedDocId = normalizeAnswerlatticeReleaseId(docId);
    if (!normalizedDocId) throw new Error('Invalid Answerlattice release id');
    return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);
};

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
            const list: AnswerlatticeRelease[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeRelease);
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
            return { ...doc.data(), id: doc.id } as AnswerlatticeRelease;
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
            const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);
            if (!normalizedReleaseId) return null;

            const docSnap = await getDoc(getDocRef(normalizedReleaseId));
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as AnswerlatticeRelease;
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
export const addRelease = async (data: Omit<AnswerlatticeRelease, 'id'>) => {
    return await apiCallComposer(
        async () => {
            if (!data.entityChanges || data.entityChanges.length === 0) {
                throw new Error('Release must declare entityChanges[]');
            }
            if (!data.versionNormalized || data.versionNormalized <= 0) {
                throw new Error('Release must have valid versionNormalized');
            }
            const submitData = await answerlatticeRequestBodyComposer({
                ...data,
                status: 'pending', // Always start as pending
            });
            const docRef = await addDoc(getCollectionRef(), submitData);
            await markAnswerlatticeCompiledContextSourceChanged('releases', data.tId, data.sId, {
                reason: 'release_create',
                sourceId: docRef.id,
                sourceType: COLLECTION,
            });
            return { ...submitData, id: docRef.id } as AnswerlatticeRelease;
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
    const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);
    return await apiCallComposer(
        async () => {
            if (!normalizedReleaseId) throw new Error('Invalid Answerlattice release id');

            // 1. Fetch release to get entityChanges + version context
            const releaseSnap = await getDoc(getDocRef(normalizedReleaseId));
            if (!releaseSnap.exists()) {
                throw new Error(`Release ${normalizedReleaseId} not found`);
            }
            const release = { ...releaseSnap.data(), id: releaseSnap.id } as AnswerlatticeRelease;

            // 2. Mark as processing
            await setDoc(getDocRef(normalizedReleaseId), await answerlatticeRequestBodyComposer({ status: 'processing' }), { merge: true });

            // 3. Run drift evaluation with release context (Class A: version drift)
            //    Advisory — flags drifted answers but does not block activation
            try {
                const { evaluateDriftForTenant } = await import('@lib/answerlattice/driftDetection');
                await evaluateDriftForTenant(release.tId, release.sId, {
                    releaseVersion: release.versionNormalized,
                    changedEntityIds: release.entityChanges,
                });
            } catch (error) {
                // Drift evaluation failure must not block release activation
                // Log failure to audit trail for observability
                try {
                    const { addAuditLog } = await import('@database/answerlattice/auditLogs');
                    const { Timestamp } = await import('firebase/firestore');
                    await addAuditLog({
                        tId: release.tId,
                        sId: release.sId,
                        action: 'drift_evaluation_failed',
                        entityType: 'release',
                        entityId: normalizedReleaseId,
                        previousState: null,
                        newState: getReleaseActivationAuditState(error),
                        performedBy: 'system:release_activation',
                        timestamp: Timestamp.now(),
                    });
                } catch (auditLogError) {
                    logRuntimeFailure('answerlattice_release_drift_evaluation_audit_log_failed', auditLogError, {
                        ...getBoundedRuntimeStringContext('releaseId', normalizedReleaseId),
                        ...getBoundedRuntimeStringContext('tenantId', release.tId),
                        ...getBoundedRuntimeStringContext('storeId', release.sId),
                    });
                }
            }

            // 4. Activate
            const composedData = await answerlatticeRequestBodyComposer({ status: 'active' });
            await setDoc(getDocRef(normalizedReleaseId), composedData, { merge: true });
            await markAnswerlatticeCompiledContextSourceChanged('releases', release.tId, release.sId, {
                reason: 'release_activate',
                sourceId: normalizedReleaseId,
                sourceType: COLLECTION,
            });
            return composedData;
        },
        { releaseId: normalizedReleaseId },
        "activateRelease"
    );
};

/**
 * Mark release as processing (drift engine is evaluating)
 */
export const markReleaseProcessing = async (releaseId: string) => {
    const normalizedReleaseId = normalizeAnswerlatticeReleaseId(releaseId);
    return await apiCallComposer(
        async () => {
            if (!normalizedReleaseId) throw new Error('Invalid Answerlattice release id');

            const composedData = await answerlatticeRequestBodyComposer({ status: 'processing' });
            await setDoc(getDocRef(normalizedReleaseId), composedData, { merge: true });
            return composedData;
        },
        { releaseId: normalizedReleaseId },
        "markReleaseProcessing"
    );
};
