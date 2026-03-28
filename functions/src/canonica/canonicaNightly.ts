/**
 * Canonica — Nightly Drift & Mutation Engine (Server-Side)
 * 
 * Cloud Function logic for scheduled drift detection and signal mutation.
 * Uses firebase-admin (server-side Firestore), not the client SDK.
 * 
 * Runs as a task inside the unified nightly scheduler (decisionBlocksScoring.ts).
 * Feature-flag gated: ENABLE_CANONICA_NIGHTLY in functions/src/constants/features.ts.
 * 
 * Jobs:
 * 1. Drift Detection — evaluate all active canonical answers for 4 drift classes
 * 2. Signal Mutation — cluster recent signals and generate mutation proposals
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
        for (const [entityId, missCount] of entityMissCounts) {
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
// FOUNDER TRUST LAYER — TRUST METRICS AGGREGATION (Expansion Item #10)
// Computes 4 trust metrics from existing data, writes 1 platformSummary doc.
// Feature-flagged: ENABLE_CANONICA_TRUST_METRICS
// @see __docs__/canonica/founder-trust-layer/
// ═══════════════════════════════════════════════════════════════

interface TrustMetricsResult {
    coverageRate: number;
    resolutionRate: number;
    driftRate: number;
    entityHealthAvg: number;
    failingEntities: number;
}

/**
 * Aggregate trust metrics for a tenant+store.
 * Reuses answersSnap/entityMap/signalsByEntity from drift detection step.
 * Writes a single platformSummary/trustMetrics_{tId}_{sId} document.
 */
