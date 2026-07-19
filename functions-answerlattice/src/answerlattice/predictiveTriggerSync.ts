/**
 * Answerlattice — Predictive Trigger Sync (Nightly Step 16)
 * 
 * Three sub-steps:
 * 16a. Auto-generate suggested triggers from friction patterns
 * 16b. Rebuild platformSummary cache from collection
 * 16c. Compute advisory effectiveness scores
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/answerlattice/predictive-support/
 */

import { DocumentReference, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { createHash } from 'crypto';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { markCompiledContextSourceChanged } from './compiledContextVersions';
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_AUTO_SUGGESTIONS_PER_NIGHT = 5;
const MIN_FRICTION_SCORE_FOR_SUGGESTION = 5;
const MAX_TRIGGERS_PER_TENANT = 200;
const MAX_TRIGGER_SIGNALS_PER_RUN = 2000;
const MAX_CANONICAL_ANSWERS_FOR_TRIGGER_CACHE = 1000;
const MAX_ENTITY_IDS_PER_ANSWER_LOOKUP = 30;
const ANSWERLATTICE_PREDICTIVE_TRIGGER_AUTOGENERATE_FAILED = 'ANSWERLATTICE_PREDICTIVE_TRIGGER_AUTOGENERATE_FAILED';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_CACHE_REBUILD_FAILED = 'ANSWERLATTICE_PREDICTIVE_TRIGGER_CACHE_REBUILD_FAILED';
const ANSWERLATTICE_PREDICTIVE_TRIGGER_EFFECTIVENESS_FAILED = 'ANSWERLATTICE_PREDICTIVE_TRIGGER_EFFECTIVENESS_FAILED';
const ANSWERLATTICE_PRODUCT_ID = 'AL';

function isOwnedOrLegacyPredictiveDocument(value: any, tId: number, sId: number): boolean {
    return value
        && value.tId === tId
        && value.sId === sId
        && (value.pId === undefined || value.pId === ANSWERLATTICE_PRODUCT_ID);
}

function getPredictiveTriggerSourceErrorContext(error: unknown): {
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

function getPredictiveTriggerScopeContext(tId?: number, sId?: number): {
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

function resolveAnswerVersion(answer: any): string | number | undefined {
    return answer?.productBinding?.lastValidatedInVersion
        || answer?.productBinding?.introducedInVersion
        || answer?.modifiedOn?.toMillis?.()
        || answer?.createdOn?.toMillis?.();
}

function toBoundedString(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().slice(0, maxLength);
    return normalized || undefined;
}

function getTimestampMillis(value: unknown): number | null {
    if (!value) return null;
    try {
        if (value instanceof Date) {
            const millis = value.getTime();
            return Number.isFinite(millis) ? millis : null;
        }
        if (typeof (value as any)?.toMillis === 'function') {
            const millis = Number((value as any).toMillis());
            return Number.isFinite(millis) ? millis : null;
        }
        if (typeof value === 'string' || typeof value === 'number') {
            const millis = new Date(value).getTime();
            return Number.isFinite(millis) ? millis : null;
        }
    } catch {
        return null;
    }
    return null;
}

function normalizePublicHttpsUrl(value: unknown): string | undefined {
    const raw = toBoundedString(value, 500);
    if (!raw) return undefined;
    try {
        const parsed = new URL(raw);
        const host = parsed.hostname.toLowerCase();
        if (
            parsed.protocol !== 'https:'
            || parsed.username
            || parsed.password
            || host === 'localhost'
            || host.endsWith('.localhost')
            || host.endsWith('.local')
            || /^(?:0|10|127|169\.254|172\.(?:1[6-9]|2\d|3[01])|192\.168)\./.test(host)
        ) return undefined;
        return parsed.toString();
    } catch {
        return undefined;
    }
}

function projectPredictiveTriggerForRuntime(params: {
    trigger: any;
    id: string;
    tId: number;
    sId: number;
    resolvedSuggestion?: any;
}): any | null {
    const { trigger, id, tId, sId } = params;
    const name = toBoundedString(trigger.name, 100);
    const conditions = trigger.conditions && typeof trigger.conditions === 'object' && !Array.isArray(trigger.conditions)
        ? trigger.conditions
        : null;
    const action = trigger.action && typeof trigger.action === 'object' && !Array.isArray(trigger.action)
        ? trigger.action
        : null;
    if (!name || !conditions || !action) return null;
    if (!['active', 'suggested', 'disabled', 'archived'].includes(trigger.status)) return null;
    if (!['manual', 'friction_auto', 'system'].includes(trigger.source)) return null;
    if (!['help_card', 'workflow_guide', 'link_article', 'known_issue'].includes(action.type)) return null;
    if (!Number.isSafeInteger(trigger.priority) || trigger.priority < 0 || trigger.priority > 100) return null;
    if (!Number.isSafeInteger(trigger.cooldownHours) || trigger.cooldownHours < 1 || trigger.cooldownHours > 720) return null;

    const kind = trigger.kind === 'known_issue' ? 'known_issue' : 'predictive_help';
    if ((kind === 'known_issue') !== (action.type === 'known_issue')) return null;
    const projectedKnownIssue = kind === 'known_issue' && trigger.knownIssue && typeof trigger.knownIssue === 'object'
        ? {
            severity: ['info', 'degraded', 'outage'].includes(trigger.knownIssue.severity)
                ? trigger.knownIssue.severity
                : 'info',
            ...(getTimestampMillis(trigger.knownIssue.startsAt) !== null ? { startsAt: trigger.knownIssue.startsAt } : {}),
            ...(trigger.knownIssue.endsAt === null
                ? { endsAt: null }
                : getTimestampMillis(trigger.knownIssue.endsAt) !== null ? { endsAt: trigger.knownIssue.endsAt } : {}),
            ...(normalizePublicHttpsUrl(trigger.knownIssue.statusPageUrl)
                ? { statusPageUrl: normalizePublicHttpsUrl(trigger.knownIssue.statusPageUrl) }
                : {}),
        }
        : undefined;
    if (kind === 'known_issue' && !projectedKnownIssue) return null;

    const projectedSuggestion = params.resolvedSuggestion && typeof params.resolvedSuggestion === 'object'
        ? {
            title: toBoundedString(params.resolvedSuggestion.title, 160),
            summary: typeof params.resolvedSuggestion.summary === 'string'
                ? params.resolvedSuggestion.summary.trim().slice(0, 600)
                : '',
            ...(toBoundedString(params.resolvedSuggestion.sourceAnswerId, 180)
                ? { sourceAnswerId: toBoundedString(params.resolvedSuggestion.sourceAnswerId, 180) }
                : {}),
            ...(typeof params.resolvedSuggestion.sourceAnswerVersion === 'string' || typeof params.resolvedSuggestion.sourceAnswerVersion === 'number'
                ? { sourceAnswerVersion: params.resolvedSuggestion.sourceAnswerVersion }
                : {}),
            ...(Array.isArray(params.resolvedSuggestion.articles)
                ? { articles: params.resolvedSuggestion.articles.slice(0, 3) }
                : {}),
            ...(action.type === 'workflow_guide' && params.resolvedSuggestion.procedure
                ? { procedure: params.resolvedSuggestion.procedure }
                : {}),
        }
        : undefined;

    return {
        id,
        pId: ANSWERLATTICE_PRODUCT_ID,
        tId,
        sId,
        name,
        ...(toBoundedString(trigger.description, 300) ? { description: toBoundedString(trigger.description, 300) } : {}),
        kind,
        conditions: {
            ...(toBoundedString(conditions.page, 100) ? { page: toBoundedString(conditions.page, 100) } : {}),
            ...(toBoundedString(conditions.feature, 100) ? { feature: toBoundedString(conditions.feature, 100) } : {}),
            ...(toBoundedString(conditions.workflow, 100) ? { workflow: toBoundedString(conditions.workflow, 100) } : {}),
            ...(toBoundedString(conditions.plan, 100) ? { plan: toBoundedString(conditions.plan, 100) } : {}),
            ...(toBoundedString(conditions.userRole, 100) ? { userRole: toBoundedString(conditions.userRole, 100) } : {}),
        },
        action: {
            type: action.type,
            ...(toBoundedString(action.entityId, 180) ? { entityId: toBoundedString(action.entityId, 180) } : {}),
            ...(toBoundedString(action.articleId, 180) ? { articleId: toBoundedString(action.articleId, 180) } : {}),
            ...(toBoundedString(action.customTitle, 160) ? { customTitle: toBoundedString(action.customTitle, 160) } : {}),
            ...(toBoundedString(action.customSummary, 200) ? { customSummary: toBoundedString(action.customSummary, 200) } : {}),
        },
        ...(projectedSuggestion?.title ? { resolvedSuggestion: projectedSuggestion } : {}),
        priority: trigger.priority,
        cooldownHours: trigger.cooldownHours,
        status: trigger.status,
        source: trigger.source,
        ...(projectedKnownIssue ? { knownIssue: projectedKnownIssue } : {}),
    };
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += chunkSize) {
        chunks.push(items.slice(i, i + chunkSize));
    }
    return chunks;
}

async function loadAnswerSummariesByEntity(
    tId: number,
    sId: number,
    entityIds: string[],
): Promise<Map<string, any>> {
    const out = new Map<string, any>();
    const targetEntityIds = Array.from(new Set(
        entityIds
            .map(entityId => normalizeAnswerlatticeResolvedFunctionEntityId(entityId))
            .filter((entityId): entityId is string => Boolean(entityId))
    )).slice(0, MAX_TRIGGERS_PER_TENANT);

    if (targetEntityIds.length === 0) return out;

    const targetSet = new Set(targetEntityIds);
    const seenAnswerIds = new Set<string>();

    for (const chunk of chunkArray(targetEntityIds, MAX_ENTITY_IDS_PER_ANSWER_LOOKUP)) {
        if (seenAnswerIds.size >= MAX_CANONICAL_ANSWERS_FOR_TRIGGER_CACHE) break;

        const snap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'active')
            .where('scope.entityIds', 'array-contains-any', chunk)
            .limit(MAX_CANONICAL_ANSWERS_FOR_TRIGGER_CACHE - seenAnswerIds.size)
            .get();

        snap.docs.forEach(doc => {
            if (seenAnswerIds.has(doc.id)) return;
            seenAnswerIds.add(doc.id);

            const answer: any = { ...doc.data(), id: doc.id };
            const answerEntityIds: string[] = Array.isArray(answer.scope?.entityIds) ? answer.scope.entityIds : [];
            answerEntityIds.forEach(rawEntityId => {
                const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(rawEntityId);
                if (entityId && targetSet.has(entityId) && !out.has(entityId)) out.set(entityId, answer);
            });
        });
    }

    return out;
}

// ═══════════════════════════════════════════════════════════════
// RESULT TYPE
// ═══════════════════════════════════════════════════════════════

export interface PredictiveTriggerSyncResult {
    suggestionsGenerated: number;
    cacheRebuilt: boolean;
    triggerCount: number;
    effectivenessUpdated: number;
}

// ═══════════════════════════════════════════════════════════════
// 16a — AUTO-GENERATE SUGGESTED TRIGGERS FROM FRICTION
// ═══════════════════════════════════════════════════════════════

async function autoGenerateSuggestions(tId: number, sId: number): Promise<number> {
    let generated = 0;

    try {
        // Load friction snapshot
        const frictionDoc = await db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`frictionSnapshot_${tId}_${sId}`)
            .get();

        if (!frictionDoc.exists) return 0;

        const snapshot = frictionDoc.data();
        if (!snapshot || snapshot.pId !== ANSWERLATTICE_PRODUCT_ID || snapshot.tId !== tId || snapshot.sId !== sId) return 0;
        const topEntities = snapshot?.topFrictionEntities || [];

        if (topEntities.length === 0) return 0;

        // Load existing triggers to check coverage
        const existingSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .limit(MAX_TRIGGERS_PER_TENANT + 1)
            .get();
        if (existingSnap.size >= MAX_TRIGGERS_PER_TENANT) return 0;

        const coveredEntityIds = new Set<string>();
        existingSnap.docs.forEach(d => {
            const data = d.data();
            if (!isOwnedOrLegacyPredictiveDocument(data, tId, sId)) return;
            const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.action?.entityId);
            if (entityId) {
                coveredEntityIds.add(entityId);
            }
        });

        // Generate suggestions for uncovered high-friction entities
        for (const entity of topEntities) {
            if (
                generated >= MAX_AUTO_SUGGESTIONS_PER_NIGHT
                || existingSnap.size + generated >= MAX_TRIGGERS_PER_TENANT
            ) break;
            const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(entity.entityId);
            if (!entityId || !entity.entityName) continue;
            if (entity.last7d?.frictionScore < MIN_FRICTION_SCORE_FOR_SUGGESTION) continue;
            if (coveredEntityIds.has(entityId)) continue;

            const now = Timestamp.now();
            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS).add({
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId,
                sId,
                name: `Help for ${entity.entityName}`,
                description: `Auto-suggested from friction data (score: ${entity.last7d.frictionScore})`,
                kind: 'predictive_help',
                conditions: {
                    // Page left undefined — founder must set the page
                },
                action: {
                    type: 'help_card',
                    entityId,
                },
                priority: Math.min(Math.round((entity.last7d?.frictionScore || 0) * 10), 100),
                cooldownHours: 24,
                status: 'suggested',
                source: 'friction_auto',
                frictionSource: {
                    entityId,
                    entityName: entity.entityName,
                    frictionScore: entity.last7d?.frictionScore || 0,
                    signalCount: entity.last7d?.queryCount || 0,
                },
                createdOn: now,
                modifiedOn: now,
            });

            generated++;
        }
    } catch (error) {
        logger.error('[Predictive Trigger Sync] Auto-generation failed', {
            failureCode: ANSWERLATTICE_PREDICTIVE_TRIGGER_AUTOGENERATE_FAILED,
            ...getPredictiveTriggerScopeContext(tId, sId),
            ...getPredictiveTriggerSourceErrorContext(error),
        });
    }

    return generated;
}

