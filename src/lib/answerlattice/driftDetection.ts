/**
 * Answerlattice — Drift Detection Engine
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
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md §5
 */

import { FEATURE_FLAGS } from "@config/features";
import { getCanonicalAnswers, recordCanonicalAnswerDrift } from "@database/answerlattice/canonicalAnswers";
import { getEntities } from "@database/answerlattice/entities";
import { getRecentSignalEvents } from "@database/answerlattice/signalEvents";
import {
    ANSWERLATTICE_DRIFT_CLASS,
    ANSWERLATTICE_ENTITY_STATUS,
    AnswerlatticeCanonicalAnswer,
    AnswerlatticeDriftClass,
    AnswerlatticeEntity
} from "@type/answerlattice";

// ═══════════════════════════════════════════════════════════════
// DRIFT THRESHOLDS (Policy-level, not schema-level)
// ═══════════════════════════════════════════════════════════════

const SIGNAL_DRIFT_THRESHOLDS = {
    negativeFeedbackCount: 5,     // 5 post-validation negative events trigger drift
    ticketSpikeMultiplier: 2.0,   // 2x baseline ticket count triggers drift
    minSignalCount: 5,            // Minimum signals before evaluating rate
};

const normalizeScopeIds = (value: unknown): string[] => (
    Array.isArray(value)
        ? Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)))
        : []
);

const listOverlaps = (left: unknown, right: unknown): boolean => {
    const leftIds = normalizeScopeIds(left);
    const rightIds = normalizeScopeIds(right);
    return leftIds.length === 0 || rightIds.length === 0 || leftIds.some(id => rightIds.includes(id));
};

const timestampToMillis = (value: unknown): number => {
    if (!value || typeof value !== 'object') return 0;
    const candidate = value as { toMillis?: () => number; seconds?: unknown };
    if (typeof candidate.toMillis === 'function') {
        const millis = candidate.toMillis();
        return Number.isFinite(millis) ? millis : 0;
    }
    const seconds = Number(candidate.seconds);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 0;
};

// ═══════════════════════════════════════════════════════════════
// DRIFT CLASS A — VERSION DRIFT
// ═══════════════════════════════════════════════════════════════

/**
 * Detect version drift: entity changed in release but answer not revalidated.
 * Trigger: When a new release is registered with entityChanges.
 */
