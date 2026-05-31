/**
 * Answerlattice — Predictive Trigger Sync (Nightly Step 16)
 * 
 * Three sub-steps:
 * 16a. Auto-generate suggested triggers from friction patterns
 * 16b. Rebuild platformSummary cache from collection
 * 16c. Compute effectiveness scores + auto-disable low performers
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT
 * 
 * @see __docs__/answerlattice/predictive-support/
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { createHash } from 'crypto';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { markCompiledContextSourceChanged } from './compiledContextVersions';

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MAX_AUTO_SUGGESTIONS_PER_NIGHT = 5;
const MIN_FRICTION_SCORE_FOR_SUGGESTION = 5;
const AUTO_DISABLE_SCORE_THRESHOLD = -0.3;
const AUTO_DISABLE_MIN_IMPRESSIONS = 100;
const MAX_TRIGGERS_PER_TENANT = 500;
const MAX_TRIGGER_SIGNALS_PER_RUN = 2000;
const MAX_CANONICAL_ANSWERS_FOR_TRIGGER_CACHE = 1000;
const MAX_ENTITY_IDS_PER_ANSWER_LOOKUP = 30;

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
            .filter((entityId): entityId is string => typeof entityId === 'string' && Boolean(entityId.trim()))
            .map(entityId => entityId.trim())
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
            answerEntityIds.forEach(entityId => {
                if (targetSet.has(entityId) && !out.has(entityId)) out.set(entityId, answer);
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
    autoDisabled: number;
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
        const topEntities = snapshot?.topFrictionEntities || [];

        if (topEntities.length === 0) return 0;

        // Load existing triggers to check coverage
        const existingSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .limit(MAX_TRIGGERS_PER_TENANT)
            .get();

        const coveredEntityIds = new Set<string>();
        existingSnap.docs.forEach(d => {
            const data = d.data();
            if (data.action?.entityId) {
                coveredEntityIds.add(data.action.entityId);
            }
        });

        // Generate suggestions for uncovered high-friction entities
        for (const entity of topEntities) {
            if (generated >= MAX_AUTO_SUGGESTIONS_PER_NIGHT) break;
            if (!entity.entityId || !entity.entityName) continue;
            if (entity.last7d?.frictionScore < MIN_FRICTION_SCORE_FOR_SUGGESTION) continue;
            if (coveredEntityIds.has(entity.entityId)) continue;

            const now = Timestamp.now();
            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS).add({
                tId,
                sId,
                name: `Help for ${entity.entityName}`,
                description: `Auto-suggested from friction data (score: ${entity.last7d.frictionScore})`,
                conditions: {
                    // Page left undefined — founder must set the page
                },
                action: {
                    type: 'help_card',
                    entityId: entity.entityId,
                },
                priority: Math.min(Math.round((entity.last7d?.frictionScore || 0) * 10), 100),
                cooldownHours: 24,
                status: 'suggested',
                source: 'friction_auto',
                frictionSource: {
                    entityId: entity.entityId,
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
        logger.error('[Predictive Trigger Sync] Auto-generation failed', { tId, sId, error });
    }

    return generated;
}

// ═══════════════════════════════════════════════════════════════
// 16b — REBUILD PLATFORM SUMMARY CACHE
// ═══════════════════════════════════════════════════════════════

async function rebuildTriggerCache(tId: number, sId: number): Promise<number> {
    try {
        const snap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .limit(MAX_TRIGGERS_PER_TENANT)
            .get();

        const triggers: Record<string, any> = {};
        const rawTriggers: any[] = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        const activeTriggerEntityIds = rawTriggers
            .filter(trigger => trigger.status === 'active' && typeof trigger.action?.entityId === 'string' && trigger.action.entityId)
            .map(trigger => trigger.action.entityId as string);
        const activeEntityTriggerExists = activeTriggerEntityIds.length > 0;
        const answersByEntity = activeEntityTriggerExists
            ? await loadAnswerSummariesByEntity(tId, sId, activeTriggerEntityIds)
            : new Map<string, any>();

        rawTriggers.forEach(trigger => {
            const answer = trigger.action?.entityId ? answersByEntity.get(trigger.action.entityId) : null;
            const resolvedTitle = trigger.action?.customTitle || answer?.title || trigger.name;
            const resolvedSummary = trigger.action?.customSummary || answer?.content?.structuredSummary || '';
            triggers[trigger.id] = {
                ...trigger,
                ...(resolvedTitle ? {
                    resolvedSuggestion: {
                        title: resolvedTitle,
                        summary: resolvedSummary,
                        sourceAnswerId: answer?.id,
                        sourceAnswerVersion: resolveAnswerVersion(answer),
                        articles: answer?.id ? [{ id: answer.id, title: answer.title || resolvedTitle }] : undefined,
                        procedure: trigger.action?.type === 'workflow_guide' ? answer?.content?.procedure : undefined,
                    },
                } : {}),
            };
        });

        const triggerCount = Object.keys(triggers).length;
        const activeTriggerCount = Object.values(triggers).filter(trigger => trigger.status === 'active').length;
        const sourceHash = hashPayload({ triggerCount, activeTriggerCount, triggers });
        const docRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`predictiveTriggers_${tId}_${sId}`);
        const existingSnap = await docRef.get();
        if (existingSnap.exists && existingSnap.data()?.sourceHash === sourceHash) {
            return triggerCount;
        }

        await docRef.set({
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

        return triggerCount;
    } catch (error) {
        logger.error('[Predictive Trigger Sync] Cache rebuild failed', { tId, sId, error });
        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════
// 16c — EFFECTIVENESS SCORING + AUTO-DISABLE
// ═══════════════════════════════════════════════════════════════

async function updateEffectiveness(tId: number, sId: number): Promise<{ updated: number; disabled: number }> {
    let updated = 0;
    let disabled = 0;

    try {
        // Load active triggers
        const triggerSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PREDICTIVE_TRIGGERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'active')
            .limit(MAX_TRIGGERS_PER_TENANT)
            .get();

        if (triggerSnap.empty) return { updated: 0, disabled: 0 };

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

            // Auto-disable if low performing
            if (signals.shown >= AUTO_DISABLE_MIN_IMPRESSIONS && score < AUTO_DISABLE_SCORE_THRESHOLD) {
                batch.update(triggerDoc.ref, {
                    effectiveness,
                    status: 'disabled',
                    modifiedOn: Timestamp.now(),
                });
                disabled++;
            } else {
                batch.update(triggerDoc.ref, {
                    effectiveness,
                    modifiedOn: Timestamp.now(),
                });
            }

            updated++;
            batchCount++;

            // Firestore batch limit
            if (batchCount >= 450) break;
        }

        if (batchCount > 0) {
            await batch.commit();
        }
    } catch (error) {
        logger.error('[Predictive Trigger Sync] Effectiveness update failed', { tId, sId, error });
    }

    return { updated, disabled };
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
            autoDisabled: 0,
        };
    }

    // 16a: Auto-generate suggestions from friction
    const suggestionsGenerated = await autoGenerateSuggestions(tId, sId);

    // 16c: Update effectiveness scores (before cache rebuild so cache is fresh)
    const { updated: effectivenessUpdated, disabled: autoDisabled } = await updateEffectiveness(tId, sId);

    // 16b: Rebuild cache (after auto-gen + effectiveness updates)
    const triggerCount = await rebuildTriggerCache(tId, sId);

    return {
        suggestionsGenerated,
        cacheRebuilt: true,
        triggerCount,
        effectivenessUpdated,
        autoDisabled,
    };
}