// ═══════════════════════════════════════════════════════════════
// 16b — REBUILD PLATFORM SUMMARY CACHE
// ═══════════════════════════════════════════════════════════════

async function rebuildTriggerCache(tId: number, sId: number): Promise<{ count: number; rebuilt: boolean }> {
    try {
        const snap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .limit(MAX_TRIGGERS_PER_TENANT + 1)
            .get();
        if (snap.size > MAX_TRIGGERS_PER_TENANT) {
            throw new Error('ANSWERLATTICE_PREDICTIVE_TRIGGER_LIMIT_EXCEEDED');
        }

        const triggers: Record<string, any> = {};
        const legacyRefs: DocumentReference[] = [];
        const rawTriggers: any[] = snap.docs.flatMap(d => {
            const data = d.data();
            if (!isOwnedOrLegacyPredictiveDocument(data, tId, sId)) return [];
            if (data.pId === undefined) legacyRefs.push(d.ref);
            return [{ ...data, pId: ANSWERLATTICE_PRODUCT_ID, id: d.id }];
        });
        if (legacyRefs.length > 0) {
            const backfill = db.batch();
            legacyRefs.slice(0, 450).forEach(ref => backfill.set(ref, { pId: ANSWERLATTICE_PRODUCT_ID }, { merge: true }));
            await backfill.commit();
        }
        const activeTriggerEntityIds = rawTriggers
            .filter(trigger => trigger.status === 'active' && typeof trigger.action?.entityId === 'string' && trigger.action.entityId)
            .map(trigger => normalizeAnswerlatticeResolvedFunctionEntityId(trigger.action.entityId))
            .filter((entityId): entityId is string => Boolean(entityId));
        const activeEntityTriggerExists = activeTriggerEntityIds.length > 0;
        const answersByEntity = activeEntityTriggerExists
            ? await loadAnswerSummariesByEntity(tId, sId, activeTriggerEntityIds)
            : new Map<string, any>();

        rawTriggers.forEach(trigger => {
            const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(trigger.action?.entityId);
            const answer = entityId ? answersByEntity.get(entityId) : null;
            const resolvedTitle = trigger.action?.customTitle || answer?.title || trigger.name;
            const resolvedSummary = trigger.action?.customSummary || answer?.content?.structuredSummary || '';
            const projected = projectPredictiveTriggerForRuntime({
                trigger,
                id: trigger.id,
                tId,
                sId,
                resolvedSuggestion: resolvedTitle ? {
                    title: resolvedTitle,
                    summary: resolvedSummary,
                    sourceAnswerId: answer?.id,
                    sourceAnswerVersion: resolveAnswerVersion(answer),
                    articles: answer?.id ? [{ id: answer.id, title: answer.title || resolvedTitle }] : undefined,
                    procedure: trigger.action?.type === 'workflow_guide' ? answer?.content?.procedure : undefined,
                } : undefined,
            });
            if (projected) triggers[trigger.id] = projected;
        });

        const triggerCount = Object.keys(triggers).length;
        const now = Date.now();
        const activeTriggerCount = Object.values(triggers).filter(trigger => {
            if (trigger.status !== 'active') return false;
            if (trigger.kind !== 'known_issue') return true;
            const startsAt = getTimestampMillis(trigger.knownIssue?.startsAt);
            const rawEndsAt = trigger.knownIssue?.endsAt;
            const endsAt = getTimestampMillis(rawEndsAt);
            return (startsAt === null || startsAt <= now) && (endsAt === null || endsAt > now);
        }).length;
        const sourceHash = hashPayload({ triggerCount, activeTriggerCount, triggers });
        const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`predictiveTriggers_${tId}_${sId}`);
        const existingSnap = await docRef.get();
        if (existingSnap.exists && existingSnap.data()?.sourceHash === sourceHash) {
            return { count: triggerCount, rebuilt: false };
        }

        await docRef.set({
            pId: ANSWERLATTICE_PRODUCT_ID,
            tId,
            sId,
            lastUpdated: Timestamp.now(),
            version: Date.now(),
            triggerCount,
            activeTriggerCount,
            sourceHash,
            triggers,
        });
        await markCompiledContextSourceChanged(db, 'predictiveTriggers', tId, sId, {
            reason: 'predictive_trigger_summary_rebuilt',
            sourceType: 'platformSummary/predictiveTriggers',
        });

        return { count: triggerCount, rebuilt: true };
    } catch (error) {
        logger.error('[Predictive Trigger Sync] Cache rebuild failed', {
            failureCode: ANSWERLATTICE_PREDICTIVE_TRIGGER_CACHE_REBUILD_FAILED,
            ...getPredictiveTriggerScopeContext(tId, sId),
            ...getPredictiveTriggerSourceErrorContext(error),
        });
        return { count: 0, rebuilt: false };
    }
}

