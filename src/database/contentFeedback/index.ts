import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { buildAnswerlatticeActorSnapshot } from '@lib/answerlattice/customerIdentity';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { sanitizeFeedbackComment } from '@lib/sanitization';
import { apiCallComposerClientWithoutLoader } from '@lib/apiHelper/apiCallComposerClientWithoutLoader';
import { collection, doc, getDoc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';

const db = answerlatticeFirebaseClient;

type ContentType = 'changelog' | 'article' | 'faq' | 'workflow';
type ContentFeedbackAction = 'added' | 'removed';
const MAX_CONTENT_FEEDBACK_EVENTS = 200;

export type ContentFeedbackItem = {
    comment: string;
    sentiment: 'like' | 'dislike';
    action?: ContentFeedbackAction;
    createdOn: Timestamp;
    uId: string;
    userName?: string;
    userEmail?: string;
    userPhone?: string;
    sourceContext?: Record<string, any>;
};

const getCollectionName = (type: ContentType) => {
    if (type !== 'changelog' && type !== 'article') {
        throw new Error('Content feedback comments are supported for articles and changelog entries only.');
    }
    return type === 'changelog' ? DB_COLLECTIONS.CHANGELOG_FEEDBACK : DB_COLLECTIONS.ARTICLE_FEEDBACK;
};

const getCollectionRef = (session: any, type: ContentType) => {
    const COLLECTION = getCollectionName(type);
    return collection(answerlatticeFirebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`);
};

/**
 * Adds a feedback comment for a specific content entry (changelog or article).
 * This operation is performed within a transaction to ensure atomicity.
 */
export const addContentFeedback = async (
    type: ContentType,
    entryId: string,
    comment: string,
    sentiment: 'like' | 'dislike',
    action: ContentFeedbackAction = 'added',
) => {
    const session = await getActiveSession();
    if (!session?.tId || !session?.sId || !session?.uId) {
        throw new Error('Sign in before sending content feedback.');
    }
    const feedbackCollectionRef = getCollectionRef(session, type);
    const feedbackDocId = `doc1_${entryId}`;
    const feedbackDocRef = doc(feedbackCollectionRef, feedbackDocId);

    return runTransaction(db, async (tx) => {
        const feedbackDoc = await tx.get(feedbackDocRef);

        // Sanitize comment to prevent XSS
        const sanitizedComment = sanitizeFeedbackComment(comment, 500);

        const feedbackPayload = {
            comment: sanitizedComment,
            sentiment,
            action,
            createdOn: Timestamp.now(),
            ...buildAnswerlatticeActorSnapshot(session),
        };

        if (!feedbackDoc.exists()) {
            // First feedback for this entry, create the document
            const newFeedbackDoc = await answerlatticeRequestBodyComposer({
                list: [feedbackPayload],
            });
            tx.set(feedbackDocRef, newFeedbackDoc);
        } else {
            const currentList = Array.isArray(feedbackDoc.data()?.list)
                ? feedbackDoc.data()?.list.slice(-(MAX_CONTENT_FEEDBACK_EVENTS - 1))
                : [];
            tx.update(feedbackDocRef, {
                list: [...currentList, feedbackPayload],
                modifiedOn: serverTimestamp(),
                modifiedBy: session.uId,
            });
        }

        return { success: true, feedbackId: feedbackDocId };
    });
};

export const getContentFeedbackForEntry = async (
    type: ContentType,
    entryId: string,
): Promise<ContentFeedbackItem[]> => {
    return await apiCallComposerClientWithoutLoader(
        async () => {
            const session = await getActiveSession();
            if (!session?.tId || !session?.sId) return [];

            const feedbackDocRef = doc(getCollectionRef(session, type), `doc1_${entryId}`);
            const feedbackDoc = await getDoc(feedbackDocRef);
            if (!feedbackDoc.exists()) return [];

            const list = feedbackDoc.data()?.list;
            if (!Array.isArray(list)) return [];
            return list
                .filter((item): item is ContentFeedbackItem => Boolean(item && typeof item === 'object'))
                .slice(-100)
                .reverse();
        },
        { type, entryId },
        'getContentFeedbackForEntry',
    );
};
