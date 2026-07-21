/**
 * Answerlattice — Signal Mutation Engine
 * 
 * Sprint 5: Converts friction signals into governed mutation proposals.
 * Signals propose mutations. Humans approve. System enforces consistency.
 * 
 * Signal Sources (FROZEN — only 3):
 * 1. Ticket clusters (by entity binding)
 * 2. Chat negative feedback clusters (by entity binding)
 * 3. Escalation patterns (by entity binding)
 * 
 * Mutation Types (FROZEN — only 4):
 * 1. content_refinement — answer exists but unclear
 * 2. scope_adjustment — answer valid for specific plan/role/state only
 * 3. version_update — behavior changed in release
 * 4. new_answer_required — entity exists but no canonical answer
 * 
 * RULES:
 * - Signals do NOT auto-modify knowledge
 * - Entity binding required for clustering (no pure embedding similarity)
 * - All mutations require human approval
 * - Post-mutation impact tracked (14-day window)
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §6
 */

import { FEATURE_FLAGS } from "@config/features";
import { addAuditLog } from "@database/answerlattice/auditLogs";
import { getActiveAnswersForEntity } from "@database/answerlattice/canonicalAnswers";
import { addMutationProposal } from "@database/answerlattice/mutationProposals";
import { getRecentSignalEvents } from "@database/answerlattice/signalEvents";
import { getAnswerlatticeScopeLogContext, logAnswerlatticeFailure } from "@lib/answerlattice/diagnostics";
import { normalizeAnswerlatticeResolvedEntityId } from "@lib/answerlattice/governanceIdBoundary";
import {
    ANSWERLATTICE_MUTATION_TYPE,
    ANSWERLATTICE_SIGNAL_TYPE,
    AnswerlatticeMutationProposal,
    AnswerlatticeMutationType,
    AnswerlatticeSignalEvent,
} from "@type/answerlattice";
import { Timestamp } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// CLUSTERING THRESHOLDS
// ═══════════════════════════════════════════════════════════════

const CLUSTERING_CONFIG = {
    minSignalsForProposal: 3,         // Minimum signal events to generate a proposal
    windowDays: 14,                    // Rolling window for signal analysis
    maxProposalsPerRun: 10,            // Limit proposals per batch run
    negativeFeedbackRateThreshold: 0.1, // 10% negative rate suggests content issue
};

// Signal severity weights (Phase 4 — Signal Quality)
// Escalations indicate the most severe knowledge gaps (3x)
// Tickets indicate medium-severity gaps (1.5x)
// Chat negative feedback is baseline (1x)
const SIGNAL_SEVERITY_WEIGHTS: Record<string, number> = {
    [ANSWERLATTICE_SIGNAL_TYPE.ESCALATION]: 3.0,
    [ANSWERLATTICE_SIGNAL_TYPE.TICKET]: 1.5,
    [ANSWERLATTICE_SIGNAL_TYPE.CHAT_NEGATIVE]: 1.0,
};

// Time decay: half-life of 7 days within the 14-day window
// Recent signals matter more than older ones
const TIME_DECAY_HALF_LIFE_DAYS = 7;

// ═══════════════════════════════════════════════════════════════
// SIGNAL CLUSTERING (Entity-Based, NOT Embedding-Based)
// ═══════════════════════════════════════════════════════════════

interface SignalCluster {
    entityId: string;
    entityName?: string;
    signals: AnswerlatticeSignalEvent[];
    ticketCount: number;
    chatNegativeCount: number;
    escalationCount: number;
    totalCount: number;
    weightedScore: number;          // Severity-weighted + time-decayed score
}

/**
 * Compute exponential time decay factor for a signal.
 * Returns 1.0 for "just now", decays toward 0 as signal ages.
 * Half-life: TIME_DECAY_HALF_LIFE_DAYS (7 days)
 */
function computeTimeDecay(signalTimestamp: Timestamp): number {
    const now = Date.now();
    const signalTime = signalTimestamp.toDate().getTime();
    const ageDays = Math.max(0, (now - signalTime) / (1000 * 60 * 60 * 24));
    return Math.pow(0.5, ageDays / TIME_DECAY_HALF_LIFE_DAYS);
}

