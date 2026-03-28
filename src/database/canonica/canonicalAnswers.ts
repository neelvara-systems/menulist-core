/**
 * Canonica — Canonical Answer DAL (Knowledge Core)
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
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "@firebase/firestore";
import { requestBodyComposer } from "@lib/apiHelper";
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { normalizeStepOrder, validateProcedure } from "@lib/canonica/procedureValidation";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { CanonicaCanonicalAnswer } from "@type/canonica";

const COLLECTION = DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(canonicaFirebaseClient, COLLECTION, docId);

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
            const list: CanonicaCanonicalAnswer[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as CanonicaCanonicalAnswer);
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
            const list: CanonicaCanonicalAnswer[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as CanonicaCanonicalAnswer);
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
            const list: CanonicaCanonicalAnswer[] = [];
            snapshot.forEach((doc) => {
                list.push({ ...doc.data(), id: doc.id } as CanonicaCanonicalAnswer);
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
                return { ...docSnap.data(), id: docSnap.id } as CanonicaCanonicalAnswer;
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
export const addCanonicalAnswer = async (data: Omit<CanonicaCanonicalAnswer, 'id'>) => {
    return await apiCallComposer(
        async () => {
            if (!data.scope?.entityIds || data.scope.entityIds.length === 0) {
                throw new Error('CanonicalAnswer requires at least one entityId in scope');
            }
            // Guided Workflows: validate procedure structure at write-time
            if (FEATURE_FLAGS.ENABLE_CANONICA_GUIDED_WORKFLOWS && data.content?.procedure) {
                normalizeStepOrder(data.content.procedure);
                const validation = validateProcedure(data.answerType, data.content.procedure);
                if (!validation.valid) {
                    throw new Error(`Procedure validation failed: ${validation.errors.join('; ')}`);
                }
            }
            const submitData = await requestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as CanonicaCanonicalAnswer;
        },
        data,
        "addCanonicalAnswer"
    );
};

/**
 * Update a canonical answer (merge update)
 * NOTE: In production, prefer mutation pipeline over direct edits.
 */
export const updateCanonicalAnswer = async (data: Partial<CanonicaCanonicalAnswer> & { id: string }) => {
    return await apiCallComposer(
        async () => {
            // Guided Workflows: validate procedure structure at write-time
            if (FEATURE_FLAGS.ENABLE_CANONICA_GUIDED_WORKFLOWS && data.content?.procedure) {
                normalizeStepOrder(data.content.procedure);
                const validation = validateProcedure(data.answerType, data.content.procedure);
                if (!validation.valid) {
                    throw new Error(`Procedure validation failed: ${validation.errors.join('; ')}`);
                }
            }
            const composedData = await requestBodyComposer(data);
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
    governance: CanonicaCanonicalAnswer['governance']
) => {
    return await apiCallComposer(
        async () => {
            const composedData = await requestBodyComposer({ governance });
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
    signalMetrics: CanonicaCanonicalAnswer['signalMetrics']
) => {
    return await apiCallComposer(
        async () => {
            const composedData = await requestBodyComposer({ signalMetrics });
            await setDoc(getDocRef(answerId), composedData, { merge: true });
            return composedData;
        },
        { answerId, signalMetrics },
        "updateAnswerSignalMetrics"
    );
};
