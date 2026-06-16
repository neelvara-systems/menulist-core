import { DB_COLLECTIONS } from '@constant/database';
import { buildAnswerlatticeActorSnapshot } from '@lib/answerlattice/customerIdentity';
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from '@lib/firebase/answerlatticeFirebaseClient';
import { sanitizeFeedbackComment } from '@lib/sanitization';
import { collection, doc, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';

const db = answerlatticeFirebaseClient;

const COLLECTION = DB_COLLECTIONS.CHANGELOG_FEEDBACK;
const MAX_CHANGELOG_FEEDBACK_EVENTS = 200;

const getCollectionRef = (session: any) => {
    return collection(answerlatticeFirebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`);
};

/**
 * Adds a feedback comment for a specific changelog entry.
 * This operation is performed within a transaction to ensure atomicity.
 */
export const addChangelogFeedback = async (
    entryId: string,
    comment: string,
    sentiment: 'like' | 'dislike',
    action: 'added' | 'removed' = 'added',
) => {
    const session = await getActiveSession();
    if (!session?.tId || !session?.sId || !session?.uId) {
        throw new Error('Sign in before sending changelog feedback.');
    }
    const feedbackCollectionRef = getCollectionRef(session);
    const feedbackDocId = `doc1_${entryId}`;
    const feedbackDocRef = doc(feedbackCollectionRef, feedbackDocId);

    return runTransaction(db, async (tx) => {
        const feedbackDoc = await tx.get(feedbackDocRef);

        const feedbackPayload = {
            comment: sanitizeFeedbackComment(comment, 500),
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
                ? feedbackDoc.data()?.list.slice(-(MAX_CHANGELOG_FEEDBACK_EVENTS - 1))
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
