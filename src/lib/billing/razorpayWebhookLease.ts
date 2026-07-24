import { randomUUID } from 'crypto';
import { DB_COLLECTIONS } from '@constant/database';
import { admin, firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

const RAZORPAY_WEBHOOK_PROCESSING_LEASE_MS = 15 * 60 * 1000;
const RAZORPAY_WEBHOOK_STATE_VERSION = 1;

type RazorpayWebhookState = 'failed' | 'processed' | 'processing';

type RazorpayWebhookRecord = {
    attemptId?: unknown;
    createdAt?: unknown;
    eventId?: unknown;
    eventType?: unknown;
    processingExpiresAt?: unknown;
    retryCount?: unknown;
    stateVersion?: unknown;
    status?: unknown;
};

export type RazorpayWebhookClaim =
    | { attemptId: string; eventKey: string; outcome: 'acquired' }
    | { eventKey: string; outcome: 'processed' | 'processing' };

export type RazorpayWebhookCompletionOutcome =
    | 'already_processed'
    | 'ownership_lost'
    | 'updated';

function normalizeEventKey(eventKey: string): string {
    if (
        eventKey !== eventKey.trim()
        || eventKey.length > 180
        || !isValidFirestoreDocumentId(eventKey)
    ) {
        throw new Error('Invalid Razorpay webhook event key.');
    }
    return eventKey;
}

function normalizeOptionalProviderString(value: unknown, maxLength: number): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized && normalized.length <= maxLength ? normalized : null;
}

function getTimestampMillis(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis !== 'function') return 0;
    const millis = Number(toMillis.call(value));
    return Number.isFinite(millis) ? millis : 0;
}

export async function claimRazorpayWebhookEvent(params: {
    eventId?: unknown;
    eventKey: string;
    eventType?: unknown;
}): Promise<RazorpayWebhookClaim> {
    const eventKey = normalizeEventKey(params.eventKey);
    const eventRef = firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(eventKey);
    const attemptId = randomUUID();
    const nowMillis = Date.now();
    const processingExpiresAt = admin.firestore.Timestamp.fromMillis(
        nowMillis + RAZORPAY_WEBHOOK_PROCESSING_LEASE_MS,
    );
    const eventId = normalizeOptionalProviderString(params.eventId, 180);
    const eventType = normalizeOptionalProviderString(params.eventType, 120);

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(eventRef);
        const current = snapshot.data() as RazorpayWebhookRecord | undefined;
        if (current?.status === 'processed') {
            return { eventKey, outcome: 'processed' as const };
        }
        if (current?.status === 'processing') {
            const lockExpiry = getTimestampMillis(current.processingExpiresAt);
            if (lockExpiry > nowMillis) {
                return { eventKey, outcome: 'processing' as const };
            }
        } else if (current && current.status !== 'failed') {
            throw new Error('Razorpay webhook ledger state is invalid.');
        }

        const retryCount = current
            ? Math.max(0, Number.isSafeInteger(current.retryCount) ? Number(current.retryCount) : 0) + 1
            : 0;
        transaction.set(eventRef, {
            attemptId,
            createdAt: getTimestampMillis(current?.createdAt) > 0
                ? current?.createdAt
                : admin.firestore.FieldValue.serverTimestamp(),
            eventId,
            eventKey,
            eventType,
            processingExpiresAt,
            retryCount,
            stateVersion: RAZORPAY_WEBHOOK_STATE_VERSION,
            status: 'processing' satisfies RazorpayWebhookState,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { attemptId, eventKey, outcome: 'acquired' as const };
    });
}

export async function completeRazorpayWebhookEvent(params: {
    attemptId: string;
    data?: Record<string, unknown>;
    eventKey: string;
    status: Exclude<RazorpayWebhookState, 'processing'>;
}): Promise<RazorpayWebhookCompletionOutcome> {
    const eventKey = normalizeEventKey(params.eventKey);
    const eventRef = firestoreAdmin.collection(DB_COLLECTIONS.RAZORPAY_WEBHOOK_EVENTS).doc(eventKey);
    return firestoreAdmin.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(eventRef);
        const current = snapshot.data() as RazorpayWebhookRecord | undefined;
        if (current?.status === 'processed') return 'already_processed';
        if (
            current?.status !== 'processing'
            || current.attemptId !== params.attemptId
        ) return 'ownership_lost';

        const {
            attemptId: _ignoredAttemptId,
            createdAt: _ignoredCreatedAt,
            eventId: _ignoredEventId,
            eventKey: _ignoredEventKey,
            eventType: _ignoredEventType,
            processingExpiresAt: _ignoredProcessingExpiry,
            retryCount: _ignoredRetryCount,
            stateVersion: _ignoredStateVersion,
            status: _ignoredStatus,
            updatedAt: _ignoredUpdatedAt,
            ...completionData
        } = params.data || {};
        transaction.set(eventRef, {
            attemptId: params.attemptId,
            createdAt: getTimestampMillis(current.createdAt) > 0
                ? current.createdAt
                : admin.firestore.FieldValue.serverTimestamp(),
            eventId: current.eventId || null,
            eventKey,
            eventType: current.eventType || null,
            retryCount: Number.isSafeInteger(current.retryCount) ? Number(current.retryCount) : 0,
            stateVersion: RAZORPAY_WEBHOOK_STATE_VERSION,
            ...completionData,
            status: params.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return 'updated';
    });
}