/**
 * Get severity weight for a signal type.
 */
function getSignalWeight(type: string): number {
    return SIGNAL_SEVERITY_WEIGHTS[type] ?? 1.0;
}

/**
 * Cluster signals by entity ID (primary grouping key).
 * Applies severity weighting and time decay to produce a weighted score.
 * Entities define structure. Embeddings only assist discovery.
 */
function clusterSignalsByEntity(signals: AnswerlatticeSignalEvent[]): SignalCluster[] {
    const clusterMap = new Map<string, AnswerlatticeSignalEvent[]>();

    for (const signal of signals) {
        if (!Object.prototype.hasOwnProperty.call(SIGNAL_SEVERITY_WEIGHTS, signal.type)) continue;
        const entityId = normalizeAnswerlatticeResolvedEntityId(signal.entityId);
        if (!entityId) continue;
        const existing = clusterMap.get(entityId) || [];
        existing.push(signal);
        clusterMap.set(entityId, existing);
    }

    return Array.from(clusterMap.entries()).map(([entityId, clusterSignals]) => {
        let ticketCount = 0;
        let chatNegativeCount = 0;
        let escalationCount = 0;
        let weightedScore = 0;

        for (const s of clusterSignals) {
            if (s.type === ANSWERLATTICE_SIGNAL_TYPE.TICKET) ticketCount++;
            else if (s.type === ANSWERLATTICE_SIGNAL_TYPE.CHAT_NEGATIVE) chatNegativeCount++;
            else if (s.type === ANSWERLATTICE_SIGNAL_TYPE.ESCALATION) escalationCount++;

            // Compute weighted contribution: severity × time decay
            const severityWeight = getSignalWeight(s.type);
            const timeDecay = s.timestamp ? computeTimeDecay(s.timestamp) : 1.0;
            weightedScore += severityWeight * timeDecay;
        }

        return {
            entityId,
            signals: clusterSignals,
            ticketCount,
            chatNegativeCount,
            escalationCount,
            totalCount: clusterSignals.length,
            weightedScore: Math.round(weightedScore * 100) / 100,
        };
    });
}

// ═══════════════════════════════════════════════════════════════
// MUTATION TYPE DETERMINATION
// ═══════════════════════════════════════════════════════════════

/**
 * Determine what type of mutation is needed based on signal cluster analysis.
 */
async function determineMutationType(
    cluster: SignalCluster,
    tId: number,
    sId: number
): Promise<{ mutationType: AnswerlatticeMutationType; targetAnswerId: string | null; reason: string } | null> {
    // Check if canonical answers exist for this entity
    const existingAnswers = await getActiveAnswersForEntity(tId, sId, cluster.entityId);

    if (!existingAnswers || existingAnswers.length === 0) {
        // No canonical answer exists → new answer required
        return {
            mutationType: ANSWERLATTICE_MUTATION_TYPE.NEW_ANSWER_REQUIRED,
            targetAnswerId: null,
            reason: `Entity has ${cluster.totalCount} friction signals but no canonical answer`,
        };
    }

    if (existingAnswers.length > 1) {
        return null;
    }

    // Canonical answer exists — determine if content or scope issue
    const primaryAnswer = existingAnswers[0];

    // Entity-only signals cannot author a safe scope/version mutation. Generate
    // a complete content-refinement draft for the single unambiguous answer.
    return {
        mutationType: ANSWERLATTICE_MUTATION_TYPE.CONTENT_REFINEMENT,
        targetAnswerId: primaryAnswer.id,
        reason: `${cluster.totalCount} friction signals — review and refine answer content`,
    };
}

// ═══════════════════════════════════════════════════════════════
// MAIN MUTATION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface MutationEngineResult {
    proposalsCreated: number;
    clustersAnalyzed: number;
    clustersSkipped: number;
    details: Array<{
        entityId: string;
        mutationType: AnswerlatticeMutationType;
        signalCount: number;
        proposalId?: string;
    }>;
}

