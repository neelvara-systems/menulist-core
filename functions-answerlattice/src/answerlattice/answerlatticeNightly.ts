/**
 * Answerlattice — Nightly Drift & Mutation Engine (Server-Side)
 * 
 * Cloud Function logic for scheduled drift detection and signal mutation.
 * Uses firebase-admin (server-side Firestore), not the client SDK.
 * 
 * Deployed as a scheduled Cloud Function in the Answerlattice Firebase project.
 * Feature-flag gated: ENABLE_ANSWERLATTICE_NIGHTLY in functions-answerlattice/src/constants/features.ts.
 * 
 * Answerlattice Nightly Batch:
 * 1. Drift Detection — evaluate all active canonical answers for 4 drift classes
 * 2. Signal Entity Resolution — resolve 'unresolved' entityIds
 * 3. Signal Mutation — cluster signals → generate mutation proposals
 * 4. Canonical Coverage KPI — hit/miss aggregation
 * 5. Founder Trust Metrics — write compact trust dashboard summary
 * 6. Recurring Fallback Detection — auto-generate proposals for 5+ misses
 * 7. Post-Mutation Impact Tracking — 14-day before/after comparison
 * 8. Confidence Auto-Adjustment — boost answers with 30+ serves, 0 negatives
 * 9. Signal TTL Auto-Archive — delete signals older than 12 months
 * 10. Support Board Sync — create bounded owner review cards and summary
 * 11. Knowledge Intake Summary — refresh compact owner analytics only
 * 
 * RULES:
 * - Idempotent: running twice produces identical results
 * - Non-blocking: errors in one tenant don't block others
 * - Audit-logged: all drift changes and proposals are logged
 * 
 * @see __docs__/answerlattice/doctrine/05-architecture-evolution.md
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { createHash } from 'crypto';
import { DB_COLLECTIONS } from '../constants/database';
import { FUNCTION_FLAGS } from '../constants/features';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { cleanupExpiredIntegrationData } from '../integrations/deliveryLogger';
import { hasEnabledIntegrationAdapter } from '../integrations/configStore';
import { emitIntegrationEvent, resetNightlyEventCounts } from '../integrations/eventBus';
import { COVERAGE_DROP_THRESHOLD, EVENT_SEVERITY, INTEGRATION_EVENT_TYPES } from '../integrations/types';
import { bumpAnswerlatticeCacheVersion, ANSWERLATTICE_CACHE_SOURCES } from './cacheVersionManifest';
import { repairCompiledContextBundle } from './contextBundleBuilder';
import {
    cleanupAnswerlatticeOperationalRetention,
    getAnswerlatticeRetentionFields,
} from './dataRetention';
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';
import { generateDraftsForNewProposals } from './draftGenerator';
import { aggregateFrictionStats, cleanupExpiredFrictionStats } from './frictionAggregation';
import { generateFrictionInsight } from './frictionInsight';
import { syncKnowledgeIntakeSummary } from './knowledgeIntakeSummary';
import { runOnboardingBootstrap } from './onboardingBootstrap';
import { runPredictiveTriggerSync } from './predictiveTriggerSync';
import { extractTicketKnowledge } from './resolutionExtractor';
import { syncSupportBoardNightly } from './supportBoardSync';
import {
    ANSWERLATTICE_TENANT_SUMMARY_DOC_ID,
    AnswerlatticeTenantStore,
    parseAnswerlatticeTenantSummary,
    upsertAnswerlatticeTenantSummaryEntries,
} from './tenantSummary';

const SCHEDULER_LIMITS = {
    tenantDiscoveryDocs: 1000,
    activeAnswersPerTenant: 500,
    entitiesPerTenant: 1000,
    signalEventsPerWindow: 1000,
    searchIndexEntriesPerTenant: 1000,
    graphRelationsPerTenant: 2000,
    graphAnswersPerTenant: 1000,
};

const AI_FAILURE_ALERT_THRESHOLD = 3;
const AI_FAILURE_WINDOW_DAYS = 1;
const AI_TASK_PHASES = new Set([
    'draft_generation',
    'ticket_knowledge',
    'friction_insight',
    'bootstrap',
]);
const ANSWERLATTICE_SCHEDULER_TASK_FAILED = 'ANSWERLATTICE_SCHEDULER_TASK_FAILED';
const ANSWERLATTICE_SCHEDULER_RUN_LOG_WRITE_FAILED = 'ANSWERLATTICE_SCHEDULER_RUN_LOG_WRITE_FAILED';
const ANSWERLATTICE_TENANT_SUMMARY_BACKFILL_FAILED = 'ANSWERLATTICE_TENANT_SUMMARY_BACKFILL_FAILED';
const ANSWERLATTICE_GRAPH_ORPHAN_RELATIONS_SKIPPED = 'ANSWERLATTICE_GRAPH_ORPHAN_RELATIONS_SKIPPED';
const ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED = 'ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED';

type AnswerlatticeNightlyTrigger = 'scheduled' | 'manual';
type AnswerlatticeNightlyStatus = 'success' | 'partial' | 'failed' | 'skipped' | 'running';

export interface AnswerlatticeSchedulerDiagnostic {
    tId?: number;
    sId?: number;
    phase: string;
    operation: string;
    error: string;
    code?: string;
    name?: string;
    sourceStatusCode?: number | null;
    details?: Record<string, any>;
}

interface AnswerlatticeTaskRun {
    name: string;
    status: 'success' | 'failed' | 'skipped';
    durationMs: number;
    details?: Record<string, any>;
    error?: string;
}

interface AnswerlatticeTenantRun {
    tId: number;
    sId: number;
    status: 'success' | 'partial' | 'failed';
    durationMs: number;
    tasks: AnswerlatticeTaskRun[];
    errors: AnswerlatticeSchedulerDiagnostic[];
    driftDetected: number;
    driftCleared: number;
    proposalsCreated: number;
    fallbackProposals: number;
    signalsResolved: number;
    coverageRate: number;
    signalsArchived: number;
}

function getRecurringAiFailureSummary(tenantRun: AnswerlatticeTenantRun): {
    failureCount: number;
    phases: string[];
    errors: string[];
} {
    const aiDiagnostics = tenantRun.errors.filter((diagnostic) => {
        const text = `${diagnostic.phase} ${diagnostic.operation} ${diagnostic.error}`.toLowerCase();
        return AI_TASK_PHASES.has(diagnostic.phase)
            || text.includes('gemini')
            || text.includes('vertex')
            || text.includes('openai')
            || text.includes('model')
            || text.includes('embedding')
            || text.includes('generate');
    });

    const draftTask = tenantRun.tasks.find(task => task.name === 'draft_generation');
    const draftsFailed = Number(draftTask?.details?.draftsFailed || 0);
    const phases = Array.from(new Set([
        ...aiDiagnostics.map(diagnostic => diagnostic.phase),
        ...(draftsFailed > 0 ? ['draft_generation'] : []),
    ]));

    return {
        failureCount: aiDiagnostics.length + (Number.isFinite(draftsFailed) ? draftsFailed : 0),
        phases,
        errors: aiDiagnostics.map(diagnosticToMessage).slice(0, 5),
    };
}

interface TenantDiscoveryResult {
    tenants: AnswerlatticeTenantStore[];
    scannedDocs: number;
    truncated: boolean;
    source: 'summary' | 'entity_scan';
}

function buildDiagnostic(
    error: unknown,
    context: {
        tId?: number;
        sId?: number;
        phase: string;
        operation: string;
        details?: Record<string, any>;
    }
): AnswerlatticeSchedulerDiagnostic {
    const source = getAnswerlatticeSchedulerSourceErrorContext(error);
    return {
        tId: context.tId,
        sId: context.sId,
        phase: context.phase,
        operation: context.operation,
        error: ANSWERLATTICE_SCHEDULER_TASK_FAILED,
        code: source.sourceErrorCode || undefined,
        name: source.sourceErrorName || undefined,
        sourceStatusCode: source.sourceStatusCode,
        details: getBoundedSchedulerDetails(context.details),
    };
}

function diagnosticToMessage(diagnostic: AnswerlatticeSchedulerDiagnostic): string {
    const scope = diagnostic.tId != null && diagnostic.sId != null ? 'scoped' : 'global';
    return `[${diagnostic.phase}:${diagnostic.operation}] ${scope}: ${diagnostic.error}`;
}

function getAnswerlatticeSchedulerSourceErrorContext(error: unknown): {
    sourceErrorName: string;
    sourceErrorCode: string | null;
    sourceStatusCode: number | null;
} {
    const source = error as { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown };
    const status = typeof source?.status === 'number'
        ? source.status
        : typeof source?.statusCode === 'number'
            ? source.statusCode
            : null;
    return {
        sourceErrorName: typeof source?.name === 'string' ? source.name : typeof error,
        sourceErrorCode: typeof source?.code === 'string' || typeof source?.code === 'number' ? String(source.code) : null,
        sourceStatusCode: status,
    };
}

function getSchedulerScopeContext(tId?: number, sId?: number): Record<string, boolean> {
    return {
        hasTenantScope: Number.isFinite(Number(tId)) && Number(tId) > 0,
        hasStoreScope: Number.isFinite(Number(sId)) && Number(sId) > 0,
    };
}

function normalizeAnswerlatticeFunctionEntityIds(values: unknown): string[] {
    const source = Array.isArray(values) ? values : [];
    const normalizedIds: string[] = [];
    const seen = new Set<string>();
    for (const value of source) {
        const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(value);
        if (!entityId || seen.has(entityId)) continue;
        seen.add(entityId);
        normalizedIds.push(entityId);
    }
    return normalizedIds;
}

function getBoundedSchedulerDetails(details?: Record<string, any>): Record<string, any> | undefined {
    if (!details || typeof details !== 'object') return undefined;
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'string') {
            out[`${key}Present`] = value.length > 0;
            out[`${key}Length`] = value.length;
        } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
            out[key] = value;
        } else if (Array.isArray(value)) {
            out[`${key}Count`] = value.length;
        } else if (typeof value === 'object') {
            out[`${key}KeyCount`] = Object.keys(value).length;
        }
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

function getSchedulerDiagnosticLogContext(diagnostic: AnswerlatticeSchedulerDiagnostic): Record<string, any> {
    return {
        failureCode: diagnostic.error,
        phase: diagnostic.phase,
        operation: diagnostic.operation,
        ...getSchedulerScopeContext(diagnostic.tId, diagnostic.sId),
        sourceErrorName: diagnostic.name || null,
        sourceErrorCode: diagnostic.code || null,
        sourceStatusCode: diagnostic.sourceStatusCode || null,
        detailsKeyCount: diagnostic.details ? Object.keys(diagnostic.details).length : 0,
    };
}

// ═══════════════════════════════════════════════════════════════
// FEATURE FLAG CHECK
// ═══════════════════════════════════════════════════════════════

function isAnswerlatticeEnabled(): boolean {
    return FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_NIGHTLY;
}

// ═══════════════════════════════════════════════════════════════
// TENANT DISCOVERY
// ═══════════════════════════════════════════════════════════════

/**
 * Discover tenants that have Answerlattice entities (i.e., have been onboarded).
 * Reads platformSummary/answerlatticeTenantsSummary first. Falls back to the old
 * answerlattice_entities scan only for migration/backfill safety.
 */