async function aggregateTrustMetrics(
    tId: number,
    sId: number,
    coverageResult: { hits: number; misses: number; rate: number }
): Promise<TrustMetricsResult> {
    const trustResult: TrustMetricsResult = {
        coverageRate: 0, resolutionRate: 0, driftRate: 0, entityHealthAvg: 0, failingEntities: 0,
    };

    try {
        // ── 1. Coverage rate (from step 4 result) ──
        const coverageRate = Math.round(coverageResult.rate * 100);
        trustResult.coverageRate = coverageRate;

        // ── 2. Resolution rate + escalation classification ──
        // Query search history for the last 24h (same as step 4 does, but we classify)
        const dayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
        const historySnap = await db
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('createdOn', '>=', dayAgo)
            .limit(500)
            .get();

        let totalQueries = 0;
        let escalatedQueries = 0;
        const escalationBreakdown = {
            knowledgeGap: 0, lowConfidence: 0, entityMismatch: 0,
            retrievalFailure: 0, userRequested: 0, total: 0,
        };

        for (const d of historySnap.docs) {
            const data = d.data();
            totalQueries++;

            if (!data.canonical) {
                if (!data.matchedEntityIds || data.matchedEntityIds.length === 0) {
                    // No entity resolved at all
                    escalationBreakdown.retrievalFailure++;
                    escalatedQueries++;
                } else if (data.matchedEntityIds?.length > 0 && !data.canonicalAnswerId) {
                    // Entity found but no canonical answer exists
                    escalationBreakdown.knowledgeGap++;
                    escalatedQueries++;
                } else if (data.confidence === 'low') {
                    // Answer found but confidence below threshold
                    escalationBreakdown.lowConfidence++;
                    escalatedQueries++;
                } else {
                    // Entity resolved, answer exists, confidence not low — likely wrong entity matched
                    escalationBreakdown.entityMismatch++;
                    escalatedQueries++;
                }
            }
        }

        // Count explicit escalation signals
        const escalationSignalsSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('type', '==', 'escalation')
            .where('timestamp', '>=', dayAgo)
            .limit(200)
            .get();

        escalationBreakdown.userRequested = escalationSignalsSnap.size;
        escalationBreakdown.total = escalatedQueries + escalationSignalsSnap.size;

        const resolutionRate = totalQueries > 0
            ? Math.round(((totalQueries - escalatedQueries) / totalQueries) * 100)
            : 0;
        trustResult.resolutionRate = resolutionRate;

        // ── 3. Drift rate ──
        const answersSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_CANONICAL_ANSWERS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'active')
            .get();

        const allAnswers = answersSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const driftedAnswers = allAnswers.filter(a => a.governance?.driftFlag);
        const driftRate = allAnswers.length > 0
            ? Math.round((driftedAnswers.length / allAnswers.length) * 100)
            : 0;
        trustResult.driftRate = driftRate;

        // ── 4. Entity health (server-side mirror of EntityHealthScore.tsx) ──
        const entitiesSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_ENTITIES)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .get();

        // Signal counts for entity health
        const signalWindowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const signalsSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_SIGNAL_EVENTS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('timestamp', '>=', signalWindowStart)
            .limit(500)
            .get();

        const signalsByEntity = new Map<string, { ticket: number; chat_negative: number; escalation: number; total: number }>();
        for (const d of signalsSnap.docs) {
            const data = d.data();
            const entityId = data.entityId;
            if (!entityId) continue;
            const counts = signalsByEntity.get(entityId) || { ticket: 0, chat_negative: 0, escalation: 0, total: 0 };
            if (data.type === 'ticket') counts.ticket++;
            else if (data.type === 'chat_negative') counts.chat_negative++;
            else if (data.type === 'escalation') counts.escalation++;
            counts.total++;
            signalsByEntity.set(entityId, counts);
        }

        // Search index for index score
        const indexSnap = await db
            .collection(DB_COLLECTIONS.CANONICA_ENTITY_SEARCH_INDEX)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .select('entityId')
            .get();
        const indexedEntityIds = new Set<string>();
        for (const d of indexSnap.docs) {
            indexedEntityIds.add(d.data().entityId);
        }

        const entityHealthScores: number[] = [];
        const topFailing: Array<{
            entityId: string; entityName: string; entityType: string;
            queryCount: number; escalationCount: number; reliabilityScore: number; failureScore: number;
        }> = [];

        for (const entityDoc of entitiesSnap.docs) {
            const entity = entityDoc.data();
            if (entity.status === 'deprecated') continue;

            const entityId = entityDoc.id;
            const boundAnswers = allAnswers.filter((a: any) =>
                a.scope?.entityIds?.includes(entityId)
            );
            const activeForEntity = boundAnswers.filter((a: any) => a.status === 'active');
            const driftedForEntity = activeForEntity.filter((a: any) => a.governance?.driftFlag);
            const signals = signalsByEntity.get(entityId) || { ticket: 0, chat_negative: 0, escalation: 0, total: 0 };

            const coverageScore = activeForEntity.length > 0 ? 100 : 0;
            const driftScore = activeForEntity.length === 0 ? 100
                : Math.round(((activeForEntity.length - driftedForEntity.length) / activeForEntity.length) * 100);
            const signalScore = signals.total === 0 ? 100
                : Math.max(0, Math.round((1 - (signals.chat_negative / signals.total)) * 100));
            const indexScore = indexedEntityIds.has(entityId) ? 100 : 0;

            // Weighted composite (same as EntityHealthScore.tsx)
            const healthScore = Math.round(
                coverageScore * 0.4 + driftScore * 0.3 + signalScore * 0.2 + indexScore * 0.1
            );

            entityHealthScores.push(healthScore);

            // Track entities with enough query volume for failing list
            if (signals.total >= 20) {
                const reliability = signals.total > 0
                    ? Math.round((1 - (signals.chat_negative / signals.total)) * 100) : 100;
                topFailing.push({
                    entityId,
                    entityName: entity.name || entityId,
                    entityType: entity.type || 'feature',
                    queryCount: signals.total,
                    escalationCount: signals.escalation || 0,
                    reliabilityScore: reliability,
                    failureScore: (signals.escalation || 0) * 3 + signals.chat_negative * 2,
                });
            }
        }

        const avgHealth = entityHealthScores.length > 0
            ? Math.round(entityHealthScores.reduce((a, b) => a + b, 0) / entityHealthScores.length)
            : 0;
        trustResult.entityHealthAvg = avgHealth;

        // Top 5 failing entities sorted by failure score
        const top5Failing = topFailing
            .sort((a, b) => b.failureScore - a.failureScore)
            .slice(0, 5);
        trustResult.failingEntities = top5Failing.length;

        // ── 5. Read previous metrics for trend ──
        const prevDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`trustMetrics_${tId}_${sId}`).get();
        const prev = prevDoc.exists ? prevDoc.data() : null;

        // ── 6. Write trust metrics document ──
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
            .doc(`trustMetrics_${tId}_${sId}`)
            .set({
                lastUpdated: Timestamp.now(),
                date: new Date().toISOString().split('T')[0],
                coverage: {
                    rate: coverageRate,
                    hits: coverageResult.hits,
                    misses: coverageResult.misses,
                    total: coverageResult.hits + coverageResult.misses,
                    previousRate: prev?.coverage?.rate ?? 0,
                },
                resolution: {
                    rate: resolutionRate,
                    resolved: totalQueries - escalatedQueries,
                    escalated: escalatedQueries,
                    total: totalQueries,
                    previousRate: prev?.resolution?.rate ?? 0,
                },
                drift: {
                    rate: driftRate,
                    driftedCount: driftedAnswers.length,
                    activeCount: allAnswers.length,
                    previousRate: prev?.drift?.rate ?? 0,
                },
                entityHealth: {
                    avgScore: avgHealth,
                    healthyCount: entityHealthScores.filter(s => s >= 80).length,
                    attentionCount: entityHealthScores.filter(s => s >= 40 && s < 80).length,
                    criticalCount: entityHealthScores.filter(s => s < 40).length,
                    totalEntities: entityHealthScores.length,
                    previousAvgScore: prev?.entityHealth?.avgScore ?? 0,
                },
                topFailingEntities: top5Failing,
                escalationBreakdown,
            }, { merge: true });

    } catch (error) {
        console.error(`[Canonica Trust] Metrics aggregation failed for ${tId}/${sId}:`, error);
    }

    return trustResult;
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
    coverageRate: number;
    trustMetrics?: TrustMetricsResult;
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
        coverageRate: 0,
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

            // 9. Founder Trust Metrics (Expansion Item #10)
            if (FUNCTION_FLAGS.ENABLE_CANONICA_TRUST_METRICS) {
                const trustResult = await aggregateTrustMetrics(tId, sId, coverageResult);
                result.trustMetrics = trustResult;
            }

            result.tenantsProcessed++;

            console.log(`[Canonica Nightly] Tenant ${tId}/${sId}: ` +
                `drift=${driftResult.driftDetected}/${driftResult.answersEvaluated}, ` +
                `resolved=${resolveResult.resolved}/${resolveResult.total}, ` +
                `proposals=${mutationResult.proposalsCreated}/${mutationResult.clustersAnalyzed}, ` +
                `fallbacks=${fallbackResult.proposalsCreated}, impact=${impactResult.tracked}, ` +
                `coverage=${Math.round(coverageResult.rate * 100)}%, archived=${archiveResult.archived}` +
                (result.trustMetrics ? `, trust=[cov=${result.trustMetrics.coverageRate}% res=${result.trustMetrics.resolutionRate}% drift=${result.trustMetrics.driftRate}% health=${result.trustMetrics.entityHealthAvg}]` : ''));
        } catch (error) {
            const msg = `Tenant ${tId}/${sId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            result.errors.push(msg);
            console.error(`[Canonica Nightly] Error for ${msg}`);
        }
    }

    return result;
}
