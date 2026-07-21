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
 * 8. Signal TTL Auto-Archive — delete signals older than 12 months
 * 9. Support Board Sync — create bounded owner review cards and summary
 * 10. Knowledge Intake Summary — refresh compact owner analytics only
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
import {
    deriveAutomatedDriftState,
    evaluateAnswerlatticeAutomatedDrift,
    type AnswerlatticeDriftAnswer,
    type AnswerlatticeDriftEntity,
    type AnswerlatticeDriftSignal,
} from '../sharedData/answerlatticeDrift';
import {
    ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
    ANSWERLATTICE_SUPPORT_METRIC_SOURCE_LIMITS,
    ANSWERLATTICE_SUPPORT_METRIC_WINDOWS,
    calculateAnswerlatticeFrictionLoad,
} from '../sharedData/answerlatticeSupportMetrics';
import { cleanupExpiredIntegrationData } from '../integrations/deliveryLogger';
import { hasEnabledIntegrationAdapter } from '../integrations/configStore';
import { emitIntegrationEvent, resetNightlyEventCounts } from '../integrations/eventBus';
import { COVERAGE_DROP_THRESHOLD, EVENT_SEVERITY, INTEGRATION_EVENT_TYPES } from '../integrations/types';
import {
    bumpAnswerlatticeCacheVersion,
    getAnswerlatticeCacheVersionBumpData,
    getAnswerlatticeCacheVersionDocId,
    ANSWERLATTICE_CACHE_SOURCES,
} from './cacheVersionManifest';
import { syncChatAnalyticsNightly } from './chatAnalyticsAggregation';
import { calculateConfirmedResolutionMetrics } from './confirmedResolution';
import { syncAnswerlatticeChatIntelligence } from './chatIntelligence';
import { repairCompiledContextBundle } from './contextBundleBuilder';
import {
    cleanupAnswerlatticeOperationalRetention,
    getAnswerlatticeRetentionFields,
} from './dataRetention';
import { normalizeAnswerlatticeResolvedFunctionEntityId } from './entityIdBoundary';
import { generateDraftsForNewProposals } from './draftGenerator';
import { appendCompiledContextSourceChange } from './compiledContextVersions';
import { aggregateFrictionStats, cleanupExpiredFrictionStats } from './frictionAggregation';
import { generateFrictionInsight } from './frictionInsight';
import { syncKnowledgeIntakeSummary } from './knowledgeIntakeSummary';
import { expireStaleAnswerlatticeGenerationJobs } from './kbGenerationWatchdog';
import { runOnboardingBootstrap } from './onboardingBootstrap';
import { runPredictiveTriggerSync } from './predictiveTriggerSync';
import { extractTicketKnowledge } from './resolutionExtractor';
import { parseExactAnswerlatticeScope } from './scopeBoundary';
import {
    AnswerlatticeSchedulerReadObserver,
    type AnswerlatticeSchedulerReadWindow,
} from './schedulerReadTelemetry';
import { syncSupportBoardNightly } from './supportBoardSync';
import {
    AnswerlatticeTenantStore,
    readAnswerlatticeTenantSummaryRegistry,
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
    driftWriteAnswersPerBatch: 200,
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
    readWindows?: AnswerlatticeSchedulerReadWindow[];
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
    coverageHits: number;
    coverageTotal: number;
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
    const registry = await readAnswerlatticeTenantSummaryRegistry(db);
    const summaryTenants = registry.tenants;

    if (summaryTenants.length > 0) {
        return {
            tenants: summaryTenants,
            scannedDocs: registry.readDocs,
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
        const scope = parseExactAnswerlatticeScope(data.tId, data.sId);
        if (!scope) {
            continue;
        }
        const key = `${scope.tId}_${scope.sId}`;

        if (!seen.has(key)) {
            seen.add(key);
            tenants.push(scope);
        }
    }

    await upsertAnswerlatticeTenantSummaryEntries(db, tenants, {
        source: 'entity_scan_migration',
        active: true,
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

function timestampToMillis(value: unknown): number {
    if (!value || typeof value !== 'object') return 0;
    const candidate = value as { toMillis?: () => number; seconds?: unknown };
    if (typeof candidate.toMillis === 'function') {
        const millis = candidate.toMillis();
        return Number.isFinite(millis) ? millis : 0;
    }
    const seconds = Number(candidate.seconds);
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1_000 : 0;
}

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
    createdOnMillis: number;
    resolutionSubmittedAtMillis?: number;
    widgetSessionId?: string;
    resolutionOutcome?: 'resolved' | 'not_resolved';
}

interface CoverageKpiResult {
    hits: number;
    misses: number;
    rate: number;
    errors: AnswerlatticeSchedulerDiagnostic[];
    historyRows: AnswerlatticeCoverageHistoryRow[];
    complete: boolean;
    windowStartMillis: number;
    windowEndMillis: number;
}

interface TrustMetricsResult {
    written: boolean;
    coverageRate: number;
    resolutionRate: number;
    driftRate: number;
    entityHealthScore: number;
    entityAnswerCoverageRate: number;
    topFailingEntities: number;
    errors: AnswerlatticeSchedulerDiagnostic[];
}

async function runDriftDetection(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<DriftResult> {
    const result: DriftResult = { answersEvaluated: 0, driftDetected: 0, driftCleared: 0 };

    const answersQuery = db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .limit(SCHEDULER_LIMITS.activeAnswersPerTenant + 1);

    const entitiesQuery = db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(SCHEDULER_LIMITS.entitiesPerTenant + 1);

    const windowStart = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const signalsQuery = db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('timestamp', '>=', windowStart)
        .limit(SCHEDULER_LIMITS.signalEventsPerWindow + 1);

    const [answersSnap, entitiesSnap, signalsSnap] = await Promise.all([
        answersQuery.get(),
        entitiesQuery.get(),
        signalsQuery.get(),
    ]);
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS,
        window: 'active_all',
        documentsReturned: answersSnap.size,
        queryLimit: SCHEDULER_LIMITS.activeAnswersPerTenant + 1,
        saturated: answersSnap.size > SCHEDULER_LIMITS.activeAnswersPerTenant,
    });
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_ENTITIES,
        window: 'all',
        documentsReturned: entitiesSnap.size,
        queryLimit: SCHEDULER_LIMITS.entitiesPerTenant + 1,
        saturated: entitiesSnap.size > SCHEDULER_LIMITS.entitiesPerTenant,
    });
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
        window: 'rolling_14d',
        documentsReturned: signalsSnap.size,
        queryLimit: SCHEDULER_LIMITS.signalEventsPerWindow + 1,
        saturated: signalsSnap.size > SCHEDULER_LIMITS.signalEventsPerWindow,
    });

    if (
        answersSnap.size > SCHEDULER_LIMITS.activeAnswersPerTenant
        || entitiesSnap.size > SCHEDULER_LIMITS.entitiesPerTenant
        || signalsSnap.size > SCHEDULER_LIMITS.signalEventsPerWindow
    ) {
        throw new Error('Answerlattice drift evaluation input exceeded a bounded scheduler limit.');
    }
    if (answersSnap.empty) return result;

    const entitiesById = new Map<string, AnswerlatticeDriftEntity>();
    for (const doc of entitiesSnap.docs) {
        const data = doc.data();
        if (
            data.pId !== 'AL'
            || Number(data.tId) !== tId
            || Number(data.sId) !== sId
            || typeof data.name !== 'string'
            || typeof data.status !== 'string'
        ) {
            throw new Error('Answerlattice drift evaluation found an invalid stored entity.');
        }
        entitiesById.set(doc.id, { id: doc.id, status: data.status, name: data.name });
    }

    const signalsByEntity = new Map<string, AnswerlatticeDriftSignal[]>();
    for (const doc of signalsSnap.docs) {
        const data = doc.data();
        if (data.pId !== 'AL' || Number(data.tId) !== tId || Number(data.sId) !== sId) {
            throw new Error('Answerlattice drift evaluation found an out-of-scope signal.');
        }
        const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);
        const timestampMs = timestampToMillis(data.timestamp);
        if (!entityId || timestampMs <= 0) {
            throw new Error('Answerlattice drift evaluation found an invalid stored signal.');
        }
        if (data.type !== 'ticket' && data.type !== 'chat_negative') continue;
        const events = signalsByEntity.get(entityId) || [];
        events.push({ entityId, type: data.type, timestampMs });
        signalsByEntity.set(entityId, events);
    }

    const storedAnswers = answersSnap.docs.map(document => {
        const answer = document.data();
        const entityIds = normalizeAnswerlatticeFunctionEntityIds(answer.scope?.entityIds);
        const versionFrom = Number(answer.productBinding?.applicableVersions?.from);
        const versionToValue = answer.productBinding?.applicableVersions?.to;
        const versionTo = versionToValue == null ? null : Number(versionToValue);
        const lastValidatedInVersion = Number(answer.productBinding?.lastValidatedInVersion);
        const lastValidatedAtMs = timestampToMillis(answer.validation?.lastValidatedOn);
        if (
            answer.pId !== 'AL'
            || Number(answer.tId) !== tId
            || Number(answer.sId) !== sId
            || answer.status !== 'active'
            || entityIds.length === 0
            || !Number.isSafeInteger(versionFrom)
            || versionFrom <= 0
            || (versionTo !== null && (!Number.isSafeInteger(versionTo) || versionTo < versionFrom))
            || !Number.isSafeInteger(lastValidatedInVersion)
            || lastValidatedInVersion <= 0
            || lastValidatedAtMs <= 0
            || typeof answer.governance?.driftFlag !== 'boolean'
            || typeof answer.governance?.reviewRequired !== 'boolean'
        ) {
            throw new Error('Answerlattice drift evaluation found an invalid stored canonical answer.');
        }
        const primitive: AnswerlatticeDriftAnswer = {
            id: document.id,
            entityIds,
            planIds: normalizeAnswerlatticeFunctionEntityIds(answer.scope?.planIds),
            roleIds: normalizeAnswerlatticeFunctionEntityIds(answer.scope?.roleIds),
            stateIds: normalizeAnswerlatticeFunctionEntityIds(answer.scope?.stateIds),
            versionFrom,
            versionTo,
            lastValidatedInVersion,
            lastValidatedAtMs,
        };
        return { document, answer, primitive };
    }).sort((left, right) => left.primitive.id.localeCompare(right.primitive.id));

    const allAnswers = storedAnswers.map(item => item.primitive);
    const writes = storedAnswers.flatMap(item => {
        const evaluation = evaluateAnswerlatticeAutomatedDrift(
            item.primitive,
            allAnswers,
            entitiesById,
            signalsByEntity,
        );
        const state = deriveAutomatedDriftState(
            item.answer.governance.driftFlag,
            item.answer.governance.driftReason,
            evaluation.driftReasons,
        );
        return state.shouldWrite && state.driftReason ? [{ ...item, state }] : [];
    });
    result.answersEvaluated = storedAnswers.length;

    for (let offset = 0; offset < writes.length; offset += SCHEDULER_LIMITS.driftWriteAnswersPerBatch) {
        const chunk = writes.slice(offset, offset + SCHEDULER_LIMITS.driftWriteAnswersPerBatch);
        const batch = db.batch();
        const now = Timestamp.now();
        for (const item of chunk) {
            batch.update(item.document.ref, {
                'governance.driftFlag': true,
                'governance.driftReason': item.state.driftReason,
                'governance.reviewRequired': true,
                modifiedOn: now,
                modifiedBy: 'system:drift_engine_nightly',
            }, { lastUpdateTime: item.document.updateTime! });
            const auditId = `drift_nightly_${createHash('sha256')
                .update(`${tId}:${sId}:${item.document.id}:${item.state.driftReason}`)
                .digest('hex')
                .slice(0, 40)}`;
            batch.create(db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(auditId), {
                pId: 'AL',
                tId,
                sId,
                action: 'drift_detected',
                entityType: 'canonicalAnswer',
                entityId: item.document.id,
                previousState: {
                    driftFlag: item.answer.governance.driftFlag,
                    driftReason: item.answer.governance.driftReason || null,
                },
                newState: { driftFlag: true, driftReason: item.state.driftReason },
                performedBy: 'system:drift_engine_nightly',
                timestamp: now,
                createdOn: now,
            });
        }
        batch.set(
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_CACHE_VERSIONS)
                .doc(getAnswerlatticeCacheVersionDocId(ANSWERLATTICE_CACHE_SOURCES.CANONICAL, tId, sId)),
            getAnswerlatticeCacheVersionBumpData(
                ANSWERLATTICE_CACHE_SOURCES.CANONICAL,
                tId,
                sId,
                {
                    reason: 'drift_detected',
                    sourceId: `nightly_drift_${offset}`,
                    sourceType: 'canonical_answer',
                },
            ),
            { merge: true },
        );
        appendCompiledContextSourceChange(batch, db, 'canonical', tId, sId, {
            reason: 'drift_detected',
            sourceId: `nightly_drift_${offset}`,
            sourceType: 'canonical_answer',
        });
        await batch.commit();
        result.driftDetected += chunk.length;
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

