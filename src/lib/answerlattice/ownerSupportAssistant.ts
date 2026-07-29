import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/routes';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    parseAnswerlatticeCoverageData,
    parseAnswerlatticeFrictionSnapshot,
    parseAnswerlatticeTrustMetrics,
} from '@lib/answerlattice/analyticsIntelligenceContracts';
import { isAnswerlatticeActivationSummaryResponse } from '@lib/answerlattice/activationDashboardResponseClient';
import { parseAnswerlatticeKnowledgeIntakeSummary } from '@lib/answerlattice/knowledgeIntakeContracts';
import {
    ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS,
    type AnswerlatticeFounderDailyAction,
    type AnswerlatticeFounderDailyBrief,
    type AnswerlatticeLaunchVerification,
    type AnswerlatticeOwnerAssistantAnswer,
    type AnswerlatticeOwnerAssistantBrief,
    type AnswerlatticeOwnerAssistantCapabilities,
    type AnswerlatticeOwnerAssistantPermissionMap,
    type AnswerlatticeOwnerAssistantSourceHealth,
    type AnswerlatticeOwnerAssistantSourceKey,
    type AnswerlatticeOwnerAssistantStatus,
    type AnswerlatticeOwnerAssistantSummaryHealth,
    buildAnswerlatticeOwnerAssistantCapabilities,
    canUseAnswerlatticeOwnerAssistantRoute,
    getAnswerlatticeOwnerAssistantStatus,
    isAnswerlatticeOwnerAssistantRoute,
    parseAnswerlatticeOwnerAssistantSupportBoardSummary,
} from '@lib/answerlattice/ownerSupportAssistantContracts';
import {
    normalizeAnswerlatticeOwnerAssistantCount,
    normalizeAnswerlatticeOwnerAssistantTimestamp,
} from '@lib/answerlattice/ownerSupportAssistantNormalization';
import { getAnswerlatticeEntityContextRoute } from '@lib/answerlattice/ownerDecisionNavigation';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { createRuntimeId } from '@lib/runtime/randomId';
import type {
    AnswerlatticeActivationSummary,
    AnswerlatticeKnowledgeIntakeSummary,
    AnswerlatticeSupportBoardSummary,
} from '@type/answerlattice';
import { z } from 'zod';

export const AnswerlatticeOwnerAssistantQuerySchema = z.object({
    question: z.string().trim().min(3).max(500),
}).strict();

export type {
    AnswerlatticeFounderDailyAction,
    AnswerlatticeFounderDailyActionCategory,
    AnswerlatticeFounderDailyActionSeverity,
    AnswerlatticeFounderDailyBrief,
    AnswerlatticeLaunchVerification,
    AnswerlatticeOwnerAssistantAnswer,
    AnswerlatticeOwnerAssistantBrief,
    AnswerlatticeOwnerAssistantEvidence,
    AnswerlatticeOwnerAssistantStatus,
} from '@lib/answerlattice/ownerSupportAssistantContracts';

type SummaryPacketValue = {
    coverage: ReturnType<typeof parseAnswerlatticeCoverageData>;
    trust: ReturnType<typeof parseAnswerlatticeTrustMetrics>;
    board: AnswerlatticeSupportBoardSummary | null;
    friction: ReturnType<typeof parseAnswerlatticeFrictionSnapshot>;
    intake: AnswerlatticeKnowledgeIntakeSummary | null;
    activation: AnswerlatticeActivationSummary | null;
    summaryHealth: AnswerlatticeOwnerAssistantSummaryHealth;
};

type SummaryPacket = SummaryPacketValue & {
    cacheHit: boolean;
};

const SUMMARY_CACHE_TTL_MS = 60_000;
const SUMMARY_CACHE_MAX_ENTRIES = 300;
const SCHEDULED_SUMMARY_STALE_AFTER_MS = 48 * 60 * 60 * 1_000;
const SUMMARY_TIMESTAMP_FUTURE_TOLERANCE_MS = 5 * 60 * 1_000;
const summaryCache = new Map<string, { expiresAt: number; value: SummaryPacketValue }>();

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeLaunchRoute = (value: unknown): string => {
    const route = typeof value === 'string' ? value.trim() : '';
    return route.startsWith('/answerlattice/') && !route.startsWith('//')
        ? route.slice(0, 240)
        : ANSWERLATTICE_ROUTES.ACTIVATION;
};

