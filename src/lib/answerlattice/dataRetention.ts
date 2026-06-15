import { Timestamp } from 'firebase-admin/firestore';

const DAY_MS = 24 * 60 * 60 * 1000;

export const ANSWERLATTICE_RETENTION_DAYS = {
    schedulerRunLogs: 90,
    notificationLogs: 90,
    ownerNotificationEvents: 90,
    ownerNotificationDeliveries: 90,
    ownerNotificationRateLimits: 2,
    contactEnquiries: 365,
    queryEmbeddings: 30,
    aiSearchHistory: 90,
} as const;

export type AnswerlatticeRetentionKey = keyof typeof ANSWERLATTICE_RETENTION_DAYS;

const toMillis = (value?: Timestamp | Date | number | null): number => {
    if (!value) return Date.now();
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    return value.toMillis();
};

export function getAnswerlatticeRetentionDays(key: AnswerlatticeRetentionKey): number {
    return ANSWERLATTICE_RETENTION_DAYS[key];
}

export function getAnswerlatticeRetentionExpiry(
    key: AnswerlatticeRetentionKey,
    from?: Timestamp | Date | number | null,
): Timestamp {
    const baseMs = toMillis(from);
    return Timestamp.fromMillis(baseMs + getAnswerlatticeRetentionDays(key) * DAY_MS);
}

export function getAnswerlatticeRetentionFields(
    key: AnswerlatticeRetentionKey,
    from?: Timestamp | Date | number | null,
) {
    return {
        expiresAt: getAnswerlatticeRetentionExpiry(key, from),
        retentionDays: getAnswerlatticeRetentionDays(key),
    };
}