export async function discoverActiveTenants(): Promise<TenantDiscoveryResult> {
    const summarySnap = await db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(ANSWERLATTICE_TENANT_SUMMARY_DOC_ID)
        .get();
    const summaryTenants = summarySnap.exists
        ? parseAnswerlatticeTenantSummary(summarySnap.data())
        : [];

    if (summaryTenants.length > 0) {
        return {
            tenants: summaryTenants,
            scannedDocs: 1,
            truncated: false,
            source: 'summary',
        };
    }

    const snapshot = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .select('tId', 'sId')
        .limit(SCHEDULER_LIMITS.tenantDiscoveryDocs)
        .get();

    const seen = new Set<string>();
    const tenants: AnswerlatticeTenantStore[] = [];

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const key = `${data.tId}_${data.sId}`;
        if (typeof data.tId !== 'number' || typeof data.sId !== 'number') {
            continue;
        }

        if (!seen.has(key)) {
            seen.add(key);
            tenants.push({ tId: data.tId, sId: data.sId });
        }
    }

    await upsertAnswerlatticeTenantSummaryEntries(db, tenants, {
        source: 'entity_scan_migration',
        hasEntities: true,
    }).catch(error => {
        logger.warn('[Answerlattice Nightly] Failed to backfill tenant summary from entity scan', {
            failureCode: ANSWERLATTICE_TENANT_SUMMARY_BACKFILL_FAILED,
            tenantCount: tenants.length,
            ...getAnswerlatticeSchedulerSourceErrorContext(error),
        });
    });

    return {
        tenants,
        scannedDocs: snapshot.size,
        truncated: snapshot.size >= SCHEDULER_LIMITS.tenantDiscoveryDocs,
        source: 'entity_scan',
    };
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

interface AnswerlatticeCoverageHistoryRow {
    canonical: boolean;
    canonicalAnswerId?: string;
    matchedEntityIds: string[];
    confidence?: string;
}

interface CoverageKpiResult {
    hits: number;
    misses: number;
    rate: number;
    errors: AnswerlatticeSchedulerDiagnostic[];
    historyRows: AnswerlatticeCoverageHistoryRow[];
}

interface TrustMetricsResult {
    written: boolean;
    coverageRate: number;
    resolutionRate: number;
    driftRate: number;
    entityHealthScore: number;
    topFailingEntities: number;
    errors: AnswerlatticeSchedulerDiagnostic[];
}

