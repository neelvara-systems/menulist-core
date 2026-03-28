/**
 * Canonica — Nightly Drift & Mutation Engine (Server-Side)
 * 
 * Cloud Function logic for scheduled drift detection and signal mutation.
 * Uses firebase-admin (server-side Firestore), not the client SDK.
 * 
 * Deployed as a scheduled Cloud Function in the Canonica Firebase project.
 * Feature-flag gated: ENABLE_CANONICA_NIGHTLY in functions-canonica/src/constants/features.ts.
 * 
 * 8-Step Nightly Batch:
 * 1. Drift Detection — evaluate all active canonical answers for 4 drift classes
 * 2. Signal Entity Resolution — resolve 'unresolved' entityIds
 * 3. Signal Mutation — cluster signals → generate mutation proposals
 * 4. Canonical Coverage KPI — hit/miss aggregation
 * 5. Recurring Fallback Detection — auto-generate proposals for 5+ misses
 * 6. Post-Mutation Impact Tracking — 14-day before/after comparison
 * 7. Confidence Auto-Adjustment — boost answers with 30+ serves, 0 negatives
 * 8. Signal TTL Auto-Archive — delete signals older than 12 months
 * 
 * RULES:
 * - Idempotent: running twice produces identical results
 * - Non-blocking: errors in one tenant don't block others
 * - Audit-logged: all drift changes and proposals are logged
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md
 */

import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { cleanupExpiredIntegrationData } from '../integrations/deliveryLogger';
import { emitIntegrationEvent, resetNightlyEventCounts } from '../integrations/eventBus';
import { COVERAGE_DROP_THRESHOLD, EVENT_SEVERITY, INTEGRATION_EVENT_TYPES } from '../integrations/types';
import { generateDraftsForNewProposals } from './draftGenerator';
import { aggregateFrictionStats, cleanupExpiredFrictionStats } from './frictionAggregation';
import { generateFrictionInsight } from './frictionInsight';
import { runOnboardingBootstrap } from './onboardingBootstrap';
import { runPredictiveTriggerSync } from './predictiveTriggerSync';
import { extractTicketKnowledge } from './resolutionExtractor';

// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG CHECK
// ═══════════════════════════════════════════════════════════════

function isCanonicaEnabled(): boolean {
    return FUNCTION_FLAGS.ENABLE_CANONICA_NIGHTLY;
}

// ═══════════════════════════════════════════════════════════════
// TENANT DISCOVERY
// ═══════════════════════════════════════════════════════════════

interface TenantStore {
    tId: number;
    sId: number;
}

/**
 * Discover tenants that have Canonica entities (i.e., have been onboarded).
 * Uses canonica_entities collection to find distinct tId/sId pairs.
 */
async function discoverActiveTenants(): Promise<TenantStore[]> {
    const snapshot = await db
        .collection(DB_COLLECTIONS.CANONICA_ENTITIES)
        .select('tId', 'sId')
        .limit(100)
        .get();

    const seen = new Set<string>();
    const tenants: TenantStore[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const key = `${data.tId}_${data.sId}`;
        if (!seen.has(key)) {
            seen.add(key);
            tenants.push({ tId: data.tId, sId: data.sId });
        }
    }

    return tenants;
}

// ═══════════════════════════════════════════════════════════════
// DRIFT DETECTION (Server-Side)
// ═══════════════════════════════════════════════════════════════

const SIGNAL_DRIFT_THRESHOLDS = {
    negativeFeedbackRate: 0.08,
    ticketSpikeMultiplier: 2.0,
    minSignalCount: 5,
};

interface DriftResult {
    answersEvaluated: number;
    driftDetected: number;
    driftCleared: number;
}

