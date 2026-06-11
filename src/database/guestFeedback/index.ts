/**
 * Guest Feedback Data Access Layer (DAL)
 * 
 * Handles all Firestore operations for the guest feedback collection.
 * 
 * NOTE: This DAL has TWO modes:
 * 1. PUBLIC (no auth) - Used by submit endpoint for anonymous guest submissions
 * 2. AUTHENTICATED - Used by owner dashboard for viewing/updating feedback
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import { DB_COLLECTIONS } from '@constant/database';
import { apiCallComposer } from '@lib/apiHelper/apiCallComposer';
import getActiveSession from '@lib/auth/getActiveSession';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { GuestFeedback, GuestFeedbackFilter } from '@type/guestFeedback';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    startAfter,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';

const COLLECTION = DB_COLLECTIONS.GUEST_FEEDBACK;

/**
 * Get collection reference for guest feedback
 */
const getCollectionRef = () => {
    return collection(firebaseClient, COLLECTION);
};

/**
 * Get document reference for a specific feedback
 */
const getDocRef = (feedbackId: string) => {
    return doc(firebaseClient, COLLECTION, feedbackId);
};

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC OPERATIONS (No Auth Required)
// Used by POST /api/public/feedback/submit
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Submit new guest feedback (PUBLIC - no auth)
 * 
 * NOTE: This function does NOT use requestBodyComposer because
 * there is no authenticated session. All fields must be explicitly provided.
 * 
 * @param data - Feedback data from validated request
 * @returns Created feedback with ID
 */
export const submitGuestFeedback = async (
    data: Omit<GuestFeedback, 'id' | 'createdOn' | 'createdBy' | 'expiresOn' | 'status' | 'needsAttention'>
): Promise<GuestFeedback> => {
    const now = Timestamp.now();

    // Calculate expiry date (90 days from now)
    const expiresOn = Timestamp.fromMillis(
        now.toMillis() + (90 * 24 * 60 * 60 * 1000)
    );

    // Compute needsAttention: rating <= 3 AND status == 'new'
    const needsAttention = data.rating <= 3;

    // Firestore rejects undefined field values, so strip unset optional fields.
    const sanitizedData = Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined)
    ) as Omit<GuestFeedback, 'id' | 'createdOn' | 'createdBy' | 'expiresOn' | 'status' | 'needsAttention'>;

    const feedbackData: Omit<GuestFeedback, 'id'> = {
        ...sanitizedData,
        status: 'new',
        needsAttention,
        createdOn: now,
        createdBy: 'guest',
        expiresOn,
    };

    const docRef = await addDoc(getCollectionRef(), feedbackData);

    return {
        id: docRef.id,
        ...feedbackData,
    };
};

// ═══════════════════════════════════════════════════════════════════════════
// AUTHENTICATED OPERATIONS (Owner/Manager)
// Used by dashboard feedback inbox - uses apiCallComposer pattern
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get feedback list for a store (AUTHENTICATED)
 * Uses session from getActiveSession() for tenant/store isolation
 * 
 * @param filter - Filter type: all, needs_attention, resolved
 * @param pageSize - Number of items per page
 * @param cursorId - Pagination cursor (document ID from previous page)
 */
export const getFeedbackList = async (
    filter: GuestFeedbackFilter = 'all',
    pageSize: number = 50,
    cursorId?: string
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            // Build query constraints using session
            const constraints: any[] = [
                where('tId', '==', session.tId),
            ];

            // Store isolation (if sId provided, only that store; if not, HQ sees all)
            if (session.sId) {
                constraints.push(where('sId', '==', session.sId));
            }

            // Filter by status
            if (filter === 'needs_attention') {
                constraints.push(where('needsAttention', '==', true));
            } else if (filter === 'resolved') {
                constraints.push(where('status', '==', 'resolved'));
            }

            // Order by newest first
            constraints.push(orderBy('createdOn', 'desc'));

            // Pagination - if cursor provided, fetch that doc first for startAfter
            if (cursorId) {
                const cursorDoc = await getDoc(getDocRef(cursorId));
                if (cursorDoc.exists()) {
                    constraints.push(startAfter(cursorDoc));
                }
            }
            constraints.push(limit(pageSize + 1)); // +1 to check if there's more

            const q = query(getCollectionRef(), ...constraints);
            const snapshot = await getDocs(q);

            const items: GuestFeedback[] = [];
            let lastDocId: string | null = null;
            let hasMore = false;

            snapshot.docs.forEach((docSnap, index) => {
                if (index < pageSize) {
                    items.push({ id: docSnap.id, ...docSnap.data() } as GuestFeedback);
                    lastDocId = docSnap.id;
                } else {
                    hasMore = true;
                }
            });

            return { items, lastDocId, hasMore };
        },
        { filter, pageSize, cursorId },
        'getFeedbackList'
    );
};

