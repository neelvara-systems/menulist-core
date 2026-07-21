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
import { addDoc, collection, deleteDoc, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, where } from "@firebase/firestore";
import { markAnswerlatticeCompiledContextSourceChanged } from '@lib/answerlattice/compiledSourceVersionsClient';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { normalizeAnswerlatticePredictiveTriggerId } from '@lib/answerlattice/predictiveTriggerIdBoundary';
import {
    getAnswerlatticePredictiveTimestampMillis,
    normalizeAnswerlatticePredictiveTrigger,
    projectAnswerlatticePredictiveTriggerForRuntime,
} from '@lib/answerlattice/predictiveSupportContracts';
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

const normalizeScopeId = (value: unknown): number | null => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
);

const assertScope = (tId: unknown, sId: unknown) => {
    const tenantId = normalizeScopeId(tId);
    const storeId = normalizeScopeId(sId);
    if (tenantId === null || storeId === null) {
        throw new Error('Answerlattice predictive trigger scope is not available.');
    }
    return { tId: tenantId, sId: storeId };
};

const normalizePredictiveTriggerRecord = (
    triggerId: unknown,
    value: unknown,
    expectedScope?: { tId: number; sId: number },
): AnswerlatticePredictiveTrigger | null => normalizeAnswerlatticePredictiveTrigger({
    id: triggerId,
    value,
    scope: expectedScope,
});

const projectPredictiveTriggerForSummary = (trigger: AnswerlatticePredictiveTrigger): AnswerlatticePredictiveTrigger => {
    return projectAnswerlatticePredictiveTriggerForRuntime(trigger);
};

const isPotentiallyActiveTrigger = (trigger: AnswerlatticePredictiveTrigger, now = Date.now()) => {
    if (trigger.status !== 'active') return false;
    if (trigger.kind !== 'known_issue') return true;
    const startsAt = getAnswerlatticePredictiveTimestampMillis(trigger.knownIssue?.startsAt);
    const endsAt = getAnswerlatticePredictiveTimestampMillis(trigger.knownIssue?.endsAt);
    return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt > now);
};