interface PendingMutationProposalInput {
    tId: number;
    sId: number;
    entityId: string;
    source: string;
    evidenceKey: string;
    proposal: Record<string, any>;
    auditAction: string;
    auditState: Record<string, any>;
    actor: string;
}

async function createPendingMutationProposalIfAbsent(
    input: PendingMutationProposalInput,
): Promise<boolean> {
    const proposalId = `almp_${createHash('sha256')
        .update(`${input.source}:${input.tId}:${input.sId}:${input.entityId}:${input.evidenceKey}`)
        .digest('hex')
        .slice(0, 40)}`;
    const entityRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES).doc(input.entityId);
    const proposalRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS).doc(proposalId);
    const auditRef = db.collection(DB_COLLECTIONS.ANSWERLATTICE_AUDIT_LOGS).doc(`created_${proposalId}`);
    const pendingQuery = db.collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
        .where('tId', '==', input.tId)
        .where('sId', '==', input.sId)
        .where('relatedEntityIds', 'array-contains', input.entityId)
        .where('status', '==', 'pending_review')
        .limit(1);

    return db.runTransaction(async transaction => {
        const [entitySnap, pendingSnap, proposalSnap] = await Promise.all([
            transaction.get(entityRef),
            transaction.get(pendingQuery),
            transaction.get(proposalRef),
        ]);
        const entity = entitySnap.data() || {};
        const entityScope = parseExactAnswerlatticeScope(entity.tId, entity.sId);
        if (
            !entitySnap.exists
            || entity.pId !== 'AL'
            || !entityScope
            || entityScope.tId !== input.tId
            || entityScope.sId !== input.sId
            || entity.status === 'deprecated'
        ) return false;
        if (!pendingSnap.empty || proposalSnap.exists) return false;

        const now = Timestamp.now();
        transaction.create(proposalRef, {
            ...input.proposal,
            pId: 'AL',
            tId: input.tId,
            sId: input.sId,
            relatedEntityIds: [input.entityId],
            status: 'pending_review',
            createdOn: now,
            modifiedOn: now,
            createdBy: input.actor,
            modifiedBy: input.actor,
        });
        transaction.create(auditRef, {
            pId: 'AL',
            tId: input.tId,
            sId: input.sId,
            action: input.auditAction,
            entityType: 'mutationProposal',
            entityId: proposalId,
            previousState: null,
            newState: input.auditState,
            performedBy: input.actor,
            timestamp: now,
        });
        return true;
    });
}

