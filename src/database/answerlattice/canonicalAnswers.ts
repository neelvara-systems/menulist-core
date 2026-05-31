/**
 * Answerlattice — Canonical Answer DAL (Knowledge Core)
 * 
 * Pillar 2 of 5 — Governed, versioned, scoped answer assets.
 * 
 * RULES:
 * - entityIds.length ≥ 1 (mandatory)
 * - Only one active answer per entity + scope + version window
 * - Version windows must not overlap
 * - Cannot set status=active if driftFlag=true AND reviewRequired=true
 * - All edits must go through mutation pipeline (no direct edits in production)
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { bumpAnswerlatticeCacheVersion } from "@lib/answerlattice/cacheVersionClient";
import { ANSWERLATTICE_CACHE_SOURCES } from "@lib/answerlattice/cacheVersionManifest";
import { normalizeStepOrder, validateProcedure } from "@lib/answerlattice/procedureValidation";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { AnswerlatticeCanonicalAnswer } from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(answerlatticeFirebaseClient, COLLECTION, docId);

const resolveAnswerScope = async (
    data?: Partial<AnswerlatticeCanonicalAnswer> | null,
    answerId?: string,
) => {
    const dataTId = Number(data?.tId);
    const dataSId = Number(data?.sId);
    if (Number.isFinite(dataTId) && dataTId > 0 && Number.isFinite(dataSId) && dataSId > 0) {
        return { tId: dataTId, sId: dataSId };
    }

    if (answerId) {
        const docSnap = await getDoc(getDocRef(answerId));
        if (docSnap.exists()) {
            const existing = docSnap.data() as Partial<AnswerlatticeCanonicalAnswer>;
            const existingTId = Number(existing.tId);
            const existingSId = Number(existing.sId);
            if (Number.isFinite(existingTId) && existingTId > 0 && Number.isFinite(existingSId) && existingSId > 0) {
                return { tId: existingTId, sId: existingSId };
            }
        }
    }

    return null;
};

const bumpCanonicalAnswerVersion = async (
    data: Partial<AnswerlatticeCanonicalAnswer> | null,
    reason: string,
    answerId?: string,
) => {
    const scope = await resolveAnswerScope(data, answerId);
    if (!scope) {
        throw new Error('Cannot update Answerlattice canonical cache version without tenant and store scope.');
    }

    await bumpAnswerlatticeCacheVersion(ANSWERLATTICE_CACHE_SOURCES.CANONICAL, scope.tId, scope.sId, {
        reason,
        sourceId: answerId,
        sourceType: 'canonical_answer',
    });
};

/**
 * Get all canonical answers for a tenant+store
 */
export const getCanonicalAnswers = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                limit(500)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeCanonicalAnswer[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeCanonicalAnswer);
            });
            return list;
        },
        "getCanonicalAnswers"
    );
};

/**
 * Get active canonical answers for specific entity IDs
 * Used by retrieval pipeline for canonical-first resolution
 */
export const getActiveAnswersForEntity = async (tId: number, sId: number, entityId: string) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('scope.entityIds', 'array-contains', entityId),
                where('status', '==', 'active'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeCanonicalAnswer[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeCanonicalAnswer);
            });
            return list;
        },
        "getActiveAnswersForEntity"
    );
};

/**
 * Get drifted answers requiring review
 */
export const getDriftedAnswers = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('governance.driftFlag', '==', true),
                limit(500)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeCanonicalAnswer[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as AnswerlatticeCanonicalAnswer);
            });
            return list;
        },
        "getDriftedAnswers"
    );
};

/**
 * Get a single canonical answer by ID
 */
export const getCanonicalAnswerById = async (answerId: string) => {
    return await apiCallComposer(
        async () => {
            const docSnap = await getDoc(getDocRef(answerId));
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as AnswerlatticeCanonicalAnswer;
            }
            return null;
        },
        "getCanonicalAnswerById"
    );
};

/**
 * Add a new canonical answer
 * INVARIANT: scope.entityIds.length must be ≥ 1
 */
export const addCanonicalAnswer = async (data: Omit<AnswerlatticeCanonicalAnswer, 'id'>) => {
    return await apiCallComposer(
        async () => {
            if (!data.scope?.entityIds || data.scope.entityIds.length === 0) {
                throw new Error('CanonicalAnswer requires at least one entityId in scope');
            }
            // Guided Workflows: validate procedure structure at write-time
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS && data.content?.procedure) {
                normalizeStepOrder(data.content.procedure);
                const validation = validateProcedure(data.answerType, data.content.procedure);
                if (!validation.valid) {
                    throw new Error(`Procedure validation failed: ${validation.errors.join('; ')}`);
                }
            }
            const submitData = await answerlatticeRequestBodyComposer(data);
            await bumpCanonicalAnswerVersion(submitData as Partial<AnswerlatticeCanonicalAnswer>, 'canonical_answer_create');
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as AnswerlatticeCanonicalAnswer;
        },
        data,
        "addCanonicalAnswer"
    );
};

/**
 * Update a canonical answer (merge update)
 * NOTE: In production, prefer mutation pipeline over direct edits.
 */
export const updateCanonicalAnswer = async (data: Partial<AnswerlatticeCanonicalAnswer> & { id: string }) => {
    return await apiCallComposer(
        async () => {
            // Guided Workflows: validate procedure structure at write-time
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS && data.content?.procedure) {
                normalizeStepOrder(data.content.procedure);
                const validation = validateProcedure(data.answerType, data.content.procedure);
                if (!validation.valid) {
                    throw new Error(`Procedure validation failed: ${validation.errors.join('; ')}`);
                }
            }
            const composedData = await answerlatticeRequestBodyComposer(data);
            await bumpCanonicalAnswerVersion(
                composedData as Partial<AnswerlatticeCanonicalAnswer>,
                'canonical_answer_update',
                data.id,
            );
            await setDoc(getDocRef(data.id), composedData, { merge: true });
            return composedData;
        },
        data,
        "updateCanonicalAnswer"
    );
};

/**
 * Update governance flags on a canonical answer (drift engine use)
 */
export const updateAnswerGovernance = async (
    answerId: string,
    governance: AnswerlatticeCanonicalAnswer['governance']
) => {
    return await apiCallComposer(
        async () => {
            const composedData = await answerlatticeRequestBodyComposer({ governance });
            await bumpCanonicalAnswerVersion(null, 'canonical_answer_governance_update', answerId);
            await setDoc(getDocRef(answerId), composedData, { merge: true });
            return composedData;
        },
        { answerId, governance },
        "updateAnswerGovernance"
    );
};

/**
 * Update signal metrics on a canonical answer
 */
export const updateAnswerSignalMetrics = async (
    answerId: string,
    signalMetrics: AnswerlatticeCanonicalAnswer['signalMetrics']
) => {
    return await apiCallComposer(
        async () => {
            const composedData = await answerlatticeRequestBodyComposer({ signalMetrics });
            await bumpCanonicalAnswerVersion(null, 'canonical_answer_signal_update', answerId);
            await setDoc(getDocRef(answerId), composedData, { merge: true });
            return composedData;
        },
        { answerId, signalMetrics },
        "updateAnswerSignalMetrics"
    );
};
