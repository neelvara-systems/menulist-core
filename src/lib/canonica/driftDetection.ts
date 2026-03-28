/**
 * Canonica — Drift Detection Engine
 * 
 * Sprint 4: Deterministic drift detection with 4 classes.
 * Rule-driven, explainable, stable. No ML heuristics.
 * 
 * 4 Drift Classes (FROZEN — no new classes without RFC):
 * A. Version Drift — entity changed in release but answer not revalidated
 * B. Signal Drift — negative feedback/ticket spike above threshold
 * C. Scope Conflict — overlapping active answers for same entity+scope+version
 * D. Orphan Drift — deprecated entity still bound to active answer
 * 
 * Execution modes:
 * 1. Release-triggered (synchronous after release activation)
 * 2. Nightly scheduled audit
 * 3. Signal-triggered batch evaluation
 * 
 * RULES:
 * - Drift flags are DERIVED (recomputable from primitives), not toggled
 * - Running twice must produce identical results (idempotent)
 * - Drift flag cannot be cleared without validation event
 * - Drifted answers served with internal warning, not hard-blocked
 * 
 * @see __docs__/canonica/doctrine/05-architecture-evolution.md §5
 */

import { FEATURE_FLAGS } from "@config/features";
import { addAuditLog } from "@database/canonica/auditLogs";
import { getCanonicalAnswers, updateAnswerGovernance } from "@database/canonica/canonicalAnswers";
import { getEntities } from "@database/canonica/entities";
import { getBatchSignalCounts, type BatchSignalCounts } from "@database/canonica/signalEvents";
import {
    CANONICA_DRIFT_CLASS,
    CANONICA_ENTITY_STATUS,
    CanonicaCanonicalAnswer,
    CanonicaDriftClass,
    CanonicaEntity
} from "@type/canonica";
import { Timestamp } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// DRIFT THRESHOLDS (Policy-level, not schema-level)
// ═══════════════════════════════════════════════════════════════

const SIGNAL_DRIFT_THRESHOLDS = {
    negativeFeedbackRate: 0.08,   // 8% negative feedback rate triggers drift
    ticketSpikeMultiplier: 2.0,   // 2x baseline ticket count triggers drift
    minSignalCount: 5,            // Minimum signals before evaluating rate
};

// ═══════════════════════════════════════════════════════════════
// DRIFT CLASS A — VERSION DRIFT
// ═══════════════════════════════════════════════════════════════

/**
 * Detect version drift: entity changed in release but answer not revalidated.
 * Trigger: When a new release is registered with entityChanges.
 */
function evaluateVersionDrift(
    answer: CanonicaCanonicalAnswer,
    releaseVersion: number,
    changedEntityIds: string[]
): { drifted: boolean; reason?: string } {
    // Check if any of the answer's bound entities were changed in this release
    const affectedEntities = answer.scope.entityIds.filter(id => changedEntityIds.includes(id));

    if (affectedEntities.length === 0) {
        return { drifted: false };
    }

    // Check if answer was validated after this release
    if (answer.productBinding.lastValidatedInVersion >= releaseVersion) {
        return { drifted: false };
    }

    return {
        drifted: true,
        reason: `Entity(s) ${affectedEntities.join(', ')} changed in release v${releaseVersion} but answer last validated at v${answer.productBinding.lastValidatedInVersion}`,
    };
}

// ═══════════════════════════════════════════════════════════════
// DRIFT CLASS B — SIGNAL DRIFT
// ═══════════════════════════════════════════════════════════════

/**
 * Detect signal drift: negative feedback or ticket spike above threshold.
 * Uses rolling 14-day window signal counts.
 */