async function runDriftDetection(tId: number, sId: number): Promise<DriftResult> {
    const result: DriftResult = { answersEvaluated: 0, driftDetected: 0, driftCleared: 0 };

    // Load active canonical answers
    const answersQuery = db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .limit(SCHEDULER_LIMITS.activeAnswersPerTenant);

    // Load entities for orphan drift check
    const entitiesQuery = db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(SCHEDULER_LIMITS.entitiesPerTenant);

    // Signal counts (14-day rolling window)
    const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const signalsQuery = db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('timestamp', '>=', windowStart)
        .limit(SCHEDULER_LIMITS.signalEventsPerWindow);

    const [answersSnap, entitiesSnap, signalsSnap] = await Promise.all([
        answersQuery.get(),
        entitiesQuery.get(),
        signalsQuery.get(),
    ]);

    if (answersSnap.empty) return result;

    const entityMap = new Map<string, { status: string; name: string }>();
    for (const doc of entitiesSnap.docs) {
        const data = doc.data();
        entityMap.set(doc.id, { status: data.status, name: data.name });
    }

    // Group signal counts by entityId
    const signalsByEntity = new Map<string, { ticket: number; chat_negative: number; escalation: number; total: number }>();
    for (const doc of signalsSnap.docs) {
        const data = doc.data();
        const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);
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
        const answerEntityIds = normalizeAnswerlatticeFunctionEntityIds(answer.scope?.entityIds);

        // Class B: Signal Drift
        const primaryEntityId = answerEntityIds[0];
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
            const otherEntityIds = normalizeAnswerlatticeFunctionEntityIds(other.scope?.entityIds);
            const entityOverlap = answerEntityIds.some((id: string) => otherEntityIds.includes(id));
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
        for (const entityId of answerEntityIds) {
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
            await bumpAnswerlatticeCacheVersion(db, ANSWERLATTICE_CACHE_SOURCES.CANONICAL, tId, sId, {
                reason: newDriftFlag ? 'drift_detected' : 'drift_cleared',
                sourceId: answer.id,
                sourceType: 'canonical_answer',
            });
            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS).doc(answer.id).update({
                'governance.driftFlag': newDriftFlag,
                'governance.driftReason': newDriftFlag ? newDriftReason : null,
                'governance.reviewRequired': newDriftFlag,
            });

            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).add({
                pId: 'AL',
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
    proposalsSkippedExisting: number;
    errors: AnswerlatticeSchedulerDiagnostic[];
}

async function runSignalMutation(tId: number, sId: number): Promise<MutationResult> {
    const result: MutationResult = { clustersAnalyzed: 0, proposalsCreated: 0, proposalsSkippedExisting: 0, errors: [] };

    const windowStart = Timestamp.fromMillis(Date.now() - MUTATION_CONFIG.windowDays * 24 * 60 * 60 * 1000);

    const signalsSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
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
        const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);
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
                .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
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

            const existingProposalSnap = await db
                .collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('relatedEntityIds', 'array-contains', entityId)
                .where('status', '==', 'pending_review')
                .limit(1)
                .get();

            if (!existingProposalSnap.empty) {
                result.proposalsSkippedExisting++;
                continue;
            }

            const proposal = {
                pId: 'AL',
                tId,
                sId,
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
                modifiedOn: Timestamp.now(),
                createdBy: 'system:mutation_engine_nightly',
                modifiedBy: 'system:mutation_engine_nightly',
            };

            const proposalRef = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).add(proposal);

            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).add({
                pId: 'AL',
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
            const diagnostic = buildDiagnostic(error, {
                tId,
                sId,
                phase: 'signal_mutation',
                operation: 'create_mutation_proposal',
                details: { entityId },
            });
            result.errors.push(diagnostic);
            logger.error('[Answerlattice Mutation] Failed for entity', getSchedulerDiagnosticLogContext(diagnostic));
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
async function resolveUnresolvedSignals(tId: number, sId: number): Promise<{ resolved: number; total: number; errors: AnswerlatticeSchedulerDiagnostic[] }> {
    const result: { resolved: number; total: number; errors: AnswerlatticeSchedulerDiagnostic[] } = { resolved: 0, total: 0, errors: [] };

    // Fetch unresolved signals (last 14 days)
    const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const unresolvedSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
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
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(SCHEDULER_LIMITS.searchIndexEntriesPerTenant)
        .get();

    if (indexSnap.empty) return result;

    const searchIndex = indexSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    for (const signalDoc of unresolvedSnap.docs) {
        const signal = signalDoc.data();
        const metadata = signal.metadata || {};

        // Extract searchable support context from metadata. Keeping this broad
        // reduces unresolved-signal churn without adding extra Firestore reads.
        const productContext = metadata.productContext && typeof metadata.productContext === 'object'
            ? metadata.productContext
            : {};
        const searchText = [
            metadata.subject,
            metadata.title,
            metadata.query,
            metadata.message,
            metadata.summary,
            metadata.category,
            metadata.contextKey,
            metadata.surfaceId,
            metadata.surfaceLabel,
            metadata.comments,
            metadata.featureRequest,
            metadata.fallbackReason,
            metadata.answerSource,
            productContext.contextKey,
            productContext.feature,
            productContext.page,
            productContext.workflow,
            ...(Array.isArray(metadata.contextKeys) ? metadata.contextKeys : []),
            ...(Array.isArray(metadata.relatedContextKeys) ? metadata.relatedContextKeys : []),
            ...(Array.isArray(metadata.triggerTypes) ? metadata.triggerTypes : []),
            ...(Array.isArray(metadata.reasons) ? metadata.reasons : []),
            ...(Array.isArray(metadata.featureIssues) ? metadata.featureIssues : []),
        ].filter((value) => typeof value === 'string' || typeof value === 'number').join(' ').toLowerCase();

        if (!searchText) continue;

        // Tokenize and match against search index
        const tokens = searchText
            .replace(/[^a-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter((t: string) => t.length >= 2);

        let bestEntityId: string | null = null;
        let bestScore = 0;

        for (const entry of searchIndex) {
            const candidateEntityId = normalizeAnswerlatticeResolvedFunctionEntityId(entry.entityId);
            if (!candidateEntityId) continue;
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
                bestEntityId = candidateEntityId;
            }
        }

        // Only resolve if confidence is reasonable (score ≥ 2)
        if (bestEntityId && bestScore >= 2) {
            try {
                await signalDoc.ref.update({ entityId: bestEntityId });
                result.resolved++;
            } catch (error) {
                result.errors.push(buildDiagnostic(error, {
                    tId,
                    sId,
                    phase: 'signal_resolution',
                    operation: 'update_signal_entity',
                    details: { signalId: signalDoc.id, bestEntityId, bestScore },
                }));
            }
        }
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// CANONICAL COVERAGE KPI AGGREGATION
// ═══════════════════════════════════════════════════════════════

/**
 * Aggregate canonical hit/miss ratio from perf logs.
 * Stores in platformSummary/coverage_{tId}_{sId} for dashboard visibility.
 * 
 * This is THE metric that proves Answerlattice works.
 * Without tracking it, the system's value is invisible.
 */
async function aggregateCoverageKPI(tId: number, sId: number): Promise<CoverageKpiResult> {
    const result: CoverageKpiResult = { hits: 0, misses: 0, rate: 0, errors: [], historyRows: [] };

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
            result.historyRows.push({
                canonical: data.canonical === true,
                canonicalAnswerId: typeof data.canonicalAnswerId === 'string' ? data.canonicalAnswerId : undefined,
                matchedEntityIds: normalizeAnswerlatticeFunctionEntityIds(data.matchedEntityIds),
                confidence: typeof data.confidence === 'string' ? data.confidence : undefined,
            });
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
        const diagnostic = buildDiagnostic(error, {
            tId,
            sId,
            phase: 'coverage_kpi',
            operation: 'aggregate_search_history',
        });
        result.errors.push(diagnostic);
        logger.error('[Answerlattice Coverage] KPI aggregation failed', getSchedulerDiagnosticLogContext(diagnostic));
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// FOUNDER TRUST METRICS (Expansion Item #10)
// ═══════════════════════════════════════════════════════════════

function toPercent(numerator: number, denominator: number): number {
    if (denominator <= 0) return 0;
    return Math.round((numerator / denominator) * 100);
}

function getPreviousMetric(previous: Record<string, any> | undefined, path: string, fallback = 0): number {
    const value = path.split('.').reduce<any>((acc, part) => acc?.[part], previous);
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function classifySearchEscalation(row: AnswerlatticeCoverageHistoryRow): keyof AnswerlatticeTrustMetricsEscalationBreakdown | null {
    if (row.canonical === true && row.confidence !== 'low') return null;
    if (row.confidence === 'low') return 'lowConfidence';
    if (row.matchedEntityIds.length > 0 && !row.canonicalAnswerId) return 'knowledgeGap';
    if (row.matchedEntityIds.length === 0) return 'retrievalFailure';
    return 'knowledgeGap';
}

interface AnswerlatticeTrustMetricsEscalationBreakdown {
    knowledgeGap: number;
    lowConfidence: number;
    entityMismatch: number;
    retrievalFailure: number;
    userRequested: number;
    total: number;
}

async function aggregateTrustMetrics(tId: number, sId: number, coverageResult: CoverageKpiResult): Promise<TrustMetricsResult> {
    const result: TrustMetricsResult = {
        written: false,
        coverageRate: 0,
        resolutionRate: 0,
        driftRate: 0,
        entityHealthScore: 0,
        topFailingEntities: 0,
        errors: [],
    };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS) return result;

    try {
        const dayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);

        const [answersSnap, entitiesSnap, signalsSnap, previousSnap] = await Promise.all([
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'active')
                .limit(SCHEDULER_LIMITS.activeAnswersPerTenant)
                .get(),
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'active')
                .limit(SCHEDULER_LIMITS.entitiesPerTenant)
                .get(),
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('timestamp', '>=', dayAgo)
                .limit(SCHEDULER_LIMITS.signalEventsPerWindow)
                .get(),
            db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .doc(`trustMetrics_${tId}_${sId}`)
                .get(),
        ]);

        const activeAnswers = answersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const activeEntities = entitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const previous = previousSnap.exists ? previousSnap.data() : undefined;

        const coverageTotal = coverageResult.hits + coverageResult.misses;
        const coverageRate = toPercent(coverageResult.hits, coverageTotal);
        result.coverageRate = coverageRate;

        const escalationBreakdown: AnswerlatticeTrustMetricsEscalationBreakdown = {
            knowledgeGap: 0,
            lowConfidence: 0,
            entityMismatch: 0,
            retrievalFailure: 0,
            userRequested: 0,
            total: 0,
        };
        const missCountByEntity = new Map<string, number>();

        let escalatedQueries = 0;
        for (const row of coverageResult.historyRows) {
            const escalationClass = classifySearchEscalation(row);
            if (!escalationClass) continue;

            escalationBreakdown[escalationClass]++;
            escalatedQueries++;
            for (const entityId of row.matchedEntityIds) {
                missCountByEntity.set(entityId, (missCountByEntity.get(entityId) || 0) + 1);
            }
        }

        const signalsByEntity = new Map<string, { total: number; ticket: number; chatNegative: number; escalation: number }>();
        for (const signalDoc of signalsSnap.docs) {
            const signal = signalDoc.data();
            const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(signal.entityId);
            if (!entityId) continue;

            const counts = signalsByEntity.get(entityId) || { total: 0, ticket: 0, chatNegative: 0, escalation: 0 };
            counts.total++;
            if (signal.type === 'ticket') counts.ticket++;
            else if (signal.type === 'chat_negative') counts.chatNegative++;
            else if (signal.type === 'escalation') {
                counts.escalation++;
                escalationBreakdown.userRequested++;
            }
            signalsByEntity.set(entityId, counts);
        }

        escalationBreakdown.total = escalatedQueries + escalationBreakdown.userRequested;

        const totalQueries = coverageResult.historyRows.length;
        const resolutionRate = totalQueries > 0
            ? toPercent(Math.max(totalQueries - escalatedQueries, 0), totalQueries)
            : 0;
        result.resolutionRate = resolutionRate;

        const driftedAnswers = activeAnswers.filter(answer => answer.governance?.driftFlag === true);
        const driftRate = toPercent(driftedAnswers.length, activeAnswers.length);
        result.driftRate = driftRate;

        const answerCountsByEntity = new Map<string, { active: number; drifted: number }>();
        for (const answer of activeAnswers) {
            const entityIds = normalizeAnswerlatticeFunctionEntityIds(answer.scope?.entityIds);
            for (const entityId of entityIds) {
                const counts = answerCountsByEntity.get(entityId) || { active: 0, drifted: 0 };
                counts.active++;
                if (answer.governance?.driftFlag === true) counts.drifted++;
                answerCountsByEntity.set(entityId, counts);
            }
        }

        const entityHealthScores: number[] = [];
        const topFailingEntities: Array<{
            entityId: string;
            entityName: string;
            entityType: string;
            queryCount: number;
            escalationCount: number;
            reliabilityScore: number;
            failureScore: number;
        }> = [];

        for (const entity of activeEntities) {
            const entityId = entity.id;
            const answerCounts = answerCountsByEntity.get(entityId) || { active: 0, drifted: 0 };
            const signals = signalsByEntity.get(entityId) || { total: 0, ticket: 0, chatNegative: 0, escalation: 0 };
            const misses = missCountByEntity.get(entityId) || 0;
            const totalEntitySignals = signals.total + misses;

            const coverageScore = answerCounts.active > 0 ? 100 : 0;
            const driftScore = answerCounts.active > 0
                ? toPercent(answerCounts.active - answerCounts.drifted, answerCounts.active)
                : 100;
            const reliabilityFailures = signals.chatNegative + signals.escalation + misses;
            const reliabilityScore = totalEntitySignals > 0
                ? Math.max(0, toPercent(totalEntitySignals - reliabilityFailures, totalEntitySignals))
                : 100;
            const healthScore = Math.max(0, Math.min(100, Math.round(
                coverageScore * 0.4 +
                driftScore * 0.3 +
                reliabilityScore * 0.2 +
                10 // indexed/active entity bonus
            )));

            entityHealthScores.push(healthScore);

            const failureScore = signals.escalation * 3 + signals.chatNegative * 2 + misses;
            if (failureScore > 0) {
                topFailingEntities.push({
                    entityId,
                    entityName: entity.name || entityId,
                    entityType: entity.type || 'feature',
                    queryCount: totalEntitySignals,
                    escalationCount: signals.escalation,
                    reliabilityScore,
                    failureScore,
                });
            }
        }

        const avgHealth = entityHealthScores.length > 0
            ? Math.round(entityHealthScores.reduce((sum, score) => sum + score, 0) / entityHealthScores.length)
            : 0;
        result.entityHealthScore = avgHealth;

        const top5Failing = topFailingEntities
            .sort((a, b) => b.failureScore - a.failureScore)
            .slice(0, 5);
        result.topFailingEntities = top5Failing.length;

        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`trustMetrics_${tId}_${sId}`).set({
            lastUpdated: Timestamp.now(),
            date: new Date().toISOString().split('T')[0],
            coverage: {
                rate: coverageRate,
                hits: coverageResult.hits,
                misses: coverageResult.misses,
                total: coverageTotal,
                previousRate: getPreviousMetric(previous, 'coverage.rate'),
            },
            resolution: {
                rate: resolutionRate,
                resolved: Math.max(totalQueries - escalatedQueries, 0),
                escalated: escalatedQueries,
                total: totalQueries,
                previousRate: getPreviousMetric(previous, 'resolution.rate'),
            },
            drift: {
                rate: driftRate,
                driftedCount: driftedAnswers.length,
                activeCount: activeAnswers.length,
                previousRate: getPreviousMetric(previous, 'drift.rate'),
            },
            entityHealth: {
                avgScore: avgHealth,
                healthyCount: entityHealthScores.filter(score => score >= 80).length,
                attentionCount: entityHealthScores.filter(score => score >= 40 && score < 80).length,
                criticalCount: entityHealthScores.filter(score => score < 40).length,
                totalEntities: entityHealthScores.length,
                previousAvgScore: getPreviousMetric(previous, 'entityHealth.avgScore'),
            },
            topFailingEntities: top5Failing,
            escalationBreakdown,
        }, { merge: true });

        result.written = true;
    } catch (error) {
        const diagnostic = buildDiagnostic(error, {
            tId,
            sId,
            phase: 'trust_metrics',
            operation: 'aggregate_trust_metrics',
        });
        result.errors.push(diagnostic);
        logger.error('[Answerlattice Trust] Metrics aggregation failed', getSchedulerDiagnosticLogContext(diagnostic));
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
async function detectRecurringFallbacks(tId: number, sId: number): Promise<{ proposalsCreated: number; errors: AnswerlatticeSchedulerDiagnostic[] }> {
    const result: { proposalsCreated: number; errors: AnswerlatticeSchedulerDiagnostic[] } = { proposalsCreated: 0, errors: [] };

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
            const entityIds = normalizeAnswerlatticeFunctionEntityIds(data.matchedEntityIds);
            for (const entityId of entityIds) {
                entityMissCounts.set(entityId, (entityMissCounts.get(entityId) || 0) + 1);
            }
        }

        // Generate proposals for entities with 5+ misses
        const MIN_MISSES_FOR_PROPOSAL = 5;
        for (const [entityId, missCount] of Array.from(entityMissCounts.entries())) {
            if (missCount < MIN_MISSES_FOR_PROPOSAL) continue;

            // Check if we already have a pending proposal for this entity
            const existingSnap = await db
                .collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('relatedEntityIds', 'array-contains', entityId)
                .where('status', '==', 'pending_review')
                .limit(1)
                .get();

            if (!existingSnap.empty) continue; // Already has a pending proposal

            // Create auto-proposal
            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).add({
                pId: 'AL',
                tId,
                sId,
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
                modifiedOn: Timestamp.now(),
                createdBy: 'system:fallback_detector_nightly',
                modifiedBy: 'system:fallback_detector_nightly',
            });

            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).add({
                pId: 'AL',
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
        const diagnostic = buildDiagnostic(error, {
            tId,
            sId,
            phase: 'recurring_fallback_detection',
            operation: 'detect_and_create_proposals',
        });
        result.errors.push(diagnostic);
        logger.error('[Answerlattice Fallback] Detection failed', getSchedulerDiagnosticLogContext(diagnostic));
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
async function trackMutationImpact(tId: number, sId: number): Promise<{ tracked: number; errors: AnswerlatticeSchedulerDiagnostic[] }> {
    const result: { tracked: number; errors: AnswerlatticeSchedulerDiagnostic[] } = { tracked: 0, errors: [] };

    const fourteenDaysAgo = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);

    try {
        // Find implemented proposals without impact tracking
        const proposalsSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
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
            const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(proposal.relatedEntityIds?.[0]);
            if (!entityId) continue;

            const postSignalsSnap = await db
                .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
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
        const diagnostic = buildDiagnostic(error, {
            tId,
            sId,
            phase: 'mutation_impact',
            operation: 'track_implemented_proposals',
        });
        result.errors.push(diagnostic);
        logger.error('[Answerlattice Impact] Tracking failed', getSchedulerDiagnosticLogContext(diagnostic));
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
async function autoAdjustConfidence(tId: number, sId: number): Promise<{ adjusted: number; errors: AnswerlatticeSchedulerDiagnostic[] }> {
    const result: { adjusted: number; errors: AnswerlatticeSchedulerDiagnostic[] } = { adjusted: 0, errors: [] };

    try {
        const answersSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
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
        const diagnostic = buildDiagnostic(error, {
            tId,
            sId,
            phase: 'confidence_adjustment',
            operation: 'auto_adjust_confidence',
        });
        result.errors.push(diagnostic);
        logger.error('[Answerlattice Confidence] Auto-adjustment failed', getSchedulerDiagnosticLogContext(diagnostic));
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
async function archiveExpiredSignals(tId: number, sId: number, ttlMonths: number = 12, batchLimit: number = 100): Promise<{ archived: number; errors: AnswerlatticeSchedulerDiagnostic[] }> {
    const result: { archived: number; errors: AnswerlatticeSchedulerDiagnostic[] } = { archived: 0, errors: [] };

    try {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - ttlMonths);
        const cutoffTimestamp = Timestamp.fromDate(cutoff);

        const snapshot = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
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
        const diagnostic = buildDiagnostic(error, {
            tId,
            sId,
            phase: 'signal_ttl_archive',
            operation: 'delete_expired_signals',
        });
        result.errors.push(diagnostic);
        logger.error('[Answerlattice TTL] Signal archive failed', getSchedulerDiagnosticLogContext(diagnostic));
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// KNOWLEDGE GRAPH INDEX REBUILD (Expansion Item #11)
// Precomputes entity graph from answerlattice_entityRelations for
// O(1) graph expansion during retrieval.
// @see __docs__/answerlattice/knowledge-graph-exploitation/
// ═══════════════════════════════════════════════════════════════

interface GraphRebuildResult {
    rebuilt: boolean;
    entityCount: number;
    relationCount: number;
    orphanRelations: number;
    unchanged?: boolean;
}

function stableStringify(value: any): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function hashGraphPayload(value: any): string {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

/**
 * Rebuild the precomputed entity graph index for a tenant.
 * Reads entities + relations, builds a flat map, writes to platformSummary.
 * 
 * Cost: bounded entity + relation + answer reads plus one existing summary read.
 * Writes only when the deterministic source hash changes or tenant metadata is missing.
 */
async function rebuildEntityGraphIndex(tId: number, sId: number): Promise<GraphRebuildResult> {
    const result: GraphRebuildResult = { rebuilt: false, entityCount: 0, relationCount: 0, orphanRelations: 0 };

    // 1. Load active entities
    const entitiesSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .limit(SCHEDULER_LIMITS.entitiesPerTenant)
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
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(SCHEDULER_LIMITS.graphRelationsPerTenant)
        .get();

    result.relationCount = relationsSnap.size;

    // 3. Count active canonical answers per entity
    const answersSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .limit(SCHEDULER_LIMITS.graphAnswersPerTenant)
        .get();

    const answerCountByEntity = new Map<string, number>();
    for (const doc of answersSnap.docs) {
        const data = doc.data();
        const entityIds = normalizeAnswerlatticeFunctionEntityIds(data.scope?.entityIds);
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
        const fromId = normalizeAnswerlatticeResolvedFunctionEntityId(rel.fromEntityId);
        const toId = normalizeAnswerlatticeResolvedFunctionEntityId(rel.toEntityId);
        const relType: string = rel.relationType;

        // Check for orphan relations (entity deprecated or missing)
        if (!fromId || !toId || !entityMap.has(fromId) || !entityMap.has(toId)) {
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

    Object.values(graph).forEach(node => {
        node.related.sort();
        Object.keys(node.relationTypes).forEach(relationType => {
            node.relationTypes[relationType].sort();
        });
    });

    // 5. Write graph index to platformSummary
    const docKey = `entityGraphIndex_${tId}_${sId}`;
    const existingDoc = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docKey).get();
    const existingData = existingDoc.exists ? existingDoc.data() || {} : {};
    const previousVersion = existingDoc.exists ? (existingData.version || 0) : 0;
    const preservedInteractionRules = existingDoc.exists && existingData.interactionRules
        ? existingData.interactionRules
        : undefined;
    const sourceHash = hashGraphPayload({
        entityCount: result.entityCount,
        relationCount: result.relationCount,
        graph,
        interactionRules: preservedInteractionRules || [],
    });
    const missingScopeMetadata = existingDoc.exists && (
        existingData.pId !== 'AL'
        || Number(existingData.tId) !== Number(tId)
        || Number(existingData.sId) !== Number(sId)
    );

    if (existingDoc.exists && existingData.sourceHash === sourceHash) {
        if (missingScopeMetadata) {
            await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docKey).set({
                pId: 'AL',
                tId,
                sId,
                metadataBackfilledAt: Timestamp.now(),
            }, { merge: true });
        }
        result.unchanged = true;
        return result;
    }

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(docKey).set({
        pId: 'AL',
        tId,
        sId,
        lastRebuiltAt: Timestamp.now(),
        version: previousVersion + 1,
        entityCount: result.entityCount,
        relationCount: result.relationCount,
        sourceHash,
        graph,
        // interactionRules are authored separately — preserve them if they exist
        ...(preservedInteractionRules
            ? { interactionRules: preservedInteractionRules }
            : {}),
    });

    result.rebuilt = true;

    if (result.orphanRelations > 0) {
        logger.warn('[Answerlattice GraphIndex] Orphan relation(s) skipped', {
            failureCode: ANSWERLATTICE_GRAPH_ORPHAN_RELATIONS_SKIPPED,
            ...getSchedulerScopeContext(tId, sId),
            orphanRelations: result.orphanRelations,
        });
    }

    return result;
}

// ═══════════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

export interface AnswerlatticeNightlyResult {
    runLogId: string;
    status: AnswerlatticeNightlyStatus;
    trigger: AnswerlatticeNightlyTrigger;
    enabled: boolean;
    startedAtIso: string;
    durationMs: number;
    tenantDiscovery: {
        scannedDocs: number;
        truncated: boolean;
        tenantCount: number;
        source: 'summary' | 'entity_scan' | 'not_started' | 'scheduler_filter' | 'manual_scope';
    };
    tenantsProcessed: number;
    totalDriftDetected: number;
    totalDriftCleared: number;
    totalProposalsCreated: number;
    totalSignalsResolved: number;
    totalFallbackProposals: number;
    totalImpactTracked: number;
    totalConfidenceAdjusted: number;
    totalTrustMetricsWritten: number;
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
    // Step 16: Support Board Sync
    supportBoardCardsCreated: number;
    supportBoardCardsUpdated: number;
    supportBoardSummaryWritten: number;
    // Step 17: Knowledge Intake Summary
    knowledgeIntakeJobsScanned: number;
    knowledgeIntakeSummaryWritten: number;
    knowledgeIntakeUsageUnits: number;
    // Step 18: Predictive Trigger Sync (Expansion Item #12)
    predictiveSuggestionsGenerated: number;
    predictiveTriggersTotal: number;
    predictiveEffectivenessUpdated: number;
    predictiveAutoDisabled: number;
    // Step 19: Compiled Context Bundle Repair
    compiledContextBundlesRebuilt: number;
    compiledContextBundlesSkipped: number;
    compiledContextBytesGenerated: number;
    // Operational Retention Cleanup
    retentionSchedulerRunLogsDeleted: number;
    retentionNotificationLogsDeleted: number;
    retentionOwnerNotificationEventsDeleted: number;
    retentionOwnerNotificationDeliveriesDeleted: number;
    retentionOwnerNotificationRateLimitsDeleted: number;
    retentionContactEnquiriesDeleted: number;
    retentionQueryEmbeddingsDeleted: number;
    retentionAiSearchHistoryDeleted: number;
    retentionContextBundleObjectsDeleted: number;
    errors: string[];
    errorDetails: AnswerlatticeSchedulerDiagnostic[];
    tenantRuns: AnswerlatticeTenantRun[];
}

/**
 * Main entry point for the nightly Answerlattice job.
 * Called by Cloud Scheduler via the scheduled export in functions-answerlattice/src/index.ts.
 */
export async function runAnswerlatticeNightly(options: {
    trigger?: AnswerlatticeNightlyTrigger;
    triggeredBy?: string;
    tenantScope?: AnswerlatticeTenantStore[];
    tenantDiscoverySource?: TenantDiscoveryResult['source'] | 'scheduler_filter' | 'manual_scope';
} = {}): Promise<AnswerlatticeNightlyResult> {
    const trigger = options.trigger || 'scheduled';
    const triggeredBy = options.triggeredBy || (trigger === 'scheduled' ? 'system' : 'manual');
    const startedAtMs = Date.now();
    const startedAt = Timestamp.fromMillis(startedAtMs);
    const runLogId = `answerlattice_${trigger}_${startedAtMs}`;

    const result: AnswerlatticeNightlyResult = {
        runLogId,
        status: 'running',
        trigger,
        enabled: false,
        startedAtIso: new Date(startedAtMs).toISOString(),
        durationMs: 0,
        tenantDiscovery: {
            scannedDocs: 0,
            truncated: false,
            tenantCount: 0,
            source: 'not_started',
        },
        tenantsProcessed: 0,
        totalDriftDetected: 0,
        totalDriftCleared: 0,
        totalProposalsCreated: 0,
        totalSignalsResolved: 0,
        totalFallbackProposals: 0,
        totalImpactTracked: 0,
        totalConfidenceAdjusted: 0,
        totalTrustMetricsWritten: 0,
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
        supportBoardCardsCreated: 0,
        supportBoardCardsUpdated: 0,
        supportBoardSummaryWritten: 0,
        knowledgeIntakeJobsScanned: 0,
        knowledgeIntakeSummaryWritten: 0,
        knowledgeIntakeUsageUnits: 0,
        predictiveSuggestionsGenerated: 0,
        predictiveTriggersTotal: 0,
        predictiveEffectivenessUpdated: 0,
        predictiveAutoDisabled: 0,
        compiledContextBundlesRebuilt: 0,
        compiledContextBundlesSkipped: 0,
        compiledContextBytesGenerated: 0,
        retentionSchedulerRunLogsDeleted: 0,
        retentionNotificationLogsDeleted: 0,
        retentionOwnerNotificationEventsDeleted: 0,
        retentionOwnerNotificationDeliveriesDeleted: 0,
        retentionOwnerNotificationRateLimitsDeleted: 0,
        retentionContactEnquiriesDeleted: 0,
        retentionQueryEmbeddingsDeleted: 0,
        retentionAiSearchHistoryDeleted: 0,
        retentionContextBundleObjectsDeleted: 0,
        errors: [],
        errorDetails: [],
        tenantRuns: [],
    };

    const writeRunLog = async (payload: Record<string, any>) => {
        try {
            await db.collection(DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS).doc(runLogId).set({
                runLogId,
                product: 'answerlattice',
                trigger,
                triggeredBy,
                startedAt,
                updatedAt: Timestamp.now(),
                status: result.status,
                enabled: result.enabled,
                durationMs: result.durationMs,
                tenantDiscovery: result.tenantDiscovery,
                tenantsProcessed: result.tenantsProcessed,
                totals: {
                    driftDetected: result.totalDriftDetected,
                    driftCleared: result.totalDriftCleared,
                    proposalsCreated: result.totalProposalsCreated,
                    fallbackProposals: result.totalFallbackProposals,
                    signalsResolved: result.totalSignalsResolved,
                    signalsArchived: result.totalSignalsArchived,
                    draftsGenerated: result.totalDraftsGenerated,
                    draftsFailed: result.totalDraftsFailed,
                    frictionEntities: result.totalFrictionEntities,
                    trustMetricsWritten: result.totalTrustMetricsWritten,
                    graphIndexRebuilt: result.graphIndexRebuilt,
                    supportBoardCardsCreated: result.supportBoardCardsCreated,
                    supportBoardCardsUpdated: result.supportBoardCardsUpdated,
                    knowledgeIntakeJobsScanned: result.knowledgeIntakeJobsScanned,
                    knowledgeIntakeSummaryWritten: result.knowledgeIntakeSummaryWritten,
                    knowledgeIntakeUsageUnits: result.knowledgeIntakeUsageUnits,
                    predictiveSuggestionsGenerated: result.predictiveSuggestionsGenerated,
                    compiledContextBundlesRebuilt: result.compiledContextBundlesRebuilt,
                    compiledContextBytesGenerated: result.compiledContextBytesGenerated,
                    retentionSchedulerRunLogsDeleted: result.retentionSchedulerRunLogsDeleted,
                    retentionNotificationLogsDeleted: result.retentionNotificationLogsDeleted,
                    retentionOwnerNotificationEventsDeleted: result.retentionOwnerNotificationEventsDeleted,
                    retentionOwnerNotificationDeliveriesDeleted: result.retentionOwnerNotificationDeliveriesDeleted,
                    retentionOwnerNotificationRateLimitsDeleted: result.retentionOwnerNotificationRateLimitsDeleted,
                    retentionContactEnquiriesDeleted: result.retentionContactEnquiriesDeleted,
                    retentionQueryEmbeddingsDeleted: result.retentionQueryEmbeddingsDeleted,
                    retentionAiSearchHistoryDeleted: result.retentionAiSearchHistoryDeleted,
                    retentionContextBundleObjectsDeleted: result.retentionContextBundleObjectsDeleted,
                },
                errors: result.errorDetails.slice(0, 100),
                errorMessages: result.errors.slice(0, 100),
                tenantRuns: result.tenantRuns.slice(0, 100),
                metadata: {
                    limits: SCHEDULER_LIMITS,
                    workflowIntegrationsEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS,
                    autoKnowledgeEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE,
                    frictionIntelligenceEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE,
                    trustMetricsEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS,
                    founderOnboardingEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING,
                    ticketKnowledgeEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE,
                    graphEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH,
                    supportBoardSyncEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC,
                    knowledgeIntakeSchedulerEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE_SCHEDULER,
                    predictiveSupportEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT,
                    compiledContextBundlesEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES,
                },
                ...getAnswerlatticeRetentionFields('schedulerRunLogs', startedAt),
                ...payload,
            }, { merge: true });
        } catch (error) {
            logger.error('[Answerlattice Nightly] Failed to persist scheduler run log', {
                runLogId,
                failureCode: ANSWERLATTICE_SCHEDULER_RUN_LOG_WRITE_FAILED,
                ...getAnswerlatticeSchedulerSourceErrorContext(error),
            });
        }
    };

    const recordDiagnostic = (diagnostic: AnswerlatticeSchedulerDiagnostic, tenantRun?: AnswerlatticeTenantRun) => {
        const message = diagnosticToMessage(diagnostic);
        result.errorDetails.push(diagnostic);
        result.errors.push(message);
        tenantRun?.errors.push(diagnostic);
        return message;
    };

    const runTenantTask = async <T extends Record<string, any>>(
        tenantRun: AnswerlatticeTenantRun,
        taskName: string,
        operation: string,
        task: () => Promise<T>,
        applyResult: (taskResult: T) => void,
        buildDetails: (taskResult: T) => Record<string, any>
    ): Promise<T | null> => {
        const taskStart = Date.now();
        const errorCountBefore = tenantRun.errors.length;

        try {
            const taskResult = await task();
            const taskErrors = Array.isArray(taskResult.errors)
                ? (taskResult.errors.filter((entry: any) => entry && typeof entry === 'object' && entry.phase && entry.operation) as AnswerlatticeSchedulerDiagnostic[])
                : [];
            for (const diagnostic of taskErrors) {
                recordDiagnostic(diagnostic, tenantRun);
            }

            applyResult(taskResult);
            const newErrorCount = tenantRun.errors.length - errorCountBefore;
            tenantRun.tasks.push({
                name: taskName,
                status: newErrorCount > 0 ? 'failed' : 'success',
                durationMs: Date.now() - taskStart,
                details: buildDetails(taskResult),
                error: newErrorCount > 0
                    ? tenantRun.errors.slice(errorCountBefore).map(diagnosticToMessage).join('; ').substring(0, 1000)
                    : undefined,
            });

            return taskResult;
        } catch (error) {
            const diagnostic = buildDiagnostic(error, {
                tId: tenantRun.tId,
                sId: tenantRun.sId,
                phase: taskName,
                operation,
            });
            const message = recordDiagnostic(diagnostic, tenantRun);
            tenantRun.tasks.push({
                name: taskName,
                status: 'failed',
                durationMs: Date.now() - taskStart,
                error: message,
            });
            logger.error('[Answerlattice Nightly] Tenant task failed', getSchedulerDiagnosticLogContext(diagnostic));
            return null;
        }
    };

    await writeRunLog({
        status: 'running',
        phase: 'started',
        completedAt: null,
    });

    let tenants: AnswerlatticeTenantStore[] = [];

    try {
        // Feature flag gate
        const enabled = isAnswerlatticeEnabled();
        result.enabled = enabled;
        if (!enabled) {
            result.status = 'skipped';
            logger.info('[Answerlattice Nightly] Answerlattice nightly is disabled. Skipping.', { runLogId });
            return result;
        }

        await writeRunLog({ phase: 'tenant_discovery' });

        // Discover tenants with Answerlattice data. The master scheduler can pass
        // a pre-filtered tenant scope so hourly EOD checks do not reprocess
        // every active workspace.
        const discovery = options.tenantScope
            ? {
                tenants: options.tenantScope,
                scannedDocs: options.tenantScope.length,
                truncated: false,
                source: options.tenantDiscoverySource || 'scheduler_filter',
            }
            : await discoverActiveTenants();
        tenants = discovery.tenants;
        result.tenantDiscovery = {
            scannedDocs: discovery.scannedDocs,
            truncated: discovery.truncated,
            tenantCount: tenants.length,
            source: discovery.source,
        };

        if (discovery.truncated) {
            logger.warn('[Answerlattice Nightly] Tenant discovery hit scan cap', {
                runLogId,
                scannedDocs: discovery.scannedDocs,
                tenantCount: tenants.length,
                limit: SCHEDULER_LIMITS.tenantDiscoveryDocs,
            });
        }

        if (tenants.length === 0) {
            result.status = 'skipped';
            logger.info('[Answerlattice Nightly] No tenants with Answerlattice entities found.', { runLogId, scannedDocs: discovery.scannedDocs });
            return result;
        }

        logger.info('[Answerlattice Nightly] Processing tenants', { runLogId, tenantCount: tenants.length });

        for (const { tId, sId } of tenants) {
            const tenantStart = Date.now();
            const tenantRun: AnswerlatticeTenantRun = {
                tId,
                sId,
                status: 'success',
                durationMs: 0,
                tasks: [],
                errors: [],
                driftDetected: 0,
                driftCleared: 0,
                proposalsCreated: 0,
                fallbackProposals: 0,
                signalsResolved: 0,
                coverageRate: 0,
                signalsArchived: 0,
            };

            const driftResult = await runTenantTask(
                tenantRun,
                'drift_detection',
                'runDriftDetection',
                () => runDriftDetection(tId, sId),
                (taskResult) => {
                    result.totalDriftDetected += taskResult.driftDetected;
                    result.totalDriftCleared += taskResult.driftCleared;
                    tenantRun.driftDetected = taskResult.driftDetected;
                    tenantRun.driftCleared = taskResult.driftCleared;
                },
                (taskResult) => ({
                    answersEvaluated: taskResult.answersEvaluated,
                    driftDetected: taskResult.driftDetected,
                    driftCleared: taskResult.driftCleared,
                })
            );

            const resolveResult = await runTenantTask(
                tenantRun,
                'signal_resolution',
                'resolveUnresolvedSignals',
                () => resolveUnresolvedSignals(tId, sId),
                (taskResult) => {
                    result.totalSignalsResolved += taskResult.resolved;
                    tenantRun.signalsResolved = taskResult.resolved;
                },
                (taskResult) => ({ resolved: taskResult.resolved, total: taskResult.total })
            );

            const mutationResult = await runTenantTask(
                tenantRun,
                'signal_mutation',
                'runSignalMutation',
                () => runSignalMutation(tId, sId),
                (taskResult) => {
                    result.totalProposalsCreated += taskResult.proposalsCreated;
                    tenantRun.proposalsCreated = taskResult.proposalsCreated;
                },
                (taskResult) => ({
                    clustersAnalyzed: taskResult.clustersAnalyzed,
                    proposalsCreated: taskResult.proposalsCreated,
                    proposalsSkippedExisting: taskResult.proposalsSkippedExisting,
                })
            );

            const coverageResult = await runTenantTask(
                tenantRun,
                'coverage_kpi',
                'aggregateCoverageKPI',
                () => aggregateCoverageKPI(tId, sId),
                (_taskResult) => { },
                (taskResult) => ({
                    hits: taskResult.hits,
                    misses: taskResult.misses,
                    rate: Math.round(taskResult.rate * 100),
                })
            );
            if (coverageResult) tenantRun.coverageRate = coverageResult.rate;

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS && coverageResult) {
                await runTenantTask(
                    tenantRun,
                    'trust_metrics',
                    'aggregateTrustMetrics',
                    () => aggregateTrustMetrics(tId, sId, coverageResult) as Promise<any>,
                    (taskResult) => {
                        if (taskResult.written) result.totalTrustMetricsWritten++;
                    },
                    (taskResult) => ({
                        written: taskResult.written,
                        coverageRate: taskResult.coverageRate,
                        resolutionRate: taskResult.resolutionRate,
                        driftRate: taskResult.driftRate,
                        entityHealthScore: taskResult.entityHealthScore,
                        topFailingEntities: taskResult.topFailingEntities,
                        enabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS,
                    })
                );
            } else {
                tenantRun.tasks.push({
                    name: 'trust_metrics',
                    status: 'skipped',
                    durationMs: 0,
                    details: {
                        enabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS,
                        reason: coverageResult ? 'feature_flag_off' : 'coverage_unavailable',
                    },
                });
            }

            const fallbackResult = await runTenantTask(
                tenantRun,
                'recurring_fallback_detection',
                'detectRecurringFallbacks',
                () => detectRecurringFallbacks(tId, sId),
                (taskResult) => {
                    result.totalFallbackProposals += taskResult.proposalsCreated;
                    tenantRun.fallbackProposals = taskResult.proposalsCreated;
                },
                (taskResult) => ({ proposalsCreated: taskResult.proposalsCreated })
            );

            const impactResult = await runTenantTask(
                tenantRun,
                'mutation_impact',
                'trackMutationImpact',
                () => trackMutationImpact(tId, sId),
                (taskResult) => { result.totalImpactTracked += taskResult.tracked; },
                (taskResult) => ({ tracked: taskResult.tracked })
            );

            const confidenceResult = await runTenantTask(
                tenantRun,
                'confidence_adjustment',
                'autoAdjustConfidence',
                () => autoAdjustConfidence(tId, sId),
                (taskResult) => { result.totalConfidenceAdjusted += taskResult.adjusted; },
                (taskResult) => ({ adjusted: taskResult.adjusted })
            );

            const archiveResult = await runTenantTask(
                tenantRun,
                'signal_ttl_archive',
                'archiveExpiredSignals',
                () => archiveExpiredSignals(tId, sId),
                (taskResult) => {
                    result.totalSignalsArchived += taskResult.archived;
                    tenantRun.signalsArchived = taskResult.archived;
                },
                (taskResult) => ({ archived: taskResult.archived })
            );

            const draftResult = await runTenantTask(
                tenantRun,
                'draft_generation',
                'generateDraftsForNewProposals',
                () => generateDraftsForNewProposals(tId, sId) as Promise<any>,
                (taskResult) => {
                    result.totalDraftsGenerated += taskResult.draftsGenerated;
                    result.totalDraftsFailed += taskResult.draftsFailed;
                },
                (taskResult) => ({
                    draftsGenerated: taskResult.draftsGenerated,
                    draftsFailed: taskResult.draftsFailed,
                    proposalIds: taskResult.proposalIds,
                    enabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_AUTO_KNOWLEDGE,
                })
            );

            const frictionResult = await runTenantTask(
                tenantRun,
                'friction_aggregation',
                'aggregateFrictionStats',
                () => aggregateFrictionStats(tId, sId) as Promise<any>,
                (taskResult) => { result.totalFrictionEntities += taskResult.entitiesProcessed; },
                (taskResult) => ({
                    entitiesProcessed: taskResult.entitiesProcessed,
                    overallHealth: taskResult.overallHealth,
                    enabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE,
                })
            );

            const frictionCleanup = await runTenantTask(
                tenantRun,
                'friction_cleanup',
                'cleanupExpiredFrictionStats',
                () => cleanupExpiredFrictionStats(tId, sId) as Promise<any>,
                (taskResult) => { result.totalFrictionStatsCleanedUp += taskResult.cleaned; },
                (taskResult) => ({
                    cleaned: taskResult.cleaned,
                    enabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE,
                })
            );

            const dayOfWeek = new Date().getUTCDay(); // 0 = Sunday
            if (dayOfWeek === 0) {
                await runTenantTask(
                    tenantRun,
                    'friction_weekly_insight',
                    'generateFrictionInsight',
                    () => generateFrictionInsight(tId, sId) as Promise<any>,
                    (taskResult) => {
                        if (taskResult.generated) result.frictionInsightsGenerated++;
                    },
                    (taskResult) => ({
                        generated: taskResult.generated,
                        skipped: taskResult.skipped,
                        enabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE,
                    })
                );
            } else {
                tenantRun.tasks.push({
                    name: 'friction_weekly_insight',
                    status: 'skipped',
                    durationMs: 0,
                    details: { reason: 'not_sunday_utc', dayOfWeek },
                });
            }

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH) {
                await runTenantTask(
                    tenantRun,
                    'graph_index_rebuild',
                    'rebuildEntityGraphIndex',
                    () => rebuildEntityGraphIndex(tId, sId) as Promise<any>,
                    (taskResult) => {
                        result.graphIndexRebuilt += taskResult.rebuilt ? 1 : 0;
                        result.graphIndexEntities += taskResult.entityCount;
                        result.graphIndexRelations += taskResult.relationCount;
                    },
                    (taskResult) => ({
                        rebuilt: taskResult.rebuilt,
                        entityCount: taskResult.entityCount,
                        relationCount: taskResult.relationCount,
                        orphanRelations: taskResult.orphanRelations,
                    })
                );
            }

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE) {
                await runTenantTask(
                    tenantRun,
                    'ticket_knowledge',
                    'extractTicketKnowledge',
                    () => extractTicketKnowledge(tId, sId) as Promise<any>,
                    (taskResult) => {
                        result.ticketKnowledgeCandidates += taskResult.candidatesFound;
                        result.ticketKnowledgeProposals += taskResult.proposalsCreated;
                        result.ticketKnowledgeMerged += taskResult.proposalsMerged;
                        result.ticketKnowledgeSkipped += taskResult.skippedDuplicate + taskResult.skippedLowConfidence;
                        for (const errorMessage of taskResult.errors || []) {
                            recordDiagnostic(buildDiagnostic(new Error(errorMessage), {
                                tId,
                                sId,
                                phase: 'ticket_knowledge',
                                operation: 'extractTicketKnowledge',
                            }), tenantRun);
                        }
                    },
                    (taskResult) => ({
                        candidatesFound: taskResult.candidatesFound,
                        proposalsCreated: taskResult.proposalsCreated,
                        proposalsMerged: taskResult.proposalsMerged,
                        skippedDuplicate: taskResult.skippedDuplicate,
                        skippedLowConfidence: taskResult.skippedLowConfidence,
                        errorCount: taskResult.errors?.length || 0,
                    })
                );
            }

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC) {
                await runTenantTask(
                    tenantRun,
                    'support_board_sync',
                    'syncSupportBoardNightly',
                    () => syncSupportBoardNightly(tId, sId) as Promise<any>,
                    (taskResult) => {
                        result.supportBoardCardsCreated += taskResult.cardsCreated;
                        result.supportBoardCardsUpdated += taskResult.cardsUpdated;
                        result.supportBoardSummaryWritten += taskResult.summaryWritten ? 1 : 0;
                    },
                    (taskResult) => ({
                        candidatesAnalyzed: taskResult.candidatesAnalyzed,
                        cardsCreated: taskResult.cardsCreated,
                        cardsUpdated: taskResult.cardsUpdated,
                        cardsSkippedResolved: taskResult.cardsSkippedResolved,
                        cardsSkippedUnchanged: taskResult.cardsSkippedUnchanged,
                        summaryWritten: taskResult.summaryWritten,
                        openCards: taskResult.openCards,
                        needsAnswerCards: taskResult.needsAnswerCards,
                        highPriorityCards: taskResult.highPriorityCards,
                        totalRecentCards: taskResult.totalRecentCards,
                    })
                );
            }

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE_SCHEDULER) {
                await runTenantTask(
                    tenantRun,
                    'knowledge_intake_summary',
                    'syncKnowledgeIntakeSummary',
                    () => syncKnowledgeIntakeSummary(tId, sId) as Promise<any>,
                    (taskResult) => {
                        result.knowledgeIntakeJobsScanned += taskResult.jobsScanned;
                        result.knowledgeIntakeSummaryWritten += taskResult.summaryWritten ? 1 : 0;
                        result.knowledgeIntakeUsageUnits += taskResult.usageUnitsConsumed;
                    },
                    (taskResult) => ({
                        jobsScanned: taskResult.jobsScanned,
                        summaryWritten: taskResult.summaryWritten,
                        unchanged: taskResult.unchanged === true,
                        activeJobs: taskResult.activeJobs,
                        reviewItems: taskResult.reviewItems,
                        readySources: taskResult.readySources,
                        usageUnitsConsumed: taskResult.usageUnitsConsumed,
                        latestJobStatus: taskResult.latestJobStatus,
                    })
                );
            }

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) {
                await runTenantTask(
                    tenantRun,
                    'predictive_trigger_sync',
                    'runPredictiveTriggerSync',
                    () => runPredictiveTriggerSync(tId, sId) as Promise<any>,
                    (taskResult) => {
                        result.predictiveSuggestionsGenerated += taskResult.suggestionsGenerated;
                        result.predictiveTriggersTotal += taskResult.triggerCount;
                        result.predictiveEffectivenessUpdated += taskResult.effectivenessUpdated;
                        result.predictiveAutoDisabled += taskResult.autoDisabled;
                    },
                    (taskResult) => ({
                        suggestionsGenerated: taskResult.suggestionsGenerated,
                        cacheRebuilt: taskResult.cacheRebuilt,
                        triggerCount: taskResult.triggerCount,
                        effectivenessUpdated: taskResult.effectivenessUpdated,
                        autoDisabled: taskResult.autoDisabled,
                    })
                );
            }

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES && FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_BUNDLE_BUILDER) {
                await runTenantTask(
                    tenantRun,
                    'compiled_context_bundle_repair',
                    'repairCompiledContextBundle',
                    async () => {
                        const repair = await repairCompiledContextBundle(tId, sId);
                        if (repair.status === 'failed') {
                            throw new Error(repair.error || 'Compiled context bundle repair failed');
                        }
                        return repair as any;
                    },
                    (taskResult) => {
                        result.compiledContextBundlesRebuilt += taskResult.rebuilt ? 1 : 0;
                        result.compiledContextBundlesSkipped += taskResult.status === 'skipped' ? 1 : 0;
                        result.compiledContextBytesGenerated += taskResult.rebuilt ? Number(taskResult.bytesTotal || 0) : 0;
                    },
                    (taskResult) => ({
                        status: taskResult.status,
                        rebuilt: taskResult.rebuilt,
                        skippedReason: taskResult.skippedReason || null,
                        bundleVersion: taskResult.bundleVersion,
                        routes: taskResult.routes,
                        bytesTotal: taskResult.bytesTotal,
                        error: taskResult.error || null,
                    })
                );
            }

            tenantRun.durationMs = Date.now() - tenantStart;
            const failedTasks = tenantRun.tasks.filter(task => task.status === 'failed').length;
            tenantRun.status = failedTasks === 0 ? 'success' : (failedTasks === tenantRun.tasks.length ? 'failed' : 'partial');
            result.tenantRuns.push(tenantRun);
            result.tenantsProcessed++;

            logger.info('[Answerlattice Nightly] Tenant complete', {
                runLogId,
                tId,
                sId,
                status: tenantRun.status,
                durationMs: tenantRun.durationMs,
                drift: driftResult ? `${driftResult.driftDetected}/${driftResult.answersEvaluated}` : 'failed',
                resolved: resolveResult ? `${resolveResult.resolved}/${resolveResult.total}` : 'failed',
                proposals: mutationResult ? `${mutationResult.proposalsCreated}/${mutationResult.clustersAnalyzed}` : 'failed',
                fallbacks: fallbackResult?.proposalsCreated || 0,
                impact: impactResult?.tracked || 0,
                coverage: coverageResult ? Math.round(coverageResult.rate * 100) : null,
                archived: archiveResult?.archived || 0,
                drafts: draftResult ? `${draftResult.draftsGenerated}/${draftResult.draftsGenerated + draftResult.draftsFailed}` : 'failed',
                friction: frictionResult ? `${frictionResult.entitiesProcessed}/${frictionResult.overallHealth}` : 'failed',
                cleanup: frictionCleanup?.cleaned || 0,
                errorCount: tenantRun.errors.length,
            });
        }

        const coverageRuns = result.tenantRuns.filter(run => run.coverageRate > 0);
        result.coverageRate = coverageRuns.length > 0
            ? coverageRuns.reduce((sum, run) => sum + run.coverageRate, 0) / coverageRuns.length
            : 0;

        // ═══════════════════════════════════════════════════════════════
        // Operational Retention Cleanup
        // Bounded cleanup for raw operational rows and old compiled bundle
        // versions. This stays inside the existing scheduler by design.
        // ═══════════════════════════════════════════════════════════════
        try {
            const retentionResult = await cleanupAnswerlatticeOperationalRetention({
                tenants: result.tenantRuns.map((tenantRun) => ({
                    tId: tenantRun.tId,
                    sId: tenantRun.sId,
                })),
            });

            result.retentionSchedulerRunLogsDeleted += retentionResult.schedulerRunLogsDeleted;
            result.retentionNotificationLogsDeleted += retentionResult.notificationLogsDeleted;
            result.retentionOwnerNotificationEventsDeleted += retentionResult.ownerNotificationEventsDeleted;
            result.retentionOwnerNotificationDeliveriesDeleted += retentionResult.ownerNotificationDeliveriesDeleted;
            result.retentionOwnerNotificationRateLimitsDeleted += retentionResult.ownerNotificationRateLimitsDeleted;
            result.retentionContactEnquiriesDeleted += retentionResult.contactEnquiriesDeleted;
            result.retentionQueryEmbeddingsDeleted += retentionResult.queryEmbeddingsDeleted;
            result.retentionAiSearchHistoryDeleted += retentionResult.aiSearchHistoryDeleted;
            result.retentionContextBundleObjectsDeleted += retentionResult.contextBundleObjectsDeleted;

            for (const errorMessage of retentionResult.errors) {
                recordDiagnostic(buildDiagnostic(new Error(errorMessage), {
                    phase: 'retention_cleanup',
                    operation: 'cleanupAnswerlatticeOperationalRetention',
                }));
            }

            logger.info('[Answerlattice Nightly] Retention cleanup complete', {
                runLogId,
                schedulerRunLogsDeleted: retentionResult.schedulerRunLogsDeleted,
                notificationLogsDeleted: retentionResult.notificationLogsDeleted,
                ownerNotificationEventsDeleted: retentionResult.ownerNotificationEventsDeleted,
                ownerNotificationDeliveriesDeleted: retentionResult.ownerNotificationDeliveriesDeleted,
                ownerNotificationRateLimitsDeleted: retentionResult.ownerNotificationRateLimitsDeleted,
                contactEnquiriesDeleted: retentionResult.contactEnquiriesDeleted,
                queryEmbeddingsDeleted: retentionResult.queryEmbeddingsDeleted,
                aiSearchHistoryDeleted: retentionResult.aiSearchHistoryDeleted,
                contextBundleObjectsDeleted: retentionResult.contextBundleObjectsDeleted,
                errorCount: retentionResult.errors.length,
            });
        } catch (error) {
            const diagnostic = buildDiagnostic(error, {
                phase: 'retention_cleanup',
                operation: 'cleanupAnswerlatticeOperationalRetention',
            });
            recordDiagnostic(diagnostic);
            logger.error('[Answerlattice Nightly] Retention cleanup fatal error', getSchedulerDiagnosticLogContext(diagnostic));
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 12 — Onboarding Bootstrap (Expansion Item #6)
        // Separate discovery loop — queries kb_generation_jobs, NOT answerlattice_entities.
        // New tenants with zero entities need this to bootstrap their canonical layer.
        // Feature-flagged: ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING
        // @see __docs__/answerlattice/founder-onboarding/
        // ═══════════════════════════════════════════════════════════════
        try {
            const bootstrapResult = await runOnboardingBootstrap();
            result.bootstrapTenantsProcessed = bootstrapResult.tenantsBootstrapped;
            result.bootstrapEntitiesExtracted = bootstrapResult.totalEntitiesExtracted;
            result.bootstrapEntitiesPromoted = bootstrapResult.totalEntitiesPromoted;
            result.bootstrapDraftsGenerated = bootstrapResult.totalDraftsGenerated;
            for (const errorMessage of bootstrapResult.errors || []) {
                recordDiagnostic(buildDiagnostic(new Error(errorMessage), {
                    phase: 'bootstrap',
                    operation: 'runOnboardingBootstrap',
                }));
            }
            if (bootstrapResult.tenantsBootstrapped > 0) {
                logger.info('[Answerlattice Nightly] Bootstrap complete', {
                    runLogId,
                    tenantsBootstrapped: bootstrapResult.tenantsBootstrapped,
                    entitiesExtracted: bootstrapResult.totalEntitiesExtracted,
                    entitiesPromoted: bootstrapResult.totalEntitiesPromoted,
                    draftsGenerated: bootstrapResult.totalDraftsGenerated,
                    draftsFailed: bootstrapResult.totalDraftsFailed,
                });
            }
        } catch (error) {
            const diagnostic = buildDiagnostic(error, {
                phase: 'bootstrap',
                operation: 'runOnboardingBootstrap',
            });
            recordDiagnostic(diagnostic);
            logger.error('[Answerlattice Nightly] Bootstrap fatal error', getSchedulerDiagnosticLogContext(diagnostic));
        }

        // ═══════════════════════════════════════════════════════════════
        // STEP 13 — External Workflow Integrations (Expansion Item #7)
        // Emits tenant-scoped governance events to configured external tools.
        // Feature-flagged: ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS
        // @see __docs__/answerlattice/workflow-integrations/
        // ═══════════════════════════════════════════════════════════════
        if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) {
            try {
                resetNightlyEventCounts();

                for (const tenantRun of result.tenantRuns) {
                    const { tId, sId } = tenantRun;

                    const cleanupResult = await cleanupExpiredIntegrationData(tId, sId);
                    result.integrationCleanupEvents += cleanupResult.eventsDeleted;
                    result.integrationCleanupLogs += cleanupResult.logsDeleted;

                    let hasEnabledAdapter = false;
                    try {
                        hasEnabledAdapter = await hasEnabledIntegrationAdapter(tId, sId);
                    } catch (error) {
                        const diagnostic = buildDiagnostic(error, {
                            tId,
                            sId,
                            phase: 'workflow_integrations',
                            operation: 'hasEnabledIntegrationAdapter',
                        });
                        diagnostic.error = ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED;
                        const message = recordDiagnostic(diagnostic, tenantRun);
                        tenantRun.status = tenantRun.status === 'failed' ? 'failed' : 'partial';
                        tenantRun.tasks.push({
                            name: 'workflow_integrations',
                            status: 'failed',
                            durationMs: 0,
                            details: { reason: 'adapter_check_failed' },
                            error: message,
                        });
                        logger.error('[Answerlattice Nightly] Integration adapter check failed', getSchedulerDiagnosticLogContext(diagnostic));
                        continue;
                    }

                    if (!hasEnabledAdapter) {
                        tenantRun.tasks.push({
                            name: 'workflow_integrations',
                            status: 'skipped',
                            durationMs: 0,
                            details: { reason: 'no_enabled_adapter' },
                        });
                        continue;
                    }

                    const tenantProposals = tenantRun.proposalsCreated + tenantRun.fallbackProposals;
                    const shouldSendTenantDigest = tenantRun.driftDetected > 0
                        || tenantProposals > 0
                        || tenantRun.fallbackProposals > 0
                        || tenantRun.signalsResolved > 0
                        || tenantRun.coverageRate > 0;

                    if (tenantRun.coverageRate > 0 && tenantRun.coverageRate < COVERAGE_DROP_THRESHOLD) {
                        await emitIntegrationEvent({
                            tId, sId,
                            eventType: INTEGRATION_EVENT_TYPES.COVERAGE_DROP,
                            severity: EVENT_SEVERITY.CRITICAL,
                            payload: {
                                currentRate: tenantRun.coverageRate,
                                previousRate: 0,
                                threshold: COVERAGE_DROP_THRESHOLD,
                                totalQueries: 0,
                                canonicalHits: 0,
                            },
                        });
                        result.integrationEventsEmitted++;
                    }

                    const aiFailureSummary = getRecurringAiFailureSummary(tenantRun);
                    if (aiFailureSummary.failureCount >= AI_FAILURE_ALERT_THRESHOLD) {
                        await emitIntegrationEvent({
                            tId, sId,
                            eventType: INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING,
                            severity: aiFailureSummary.failureCount >= AI_FAILURE_ALERT_THRESHOLD * 2
                                ? EVENT_SEVERITY.CRITICAL
                                : EVENT_SEVERITY.HIGH,
                            payload: {
                                entityName: 'Workspace AI operations',
                                entityType: 'support_generation',
                                failureCount: aiFailureSummary.failureCount,
                                windowDays: AI_FAILURE_WINDOW_DAYS,
                                commonQueries: aiFailureSummary.phases,
                                errors: aiFailureSummary.errors,
                            },
                        });
                        result.integrationEventsEmitted++;
                    }

                    if (shouldSendTenantDigest) {
                        await emitIntegrationEvent({
                            tId, sId,
                            eventType: INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY,
                            severity: tenantRun.coverageRate > 0 && tenantRun.coverageRate < COVERAGE_DROP_THRESHOLD
                                ? EVENT_SEVERITY.HIGH
                                : EVENT_SEVERITY.LOW,
                            payload: {
                                runLogId,
                                tenantsProcessed: 1,
                                driftDetected: tenantRun.driftDetected,
                                driftCleared: tenantRun.driftCleared,
                                proposalsCreated: tenantProposals,
                                fallbackProposals: tenantRun.fallbackProposals,
                                signalsResolved: tenantRun.signalsResolved,
                                coverageRate: tenantRun.coverageRate,
                                signalsArchived: tenantRun.signalsArchived,
                                errors: tenantRun.errors.slice(0, 5).map(diagnosticToMessage),
                            },
                        });
                        result.integrationEventsEmitted++;
                    }

                }

                if (result.integrationEventsEmitted > 0) {
                    logger.info('[Answerlattice Nightly] Integration events emitted', {
                        runLogId,
                        eventsEmitted: result.integrationEventsEmitted,
                        cleanupEvents: result.integrationCleanupEvents,
                        cleanupLogs: result.integrationCleanupLogs,
                    });
                }
            } catch (error) {
                const diagnostic = buildDiagnostic(error, {
                    phase: 'workflow_integrations',
                    operation: 'emit_and_cleanup',
                });
                recordDiagnostic(diagnostic);
                logger.error('[Answerlattice Nightly] Integration fatal error', getSchedulerDiagnosticLogContext(diagnostic));
            }
        }

        result.status = result.errorDetails.length > 0 ? 'partial' : 'success';
    } catch (error) {
        const diagnostic = buildDiagnostic(error, {
            phase: 'fatal',
            operation: 'runAnswerlatticeNightly',
        });
        recordDiagnostic(diagnostic);
        result.status = result.tenantsProcessed > 0 ? 'partial' : 'failed';
        logger.error('[Answerlattice Nightly] Fatal scheduler failure', getSchedulerDiagnosticLogContext(diagnostic));
    } finally {
        result.durationMs = Date.now() - startedAtMs;
        if (result.status === 'running') {
            result.status = result.errorDetails.length > 0 ? 'partial' : 'success';
        }

        await writeRunLog({
            phase: 'completed',
            status: result.status,
            completedAt: Timestamp.now(),
            durationMs: result.durationMs,
        });

        logger.info('[Answerlattice Nightly] Run complete', {
            runLogId,
            status: result.status,
            durationMs: result.durationMs,
            tenantsProcessed: result.tenantsProcessed,
            errorCount: result.errorDetails.length,
        });
    }

    return result;
}
