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
    eventKey?: unknown;
    eventType?: unknown;
    processingExpiresAt?: unknown;
    retryCount?: unknown;
    stateVersion?: unknown;
    status?: unknown;
    updatedAt?: unknown;
};

type ProjectedRazorpayWebhookRecord = {
    attemptId: string;
    createdAt: unknown;
    eventId: string | null;
    eventType: string | null;
    processingExpiresAt: unknown | null;
    retryCount: number;
    status: RazorpayWebhookState;
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
    try {
        const millis = Number(toMillis.call(value));
        return Number.isSafeInteger(millis) && millis > 0 ? millis : 0;
    } catch {
        return 0;
    }
}

function isValidAttemptId(value: unknown): value is string {
    return typeof value === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function projectOptionalProviderString(
    value: unknown,
    maxLength: number,
): string | null | undefined {
    if (value === null) return null;
    const normalized = normalizeOptionalProviderString(value, maxLength);
    return normalized ?? undefined;
}

function projectRazorpayWebhookRecord(
    value: RazorpayWebhookRecord | undefined,
    expectedEventKey: string,
): ProjectedRazorpayWebhookRecord | null {
    if (!value) return null;
    const status = value.status;
    const createdAtMillis = getTimestampMillis(value.createdAt);
    const updatedAtMillis = getTimestampMillis(value.updatedAt);
    const eventId = projectOptionalProviderString(value.eventId, 180);
    const eventType = projectOptionalProviderString(value.eventType, 120);
    const retryCount = value.retryCount;
    const processingExpiresAtMillis = getTimestampMillis(value.processingExpiresAt);
    if (
        value.stateVersion !== RAZORPAY_WEBHOOK_STATE_VERSION
        || value.eventKey !== expectedEventKey
        || !isValidAttemptId(value.attemptId)
        || !Number.isSafeInteger(retryCount)
        || Number(retryCount) < 0
        || Number(retryCount) >= Number.MAX_SAFE_INTEGER
        || createdAtMillis === 0
        || updatedAtMillis === 0
        || eventId === undefined
        || eventType === undefined
        || (status !== 'failed' && status !== 'processed' && status !== 'processing')
        || (status === 'processing' && processingExpiresAtMillis === 0)
        || (status !== 'processing' && value.processingExpiresAt !== undefined)
    ) {
        throw new Error('Razorpay webhook ledger state is invalid.');
    }
    return {
        attemptId: value.attemptId,
        createdAt: value.createdAt,
        eventId,
        eventType,
        processingExpiresAt: status === 'processing' ? value.processingExpiresAt : null,
        retryCount: Number(retryCount),
        status,
    };
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
        const current = projectRazorpayWebhookRecord(
            snapshot.data() as RazorpayWebhookRecord | undefined,
            eventKey,
        );
        if (current?.status === 'processed') {
            return { eventKey, outcome: 'processed' as const };
        }
        if (current?.status === 'processing') {
            const lockExpiry = getTimestampMillis(current.processingExpiresAt);
            if (lockExpiry > nowMillis) {
                return { eventKey, outcome: 'processing' as const };
            }
        }

        const retryCount = current ? current.retryCount + 1 : 0;
        transaction.set(eventRef, {
            attemptId,
            createdAt: current
                ? current.createdAt
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
        const current = projectRazorpayWebhookRecord(
            snapshot.data() as RazorpayWebhookRecord | undefined,
            eventKey,
        );
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
            createdAt: current.createdAt,
            eventId: current.eventId,
            eventKey,
            eventType: current.eventType,
            retryCount: current.retryCount,
            stateVersion: RAZORPAY_WEBHOOK_STATE_VERSION,
            ...completionData,
            status: params.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return 'updated';
    });
}