const buildLaunchVerification = (
    activation: AnswerlatticeActivationSummary | null,
    canViewLaunchVerification: boolean,
): AnswerlatticeLaunchVerification => {
    if (!canViewLaunchVerification) {
        return {
            available: false,
            ready: false,
            completeCount: 0,
            totalCount: 0,
            blockers: [],
            nextActionLabel: null,
            nextActionRoute: ANSWERLATTICE_ROUTES.ACTIVATION,
            verifiedAt: null,
        };
    }

    const launchProof = isRecord(activation?.launchProof) ? activation.launchProof : null;
    if (!launchProof) {
        return {
            available: false,
            ready: false,
            completeCount: 0,
            totalCount: 0,
            blockers: [],
            nextActionLabel: null,
            nextActionRoute: ANSWERLATTICE_ROUTES.ACTIVATION,
            verifiedAt: null,
        };
    }

    const blockers = Array.isArray(launchProof.blockers)
        ? launchProof.blockers
            .flatMap((value: unknown) => typeof value === 'string' ? [value.trim().slice(0, 120)] : [])
            .filter(Boolean)
            .slice(0, 6)
        : [];
    const completeCount = normalizeAnswerlatticeOwnerAssistantCount(launchProof.completeCount, 20);
    const totalCount = normalizeAnswerlatticeOwnerAssistantCount(launchProof.totalCount, 20);
    const currentPriorityProofReady = Array.isArray(launchProof.items)
        && launchProof.items.slice(0, 20).some((item: unknown) => (
            isRecord(item)
            && item.key === 'priority-answer-checks'
            && item.status === 'complete'
        ));
    const proofShapeValid = totalCount > 0 && completeCount <= totalCount;
    const nextItem = Array.isArray(launchProof.items)
        ? launchProof.items.slice(0, 20).find((item: unknown) => isRecord(item) && item.status !== 'complete')
        : null;

    return {
        available: proofShapeValid,
        ready: proofShapeValid
            && launchProof.ready === true
            && completeCount === totalCount
            && blockers.length === 0
            && currentPriorityProofReady,
        completeCount,
        totalCount,
        blockers,
        nextActionLabel: isRecord(nextItem) && typeof nextItem.actionLabel === 'string'
            ? nextItem.actionLabel.trim().slice(0, 80) || null
            : null,
        nextActionRoute: isRecord(nextItem)
            ? normalizeLaunchRoute(nextItem.route)
            : ANSWERLATTICE_ROUTES.ACTIVATION,
        verifiedAt: normalizeAnswerlatticeOwnerAssistantTimestamp(activation?.computedAtIso),
    };
};

const parseKnowledgeIntakeSummary = (
    value: unknown,
    documentId: string,
    tId: number,
    sId: number,
): AnswerlatticeKnowledgeIntakeSummary | null => {
    if (
        !isRecord(value)
        || value.pId !== PRODUCT_IDS.ANSWERLATTICE
        || value.tId !== tId
        || value.sId !== sId
    ) return null;
    try {
        const parsed = parseAnswerlatticeKnowledgeIntakeSummary(value, documentId);
        return parsed.pId === PRODUCT_IDS.ANSWERLATTICE
            && parsed.tId === tId
            && parsed.sId === sId
            ? parsed
            : null;
    } catch {
        return null;
    }
};

const parseActivationSummary = (
    value: unknown,
    tId: number,
    sId: number,
): AnswerlatticeActivationSummary | null => {
    const response = { summary: value };
    if (
        !isAnswerlatticeActivationSummaryResponse(response)
        || response.summary.pId !== PRODUCT_IDS.ANSWERLATTICE
        || response.summary.tId !== tId
        || response.summary.sId !== sId
    ) return null;
    return response.summary;
};

const SOURCE_LABELS: Record<AnswerlatticeOwnerAssistantSourceKey, string> = {
    coverage: 'Coverage',
    trust: 'Answer evidence',
    support_board: 'Support Board',
    friction: 'Support friction',
    knowledge_intake: 'Knowledge Intake',
    activation: 'Activation',
};

const buildSummaryHealth = (
    sources: AnswerlatticeOwnerAssistantSourceHealth[],
): AnswerlatticeOwnerAssistantSummaryHealth => {
    const timestamps = sources
        .flatMap(source => source.updatedAt ? [source.updatedAt] : [])
        .sort();
    const unavailableSources = sources
        .filter(source => source.state === 'missing' || source.state === 'invalid')
        .map(source => source.label);
    const staleSources = sources
        .filter(source => source.state === 'stale')
        .map(source => source.label);
    const admittedCount = sources.filter(source => (
        source.state === 'available' || source.state === 'stale'
    )).length;
    const currentCount = sources.filter(source => source.state === 'available').length;
    return {
        expectedCount: ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length,
        admittedCount,
        currentCount,
        complete: currentCount === ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length
            && unavailableSources.length === 0
            && staleSources.length === 0,
        unavailableSources,
        staleSources,
        oldestUpdatedAt: timestamps[0] || null,
        newestUpdatedAt: timestamps[timestamps.length - 1] || null,
        sources,
    };
};

const getSourceHealth = (
    key: AnswerlatticeOwnerAssistantSourceKey,
    snapshotExists: boolean,
    admitted: unknown,
    updatedAt: string | null,
    scheduled: boolean,
    nowMs: number,
): AnswerlatticeOwnerAssistantSourceHealth => {
    let state: AnswerlatticeOwnerAssistantSourceHealth['state'] = 'available';
    if (!snapshotExists) state = 'missing';
    else if (!admitted || (updatedAt && Date.parse(updatedAt) > nowMs + SUMMARY_TIMESTAMP_FUTURE_TOLERANCE_MS)) {
        state = 'invalid';
    } else if (
        scheduled
        && updatedAt
        && nowMs - Date.parse(updatedAt) > SCHEDULED_SUMMARY_STALE_AFTER_MS
    ) {
        state = 'stale';
    }
    return {
        key,
        label: SOURCE_LABELS[key],
        state,
        updatedAt: admitted ? updatedAt : null,
    };
};

