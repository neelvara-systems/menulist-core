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

import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from '@constant/product';
import { collection, doc, getDoc, getDocs, limit, query, where } from "@firebase/firestore";
import { runAnswerlatticeGovernanceAction } from '@lib/answerlattice/governanceClient';
import type { AnswerlatticeCanonicalProposalAnswer } from '@lib/answerlattice/governanceContracts';
import { normalizeAnswerlatticeCanonicalAnswerId, normalizeAnswerlatticeResolvedEntityId } from '@lib/answerlattice/governanceIdBoundary';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import { createRuntimeId } from '@lib/runtime/randomId';
import {
    acquireAnswerlatticePendingMutation,
    settleAnswerlatticePendingMutation,
    type AnswerlatticePendingMutationEntry,
} from '@lib/answerlattice/pendingMutationRequests';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import getActiveSession from '@lib/auth/getActiveSession';
import { AnswerlatticeCanonicalAnswer } from "@type/answerlattice";

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS;
const MAX_PENDING_GOVERNANCE_RETRY_KEYS = 50;
const pendingGovernanceRequestIds = new Map<string, AnswerlatticePendingMutationEntry>();

const stableSerializeGovernancePayload = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(stableSerializeGovernancePayload).join(',')}]`;
    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return `{${Object.keys(record).sort().map(key => (
            `${JSON.stringify(key)}:${stableSerializeGovernancePayload(record[key])}`
        )).join(',')}}`;
    }
    return JSON.stringify(value) ?? String(value);
};

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const getActiveScope = async (expected?: { tId?: unknown; sId?: unknown }) => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) throw new Error('Answerlattice workspace scope is required');
    if (expected?.tId !== undefined && expected.tId !== scope.tenantId) throw new Error('Answerlattice tenant scope mismatch');
    if (expected?.sId !== undefined && expected.sId !== scope.storeId) throw new Error('Answerlattice workspace scope mismatch');
    return { tId: scope.tenantId, sId: scope.storeId };
};
const getDocRef = (docId: string) => {
    const normalizedDocId = normalizeAnswerlatticeCanonicalAnswerId(docId);
    if (!normalizedDocId) throw new Error('Invalid canonical answer id');
    return doc(answerlatticeFirebaseClient, COLLECTION, normalizedDocId);
};

const toProposalAnswer = (
    data: Omit<AnswerlatticeCanonicalAnswer, 'id' | 'pId'> | AnswerlatticeCanonicalAnswer,
): AnswerlatticeCanonicalProposalAnswer => ({
    title: data.title,
    status: data.status,
    answerType: data.answerType || 'explanation',
    scope: data.scope,
    productBinding: data.productBinding,
    content: data.content,
    ...(data.evidence ? { evidence: data.evidence } : {}),
});

/**
 * Get all canonical answers for a tenant+store
 */
export const getCanonicalAnswers = async (tId: number, sId: number) => {
    return await apiCallComposer(
        async () => {
            const scope = await getActiveScope({ tId, sId });
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
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
            const scope = await getActiveScope({ tId, sId });
            const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(entityId);
            if (!normalizedEntityId) return [];

            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('scope.entityIds', 'array-contains', normalizedEntityId),
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
            const scope = await getActiveScope({ tId, sId });
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
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
            const scope = await getActiveScope();
            const normalizedAnswerId = normalizeAnswerlatticeCanonicalAnswerId(answerId);
            if (!normalizedAnswerId) return null;

            const docSnap = await getDoc(getDocRef(normalizedAnswerId));
            if (docSnap.exists()) {
                const answer = { ...docSnap.data(), id: docSnap.id } as AnswerlatticeCanonicalAnswer;
                return answer.pId === PRODUCT_IDS.ANSWERLATTICE
                    && answer.tId === scope.tId
                    && answer.sId === scope.sId
                    ? answer
                    : null;
            }
            return null;
        },
        "getCanonicalAnswerById"
    );
};

/**
 * Submit a new canonical answer to the governed mutation queue.
 * Canonical documents are created only by the server after human approval.
 */
export const proposeCanonicalAnswerCreate = async (data: Omit<AnswerlatticeCanonicalAnswer, 'id' | 'pId'>) => {
    const answer = toProposalAnswer(data);
    const retryKey = `create:${stableSerializeGovernancePayload(answer)}`;
    const claim = acquireAnswerlatticePendingMutation(
        pendingGovernanceRequestIds,
        retryKey,
        retryKey,
        () => createRuntimeId('al_gov'),
        MAX_PENDING_GOVERNANCE_RETRY_KEYS,
    );
    const { requestId } = claim;
    return await apiCallComposer(
        async () => {
            const result = await runAnswerlatticeGovernanceAction({
                action: 'propose_create',
                requestId,
                answer,
            });
            settleAnswerlatticePendingMutation(pendingGovernanceRequestIds, retryKey, claim);
            return result;
        },
        data,
        "proposeCanonicalAnswerCreate"
    );
};

/**
 * Submit a complete canonical answer revision to the governed mutation queue.
 */
export const proposeCanonicalAnswerUpdate = async (data: AnswerlatticeCanonicalAnswer) => {
    const answer = toProposalAnswer(data);
    const retryKey = `update:${data.id}:${stableSerializeGovernancePayload(answer)}`;
    const claim = acquireAnswerlatticePendingMutation(
        pendingGovernanceRequestIds,
        retryKey,
        retryKey,
        () => createRuntimeId('al_gov'),
        MAX_PENDING_GOVERNANCE_RETRY_KEYS,
    );
    const { requestId } = claim;
    return await apiCallComposer(
        async () => {
            const normalizedAnswerId = normalizeAnswerlatticeCanonicalAnswerId(data.id);
            if (!normalizedAnswerId) throw new Error('Invalid canonical answer id');
            const result = await runAnswerlatticeGovernanceAction({
                action: 'propose_update',
                requestId,
                answerId: normalizedAnswerId,
                answer,
            });
            settleAnswerlatticePendingMutation(pendingGovernanceRequestIds, retryKey, claim);
            return result;
        },
        data,
        "proposeCanonicalAnswerUpdate"
    );
};

/** Run deterministic drift evaluation using server-owned workspace inputs. */
export const evaluateCanonicalAnswerDrift = async () => {
    return await apiCallComposer(
        () => runAnswerlatticeGovernanceAction({ action: 'evaluate_drift' }),
        {},
        "evaluateCanonicalAnswerDrift"
    );
};

/**
 * Clear drift only through an auditable server-side validation event.
 */
export const validateCanonicalAnswerDrift = async (answerId: string) => {
    const normalizedAnswerId = normalizeAnswerlatticeCanonicalAnswerId(answerId);
    return await apiCallComposer(
        () => {
            if (!normalizedAnswerId) throw new Error('Invalid canonical answer id');
            return runAnswerlatticeGovernanceAction({
                action: 'validate_drift',
                answerId: normalizedAnswerId,
            });
        },
        { answerId: normalizedAnswerId },
        "validateCanonicalAnswerDrift"
    );
};
