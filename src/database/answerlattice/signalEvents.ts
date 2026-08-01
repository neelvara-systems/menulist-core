/**
 * Answerlattice — Signal Events DAL
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
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { PRODUCT_IDS } from '@constant/product';
import { ECOMSAI_PLATFORM_SUPPORT_USER_ROLE, ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { addDoc, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, Timestamp, where } from "@firebase/firestore";
import { answerlatticeRequestBodyComposer } from '@lib/answerlattice/documentComposer';
import { normalizeAnswerlatticeEntityId, normalizeAnswerlatticeResolvedEntityId, normalizeAnswerlatticeResolvedEntityIds } from '@lib/answerlattice/governanceIdBoundary';
import { apiCallComposer } from "@lib/apiHelper/apiCallComposer";
import getActiveSession from '@lib/auth/getActiveSession';
import { answerlatticeFirebaseClient } from "@lib/firebase/answerlatticeFirebaseClient";
import {
    buildAnswerlatticeSignalDocumentId,
    buildAnswerlatticeSignalPayloadFingerprint,
    normalizeAnswerlatticeSignalDeduplicationKey,
} from '@lib/answerlattice/signalIdentity';
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { ANSWERLATTICE_SIGNAL_TYPE, AnswerlatticeSignalEvent } from "@type/answerlattice";
import { getAnswerlatticeRetentionExpiryMillis } from '@data/shared/answerlatticeRetention';

const COLLECTION = DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS;
const MAX_RECENT_SIGNAL_EVENTS = 500;
const MAX_BATCH_SIGNAL_EVENTS_PER_QUERY = 1000;
const MAX_BATCH_SIGNAL_ENTITIES = 300;
const SIGNAL_TYPES = new Set<string>(Object.values(ANSWERLATTICE_SIGNAL_TYPE));

const getCollectionRef = () => collection(answerlatticeFirebaseClient, COLLECTION);
const clampPositiveInt = (value: number, fallback: number, max: number) => {
    if (!Number.isFinite(value) || value <= 0) return fallback;
    const normalized = Math.floor(value);
    return Math.min(normalized, max);
};

const isPlatformSession = (session: unknown): boolean => {
    const role = resolveExactSessionPlatformRole(session);
    return role === ECOMSAI_PLATFORM_USER_ROLE || role === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE;
};

const requireSignalScope = async (tIdValue: unknown, sIdValue: unknown) => {
    const tId = normalizeAnswerlatticeScopeDocumentId(tIdValue);
    const sId = normalizeAnswerlatticeScopeDocumentId(sIdValue);
    if (!tId || !sId) throw new Error('answerlattice_signal_scope_invalid');
    const session = await getActiveSession();
    if (!isPlatformSession(session)) {
        const sessionScope = resolveAnswerlatticeSessionScope(session);
        if (!sessionScope || sessionScope.tenantId !== tId || sessionScope.storeId !== sId) {
            throw new Error('answerlattice_signal_scope_mismatch');
        }
    }
    return { tId, sId };
};

const parseSignalEvent = (
    id: string,
    value: Record<string, any>,
    scope: { tId: number; sId: number },
): AnswerlatticeSignalEvent | null => {
    const entityId = normalizeAnswerlatticeEntityId(value.entityId);
    if (
        value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || value.tId !== scope.tId
        || value.sId !== scope.sId
        || !entityId
        || entityId !== value.entityId
        || typeof value.type !== 'string'
        || !SIGNAL_TYPES.has(value.type)
        || !(value.timestamp instanceof Timestamp)
        || (value.dedupKey !== undefined && (typeof value.dedupKey !== 'string' || value.dedupKey.length > 260))
        || (value.identityFingerprint !== undefined && (
            typeof value.identityFingerprint !== 'string'
            || !/^sigfp_[a-z0-9]+$/.test(value.identityFingerprint)
        ))
    ) return null;
    return { ...value, id, entityId, tId: scope.tId, sId: scope.sId } as AnswerlatticeSignalEvent;
};

/**
 * Add a signal event (append-only)
 */