const loadSummaryPacket = async (tId: number, sId: number): Promise<SummaryPacket> => {
    const key = `${tId}:${sId}`;
    const cached = summaryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return { ...cached.value, cacheHit: true };
    if (cached) summaryCache.delete(key);

    const db = answerlatticeFirestoreAdmin;
    const refs = [
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`coverage_${tId}_${sId}`),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`trustMetrics_${tId}_${sId}`),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`supportBoardSummary_${tId}_${sId}`),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`frictionSnapshot_${tId}_${sId}`),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`knowledgeIntakeSummary_${tId}_${sId}`),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`activation_${tId}_${sId}`),
    ];
    const snapshots = await db.getAll(...refs);
    const scope = { tenantId: tId, storeId: sId };
    const coverage = snapshots[0]?.exists
        ? parseAnswerlatticeCoverageData(snapshots[0].data(), scope)
        : null;
    const trust = snapshots[1]?.exists
        ? parseAnswerlatticeTrustMetrics(snapshots[1].data(), scope)
        : null;
    const board = snapshots[2]?.exists
        ? parseAnswerlatticeOwnerAssistantSupportBoardSummary(
            snapshots[2].data(),
            { tenantId: tId, storeId: sId },
        )
        : null;
    const friction = snapshots[3]?.exists
        ? parseAnswerlatticeFrictionSnapshot(snapshots[3].data(), scope)
        : null;
    const intakeDocumentId = `knowledgeIntakeSummary_${tId}_${sId}`;
    const intake = snapshots[4]?.exists
        ? parseKnowledgeIntakeSummary(snapshots[4].data(), intakeDocumentId, tId, sId)
        : null;
    const activation = snapshots[5]?.exists
        ? parseActivationSummary(snapshots[5].data(), tId, sId)
        : null;
    const nowMs = Date.now();
    const sourceHealth = [
        getSourceHealth('coverage', snapshots[0]?.exists === true, coverage, normalizeAnswerlatticeOwnerAssistantTimestamp(coverage?.lastUpdated), true, nowMs),
        getSourceHealth('trust', snapshots[1]?.exists === true, trust, normalizeAnswerlatticeOwnerAssistantTimestamp(trust?.lastUpdated), true, nowMs),
        getSourceHealth('support_board', snapshots[2]?.exists === true, board, normalizeAnswerlatticeOwnerAssistantTimestamp(board?.lastUpdated), false, nowMs),
        getSourceHealth('friction', snapshots[3]?.exists === true, friction, normalizeAnswerlatticeOwnerAssistantTimestamp(friction?.lastUpdated), true, nowMs),
        getSourceHealth('knowledge_intake', snapshots[4]?.exists === true, intake, normalizeAnswerlatticeOwnerAssistantTimestamp(intake?.lastUpdated), false, nowMs),
        getSourceHealth('activation', snapshots[5]?.exists === true, activation, activation?.computedAtIso || null, false, nowMs),
    ];
    const value = {
        coverage,
        trust,
        board,
        friction,
        intake,
        activation,
        summaryHealth: buildSummaryHealth(sourceHealth),
    };
    if (summaryCache.size >= SUMMARY_CACHE_MAX_ENTRIES) {
        const firstKey = summaryCache.keys().next().value;
        if (firstKey) summaryCache.delete(firstKey);
    }
    summaryCache.set(key, { value, expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS });
    return { ...value, cacheHit: false };
};

const buildMetrics = (packet: SummaryPacket): AnswerlatticeOwnerAssistantBrief['metrics'] => ({
    coverageRate: packet.trust && packet.trust.coverage.total > 0
        ? packet.trust.coverage.rate
        : packet.coverage && packet.coverage.coverage.total > 0
            ? packet.coverage.coverage.rate
            : null,
    canonicalMisses: normalizeAnswerlatticeOwnerAssistantCount(
        packet.trust?.coverage?.misses ?? packet.coverage?.coverage?.misses,
    ),
    noEscalationRate: packet.trust && packet.trust.nonEscalation.total > 0
        ? packet.trust.nonEscalation.rate
        : null,
    confirmedResolutionRate: (packet.trust?.confirmedResolution?.explicitOutcomeTotal || 0) > 0
        ? packet.trust?.confirmedResolution?.rate ?? null
        : null,
    recontactEligible: normalizeAnswerlatticeOwnerAssistantCount(packet.trust?.confirmedResolution?.recontactEligible),
    recontactedSameSession: normalizeAnswerlatticeOwnerAssistantCount(packet.trust?.confirmedResolution?.recontactedSameSession),
    driftedAnswers: normalizeAnswerlatticeOwnerAssistantCount(packet.trust?.drift?.driftedCount),
    uncoveredEntities: normalizeAnswerlatticeOwnerAssistantCount(packet.trust?.entityAnswerCoverage?.uncoveredCount),
    openBoardCards: normalizeAnswerlatticeOwnerAssistantCount(packet.board?.openCards),
    needsAnswerCards: normalizeAnswerlatticeOwnerAssistantCount(packet.board?.needsAnswerCards),
    highPriorityCards: normalizeAnswerlatticeOwnerAssistantCount(packet.board?.highPriorityCards),
    reviewItems: normalizeAnswerlatticeOwnerAssistantCount(packet.intake?.reviewItems),
    signals7d: normalizeAnswerlatticeOwnerAssistantCount(packet.friction?.totalSignals7d),
    escalations7d: normalizeAnswerlatticeOwnerAssistantCount(packet.friction?.totalEscalations7d),
    frictionLevel: packet.friction?.frictionLevel || null,
});

