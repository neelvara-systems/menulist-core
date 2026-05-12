import { DB_COLLECTIONS } from '@constant/database';
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { canonicaFirebaseClient } from '@lib/firebase/canonicaFirebaseClient';
import { Feedback } from '@type/feedback';
import { addDoc, collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.FEEDBACK;

const getCollectionRef = () => {
    return collection(canonicaFirebaseClient, COLLECTION);
};

export const addFeedback = async (data: Partial<Feedback>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await canonicaRequestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id };
        },
        data,
        'addFeedback'
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
                limit(maxResults)
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