/**
 * Get single feedback by ID (AUTHENTICATED)
 * Uses session from getActiveSession() for tenant isolation
 * 
 * @param feedbackId - Feedback document ID
 */
export const getFeedbackById = async (feedbackId: string) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();
            const docSnap = await getDoc(getDocRef(feedbackId));

            if (!docSnap.exists()) {
                return null;
            }

            const data = docSnap.data() as GuestFeedback;

            // Tenant/store isolation check. HQ sessions may not carry a single
            // sId; store-scoped manager sessions must stay inside their store.
            if (String(data.tId) !== String(session.tId)) {
                return null;
            }

            if (session.sId && String(data.sId) !== String(session.sId)) {
                return null;
            }

            return { id: docSnap.id, ...data };
        },
        feedbackId,
        'getFeedbackById'
    );
};

/**
 * Update feedback status (AUTHENTICATED)
 * Uses session from getActiveSession() for tenant isolation and modifiedBy
 * 
 * @param feedbackId - Feedback document ID
 * @param status - New status
 * @param ownerNote - Optional note
 */
export const updateFeedbackStatus = async (
    feedbackId: string,
    status: 'new' | 'resolved',
    ownerNote?: string
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            // First verify the feedback belongs to this tenant
            const existing = await getFeedbackById(feedbackId);
            if (!existing) {
                return null;
            }

            // Recompute needsAttention based on new status
            const needsAttention = existing.rating <= 3 && status === 'new';

            const updateData: Partial<GuestFeedback> = {
                status,
                needsAttention,
                modifiedOn: Timestamp.now(),
                modifiedBy: session.uId,
            };

            if (ownerNote !== undefined) {
                updateData.ownerNote = ownerNote;
            }

            await updateDoc(getDocRef(feedbackId), updateData);

            return {
                ...existing,
                ...updateData,
            };
        },
        { feedbackId, status, ownerNote },
        'updateFeedbackStatus'
    );
};

/**
 * Get feedback count by filter (for badge display)
 * Uses session from getActiveSession() for tenant/store isolation
 * 
 * NOTE: This is a simple count query. For large datasets,
 * consider using a counter document instead.
 * 
 * @param filter - Filter type
 */
export const getFeedbackCount = async (
    filter: GuestFeedbackFilter = 'needs_attention'
) => {
    return await apiCallComposer(
        async () => {
            const session = await getActiveSession();

            const constraints: any[] = [
                where('tId', '==', session.tId),
            ];

            if (session.sId) {
                constraints.push(where('sId', '==', session.sId));
            }

            if (filter === 'needs_attention') {
                constraints.push(where('needsAttention', '==', true));
            } else if (filter === 'resolved') {
                constraints.push(where('status', '==', 'resolved'));
            }

            const q = query(getCollectionRef(), ...constraints);
            const snapshot = await getDocs(q);

            return snapshot.size;
        },
        filter,
        'getFeedbackCount'
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MOL EVENT LOGGING (Menu Observation Layer)
// Anonymized event tracking for internal analytics
// ═══════════════════════════════════════════════════════════════════════════

export type FeedbackEventType = 'FEEDBACK_SUBMITTED' | 'FEEDBACK_RESOLVED';

interface FeedbackMOLEvent {
    eventType: FeedbackEventType;
    tId: number;
    sId: number;
    projectId: string;
    rating: number;
    timestamp: Timestamp;
    // No PII stored - only aggregatable metrics
}

/**
 * Log anonymized feedback event to MOL
 * Called when feedback is submitted or resolved
 * 
 * NOTE: This logs to insights collection for now (lightweight approach)
 * Future: Could move to dedicated MOL collection if volume requires
 */
export const logFeedbackMOLEvent = async (
    eventType: FeedbackEventType,
    tId: number,
    sId: number,
    projectId: string,
    rating: number
): Promise<void> => {
    try {
        const event: FeedbackMOLEvent = {
            eventType,
            tId,
            sId,
            projectId,
            rating,
            timestamp: Timestamp.now(),
        };

        // Log to the internal feedbackEvents collection with event type prefix.
        const eventsRef = collection(firebaseClient, DB_COLLECTIONS.FEEDBACK_EVENTS);
        await addDoc(eventsRef, {
            type: 'feedback_event',
            ...event,
        });
    } catch (error) {
        // Non-blocking - log error but don't fail the main operation
        console.error('[MOL] Failed to log feedback event:', error);
    }
};
