import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import type { GuestFeedback } from '@type/guestFeedback';
import { createHash } from 'crypto';
import { getBoundedErrorCode } from '@lib/monitoring/boundedLogContext';
import { getBoundedGuestFeedbackStringContext, logGuestFeedbackFailure } from './guestFeedbackDiagnostics';

type SubmitGuestFeedbackAdminInput = Pick<
    GuestFeedback,
    'customerEmail' | 'customerName' | 'customerPhone' | 'message' | 'projectId' | 'rating' | 'sId' | 'source' | 'tId'
> & { submissionId: string };

type SubmitGuestFeedbackAdminResult = {
    created: boolean;
    feedback: GuestFeedback & { id: string };
};

export type FeedbackEventType = 'FEEDBACK_SUBMITTED' | 'FEEDBACK_RESOLVED';
const DAY_MS = 24 * 60 * 60 * 1000;

const hashGuestFeedbackValue = (value: string): string => (
    createHash('sha256').update(value).digest('hex')
);

const isAlreadyExistsError = (error: unknown): boolean => {
    const code = getBoundedErrorCode(error);
    return code === '6' || code === 'already-exists' || code === 'ALREADY_EXISTS';
};

export async function submitGuestFeedbackAdmin(
    data: SubmitGuestFeedbackAdminInput,
): Promise<SubmitGuestFeedbackAdminResult> {
    const now = admin.firestore.Timestamp.now();
    const expiresOn = admin.firestore.Timestamp.fromMillis(
        now.toMillis() + (90 * 24 * 60 * 60 * 1000),
    );

    const requestFingerprintHash = hashGuestFeedbackValue(JSON.stringify({
        customerEmail: data.customerEmail || '',
        customerName: data.customerName || '',
        customerPhone: data.customerPhone || '',
        message: data.message || '',
        projectId: data.projectId,
        rating: data.rating,
        sId: data.sId,
        source: data.source,
        tId: data.tId,
    }));
    const feedbackData = {
        tId: data.tId,
        sId: data.sId,
        projectId: data.projectId,
        rating: data.rating,
        source: data.source,
        ...(data.message !== undefined ? { message: data.message } : {}),
        ...(data.customerName !== undefined ? { customerName: data.customerName } : {}),
        ...(data.customerPhone !== undefined ? { customerPhone: data.customerPhone } : {}),
        ...(data.customerEmail !== undefined ? { customerEmail: data.customerEmail } : {}),
        status: 'new' as const,
        needsAttention: data.rating <= 3,
        createdOn: now,
        createdBy: 'guest' as const,
        expiresOn,
        requestFingerprintHash,
    };

    const feedbackId = `guest_feedback_${hashGuestFeedbackValue([
        data.tId,
        data.sId,
        data.projectId,
        data.submissionId,
    ].join(':')).slice(0, 40)}`;
    const docRef = firestoreAdmin
        .collection(DB_COLLECTIONS.GUEST_FEEDBACK)
        .doc(feedbackId);

    try {
        await docRef.create(feedbackData);
        return {
            created: true,
            feedback: {
                id: docRef.id,
                ...feedbackData,
            },
        };
    } catch (error) {
        if (!isAlreadyExistsError(error)) throw error;

        const existingSnapshot = await docRef.get();
        const existing = existingSnapshot.data();
        if (
            !existingSnapshot.exists
            || existing?.tId !== data.tId
            || existing?.sId !== data.sId
            || existing?.projectId !== data.projectId
            || existing?.requestFingerprintHash !== requestFingerprintHash
        ) {
            throw new Error('Guest feedback submission replay conflict');
        }

        return {
            created: false,
            feedback: {
                id: docRef.id,
                ...existing,
            } as GuestFeedback & { id: string },
        };
    }
}

export async function logFeedbackMOLEventAdmin(
    eventType: FeedbackEventType,
    tId: number,
    sId: number,
    projectId: string,
    rating: number,
    feedbackId?: string,
): Promise<void> {
    try {
        const now = admin.firestore.Timestamp.now();
        const retentionDays = Number(FEATURE_FLAGS.FEEDBACK_EVENT_RETENTION_DAYS || 180);
        const eventData = {
            type: 'feedback_event',
            eventType,
            tId,
            sId,
            projectId,
            rating,
            timestamp: now,
            expiresAt: admin.firestore.Timestamp.fromMillis(now.toMillis() + retentionDays * DAY_MS),
        };
        const collectionRef = firestoreAdmin.collection(DB_COLLECTIONS.FEEDBACK_EVENTS);
        if (eventType === 'FEEDBACK_SUBMITTED' && feedbackId) {
            const eventRef = collectionRef.doc(`feedback_submitted_${feedbackId}`);
            try {
                await eventRef.create(eventData);
            } catch (error) {
                if (!isAlreadyExistsError(error)) throw error;
            }
        } else {
            await collectionRef.add(eventData);
        }
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