export const addSignalEvent = async (data: Omit<AnswerlatticeSignalEvent, 'id' | 'pId'>) => {
    return await apiCallComposer(
        async () => {
            const scope = await requireSignalScope(data.tId, data.sId);
            const entityId = normalizeAnswerlatticeEntityId(data.entityId);
            if (!entityId) throw new Error('answerlattice_signal_entity_invalid');
            if (!SIGNAL_TYPES.has(data.type)) throw new Error('answerlattice_signal_type_invalid');
            if (!(data.timestamp instanceof Timestamp)) throw new Error('answerlattice_signal_timestamp_invalid');
            const dedupKey = data.dedupKey === undefined
                ? null
                : normalizeAnswerlatticeSignalDeduplicationKey(data.dedupKey);
            if (data.dedupKey !== undefined && dedupKey !== data.dedupKey) {
                throw new Error('answerlattice_signal_dedup_key_invalid');
            }
            const identityFingerprint = dedupKey
                ? buildAnswerlatticeSignalPayloadFingerprint({
                    type: data.type,
                    entityId,
                    deduplicationKey: dedupKey,
                    metadata: data.metadata,
                })
                : undefined;
            const submitData = await answerlatticeRequestBodyComposer({
                pId: PRODUCT_IDS.ANSWERLATTICE,
                tId: scope.tId,
                sId: scope.sId,
                entityId,
                type: data.type,
                timestamp: data.timestamp,
                ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
                ...(dedupKey ? { dedupKey } : {}),
                ...(identityFingerprint ? { identityFingerprint } : {}),
                ...(data.sourceContext !== undefined ? { sourceContext: data.sourceContext } : {}),
                ...(data.traceId !== undefined ? { traceId: data.traceId } : {}),
                ...(data.requestId !== undefined ? { requestId: data.requestId } : {}),
                expiresAt: Timestamp.fromMillis(getAnswerlatticeRetentionExpiryMillis('signalEvents')),
            }, { isNew: true });
            const deterministicId = dedupKey
                ? buildAnswerlatticeSignalDocumentId({
                    ...scope,
                    deduplicationKey: dedupKey,
                })
                : null;
            if (!deterministicId) {
                const createdRef = await addDoc(getCollectionRef(), submitData);
                return { ...submitData, id: createdRef.id } as AnswerlatticeSignalEvent;
            }

            const signalRef = doc(getCollectionRef(), deterministicId);
            try {
                await setDoc(signalRef, submitData);
            } catch (writeError) {
                const existingSnapshot = await getDoc(signalRef);
                const existing = existingSnapshot.exists()
                    ? parseSignalEvent(existingSnapshot.id, existingSnapshot.data(), scope)
                    : null;
                if (
                    existing
                    && existing.type === data.type
                    && existing.dedupKey === dedupKey
                    && (
                        existing.identityFingerprint
                        || buildAnswerlatticeSignalPayloadFingerprint({
                            type: existing.type,
                            entityId: existing.entityId,
                            deduplicationKey: existing.dedupKey,
                            metadata: existing.metadata,
                        })
                    ) === identityFingerprint
                ) return existing;
                if (existing) throw new Error('answerlattice_signal_replay_conflict');
                throw writeError;
            }
            return { ...submitData, id: deterministicId } as AnswerlatticeSignalEvent;
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
            const scope = await requireSignalScope(tId, sId);
            const normalizedEntityId = normalizeAnswerlatticeResolvedEntityId(entityId);
            if (!normalizedEntityId) return [];

            const boundedWindowDays = clampPositiveInt(windowDays, 14, 90);
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - boundedWindowDays);
            const windowTimestamp = Timestamp.fromDate(windowStart);

            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('entityId', '==', normalizedEntityId),
                where('timestamp', '>=', windowTimestamp),
                orderBy('timestamp', 'desc'),
                limit(200)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeSignalEvent[] = [];
            snapshot.forEach((d) => {
                const event = parseSignalEvent(d.id, d.data(), scope);
                if (event) list.push(event);
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
            const scope = await requireSignalScope(tId, sId);
            const boundedWindowDays = clampPositiveInt(windowDays, 14, 90);
            const boundedMaxResults = clampPositiveInt(maxResults, MAX_RECENT_SIGNAL_EVENTS, MAX_RECENT_SIGNAL_EVENTS);
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - boundedWindowDays);
            const windowTimestamp = Timestamp.fromDate(windowStart);

            const q = query(
                getCollectionRef(),
                where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                where('tId', '==', scope.tId),
                where('sId', '==', scope.sId),
                where('timestamp', '>=', windowTimestamp),
                orderBy('timestamp', 'desc'),
                limit(boundedMaxResults)
            );
            const snapshot = await getDocs(q);
            const list: AnswerlatticeSignalEvent[] = [];
            snapshot.forEach((d) => {
                const event = parseSignalEvent(d.id, d.data(), scope);
                if (event) list.push(event);
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
            const scope = await requireSignalScope(tId, sId);
            const result: BatchSignalCounts = {};
            const normalizedEntityIds = normalizeAnswerlatticeResolvedEntityIds(entityIds, MAX_BATCH_SIGNAL_ENTITIES);
            // Initialize all entities with zero counts
            for (const eid of normalizedEntityIds) {
                result[eid] = { ticket: 0, chat_negative: 0, escalation: 0, total: 0 };
            }

            if (normalizedEntityIds.length === 0) return result;

            const boundedWindowDays = clampPositiveInt(windowDays, 14, 90);
            const windowStart = new Date();
            windowStart.setDate(windowStart.getDate() - boundedWindowDays);
            const windowTimestamp = Timestamp.fromDate(windowStart);

            // Firestore `in` supports max 30 values per query
            const BATCH_SIZE = 30;
            for (let i = 0; i < normalizedEntityIds.length; i += BATCH_SIZE) {
                const batch = normalizedEntityIds.slice(i, i + BATCH_SIZE);
                const q = query(
                    getCollectionRef(),
                    where('pId', '==', PRODUCT_IDS.ANSWERLATTICE),
                    where('tId', '==', scope.tId),
                    where('sId', '==', scope.sId),
                    where('entityId', 'in', batch),
                    where('timestamp', '>=', windowTimestamp),
                    limit(MAX_BATCH_SIGNAL_EVENTS_PER_QUERY)
                );
                const snapshot = await getDocs(q);
                snapshot.forEach((d) => {
                    const data = parseSignalEvent(d.id, d.data(), scope);
                    if (!data) return;
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