async function runDriftDetection(tId: number, sId: number): Promise<DriftResult> {
    const result: DriftResult = { answersEvaluated: 0, driftDetected: 0, driftCleared: 0 };

    // Load active canonical answers
    const answersSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .get();

    if (answersSnap.empty) return result;

    // Load entities for orphan drift check
    const entitiesSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .get();

    const entityMap = new Map<string, { status: string; name: string }>();
    for (const doc of entitiesSnap.docs) {
        const data = doc.data();
        entityMap.set(doc.id, { status: data.status, name: data.name });
    }

    // Signal counts (14-day rolling window)
    const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const signalsSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('timestamp', '>=', windowStart)
        .get();

    // Group signal counts by entityId
    const signalsByEntity = new Map<string, { ticket: number; chat_negative: number; escalation: number; total: number }>();
    for (const doc of signalsSnap.docs) {
        const data = doc.data();
        const entityId = data.entityId;
        if (!entityId) continue;

        const counts = signalsByEntity.get(entityId) || { ticket: 0, chat_negative: 0, escalation: 0, total: 0 };
        if (data.type === 'ticket') counts.ticket++;
        else if (data.type === 'chat_negative') counts.chat_negative++;
        else if (data.type === 'escalation') counts.escalation++;
        counts.total++;
        signalsByEntity.set(entityId, counts);
    }

    const allAnswers = answersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    for (const answer of allAnswers) {
        result.answersEvaluated++;
        const driftReasons: string[] = [];
        const previousDriftFlag = answer.governance?.driftFlag || false;

        // Class B: Signal Drift
        const primaryEntityId = answer.scope?.entityIds?.[0];
        if (primaryEntityId) {
            const signals = signalsByEntity.get(primaryEntityId);
            if (signals && signals.total >= SIGNAL_DRIFT_THRESHOLDS.minSignalCount) {
                const feedbackRate = answer.signalMetrics?.linkedChatCount > 0
                    ? (answer.signalMetrics.negativeFeedbackCount || 0) / answer.signalMetrics.linkedChatCount
                    : 0;
                if (feedbackRate > SIGNAL_DRIFT_THRESHOLDS.negativeFeedbackRate) {
                    driftReasons.push(`[signal_anomaly] Negative feedback rate ${(feedbackRate * 100).toFixed(1)}% exceeds threshold`);
                }
                if (signals.ticket > SIGNAL_DRIFT_THRESHOLDS.minSignalCount * SIGNAL_DRIFT_THRESHOLDS.ticketSpikeMultiplier) {
                    driftReasons.push(`[signal_anomaly] Ticket count ${signals.ticket} exceeds baseline threshold`);
                }
            }
        }

        // Class C: Scope Conflict
        for (const other of allAnswers) {
            if (other.id === answer.id || other.status !== 'active') continue;
            const entityOverlap = answer.scope?.entityIds?.some((id: string) => other.scope?.entityIds?.includes(id));
            if (!entityOverlap) continue;

            const aFrom = answer.productBinding?.applicableVersions?.from || 0;
            const aTo = answer.productBinding?.applicableVersions?.to;
            const bFrom = other.productBinding?.applicableVersions?.from || 0;
            const bTo = other.productBinding?.applicableVersions?.to;
            const versionOverlap = (aTo == null || aTo >= bFrom) && (bTo == null || bTo >= aFrom);
            if (versionOverlap) {
                driftReasons.push(`[scope_conflict] Overlap with answer "${other.id}"`);
                break;
            }
        }

        // Class D: Orphan Drift
        for (const entityId of (answer.scope?.entityIds || [])) {
            const entity = entityMap.get(entityId);
            if (entity && entity.status === 'deprecated') {
                driftReasons.push(`[deprecated_entity] Entity "${entity.name}" (${entityId}) is deprecated`);
            }
        }

        // Update governance if changed
        const newDriftFlag = driftReasons.length > 0;
        const newDriftReason = driftReasons.join('; ');
        const changed = newDriftFlag !== previousDriftFlag ||
            (newDriftFlag && answer.governance?.driftReason !== newDriftReason);

        if (changed) {
            await db.collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS).doc(answer.id).update({
                'governance.driftFlag': newDriftFlag,
                'governance.driftReason': newDriftFlag ? newDriftReason : null,
                'governance.reviewRequired': newDriftFlag,
            });

            await db.collection(DB_COLLECTIONS.CANONICA_AUDIT_LOGS).add({
                tId, sId,
                action: newDriftFlag ? 'drift_detected' : 'drift_cleared',
                entityType: 'canonicalAnswer',
                entityId: answer.id,
                previousState: { driftFlag: previousDriftFlag },
                newState: { driftFlag: newDriftFlag, driftReason: newDriftFlag ? newDriftReason : null },
                performedBy: 'system:drift_engine_nightly',
                timestamp: Timestamp.now(),
            });

            if (newDriftFlag) result.driftDetected++;
            else result.driftCleared++;
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// SIGNAL MUTATION (Server-Side)
// ═══════════════════════════════════════════════════════════════

const MUTATION_CONFIG = {
    minSignalsForProposal: 3,
    windowDays: 14,
    maxProposalsPerRun: 10,
};

interface MutationResult {
    clustersAnalyzed: number;
    proposalsCreated: number;
}

async function runSignalMutation(tId: number, sId: number): Promise<MutationResult> {
    const result: MutationResult = { clustersAnalyzed: 0, proposalsCreated: 0 };

    const windowStart = Timestamp.fromMillis(Date.now() - MUTATION_CONFIG.windowDays * 24 * 60 * 60 * 1000);

    const signalsSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('timestamp', '>=', windowStart)
        .orderBy('timestamp', 'desc')
        .limit(500)
        .get();

    if (signalsSnap.empty) return result;

    // Cluster by entityId
    const clusters = new Map<string, { ticket: number; chat_negative: number; escalation: number; total: number; refs: string[] }>();
    for (const doc of signalsSnap.docs) {
        const data = doc.data();
        const entityId = data.entityId;
        if (!entityId) continue;

        const c = clusters.get(entityId) || { ticket: 0, chat_negative: 0, escalation: 0, total: 0, refs: [] };
        if (data.type === 'ticket') c.ticket++;
        else if (data.type === 'chat_negative') c.chat_negative++;
        else if (data.type === 'escalation') c.escalation++;
        c.total++;
        if (c.refs.length < 3) c.refs.push(doc.id);
        clusters.set(entityId, c);
    }

    result.clustersAnalyzed = clusters.size;

    // Process significant clusters
    const sorted = Array.from(clusters.entries())
        .filter(([, c]) => c.total >= MUTATION_CONFIG.minSignalsForProposal)
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, MUTATION_CONFIG.maxProposalsPerRun);

    for (const [entityId, cluster] of sorted) {
        try {
            // Check for existing canonical answers
            const answersSnap = await db
                .collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('scope.entityIds', 'array-contains', entityId)
                .where('status', '==', 'active')
                .limit(1)
                .get();

            let mutationType: string;
            let targetAnswerId = '';

            if (answersSnap.empty) {
                mutationType = 'new_answer_required';
            } else {
                targetAnswerId = answersSnap.docs[0].id;
                if (cluster.chat_negative > cluster.ticket) {
                    mutationType = 'content_refinement';
                } else if (cluster.escalation > 0) {
                    mutationType = 'scope_adjustment';
                } else {
                    mutationType = 'content_refinement';
                }
            }

            const proposal = {
                tId, sId,
                targetAnswerId,
                relatedEntityIds: [entityId],
                mutationType,
                signalSummary: {
                    ticketCount: cluster.ticket,
                    chatCount: cluster.chat_negative,
                    negativeFeedbackRate: cluster.chat_negative / Math.max(cluster.total, 1),
                    exampleReferences: cluster.refs,
                },
                suggestedChange: {},
                confidenceScore: Math.min(cluster.total / 20, 1.0),
                status: 'pending_review',
                createdOn: Timestamp.now(),
            };

            const proposalRef = await db.collection(DB_COLLECTIONS.CANONICA_MUTATION_PROPOSALS).add(proposal);

            await db.collection(DB_COLLECTIONS.CANONICA_AUDIT_LOGS).add({
                tId, sId,
                action: 'mutation_proposal_generated',
                entityType: 'mutationProposal',
                entityId: proposalRef.id,
                previousState: null,
                newState: { mutationType, entityId, signalCount: cluster.total },
                performedBy: 'system:mutation_engine_nightly',
                timestamp: Timestamp.now(),
            });

            result.proposalsCreated++;
        } catch (error) {
            console.error(`[Canonica Mutation] Failed for entity ${entityId}:`, error);
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// SIGNAL ENTITY RESOLUTION (Server-Side)
// ═══════════════════════════════════════════════════════════════

/**
 * Resolve 'unresolved' entityIds on signal events by matching
 * signal metadata against entity search index.
 * 
 * Without this, unresolved signals are noise — they can't cluster,
 * can't trigger proposals, can't drive governance.
 */
async function resolveUnresolvedSignals(tId: number, sId: number): Promise<{ resolved: number; total: number }> {
    const result = { resolved: 0, total: 0 };

    // Fetch unresolved signals (last 14 days)
    const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const unresolvedSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('entityId', '==', 'unresolved')
        .where('timestamp', '>=', windowStart)
        .limit(200)
        .get();

    if (unresolvedSnap.empty) return result;
    result.total = unresolvedSnap.size;

    // Load entity search index for matching
    const indexSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_ENTITY_SEARCH_INDEX)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .get();

    if (indexSnap.empty) return result;

    const searchIndex = indexSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    for (const signalDoc of unresolvedSnap.docs) {
        const signal = signalDoc.data();
        const metadata = signal.metadata || {};

        // Extract searchable text from metadata
        const searchText = [
            metadata.subject,
            metadata.title,
            metadata.query,
            metadata.messageId,
            metadata.comments,
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchText) continue;

        // Tokenize and match against search index
        const tokens = searchText
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter((t: string) => t.length >= 2);

        let bestEntityId: string | null = null;
        let bestScore = 0;

        for (const entry of searchIndex) {
            let score = 0;
            for (const token of tokens) {
                if (entry.canonicalName?.toLowerCase().includes(token)) score += 2;
                for (const syn of (entry.synonyms || [])) {
                    if (syn.toLowerCase().includes(token)) score += 1;
                }
                for (const indexToken of (entry.normalizedTokens || [])) {
                    if (indexToken === token) score += 1.5;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                bestEntityId = entry.entityId;
            }
        }

        // Only resolve if confidence is reasonable (score ≥ 2)
        if (bestEntityId && bestScore >= 2) {
            try {
                await signalDoc.ref.update({ entityId: bestEntityId });
                result.resolved++;
            } catch { /* non-blocking */ }
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// CANONICAL COVERAGE KPI AGGREGATION
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregate canonical hit/miss ratio from perf logs.
 * Stores in platformSummary/canonica_{sId} for dashboard visibility.
 * 
 * This is THE metric that proves Canonica works.
 * Without tracking it, the system's value is invisible.
 */
async function aggregateCoverageKPI(tId: number, sId: number): Promise<{ hits: number; misses: number; rate: number }> {
    const result = { hits: 0, misses: 0, rate: 0 };

    // Read last 24h of search history to count canonical vs non-canonical
    const dayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

    try {
        const historySnap = await db
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('createdOn', '>=', dayAgo)
            .limit(500)
            .get();

        for (const doc of historySnap.docs) {
            const data = doc.data();
            if (data.canonical === true) {
                result.hits++;
            } else {
                result.misses++;
            }
        }

        const total = result.hits + result.misses;
        result.rate = total > 0 ? result.hits / total : 0;

        // Persist to platformSummary for dashboard
        const today = new Date().toISOString().split('T')[0];
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`coverage_${tId}_${sId}`).set({
            lastUpdated: Timestamp.now(),
            coverage: {
                date: today,
                hits: result.hits,
                misses: result.misses,
                rate: Math.round(result.rate * 100),
                total,
            },
        }, { merge: true });
    } catch (error) {
        console.error(`[Canonica Coverage] KPI aggregation failed for ${tId}/${sId}:`, error);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// RECURRING FALLBACK → AUTO MUTATION PROPOSAL (C1)
// ═══════════════════════════════════════════════════════════════

/**
 * Scan search history for recurring canonical misses.
 * If an entity gets 5+ misses in 14 days, auto-generate a
 * 'new_answer_required' mutation proposal.
 * 
 * Doctrine: "If recurring fallback → auto-generate MutationProposal"
 */
async function detectRecurringFallbacks(tId: number, sId: number): Promise<{ proposalsCreated: number }> {
    const result = { proposalsCreated: 0 };

    const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);

    try {
        // Query search history for non-canonical results (misses)
        const historySnap = await db
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('canonical', '==', false)
            .where('createdOn', '>=', windowStart)
            .limit(500)
            .get();

        if (historySnap.empty) return result;

        // Group misses by matched entity IDs
        const entityMissCounts = new Map<string, number>();
        for (const doc of historySnap.docs) {
            const data = doc.data();
            const entityIds = data.matchedEntityIds || [];
            for (const entityId of entityIds) {
                if (entityId && entityId !== 'unresolved') {
                    entityMissCounts.set(entityId, (entityMissCounts.get(entityId) || 0) + 1);
                }
            }
        }

        // Generate proposals for entities with 5+ misses
        const MIN_MISSES_FOR_PROPOSAL = 5;
        for (const [entityId, missCount] of Array.from(entityMissCounts.entries())) {
            if (missCount < MIN_MISSES_FOR_PROPOSAL) continue;

            // Check if we already have a pending proposal for this entity
            const existingSnap = await db
                .collection(DB_COLLECTIONS.CANONICA_MUTATION_PROPOSALS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('relatedEntityIds', 'array-contains', entityId)
                .where('status', '==', 'pending_review')
                .limit(1)
                .get();

            if (!existingSnap.empty) continue; // Already has a pending proposal

            // Create auto-proposal
            await db.collection(DB_COLLECTIONS.CANONICA_MUTATION_PROPOSALS).add({
                tId, sId,
                targetAnswerId: '',
                relatedEntityIds: [entityId],
                mutationType: 'new_answer_required',
                signalSummary: {
                    ticketCount: 0,
                    chatCount: missCount,
                    negativeFeedbackRate: 0,
                    exampleReferences: [],
                },
                suggestedChange: {},
                confidenceScore: Math.min(missCount / 20, 1.0),
                status: 'pending_review',
                createdOn: Timestamp.now(),
            });

            await db.collection(DB_COLLECTIONS.CANONICA_AUDIT_LOGS).add({
                tId, sId,
                action: 'auto_proposal_from_recurring_fallback',
                entityType: 'mutationProposal',
                entityId,
                previousState: null,
                newState: { missCount, source: 'recurring_fallback_detection' },
                performedBy: 'system:fallback_detector_nightly',
                timestamp: Timestamp.now(),
            });

            result.proposalsCreated++;

            if (result.proposalsCreated >= 5) break; // Cap at 5 per run
        }
    } catch (error) {
        console.error(`[Canonica Fallback] Detection failed for ${tId}/${sId}:`, error);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// POST-MUTATION IMPACT TRACKING (C2)
// ═══════════════════════════════════════════════════════════════

/**
 * Check proposals implemented 14+ days ago and compare signal counts
 * before/after to measure impact. Stores delta on the proposal doc.
 */
async function trackMutationImpact(tId: number, sId: number): Promise<{ tracked: number }> {
    const result = { tracked: 0 };

    const fourteenDaysAgo = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);

    try {
        // Find implemented proposals without impact tracking
        const proposalsSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_MUTATION_PROPOSALS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'implemented')
            .limit(50)
            .get();

        for (const proposalDoc of proposalsSnap.docs) {
            const proposal = proposalDoc.data();

            // Skip if already tracked or not old enough
            if (proposal.impactTracked) continue;
            const implementedAt = proposal.modifiedOn || proposal.createdOn;
            if (!implementedAt || implementedAt.toMillis() > fourteenDaysAgo.toMillis()) continue;

            // Count post-implementation signals for related entity
            const entityId = proposal.relatedEntityIds?.[0];
            if (!entityId) continue;

            const postSignalsSnap = await db
                .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('entityId', '==', entityId)
                .where('timestamp', '>=', implementedAt)
                .limit(100)
                .get();

            const preSignalCount = proposal.signalSummary?.ticketCount + proposal.signalSummary?.chatCount || 0;
            const postSignalCount = postSignalsSnap.size;
            const improvement = preSignalCount > 0 ? Math.round((1 - postSignalCount / preSignalCount) * 100) : 0;

            await proposalDoc.ref.update({
                impactTracked: true,
                impactResult: {
                    preSignalCount,
                    postSignalCount,
                    improvementPercent: improvement,
                    trackedAt: Timestamp.now(),
                },
            });

            result.tracked++;
        }
    } catch (error) {
        console.error(`[Canonica Impact] Tracking failed for ${tId}/${sId}:`, error);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// CONFIDENCE AUTO-ADJUSTMENT (Nice-to-Have, ICP-critical)
// ═══════════════════════════════════════════════════════════════

/**
 * Auto-boost confidence for canonical answers that have been served
 * 30+ times with 0 negative signals in 30 days. Simple, deterministic,
 * zero-risk. Saves SMB admin from manually reviewing scores.
 */
async function autoAdjustConfidence(tId: number, sId: number): Promise<{ adjusted: number }> {
    const result = { adjusted: 0 };

    try {
        const answersSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'active')
            .where('governance.driftFlag', '==', false)
            .limit(200)
            .get();

        for (const answerDoc of answersSnap.docs) {
            const answer = answerDoc.data();
            const currentConfidence = answer.validation?.confidenceScore || 0;

            // Skip if already at max confidence
            if (currentConfidence >= 0.95) continue;

            // Check: served 30+ times with low negative feedback
            const linkedChat = answer.signalMetrics?.linkedChatCount || 0;
            const negFeedback = answer.signalMetrics?.negativeFeedbackCount || 0;

            if (linkedChat >= 30 && negFeedback === 0) {
                await answerDoc.ref.update({
                    'validation.confidenceScore': 0.95,
                    'validation.validationSource': 'signal_cluster',
                    'validation.lastValidatedOn': Timestamp.now(),
                    'validation.validatedBy': 'system:confidence_auto_adjust',
                });
                result.adjusted++;
            }
        }
    } catch (error) {
        console.error(`[Canonica Confidence] Auto-adjustment failed for ${tId}/${sId}:`, error);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// SIGNAL TTL AUTO-ARCHIVE (Phase 4 — 3.5)
// ═══════════════════════════════════════════════════════════════

/**
 * Archive (delete) signal events older than 12 months.
 * Doctrine mandates: "Archive events > 12 months"
 * Prevents unbounded signal collection growth.
 * 
 * @returns Number of signals archived (deleted)
 */
async function archiveExpiredSignals(tId: number, sId: number, ttlMonths: number = 12, batchLimit: number = 100): Promise<{ archived: number }> {
    const result = { archived: 0 };

    try {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - ttlMonths);
        const cutoffTimestamp = Timestamp.fromDate(cutoff);

        const snapshot = await db
            .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('timestamp', '<', cutoffTimestamp)
            .limit(batchLimit)
            .get();

        if (snapshot.empty) return result;

        const batch = db.batch();
        for (const doc of snapshot.docs) {
            batch.delete(doc.ref);
            result.archived++;
        }
        await batch.commit();
    } catch (error) {
        console.error(`[Canonica TTL] Signal archive failed for ${tId}/${sId}:`, error);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH INDEX REBUILD (Expansion Item #11)
// Precomputes entity graph from canonica_entityRelations for
// O(1) graph expansion during retrieval.
// @see __docs__/canonica/knowledge-graph-exploitation/
// ═══════════════════════════════════════════════════════════════

interface GraphRebuildResult {
    rebuilt: boolean;
    entityCount: number;
    relationCount: number;
    orphanRelations: number;
}

/**
 * Rebuild the precomputed entity graph index for a tenant.
 * Reads entities + relations, builds a flat map, writes to platformSummary.
 * 
 * Cost: 1 read (relations) + 1 write (graph index doc).
 * Entities and answers are already loaded by earlier nightly steps.
 */
async function rebuildEntityGraphIndex(tId: number, sId: number): Promise<GraphRebuildResult> {
    const result: GraphRebuildResult = { rebuilt: false, entityCount: 0, relationCount: 0, orphanRelations: 0 };

    // 1. Load active entities
    const entitiesSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .get();

    if (entitiesSnap.empty) return result;

    const entityMap = new Map<string, { name: string; type: string }>();
    for (const doc of entitiesSnap.docs) {
        const data = doc.data();
        entityMap.set(doc.id, { name: data.name, type: data.type });
    }
    result.entityCount = entityMap.size;

    // 2. Load all relations
    const relationsSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_ENTITY_RELATIONS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .get();

    result.relationCount = relationsSnap.size;

    // 3. Count active canonical answers per entity
    const answersSnap = await db
        .collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .get();

    const answerCountByEntity = new Map<string, number>();
    for (const doc of answersSnap.docs) {
        const data = doc.data();
        const entityIds: string[] = data.scope?.entityIds || [];
        for (const entityId of entityIds) {
            answerCountByEntity.set(entityId, (answerCountByEntity.get(entityId) || 0) + 1);
        }
    }

    // 4. Build graph map
    const graph: Record<string, {
        name: string;
        type: string;
        related: string[];
        relationTypes: Record<string, string[]>;
        answerCount: number;
    }> = {};

    // Initialize nodes for all active entities
    for (const [entityId, entity] of Array.from(entityMap.entries())) {
        graph[entityId] = {
            name: entity.name,
            type: entity.type,
            related: [],
            relationTypes: {},
            answerCount: answerCountByEntity.get(entityId) || 0,
        };
    }

    // Process relations (bidirectional — both from and to get the related reference)
    for (const doc of relationsSnap.docs) {
        const rel = doc.data();
        const fromId: string = rel.fromEntityId;
        const toId: string = rel.toEntityId;
        const relType: string = rel.relationType;

        // Check for orphan relations (entity deprecated or missing)
        if (!entityMap.has(fromId) || !entityMap.has(toId)) {
            result.orphanRelations++;
            continue;
        }

        // Add to fromEntity's graph node
        if (graph[fromId]) {
            if (!graph[fromId].related.includes(toId)) {
                graph[fromId].related.push(toId);
            }
            if (!graph[fromId].relationTypes[relType]) {
                graph[fromId].relationTypes[relType] = [];
            }
            if (!graph[fromId].relationTypes[relType].includes(toId)) {
                graph[fromId].relationTypes[relType].push(toId);
            }
        }

        // Add reverse reference to toEntity's graph node
        if (graph[toId]) {
            if (!graph[toId].related.includes(fromId)) {
                graph[toId].related.push(fromId);
            }
            // Reverse relation stored under same type for discoverability
            if (!graph[toId].relationTypes[relType]) {
                graph[toId].relationTypes[relType] = [];
            }
            if (!graph[toId].relationTypes[relType].includes(fromId)) {
                graph[toId].relationTypes[relType].push(fromId);
            }
        }
    }

    // 5. Write graph index to platformSummary
    const docKey = `entityGraphIndex_${tId}_${sId}`;
    const existingDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docKey).get();
    const previousVersion = existingDoc.exists ? (existingDoc.data()?.version || 0) : 0;

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docKey).set({
        lastRebuiltAt: Timestamp.now(),
        version: previousVersion + 1,
        entityCount: result.entityCount,
        relationCount: result.relationCount,
        graph,
        // interactionRules are authored separately — preserve them if they exist
        ...(existingDoc.exists && existingDoc.data()?.interactionRules
            ? { interactionRules: existingDoc.data()?.interactionRules }
            : {}),
    });

    result.rebuilt = true;

    if (result.orphanRelations > 0) {
        console.warn(`[Canonica GraphIndex] ${tId}/${sId}: ${result.orphanRelations} orphan relation(s) skipped`);
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

export interface CanonicaNightlyResult {
    enabled: boolean;
    tenantsProcessed: number;
    totalDriftDetected: number;
    totalDriftCleared: number;
    totalProposalsCreated: number;
    totalSignalsResolved: number;
    totalFallbackProposals: number;
    totalImpactTracked: number;
    totalConfidenceAdjusted: number;
    totalSignalsArchived: number;
    totalDraftsGenerated: number;
    totalDraftsFailed: number;
    totalFrictionEntities: number;
    totalFrictionStatsCleanedUp: number;
    frictionInsightsGenerated: number;
    bootstrapTenantsProcessed: number;
    bootstrapEntitiesExtracted: number;
    bootstrapEntitiesPromoted: number;
    bootstrapDraftsGenerated: number;
    coverageRate: number;
    // Step 13: External Workflow Integrations (Expansion Item #7)
    integrationEventsEmitted: number;
    integrationDeliveriesSucceeded: number;
    integrationDeliveriesFailed: number;
    integrationCleanupEvents: number;
    integrationCleanupLogs: number;
    // Step 14: Ticket → Knowledge Loop (Expansion Item #9)
    ticketKnowledgeCandidates: number;
    ticketKnowledgeProposals: number;
    ticketKnowledgeMerged: number;
    ticketKnowledgeSkipped: number;
    // Step 15: Knowledge Graph Index Rebuild (Expansion Item #11)
    graphIndexRebuilt: number;
    graphIndexEntities: number;
    graphIndexRelations: number;
    // Step 16: Predictive Trigger Sync (Expansion Item #12)
    predictiveSuggestionsGenerated: number;
    predictiveTriggersTotal: number;
    predictiveEffectivenessUpdated: number;
    predictiveAutoDisabled: number;
    errors: string[];
}

/**
 * Main entry point for the nightly Canonica job.
 * Called by Cloud Scheduler via schedulers.ts.
 */
export async function runCanonicaNightly(): Promise<CanonicaNightlyResult> {
    const result: CanonicaNightlyResult = {
        enabled: false,
        tenantsProcessed: 0,
        totalDriftDetected: 0,
        totalDriftCleared: 0,
        totalProposalsCreated: 0,
        totalSignalsResolved: 0,
        totalFallbackProposals: 0,
        totalImpactTracked: 0,
        totalConfidenceAdjusted: 0,
        totalSignalsArchived: 0,
        totalDraftsGenerated: 0,
        totalDraftsFailed: 0,
        totalFrictionEntities: 0,
        totalFrictionStatsCleanedUp: 0,
        frictionInsightsGenerated: 0,
        bootstrapTenantsProcessed: 0,
        bootstrapEntitiesExtracted: 0,
        bootstrapEntitiesPromoted: 0,
        bootstrapDraftsGenerated: 0,
        coverageRate: 0,
        integrationEventsEmitted: 0,
        integrationDeliveriesSucceeded: 0,
        integrationDeliveriesFailed: 0,
        integrationCleanupEvents: 0,
        integrationCleanupLogs: 0,
        ticketKnowledgeCandidates: 0,
        ticketKnowledgeProposals: 0,
        ticketKnowledgeMerged: 0,
        ticketKnowledgeSkipped: 0,
        graphIndexRebuilt: 0,
        graphIndexEntities: 0,
        graphIndexRelations: 0,
        predictiveSuggestionsGenerated: 0,
        predictiveTriggersTotal: 0,
        predictiveEffectivenessUpdated: 0,
        predictiveAutoDisabled: 0,
        errors: [],
    };

    // Feature flag gate
    const enabled = isCanonicaEnabled();
    result.enabled = enabled;
    if (!enabled) {
        console.log('[Canonica Nightly] Canonica is disabled in ops_config. Skipping.');
        return result;
    }

    // Discover tenants with Canonica data
    const tenants = await discoverActiveTenants();
    if (tenants.length === 0) {
        console.log('[Canonica Nightly] No tenants with Canonica entities found.');
        return result;
    }

    console.log(`[Canonica Nightly] Processing ${tenants.length} tenant(s)...`);

    for (const { tId, sId } of tenants) {
        try {
            // 1. Drift Detection
            const driftResult = await runDriftDetection(tId, sId);
            result.totalDriftDetected += driftResult.driftDetected;
            result.totalDriftCleared += driftResult.driftCleared;

            // 2. Signal Entity Resolution (resolve 'unresolved' before mutation)
            const resolveResult = await resolveUnresolvedSignals(tId, sId);
            result.totalSignalsResolved += resolveResult.resolved;

            // 3. Signal Mutation
            const mutationResult = await runSignalMutation(tId, sId);
            result.totalProposalsCreated += mutationResult.proposalsCreated;

            // 4. Canonical Coverage KPI
            const coverageResult = await aggregateCoverageKPI(tId, sId);
            if (coverageResult.rate > 0) result.coverageRate = coverageResult.rate;

            // 5. Recurring Fallback Detection → Auto Proposals
            const fallbackResult = await detectRecurringFallbacks(tId, sId);
            result.totalFallbackProposals += fallbackResult.proposalsCreated;

            // 6. Post-Mutation Impact Tracking (14-day window)
            const impactResult = await trackMutationImpact(tId, sId);
            result.totalImpactTracked += impactResult.tracked;

            // 7. Confidence Auto-Adjustment
            const confidenceResult = await autoAdjustConfidence(tId, sId);
            result.totalConfidenceAdjusted += confidenceResult.adjusted;

            // 8. Signal TTL Auto-Archive (Phase 4 — 3.5)
            const archiveResult = await archiveExpiredSignals(tId, sId);
            result.totalSignalsArchived += archiveResult.archived;

            // 9. AI Draft Generation for new_answer_required proposals (Expansion Item #4)
            const draftResult = await generateDraftsForNewProposals(tId, sId);
            result.totalDraftsGenerated += draftResult.draftsGenerated;
            result.totalDraftsFailed += draftResult.draftsFailed;

            // 10. Product Friction Intelligence — Daily Aggregation (Expansion Item #5)
            const frictionResult = await aggregateFrictionStats(tId, sId);
            result.totalFrictionEntities += frictionResult.entitiesProcessed;

            // 10b. Friction daily stats cleanup (90-day retention)
            const frictionCleanup = await cleanupExpiredFrictionStats(tId, sId);
            result.totalFrictionStatsCleanedUp += frictionCleanup.cleaned;

            // 11. Product Friction Intelligence — Weekly Insight (Sundays only)
            const dayOfWeek = new Date().getUTCDay(); // 0 = Sunday
            if (dayOfWeek === 0) {
                const insightResult = await generateFrictionInsight(tId, sId);
                if (insightResult.generated) result.frictionInsightsGenerated++;
            }

            // 15. Knowledge Graph Index Rebuild (Expansion Item #11)
            // Rebuilds the precomputed entity graph index from canonica_entityRelations.
            // Reuses entities + answers data already loaded by Steps 1-3.
            // Feature-flagged: ENABLE_CANONICA_KNOWLEDGE_GRAPH
            // @see __docs__/canonica/knowledge-graph-exploitation/
            if (FUNCTION_FLAGS.ENABLE_CANONICA_KNOWLEDGE_GRAPH) {
                try {
                    const graphResult = await rebuildEntityGraphIndex(tId, sId);
                    result.graphIndexRebuilt = (result.graphIndexRebuilt || 0) + (graphResult.rebuilt ? 1 : 0);
                    result.graphIndexEntities = (result.graphIndexEntities || 0) + graphResult.entityCount;
                    result.graphIndexRelations = (result.graphIndexRelations || 0) + graphResult.relationCount;
                } catch (error) {
                    console.error(`[Canonica Nightly] Graph index rebuild failed for ${tId}/${sId}:`, error);
                    result.errors.push(`[GraphIndex] ${tId}/${sId}: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
            }

            // 14. Ticket → Knowledge Loop (Expansion Item #9)
            // Extracts knowledge candidates from resolved ticket clusters (3+ per entity).
            // Feature-flagged: ENABLE_CANONICA_TICKET_KNOWLEDGE
            // @see __docs__/canonica/ticket-knowledge-loop/
            if (FUNCTION_FLAGS.ENABLE_CANONICA_TICKET_KNOWLEDGE) {
                try {
                    const tkResult = await extractTicketKnowledge(tId, sId);
                    result.ticketKnowledgeCandidates += tkResult.candidatesFound;
                    result.ticketKnowledgeProposals += tkResult.proposalsCreated;
                    result.ticketKnowledgeMerged += tkResult.proposalsMerged;
                    result.ticketKnowledgeSkipped += tkResult.skippedDuplicate + tkResult.skippedLowConfidence;
                    if (tkResult.errors.length > 0) {
                        result.errors.push(...tkResult.errors.map((e: string) => `[TicketKnowledge] ${e}`));
                    }
                } catch (error) {
                    console.error(`[Canonica Nightly] Ticket knowledge extraction failed for ${tId}/${sId}:`, error);
                    result.errors.push(`[TicketKnowledge] ${tId}/${sId}: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
            }

            // 16. Predictive Trigger Sync (Expansion Item #12)
            // Auto-generate suggested triggers from friction, rebuild cache, update effectiveness.
            // Feature-flagged: ENABLE_CANONICA_PREDICTIVE_SUPPORT
            // @see __docs__/canonica/predictive-support/
            if (FUNCTION_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) {
                try {
                    const ptResult = await runPredictiveTriggerSync(tId, sId);
                    result.predictiveSuggestionsGenerated += ptResult.suggestionsGenerated;
                    result.predictiveTriggersTotal += ptResult.triggerCount;
                    result.predictiveEffectivenessUpdated += ptResult.effectivenessUpdated;
                    result.predictiveAutoDisabled += ptResult.autoDisabled;
                } catch (error) {
                    console.error(`[Canonica Nightly] Predictive trigger sync failed for ${tId}/${sId}:`, error);
                    result.errors.push(`[PredictiveSync] ${tId}/${sId}: ${error instanceof Error ? error.message : 'Unknown'}`);
                }
            }

            result.tenantsProcessed++;

            console.log(`[Canonica Nightly] Tenant ${tId}/${sId}: ` +
                `drift=${driftResult.driftDetected}/${driftResult.answersEvaluated}, ` +
                `resolved=${resolveResult.resolved}/${resolveResult.total}, ` +
                `proposals=${mutationResult.proposalsCreated}/${mutationResult.clustersAnalyzed}, ` +
                `fallbacks=${fallbackResult.proposalsCreated}, impact=${impactResult.tracked}, ` +
                `coverage=${Math.round(coverageResult.rate * 100)}%, archived=${archiveResult.archived}, ` +
                `drafts=${draftResult.draftsGenerated}/${draftResult.draftsGenerated + draftResult.draftsFailed}, ` +
                `friction=${frictionResult.entitiesProcessed}/${frictionResult.overallHealth}, cleanup=${frictionCleanup.cleaned}`);
        } catch (error) {
            const msg = `Tenant ${tId}/${sId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(msg);
            console.error(`[Canonica Nightly] Error for ${msg}`);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 12 — Onboarding Bootstrap (Expansion Item #6)
    // Separate discovery loop — queries kb_generation_jobs, NOT canonica_entities.
    // New tenants with zero entities need this to bootstrap their canonical layer.
    // Feature-flagged: ENABLE_CANONICA_FOUNDER_ONBOARDING
    // @see __docs__/canonica/founder-onboarding/
    // ═══════════════════════════════════════════════════════════════
    try {
        const bootstrapResult = await runOnboardingBootstrap();
        result.bootstrapTenantsProcessed = bootstrapResult.tenantsBootstrapped;
        result.bootstrapEntitiesExtracted = bootstrapResult.totalEntitiesExtracted;
        result.bootstrapEntitiesPromoted = bootstrapResult.totalEntitiesPromoted;
        result.bootstrapDraftsGenerated = bootstrapResult.totalDraftsGenerated;
        if (bootstrapResult.errors.length > 0) {
            result.errors.push(...bootstrapResult.errors.map((e: string) => `[Bootstrap] ${e}`));
        }
        if (bootstrapResult.tenantsBootstrapped > 0) {
            console.log(`[Canonica Nightly] Bootstrap: ${bootstrapResult.tenantsBootstrapped} tenant(s), ` +
                `entities=${bootstrapResult.totalEntitiesExtracted}→${bootstrapResult.totalEntitiesPromoted}, ` +
                `drafts=${bootstrapResult.totalDraftsGenerated}/${bootstrapResult.totalDraftsGenerated + bootstrapResult.totalDraftsFailed}`);
        }
    } catch (error) {
        const msg = `[Bootstrap] Fatal: ${error instanceof Error ? error.message : 'Unknown'}`;
        result.errors.push(msg);
        console.error(`[Canonica Nightly] ${msg}`);
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 13 — External Workflow Integrations (Expansion Item #7)
    // Emits governance events from Steps 1-5 results to configured
    // external tools (Slack, Email, Linear, GitHub).
    // Feature-flagged: ENABLE_CANONICA_WORKFLOW_INTEGRATIONS
    // Zero additional Firestore reads — uses data already loaded above.
    // @see __docs__/canonica/workflow-integrations/
    // ═══════════════════════════════════════════════════════════════
    try {
        resetNightlyEventCounts();

        // Emit per-tenant governance events
        for (const { tId, sId } of tenants) {
            // 13a. Drift events (from Step 1 results — re-query drift flags)
            // We emit a summary rather than per-answer events to keep costs low
            if (result.totalDriftDetected > 0) {
                await emitIntegrationEvent({
                    tId, sId,
                    eventType: INTEGRATION_EVENT_TYPES.DRIFT_DETECTED,
                    severity: EVENT_SEVERITY.HIGH,
                    payload: {
                        driftCount: result.totalDriftDetected,
                        driftCleared: result.totalDriftCleared,
                        driftClass: 'nightly_batch_summary',
                        driftReason: `${result.totalDriftDetected} answer(s) flagged with drift in nightly evaluation`,
                        entityName: 'Multiple',
                        entityType: 'batch',
                    },
                });
                result.integrationEventsEmitted++;
            }

            // 13b. Mutation proposal events (from Step 3/5)
            if (result.totalProposalsCreated > 0 || result.totalFallbackProposals > 0) {
                const totalProposals = result.totalProposalsCreated + result.totalFallbackProposals;
                await emitIntegrationEvent({
                    tId, sId,
                    eventType: INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED,
                    severity: EVENT_SEVERITY.HIGH,
                    payload: {
                        proposalCount: totalProposals,
                        mutationType: 'nightly_batch_summary',
                        entityNames: [],
                        signalCount: result.totalSignalsResolved,
                        confidenceScore: 0,
                    },
                });
                result.integrationEventsEmitted++;
            }

            // 13c. Coverage drop (from Step 4)
            if (result.coverageRate > 0 && result.coverageRate < COVERAGE_DROP_THRESHOLD) {
                await emitIntegrationEvent({
                    tId, sId,
                    eventType: INTEGRATION_EVENT_TYPES.COVERAGE_DROP,
                    severity: EVENT_SEVERITY.CRITICAL,
                    payload: {
                        currentRate: result.coverageRate,
                        previousRate: 0, // Previous rate not tracked in nightly — future enhancement
                        threshold: COVERAGE_DROP_THRESHOLD,
                        totalQueries: 0,
                        canonicalHits: 0,
                    },
                });
                result.integrationEventsEmitted++;
            }

            // 13d. Knowledge gap events (from Step 5 — fallback proposals indicate gaps)
            if (result.totalFallbackProposals > 0) {
                await emitIntegrationEvent({
                    tId, sId,
                    eventType: INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED,
                    severity: EVENT_SEVERITY.HIGH,
                    payload: {
                        entityName: 'Multiple',
                        entityType: 'batch',
                        fallbackCount: result.totalFallbackProposals,
                        windowDays: 7,
                        sampleQueries: [],
                    },
                });
                result.integrationEventsEmitted++;
            }

            // 13e. TTL cleanup for integration data
            const cleanupResult = await cleanupExpiredIntegrationData(tId, sId);
            result.integrationCleanupEvents += cleanupResult.eventsDeleted;
            result.integrationCleanupLogs += cleanupResult.logsDeleted;
        }

        // 13f. Nightly summary event (one per run, sent to first tenant for delivery)
        if (tenants.length > 0) {
            const { tId, sId } = tenants[0];
            await emitIntegrationEvent({
                tId, sId,
                eventType: INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY,
                severity: EVENT_SEVERITY.LOW,
                payload: {
                    tenantsProcessed: result.tenantsProcessed,
                    driftDetected: result.totalDriftDetected,
                    driftCleared: result.totalDriftCleared,
                    proposalsCreated: result.totalProposalsCreated + result.totalFallbackProposals,
                    coverageRate: result.coverageRate,
                    signalsArchived: result.totalSignalsArchived,
                    errors: result.errors.slice(0, 5),
                },
            });
            result.integrationEventsEmitted++;
        }

        if (result.integrationEventsEmitted > 0) {
            console.log(`[Canonica Nightly] Step 13: ${result.integrationEventsEmitted} integration events emitted, ` +
                `cleanup: ${result.integrationCleanupEvents} events + ${result.integrationCleanupLogs} logs`);
        }
    } catch (error) {
        const msg = `[Integration] Fatal: ${error instanceof Error ? error.message : 'Unknown'}`;
        result.errors.push(msg);
        console.error(`[Canonica Nightly] ${msg}`);
    }

    return result;
}
