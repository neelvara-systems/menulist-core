/**
 * Answerlattice — Integration Delivery Rate Limits
 *
 * Persistent, compact counters for external delivery caps. These counters stay
 * in platformSummary so delivery never needs broad log reads.
 */

import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { AdapterType, INTEGRATION_LIMITS } from './types';

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
    metadata?: Record<string, any>;
}): Promise<boolean> {
    const docRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_RATE_LIMITS).doc(params.docId);

    return db.runTransaction(async (transaction) => {
        const snap = await transaction.get(docRef);
        const currentCount = snap.exists ? Number(snap.data()?.count || 0) : 0;
        if (currentCount >= params.limit) return false;

        transaction.set(docRef, {
            ...(params.metadata || {}),
            count: currentCount + 1,
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
    const bucket = dayBucket();
    const allowed: string[] = [];

    for (const recipient of Array.from(new Set(recipients))) {
        const normalized = recipient.trim().toLowerCase();
        if (!normalized) continue;

        const ok = await consumeCounter({
            docId: `integrationEmailDaily_${tId}_${sId}_${hashValue(normalized)}_${bucket}`,
            limit: INTEGRATION_LIMITS.MAX_EMAIL_PER_DAY_PER_RECIPIENT,
            expiresAt: expiryFromNow(36 * 60 * 60 * 1000),
            metadata: { pId: 'AL', tId, sId, bucket, recipientHash: hashValue(normalized) },
        });

        if (ok) allowed.push(normalized);
    }

    return allowed;
}