const resolveTriggerScope = async (triggerId?: string) => {
    const normalizedTriggerId = normalizeAnswerlatticePredictiveTriggerId(triggerId);
    if (normalizedTriggerId) {
        const snap = await getDoc(getDocRef(normalizedTriggerId));
        if (snap.exists()) {
            const existing = normalizePredictiveTriggerRecord(snap.id, snap.data());
            if (existing) return { tId: existing.tId, sId: existing.sId };
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
        limit(ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT + 1),
    ));
    if (snapshot.size > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT) {
        throw new Error('Predictive trigger limit exceeded; the runtime summary was not replaced.');
    }
    const triggers: Record<string, AnswerlatticePredictiveTrigger> = {};
    snapshot.docs.forEach((triggerDoc) => {
        const trigger = normalizePredictiveTriggerRecord(triggerDoc.id, triggerDoc.data(), { tId, sId });
        if (trigger) triggers[triggerDoc.id] = projectPredictiveTriggerForSummary(trigger);
    });
    const triggerValues = Object.values(triggers);

    await setDoc(getSummaryDocRef(tId, sId), {
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId,
        sId,
        lastUpdated: Timestamp.now(),
        version: Date.now(),
        triggerCount: triggerValues.length,
        activeTriggerCount: triggerValues.filter(trigger => isPotentiallyActiveTrigger(trigger)).length,
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
            const scope = assertScope(tId, sId);
            const q = query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                orderBy('createdOn', 'desc'),
                limit(ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT + 1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.size > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT) {
                throw new Error('Predictive trigger limit exceeded; archive or delete triggers before continuing.');
            }
            const list: AnswerlatticePredictiveTrigger[] = [];
            snapshot.forEach((d) => {
                const trigger = normalizePredictiveTriggerRecord(d.id, d.data(), scope);
                if (trigger) list.push(trigger);
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
            const scope = assertScope(tId, sId);
            const q = query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('status', '==', 'suggested'),
                orderBy('createdOn', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticePredictiveTrigger[] = [];
            snapshot.forEach((d) => {
                const trigger = normalizePredictiveTriggerRecord(d.id, d.data(), scope);
                if (trigger) list.push(trigger);
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
                return normalizePredictiveTriggerRecord(docSnap.id, docSnap.data());
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
            const scope = assertScope(data.tId, data.sId);
            // Validate constraints
            if (!Number.isSafeInteger(data.priority) ||
                data.priority < ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_PRIORITY ||
                data.priority > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_PRIORITY) {
                throw new Error(`Priority must be between ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_PRIORITY} and ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_PRIORITY}`);
            }
            if (!Number.isSafeInteger(data.cooldownHours) ||
                data.cooldownHours < ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_COOLDOWN_HOURS ||
                data.cooldownHours > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_COOLDOWN_HOURS) {
                throw new Error(`Cooldown must be between ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_COOLDOWN_HOURS} and ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_COOLDOWN_HOURS} hours`);
            }

            const existingCount = await getCountFromServer(query(
                getCollectionRef(),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
            ));
            if (existingCount.data().count >= ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT) {
                throw new Error(`Predictive support supports up to ${ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_TRIGGERS_PER_TENANT} triggers per workspace.`);
            }

            const candidate = normalizePredictiveTriggerRecord('new_predictive_trigger', {
                ...data,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                ...scope,
                kind: data.kind === 'known_issue' ? 'known_issue' : 'predictive_help',
            }, scope);
            if (!candidate) throw new Error('Predictive trigger is invalid');
            if (candidate.source !== 'manual') throw new Error('Client-created predictive triggers must be manual');
            if (candidate.status === 'active' && !candidate.conditions.page) {
                throw new Error('Set an exact page before activating predictive support.');
            }

            const submitData = await answerlatticeRequestBodyComposer({
                ...scope,
                name: candidate.name,
                description: candidate.description,
                kind: candidate.kind,
                conditions: candidate.conditions,
                action: candidate.action,
                priority: candidate.priority,
                cooldownHours: candidate.cooldownHours,
                status: candidate.status,
                source: candidate.source,
                ...(candidate.knownIssue ? { knownIssue: candidate.knownIssue } : {}),
            }, { isNew: true });
            const docRef = await addDoc(getCollectionRef(), submitData);
            await rebuildPredictiveTriggerSummary(scope, 'predictive_trigger_create', docRef.id);
            const created = normalizePredictiveTriggerRecord(docRef.id, submitData, scope);
            if (!created) throw new Error('Created predictive trigger is invalid');
            return created;
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

            const currentSnap = await getDoc(getDocRef(normalizedTriggerId));
            const current = currentSnap.exists()
                ? normalizePredictiveTriggerRecord(currentSnap.id, currentSnap.data())
                : null;
            if (!current) throw new Error('Predictive trigger ownership is invalid');
            if (
                (data.pId !== undefined && data.pId !== PRODUCT_IDS.ANSWERLATTICE)
                || (data.tId !== undefined && data.tId !== current.tId)
                || (data.sId !== undefined && data.sId !== current.sId)
            ) throw new Error('Predictive trigger scope cannot be changed');
            if (data.kind !== undefined && data.kind !== current.kind) {
                throw new Error('Predictive trigger kind cannot be changed');
            }
            if (data.priority !== undefined && (
                !Number.isSafeInteger(data.priority)
                || data.priority < ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_PRIORITY
                || data.priority > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_PRIORITY
            )) throw new Error('Predictive trigger priority is invalid');
            if (data.cooldownHours !== undefined && (
                !Number.isSafeInteger(data.cooldownHours)
                || data.cooldownHours < ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MIN_COOLDOWN_HOURS
                || data.cooldownHours > ANSWERLATTICE_PREDICTIVE_CONSTRAINTS.MAX_COOLDOWN_HOURS
            )) throw new Error('Predictive trigger cooldown is invalid');

            const scope = { tId: current.tId, sId: current.sId };
            const next = normalizePredictiveTriggerRecord(normalizedTriggerId, {
                ...current,
                ...data,
                pId: PRODUCT_IDS.ANSWERLATTICE,
                ...scope,
            }, scope);
            if (!next) throw new Error('Predictive trigger update is invalid');
            if (next.status === 'active' && !next.conditions.page) {
                throw new Error('Set an exact page before activating predictive support.');
            }
            const patch: Record<string, unknown> = {};
            if (currentSnap.data().kind === undefined) patch.kind = next.kind;
            if (data.name !== undefined) patch.name = next.name;
            if (data.description !== undefined) patch.description = next.description ?? null;
            if (data.conditions !== undefined) patch.conditions = next.conditions;
            if (data.action !== undefined) patch.action = next.action;
            if (data.priority !== undefined) patch.priority = next.priority;
            if (data.cooldownHours !== undefined) patch.cooldownHours = next.cooldownHours;
            if (data.maxImpressionsPerUser !== undefined) patch.maxImpressionsPerUser = next.maxImpressionsPerUser ?? null;
            if (data.status !== undefined) patch.status = next.status;
            if (data.knownIssue !== undefined) patch.knownIssue = next.knownIssue ?? null;
            const composedData = await answerlatticeRequestBodyComposer({ ...patch, ...scope }, { isNew: false });
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
            const normalizedCurrent = normalizePredictiveTriggerRecord(docSnap.id, current);
            if (!normalizedCurrent) throw new Error('Predictive trigger ownership is invalid');
            const scope = { tId: normalizedCurrent.tId, sId: normalizedCurrent.sId };
            if (normalizedCurrent.status !== 'suggested' && normalizedCurrent.status !== 'disabled') {
                throw new Error(`Cannot activate trigger in '${normalizedCurrent.status}' state — must be 'suggested' or 'disabled'`);
            }
            if (!normalizedCurrent.conditions.page) {
                throw new Error('Set an exact page before activating predictive support.');
            }

            const composedData = await answerlatticeRequestBodyComposer({ ...scope, status: 'active' }, { isNew: false });
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

            const scope = await resolveTriggerScope(normalizedTriggerId);
            const composedData = await answerlatticeRequestBodyComposer({ ...scope, status: 'disabled' }, { isNew: false });
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

            const scope = await resolveTriggerScope(normalizedTriggerId);
            await deleteDoc(getDocRef(normalizedTriggerId));
            await rebuildPredictiveTriggerSummary(scope, 'predictive_trigger_delete', normalizedTriggerId);
            return { deleted: true };
        },
        { triggerId },
        "deletePredictiveTrigger"
    );
};
