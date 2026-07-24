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
import { appendCompiledContextSourceChange } from './compiledContextVersions';
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';
import { normalizeFrictionInsightSourceSnapshot } from './frictionInsight';

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
const ANSWERLATTICE_PREDICTIVE_TRIGGER_INVALID_INPUT = 'ANSWERLATTICE_PREDICTIVE_TRIGGER_INVALID_INPUT';
const ANSWERLATTICE_PRODUCT_ID = 'AL';
const PREDICTIVE_TRIGGER_CONTEXT_INVALIDATION_VERSION = 1;

function assertPredictiveTriggerScope(tId: number, sId: number): void {
    if (!Number.isSafeInteger(tId) || tId <= 0 || !Number.isSafeInteger(sId) || sId <= 0) {
        throw new Error(ANSWERLATTICE_PREDICTIVE_TRIGGER_INVALID_INPUT);
    }
}

function isOwnedOrLegacyPredictiveDocument(value: any, tId: number, sId: number): boolean {
    return value
        && value.tId === tId
        && value.sId === sId
        && (value.pId === undefined || value.pId === ANSWERLATTICE_PRODUCT_ID);
}

function getSafePredictiveTriggerErrorField(source: Record<string, unknown>, field: string): unknown {
    try {
        return source[field];
    } catch {
        return undefined;
    }
}

function normalizePredictiveTriggerDiagnosticText(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    return normalized ? normalized.slice(0, 80) : null;
}

function getPredictiveTriggerSourceErrorContext(error: unknown): {
    sourceErrorName: string | null;
    sourceErrorCode: string | number | null;
    sourceStatusCode: number | null;
} {
    const source = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const rawStatus = getSafePredictiveTriggerErrorField(source, 'status');
    const rawStatusCode = getSafePredictiveTriggerErrorField(source, 'statusCode');
    const statusCandidate = typeof rawStatus === 'number' ? rawStatus : rawStatusCode;
    const sourceStatusCode = typeof statusCandidate === 'number'
        && Number.isSafeInteger(statusCandidate)
        && statusCandidate >= 100
        && statusCandidate <= 599
        ? statusCandidate
        : null;
    const rawCode = getSafePredictiveTriggerErrorField(source, 'code');

    return {
        sourceErrorName: normalizePredictiveTriggerDiagnosticText(getSafePredictiveTriggerErrorField(source, 'name')),
        sourceErrorCode: typeof rawCode === 'number' && Number.isSafeInteger(rawCode)
            ? rawCode
            : normalizePredictiveTriggerDiagnosticText(rawCode),
        sourceStatusCode,
    };
}

function getPredictiveTriggerScopeContext(tId?: number, sId?: number): {
    hasTenantScope: boolean;
    hasStoreScope: boolean;
} {
    return {
        hasTenantScope: typeof tId === 'number' && Number.isSafeInteger(tId) && tId > 0,
        hasStoreScope: typeof sId === 'number' && Number.isSafeInteger(sId) && sId > 0,
    };
}

function normalizePredictiveTriggerDocumentId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized
        && normalized !== '.'
        && normalized !== '..'
        && !normalized.includes('/')
        && Buffer.byteLength(normalized, 'utf8') <= 1_500
        ? normalized
        : null;
}

