/**
 * Answerlattice — Support Board Nightly Sync
 *
 * Converts only meaningful support signals into private owner work cards:
 * repeated canonical misses, negative feedback clusters, drifted answers, and
 * recent release impact. It is intentionally bounded, deterministic, and
 * review-only. Humans still approve all canonical knowledge changes.
 */

import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';

const PRODUCT_ID = 'AL';
const ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED = 'ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED';

const SUPPORT_BOARD_STATUS = {
    NEW_SIGNALS: 'new_signals',
    NEEDS_TRIAGE: 'needs_triage',
    NEEDS_ANSWER: 'needs_answer',
    RESOLVED: 'resolved',
} as const;

const SUPPORT_BOARD_PRIORITY = {
    MEDIUM: 'medium',
    HIGH: 'high',
} as const;

const SUPPORT_BOARD_SOURCE_TYPE = {
    SIGNAL: 'signal',
    CANONICAL_ANSWER: 'canonical_answer',
    RELEASE: 'release',
} as const;

const SUPPORT_BOARD_SYNC_LIMITS = {
    windowDays: 14,
    releaseWindowDays: 14,
    maxSearchHistoryReads: 500,
    maxSignalReads: 500,
    maxDriftedAnswerReads: 200,
    maxReleaseReads: 50,
    maxExistingBoardReads: 120,
    maxCardsCreatedOrUpdatedPerRun: 20,
    minFallbackMissesForCard: 3,
    minLowConfidenceMissesForCard: 3,
    minNegativeSignalsForCard: 3,
    minEscalationSignalsForCard: 2,
} as const;

interface EntityInfo {
    name: string;
    type: string;
}

interface SupportBoardCandidate {
    sourceType: string;
    sourceId: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    tags: string[];
    relatedAnswerId?: string | null;
    relatedReleaseId?: string | null;
    relatedEntityId?: string | null;
    relatedContextKeys?: string[];
    signalCount: number;
    syncReason: string;
}

interface SupportBoardSourceDocs {
    entityIds: string[];
    historyDocs: FirebaseFirestore.QueryDocumentSnapshot[];
    signalDocs: FirebaseFirestore.QueryDocumentSnapshot[];
    driftAnswerDocs: FirebaseFirestore.QueryDocumentSnapshot[];
}

interface SupportBoardSyncDiagnostic {
    phase: string;
    operation: string;
    error: string;
    code?: string;
    name?: string;
    sourceStatusCode?: number | null;
    details?: Record<string, any>;
}

export interface SupportBoardSyncResult {
    enabled: boolean;
    candidatesAnalyzed: number;
    cardsCreated: number;
    cardsUpdated: number;
    cardsSkippedResolved: number;
    cardsSkippedUnchanged: number;
    summaryWritten: boolean;
    openCards: number;
    needsAnswerCards: number;
    highPriorityCards: number;
    totalRecentCards: number;
    errors: SupportBoardSyncDiagnostic[];
}

function getSupportBoardSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const sourceStatusCode = typeof source.status === 'number'
        ? source.status
        : (typeof source.statusCode === 'number' ? source.statusCode : null);

    return {
        sourceErrorName: typeof source.name === 'string' ? source.name : null,
        sourceErrorCode: typeof source.code === 'string' || typeof source.code === 'number' ? source.code : null,
        sourceStatusCode,
    };
}

function getSupportBoardScopeContext(tId?: number, sId?: number): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
} {
    return {
        hasTenantScope: Number.isFinite(tId),
        hasStoreScope: Number.isFinite(sId),
    };
}