function evaluateSignalDrift(
    answer: CanonicaCanonicalAnswer,
    signalCounts: { ticket: number; chat_negative: number; escalation: number; total: number }
): { drifted: boolean; reason?: string } {
    const { linkedChatCount, negativeFeedbackCount } = answer.signalMetrics;

    // Need minimum signals to evaluate
    if (signalCounts.total < SIGNAL_DRIFT_THRESHOLDS.minSignalCount) {
        return { drifted: false };
    }

    // Check negative feedback rate
    if (linkedChatCount > 0) {
        const feedbackRate = negativeFeedbackCount / linkedChatCount;
        if (feedbackRate > SIGNAL_DRIFT_THRESHOLDS.negativeFeedbackRate) {
            return {
                drifted: true,
                reason: `Negative feedback rate ${(feedbackRate * 100).toFixed(1)}% exceeds ${SIGNAL_DRIFT_THRESHOLDS.negativeFeedbackRate * 100}% threshold`,
            };
        }
    }

    // Check ticket spike (signal events vs historical)
    if (signalCounts.ticket > SIGNAL_DRIFT_THRESHOLDS.minSignalCount * SIGNAL_DRIFT_THRESHOLDS.ticketSpikeMultiplier) {
        return {
            drifted: true,
            reason: `Ticket count ${signalCounts.ticket} exceeds ${SIGNAL_DRIFT_THRESHOLDS.ticketSpikeMultiplier}x baseline threshold`,
        };
    }

    return { drifted: false };
}

// ═══════════════════════════════════════════════════════════════
// DRIFT CLASS C — SCOPE CONFLICT
// ═══════════════════════════════════════════════════════════════

/**
 * Detect scope conflict: multiple active answers overlap on entity+scope+version.
 * Pure rule validation — no AI involved.
 */
function evaluateScopeConflict(
    answer: CanonicaCanonicalAnswer,
    allActiveAnswers: CanonicaCanonicalAnswer[]
): { drifted: boolean; reason?: string } {
    for (const other of allActiveAnswers) {
        if (other.id === answer.id) continue;
        if (other.status !== 'active') continue;

        // Check entity overlap
        const entityOverlap = answer.scope.entityIds.some(id => other.scope.entityIds.includes(id));
        if (!entityOverlap) continue;

        // Check version window overlap
        const aFrom = answer.productBinding.applicableVersions.from;
        const aTo = answer.productBinding.applicableVersions.to;
        const bFrom = other.productBinding.applicableVersions.from;
        const bTo = other.productBinding.applicableVersions.to;

        const versionOverlap =
            (aTo === null || aTo === undefined || aTo >= bFrom) &&
            (bTo === null || bTo === undefined || bTo >= aFrom);

        if (!versionOverlap) continue;

        // Check scope overlap (plan/role/state)
        const planOverlap = !answer.scope.planIds?.length || !other.scope.planIds?.length ||
            answer.scope.planIds.some(p => other.scope.planIds!.includes(p));
        const roleOverlap = !answer.scope.roleIds?.length || !other.scope.roleIds?.length ||
            answer.scope.roleIds.some(r => other.scope.roleIds!.includes(r));

        if (planOverlap && roleOverlap) {
            return {
                drifted: true,
                reason: `Scope conflict with answer "${other.id}" — overlapping entity+version+scope`,
            };
        }
    }

    return { drifted: false };
}

// ═══════════════════════════════════════════════════════════════
// DRIFT CLASS D — ORPHAN DRIFT
// ═══════════════════════════════════════════════════════════════

/**
 * Detect orphan drift: deprecated entity still bound to active answer.
 */
function evaluateOrphanDrift(
    answer: CanonicaCanonicalAnswer,
    entities: CanonicaEntity[]
): { drifted: boolean; reason?: string } {
    const entityMap = new Map(entities.map(e => [e.id, e]));

    for (const entityId of answer.scope.entityIds) {
        const entity = entityMap.get(entityId);
        if (entity && entity.status === CANONICA_ENTITY_STATUS.DEPRECATED) {
            return {
                drifted: true,
                reason: `Bound entity "${entity.name}" (${entityId}) is deprecated`,
            };
        }
    }

    return { drifted: false };
}

// ═══════════════════════════════════════════════════════════════
// MAIN DRIFT EVALUATION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface DriftEvaluationResult {
    answerId: string;
    previousDriftFlag: boolean;
    newDriftFlag: boolean;
    driftReasons: { driftClass: CanonicaDriftClass; reason: string }[];
    changed: boolean;
}

/**
 * Run full drift evaluation for all canonical answers of a tenant+store.
 * 
 * This is the main entry point for:
 * - Nightly scheduled audit
 * - Release-triggered evaluation
 * - Signal-triggered batch evaluation
 * 
 * IDEMPOTENT: Running twice produces identical results.
 * DERIVED: Drift flags are computed, not toggled.
 */
