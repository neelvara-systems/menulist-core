/** Answerlattice entity-candidate review DAL. Generated writes are server-only. */

import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import { normalizeAnswerlatticeEntityCandidateId } from '@lib/answerlattice/entityCandidateIdBoundary';
import {
    normalizeStoredAnswerlatticeEntityCandidate,
} from '@lib/answerlattice/ontologyContracts';
import { runAnswerlatticeOntologyAction } from '@lib/answerlattice/ontologyClient';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import type { AnswerlatticeEntityCandidate } from '@type/answerlattice';
import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_ENTITY_CANDIDATES;
const PENDING_CANDIDATES_LIMIT = 100;

const getActiveScope = async (expected?: { tId?: unknown; sId?: unknown }) => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) throw new Error('Answerlattice workspace scope is required');
    if (expected?.tId !== undefined && expected.tId !== scope.tenantId) throw new Error('Answerlattice tenant scope mismatch');
    if (expected?.sId !== undefined && expected.sId !== scope.storeId) throw new Error('Answerlattice workspace scope mismatch');
    return { tId: scope.tenantId, sId: scope.storeId };
};

export const getEntityCandidates = async (tId: number, sId: number) => apiCallComposer(
    async () => {
        const scope = await getActiveScope({ tId, sId });
        const snapshot = await getDocs(query(
            collection(answerlatticeFirebaseClient, COLLECTION),
            where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            orderBy('confidence', 'desc'),
            limit(200),
        ));
        const candidates = snapshot.docs.map((document) => normalizeStoredAnswerlatticeEntityCandidate(document.data(), document.id));
        if (candidates.some((candidate) => !candidate)) throw new Error('Invalid persisted Answerlattice entity candidate');
        return candidates as AnswerlatticeEntityCandidate[];
    },
    { tId, sId },
    'getEntityCandidates',
);

export const getPendingCandidates = async (tId: number, sId: number) => apiCallComposer(
    async () => {
        const scope = await getActiveScope({ tId, sId });
        const snapshot = await getDocs(query(
            collection(answerlatticeFirebaseClient, COLLECTION),
            where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
            where('tId', '==', scope.tId),
            where('sId', '==', scope.sId),
            where('status', '==', 'pending'),
            orderBy('confidence', 'desc'),
            limit(PENDING_CANDIDATES_LIMIT),
        ));
        const candidates = snapshot.docs.map((document) => normalizeStoredAnswerlatticeEntityCandidate(document.data(), document.id));
        if (candidates.some((candidate) => !candidate)) throw new Error('Invalid persisted Answerlattice entity candidate');
        return candidates as AnswerlatticeEntityCandidate[];
    },
    { tId, sId },
    'getPendingCandidates',
);

export const addEntityCandidate = async (_data: Omit<AnswerlatticeEntityCandidate, 'id'>): Promise<never> => {
    throw new Error('Entity candidates must be generated through a scoped Answerlattice server pipeline.');
};

export const approveCandidateStatus = async (candidateId: string) => promoteCandidate(candidateId);

export const rejectCandidateStatus = async (candidateId: string) => reviewCandidate(candidateId, 'rejected');

export const mergeCandidateStatus = async (candidateId: string) => reviewCandidate(candidateId, 'merged');

const reviewCandidate = async (candidateId: string, decision: 'rejected' | 'merged') => apiCallComposer(
    async () => {
        await getActiveScope();
        const normalized = normalizeAnswerlatticeEntityCandidateId(candidateId);
        if (!normalized) throw new Error('Invalid candidate ID');
        return runAnswerlatticeOntologyAction({
            action: 'review_candidate',
            candidateId: normalized,
            decision,
        }, `review_candidate:${normalized}:${decision}`);
    },
    { candidateId, decision },
    'reviewEntityCandidate',
);

export const promoteCandidate = async (candidateId: string, tId?: number, sId?: number) => apiCallComposer(
    async () => {
        await getActiveScope({ tId, sId });
        const normalized = normalizeAnswerlatticeEntityCandidateId(candidateId);
        if (!normalized) throw new Error('Invalid candidate ID');
        return runAnswerlatticeOntologyAction({
            action: 'promote_candidate',
            candidateId: normalized,
        }, `promote_candidate:${normalized}`);
    },
    { candidateId, tId, sId },
    'promoteCandidate',
);