async function runSignalMutation(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<MutationResult> {
    const result: MutationResult = { clustersAnalyzed: 0, proposalsCreated: 0, proposalsSkippedExisting: 0, errors: [] };

    const windowStart = Timestamp.fromMillis(Date.now() - MUTATION_CONFIG.windowDays * 24 * 60 * 60 * 1000);

    const signalsSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('timestamp', '>=', windowStart)
        .orderBy('timestamp', 'desc')
        .limit(SCHEDULER_LIMITS.signalEventsPerWindow + 1)
        .get();
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
        window: 'rolling_14d',
        documentsReturned: signalsSnap.size,
        queryLimit: SCHEDULER_LIMITS.signalEventsPerWindow + 1,
        saturated: signalsSnap.size > SCHEDULER_LIMITS.signalEventsPerWindow,
    });

    if (signalsSnap.empty) return result;
    if (signalsSnap.size > SCHEDULER_LIMITS.signalEventsPerWindow) {
        throw new Error('Answerlattice signal mutation input exceeded a bounded scheduler limit.');
    }

    // Cluster by entityId
    const clusters = new Map<string, { ticket: number; chat_negative: number; escalation: number; total: number; refs: string[] }>();
    for (const doc of signalsSnap.docs) {
        const data = doc.data();
        if (data.pId !== 'AL') continue;
        const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(data.entityId);
        if (!entityId) continue;

        const c = clusters.get(entityId) || { ticket: 0, chat_negative: 0, escalation: 0, total: 0, refs: [] };
        if (data.type === 'ticket') c.ticket++;
        else if (data.type === 'chat_negative') c.chat_negative++;
        else if (data.type === 'escalation') c.escalation++;
        else continue;
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
                .limit(2)
                .get();
            readObserver?.record({
                source: DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS,
                window: 'active_by_entity',
                documentsReturned: answersSnap.size,
                queryLimit: 2,
                saturated: answersSnap.size >= 2,
            });
            const scopedAnswerDocs = answersSnap.docs.filter(document => document.data().pId === 'AL');

            let mutationType: string;
            let targetAnswerId = '';

            if (scopedAnswerDocs.length === 0) {
                mutationType = 'new_answer_required';
            } else if (scopedAnswerDocs.length === 1) {
                targetAnswerId = scopedAnswerDocs[0].id;
                mutationType = 'content_refinement';
            } else {
                // Entity-level signals cannot safely choose between multiple
                // scoped active answers. Keep the signals visible for owner
                // triage instead of proposing an arbitrary mutation.
                result.proposalsSkippedExisting++;
                continue;
            }

            const proposal = {
                targetAnswerId,
                mutationType,
                signalSummary: {
                    ticketCount: cluster.ticket,
                    chatCount: cluster.chat_negative,
                    escalationCount: cluster.escalation,
                    negativeFeedbackRate: cluster.chat_negative / Math.max(cluster.total, 1),
                    exampleReferences: cluster.refs,
                },
                suggestedChange: {
                    reviewReason: `${cluster.total} recent support signals require an owner-reviewed ${mutationType === 'new_answer_required' ? 'answer' : 'refinement'}.`,
                },
                confidenceScore: Math.min(cluster.total / 20, 1.0),
            };

            const created = await createPendingMutationProposalIfAbsent({
                tId,
                sId,
                entityId,
                source: 'signal_cluster',
                evidenceKey: cluster.refs.slice().sort().join(','),
                proposal,
                auditAction: 'mutation_proposal_generated',
                auditState: { mutationType, entityId, signalCount: cluster.total },
                actor: 'system:mutation_engine_nightly',
            });
            if (created) result.proposalsCreated++;
            else result.proposalsSkippedExisting++;
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
async function resolveUnresolvedSignals(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<{ resolved: number; total: number; errors: AnswerlatticeSchedulerDiagnostic[] }> {
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
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
        window: 'rolling_14d_unresolved',
        documentsReturned: unresolvedSnap.size,
        queryLimit: 200,
        saturated: unresolvedSnap.size >= 200,
    });

    if (unresolvedSnap.empty) return result;
    result.total = unresolvedSnap.size;

    // Load entity search index for matching
    const indexSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(SCHEDULER_LIMITS.searchIndexEntriesPerTenant)
        .get();
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_ENTITY_SEARCH_INDEX,
        window: 'all',
        documentsReturned: indexSnap.size,
        queryLimit: SCHEDULER_LIMITS.searchIndexEntriesPerTenant,
        saturated: indexSnap.size >= SCHEDULER_LIMITS.searchIndexEntriesPerTenant,
    });

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