function evaluateVersionDrift(
    answer: AnswerlatticeCanonicalAnswer,
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
    signalCounts: { ticket: number; chat_negative: number; escalation: number; total: number }
): { drifted: boolean; reason?: string } {
    // Need minimum signals to evaluate
    if (signalCounts.total < SIGNAL_DRIFT_THRESHOLDS.minSignalCount) {
        return { drifted: false };
    }

    if (signalCounts.chat_negative >= SIGNAL_DRIFT_THRESHOLDS.negativeFeedbackCount) {
        return {
            drifted: true,
            reason: `${signalCounts.chat_negative} negative feedback events occurred after the last validation`,
        };
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
    answer: AnswerlatticeCanonicalAnswer,
    allActiveAnswers: AnswerlatticeCanonicalAnswer[]
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
        const planOverlap = listOverlaps(answer.scope.planIds, other.scope.planIds);
        const roleOverlap = listOverlaps(answer.scope.roleIds, other.scope.roleIds);
        const stateOverlap = listOverlaps(answer.scope.stateIds, other.scope.stateIds);

        if (planOverlap && roleOverlap && stateOverlap) {
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
    answer: AnswerlatticeCanonicalAnswer,
    entities: AnswerlatticeEntity[]
): { drifted: boolean; reason?: string } {
    const entityMap = new Map(entities.map(e => [e.id, e]));

    for (const entityId of answer.scope.entityIds) {
        const entity = entityMap.get(entityId);
        if (entity && entity.status === ANSWERLATTICE_ENTITY_STATUS.DEPRECATED) {
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
    driftReasons: { driftClass: AnswerlatticeDriftClass; reason: string }[];
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
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_DRIFT_DETECTION) {
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

    // One bounded workspace query is cheaper than one `in` query per 30
    // entities. Drift only considers friction events after each answer's latest
    // human validation, so resolved historical feedback cannot immediately
    // re-open the same drift finding.
    const recentSignals = (await getRecentSignalEvents(tId, sId, 14, 500)) ?? [];
    const signalsByEntity = new Map<string, typeof recentSignals>();
    for (const signal of recentSignals) {
        if (!signalsByEntity.has(signal.entityId)) signalsByEntity.set(signal.entityId, []);
        signalsByEntity.get(signal.entityId)!.push(signal);
    }

    for (const answer of activeAnswers) {
        const driftReasons: { driftClass: AnswerlatticeDriftClass; reason: string }[] = [];
        const previousDriftFlag = answer.governance.driftFlag;

        // Class A: Version Drift (only if release context provided)
        if (options?.releaseVersion && options?.changedEntityIds) {
            const versionResult = evaluateVersionDrift(answer, options.releaseVersion, options.changedEntityIds);
            if (versionResult.drifted) {
                driftReasons.push({
                    driftClass: ANSWERLATTICE_DRIFT_CLASS.VERSION_MISMATCH,
                    reason: versionResult.reason!,
                });
            }
        }

        // Class B: Signal Drift (uses pre-loaded batched counts)
        const primaryEntityId = answer.scope.entityIds[0];
        if (primaryEntityId) {
            const validationMillis = timestampToMillis(answer.validation?.lastValidatedOn);
            const signalCounts = { ticket: 0, chat_negative: 0, escalation: 0, total: 0 };
            for (const signal of signalsByEntity.get(primaryEntityId) || []) {
                if (timestampToMillis(signal.timestamp) <= validationMillis) continue;
                if (signal.type === 'ticket') signalCounts.ticket++;
                else if (signal.type === 'chat_negative') signalCounts.chat_negative++;
                else if (signal.type === 'escalation') signalCounts.escalation++;
                else continue;
                signalCounts.total++;
            }
            if (signalCounts.total > 0) {
                const signalResult = evaluateSignalDrift(signalCounts);
                if (signalResult.drifted) {
                    driftReasons.push({
                        driftClass: ANSWERLATTICE_DRIFT_CLASS.SIGNAL_ANOMALY,
                        reason: signalResult.reason!,
                    });
                }
            }
        }

        // Class C: Scope Conflict
        const scopeResult = evaluateScopeConflict(answer, activeAnswers);
        if (scopeResult.drifted) {
            driftReasons.push({
                driftClass: ANSWERLATTICE_DRIFT_CLASS.SCOPE_CONFLICT,
                reason: scopeResult.reason!,
            });
        }

        // Class D: Orphan Drift
        if (entities && entities.length > 0) {
            const orphanResult = evaluateOrphanDrift(answer, entities);
            if (orphanResult.drifted) {
                driftReasons.push({
                    driftClass: ANSWERLATTICE_DRIFT_CLASS.DEPRECATED_ENTITY,
                    reason: orphanResult.reason!,
                });
            }
        }

        // Compute new drift state (DERIVED, not toggled)
        const detectedDrift = driftReasons.length > 0;
        // A clean recompute never clears a previously detected drift flag.
        // Clearing requires an explicit validation event through Governance.
        const newDriftFlag = previousDriftFlag || detectedDrift;
        const newDriftReason = detectedDrift
            ? driftReasons.map(r => `[${r.driftClass}] ${r.reason}`).join('; ')
            : answer.governance.driftReason;
        const changed = detectedDrift
            && (!previousDriftFlag || answer.governance.driftReason !== newDriftReason);

        // Update governance flags if changed
        if (changed) {
            await recordCanonicalAnswerDrift(answer.id, newDriftReason || 'Drift review required');
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
