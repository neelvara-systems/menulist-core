import { createHash } from 'node:crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import { sanitizeFeedbackComment } from '@lib/sanitization';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { SourceContext } from '@type/multiProduct';
import { ANSWERLATTICE_CHANGELOG_PAGE_MAX_BYTES } from './changelogContracts';
import type { AnswerlatticeContentFeedbackRequest } from './contentFeedbackContracts';
import { getAnswerlatticeRetentionExpiry } from './dataRetention';

const MAX_AUDIT_EVENTS = 200;
const MAX_RECENT_OPERATIONS = 20;

export type AnswerlatticeContentFeedbackActor = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    sourceContext?: SourceContext;
};

export class AnswerlatticeContentFeedbackError extends Error {
    constructor(public readonly status: number, public readonly publicMessage: string) {
        super(publicMessage);
        this.name = 'AnswerlatticeContentFeedbackError';
    }
}

const getDb = () => {
    if (!answerlatticeFirestoreAdmin || typeof answerlatticeFirestoreAdmin.collection !== 'function') {
        throw new AnswerlatticeContentFeedbackError(503, 'Content feedback is temporarily unavailable.');
    }
    return answerlatticeFirestoreAdmin;
};

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
const safeCounter = (value: unknown) => {
    if (value === undefined || value === null) return 0;
    if (!Number.isSafeInteger(value) || Number(value) < 0) {
        throw new AnswerlatticeContentFeedbackError(409, 'Content feedback counters are invalid.');
    }
    return Number(value);
};

const normalizeRecentOperations = (value: unknown): string[] => {
    if (value === undefined) return [];
    if (!Array.isArray(value)
        || value.length > MAX_RECENT_OPERATIONS
        || value.some((item) => typeof item !== 'string' || !/^[a-f0-9]{24}\.[a-f0-9]{24}$/.test(item))) {
        throw new AnswerlatticeContentFeedbackError(409, 'Content feedback idempotency state is invalid.');
    }
    return value;
};

const withRecentOperation = (current: string[], operation: string) => (
    [...current.filter((item) => item !== operation), operation].slice(-MAX_RECENT_OPERATIONS)
);

