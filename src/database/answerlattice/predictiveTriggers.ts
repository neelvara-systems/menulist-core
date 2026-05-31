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
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, setDoc, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import {
    ANSWERLATTICE_PREDICTIVE_CONSTRAINTS,
    AnswerlatticePredictiveTrigger,
} from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS;

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getDocRef = (docId: string) => doc(answerlatticeFirebaseClient, COLLECTION, docId);

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
            const docSnap = await getDoc(getDocRef(triggerId));
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
            const composedData = await answerlatticeRequestBodyComposer(data);
            await setDoc(getDocRef(data.id), composedData, { merge: true });
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
            const docSnap = await getDoc(getDocRef(triggerId));
            if (!docSnap.exists()) throw new Error(`Trigger ${triggerId} not found`);

            const current = docSnap.data() as AnswerlatticePredictiveTrigger;
            if (current.status !== 'suggested' && current.status !== 'disabled') {
                throw new Error(`Cannot activate trigger in '${current.status}' state — must be 'suggested' or 'disabled'`);
            }

            const composedData = await answerlatticeRequestBodyComposer({ status: 'active' });
            await setDoc(getDocRef(triggerId), composedData, { merge: true });
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
            const composedData = await answerlatticeRequestBodyComposer({ status: 'disabled' });
            await setDoc(getDocRef(triggerId), composedData, { merge: true });
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
            await deleteDoc(getDocRef(triggerId));
            return { deleted: true };
        },
        { triggerId },
        "deletePredictiveTrigger"
    );
};