// ═══════════════════════════════════════════════════════════════
// 16c — ADVISORY EFFECTIVENESS SCORING
// ═══════════════════════════════════════════════════════════════

async function updateEffectiveness(tId: number, sId: number): Promise<number> {
    let updated = 0;

    try {
        // Load active triggers
        const triggerSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'active')
            .limit(MAX_TRIGGERS_PER_TENANT)
            .get();

        if (triggerSnap.empty) return 0;

        // Load suggestion signals from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoff = Timestamp.fromDate(thirtyDaysAgo);

        const signalSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('type', 'in', ['suggestion_shown', 'suggestion_clicked', 'suggestion_dismissed'])
            .where('timestamp', '>=', cutoff)
            .limit(MAX_TRIGGER_SIGNALS_PER_RUN)
            .get();

        // Aggregate signals by triggerId
        const triggerSignals = new Map<string, { shown: number; clicked: number; dismissed: number }>();

        signalSnap.docs.forEach(d => {
            const data = d.data();
            const triggerId = data.metadata?.triggerId;
            if (!triggerId) return;

            if (!triggerSignals.has(triggerId)) {
                triggerSignals.set(triggerId, { shown: 0, clicked: 0, dismissed: 0 });
            }
            const counts = triggerSignals.get(triggerId)!;
            if (data.type === 'suggestion_shown') counts.shown++;
            else if (data.type === 'suggestion_clicked') counts.clicked++;
            else if (data.type === 'suggestion_dismissed') counts.dismissed++;
        });

        // Update effectiveness scores
        const batch = db.batch();
        let batchCount = 0;

        for (const triggerDoc of triggerSnap.docs) {
            const trigger = triggerDoc.data();
            if (!isOwnedOrLegacyPredictiveDocument(trigger, tId, sId)) continue;
            if (trigger.kind === 'known_issue' || trigger.action?.type === 'known_issue') continue;
            const triggerId = triggerDoc.id;
            const signals = triggerSignals.get(triggerId);

            if (!signals || signals.shown === 0) continue;

            const score = (signals.clicked - signals.dismissed) / signals.shown;
            const effectiveness = {
                impressions: signals.shown,
                clicks: signals.clicked,
                dismissals: signals.dismissed,
                score: Math.round(score * 1000) / 1000,
                lastEvaluated: Timestamp.now(),
            };

            // Public interaction evidence is advisory. It must never change
            // trigger status without a founder review decision.
            batch.update(triggerDoc.ref, {
                pId: ANSWERLATTICE_PRODUCT_ID,
                effectiveness,
                modifiedOn: Timestamp.now(),
            });

            updated++;
            batchCount++;

            // Firestore batch limit
            if (batchCount >= 450) break;
        }

        if (batchCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        logger.error('[Predictive Trigger Sync] Effectiveness update failed', {
            failureCode: ANSWERLATTICE_PREDICTIVE_TRIGGER_EFFECTIVENESS_FAILED,
            ...getPredictiveTriggerScopeContext(tId, sId),
            ...getPredictiveTriggerSourceErrorContext(error),
        });
    }

    return updated;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT (called from answerlatticeNightly.ts)
// ═══════════════════════════════════════════════════════════════

export async function runPredictiveTriggerSync(
    tId: number,
    sId: number
): Promise<PredictiveTriggerSyncResult> {
    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) {
        return {
            suggestionsGenerated: 0,
            cacheRebuilt: false,
            triggerCount: 0,
            effectivenessUpdated: 0,
        };
    }

    // 16a: Auto-generate suggestions from friction
    const suggestionsGenerated = await autoGenerateSuggestions(tId, sId);

    // 16c: Update effectiveness scores (before cache rebuild so cache is fresh)
    const effectivenessUpdated = await updateEffectiveness(tId, sId);

    // 16b: Rebuild cache (after auto-gen + effectiveness updates)
    const cacheResult = await rebuildTriggerCache(tId, sId);

    return {
        suggestionsGenerated,
        cacheRebuilt: cacheResult.rebuilt,
        triggerCount: cacheResult.count,
        effectivenessUpdated,
    };
}
