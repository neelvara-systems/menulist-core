import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { sanitizeFeedbackComment } from '@lib/sanitization';
import { arrayUnion, collection, doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';

const db = answerlatticeFirebaseClient;

type ContentType = 'changelog' | 'article';

const getCollectionName = (type: ContentType) => {
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
    sentiment: 'like' | 'dislike'
) => {
    const session = await getActiveSession();
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
            createdOn: Timestamp.now(),
            uId: session.uId,
        };

        if (!feedbackDoc.exists()) {
            // First feedback for this entry, create the document
            const newFeedbackDoc = await answerlatticeRequestBodyComposer({
                list: [feedbackPayload],
            });
            tx.set(feedbackDocRef, newFeedbackDoc);
        } else {
            // Append to the existing list of feedback
            tx.update(feedbackDocRef, {
                list: arrayUnion(feedbackPayload),
                modifiedOn: serverTimestamp(),
                modifiedBy: session.uId,
            });
        }

        return { success: true, feedbackId: feedbackDocId };
    });
};