const getUpdatedAt = (packet: SummaryPacket) => packet.summaryHealth.newestUpdatedAt;

const DAILY_ACTION_LIMIT = 4;

const createDailyAction = (action: AnswerlatticeFounderDailyAction): AnswerlatticeFounderDailyAction => action;

const buildFounderDailyBrief = (
    status: AnswerlatticeOwnerAssistantStatus,
    metrics: AnswerlatticeOwnerAssistantBrief['metrics'],
    trust: SummaryPacketValue['trust'],
    friction: SummaryPacketValue['friction'],
    launchVerification: AnswerlatticeLaunchVerification,
    permissions: AnswerlatticeOwnerAssistantPermissionMap,
    capabilities: AnswerlatticeOwnerAssistantCapabilities,
): AnswerlatticeFounderDailyBrief => {
    const ranked: Array<AnswerlatticeFounderDailyAction & { rank: number }> = [];
    const topFailingEntity = trust?.topFailingEntities[0] || null;
    const topFrictionEntity = friction?.topFrictionEntities[0] || null;
    const frictionRoute = getAnswerlatticeEntityContextRoute(
        `${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction`,
        topFrictionEntity?.entityId,
    );
    const add = (rank: number, action: AnswerlatticeFounderDailyAction) => {
        if (!canUseAnswerlatticeOwnerAssistantRoute(action.href, permissions)) return;
        ranked.push({
            rank,
            ...createDailyAction({
                ...action,
                ...(capabilities.canPrepareReviewCard
                    ? {}
                    : { preparedReviewCard: undefined }),
            }),
        });
    };

    if (launchVerification.available && !launchVerification.ready) {
        const nextBlocker = launchVerification.blockers[0] || 'Launch verification is incomplete.';
        add(5, {
            id: 'launch-proof-review',
            category: 'launch_safety',
            severity: 'critical',
            title: 'Finish launch verification',
            description: `${launchVerification.completeCount}/${launchVerification.totalCount} launch checks are complete. Next: ${nextBlocker}`,
            reason: 'Daily support work should not hide an incomplete customer-facing support setup.',
            href: launchVerification.nextActionRoute,
            cta: launchVerification.nextActionLabel || 'Continue launch setup',
            source: 'Activation summary',
            aiAssist: 'Launch checks are deterministic and owner-controlled.',
            costImpact: 'No AI cost to review launch verification.',
            preparedReviewCard: {
                title: 'Finish live support verification',
                description: `Complete the remaining launch proof. Next blocker: ${nextBlocker}`,
                priority: 'high',
                tags: ['launch', 'verification'],
            },
        });
    }

    if (metrics.driftedAnswers > 0) {
        const topFailureEvidence = topFailingEntity
            && (
                topFailingEntity.canonicalMissCount > 0
                || topFailingEntity.negativeFeedbackCount > 0
                || topFailingEntity.escalationCount > 0
            )
            ? ` Highest measured evidence: ${topFailingEntity.entityName} with ${topFailingEntity.canonicalMissCount} canonical misses, ${topFailingEntity.negativeFeedbackCount} negative ratings, and ${topFailingEntity.escalationCount} escalations.`
            : '';
        add(10, {
            id: 'answer-risk-review',
            category: 'answer_review',
            severity: metrics.driftedAnswers > 2 ? 'critical' : 'high',
            title: 'Review approved-answer risk first',
            description: `${metrics.driftedAnswers} approved answers need drift review.${topFailureEvidence}`,
            reason: 'Wrong or stale approved answers create the highest support-truth risk.',
            href: `${ANSWERLATTICE_ROUTES.GOVERNANCE}/drift`,
            cta: 'Open drift review',
            source: 'Answer evidence summary',
            aiAssist: 'Drafts and proposals remain review-only inside Governance.',
            costImpact: 'No AI cost to open this brief or review the summary.',
        });
    }

    if (metrics.highPriorityCards > 0) {
        add(15, {
            id: 'high-priority-support-board',
            category: 'needs_answer',
            severity: 'high',
            title: 'Review high-priority support work',
            description: `${metrics.highPriorityCards} high-priority Support Board cards are open.${metrics.needsAnswerCards > 0 ? ` ${metrics.needsAnswerCards} open cards need a governed answer or response.` : ''}`,
            reason: 'The Support Board has already qualified this work by current priority, so it should displace routine backlog.',
            href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD,
            cta: 'Open Support Board',
            source: 'Support Board summary',
            aiAssist: 'Existing card evidence and draft tools remain owner-reviewed.',
            costImpact: 'Board review is no-cost; optional AI drafting uses existing support-credit gates.',
        });
    } else if (metrics.needsAnswerCards > 0) {
        add(20, {
            id: 'needs-answer-board',
            category: 'needs_answer',
            severity: 'high',
            title: 'Turn repeated gaps into approved answers',
            description: `${metrics.needsAnswerCards} Support Board cards need an answer, FAQ, article update, or ticket reply.`,
            reason: 'Repeated misses should become governed support knowledge, not founder memory.',
            href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD,
            cta: 'Open Support Board',
            source: 'Support Board summary',
            aiAssist: 'Use existing draft/proposal actions, then approve before publishing.',
            costImpact: 'Board review is no-cost; optional AI drafting uses existing support-credit gates.',
        });
    }

    const recontactRate = metrics.recontactEligible > 0
        ? Math.round((metrics.recontactedSameSession / metrics.recontactEligible) * 100)
        : 0;
    if (
        (metrics.confirmedResolutionRate !== null && metrics.confirmedResolutionRate < 70)
        || (metrics.recontactEligible >= 3 && recontactRate >= 30)
    ) {
        add(25, {
            id: 'answer-outcome-review',
            category: 'answer_review',
            severity: 'high',
            title: 'Review answers users still need help after',
            description: metrics.confirmedResolutionRate !== null
                ? `Confirmed resolution is ${metrics.confirmedResolutionRate}%.${metrics.recontactEligible > 0 ? ` ${metrics.recontactedSameSession}/${metrics.recontactEligible} trackable solved sessions asked again in the same session.` : ''}`
                : `${metrics.recontactedSameSession}/${metrics.recontactEligible} trackable solved sessions asked again in the same session.`,
            reason: 'A non-escalated answer is not enough when users report failure or immediately ask again.',
            href: ANSWERLATTICE_ROUTES.ANSWER_TESTS,
            cta: 'Review Answer Tests',
            source: 'Explicit widget outcomes',
            aiAssist: 'Use deterministic checks and source evidence before changing approved support truth.',
            costImpact: 'Canonical-only checks use no provider credits.',
        });
    }

    const hasQualifiedFriction = (
        friction?.frictionLevel === 'HIGH'
        || metrics.escalations7d > 0
        || (topFrictionEntity?.last7d.escalationCount || 0) > 0
    );
    if (hasQualifiedFriction) {
        add(40, {
            id: 'support-reply-grounding',
            category: 'support_reply',
            severity: metrics.escalations7d > 0 ? 'high' : 'medium',
            title: topFrictionEntity
                ? 'Review the highest-friction product area'
                : 'Reply from approved knowledge',
            description: topFrictionEntity
                ? `${topFrictionEntity.entityName} produced ${topFrictionEntity.last7d.queryCount} support questions, ${topFrictionEntity.last7d.escalationCount} escalations, and ${topFrictionEntity.last7d.lowConfidenceCount} low-confidence outcomes in the current seven-day summary.`
                : `${metrics.signals7d} support signals and ${metrics.escalations7d} escalations are visible in the current seven-day summary.`,
            reason: topFrictionEntity
                ? 'Start with the product area creating the most measured support friction before adding generic content.'
                : 'Ticket replies should reuse approved answers where possible instead of becoming one-off explanations.',
            href: topFrictionEntity ? frictionRoute : ANSWERLATTICE_ROUTES.TICKETS,
            cta: topFrictionEntity ? 'Review friction' : 'Open tickets',
            source: 'Friction summary',
            aiAssist: topFrictionEntity
                ? 'Use the measured entity evidence to decide whether the next fix belongs in support truth or the product.'
                : 'Use approved answers and drafts as starting points; customize before sending.',
            costImpact: 'This prioritization reuses the loaded friction summary and adds no read or model call.',
        });
    }

    const hasCoverageRepairEvidence = (
        metrics.canonicalMisses > 0
        || metrics.uncoveredEntities > 0
        || metrics.highPriorityCards > 0
        || metrics.needsAnswerCards > 0
        || metrics.driftedAnswers > 0
    );
    if (
        metrics.coverageRate !== null
        && metrics.coverageRate < 50
        && hasCoverageRepairEvidence
    ) {
        add(50, {
            id: 'coverage-safety',
            category: 'answer_review',
            severity: 'high',
            title: 'Raise approved-answer coverage',
            description: `Canonical coverage is ${metrics.coverageRate}%, with ${metrics.canonicalMisses} measured canonical misses and ${metrics.uncoveredEntities} uncovered active entities.`,
            reason: 'Low coverage means more fallback, more founder interruptions, and more support risk.',
            href: `${ANSWERLATTICE_ROUTES.GOVERNANCE}/answers`,
            cta: 'Review canonical answers',
            source: 'Coverage summary',
            aiAssist: 'Deterministic answer checks avoid fallback model calls when approved answers already cover the question.',
            costImpact: 'Canonical-only checks have no provider cost; full-runtime checks are capped and metered.',
        });
    }

    const actions = ranked
        .sort((left, right) => left.rank - right.rank)
        .slice(0, DAILY_ACTION_LIMIT)
        .map(({ rank: _rank, ...action }) => action);

    const focus: AnswerlatticeFounderDailyBrief['focus'] = launchVerification.available && !launchVerification.ready
        ? 'launch'
        : actions.some(action => action.severity === 'critical')
        ? 'stabilize'
        : actions.length > 0
            ? 'review'
            : status === 'insufficient_data'
                ? 'review'
                : 'maintain';

    const headline = focus === 'stabilize'
        ? 'Stabilize support truth before adding traffic.'
        : focus === 'review'
            ? 'Review prepared support work today.'
            : focus === 'launch'
                ? 'Finish setup so support can answer correctly.'
                : status === 'insufficient_data'
                    ? launchVerification.ready
                        ? 'Launch is verified; outcome data will appear after real support activity.'
                        : 'Current support evidence needs refresh before a decision.'
                    : status === 'healthy'
                        ? 'Nothing needs your decision right now'
                        : 'No permitted action is available for the current support evidence.';

    return {
        enabled: true,
        headline,
        summary: actions.length
            ? `Start with ${actions[0].title.toLowerCase()}. The rest are ordered by support-truth risk and founder time saved.`
            : status === 'healthy'
                ? 'No current answer risk, qualified support gap, or launch blocker is visible in the latest summaries.'
                : status === 'insufficient_data'
                    ? 'Current source evidence is incomplete or does not yet contain enough support activity for a decision.'
                    : 'The current summaries contain support evidence, but no permitted action path is available in this brief.',
        focus,
        actions,
        costNote: 'This brief is computed from existing summaries. It adds no model call, no new Firestore scan, and no support-credit debit.',
        sourceNote: 'Uses admitted coverage, answer-evidence, support-board, friction, knowledge-intake, and activation summaries only.',
    };
};

