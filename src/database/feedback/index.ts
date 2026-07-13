import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import {
    getAnswerlatticeScopeLogContext,
    logAnswerlatticeDiagnostic,
    logAnswerlatticeFailure,
} from '@lib/answerlattice/diagnostics';
import {
    normalizeAnswerlatticeFeedbackDocumentId,
    normalizeAnswerlatticeFeedbackRecord,
    normalizeAnswerlatticeFeedbackSubmission,
} from '@lib/answerlattice/feedbackBoundary';
import { normalizeExactAnswerlatticeSignalScopeId } from '@lib/answerlattice/signalIdentity';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { ANSWERLATTICE_SIGNAL_TYPE } from '@type/answerlattice';
import { Feedback } from '@type/feedback';
import { addDoc, collection, doc, getDocs, limit, orderBy, query, runTransaction, Timestamp, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.FEEDBACK;
const MAX_FEEDBACK_RESULTS = 200;

const getCollectionRef = () => {
    return collection(answerlatticeFirebaseClient, COLLECTION);
};

const FEEDBACK_SIGNAL_TEXT_LIMIT = 360;

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
    general: 'General feedback',
    feature_usage: 'Feature usage feedback',
    feature_request: 'Feature request',
    feature_requests: 'Feature request',
};

const toSignalText = (value: unknown, maxLength = FEEDBACK_SIGNAL_TEXT_LIMIT) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
};

const toSignalList = (value: unknown, maxItems = 8) => (
    Array.isArray(value)
        ? value.map((item) => toSignalText(item, 120)).filter(Boolean).slice(0, maxItems)
        : []
);

const toSignalVotes = (value: unknown) => (
    Array.isArray(value)
        ? value
            .map((item) => ({
                feature: toSignalText(
                    item && typeof item === 'object' && !Array.isArray(item)
                        ? (item as Record<string, unknown>).feature
                        : undefined,
                    160,
                ),
                interested: Boolean(
                    item && typeof item === 'object' && !Array.isArray(item)
                    && (item as Record<string, unknown>).interested === true,
                ),
            }))
            .filter((item) => item.feature)
            .slice(0, 8)
        : []
);

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

const getFeedbackContextKeys = (feedback: Partial<Feedback> & Record<string, unknown>) => {
    const contextKey = cleanNullableText(feedback.contextKey, 140);
    const featureIssues = toSignalList(feedback.featureIssues);
    return Array.from(new Set([
        contextKey,
        ...featureIssues,
    ].filter(Boolean) as string[]));
};

const buildFeedbackSignalMetadata = (feedback: Partial<Feedback> & Record<string, unknown>, feedbackId: string) => {
    const feedbackType = String(feedback.type || 'general');
    const rating = Number(feedback.rating);
    const commentPreview = toSignalText(feedback.comment);
    const featureCommentPreview = toSignalText(feedback.featureComment);
    const featureRequest = toSignalText(feedback.featureRequest);
    const featureIssues = toSignalList(feedback.featureIssues);
    const votedPopularRequests = toSignalVotes(feedback.votedPopularRequests);
    const contextKey = cleanNullableText(feedback.contextKey, 140);
    const summary = [
        rating > 0 ? `Rating ${rating}/5` : '',
        featureRequest || commentPreview || featureCommentPreview,
        featureIssues.length ? `Issues: ${featureIssues.join(', ')}` : '',
    ].filter(Boolean).join(' · ') || `${FEEDBACK_TYPE_LABELS[feedbackType] || feedbackType} submitted`;

    return {
        source: 'help_center_feedback',
        feedbackId,
        feedbackType,
        feedbackLabel: FEEDBACK_TYPE_LABELS[feedbackType] || feedbackType,
        rating: Number.isFinite(rating) && rating > 0 ? rating : null,
        summary: toSignalText(summary, 500),
        message: toSignalText(summary, 500),
        commentPreview: commentPreview || null,
        featureCommentPreview: featureCommentPreview || null,
        featureRequest: featureRequest || null,
        featureIssues,
        votedPopularRequests,
        hasComment: Boolean(commentPreview || featureCommentPreview),
        hasFeatureRequest: Boolean(featureRequest || votedPopularRequests.length),
        contextKey,
        surfaceId: cleanNullableText(feedback.surfaceId, 180),
        surfaceLabel: cleanNullableText(feedback.surfaceLabel, 180),
        relatedContextKeys: getFeedbackContextKeys(feedback),
        sourceContext: feedback.sourceContext || null,
        userId: feedback.uId ? String(feedback.uId) : null,
    };
};

const emitFeedbackSignal = async (feedback: Partial<Feedback> & Record<string, unknown>, feedbackId: string) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) return;

    const tId = normalizeExactAnswerlatticeSignalScopeId(feedback.tId);
    const sId = normalizeExactAnswerlatticeSignalScopeId(feedback.sId);
    if (feedback.pId !== PRODUCT_IDS.ANSWERLATTICE || tId === null || sId === null) {
        logAnswerlatticeDiagnostic('answerlattice_feedback_signal_invalid_scope_skipped', {
            ...getAnswerlatticeScopeLogContext({ tId: feedback.tId, sId: feedback.sId }),
            hasAnswerlatticeProduct: feedback.pId === PRODUCT_IDS.ANSWERLATTICE,
        });
        return;
    }

    const { emitAnswerlatticeSignal } = await import('@lib/answerlattice/signalEmitter');
    await emitAnswerlatticeSignal({
        type: ANSWERLATTICE_SIGNAL_TYPE.FEEDBACK,
        entityId: 'unresolved',
        tId,
        sId,
        metadata: buildFeedbackSignalMetadata(feedback, feedbackId),
    });
};

export const addFeedback = async (data: unknown) => {
    return await apiCallComposer(
        async () => {
            const normalized = normalizeAnswerlatticeFeedbackSubmission(data);
            if (!normalized) throw new Error('Invalid feedback submission');
            const submitData = await answerlatticeRequestBodyComposer(normalized, { isNew: true });
            const docRef = await addDoc(getCollectionRef(), submitData);
            void emitFeedbackSignal(submitData as Partial<Feedback> & Record<string, unknown>, docRef.id)
                .catch((error) => logAnswerlatticeFailure('answerlattice_feedback_signal_dispatch_failed', error, {
                    ...getAnswerlatticeScopeLogContext({
                        tId: (submitData as Record<string, unknown>).tId,
                        sId: (submitData as Record<string, unknown>).sId,
                    }),
                }));
            return { ...submitData, id: docRef.id };
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
