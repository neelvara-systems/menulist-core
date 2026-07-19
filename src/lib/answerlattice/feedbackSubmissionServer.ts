import { createHash } from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { emitAnswerlatticeSignal } from './signalEmitter';
import type {
    AnswerlatticeFeedbackSubmission,
    AnswerlatticeFeedbackSubmitRequest,
} from './feedbackBoundary';
import type { SourceContext } from '@type/multiProduct';
import { Timestamp } from 'firebase-admin/firestore';

const FEEDBACK_SIGNAL_TEXT_LIMIT = 360;

const FEEDBACK_TYPE_LABELS: Record<AnswerlatticeFeedbackSubmission['type'], string> = {
    general: 'General feedback',
    feature_usage: 'Feature usage feedback',
    feature_requests: 'Feature request',
};

export type AnswerlatticeFeedbackSubmissionActor = {
    id: string;
    name: string;
    role: string;
    sourceContext?: SourceContext | null;
};

export class AnswerlatticeFeedbackSubmissionError extends Error {
    constructor(public readonly status: number, public readonly publicMessage: string) {
        super(publicMessage);
        this.name = 'AnswerlatticeFeedbackSubmissionError';
    }
}

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new AnswerlatticeFeedbackSubmissionError(503, 'Feedback is temporarily unavailable.');
    }
    return answerlatticeFirestoreAdmin;
};

const sha = (value: string) => createHash('sha256').update(value).digest('hex');

const cleanText = (value: unknown, maxLength: number) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > maxLength ? `${text.slice(0, Math.max(0, maxLength - 3))}...` : text;
};

const cleanNullableText = (value: unknown, maxLength: number) => {
    const text = cleanText(value, maxLength);
    return text || null;
};

const getFeedbackContextKeys = (feedback: Record<string, unknown>) => {
    const contextKey = cleanNullableText(feedback.contextKey, 140);
    const featureIssues = Array.isArray(feedback.featureIssues)
        ? feedback.featureIssues.map(item => cleanText(item, 120)).filter(Boolean).slice(0, 8)
        : [];
    return Array.from(new Set([contextKey, ...featureIssues].filter(Boolean) as string[]));
};

const buildFeedbackSignalMetadata = (feedback: Record<string, unknown>, feedbackId: string) => {
    const feedbackType = feedback.type as AnswerlatticeFeedbackSubmission['type'];
    const rating = Number(feedback.rating);
    const commentPreview = cleanText(feedback.comment, FEEDBACK_SIGNAL_TEXT_LIMIT);
    const featureCommentPreview = cleanText(feedback.featureComment, FEEDBACK_SIGNAL_TEXT_LIMIT);
    const featureRequest = cleanText(feedback.featureRequest, FEEDBACK_SIGNAL_TEXT_LIMIT);
    const featureIssues = Array.isArray(feedback.featureIssues)
        ? feedback.featureIssues.map(item => cleanText(item, 120)).filter(Boolean).slice(0, 8)
        : [];
    const votedPopularRequests = Array.isArray(feedback.votedPopularRequests)
        ? feedback.votedPopularRequests.map((item) => ({
            feature: cleanText(
                item && typeof item === 'object' && !Array.isArray(item)
                    ? (item as Record<string, unknown>).feature
                    : undefined,
                160,
            ),
            interested: Boolean(
                item && typeof item === 'object' && !Array.isArray(item)
                && (item as Record<string, unknown>).interested === true,
            ),
        })).filter(item => item.feature).slice(0, 8)
        : [];
    const summary = [
        rating > 0 ? `Rating ${rating}/5` : '',
        featureRequest || commentPreview || featureCommentPreview,
        featureIssues.length ? `Issues: ${featureIssues.join(', ')}` : '',
    ].filter(Boolean).join(' · ') || `${FEEDBACK_TYPE_LABELS[feedbackType]} submitted`;

    return {
        source: 'help_center_feedback',
        feedbackId,
        feedbackType,
        feedbackLabel: FEEDBACK_TYPE_LABELS[feedbackType],
        rating: Number.isFinite(rating) && rating > 0 ? rating : null,
        summary: cleanText(summary, 500),
        message: cleanText(summary, 500),
        commentPreview: commentPreview || null,
        featureCommentPreview: featureCommentPreview || null,
        featureRequest: featureRequest || null,
        featureIssues,
        votedPopularRequests,
        hasComment: Boolean(commentPreview || featureCommentPreview),
        hasFeatureRequest: Boolean(featureRequest || votedPopularRequests.length),
        contextKey: cleanNullableText(feedback.contextKey, 140),
        surfaceId: cleanNullableText(feedback.surfaceId, 180),
        surfaceLabel: cleanNullableText(feedback.surfaceLabel, 180),
        relatedContextKeys: getFeedbackContextKeys(feedback),
    };
};

const normalizeActorText = (value: unknown, maxLength: number, fallback: string) => {
    const normalized = String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return (normalized || fallback).slice(0, maxLength);
};

export const executeAnswerlatticeFeedbackSubmission = async (
    input: AnswerlatticeFeedbackSubmitRequest,
    scope: { tId: number; sId: number },
    actor: AnswerlatticeFeedbackSubmissionActor,
) => {
    const actorId = normalizeActorText(actor.id, 180, '');
    if (!actorId || actorId === 'unknown') {
        throw new AnswerlatticeFeedbackSubmissionError(401, 'Feedback requires an authenticated user.');
    }
    const db = getDb();
    const fingerprint = sha(JSON.stringify(input.submission));
    const documentId = `feedback_${sha(`${scope.tId}:${scope.sId}:${actorId}:${input.requestId}`).slice(0, 48)}`;
    const feedbackRef = db.collection(DB_COLLECTIONS.FEEDBACK).doc(documentId);
    const actorName = normalizeActorText(actor.name, 200, actorId);
    const actorRole = normalizeActorText(actor.role, 80, 'CUSTOMER');
    let record: Record<string, any> | null = null;
    let created = false;

    await db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(feedbackRef);
        if (snapshot.exists) {
            const existing = snapshot.data() as Record<string, any>;
            if (existing.pId !== PRODUCT_IDS.ANSWERLATTICE
                || Number(existing.tId) !== scope.tId
                || Number(existing.sId) !== scope.sId
                || String(existing.uId) !== actorId
                || existing.requestId !== input.requestId
                || existing.submissionFingerprint !== fingerprint) {
                throw new AnswerlatticeFeedbackSubmissionError(409, 'This feedback request was already used with different details.');
            }
            record = existing;
            return;
        }

        const now = Timestamp.now();
        record = {
            ...input.submission,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            tId: scope.tId,
            sId: scope.sId,
            uId: actorId,
            role: actorRole,
            sourceContext: actor.sourceContext || null,
            traceId: input.requestId,
            requestId: input.requestId,
            submissionFingerprint: fingerprint,
            modifiedBy: actorName,
            modifiedOn: now,
            createdBy: actorName,
            createdOn: now,
        };
        transaction.create(feedbackRef, record);
        created = true;
    });

    if (!record) throw new AnswerlatticeFeedbackSubmissionError(500, 'Feedback could not be saved.');
    await emitAnswerlatticeSignal({
        type: 'feedback',
        entityId: 'unresolved',
        tId: scope.tId,
        sId: scope.sId,
        metadata: buildFeedbackSignalMetadata(record, documentId),
    });

    return {
        success: true as const,
        id: documentId,
        created,
        replayed: !created,
        record,
    };
};
