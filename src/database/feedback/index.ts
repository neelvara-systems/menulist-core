import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    normalizeAnswerlatticeFeedbackDocumentId,
    normalizeAnswerlatticeFeedbackRecord,
    normalizeAnswerlatticeFeedbackSubmission,
    normalizeAnswerlatticeFeedbackSubmitResult,
    parseAnswerlatticeFeedbackSubmitRequest,
} from '@lib/answerlattice/feedbackBoundary';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { createRuntimeId } from '@lib/runtime/randomId';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { Feedback } from '@type/feedback';
import { collection, doc, getDocs, limit, orderBy, query, runTransaction, Timestamp, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.FEEDBACK;
const MAX_FEEDBACK_RESULTS = 200;
const FEEDBACK_RESPONSE_MAX_BYTES = 64 * 1024;
const MAX_PENDING_FEEDBACK_REQUESTS = 100;
const pendingFeedbackRequests = new Map<string, { fingerprint: string; requestId: string }>();

const getCollectionRef = () => {
    return collection(answerlatticeFirebaseClient, COLLECTION);
};

const cleanNullableText = (value: unknown, maxLength = 160) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return null;
    return text.length > maxLength ? text.slice(0, maxLength) : text;
};

const clampFeedbackLimit = (value: unknown) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return MAX_FEEDBACK_RESULTS;
    return Math.min(Math.floor(parsed), MAX_FEEDBACK_RESULTS);
};

const getActiveFeedbackScope = async (expected?: { tId: number; sId: number }) => {
    const session = await getActiveSession();
    const scope = resolveAnswerlatticeSessionScope(session);
    if (!scope) throw new Error('Answerlattice workspace scope is required');
    if (expected && (scope.tenantId !== expected.tId || scope.storeId !== expected.sId)) {
        throw new Error('Answerlattice workspace scope does not match the active session');
    }
    return { session, tId: scope.tenantId, sId: scope.storeId };
};

const getFeedbackRequestId = (key: string, fingerprint: string) => {
    const pending = pendingFeedbackRequests.get(key);
    if (pending?.fingerprint === fingerprint) return pending.requestId;
    if (pendingFeedbackRequests.size >= MAX_PENDING_FEEDBACK_REQUESTS) {
        const oldest = pendingFeedbackRequests.keys().next().value;
        if (oldest) pendingFeedbackRequests.delete(oldest);
    }
    const requestId = createRuntimeId('feedback');
    pendingFeedbackRequests.set(key, { fingerprint, requestId });
    return requestId;
};

export const addFeedback = async (data: unknown) => {
    return await apiCallComposer(
        async () => {
            const normalized = normalizeAnswerlatticeFeedbackSubmission(data);
            if (!normalized) throw new Error('Invalid feedback submission');
            const session = await getActiveSession();
            const scope = resolveAnswerlatticeSessionScope(session);
            const actorId = String(session?.uId || session?.user?.id || '').trim();
            if (!scope || !actorId) throw new Error('Answerlattice feedback scope is required');
            const fingerprint = JSON.stringify(normalized);
            const requestKey = `${scope.tenantId}:${scope.storeId}:${actorId}:${normalized.type}`;
            const requestId = getFeedbackRequestId(requestKey, fingerprint);
            const request = parseAnswerlatticeFeedbackSubmitRequest({ requestId, submission: normalized });
            if (!request) throw new Error('Invalid feedback submission');

            const response = await fetch('/api/answerlattice/feedback', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request),
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, FEEDBACK_RESPONSE_MAX_BYTES)
                .catch(() => null);
            if (!response.ok) throw new Error('Feedback could not be saved');
            const result = normalizeAnswerlatticeFeedbackSubmitResult(payload);
            if (!result) throw new Error('Feedback returned an invalid response');
            pendingFeedbackRequests.delete(requestKey);
            return result.feedback;
        },
        data,
        'addFeedback'
    );
};