function getAutoSuggestionDocumentId(tId: number, sId: number, entityId: string): string {
    return `friction_auto_${createHash('sha256')
        .update(`${ANSWERLATTICE_PRODUCT_ID}:${tId}:${sId}:${entityId}`)
        .digest('hex')
        .slice(0, 40)}`;
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
            .where('pId', '==', ANSWERLATTICE_PRODUCT_ID)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'active')
            .where('scope.entityIds', 'array-contains-any', chunk)
            .limit(MAX_CANONICAL_ANSWERS_FOR_TRIGGER_CACHE - seenAnswerIds.size)
            .get();

        snap.docs.forEach(doc => {
            if (seenAnswerIds.has(doc.id)) return;
            const answer: any = { ...doc.data(), id: doc.id };
            if (answer.pId !== ANSWERLATTICE_PRODUCT_ID || answer.tId !== tId || answer.sId !== sId) {
                throw new Error('ANSWERLATTICE_PREDICTIVE_TRIGGER_ANSWER_SCOPE_INVALID');
            }
            seenAnswerIds.add(doc.id);
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

export async function autoGenerateSuggestions(
    tId: number,
    sId: number,
    now: Date = new Date(),
): Promise<number> {
    let generated = 0;

    try {
        assertPredictiveTriggerScope(tId, sId);
        if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error(ANSWERLATTICE_PREDICTIVE_TRIGGER_INVALID_INPUT);
        const evaluatedAt = Timestamp.fromDate(now);

        // Load friction snapshot
        const frictionDoc = await db
            .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`frictionSnapshot_${tId}_${sId}`)
            .get();

        if (!frictionDoc.exists) return 0;

        const snapshot = normalizeFrictionInsightSourceSnapshot(frictionDoc.data(), tId, sId);
        if (!snapshot) throw new Error('ANSWERLATTICE_PREDICTIVE_TRIGGER_FRICTION_SOURCE_INVALID');
        const topEntities = snapshot.topEntities;

        if (topEntities.length === 0) return 0;

        // Load existing triggers to check coverage
        const existingSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('pId', '==', ANSWERLATTICE_PRODUCT_ID)
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
            if (!entityId || !entity.name) continue;
            if (entity.weightedLoad7d < MIN_FRICTION_SCORE_FOR_SUGGESTION) continue;
            if (coveredEntityIds.has(entityId)) continue;

            const suggestionRef = db
                .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
                .doc(getAutoSuggestionDocumentId(tId, sId, entityId));
            const created = await db.runTransaction(async (transaction) => {
                const current = await transaction.get(suggestionRef);
                if (current.exists) {
                    const existing = current.data();
                    const existingEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(existing?.action?.entityId);
                    if (!isOwnedOrLegacyPredictiveDocument(existing, tId, sId) || existingEntityId !== entityId) {
                        throw new Error('ANSWERLATTICE_PREDICTIVE_TRIGGER_AUTOGENERATE_ID_COLLISION');
                    }
                    return false;
                }

                transaction.create(suggestionRef, {
                    pId: ANSWERLATTICE_PRODUCT_ID,
                    tId,
                    sId,
                    name: `Help for ${entity.name}`.slice(0, 100),
                    description: `Auto-suggested from friction data (score: ${entity.weightedLoad7d})`.slice(0, 300),
                    kind: 'predictive_help',
                    conditions: {},
                    action: {
                        type: 'help_card',
                        entityId,
                    },
                    priority: Math.min(Math.round(entity.weightedLoad7d * 10), 100),
                    cooldownHours: 24,
                    status: 'suggested',
                    source: 'friction_auto',
                    frictionSource: {
                        entityId,
                        entityName: entity.name,
                        frictionScore: entity.weightedLoad7d,
                        signalCount: entity.evidence7d,
                    },
                    createdOn: evaluatedAt,
                    modifiedOn: evaluatedAt,
                });
                return true;
            });

            if (created) {
                generated++;
                coveredEntityIds.add(entityId);
            }
        }
    } catch (error) {
        logger.error('[Predictive Trigger Sync] Auto-generation failed', {
            failureCode: ANSWERLATTICE_PREDICTIVE_TRIGGER_AUTOGENERATE_FAILED,
            ...getPredictiveTriggerScopeContext(tId, sId),
            ...getPredictiveTriggerSourceErrorContext(error),
        });
        throw error;
    }

    return generated;
}

// ═══════════════════════════════════════════════════════════════
// 16b — REBUILD PLATFORM SUMMARY CACHE
// ═══════════════════════════════════════════════════════════════

