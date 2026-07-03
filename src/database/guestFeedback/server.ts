import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import type { GuestFeedback } from '@type/guestFeedback';
import { getBoundedGuestFeedbackStringContext, logGuestFeedbackFailure } from './guestFeedbackDiagnostics';

type SubmitGuestFeedbackAdminInput = Omit<
    GuestFeedback,
    'id' | 'createdOn' | 'createdBy' | 'expiresOn' | 'status' | 'needsAttention'
>;

export type FeedbackEventType = 'FEEDBACK_SUBMITTED' | 'FEEDBACK_RESOLVED';
const DAY_MS = 24 * 60 * 60 * 1000;

function stripUndefined<T extends Record<string, unknown>>(data: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
}

export async function submitGuestFeedbackAdmin(
    data: SubmitGuestFeedbackAdminInput,
): Promise<GuestFeedback> {
    const now = admin.firestore.Timestamp.now();
    const expiresOn = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + (90 * 24 * 60 * 60 * 1000),
    );

    const feedbackData = {
        ...stripUndefined(data as unknown as Record<string, unknown>),
        status: 'new',
        needsAttention: data.rating <= 3,
        createdOn: now,
        createdBy: 'guest',
        expiresOn,
    };

    const docRef = await firestoreAdmin
        .collection(DB_COLLECTIONS.GUEST_FEEDBACK)
        .add(feedbackData);

    return {
        id: docRef.id,
        ...feedbackData,
    } as GuestFeedback;
}

export async function logFeedbackMOLEventAdmin(
    eventType: FeedbackEventType,
    tId: number,
    sId: number,
    projectId: string,
    rating: number,
): Promise<void> {
    try {
        const now = admin.firestore.Timestamp.now();
        const retentionDays = Number(FEATURE_FLAGS.FEEDBACK_EVENT_RETENTION_DAYS || 180);
        await firestoreAdmin.collection(DB_COLLECTIONS.FEEDBACK_EVENTS).add({
            type: 'feedback_event',
            eventType,
            tId,
            sId,
            projectId,
            rating,
            timestamp: now,
            expiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + retentionDays * DAY_MS),
        });
    } catch (error) {
        // Non-blocking operational signal. Feedback submission must not fail.
        logGuestFeedbackFailure('guest_feedback_admin_mol_event_log_failed', error, {
            eventType,
            rating,
            ...getBoundedGuestFeedbackStringContext('tenantId', tId),
            ...getBoundedGuestFeedbackStringContext('storeId', sId),
            ...getBoundedGuestFeedbackStringContext('projectId', projectId),
        });
    }
}
