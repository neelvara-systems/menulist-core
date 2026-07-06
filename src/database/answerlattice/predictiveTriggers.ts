/**
 * Answerlattice — Predictive Triggers DAL (Expansion Item #12)
 * 
 * CRUD operations for predictive support trigger rules.
 * Triggers are stored individually in answerlattice_predictiveTriggers collection
 * and cached as a single platformSummary doc for read-hot-path.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/answerlattice/predictive-support/
 */

import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from "@constant/product";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, where } from "@firebase/firestore";
import { markAnswerlatticeCompiledContextSourceChanged } from '@lib/answerlattice/compiledSourceVersionsClient';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import {
    ANSWERLATTICE_PREDICTIVE_CONSTRAINTS,
    AnswerlatticePredictiveTrigger,
} from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS;
const SUMMARY_COLLECTION = DB_COLLECTIONS.PLATFORM_SUMMARY;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => {
    const normalizedDocId = normalizeAnswerlatticePredictiveTriggerId(docId);
    if (!normalizedDocId) throw new Error('Invalid predictive trigger id');
    return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);
};
const getSummaryDocRef = (tId: number, sId: number) => doc(answerlatticeFirebaseClient, SUMMARY_COLLECTION, `predictiveTriggers_${tId}_${sId}`);

const assertScope = (tId: unknown, sId: unknown) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        throw new Error('Answerlattice predictive trigger scope is not available.');
    }
    return { tId: tenantId, sId: storeId };
};

const resolveTriggerScope = async (
    data?: Partial<AnswerlatticePredictiveTrigger> | null,
    triggerId?: string,
) => {
    const dataTId = Number(data?.tId);
    const dataSId = Number(data?.sId);
    if (Number.isFinite(dataTId) && dataTId > 0 && Number.isFinite(dataSId) && dataSId > 0) {
        return { tId: dataTId, sId: dataSId };
    }

    const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
    if (normalizedTriggerId) {
        const snap = await getDoc(getDocRef(normalizedTriggerId));
        if (snap.exists()) {
            const existing = snap.data() as Partial<AnswerlatticePredictiveTrigger>;
            return assertScope(existing.tId, existing.sId);
        }
    }

    throw new Error('Answerlattice predictive trigger scope is not available.');
};

const rebuildPredictiveTriggerSummary = async (
    scope: { tId: number; sId: number },
    reason: string,
    sourceId?: string,
) => {
    const { tId, sId } = assertScope(scope.tId, scope.sId);
    const snapshot = await getDocs(query(
        getCollectionRef(),
        where('tId', '==', tId),
        where('sId', '==', sId),
        limit(ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT),
    ));
    const triggers: Record<string, AnswerlatticePredictiveTrigger> = {};
    snapshot.docs.forEach((triggerDoc) => {
        triggers[triggerDoc.id] = { ...triggerDoc.data(), id: triggerDoc.id } as AnswerlatticePredictiveTrigger;
    });
    const triggerValues = Object.values(triggers);

    await setDoc(getSummaryDocRef(tId, sId), {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId,
        sId,
        lastUpdated: Timestamp.now(),
        version: Date.now(),
        triggerCount: triggerValues.length,
        activeTriggerCount: triggerValues.filter(trigger => trigger.status === 'active').length,
        triggers,
    });
    await markAnswerlatticeCompiledContextSourceChanged('predictiveTriggers', tId, sId, {
        reason,
        sourceId,
        sourceType: COLLECTION,
    });
};

/**
 * Get all predictive triggers for a tenant+store.
 */
export const getPredictiveTriggers = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('createdOn', 'desc'),
                limit(ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticePredictiveTrigger[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as AnswerlatticePredictiveTrigger);
            });
            return list;
        },
        "getPredictiveTriggers"
    );
};

/**
 * Get suggested (auto-generated) triggers pending review.
 */
export const getSuggestedTriggers = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('status', '==', 'suggested'),
                orderBy('createdOn', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticePredictiveTrigger[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as AnswerlatticePredictiveTrigger);
            });
            return list;
        },
        "getSuggestedTriggers"
    );
};

/**
 * Get a single trigger by ID.
 */
export const getPredictiveTriggerById = async (triggerId: string) => {
    return await apiCallComposer(
        async () => {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) return null;

            const docSnap = await getDoc(getDocRef(normalizedTriggerId));
            if (docSnap.exists()) {
                return { ...docSnap.data(), id: docSnap.id } as AnswerlatticePredictiveTrigger;
            }
            return null;
        },
        "getPredictiveTriggerById"
    );
};