export const getAnswerlatticeOwnerAssistantBrief = async (
    tId: number,
    sId: number,
    permissions: AnswerlatticeOwnerAssistantPermissionMap,
): Promise<AnswerlatticeOwnerAssistantBrief> => {
    const packet = await loadSummaryPacket(tId, sId);
    const metrics = buildMetrics(packet);
    const metricStatus = getAnswerlatticeOwnerAssistantStatus(metrics, packet.summaryHealth);
    const capabilities = buildAnswerlatticeOwnerAssistantCapabilities(permissions);
    const launchVerification = buildLaunchVerification(
        packet.activation,
        capabilities.canViewLaunchVerification,
    );
    const dailyBrief = buildFounderDailyBrief(
        metricStatus,
        metrics,
        packet.trust,
        packet.friction,
        launchVerification,
        permissions,
        capabilities,
    );
    const status: AnswerlatticeOwnerAssistantStatus = dailyBrief.actions.some(action => action.severity === 'critical')
        ? 'at_risk'
        : dailyBrief.actions.length > 0 && metricStatus === 'healthy'
            ? 'needs_review'
            : metricStatus;
    const attentionCount = dailyBrief.actions.length;
    const headline = status === 'healthy'
        ? 'Nothing needs your decision right now.'
        : status === 'insufficient_data'
            ? 'There is not enough support activity yet to summarize the current support state.'
            : status === 'at_risk'
                ? attentionCount > 0
                    ? `${attentionCount} high-risk support ${attentionCount === 1 ? 'item needs' : 'items need'} owner review.`
                    : 'High-risk support evidence exists outside the permitted action paths.'
                : attentionCount > 0
                    ? `${attentionCount} support ${attentionCount === 1 ? 'item is' : 'items are'} ready for review.`
                    : 'Support evidence needs review outside the permitted action paths.';

    return {
        status,
        headline,
        attentionCount,
        metrics,
        promptChips: [
            'What needs my attention today?',
            'What should I fix first?',
            'Which answers are at risk?',
            'What should I check before a release?',
            'Is the widget setup safe?',
            'How do I keep AI costs bounded?',
            'Where are users getting stuck?',
            'Is support ready for more users?',
            'What knowledge is waiting for review?',
        ],
        launchVerification,
        ...(FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF
            ? { dailyBrief }
            : {}),
        summaryHealth: packet.summaryHealth,
        capabilities,
        updatedAt: getUpdatedAt(packet),
        readModel: { firestoreReads: packet.cacheHit ? 0 : 6, source: 'summary_only', cacheHit: packet.cacheHit },
    };
};

