import { Timestamp } from 'firebase-admin/firestore';
import {
    ANSWERLATTICE_RETENTION_DAYS,
    type AnswerlatticeRetentionKey,
    getAnswerlatticeRetentionExpiryMillis,
} from '@data/shared/answerlatticeRetention';

export { ANSWERLATTICE_RETENTION_DAYS, type AnswerlatticeRetentionKey };

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
    return Timestamp.fromMillis(getAnswerlatticeRetentionExpiryMillis(key, baseMs));
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