export type FeedbackSurfaceAssignmentInput = Pick<Feedback, 'contextKey' | 'surfaceId' | 'surfaceLabel'>;

export const updateFeedbackSurfaceForWorkspace = async (
    feedbackId: string,
    input: FeedbackSurfaceAssignmentInput,
) => {
    return await apiCallComposer(
        async () => {
            const normalizedFeedbackId = normalizeAnswerlatticeFeedbackDocumentId(feedbackId);
            if (!normalizedFeedbackId) throw new Error('Invalid feedback document ID');
            const { session, tId, sId } = await getActiveFeedbackScope();
            const actorId = String(session?.uId || session?.user?.id || '');
            const actorName = String(session?.user?.name || session?.user?.email || actorId || 'Team member');
            const contextKey = cleanNullableText(input.contextKey, 140);
            const surfaceId = cleanNullableText(input.surfaceId, 180);
            const surfaceLabel = cleanNullableText(input.surfaceLabel, 180);
            const hasSurface = Boolean(contextKey || surfaceId || surfaceLabel);
            const patch = {
                contextKey,
                surfaceId,
                surfaceLabel,
                surfaceAssignedBy: hasSurface ? actorId || null : null,
                surfaceAssignedAt: hasSurface ? Timestamp.now() : null,
                modifiedBy: actorName,
                modifiedOn: Timestamp.now(),
            };

            const feedbackRef = doc(answerlatticeFirebaseClient, COLLECTION, normalizedFeedbackId);
            await runTransaction(answerlatticeFirebaseClient, async (transaction) => {
                const snapshot = await transaction.get(feedbackRef);
                const persisted = snapshot.exists()
                    ? normalizeAnswerlatticeFeedbackRecord(snapshot.data(), snapshot.id)
                    : null;
                if (!persisted
                    || persisted.pId !== PRODUCT_IDS.ANSWERLATTICE
                    || Number(persisted.tId) !== tId
                    || Number(persisted.sId) !== sId) {
                    throw new Error('Feedback was not found in the active Answerlattice workspace');
                }
                transaction.update(feedbackRef, patch);
            });
            return { id: normalizedFeedbackId, ...patch };
        },
        { feedbackId, input },
        'updateFeedbackSurfaceForWorkspace'
    );
};

/**
 * Get all feedback across all tenants (platform admin only).
 * Ordered by newest first, limited to 200 for cost efficiency.
 */
export const getAllFeedback = async (maxResults: number = 200) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                orderBy('createdOn', 'desc'),
                limit(clampFeedbackLimit(maxResults))
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs
                .map(document => normalizeAnswerlatticeFeedbackRecord(document.data(), document.id))
                .filter((item): item is Feedback => Boolean(item));
        },
        'getAllFeedback'
    );
};

/**
 * Get feedback for an Answerlattice workspace (owner/support review).
 * Ordered by newest first and bounded for cost control.
 */
export const getFeedbackForWorkspace = async (tId: number, sId: number, maxResults: number = 200) => {
    return await apiCallComposer(
        async () => {
            const scope = await getActiveFeedbackScope({ tId, sId });
            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                orderBy('createdOn', 'desc'),
                limit(clampFeedbackLimit(maxResults))
            );
            const querySnapshot = await getDocs(q);
            return querySnapshot.docs
                .map(document => normalizeAnswerlatticeFeedbackRecord(document.data(), document.id))
                .filter((item): item is Feedback => Boolean(item));
        },
        'getFeedbackForWorkspace'
    );
};

export const getLatestFeedbackForUser = async () => {
    return await apiCallComposer(
        async () => {
            const { session, tId, sId } = await getActiveFeedbackScope();
            if (!session?.uId) return null;

            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('uId', '==', session.uId),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('createdOn', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(q);
            const document = querySnapshot.docs[0];
            return document ? normalizeAnswerlatticeFeedbackRecord(document.data(), document.id) : null;
        },
        'getLatestFeedbackForUser'
    );
};