export const executeAnswerlatticeContentFeedback = async (
    input: AnswerlatticeContentFeedbackRequest,
    scope: { tId: number; sId: number },
    actor: AnswerlatticeContentFeedbackActor,
) => {
    const db = getDb();
    const operationId = sha(`${scope.tId}:${scope.sId}:${actor.id}:${input.requestId}`).slice(0, 24);
    const fingerprint = sha(JSON.stringify({
        action: input.action,
        contentId: input.contentId,
        increment: input.increment,
        pageId: input.pageId || null,
        sentiment: input.sentiment,
        type: input.type,
    })).slice(0, 24);
    const operation = `${operationId}.${fingerprint}`;
    const feedbackId = `doc1_${input.contentId}`;
    const feedbackRef = db.collection(input.type === 'article' ? DB_COLLECTIONS.ARTICLE_FEEDBACK : DB_COLLECTIONS.CHANGELOG_FEEDBACK)
        .doc(String(scope.tId))
        .collection(String(scope.sId))
        .doc(feedbackId);
    const contentRef = input.type === 'article'
        ? db.collection(DB_COLLECTIONS.KB_ARTICLES).doc(input.contentId)
        : db.collection(DB_COLLECTIONS.CHANGELOG).doc(String(scope.tId)).collection(String(scope.sId)).doc(input.pageId!);

    let result = { likes: 0, dislikes: 0, feedbackLogged: false, replayed: false };
    await db.runTransaction(async (transaction) => {
        const [contentSnapshot, feedbackSnapshot] = await Promise.all([
            transaction.get(contentRef),
            transaction.get(feedbackRef),
        ]);
        if (!contentSnapshot.exists) throw new AnswerlatticeContentFeedbackError(404, 'Feedback content was not found.');
        const content = contentSnapshot.data() as Record<string, any>;

        let target: Record<string, any>;
        let entryIndex = -1;
        if (input.type === 'article') {
            if (content.pId !== PRODUCT_IDS.ANSWERLATTICE
                || Number(content.tId) !== scope.tId
                || Number(content.sId) !== scope.sId) {
                throw new AnswerlatticeContentFeedbackError(404, 'Feedback content was not found.');
            }
            target = content;
        } else {
            if (content.pId !== PRODUCT_IDS.ANSWERLATTICE
                || Number(content.tId) !== scope.tId
                || Number(content.sId) !== scope.sId
                || !Array.isArray(content.entries)) {
                throw new AnswerlatticeContentFeedbackError(404, 'Feedback content was not found.');
            }
            entryIndex = content.entries.findIndex((entry: unknown) => (
                entry && typeof entry === 'object' && !Array.isArray(entry)
                && (entry as Record<string, unknown>).id === input.contentId
            ));
            if (entryIndex < 0) throw new AnswerlatticeContentFeedbackError(404, 'Feedback content was not found.');
            target = content.entries[entryIndex] as Record<string, any>;
        }

        const recentOperations = normalizeRecentOperations(target.recentFeedbackOperations);
        const existingOperation = recentOperations.find((item) => item.startsWith(`${operationId}.`));
        if (existingOperation) {
            if (existingOperation !== operation) {
                throw new AnswerlatticeContentFeedbackError(409, 'This feedback request was already used with different details.');
            }
            result = {
                likes: safeCounter(target.likes),
                dislikes: safeCounter(target.dislikes),
                feedbackLogged: false,
                replayed: true,
            };
            return;
        }

        const counters = { likes: safeCounter(target.likes), dislikes: safeCounter(target.dislikes) };
        const counter = input.sentiment === 'like' ? 'likes' : 'dislikes';
        counters[counter] = input.increment ? counters[counter] + 1 : Math.max(0, counters[counter] - 1);
        if (!Number.isSafeInteger(counters[counter])) throw new AnswerlatticeContentFeedbackError(409, 'Content feedback counter overflow.');
        const nextTarget = {
            ...target,
            ...counters,
            recentFeedbackOperations: withRecentOperation(recentOperations, operation),
        };
        if (input.type === 'article') {
            transaction.update(contentRef, {
                ...counters,
                recentFeedbackOperations: nextTarget.recentFeedbackOperations,
            });
        } else {
            const entries = [...content.entries];
            entries[entryIndex] = nextTarget;
            if (Buffer.byteLength(JSON.stringify({ ...content, entries }), 'utf8') >= ANSWERLATTICE_CHANGELOG_PAGE_MAX_BYTES) {
                throw new AnswerlatticeContentFeedbackError(413, 'This changelog page cannot accept more feedback state.');
            }
            transaction.update(contentRef, {
                entries,
            });
        }

        const feedbackItem = {
            requestId: operationId,
            comment: sanitizeFeedbackComment(input.comment, 500),
            sentiment: input.sentiment,
            action: input.action,
            createdOn: Timestamp.now(),
            uId: actor.id.slice(0, 180),
            userName: actor.name.slice(0, 160),
            ...(actor.email ? { userEmail: actor.email.slice(0, 180) } : {}),
            ...(actor.phone ? { userPhone: actor.phone.slice(0, 80) } : {}),
            ...(actor.sourceContext ? { sourceContext: actor.sourceContext } : {}),
        };
        const currentList = feedbackSnapshot.exists ? feedbackSnapshot.data()?.list : [];
        if (!Array.isArray(currentList) || currentList.length > MAX_AUDIT_EVENTS) {
            throw new AnswerlatticeContentFeedbackError(409, 'Content feedback audit history is invalid.');
        }
        let feedbackLogged = false;
        if (!feedbackSnapshot.exists) {
            transaction.create(feedbackRef, {
                list: [feedbackItem],
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: scope.tId,
                sId: scope.sId,
                uId: actor.id,
                role: 'CUSTOMER',
                sourceContext: actor.sourceContext || null,
                traceId: input.requestId,
                requestId: input.requestId,
                createdOn: FieldValue.serverTimestamp(),
                createdBy: actor.name,
                modifiedOn: FieldValue.serverTimestamp(),
                modifiedBy: actor.name,
            });
            feedbackLogged = true;
        } else if (currentList.length < MAX_AUDIT_EVENTS) {
            transaction.update(feedbackRef, {
                list: [...currentList, feedbackItem],
                modifiedOn: FieldValue.serverTimestamp(),
                modifiedBy: actor.name,
            });
            feedbackLogged = true;
        }

        if (input.sentiment === 'dislike' && input.increment) {
            transaction.set(db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS).doc(`content_feedback_${operationId}`), {
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: scope.tId,
                sId: scope.sId,
                entityId: Array.isArray(target.entityChanges) && target.entityChanges[0]
                    ? String(target.entityChanges[0]).slice(0, 180)
                    : Array.isArray(target.entityIds) && target.entityIds[0]
                        ? String(target.entityIds[0]).slice(0, 180)
                        : 'unresolved',
                type: 'feedback',
                timestamp: FieldValue.serverTimestamp(),
                expiresAt: getAnswerlatticeRetentionExpiry('signalEvents'),
                dedupKey: `content_feedback:${operationId}`,
                metadata: {
                    source: 'content_feedback',
                    contentType: input.type,
                    contentId: input.contentId,
                    pageId: input.pageId || null,
                    message: sanitizeFeedbackComment(input.comment, 360) || `${input.type} marked not helpful`,
                },
                createdOn: FieldValue.serverTimestamp(),
                createdBy: actor.id,
            });
        }

        result = { ...counters, feedbackLogged, replayed: false };
    });

    return { success: true as const, ...result, feedbackId };
};