/**
 * Run signal mutation engine for a tenant+store.
 * Analyzes recent signal events, clusters by entity, generates mutation proposals.
 * 
 * Called by:
 * - Legacy/manual utility paths only.
 *
 * Production batch mutation runs inside functions-answerlattice/src/answerlattice/answerlatticeNightly.ts.
 * Do not expose this client-side engine as a broad dashboard trigger; it can read
 * up to 500 signal docs and belongs in the server scheduler for cost and access control.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_SIGNAL_MUTATION
 */
export async function runSignalMutationEngine(
    tId: number,
    sId: number
): Promise<MutationEngineResult> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION) {
        return { proposalsCreated: 0, clustersAnalyzed: 0, clustersSkipped: 0, details: [] };
    }

    const result: MutationEngineResult = {
        proposalsCreated: 0,
        clustersAnalyzed: 0,
        clustersSkipped: 0,
        details: [],
    };

    // 1. Fetch recent signal events (rolling 14-day window)
    const signals = await getRecentSignalEvents(
        tId, sId,
        CLUSTERING_CONFIG.windowDays,
        500 // max events to process
    );

    if (!signals || signals.length === 0) return result;

    // 2. Cluster signals by entity
    const clusters = clusterSignalsByEntity(signals);
    result.clustersAnalyzed = clusters.length;

    // 3. Filter clusters that meet minimum threshold
    const significantClusters = clusters
        .filter(c => c.totalCount >= CLUSTERING_CONFIG.minSignalsForProposal)
        .sort((a, b) => b.weightedScore - a.weightedScore) // Sort by weighted score (severity + recency)
        .slice(0, CLUSTERING_CONFIG.maxProposalsPerRun);

    result.clustersSkipped = clusters.length - significantClusters.length;

    // 4. Generate mutation proposals for significant clusters
    for (const cluster of significantClusters) {
        try {
            const mutation = await determineMutationType(cluster, tId, sId);
            if (!mutation) {
                result.clustersSkipped++;
                continue;
            }
            const { mutationType, targetAnswerId, reason } = mutation;

            const proposalData: Omit<AnswerlatticeMutationProposal, 'id'> = {
                tId,
                sId,
                targetAnswerId: targetAnswerId || '',
                relatedEntityIds: [cluster.entityId],
                mutationType,
                signalSummary: {
                    ticketCount: cluster.ticketCount,
                    chatCount: cluster.chatNegativeCount,
                    escalationCount: cluster.escalationCount,
                    negativeFeedbackRate: cluster.chatNegativeCount / Math.max(cluster.totalCount, 1),
                    exampleReferences: cluster.signals.slice(0, 3).map(s => s.id),
                },
                suggestedChange: { reviewReason: reason },
                confidenceScore: Math.min(cluster.weightedScore / 20, 1.0), // Normalize weighted score to 0-1
                status: 'pending_review',
            };

            const proposal = await addMutationProposal(proposalData);

            // Audit log
            await addAuditLog({
                tId,
                sId,
                action: 'mutation_proposal_generated',
                entityType: 'mutationProposal',
                entityId: proposal?.id || 'unknown',
                previousState: null,
                newState: {
                    mutationType,
                    targetAnswerId,
                    signalCount: cluster.totalCount,
                    reason,
                },
                performedBy: 'system:signal_mutation_engine',
                timestamp: Timestamp.now(),
            });

            result.proposalsCreated++;
            result.details.push({
                entityId: cluster.entityId,
                mutationType,
                signalCount: cluster.totalCount,
                proposalId: proposal?.id,
            });
        } catch (error) {
            // Continue with next cluster on failure (graceful degradation)
            logAnswerlatticeFailure('answerlattice_mutation_proposal_create_failed', error, {
                ...getAnswerlatticeScopeLogContext({
                    entityId: cluster.entityId,
                    sId,
                    tId,
                }),
                signalCount: cluster.totalCount,
            });
            result.details.push({
                entityId: cluster.entityId,
                mutationType: ANSWERLATTICE_MUTATION_TYPE.CONTENT_REFINEMENT,
                signalCount: cluster.totalCount,
            });
        }
    }

    return result;
}