const classifyIntent = (question: string): AnswerlatticeOwnerAssistantAnswer['intent'] => {
    const normalized = question.toLowerCase();
    if (/drift|stale|answer|wrong|risk/.test(normalized)) return 'answer_risk';
    if (/stuck|friction|repeat|asking|escalat/.test(normalized)) return 'friction';
    if (/release|ship|deploy|changelog|version/.test(normalized)) return 'release';
    if (/install|widget|setup|origin|context|verify/.test(normalized)) return 'install';
    if (/reply|respond|ticket|customer/.test(normalized)) return 'reply';
    if (/cost|credit|billing|spend|provider|ai/.test(normalized)) return 'cost';
    if (/ready|health|coverage|reliab|more users/.test(normalized)) return 'readiness';
    if (/intake|import|knowledge|waiting|review/.test(normalized)) return 'intake';
    if (/attention|today|next|urgent|priority|task/.test(normalized)) return 'attention';
    return 'unsupported';
};

export const answerAnswerlatticeOwnerQuestion = async (
    tId: number,
    sId: number,
    question: string,
    permissions: AnswerlatticeOwnerAssistantPermissionMap,
): Promise<AnswerlatticeOwnerAssistantAnswer> => {
    const packet = await loadSummaryPacket(tId, sId);
    const metrics = buildMetrics(packet);
    const status = getAnswerlatticeOwnerAssistantStatus(metrics, packet.summaryHealth);
    const intent = classifyIntent(question);
    const topFrictionEntity = packet.friction?.topFrictionEntities[0] || null;
    const frictionRoute = `${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction`;
    const evidence: AnswerlatticeOwnerAssistantAnswer['evidence'] = [];
    const nextActions: Array<{ label: string; href: string }> = [];
    let directAnswer = '';

    if (intent === 'attention') {
        directAnswer = metrics.needsAnswerCards + metrics.reviewItems + metrics.driftedAnswers + metrics.uncoveredEntities > 0
            ? `Review ${metrics.needsAnswerCards} support-board answers, ${metrics.reviewItems} intake items, ${metrics.driftedAnswers} drifted answers, and ${metrics.uncoveredEntities} uncovered entities. Start with known answer risk and unresolved gaps.`
            : 'No queued answer, intake, or drift work is visible in the latest summaries.';
        evidence.push(
            { label: 'Support board', value: `${metrics.openBoardCards} open · ${metrics.needsAnswerCards} need answers`, href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD, source: 'support board summary' },
            { label: 'Knowledge review', value: `${metrics.reviewItems} items waiting`, href: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE, source: 'intake summary' },
            { label: 'Drift review', value: `${metrics.driftedAnswers} drifted answers`, href: ANSWERLATTICE_ROUTES.GOVERNANCE, source: 'answer evidence summary' },
        );
        nextActions.push({ label: 'Open Support Board', href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD });
    } else if (intent === 'answer_risk') {
        directAnswer = metrics.driftedAnswers > 0 || metrics.uncoveredEntities > 0
            ? `${metrics.driftedAnswers} approved answers are marked for drift review and ${metrics.uncoveredEntities} active product entities do not have an approved answer. Review those before expanding automation.`
            : 'No drifted answers or uncovered active entities are visible in the latest answer-evidence summary.';
        evidence.push(
            { label: 'Drifted answers', value: String(metrics.driftedAnswers), href: ANSWERLATTICE_ROUTES.GOVERNANCE, source: 'answer evidence summary' },
            { label: 'Uncovered entities', value: String(metrics.uncoveredEntities), href: ANSWERLATTICE_ROUTES.GOVERNANCE, source: 'answer evidence summary' },
        );
        nextActions.push({ label: 'Open Drift Review', href: ANSWERLATTICE_ROUTES.GOVERNANCE });
    } else if (intent === 'friction') {
        directAnswer = metrics.signals7d > 0
            ? topFrictionEntity
                ? `${topFrictionEntity.entityName} is the highest-friction product area in the current seven-day summary, with ${topFrictionEntity.last7d.queryCount} support questions, ${topFrictionEntity.last7d.escalationCount} escalations, and ${topFrictionEntity.last7d.lowConfidenceCount} low-confidence outcomes. Review that evidence before adding more generic content.`
                : `${metrics.signals7d} support signals and ${metrics.escalations7d} escalations were recorded in the current seven-day summary. Review the top friction entities before adding more generic content.`
            : 'No recent friction signals are available yet.';
        evidence.push(
            ...(topFrictionEntity
                ? [{
                    label: 'Highest-friction area',
                    value: `${topFrictionEntity.entityName} · ${topFrictionEntity.trendDirection}`,
                    href: frictionRoute,
                    source: 'friction summary',
                }]
                : []),
            { label: 'Signals in 7 days', value: String(metrics.signals7d), href: frictionRoute, source: 'friction summary' },
            { label: 'Escalations in 7 days', value: String(metrics.escalations7d), href: ANSWERLATTICE_ROUTES.TICKETS, source: 'friction summary' },
        );
        nextActions.push({ label: 'Open Friction Review', href: frictionRoute });
    } else if (intent === 'readiness') {
        directAnswer = metrics.coverageRate === null
            ? 'Coverage is not available yet. Let real users ask questions, then review the next nightly summary.'
            : metrics.confirmedResolutionRate === null
                ? metrics.noEscalationRate === null
                    ? `Canonical coverage is ${metrics.coverageRate}%. No-escalation and explicit solved/not-solved outcomes are not available yet.`
                    : `Canonical coverage is ${metrics.coverageRate}% and ${metrics.noEscalationRate}% of recent queries did not escalate. Explicit solved/not-solved outcomes are not available yet.`
                : `Canonical coverage is ${metrics.coverageRate}% and confirmed resolution is ${metrics.confirmedResolutionRate}%. ${metrics.recontactEligible > 0 ? `${metrics.recontactedSameSession} same-session recontacts were observed across ${metrics.recontactEligible} trackable solved outcomes. ` : ''}${status === 'healthy' ? 'The current summary is stable.' : 'Review gaps before increasing support traffic.'}`;
        evidence.push(
            { label: 'Canonical coverage', value: metrics.coverageRate === null ? 'Not available' : `${metrics.coverageRate}%`, href: ANSWERLATTICE_ROUTES.DASHBOARD, source: 'coverage summary' },
            { label: 'Confirmed resolution', value: metrics.confirmedResolutionRate === null ? 'Not available' : `${metrics.confirmedResolutionRate}%`, href: ANSWERLATTICE_ROUTES.DASHBOARD, source: 'explicit widget outcomes' },
            { label: 'No escalation', value: metrics.noEscalationRate === null ? 'Not available' : `${metrics.noEscalationRate}%`, href: ANSWERLATTICE_ROUTES.DASHBOARD, source: 'answer evidence summary' },
        );
        nextActions.push({ label: 'Open Readiness', href: ANSWERLATTICE_ROUTES.DASHBOARD });
    } else if (intent === 'intake') {
        directAnswer = metrics.reviewItems > 0
            ? `${metrics.reviewItems} intake items are waiting for owner review. Accept only material that should become governed support knowledge.`
            : 'No knowledge intake items are waiting for review.';
        evidence.push({ label: 'Review items', value: String(metrics.reviewItems), href: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE, source: 'intake summary' });
        nextActions.push({ label: 'Open Knowledge Intake', href: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE });
    } else if (intent === 'release') {
        directAnswer = 'Before a product change reaches users, run linked answer tests, review release-sensitive answers, and use Known Issues only for temporary notices that should not rewrite approved support truth.';
        evidence.push(
            { label: 'Answer Tests', value: 'Saved release checks', href: ANSWERLATTICE_ROUTES.ANSWER_TESTS, source: 'answer test suite' },
            { label: 'Known Issues', value: 'Temporary notices', href: ANSWERLATTICE_ROUTES.KNOWN_ISSUES, source: 'support control' },
        );
        nextActions.push({ label: 'Open Answer Tests', href: ANSWERLATTICE_ROUTES.ANSWER_TESTS });
    } else if (intent === 'install') {
        directAnswer = 'Check activation and widget setup first: origin allowed, route not blocked, safe page context arriving, hosted help available, and first approved answers ready.';
        evidence.push(
            { label: 'Activation', value: 'Launch checks', href: ANSWERLATTICE_ROUTES.ACTIVATION, source: 'setup checklist' },
            { label: 'Widget', value: 'Install and context', href: ANSWERLATTICE_ROUTES.WIDGET, source: 'runtime controls' },
        );
        nextActions.push({ label: 'Open Activation', href: ANSWERLATTICE_ROUTES.ACTIVATION });
    } else if (intent === 'reply') {
        directAnswer = metrics.escalations7d > 0
            ? `Start with escalated tickets. Use approved answers or related docs as the reply base, then customize before sending. ${metrics.escalations7d} escalations are visible in the current summary.`
            : 'Open tickets and reply from approved answers or related help content. Do not treat one-off replies as official support truth until reviewed.';
        evidence.push(
            { label: 'Tickets', value: `${metrics.escalations7d} escalations`, href: ANSWERLATTICE_ROUTES.TICKETS, source: 'friction summary' },
            { label: 'Approved answers', value: 'Review source', href: ANSWERLATTICE_ROUTES.GOVERNANCE, source: 'governance' },
        );
        nextActions.push({ label: 'Open Tickets', href: ANSWERLATTICE_ROUTES.TICKETS });
    } else if (intent === 'cost') {
        directAnswer = 'Use approved answers and deterministic checks first. This assistant and daily brief do not call a model. Media extraction, full-runtime answer tests, and AI draft preparation stay behind support-credit accounting.';
        evidence.push(
            { label: 'Brief cost', value: 'No model call', href: ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT, source: 'summary-only assistant' },
            { label: 'Billing', value: 'Support credits', href: ANSWERLATTICE_ROUTES.BILLING, source: 'billing guardrail' },
        );
        nextActions.push({ label: 'Open Billing', href: ANSWERLATTICE_ROUTES.BILLING });
    } else {
        directAnswer = 'I can summarize support attention, answer risk, user friction, readiness, and knowledge review. I cannot change support truth or perform unrestricted product actions.';
    }

    const permittedEvidence = evidence.filter(item => (
        canUseAnswerlatticeOwnerAssistantRoute(item.href, permissions)
    ));
    const permittedNextActions = nextActions.filter(item => (
        canUseAnswerlatticeOwnerAssistantRoute(item.href, permissions)
    ));
    const limits = [
        'Uses compact operational summaries, not raw customer conversations.',
        'Does not publish answers, close tickets, or change widget settings.',
        'Open the linked review screen before making a support decision.',
    ];
    if (!packet.summaryHealth.complete) {
        limits.unshift('One or more required summaries are missing, invalid, or stale; treat this answer as partial.');
    }
    if (evidence.length > permittedEvidence.length || nextActions.length > permittedNextActions.length) {
        limits.push('Some evidence or actions are hidden because this role cannot open the owning surface.');
    }

    return {
        id: createRuntimeId('owner_support_answer'),
        status: intent === 'unsupported' ? 'unsupported' : status,
        intent,
        directAnswer,
        evidence: permittedEvidence,
        nextActions: permittedNextActions,
        limits,
        summaryHealth: packet.summaryHealth,
        readModel: { firestoreReads: packet.cacheHit ? 0 : 6, source: 'summary_only', cacheHit: packet.cacheHit },
    };
};