export async function evaluateDriftForTenant(
    tId: number,
    sId: number,
    options?: {
        releaseVersion?: number;
        changedEntityIds?: string[];
    }
): Promise<DriftEvaluationResult[]> {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_DRIFT_DETECTION) {
        return [];
    }

    const results: DriftEvaluationResult[] = [];

    // Load all data needed for evaluation
    const [answers, entities] = await Promise.all([
        getCanonicalAnswers(tId, sId),
        getEntities(tId, sId),
    ]);

    if (!answers || answers.length === 0) return results;

    const activeAnswers = answers.filter(a => a.status === 'active');

    // Phase 4 (3.3): Batch signal counts for ALL entities at once
    // Collects all unique entityIds from active answers, fetches in one batched query
    const allEntityIds = new Set<string>();
    for (const answer of activeAnswers) {
        for (const eid of answer.scope.entityIds) {
            allEntityIds.add(eid);
        }
    }
    const batchedSignalCounts: BatchSignalCounts = allEntityIds.size > 0
        ? (await getBatchSignalCounts(tId, sId, Array.from(allEntityIds), 14)) ?? {}
        : {};

    for (const answer of activeAnswers) {
        const driftReasons: { driftClass: CanonicaDriftClass; reason: string }[] = [];
        const previousDriftFlag = answer.governance.driftFlag;

        // Class A: Version Drift (only if release context provided)
        if (options?.releaseVersion && options?.changedEntityIds) {
            const versionResult = evaluateVersionDrift(answer, options.releaseVersion, options.changedEntityIds);
            if (versionResult.drifted) {
                driftReasons.push({
                    driftClass: CANONICA_DRIFT_CLASS.VERSION_MISMATCH,
                    reason: versionResult.reason!,
                });
            }
        }

        // Class B: Signal Drift (uses pre-loaded batched counts)
        const primaryEntityId = answer.scope.entityIds[0];
        if (primaryEntityId) {
            const signalCounts = batchedSignalCounts[primaryEntityId];
            if (signalCounts) {
                const signalResult = evaluateSignalDrift(answer, signalCounts);
                if (signalResult.drifted) {
                    driftReasons.push({
                        driftClass: CANONICA_DRIFT_CLASS.SIGNAL_ANOMALY,
                        reason: signalResult.reason!,
                    });
                }
            }
        }

        // Class C: Scope Conflict
        const scopeResult = evaluateScopeConflict(answer, activeAnswers);
        if (scopeResult.drifted) {
            driftReasons.push({
                driftClass: CANONICA_DRIFT_CLASS.SCOPE_CONFLICT,
                reason: scopeResult.reason!,
            });
        }

        // Class D: Orphan Drift
        if (entities && entities.length > 0) {
            const orphanResult = evaluateOrphanDrift(answer, entities);
            if (orphanResult.drifted) {
                driftReasons.push({
                    driftClass: CANONICA_DRIFT_CLASS.DEPRECATED_ENTITY,
                    reason: orphanResult.reason!,
                });
            }
        }

        // Compute new drift state (DERIVED, not toggled)
        const newDriftFlag = driftReasons.length > 0;
        const newDriftReason = driftReasons.map(r => `[${r.driftClass}] ${r.reason}`).join('; ');
        const changed = newDriftFlag !== previousDriftFlag ||
            (newDriftFlag && answer.governance.driftReason !== newDriftReason);

        // Update governance flags if changed
        if (changed) {
            await updateAnswerGovernance(answer.id, {
                driftFlag: newDriftFlag,
                driftReason: newDriftFlag ? newDriftReason : undefined,
                reviewRequired: newDriftFlag,
            });

            // Log drift event to audit trail
            await addAuditLog({
                tId,
                sId,
                action: newDriftFlag ? 'drift_detected' : 'drift_cleared',
                entityType: 'canonicalAnswer',
                entityId: answer.id,
                previousState: {
                    driftFlag: previousDriftFlag,
                    driftReason: answer.governance.driftReason,
                },
                newState: {
                    driftFlag: newDriftFlag,
                    driftReason: newDriftFlag ? newDriftReason : null,
                    driftClasses: driftReasons.map(r => r.driftClass),
                },
                performedBy: 'system:drift_engine',
                timestamp: Timestamp.now(),
            });
        }

        results.push({
            answerId: answer.id,
            previousDriftFlag,
            newDriftFlag,
            driftReasons,
            changed,
        });
    }

    return results;
}