function stableStringify(value: any): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function hashPayload(value: any): string {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function supportBoardDocId(tId: number, sId: number, sourceType: string, sourceId: string): string {
    const digest = hashPayload({ tId, sId, sourceType, sourceId }).slice(0, 24);
    return `sb_${tId}_${sId}_${digest}`;
}

function truncateText(value: unknown, maxLength: number): string {
    return String(value || '').trim().replace(/\s+/g, ' ').slice(0, maxLength);
}

function buildSystemStatusEntry(status: string, now: Timestamp, remark: string) {
    return {
        status,
        timestamp: now,
        createdBy: {
            id: 'system:support_board_nightly',
            name: 'Answerlattice nightly',
            email: 'system@answerlattice.internal',
        },
        remark,
    };
}

function cleanTags(tags: Array<unknown>): string[] {
    return Array.from(new Set(tags
        .map(tag => truncateText(tag, 48).toLowerCase())
        .filter(Boolean)))
        .slice(0, 8);
}

function toMillis(value: any): number {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function getEntityLabel(entityId: string, entities: Map<string, EntityInfo>): string {
    return entities.get(entityId)?.name || entityId;
}

async function loadEntityInfo(tId: number, sId: number, entityIds: string[]): Promise<Map<string, EntityInfo>> {
    const uniqueIds = Array.from(new Set(entityIds.filter(Boolean)));
    const result = new Map<string, EntityInfo>();

    for (let i = 0; i < uniqueIds.length; i += 30) {
        const batch = uniqueIds.slice(i, i + 30);
        const refs = batch.map(entityId => db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(entityId));
        const docs = await db.getAll(...refs);

        for (const doc of docs) {
            if (!doc.exists) continue;
            const data = doc.data() || {};
            if (data.tId !== tId || data.sId !== sId) continue;
            result.set(doc.id, {
                name: truncateText(data.name || doc.id, 90),
                type: truncateText(data.type || 'feature', 40),
            });
        }
    }

    return result;
}

function buildFallbackCandidates(
    historyDocs: FirebaseFirestore.QueryDocumentSnapshot[],
    entities: Map<string, EntityInfo>,
): SupportBoardCandidate[] {
    const groups = new Map<string, {
        missCount: number;
        lowConfidenceCount: number;
        samples: string[];
        contextKeys: Set<string>;
    }>();

    for (const doc of historyDocs) {
        const data = doc.data();
        const entityIds: string[] = Array.isArray(data.matchedEntityIds) ? data.matchedEntityIds : [];
        const safeEntityIds = entityIds.filter(entityId => entityId && entityId !== 'unresolved');
        if (safeEntityIds.length === 0) continue;

        for (const entityId of safeEntityIds) {
            const group = groups.get(entityId) || {
                missCount: 0,
                lowConfidenceCount: 0,
                samples: [],
                contextKeys: new Set<string>(),
            };
            group.missCount++;
            if (data.confidence === 'low' || data.confidence === 'none') group.lowConfidenceCount++;
            const sample = truncateText(data.query || data.searchQuery || data.prompt, 160);
            if (sample && group.samples.length < 3) group.samples.push(sample);
            const contextKeys = Array.isArray(data.contextKeys) ? data.contextKeys : [];
            contextKeys.forEach((key: unknown) => {
                const cleaned = truncateText(key, 48);
                if (cleaned) group.contextKeys.add(cleaned);
            });
            groups.set(entityId, group);
        }
    }

    return Array.from(groups.entries())
        .filter(([, group]) => (
            group.missCount >= SUPPORT_BOARD_SYNC_LIMITS.minFallbackMissesForCard
            || group.lowConfidenceCount >= SUPPORT_BOARD_SYNC_LIMITS.minLowConfidenceMissesForCard
        ))
        .sort((a, b) => b[1].missCount - a[1].missCount)
        .map(([entityId, group]) => {
            const entityName = getEntityLabel(entityId, entities);
            const priority = group.missCount >= 5 || group.lowConfidenceCount >= 5
                ? SUPPORT_BOARD_PRIORITY.HIGH
                : SUPPORT_BOARD_PRIORITY.MEDIUM;
            return {
                sourceType: SUPPORT_BOARD_SOURCE_TYPE.SIGNAL,
                sourceId: `fallback:${entityId}`,
                title: `Repeated misses for ${entityName}`,
                description: [
                    `${group.missCount} non-canonical or low-confidence answer${group.missCount === 1 ? '' : 's'} were detected for ${entityName} in the last ${SUPPORT_BOARD_SYNC_LIMITS.windowDays} days.`,
                    group.samples.length > 0 ? `Examples: ${group.samples.join(' | ')}` : '',
                    'Review whether this needs a canonical answer, FAQ, or article update.',
                ].filter(Boolean).join(' '),
                status: SUPPORT_BOARD_STATUS.NEEDS_ANSWER,
                priority,
                tags: cleanTags(['recurring-fallback', group.lowConfidenceCount > 0 ? 'low-confidence' : '', entities.get(entityId)?.type]),
                relatedEntityId: entityId,
                relatedContextKeys: Array.from(group.contextKeys),
                signalCount: group.missCount,
                syncReason: 'recurring_fallback_or_low_confidence',
            };
        });
}

function buildSignalClusterCandidates(
    signalDocs: FirebaseFirestore.QueryDocumentSnapshot[],
    entities: Map<string, EntityInfo>,
): SupportBoardCandidate[] {
    const groups = new Map<string, {
        chatNegative: number;
        escalation: number;
        samples: string[];
        contextKeys: Set<string>;
    }>();

    for (const doc of signalDocs) {
        const data = doc.data();
        const entityId = typeof data.entityId === 'string' ? data.entityId : '';
        if (!entityId || entityId === 'unresolved') continue;
        if (data.type !== 'chat_negative' && data.type !== 'escalation') continue;

        const group = groups.get(entityId) || {
            chatNegative: 0,
            escalation: 0,
            samples: [],
            contextKeys: new Set<string>(),
        };

        if (data.type === 'chat_negative') group.chatNegative++;
        if (data.type === 'escalation') group.escalation++;
        const metadata = data.metadata || {};
        const sample = truncateText(metadata.query || metadata.subject || metadata.reason || metadata.message, 160);
        if (sample && group.samples.length < 3) group.samples.push(sample);
        const contextKeys = Array.isArray(metadata.contextKeys) ? metadata.contextKeys : [];
        contextKeys.forEach((key: unknown) => {
            const cleaned = truncateText(key, 48);
            if (cleaned) group.contextKeys.add(cleaned);
        });
        groups.set(entityId, group);
    }

    return Array.from(groups.entries())
        .filter(([, group]) => (
            group.chatNegative >= SUPPORT_BOARD_SYNC_LIMITS.minNegativeSignalsForCard
            || group.escalation >= SUPPORT_BOARD_SYNC_LIMITS.minEscalationSignalsForCard
        ))
        .sort((a, b) => (b[1].chatNegative + b[1].escalation) - (a[1].chatNegative + a[1].escalation))
        .map(([entityId, group]) => {
            const entityName = getEntityLabel(entityId, entities);
            const totalSignals = group.chatNegative + group.escalation;
            return {
                sourceType: SUPPORT_BOARD_SOURCE_TYPE.SIGNAL,
                sourceId: `signal_cluster:${entityId}`,
                title: `Support friction on ${entityName}`,
                description: [
                    `${totalSignals} negative feedback or escalation signal${totalSignals === 1 ? '' : 's'} were detected for ${entityName} in the last ${SUPPORT_BOARD_SYNC_LIMITS.windowDays} days.`,
                    group.samples.length > 0 ? `Examples: ${group.samples.join(' | ')}` : '',
                    'Review the existing approved answer and related help content.',
                ].filter(Boolean).join(' '),
                status: group.escalation > 0 ? SUPPORT_BOARD_STATUS.NEW_SIGNALS : SUPPORT_BOARD_STATUS.NEEDS_TRIAGE,
                priority: group.escalation > 0 || totalSignals >= 5
                    ? SUPPORT_BOARD_PRIORITY.HIGH
                    : SUPPORT_BOARD_PRIORITY.MEDIUM,
                tags: cleanTags(['negative-feedback', group.escalation > 0 ? 'escalation' : '', entities.get(entityId)?.type]),
                relatedEntityId: entityId,
                relatedContextKeys: Array.from(group.contextKeys),
                signalCount: totalSignals,
                syncReason: 'negative_feedback_or_escalation_cluster',
            };
        });
}

function buildDriftCandidates(
    driftAnswerDocs: FirebaseFirestore.QueryDocumentSnapshot[],
): SupportBoardCandidate[] {
    return driftAnswerDocs.map(doc => {
        const data = doc.data();
        const entityIds: string[] = Array.isArray(data.scope?.entityIds) ? data.scope.entityIds : [];
        const driftReason = truncateText(data.governance?.driftReason || 'Drift review is required.', 500);
        return {
            sourceType: SUPPORT_BOARD_SOURCE_TYPE.CANONICAL_ANSWER,
            sourceId: doc.id,
            title: `Review stale answer: ${truncateText(data.title || doc.id, 100)}`,
            description: `${driftReason} Confirm whether the approved answer still matches the current product before users rely on it.`,
            status: SUPPORT_BOARD_STATUS.NEEDS_ANSWER,
            priority: SUPPORT_BOARD_PRIORITY.HIGH,
            tags: cleanTags(['stale-answer', 'drift-review']),
            relatedAnswerId: doc.id,
            relatedEntityId: entityIds[0] || null,
            relatedContextKeys: entityIds.slice(0, 5),
            signalCount: 1,
            syncReason: 'drifted_canonical_answer',
        };
    });
}

async function buildReleaseImpactCandidates(
    tId: number,
    sId: number,
    driftCandidates: SupportBoardCandidate[],
    entities: Map<string, EntityInfo>,
): Promise<SupportBoardCandidate[]> {
    const driftedEntityIds = new Set(driftCandidates.map(candidate => candidate.relatedEntityId).filter(Boolean) as string[]);
    if (driftedEntityIds.size === 0) return [];

    const releasesSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_RELEASES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .limit(SUPPORT_BOARD_SYNC_LIMITS.maxReleaseReads)
        .get();

    const releaseCutoffMs = Date.now() - SUPPORT_BOARD_SYNC_LIMITS.releaseWindowDays * 24 * 60 * 60 * 1000;

    return releasesSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((release: any) => toMillis(release.releasedAt || release.createdOn) >= releaseCutoffMs)
        .map((release: any) => {
            const changedEntityIds: string[] = Array.isArray(release.entityChanges) ? release.entityChanges : [];
            const impacted = changedEntityIds.filter(entityId => driftedEntityIds.has(entityId));
            if (impacted.length === 0) return null;
            const names = impacted.slice(0, 4).map(entityId => getEntityLabel(entityId, entities));
            return {
                sourceType: SUPPORT_BOARD_SOURCE_TYPE.RELEASE,
                sourceId: release.id,
                title: `Release impact review: ${truncateText(release.versionLabel || release.id, 80)}`,
                description: `Recent release ${truncateText(release.versionLabel || release.id, 80)} changed ${impacted.length} entity${impacted.length === 1 ? '' : 'ies'} with stale or review-required support answers: ${names.join(', ')}.`,
                status: SUPPORT_BOARD_STATUS.NEEDS_ANSWER,
                priority: SUPPORT_BOARD_PRIORITY.HIGH,
                tags: cleanTags(['release-impact', 'drift-review']),
                relatedReleaseId: release.id,
                relatedEntityId: impacted[0] || null,
                relatedContextKeys: impacted.slice(0, 5),
                signalCount: impacted.length,
                syncReason: 'release_impact_on_drifted_answers',
            } as SupportBoardCandidate;
        })
        .filter(Boolean) as SupportBoardCandidate[];
}

async function loadSupportBoardSourceDocs(tId: number, sId: number): Promise<SupportBoardSourceDocs> {
    const entityIds = new Set<string>();
    const windowStart = Timestamp.fromMillis(Date.now() - SUPPORT_BOARD_SYNC_LIMITS.windowDays * 24 * 60 * 60 * 1000);

    const [historySnap, signalSnap, driftSnap] = await Promise.all([
        db.collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('canonical', '==', false)
            .where('createdOn', '>=', windowStart)
            .orderBy('createdOn', 'desc')
            .limit(SUPPORT_BOARD_SYNC_LIMITS.maxSearchHistoryReads)
            .get(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('timestamp', '>=', windowStart)
            .orderBy('timestamp', 'desc')
            .limit(SUPPORT_BOARD_SYNC_LIMITS.maxSignalReads)
            .get(),
        db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('governance.driftFlag', '==', true)
            .limit(SUPPORT_BOARD_SYNC_LIMITS.maxDriftedAnswerReads)
            .get(),
    ]);

    for (const doc of historySnap.docs) {
        const ids = Array.isArray(doc.data().matchedEntityIds) ? doc.data().matchedEntityIds : [];
        ids.forEach((id: unknown) => {
            if (typeof id === 'string' && id && id !== 'unresolved') entityIds.add(id);
        });
    }

    for (const doc of signalSnap.docs) {
        const id = doc.data().entityId;
        if (typeof id === 'string' && id && id !== 'unresolved') entityIds.add(id);
    }

    for (const doc of driftSnap.docs) {
        const ids = Array.isArray(doc.data().scope?.entityIds) ? doc.data().scope.entityIds : [];
        ids.forEach((id: unknown) => {
            if (typeof id === 'string' && id && id !== 'unresolved') entityIds.add(id);
        });
    }

    return {
        entityIds: Array.from(entityIds),
        historyDocs: historySnap.docs,
        signalDocs: signalSnap.docs,
        driftAnswerDocs: driftSnap.docs,
    };
}

function buildCardPayload(tId: number, sId: number, candidate: SupportBoardCandidate, now: Timestamp) {
    const sourceHash = hashPayload({
        title: candidate.title,
        description: candidate.description,
        priority: candidate.priority,
        tags: candidate.tags,
        relatedAnswerId: candidate.relatedAnswerId || null,
        relatedReleaseId: candidate.relatedReleaseId || null,
        relatedEntityId: candidate.relatedEntityId || null,
        relatedContextKeys: candidate.relatedContextKeys || [],
        signalCount: candidate.signalCount,
        syncReason: candidate.syncReason,
    });

    return {
        pId: PRODUCT_ID,
        tId,
        sId,
        title: truncateText(candidate.title, 140),
        description: truncateText(candidate.description, 1200),
        status: candidate.status,
        priority: candidate.priority,
        sourceType: candidate.sourceType,
        sourceId: candidate.sourceId,
        assigneeId: null,
        assigneeName: null,
        dueDate: null,
        tags: candidate.tags,
        relatedTicketId: null,
        relatedConversationId: null,
        relatedAnswerId: candidate.relatedAnswerId || null,
        relatedProposalId: null,
        relatedReleaseId: candidate.relatedReleaseId || null,
        relatedSurfaceId: null,
        relatedEntityId: candidate.relatedEntityId || null,
        relatedContextKeys: candidate.relatedContextKeys || [],
        resolvedOn: null,
        resolvedBy: null,
        syncManaged: true,
        syncReason: candidate.syncReason,
        syncSourceHash: sourceHash,
        syncSignalCount: candidate.signalCount,
        lastSyncedAt: now,
        modifiedOn: now,
        modifiedBy: 'system:support_board_nightly',
    };
}

async function upsertSupportBoardCards(tId: number, sId: number, candidates: SupportBoardCandidate[]): Promise<{
    created: number;
    updated: number;
    skippedResolved: number;
    skippedUnchanged: number;
}> {
    const limitedCandidates = candidates.slice(0, SUPPORT_BOARD_SYNC_LIMITS.maxCardsCreatedOrUpdatedPerRun);
    if (limitedCandidates.length === 0) {
        return { created: 0, updated: 0, skippedResolved: 0, skippedUnchanged: 0 };
    }

    const now = Timestamp.now();
    const collection = db.collection(DB_COLLECTIONS.ANSWERLATTICE_SUPPORT_BOARD_CARDS);
    const refs = limitedCandidates.map(candidate => collection.doc(supportBoardDocId(tId, sId, candidate.sourceType, candidate.sourceId)));
    const snapshots = await db.getAll(...refs);
    const batch = db.batch();
    let created = 0;
    let updated = 0;
    let skippedResolved = 0;
    let skippedUnchanged = 0;

    limitedCandidates.forEach((candidate, index) => {
        const ref = refs[index];
        const snapshot = snapshots[index];
        const payload = buildCardPayload(tId, sId, candidate, now);

        if (!snapshot.exists) {
            batch.set(ref, {
                ...payload,
                notes: [],
                notesCount: 0,
                lastNoteAt: null,
                statuses: [buildSystemStatusEntry(candidate.status, now, 'Card created by nightly Support Board sync')],
                createdOn: now,
                createdBy: 'system:support_board_nightly',
            });
            created++;
            return;
        }

        const existing = snapshot.data() || {};
        if (existing.status === SUPPORT_BOARD_STATUS.RESOLVED) {
            skippedResolved++;
            return;
        }
        if (existing.syncSourceHash === payload.syncSourceHash) {
            skippedUnchanged++;
            return;
        }

        batch.set(ref, {
            ...payload,
            // Owner workflow status is preserved once the card exists.
            status: existing.status || payload.status,
        }, { merge: true });
        updated++;
    });

    if (created > 0 || updated > 0) {
        await batch.commit();
    }

    return { created, updated, skippedResolved, skippedUnchanged };
}

async function writeSupportBoardSummary(tId: number, sId: number, syncStats: {
    cardsCreated: number;
    cardsUpdated: number;
    cardsSkippedResolved: number;
    cardsSkippedUnchanged: number;
    candidatesAnalyzed: number;
}): Promise<{
    written: boolean;
    openCards: number;
    needsAnswerCards: number;
    highPriorityCards: number;
    totalRecentCards: number;
}> {
    const cardsSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SUPPORT_BOARD_CARDS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .orderBy('modifiedOn', 'desc')
        .limit(SUPPORT_BOARD_SYNC_LIMITS.maxExistingBoardReads)
        .get();

    const statusCounts: Record<string, number> = {};
    const priorityCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    const surfaceCounts: Record<string, number> = {};
    let openCards = 0;
    let needsAnswerCards = 0;
    let highPriorityCards = 0;

    for (const doc of cardsSnap.docs) {
        const data = doc.data();
        const status = String(data.status || 'unknown');
        const priority = String(data.priority || 'unknown');
        const sourceType = String(data.sourceType || 'unknown');
        statusCounts[status] = (statusCounts[status] || 0) + 1;
        priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
        sourceCounts[sourceType] = (sourceCounts[sourceType] || 0) + 1;
        if (status !== SUPPORT_BOARD_STATUS.RESOLVED) openCards++;
        if (status === SUPPORT_BOARD_STATUS.NEEDS_ANSWER) needsAnswerCards++;
        if (priority === SUPPORT_BOARD_PRIORITY.HIGH) highPriorityCards++;
        if (data.relatedSurfaceId) {
            surfaceCounts[data.relatedSurfaceId] = (surfaceCounts[data.relatedSurfaceId] || 0) + 1;
        }
    }

    const topSurfaces = Object.entries(surfaceCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([surfaceId, count]) => ({ surfaceId, count }));

    const summaryCore = {
        schemaVersion: 1,
        pId: PRODUCT_ID,
        tId,
        sId,
        statusCounts,
        priorityCounts,
        sourceCounts,
        topSurfaces,
        openCards,
        needsAnswerCards,
        highPriorityCards,
        totalRecentCards: cardsSnap.size,
        lastSync: {
            ...syncStats,
            windowDays: SUPPORT_BOARD_SYNC_LIMITS.windowDays,
            maxCardsCreatedOrUpdatedPerRun: SUPPORT_BOARD_SYNC_LIMITS.maxCardsCreatedOrUpdatedPerRun,
        },
    };
    const sourceHash = hashPayload(summaryCore);
    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`supportBoardSummary_${tId}_${sId}`);
    const existing = await summaryRef.get();
    if (existing.exists && existing.data()?.sourceHash === sourceHash) {
        return { written: false, openCards, needsAnswerCards, highPriorityCards, totalRecentCards: cardsSnap.size };
    }

    await summaryRef.set({
        ...summaryCore,
        sourceHash,
        lastUpdated: Timestamp.now(),
    }, { merge: true });

    return { written: true, openCards, needsAnswerCards, highPriorityCards, totalRecentCards: cardsSnap.size };
}

export async function syncSupportBoardNightly(tId: number, sId: number): Promise<SupportBoardSyncResult> {
    const result: SupportBoardSyncResult = {
        enabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC,
        candidatesAnalyzed: 0,
        cardsCreated: 0,
        cardsUpdated: 0,
        cardsSkippedResolved: 0,
        cardsSkippedUnchanged: 0,
        summaryWritten: false,
        openCards: 0,
        needsAnswerCards: 0,
        highPriorityCards: 0,
        totalRecentCards: 0,
        errors: [],
    };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC) return result;

    try {
        const sourceDocs = await loadSupportBoardSourceDocs(tId, sId);
        const entities = await loadEntityInfo(tId, sId, sourceDocs.entityIds);
        const driftCandidates = buildDriftCandidates(sourceDocs.driftAnswerDocs);
        const candidates = [
            ...buildFallbackCandidates(sourceDocs.historyDocs, entities),
            ...buildSignalClusterCandidates(sourceDocs.signalDocs, entities),
            ...driftCandidates,
            ...await buildReleaseImpactCandidates(tId, sId, driftCandidates, entities),
        ]
            .sort((a, b) => b.signalCount - a.signalCount);

        result.candidatesAnalyzed = candidates.length;
        const upsert = await upsertSupportBoardCards(tId, sId, candidates);
        result.cardsCreated = upsert.created;
        result.cardsUpdated = upsert.updated;
        result.cardsSkippedResolved = upsert.skippedResolved;
        result.cardsSkippedUnchanged = upsert.skippedUnchanged;

        const summary = await writeSupportBoardSummary(tId, sId, {
            cardsCreated: result.cardsCreated,
            cardsUpdated: result.cardsUpdated,
            cardsSkippedResolved: result.cardsSkippedResolved,
            cardsSkippedUnchanged: result.cardsSkippedUnchanged,
            candidatesAnalyzed: result.candidatesAnalyzed,
        });
        result.summaryWritten = summary.written;
        result.openCards = summary.openCards;
        result.needsAnswerCards = summary.needsAnswerCards;
        result.highPriorityCards = summary.highPriorityCards;
        result.totalRecentCards = summary.totalRecentCards;

        if (result.cardsCreated > 0 || result.cardsUpdated > 0 || result.summaryWritten) {
            logger.info('[Answerlattice SupportBoard] Nightly sync complete', {
                ...getSupportBoardScopeContext(tId, sId),
                cardsCreated: result.cardsCreated,
                cardsUpdated: result.cardsUpdated,
                candidatesAnalyzed: result.candidatesAnalyzed,
                summaryWritten: result.summaryWritten,
            });
        }
    } catch (error) {
        const sourceError = getSupportBoardSourceErrorContext(error);
        result.errors.push({
            phase: 'support_board_sync',
            operation: 'syncSupportBoardNightly',
            error: ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED,
            code: sourceError.sourceErrorCode == null ? undefined : String(sourceError.sourceErrorCode),
            name: sourceError.sourceErrorName ?? undefined,
            sourceStatusCode: sourceError.sourceStatusCode,
            details: getSupportBoardScopeContext(tId, sId),
        });
        logger.error('[Answerlattice SupportBoard] Nightly sync failed', {
            failureCode: ANSWERLATTICE_SUPPORT_BOARD_SYNC_FAILED,
            ...getSupportBoardScopeContext(tId, sId),
            ...sourceError,
        });
    }

    return result;
}
