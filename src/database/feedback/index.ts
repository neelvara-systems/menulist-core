import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { canonicaFirebaseClient } from '@lib/firebase/canonicaFirebaseClient';
import { CANONICA_SIGNAL_TYPE } from '@type/canonica';
import { Feedback } from '@type/feedback';
import { addDoc, collection, doc, getDocs, limit, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.FEEDBACK;
const MAX_FEEDBACK_RESULTS = 200;

const getCollectionRef = () => {
    return collection(canonicaFirebaseClient, COLLECTION);
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
            .map((item: any) => ({
                feature: toSignalText(item?.feature, 160),
                interested: item?.interested === true,
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

const getFeedbackContextKeys = (feedback: Partial<Feedback> & Record<string, any>) => {
    const contextKey = cleanNullableText(feedback.contextKey, 140);
    const featureIssues = toSignalList(feedback.featureIssues);
    return Array.from(new Set([
        contextKey,
        ...featureIssues,
    ].filter(Boolean) as string[]));
};

const buildFeedbackSignalMetadata = (feedback: Partial<Feedback> & Record<string, any>, feedbackId: string) => {
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

const emitFeedbackSignal = async (feedback: Partial<Feedback> & Record<string, any>, feedbackId: string) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_SIGNAL_MUTATION) return;

    const tId = Number(feedback.tId);
    const sId = Number(feedback.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) return;

    const { emitCanonicaSignal } = await import('@lib/canonica/signalEmitter');
    await emitCanonicaSignal({
        type: CANONICA_SIGNAL_TYPE.FEEDBACK,
        entityId: 'unresolved',
        tId,
        sId,
        metadata: buildFeedbackSignalMetadata(feedback, feedbackId),
    });
};

export const addFeedback = async (data: Partial<Feedback>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await canonicaRequestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), submitData);
            void emitFeedbackSignal(submitData as Partial<Feedback> & Record<string, any>, docRef.id);
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
            const session = await getActiveSession();
            const actorId = String((session as any)?.uId || session?.user?.id || '');
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

            await updateDoc(doc(canonicaFirebaseClient, COLLECTION, feedbackId), patch);
            return { id: feedbackId, ...patch };
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
                orderBy('createdOn', 'desc'),
                limit(clampFeedbackLimit(maxResults))
            );
            const querySnapshot = await getDocs(q);
            const list: Feedback[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Feedback);
            });
            return list;
        },
        'getAllFeedback'
    );
};

/**
 * Get feedback for a Canonica workspace (owner/support review).
 * Ordered by newest first and bounded for cost control.
 */
export const getFeedbackForWorkspace = async (tId: number, sId: number, maxResults: number = 200) => {
    return await apiCallComposer(
        async () => {
            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                orderBy('createdOn', 'desc'),
                limit(clampFeedbackLimit(maxResults))
            );
            const querySnapshot = await getDocs(q);
            const list: Feedback[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Feedback);
            });
            return list;
        },
        'getFeedbackForWorkspace'
    );
};

export const getLatestFeedbackForUser = async () => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            if (!session?.uId) return null;

            const q = query(
                getCollectionRef(),
                where('uId', '==', session.uId),
                where('tId', '==', session.tId),
                where('sId', '==', session.sId),
                orderBy('createdOn', 'desc'),
                limit(1)
            );

            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                return { id: doc.id, ...doc.data() } as Feedback;
            }
            return null;
        },
        'getLatestFeedbackForUser'
    );
};
