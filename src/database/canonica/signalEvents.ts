/**
 * Canonica — Signal Events DAL
 * 
 * Raw friction events from tickets, chat negative feedback, and escalations.
 * Append-only log. Used by signal clustering to generate mutation proposals.
 * 
 * RULES:
 * - Append-only (no update, no delete)
 * - Tenant-scoped (tId + sId mandatory)
 * - Entity binding required (entityId)
 * - TTL: Archive events > 12 months
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { addDoc, collection, doc, getDocs, limit, orderBy, query, Timestamp, where, writeBatch } from "@firebase/firestore";
import { canonicaRequestBodyComposer } from '@lib/canonica/documentComposer';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import { canonicaFirebaseClient } from "@lib/firebase/canonicaFirebaseClient";
import { CanonicaSignalEvent } from "@type/canonica";

const COLLECTION = DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS;

const getCollectionRef = () => collection(canonicaFirebaseClient, COLLECTION);

/**
 * Add a signal event (append-only)
 */
export const addSignalEvent = async (data: Omit<CanonicaSignalEvent, 'id'>) => {
    return await apiCallComposer(
        async () => {
            const submitData = await canonicaRequestBodyComposer(data);
            const docRef = await addDoc(getCollectionRef(), submitData);
            return { ...submitData, id: docRef.id } as CanonicaSignalEvent;
        },
        data,
        "addSignalEvent"
    );
};

/**
 * Get signal events for a specific entity within a rolling window
 */
export const getSignalEventsForEntity = async (
    tId: number,
    sId: number,
    entityId: string,
    windowDays: number = 14
) => {
    return await apiCallComposer(
        async () => {
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - windowDays);
            const windowTimestamp = Timestamp.fromDate(windowStart);

            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('entityId', '==', entityId),
                where('timestamp', '>=', windowTimestamp),
                orderBy('timestamp', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: CanonicaSignalEvent[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as CanonicaSignalEvent);
            });
            return list;
        },
        "getSignalEventsForEntity"
    );
};

/**
 * Get recent signal events for a tenant+store (for clustering)
 */
export const getRecentSignalEvents = async (
    tId: number,
    sId: number,
    windowDays: number = 14,
    maxResults: number = 500
) => {
    return await apiCallComposer(
        async () => {
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - windowDays);
            const windowTimestamp = Timestamp.fromDate(windowStart);

            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('timestamp', '>=', windowTimestamp),
                orderBy('timestamp', 'desc'),
                limit(maxResults)
            );
            const snapshot = await getDocs(q);
            const list: CanonicaSignalEvent[] = [];
            snapshot.forEach((d) => {
                list.push({ ...d.data(), id: d.id } as CanonicaSignalEvent);
            });
            return list;
        },
        "getRecentSignalEvents"
    );
};

/**
 * Get signal event count by type for an entity (for drift signal analysis)
 */
export const getSignalCountsForEntity = async (
    tId: number,
    sId: number,
    entityId: string,
    windowDays: number = 14
) => {
    const events = await getSignalEventsForEntity(tId, sId, entityId, windowDays);
    if (!events) return { ticket: 0, chat_negative: 0, escalation: 0, total: 0 };

    const counts = { ticket: 0, chat_negative: 0, escalation: 0, total: 0 };
    events.forEach((event) => {
        if (event.type === 'ticket') counts.ticket++;
        else if (event.type === 'chat_negative') counts.chat_negative++;
        else if (event.type === 'escalation') counts.escalation++;
        counts.total++;
    });
    return counts;
};

/**
 * Batch signal counts for multiple entities at once.
 * Uses Firestore `in` operator to query up to 30 entities per batch.
 * Reduces N reads to ceil(N/30) reads — 10-30x improvement for drift engine.
 * 
 * Phase 4 — Signal Quality optimization (3.3)
 */
export type BatchSignalCounts = Record<string, { ticket: number; chat_negative: number; escalation: number; total: number }>;

export const getBatchSignalCounts = async (
    tId: number,
    sId: number,
    entityIds: string[],
    windowDays: number = 14
): Promise<BatchSignalCounts> => {
    return await apiCallComposer(
        async () => {
            const result: BatchSignalCounts = {};
            // Initialize all entities with zero counts
            for (const eid of entityIds) {
                result[eid] = { ticket: 0, chat_negative: 0, escalation: 0, total: 0 };
            }

            if (entityIds.length === 0) return result;

            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - windowDays);
            const windowTimestamp = Timestamp.fromDate(windowStart);

            // Firestore `in` supports max 30 values per query
            const BATCH_SIZE = 30;
            for (let i = 0; i < entityIds.length; i += BATCH_SIZE) {
                const batch = entityIds.slice(i, i + BATCH_SIZE);
                const q = query(
                    getCollectionRef(),
                    where('tId', '==', tId),
                    where('sId', '==', sId),
                    where('entityId', 'in', batch),
                    where('timestamp', '>=', windowTimestamp),
                    limit(1000)
                );
                const snapshot = await getDocs(q);
                snapshot.forEach((d) => {
                    const data = d.data() as CanonicaSignalEvent;
                    const eid = data.entityId;
                    if (!result[eid]) return;
                    if (data.type === 'ticket') result[eid].ticket++;
                    else if (data.type === 'chat_negative') result[eid].chat_negative++;
                    else if (data.type === 'escalation') result[eid].escalation++;
                    result[eid].total++;
                });
            }

            return result;
        },
        "getBatchSignalCounts"
    );
};

/**
 * Archive (delete) signal events older than TTL.
 * Doctrine mandates: "Archive events > 12 months"
 * Called by nightly scheduler.
 * 
 * Phase 4 — Signal TTL (3.5)
 * 
 * @returns Number of signals archived (deleted)
 */
export const archiveExpiredSignals = async (
    tId: number,
    sId: number,
    ttlMonths: number = 12,
    batchLimit: number = 100
): Promise<number> => {
    return await apiCallComposer(
        async () => {
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - ttlMonths);
            const cutoffTimestamp = Timestamp.fromDate(cutoff);

            const q = query(
                getCollectionRef(),
                where('tId', '==', tId),
                where('sId', '==', sId),
                where('timestamp', '<', cutoffTimestamp),
                limit(batchLimit)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) return 0;

            // Use batched writes for efficient deletion (max 500 per batch)
            const batch = writeBatch(canonicaFirebaseClient);
            let count = 0;
            snapshot.forEach((d) => {
                batch.delete(doc(canonicaFirebaseClient, COLLECTION, d.id));
                count++;
            });
            await batch.commit();

            return count;
        },
        "archiveExpiredSignals"
    );
};