export async function rebuildTriggerCache(
    tId: number,
    sId: number,
    now: Date = new Date(),
): Promise<{ count: number; rebuilt: boolean }> {
    try {
        assertPredictiveTriggerScope(tId, sId);
        if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error(ANSWERLATTICE_PREDICTIVE_TRIGGER_INVALID_INPUT);
        const evaluatedAt = Timestamp.fromDate(now);
        const snap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('pId', '==', ANSWERLATTICE_PRODUCT_ID)
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
            if (!projected) throw new Error('ANSWERLATTICE_PREDICTIVE_TRIGGER_SOURCE_INVALID');
            triggers[trigger.id] = projected;
        });

        const triggerCount = Object.keys(triggers).length;
        const activeTriggerCount = Object.values(triggers).filter(trigger => {
            if (trigger.status !== 'active') return false;
            if (trigger.kind !== 'known_issue') return true;
            const startsAt = getTimestampMillis(trigger.knownIssue?.startsAt);
            const rawEndsAt = trigger.knownIssue?.endsAt;
            const endsAt = getTimestampMillis(rawEndsAt);
            return (startsAt === null || startsAt <= now.getTime()) && (endsAt === null || endsAt > now.getTime());
        }).length;
        const sourceHash = hashPayload({ triggerCount, activeTriggerCount, triggers });
        const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`predictiveTriggers_${tId}_${sId}`);
        const existingSnap = await docRef.get();
        const existing = existingSnap.data();
        const existingPayloadHash = existing
            ? hashPayload({
                triggerCount: existing.triggerCount,
                activeTriggerCount: existing.activeTriggerCount,
                triggers: existing.triggers,
            })
            : null;
        if (
            existingSnap.exists
            && existing?.pId === ANSWERLATTICE_PRODUCT_ID
            && existing?.tId === tId
            && existing?.sId === sId
            && existing?.sourceHash === sourceHash
            && existingPayloadHash === sourceHash
            && existing?.contextInvalidationVersion === PREDICTIVE_TRIGGER_CONTEXT_INVALIDATION_VERSION
        ) {
            return { count: triggerCount, rebuilt: false };
        }

        const rebuilt = await db.runTransaction(async transaction => {
            const currentSnapshot = await transaction.get(docRef);
            const current = currentSnapshot.data();
            const currentPayloadHash = current
                ? hashPayload({
                    triggerCount: current.triggerCount,
                    activeTriggerCount: current.activeTriggerCount,
                    triggers: current.triggers,
                })
                : null;
            if (
                currentSnapshot.exists
                && current?.pId === ANSWERLATTICE_PRODUCT_ID
                && current?.tId === tId
                && current?.sId === sId
                && current?.sourceHash === sourceHash
                && currentPayloadHash === sourceHash
                && current?.contextInvalidationVersion === PREDICTIVE_TRIGGER_CONTEXT_INVALIDATION_VERSION
            ) {
                return false;
            }
            await appendCompiledContextSourceChange(transaction, db, 'predictiveTriggers', tId, sId, {
                reason: 'predictive_trigger_summary_rebuilt',
                sourceType: 'platformSummary/predictiveTriggers',
            });
            transaction.set(docRef, {
                pId: ANSWERLATTICE_PRODUCT_ID,
                tId,
                sId,
                lastUpdated: evaluatedAt,
                version: now.getTime(),
                triggerCount,
                activeTriggerCount,
                sourceHash,
                contextInvalidationVersion: PREDICTIVE_TRIGGER_CONTEXT_INVALIDATION_VERSION,
                triggers,
            });
            return true;
        });

        return { count: triggerCount, rebuilt };
    } catch (error) {
        logger.error('[Predictive Trigger Sync] Cache rebuild failed', {
            failureCode: ANSWERLATTICE_PREDICTIVE_TRIGGER_CACHE_REBUILD_FAILED,
            ...getPredictiveTriggerScopeContext(tId, sId),
            ...getPredictiveTriggerSourceErrorContext(error),
        });
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// 16c — ADVISORY EFFECTIVENESS SCORING
// ═══════════════════════════════════════════════════════════════

export async function updateEffectiveness(
    tId: number,
    sId: number,
    now: Date = new Date(),
): Promise<number> {
    let updated = 0;

    try {
        assertPredictiveTriggerScope(tId, sId);
        if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error(ANSWERLATTICE_PREDICTIVE_TRIGGER_INVALID_INPUT);
        const evaluatedAt = Timestamp.fromDate(now);
        // Load active triggers
        const triggerSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('pId', '==', ANSWERLATTICE_PRODUCT_ID)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'active')
            .limit(MAX_TRIGGERS_PER_TENANT + 1)
            .get();

        if (triggerSnap.empty) return 0;
        if (triggerSnap.size > MAX_TRIGGERS_PER_TENANT) {
            throw new Error('ANSWERLATTICE_PREDICTIVE_TRIGGER_LIMIT_EXCEEDED');
        }

        // Load suggestion signals from last 30 days
        const cutoff = Timestamp.fromMillis(now.getTime() - (30 * 24 * 60 * 60 * 1000));

        const signalSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
            .where('pId', '==', ANSWERLATTICE_PRODUCT_ID)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('type', 'in', ['suggestion_shown', 'suggestion_clicked', 'suggestion_dismissed'])
            .where('timestamp', '>=', cutoff)
            .orderBy('timestamp', 'desc')
            .limit(MAX_TRIGGER_SIGNALS_PER_RUN + 1)
            .get();
        if (signalSnap.size > MAX_TRIGGER_SIGNALS_PER_RUN) {
            throw new Error('ANSWERLATTICE_PREDICTIVE_TRIGGER_SIGNAL_WINDOW_INCOMPLETE');
        }

        // Aggregate signals by triggerId
        const triggerSignals = new Map<string, { shown: number; clicked: number; dismissed: number }>();

        signalSnap.docs.forEach(d => {
            const data = d.data();
            const signalTimestamp = getTimestampMillis(data.timestamp);
            if (
                data.pId !== ANSWERLATTICE_PRODUCT_ID
                || data.tId !== tId
                || data.sId !== sId
                || !['suggestion_shown', 'suggestion_clicked', 'suggestion_dismissed'].includes(data.type)
                || signalTimestamp === null
                || signalTimestamp < cutoff.toMillis()
                || signalTimestamp > now.getTime()
            ) {
                throw new Error('ANSWERLATTICE_PREDICTIVE_TRIGGER_SIGNAL_SOURCE_INVALID');
            }
            const triggerId = normalizePredictiveTriggerDocumentId(data.metadata?.triggerId);
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
            const signals = triggerSignals.get(triggerId) || { shown: 0, clicked: 0, dismissed: 0 };
            const clicks = Math.min(signals.clicked, signals.shown);
            const dismissals = Math.min(signals.dismissed, signals.shown);
            const score = signals.shown > 0 ? (clicks - dismissals) / signals.shown : 0;
            const effectiveness = {
                impressions: signals.shown,
                clicks,
                dismissals,
                score: Math.round(score * 1000) / 1000,
                lastEvaluated: evaluatedAt,
            };

            // Public interaction evidence is advisory. It must never change
            // trigger status without a founder review decision.
            batch.update(triggerDoc.ref, {
                pId: ANSWERLATTICE_PRODUCT_ID,
                effectiveness,
                modifiedOn: evaluatedAt,
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
        throw error;
    }

    return updated;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ENTRY POINT (called from answerlatticeNightly.ts)
// ═══════════════════════════════════════════════════════════════

export async function runPredictiveTriggerSync(
    tId: number,
    sId: number,
    now: Date = new Date(),
): Promise<PredictiveTriggerSyncResult> {
    assertPredictiveTriggerScope(tId, sId);
    if (!(now instanceof Date) || !Number.isFinite(now.getTime())) {
        throw new Error(ANSWERLATTICE_PREDICTIVE_TRIGGER_INVALID_INPUT);
    }
    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) {
        return {
            suggestionsGenerated: 0,
            cacheRebuilt: false,
            triggerCount: 0,
            effectivenessUpdated: 0,
        };
    }
    // 16a: Auto-generate suggestions from friction
    const suggestionsGenerated = await autoGenerateSuggestions(tId, sId, now);

    // 16c: Update effectiveness scores (before cache rebuild so cache is fresh)
    const effectivenessUpdated = await updateEffectiveness(tId, sId, now);

    // 16b: Rebuild cache (after auto-gen + effectiveness updates)
    const cacheResult = await rebuildTriggerCache(tId, sId, now);

    return {
        suggestionsGenerated,
        cacheRebuilt: cacheResult.rebuilt,
        triggerCount: cacheResult.count,
        effectivenessUpdated,
    };
}