/**
 * Create a new predictive trigger.
 * Enforces max 200 triggers per tenant.
 */
export const addPredictiveTrigger = async (data: Omit<AnswerlatticePredictiveTrigger, 'id'>) => {
    return await apiCallComposer(
        async () => {
            // Validate constraints
            if (data.priority < ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_PRIORITY ||
                data.priority > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_PRIORITY) {
                throw new Error(`Priority must be between ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_PRIORITY} and ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_PRIORITY}`);
            }
            if (data.cooldownHours < ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_COOLDOWN_HOURS ||
                data.cooldownHours > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_COOLDOWN_HOURS) {
                throw new Error(`Cooldown must be between ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_COOLDOWN_HOURS} and ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_COOLDOWN_HOURS} hours`);
            }

            const submitData = await answerlatticeRequestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), submitData);
            await rebuildPredictiveTriggerSummary(assertScope(data.tId, data.sId), 'predictive_trigger_create', docRef.id);
            return { ...submitData, id: docRef.id } as AnswerlatticePredictiveTrigger;
        },
        data,
        "addPredictiveTrigger"
    );
};

/**
 * Update a predictive trigger (merge update).
 */
export const updatePredictiveTrigger = async (data: Partial<AnswerlatticePredictiveTrigger> & { id: string }) => {
    return await apiCallComposer(
        async () => {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(data.id);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            const scopedData = { ...data, id: normalizedTriggerId };
            const scope = await resolveTriggerScope(scopedData, normalizedTriggerId);
            const composedData = await answerlatticeRequestBodyComposer(scopedData);
            await setDoc(getDocRef(normalizedTriggerId), composedData, { merge: true });
            await rebuildPredictiveTriggerSummary(scope, 'predictive_trigger_update', normalizedTriggerId);
            return composedData;
        },
        data,
        "updatePredictiveTrigger"
    );
};

/**
 * Activate a suggested trigger (change status from 'suggested' to 'active').
 * Guard: Only suggested triggers can be activated via this function.
 */
export const activateTrigger = async (triggerId: string) => {
    return await apiCallComposer(
        async () => {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            const docSnap = await getDoc(getDocRef(normalizedTriggerId));
            if (!docSnap.exists()) throw new Error(`Trigger ${normalizedTriggerId} not found`);

            const current = docSnap.data() as AnswerlatticePredictiveTrigger;
            const scope = assertScope(current.tId, current.sId);
            if (current.status !== 'suggested' && current.status !== 'disabled') {
                throw new Error(`Cannot activate trigger in '${current.status}' state — must be 'suggested' or 'disabled'`);
            }

            const composedData = await answerlatticeRequestBodyComposer({ status: 'active' });
            await setDoc(getDocRef(normalizedTriggerId), composedData, { merge: true });
            await rebuildPredictiveTriggerSummary(scope, 'predictive_trigger_activate', normalizedTriggerId);
            return composedData;
        },
        { triggerId },
        "activateTrigger"
    );
};

/**
 * Disable a trigger (set status = 'disabled').
 */
export const disableTrigger = async (triggerId: string) => {
    return await apiCallComposer(
        async () => {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            const scope = await resolveTriggerScope(null, normalizedTriggerId);
            const composedData = await answerlatticeRequestBodyComposer({ status: 'disabled' });
            await setDoc(getDocRef(normalizedTriggerId), composedData, { merge: true });
            await rebuildPredictiveTriggerSummary(scope, 'predictive_trigger_disable', normalizedTriggerId);
            return composedData;
        },
        { triggerId },
        "disableTrigger"
    );
};

/**
 * Hard delete a trigger.
 */
export const deletePredictiveTrigger = async (triggerId: string) => {
    return await apiCallComposer(
        async () => {
            const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
            if (!normalizedTriggerId) throw new Error('Invalid predictive trigger id');

            const scope = await resolveTriggerScope(null, normalizedTriggerId);
            await deleteDoc(getDocRef(normalizedTriggerId));
            await rebuildPredictiveTriggerSummary(scope, 'predictive_trigger_delete', normalizedTriggerId);
            return { deleted: true };
        },
        { triggerId },
        "deletePredictiveTrigger"
    );
};
