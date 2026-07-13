import { FieldValue, Timestamp, type DocumentReference } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

const NOTIFICATION_DELIVERY_LEASE_MS = 15 * 60 * 1_000;

const timestampMillis = (value: unknown): number | null => {
    if (value instanceof Timestamp) return value.toMillis();
    if (!value || typeof value !== 'object') return null;
    const toMillis = (value as { toMillis?: unknown }).toMillis;
    if (typeof toMillis !== 'function') return null;
    const millis = Number(toMillis.call(value));
    return Number.isFinite(millis) && millis > 0 ? millis : null;
};

export type NotificationDeliveryClaim = {
    claimId: string;
    claimed: true;
} | {
    claimed: false;
    reason: 'already_sent' | 'in_flight';
};

export async function claimNotificationDelivery(params: {
    fields: Record<string, unknown>;
    now?: Timestamp;
    ref: DocumentReference;
}): Promise<NotificationDeliveryClaim> {
    const now = params.now || Timestamp.now();
    const claimId = randomUUID();
    return params.ref.firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(params.ref);
        const current = snapshot.data() || {};
        if (current.status === 'sent') return { claimed: false, reason: 'already_sent' };
        const currentLease = timestampMillis(current.claimExpiresAt);
        if (current.status === 'sending' && currentLease !== null && currentLease > now.toMillis()) {
            return { claimed: false, reason: 'in_flight' };
        }
        transaction.set(params.ref, {
            ...params.fields,
            claimExpiresAt: Timestamp.fromMillis(now.toMillis() + NOTIFICATION_DELIVERY_LEASE_MS),
            claimId,
            createdAt: snapshot.exists && current.createdAt ? current.createdAt : now,
            modifiedAt: now,
            status: 'sending',
        }, { merge: true });
        return { claimed: true, claimId };
    });
}

export async function finalizeNotificationDelivery(params: {
    claimId: string;
    fields: Record<string, unknown>;
    ref: DocumentReference;
    status: 'failed' | 'sent' | 'skipped';
}): Promise<boolean> {
    return params.ref.firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(params.ref);
        const current = snapshot.data() || {};
        if (!snapshot.exists || current.status !== 'sending' || current.claimId !== params.claimId) {
            return false;
        }
        transaction.set(params.ref, {
            ...params.fields,
            claimExpiresAt: FieldValue.delete(),
            claimId: FieldValue.delete(),
            modifiedAt: Timestamp.now(),
            status: params.status,
        }, { merge: true });
        return true;
    });
}
