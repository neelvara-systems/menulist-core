/**
 * Answerlattice — Integration Delivery Rate Limits
 *
 * Persistent, compact counters for external delivery caps. These counters stay
 * in platformSummary so delivery never needs broad log reads.
 */

import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { parseExactAnswerlatticeScope } from '../answerlattice/scopeBoundary';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { ADAPTER_TYPES, AdapterType, INTEGRATION_LIMITS } from './types';

const ADAPTER_TYPE_SET = new Set<string>(Object.values(ADAPTER_TYPES));

function hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function minuteBucket(date = new Date()): string {
    return date.toISOString().slice(0, 16).replace(/[-:T]/g, '');
}

function dayBucket(date = new Date()): string {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function expiryFromNow(ms: number): Timestamp {
    return Timestamp.fromMillis(Date.now() + ms);
}

async function consumeCounter(params: {
    docId: string;
    limit: number;
    expiresAt: Timestamp;
    metadata: Record<string, unknown>;
}): Promise<boolean> {
    const docRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_RATE_LIMITS).doc(params.docId);

    return db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        if (snap.exists) {
            const existing = snap.data() || {};
            for (const [key, expected] of Object.entries(params.metadata)) {
                if (existing[key] !== expected) {
                    throw new Error('Answerlattice integration rate counter ownership mismatch');
                }
            }
        }
        const currentCount = snap.exists ? snap.data()?.count : 0;
        if (!Number.isSafeInteger(currentCount) || Number(currentCount) < 0) {
            throw new Error('Answerlattice integration rate counter is invalid');
        }
        if (currentCount >= params.limit) return false;

        transaction.set(docRef, {
            ...params.metadata,
            count: Number(currentCount) + 1,
            expiresAt: params.expiresAt,
            modifiedOn: Timestamp.now(),
        }, { merge: true });
        return true;
    });
}

export async function consumeAdapterMinuteSlot(
    tId: number,
    sId: number,
    adapter: AdapterType,
): Promise<boolean> {
    if (!parseExactAnswerlatticeScope(tId, sId) || !ADAPTER_TYPE_SET.has(adapter)) {
        throw new Error('Answerlattice integration rate-limit scope is invalid');
    }
    const bucket = minuteBucket();
    return consumeCounter({
        docId: `integrationRateMinute_${tId}_${sId}_${adapter}_${bucket}`,
        limit: INTEGRATION_LIMITS.MAX_EVENTS_PER_MINUTE_PER_ADAPTER,
        expiresAt: expiryFromNow(2 * 60 * 60 * 1000),
        metadata: { pId: 'AL', tId, sId, adapter, bucket },
    });
}

export async function consumeAdapterDailySlot(
    tId: number,
    sId: number,
    adapter: AdapterType,
): Promise<boolean> {
    if (!parseExactAnswerlatticeScope(tId, sId) || !ADAPTER_TYPE_SET.has(adapter)) {
        throw new Error('Answerlattice integration rate-limit scope is invalid');
    }
    const bucket = dayBucket();
    return consumeCounter({
        docId: `integrationRateDaily_${tId}_${sId}_${adapter}_${bucket}`,
        limit: INTEGRATION_LIMITS.MAX_EVENTS_PER_DAY_PER_ADAPTER,
        expiresAt: expiryFromNow(36 * 60 * 60 * 1000),
        metadata: { pId: 'AL', tId, sId, adapter, bucket },
    });
}

export async function filterEmailRecipientsByDailyLimit(
    tId: number,
    sId: number,
    recipients: string[],
): Promise<string[]> {
    if (!parseExactAnswerlatticeScope(tId, sId)) {
        throw new Error('Answerlattice integration email rate-limit scope is invalid');
    }
    const bucket = dayBucket();
    const normalizedRecipients = Array.from(new Set(
        recipients
            .filter((recipient): recipient is string => typeof recipient === 'string')
            .map((recipient) => recipient.trim().toLowerCase())
            .filter(Boolean),
    )).slice(0, INTEGRATION_LIMITS.MAX_EMAIL_RECIPIENTS);
    if (normalizedRecipients.length === 0) return [];

    const entries = normalizedRecipients.map((recipient) => {
        const recipientHash = hashValue(recipient);
        return {
            recipient,
            metadata: { pId: 'AL', tId, sId, bucket, recipientHash },
            ref: db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_RATE_LIMITS)
                .doc(`integrationEmailDaily_${tId}_${sId}_${recipientHash}_${bucket}`),
        };
    });
    const expiresAt = expiryFromNow(36 * 60 * 60 * 1000);

    return db.runTransaction(async (transaction) => {
        const snapshots = [];
        for (const entry of entries) {
            snapshots.push(await transaction.get(entry.ref));
        }

        const counts = snapshots.map((snapshot, index) => {
            const existing = snapshot.exists ? snapshot.data() || {} : {};
            for (const [key, expected] of Object.entries(entries[index].metadata)) {
                if (snapshot.exists && existing[key] !== expected) {
                    throw new Error('Answerlattice integration rate counter ownership mismatch');
                }
            }
            const currentCount = snapshot.exists ? existing.count : 0;
            if (!Number.isSafeInteger(currentCount) || Number(currentCount) < 0) {
                throw new Error('Answerlattice integration rate counter is invalid');
            }
            return Number(currentCount);
        });

        if (counts.some((count) => count >= INTEGRATION_LIMITS.MAX_EMAIL_PER_DAY_PER_RECIPIENT)) {
            return [];
        }

        const modifiedOn = Timestamp.now();
        entries.forEach((entry, index) => {
            transaction.set(entry.ref, {
                ...entry.metadata,
                count: counts[index] + 1,
                expiresAt,
                modifiedOn,
            }, { merge: true });
        });
        return entries.map((entry) => entry.recipient);
    });
}