/** Canonical-served share for the latest complete rolling 24-hour window. */
async function aggregateCoverageKPI(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<CoverageKpiResult> {
    const windowEndMillis = Date.now();
    const windowStartMillis = windowEndMillis - 24 * 60 * 60 * 1000;
    const result: CoverageKpiResult = {
        hits: 0,
        misses: 0,
        rate: 0,
        errors: [],
        historyRows: [],
        complete: false,
        windowStartMillis,
        windowEndMillis,
    };

    const dayAgo = Timestamp.fromMillis(windowStartMillis);
    const sourceLimit = ANSWERLATTICE_SUPPORT_METRIC_SOURCE_LIMITS.coverageHistory;

    try {
        const historySnap = await db
            .collection(DB_COLLECTIONS.AI_SEARCH_HISTORY)
            .where('pId', '==', 'AL')
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('createdOn', '>=', dayAgo)
            .orderBy('createdOn', 'desc')
            .limit(sourceLimit + 1)
            .get();
        readObserver?.record({
            source: DB_COLLECTIONS.AI_SEARCH_HISTORY,
            window: 'rolling_24h',
            documentsReturned: historySnap.size,
            queryLimit: sourceLimit + 1,
            saturated: historySnap.size > sourceLimit,
        });

        if (historySnap.size > sourceLimit) {
            throw new Error(`Coverage source exceeded the complete-window limit of ${sourceLimit}.`);
        }

        for (const doc of historySnap.docs) {
            const data = doc.data();
            if (data.pId !== 'AL' || data.tId !== tId || data.sId !== sId) {
                throw new Error('Coverage source contained an invalid Answerlattice scope.');
            }
            result.historyRows.push({
                canonical: data.canonical === true,
                canonicalAnswerId: typeof data.canonicalAnswerId === 'string' ? data.canonicalAnswerId : undefined,
                matchedEntityIds: normalizeAnswerlatticeFunctionEntityIds(data.matchedEntityIds),
                confidence: typeof data.confidence === 'string' ? data.confidence : undefined,
                createdOnMillis: timestampToMillis(data.createdOn),
                resolutionSubmittedAtMillis: timestampToMillis(data.submittedAt) || undefined,
                widgetSessionId: typeof data.widgetSessionId === 'string' && data.widgetSessionId.length <= 120
                    ? data.widgetSessionId
                    : undefined,
                resolutionOutcome: data.resolutionOutcome === 'resolved' || data.resolutionOutcome === 'not_resolved'
                    ? data.resolutionOutcome
                    : undefined,
            });
            if (data.canonical === true) {
                result.hits++;
            } else {
                result.misses++;
            }
        }

        const total = result.hits + result.misses;
        result.rate = total > 0 ? result.hits / total : 0;
        result.complete = true;

        const today = new Date().toISOString().split('T')[0];
        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`coverage_${tId}_${sId}`).set({
            pId: 'AL',
            tId,
            sId,
            schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
            lastUpdated: Timestamp.now(),
            window: {
                kind: ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.ROLLING_24_HOURS,
                startAt: Timestamp.fromMillis(windowStartMillis),
                endAt: Timestamp.fromMillis(windowEndMillis),
                complete: true,
                sourceLimit,
                observedCount: total,
            },
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
            details: { sourceLimit },
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

async function aggregateTrustMetrics(
    tId: number,
    sId: number,
    coverageResult: CoverageKpiResult,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<TrustMetricsResult> {
    const result: TrustMetricsResult = {
        written: false,
        coverageRate: 0,
        resolutionRate: 0,
        driftRate: 0,
        entityHealthScore: 0,
        entityAnswerCoverageRate: 0,
        topFailingEntities: 0,
        errors: [],
    };

    if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS) return result;

    try {
        if (!coverageResult.complete || coverageResult.errors.length > 0) {
            throw new Error('Trust metrics require a complete coverage window.');
        }
        const dayAgo = Timestamp.fromMillis(coverageResult.windowStartMillis);

        const [answersSnap, entitiesSnap, signalsSnap, previousSnap] = await Promise.all([
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'active')
                .limit(SCHEDULER_LIMITS.activeAnswersPerTenant + 1)
                .get(),
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('status', '==', 'active')
                .limit(SCHEDULER_LIMITS.entitiesPerTenant + 1)
                .get(),
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
                .where('pId', '==', 'AL')
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('timestamp', '>=', dayAgo)
                .orderBy('timestamp', 'desc')
                .limit(SCHEDULER_LIMITS.signalEventsPerWindow + 1)
                .get(),
            db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .doc(`trustMetrics_${tId}_${sId}`)
                .get(),
        ]);
        readObserver?.record({
            source: DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS,
            window: 'active_all',
            documentsReturned: answersSnap.size,
            queryLimit: SCHEDULER_LIMITS.activeAnswersPerTenant + 1,
            saturated: answersSnap.size > SCHEDULER_LIMITS.activeAnswersPerTenant,
        });
        readObserver?.record({
            source: DB_COLLECTIONS.ANSWERLATTICE_ENTITIES,
            window: 'active_all',
            documentsReturned: entitiesSnap.size,
            queryLimit: SCHEDULER_LIMITS.entitiesPerTenant + 1,
            saturated: entitiesSnap.size > SCHEDULER_LIMITS.entitiesPerTenant,
        });
        readObserver?.record({
            source: DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
            window: 'rolling_24h',
            documentsReturned: signalsSnap.size,
            queryLimit: SCHEDULER_LIMITS.signalEventsPerWindow + 1,
            saturated: signalsSnap.size > SCHEDULER_LIMITS.signalEventsPerWindow,
        });

        if (
            answersSnap.size > SCHEDULER_LIMITS.activeAnswersPerTenant
            || entitiesSnap.size > SCHEDULER_LIMITS.entitiesPerTenant
            || signalsSnap.size > SCHEDULER_LIMITS.signalEventsPerWindow
        ) {
            throw new Error('Trust metric source exceeded a complete-window limit.');
        }

        const assertSourceScope = (data: Record<string, any>, source: string) => {
            if (data.pId !== 'AL' || data.tId !== tId || data.sId !== sId) {
                throw new Error(`${source} contained an invalid Answerlattice scope.`);
            }
        };
        for (const doc of answersSnap.docs) assertSourceScope(doc.data(), 'Canonical answer source');
        for (const doc of entitiesSnap.docs) assertSourceScope(doc.data(), 'Entity source');
        for (const doc of signalsSnap.docs) assertSourceScope(doc.data(), 'Signal source');

        const activeAnswers = answersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const activeEntities = entitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const previousData = previousSnap.exists ? previousSnap.data() : undefined;
        const previous = previousData?.pId === 'AL'
            && previousData?.tId === tId
            && previousData?.sId === sId
            && previousData?.schemaVersion === ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION
            && previousData?.sourceCompleteness?.complete === true
            ? previousData
            : undefined;

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

        escalationBreakdown.total = escalatedQueries;

        const totalQueries = coverageResult.historyRows.length;
        const resolutionRate = totalQueries > 0
            ? toPercent(Math.max(totalQueries - escalatedQueries, 0), totalQueries)
            : 0;
        result.resolutionRate = resolutionRate;

        const confirmedResolution = calculateConfirmedResolutionMetrics(coverageResult.historyRows, 24);

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

        let coveredEntityCount = 0;
        let driftedCoveredEntityCount = 0;
        const topFailingEntities: Array<{
            entityId: string;
            entityName: string;
            entityType: string;
            queryCount: number;
            escalationCount: number;
            reliabilityScore: number;
            failureScore: number;
            evidenceCount: number;
            negativeFeedbackCount: number;
            canonicalMissCount: number;
            weightedLoad: number;
        }> = [];

        for (const entity of activeEntities) {
            const entityId = entity.id;
            const answerCounts = answerCountsByEntity.get(entityId) || { active: 0, drifted: 0 };
            const signals = signalsByEntity.get(entityId) || { total: 0, ticket: 0, chatNegative: 0, escalation: 0 };
            const misses = missCountByEntity.get(entityId) || 0;
            const totalEntitySignals = signals.total + misses;

            if (answerCounts.active > 0) coveredEntityCount++;
            if (answerCounts.active > 0 && answerCounts.drifted > 0) driftedCoveredEntityCount++;
            const reliabilityFailures = signals.chatNegative + signals.escalation + misses;
            const reliabilityScore = totalEntitySignals > 0
                ? Math.max(0, toPercent(totalEntitySignals - reliabilityFailures, totalEntitySignals))
                : 0;
            const weightedLoad = calculateAnswerlatticeFrictionLoad(
                totalEntitySignals,
                signals.escalation,
                misses,
            );
            if (weightedLoad > 0) {
                topFailingEntities.push({
                    entityId,
                    entityName: entity.name || entityId,
                    entityType: entity.type || 'feature',
                    queryCount: totalEntitySignals,
                    escalationCount: signals.escalation,
                    reliabilityScore,
                    failureScore: weightedLoad,
                    evidenceCount: totalEntitySignals,
                    negativeFeedbackCount: signals.chatNegative,
                    canonicalMissCount: misses,
                    weightedLoad,
                });
            }
        }

        const entityAnswerCoverageRate = toPercent(coveredEntityCount, activeEntities.length);
        result.entityHealthScore = entityAnswerCoverageRate;
        result.entityAnswerCoverageRate = entityAnswerCoverageRate;

        const top5Failing = topFailingEntities
            .sort((a, b) => b.weightedLoad - a.weightedLoad)
            .slice(0, 5);
        result.topFailingEntities = top5Failing.length;

        await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`trustMetrics_${tId}_${sId}`).set({
            pId: 'AL',
            tId,
            sId,
            schemaVersion: ANSWERLATTICE_SUPPORT_METRICS_SCHEMA_VERSION,
            lastUpdated: Timestamp.now(),
            date: new Date().toISOString().split('T')[0],
            window: {
                kind: ANSWERLATTICE_SUPPORT_METRIC_WINDOWS.ROLLING_24_HOURS,
                startAt: Timestamp.fromMillis(coverageResult.windowStartMillis),
                endAt: Timestamp.fromMillis(coverageResult.windowEndMillis),
                complete: true,
                sourceLimit: ANSWERLATTICE_SUPPORT_METRIC_SOURCE_LIMITS.coverageHistory,
                observedCount: coverageTotal,
            },
            sourceCompleteness: {
                complete: true,
                activeAnswers: activeAnswers.length,
                activeEntities: activeEntities.length,
                signalEvents: signalsSnap.size,
                searchHistory: coverageTotal,
            },
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
            nonEscalation: {
                rate: resolutionRate,
                withoutEscalation: Math.max(totalQueries - escalatedQueries, 0),
                escalated: escalatedQueries,
                total: totalQueries,
                previousRate: getPreviousMetric(previous, 'nonEscalation.rate', getPreviousMetric(previous, 'resolution.rate')),
            },
            confirmedResolution: {
                ...confirmedResolution,
                previousRate: getPreviousMetric(previous, 'confirmedResolution.rate'),
            },
            drift: {
                rate: driftRate,
                driftedCount: driftedAnswers.length,
                activeCount: activeAnswers.length,
                previousRate: getPreviousMetric(previous, 'drift.rate'),
            },
            entityHealth: {
                avgScore: entityAnswerCoverageRate,
                healthyCount: Math.max(coveredEntityCount - driftedCoveredEntityCount, 0),
                attentionCount: driftedCoveredEntityCount,
                criticalCount: Math.max(activeEntities.length - coveredEntityCount, 0),
                totalEntities: activeEntities.length,
                previousAvgScore: getPreviousMetric(previous, 'entityAnswerCoverage.rate', getPreviousMetric(previous, 'entityHealth.avgScore')),
            },
            entityAnswerCoverage: {
                rate: entityAnswerCoverageRate,
                coveredCount: coveredEntityCount,
                uncoveredCount: Math.max(activeEntities.length - coveredEntityCount, 0),
                driftedCoveredCount: driftedCoveredEntityCount,
                totalEntities: activeEntities.length,
                previousRate: getPreviousMetric(previous, 'entityAnswerCoverage.rate', getPreviousMetric(previous, 'entityHealth.avgScore')),
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
async function detectRecurringFallbacks(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<{ proposalsCreated: number; errors: AnswerlatticeSchedulerDiagnostic[] }> {
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
        readObserver?.record({
            source: DB_COLLECTIONS.AI_SEARCH_HISTORY,
            window: 'rolling_14d_canonical_misses',
            documentsReturned: historySnap.size,
            queryLimit: 500,
            saturated: historySnap.size >= 500,
        });

        if (historySnap.empty) return result;

        // Group misses by matched entity IDs
        const entityMissCounts = new Map<string, { count: number; refs: string[] }>();
        for (const doc of historySnap.docs) {
            const data = doc.data();
            if (data.pId !== 'AL') continue;
            const entityIds = normalizeAnswerlatticeFunctionEntityIds(data.matchedEntityIds);
            for (const entityId of entityIds) {
                const current = entityMissCounts.get(entityId) || { count: 0, refs: [] };
                current.count++;
                if (current.refs.length < 5) current.refs.push(doc.id);
                entityMissCounts.set(entityId, current);
            }
        }

        // Generate proposals for entities with 5+ misses
        const MIN_MISSES_FOR_PROPOSAL = 5;
        for (const [entityId, misses] of Array.from(entityMissCounts.entries())) {
            const missCount = misses.count;
            if (missCount < MIN_MISSES_FOR_PROPOSAL) continue;

            const answersSnap = await db
                .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
                .where('tId', '==', tId)
                .where('sId', '==', sId)
                .where('scope.entityIds', 'array-contains', entityId)
                .where('status', '==', 'active')
                .limit(2)
                .get();
            readObserver?.record({
                source: DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS,
                window: 'active_by_entity',
                documentsReturned: answersSnap.size,
                queryLimit: 2,
                saturated: answersSnap.size >= 2,
            });
            const scopedAnswerDocs = answersSnap.docs.filter(document => document.data().pId === 'AL');
            if (scopedAnswerDocs.length > 1) continue;
            const mutationType = scopedAnswerDocs.length === 0 ? 'new_answer_required' : 'content_refinement';
            const targetAnswerId = scopedAnswerDocs.length === 0 ? '' : scopedAnswerDocs[0].id;

            const created = await createPendingMutationProposalIfAbsent({
                tId,
                sId,
                entityId,
                source: 'recurring_fallback',
                evidenceKey: misses.refs.slice().sort().join(','),
                proposal: {
                    targetAnswerId,
                    mutationType,
                    signalSummary: {
                        ticketCount: 0,
                        chatCount: missCount,
                        negativeFeedbackRate: 0,
                        exampleReferences: misses.refs,
                    },
                    suggestedChange: {
                        reviewReason: `${missCount} canonical misses in 14 days require an owner-reviewed ${mutationType === 'new_answer_required' ? 'answer' : 'refinement'}.`,
                    },
                    confidenceScore: Math.min(missCount / 20, 1.0),
                },
                auditAction: 'auto_proposal_from_recurring_fallback',
                auditState: { missCount, mutationType, source: 'recurring_fallback_detection' },
                actor: 'system:fallback_detector_nightly',
            });

            if (created) result.proposalsCreated++;

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
const MUTATION_IMPACT_SIGNAL_LIMIT = 200;

async function countMutationImpactSignals(input: {
    tId: number;
    sId: number;
    entityId: string;
    from: Timestamp;
    to: Timestamp;
    readObserver?: AnswerlatticeSchedulerReadObserver;
}): Promise<number> {
    const snapshot = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS)
        .where('tId', '==', input.tId)
        .where('sId', '==', input.sId)
        .where('entityId', '==', input.entityId)
        .where('timestamp', '>=', input.from)
        .where('timestamp', '<', input.to)
        .limit(MUTATION_IMPACT_SIGNAL_LIMIT + 1)
        .get();
    input.readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_SIGNAL_EVENTS,
        window: 'impact_14d_by_entity',
        documentsReturned: snapshot.size,
        queryLimit: MUTATION_IMPACT_SIGNAL_LIMIT + 1,
        saturated: snapshot.size > MUTATION_IMPACT_SIGNAL_LIMIT,
    });
    if (snapshot.size > MUTATION_IMPACT_SIGNAL_LIMIT) {
        throw new Error('Answerlattice mutation impact signal window exceeded a bounded scheduler limit.');
    }
    return snapshot.docs.filter(document => {
        const signal = document.data();
        return signal.pId === 'AL'
            && (signal.type === 'ticket' || signal.type === 'chat_negative' || signal.type === 'escalation');
    }).length;
}

async function trackMutationImpact(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<{ tracked: number; errors: AnswerlatticeSchedulerDiagnostic[] }> {
    const result: { tracked: number; errors: AnswerlatticeSchedulerDiagnostic[] } = { tracked: 0, errors: [] };

    const fourteenDaysAgo = Timestamp.fromMillis(Date.now() - 14 * 24 * 60 * 60 * 1000);

    try {
        // Find implemented proposals without impact tracking
        const proposalsSnap = await db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS)
            .where('tId', '==', tId)
            .where('sId', '==', sId)
            .where('status', '==', 'implemented')
            .where('impactTracked', '==', false)
            .where('implementedOn', '<=', fourteenDaysAgo)
            .orderBy('implementedOn', 'asc')
            .limit(50)
            .get();
        readObserver?.record({
            source: DB_COLLECTIONS.ANSWERLATTICE_MUTATION_PROPOSALS,
            window: 'implemented_untracked',
            documentsReturned: proposalsSnap.size,
            queryLimit: 50,
            saturated: proposalsSnap.size >= 50,
        });

        for (const proposalDoc of proposalsSnap.docs) {
            const proposal = proposalDoc.data();
            if (proposal.pId !== 'AL') continue;

            // Skip if already tracked or not old enough
            const implementedAt = proposal.implementedOn;
            const implementedAtMillis = timestampToMillis(implementedAt);
            if (implementedAtMillis <= 0 || implementedAtMillis > fourteenDaysAgo.toMillis()) continue;

            // Count post-implementation signals for related entity
            const entityId = normalizeAnswerlatticeResolvedFunctionEntityId(proposal.relatedEntityIds?.[0]);
            if (!entityId) continue;

            try {
                const windowMillis = 14 * 24 * 60 * 60 * 1000;
                const [preSignalCount, postSignalCount] = await Promise.all([
                    countMutationImpactSignals({
                        tId,
                        sId,
                        entityId,
                        from: Timestamp.fromMillis(implementedAtMillis - windowMillis),
                        to: implementedAt,
                        readObserver,
                    }),
                    countMutationImpactSignals({
                        tId,
                        sId,
                        entityId,
                        from: implementedAt,
                        to: Timestamp.fromMillis(implementedAtMillis + windowMillis),
                        readObserver,
                    }),
                ]);
                const rawImprovement = preSignalCount > 0
                    ? Math.round((1 - postSignalCount / preSignalCount) * 100)
                    : 0;

                await proposalDoc.ref.update({
                    impactTracked: true,
                    impactResult: {
                        preSignalCount,
                        postSignalCount,
                        improvementPercent: Math.max(-10_000, Math.min(100, rawImprovement)),
                        trackedAt: Timestamp.now(),
                    },
                });

                result.tracked++;
            } catch (error) {
                result.errors.push(buildDiagnostic(error, {
                    tId,
                    sId,
                    phase: 'mutation_impact',
                    operation: 'compare_signal_windows',
                    details: {
                        proposalIdPresent: Boolean(proposalDoc.id),
                        proposalIdLength: proposalDoc.id.length,
                    },
                }));
            }
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
async function rebuildEntityGraphIndex(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<GraphRebuildResult> {
    const result: GraphRebuildResult = { rebuilt: false, entityCount: 0, relationCount: 0, orphanRelations: 0 };

    // 1. Load active entities
    const entitiesSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITIES)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .limit(SCHEDULER_LIMITS.entitiesPerTenant + 1)
        .get();
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_ENTITIES,
        window: 'active_all',
        documentsReturned: entitiesSnap.size,
        queryLimit: SCHEDULER_LIMITS.entitiesPerTenant + 1,
        saturated: entitiesSnap.size > SCHEDULER_LIMITS.entitiesPerTenant,
    });

    if (entitiesSnap.empty) return result;
    if (entitiesSnap.size > SCHEDULER_LIMITS.entitiesPerTenant) {
        throw new Error('Answerlattice graph entity limit exceeded; existing graph index was preserved.');
    }

    const entityMap = new Map<string, { name: string; type: string }>();
    for (const doc of entitiesSnap.docs) {
        const data = doc.data();
        if (data.pId !== 'AL' || data.tId !== tId || data.sId !== sId) {
            throw new Error('Answerlattice graph entity scope is invalid; existing graph index was preserved.');
        }
        entityMap.set(doc.id, { name: data.name, type: data.type });
    }
    result.entityCount = entityMap.size;

    // 2. Load all relations
    const relationsSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .limit(SCHEDULER_LIMITS.graphRelationsPerTenant + 1)
        .get();
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_ENTITY_RELATIONS,
        window: 'all',
        documentsReturned: relationsSnap.size,
        queryLimit: SCHEDULER_LIMITS.graphRelationsPerTenant + 1,
        saturated: relationsSnap.size > SCHEDULER_LIMITS.graphRelationsPerTenant,
    });

    if (relationsSnap.size > SCHEDULER_LIMITS.graphRelationsPerTenant) {
        throw new Error('Answerlattice graph relation limit exceeded; existing graph index was preserved.');
    }

    result.relationCount = relationsSnap.size;

    // 3. Count active canonical answers per entity
    const answersSnap = await db
        .collection(DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .where('status', '==', 'active')
        .limit(SCHEDULER_LIMITS.graphAnswersPerTenant + 1)
        .get();
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_CANONICAL_ANSWERS,
        window: 'active_all',
        documentsReturned: answersSnap.size,
        queryLimit: SCHEDULER_LIMITS.graphAnswersPerTenant + 1,
        saturated: answersSnap.size > SCHEDULER_LIMITS.graphAnswersPerTenant,
    });

    if (answersSnap.size > SCHEDULER_LIMITS.graphAnswersPerTenant) {
        throw new Error('Answerlattice graph answer limit exceeded; existing graph index was preserved.');
    }

    const answerCountByEntity = new Map<string, number>();
    for (const doc of answersSnap.docs) {
        const data = doc.data();
        if (data.pId !== 'AL' || data.tId !== tId || data.sId !== sId) {
            throw new Error('Answerlattice graph answer scope is invalid; existing graph index was preserved.');
        }
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
        if (rel.pId !== 'AL' || rel.tId !== tId || rel.sId !== sId) {
            throw new Error('Answerlattice graph relation scope is invalid; existing graph index was preserved.');
        }
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
        || existingData.tId !== tId
        || existingData.sId !== sId
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
    /** Deprecated compatibility field. Remains zero after the unsafe usage proxy was retired. */
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
    kbGenerationJobsScanned: number;
    kbGenerationJobsTimedOut: number;
    kbGenerationJobsSkippedInvalidScope: number;
    // Daily owner conversation summaries
    chatAnalyticsChangedSessionsScanned: number;
    chatAnalyticsDatesProcessed: number;
    chatAnalyticsSummariesWritten: number;
    chatAnalyticsPartialDates: number;
    // Step 18: Predictive Trigger Sync (Expansion Item #12)
    predictiveSuggestionsGenerated: number;
    predictiveTriggersTotal: number;
    predictiveEffectivenessUpdated: number;
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
    retentionContentFeedbackDeleted: number;
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
        kbGenerationJobsScanned: 0,
        kbGenerationJobsTimedOut: 0,
        kbGenerationJobsSkippedInvalidScope: 0,
        chatAnalyticsChangedSessionsScanned: 0,
        chatAnalyticsDatesProcessed: 0,
        chatAnalyticsSummariesWritten: 0,
        chatAnalyticsPartialDates: 0,
        predictiveSuggestionsGenerated: 0,
        predictiveTriggersTotal: 0,
        predictiveEffectivenessUpdated: 0,
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
        retentionContentFeedbackDeleted: 0,
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
                    kbGenerationJobsScanned: result.kbGenerationJobsScanned,
                    kbGenerationJobsTimedOut: result.kbGenerationJobsTimedOut,
                    kbGenerationJobsSkippedInvalidScope: result.kbGenerationJobsSkippedInvalidScope,
                    chatAnalyticsChangedSessionsScanned: result.chatAnalyticsChangedSessionsScanned,
                    chatAnalyticsDatesProcessed: result.chatAnalyticsDatesProcessed,
                    chatAnalyticsSummariesWritten: result.chatAnalyticsSummariesWritten,
                    chatAnalyticsPartialDates: result.chatAnalyticsPartialDates,
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
                    retentionContentFeedbackDeleted: result.retentionContentFeedbackDeleted,
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
                    chatAnalyticsEnabled: FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_CHAT_ANALYTICS,
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
        task: (readObserver: AnswerlatticeSchedulerReadObserver) => Promise<T>,
        applyResult: (taskResult: T) => void,
        buildDetails: (taskResult: T) => Record<string, any>
    ): Promise<T | null> => {
        const taskStart = Date.now();
        const errorCountBefore = tenantRun.errors.length;
        const readObserver = new AnswerlatticeSchedulerReadObserver();

        try {
            const taskResult = await task(readObserver);
            const taskErrors = Array.isArray(taskResult.errors)
                ? (taskResult.errors.filter((entry: any) => entry && typeof entry === 'object' && entry.phase && entry.operation) as AnswerlatticeSchedulerDiagnostic[])
                : [];
            for (const diagnostic of taskErrors) {
                recordDiagnostic(diagnostic, tenantRun);
            }

            applyResult(taskResult);
            const newErrorCount = tenantRun.errors.length - errorCountBefore;
            const readWindows = readObserver.snapshot();
            tenantRun.tasks.push({
                name: taskName,
                status: newErrorCount > 0 ? 'failed' : 'success',
                durationMs: Date.now() - taskStart,
                details: buildDetails(taskResult),
                ...(readWindows.length > 0 ? { readWindows } : {}),
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
            const readWindows = readObserver.snapshot();
            tenantRun.tasks.push({
                name: taskName,
                status: 'failed',
                durationMs: Date.now() - taskStart,
                ...(readWindows.length > 0 ? { readWindows } : {}),
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

        try {
            const watchdog = await expireStaleAnswerlatticeGenerationJobs();
            result.kbGenerationJobsScanned = watchdog.scanned;
            result.kbGenerationJobsTimedOut = watchdog.timedOut;
            result.kbGenerationJobsSkippedInvalidScope = watchdog.skippedInvalidScope;
        } catch (error) {
            const diagnostic = buildDiagnostic(error, {
                phase: 'kb_generation_watchdog',
                operation: 'expire_stale_answerlattice_generation_jobs',
            });
            recordDiagnostic(diagnostic);
            logger.error('[Answerlattice Nightly] KB generation watchdog failed', getSchedulerDiagnosticLogContext(diagnostic));
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
                coverageHits: 0,
                coverageTotal: 0,
                signalsArchived: 0,
            };

            const driftResult = await runTenantTask(
                tenantRun,
                'drift_detection',
                'runDriftDetection',
                (readObserver) => runDriftDetection(tId, sId, readObserver),
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
                (readObserver) => resolveUnresolvedSignals(tId, sId, readObserver),
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
                (readObserver) => runSignalMutation(tId, sId, readObserver),
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
                (readObserver) => aggregateCoverageKPI(tId, sId, readObserver),
                (_taskResult) => { },
                (taskResult) => ({
                    hits: taskResult.hits,
                    misses: taskResult.misses,
                    rate: Math.round(taskResult.rate * 100),
                    complete: taskResult.complete,
                })
            );
            if (coverageResult?.complete && coverageResult.errors.length === 0) {
                tenantRun.coverageRate = coverageResult.rate;
                tenantRun.coverageHits = coverageResult.hits;
                tenantRun.coverageTotal = coverageResult.hits + coverageResult.misses;
            }

            if (
                FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS
                && coverageResult?.complete
                && coverageResult.errors.length === 0
            ) {
                await runTenantTask(
                    tenantRun,
                    'trust_metrics',
                    'aggregateTrustMetrics',
                    (readObserver) => aggregateTrustMetrics(tId, sId, coverageResult, readObserver) as Promise<any>,
                    (taskResult) => {
                        if (taskResult.written) result.totalTrustMetricsWritten++;
                    },
                    (taskResult) => ({
                        written: taskResult.written,
                        coverageRate: taskResult.coverageRate,
                        resolutionRate: taskResult.resolutionRate,
                        driftRate: taskResult.driftRate,
                        entityAnswerCoverageRate: taskResult.entityAnswerCoverageRate,
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
                        reason: !FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS
                            ? 'feature_flag_off'
                            : 'coverage_incomplete',
                    },
                });
            }

            const fallbackResult = await runTenantTask(
                tenantRun,
                'recurring_fallback_detection',
                'detectRecurringFallbacks',
                (readObserver) => detectRecurringFallbacks(tId, sId, readObserver),
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
                (readObserver) => trackMutationImpact(tId, sId, readObserver),
                (taskResult) => { result.totalImpactTracked += taskResult.tracked; },
                (taskResult) => ({ tracked: taskResult.tracked })
            );

            tenantRun.tasks.push({
                name: 'confidence_adjustment',
                status: 'skipped',
                durationMs: 0,
                details: {
                    adjusted: 0,
                    reason: 'unsafe_usage_proxy_retired',
                },
            });

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
                (readObserver) => aggregateFrictionStats(tId, sId, readObserver) as Promise<any>,
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
                    (readObserver) => rebuildEntityGraphIndex(tId, sId, readObserver) as Promise<any>,
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
                    (readObserver) => syncSupportBoardNightly(tId, sId, readObserver) as Promise<any>,
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
                        sourceWindowsSaturated: taskResult.sourceWindowsSaturated,
                        breakdownFresh: taskResult.breakdownFresh,
                    })
                );
            }

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE_SCHEDULER) {
                await runTenantTask(
                    tenantRun,
                    'knowledge_intake_summary',
                    'syncKnowledgeIntakeSummary',
                    (readObserver) => syncKnowledgeIntakeSummary(tId, sId, readObserver) as Promise<any>,
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
                        lastJobStatus: taskResult.lastJobStatus,
                    })
                );
            }

            if (FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_CHAT_ANALYTICS) {
                const chatAnalyticsResult = await runTenantTask(
                    tenantRun,
                    'chat_analytics_summary',
                    'syncChatAnalyticsNightly',
                    (readObserver) => syncChatAnalyticsNightly(tId, sId, readObserver) as Promise<any>,
                    (taskResult) => {
                        result.chatAnalyticsChangedSessionsScanned += taskResult.changedSessionsScanned;
                        result.chatAnalyticsDatesProcessed += taskResult.datesProcessed;
                        result.chatAnalyticsSummariesWritten += taskResult.summariesWritten;
                        result.chatAnalyticsPartialDates += taskResult.partialDates;
                    },
                    (taskResult) => ({
                        changedSessionsScanned: taskResult.changedSessionsScanned,
                        datesProcessed: taskResult.datesProcessed,
                        summariesWritten: taskResult.summariesWritten,
                        summariesSkipped: taskResult.summariesSkipped,
                        partialDates: taskResult.partialDates,
                        continuationPending: taskResult.continuationPending,
                    })
                );
                if (chatAnalyticsResult && (chatAnalyticsResult.summariesWritten > 0 || dayOfWeek === 0)) {
                    await runTenantTask(
                        tenantRun,
                        'chat_intelligence',
                        'syncAnswerlatticeChatIntelligence',
                        () => syncAnswerlatticeChatIntelligence(tId, sId, {
                            generateWeekly: dayOfWeek === 0,
                        }) as Promise<any>,
                        () => { },
                        (taskResult) => ({
                            daysRead: taskResult.daysRead,
                            feedbackWritten: taskResult.feedbackWritten,
                            weeklyWritten: taskResult.weeklyWritten,
                            generationMode: 'deterministic',
                        }),
                    );
                } else {
                    tenantRun.tasks.push({
                        name: 'chat_intelligence',
                        status: 'skipped',
                        durationMs: 0,
                        details: {
                            reason: chatAnalyticsResult ? 'source_unchanged' : 'chat_analytics_unavailable',
                        },
                    });
                }
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
                    },
                    (taskResult) => ({
                        suggestionsGenerated: taskResult.suggestionsGenerated,
                        cacheRebuilt: taskResult.cacheRebuilt,
                        triggerCount: taskResult.triggerCount,
                        effectivenessUpdated: taskResult.effectivenessUpdated,
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
                coverage: coverageResult?.complete && coverageResult.errors.length === 0
                    ? Math.round(coverageResult.rate * 100)
                    : null,
                signalRetention: 'firestore_ttl',
                drafts: draftResult ? `${draftResult.draftsGenerated}/${draftResult.draftsGenerated + draftResult.draftsFailed}` : 'failed',
                friction: frictionResult ? `${frictionResult.entitiesProcessed}/${frictionResult.overallHealth}` : 'failed',
                cleanup: frictionCleanup?.cleaned || 0,
                errorCount: tenantRun.errors.length,
            });
        }

        const coverageRuns = result.tenantRuns.filter(run => run.coverageTotal > 0);
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
            result.retentionContentFeedbackDeleted += retentionResult.contentFeedbackDeleted;
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
                contentFeedbackDeleted: retentionResult.contentFeedbackDeleted,
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
                        const emitted = await emitIntegrationEvent({
                            tId, sId,
                            eventType: INTEGRATION_EVENT_TYPES.COVERAGE_DROP,
                            severity: EVENT_SEVERITY.CRITICAL,
                            deduplicationKey: `${runLogId}:coverage_drop`,
                            payload: {
                                runLogId,
                                currentRate: tenantRun.coverageRate,
                                previousRate: 0,
                                threshold: COVERAGE_DROP_THRESHOLD,
                                totalQueries: tenantRun.coverageTotal,
                                canonicalHits: tenantRun.coverageHits,
                            },
                        });
                        if (emitted) result.integrationEventsEmitted++;
                    }

                    const aiFailureSummary = getRecurringAiFailureSummary(tenantRun);
                    if (aiFailureSummary.failureCount >= AI_FAILURE_ALERT_THRESHOLD) {
                        const emitted = await emitIntegrationEvent({
                            tId, sId,
                            eventType: INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING,
                            severity: aiFailureSummary.failureCount >= AI_FAILURE_ALERT_THRESHOLD * 2
                                ? EVENT_SEVERITY.CRITICAL
                                : EVENT_SEVERITY.HIGH,
                            deduplicationKey: `${runLogId}:ai_failure_recurring`,
                            payload: {
                                runLogId,
                                entityName: 'Workspace AI operations',
                                entityType: 'support_generation',
                                failureCount: aiFailureSummary.failureCount,
                                windowDays: AI_FAILURE_WINDOW_DAYS,
                                failurePhases: aiFailureSummary.phases,
                                errors: aiFailureSummary.errors,
                            },
                        });
                        if (emitted) result.integrationEventsEmitted++;
                    }

                    if (shouldSendTenantDigest) {
                        const emitted = await emitIntegrationEvent({
                            tId, sId,
                            eventType: INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY,
                            severity: tenantRun.coverageRate > 0 && tenantRun.coverageRate < COVERAGE_DROP_THRESHOLD
                                ? EVENT_SEVERITY.HIGH
                                : EVENT_SEVERITY.LOW,
                            deduplicationKey: `${runLogId}:nightly_summary`,
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
                        if (emitted) result.integrationEventsEmitted++;
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
