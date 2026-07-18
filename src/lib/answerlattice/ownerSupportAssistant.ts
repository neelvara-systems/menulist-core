import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/routes';
import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { createRuntimeId } from '@lib/runtime/randomId';
import { z } from 'zod';

export const AnswerlatticeOwnerAssistantQuerySchema = z.object({
    question: z.string().trim().min(3).max(500),
}).strict();

export type AnswerlatticeOwnerAssistantStatus =
    | 'healthy'
    | 'needs_review'
    | 'at_risk'
    | 'insufficient_data'
    | 'unsupported';

export type AnswerlatticeOwnerAssistantEvidence = {
    label: string;
    value: string;
    href: string;
    source: string;
};

export type AnswerlatticeFounderDailyActionCategory =
    | 'answer_review'
    | 'needs_answer'
    | 'intake_review'
    | 'release_safety'
    | 'support_reply'
    | 'launch_safety'
    | 'cost_guard';

export type AnswerlatticeFounderDailyActionSeverity = 'critical' | 'high' | 'medium' | 'low' | 'stable';

export type AnswerlatticeFounderDailyAction = {
    id: string;
    category: AnswerlatticeFounderDailyActionCategory;
    severity: AnswerlatticeFounderDailyActionSeverity;
    title: string;
    description: string;
    reason: string;
    href: string;
    cta: string;
    source: string;
    aiAssist: string;
    costImpact: string;
    preparedReviewCard?: {
        title: string;
        description: string;
        priority: 'low' | 'medium' | 'high';
        tags: string[];
    };
};

export type AnswerlatticeFounderDailyBrief = {
    enabled: true;
    headline: string;
    summary: string;
    focus: 'review' | 'stabilize' | 'launch' | 'maintain';
    actions: AnswerlatticeFounderDailyAction[];
    costNote: string;
    sourceNote: string;
};

export type AnswerlatticeLaunchVerification = {
    available: boolean;
    ready: boolean;
    completeCount: number;
    totalCount: number;
    blockers: string[];
    nextActionLabel: string | null;
    nextActionRoute: string;
    verifiedAt: string | null;
};

export type AnswerlatticeOwnerAssistantAnswer = {
    id: string;
    status: AnswerlatticeOwnerAssistantStatus;
    intent: 'attention' | 'answer_risk' | 'friction' | 'readiness' | 'intake' | 'release' | 'install' | 'reply' | 'cost' | 'unsupported';
    directAnswer: string;
    evidence: AnswerlatticeOwnerAssistantEvidence[];
    nextActions: Array<{ label: string; href: string }>;
    limits: string[];
    readModel: {
        firestoreReads: number;
        source: 'summary_only';
        cacheHit: boolean;
    };
};

export type AnswerlatticeOwnerAssistantBrief = {
    status: AnswerlatticeOwnerAssistantStatus;
    headline: string;
    attentionCount: number;
    metrics: {
        coverageRate: number | null;
        resolutionRate: number | null;
        confirmedResolutionRate: number | null;
        recontactEligible: number;
        recontactedSameSession: number;
        driftedAnswers: number;
        criticalEntities: number;
        openBoardCards: number;
        needsAnswerCards: number;
        reviewItems: number;
        signals7d: number;
        escalations7d: number;
    };
    promptChips: string[];
    launchVerification: AnswerlatticeLaunchVerification;
    dailyBrief?: AnswerlatticeFounderDailyBrief;
    updatedAt: string | null;
    readModel: {
        firestoreReads: number;
        source: 'summary_only';
        cacheHit: boolean;
    };
};

type SummaryPacket = {
    coverage: Record<string, any> | null;
    trust: Record<string, any> | null;
    board: Record<string, any> | null;
    friction: Record<string, any> | null;
    intake: Record<string, any> | null;
    activation: Record<string, any> | null;
    cacheHit: boolean;
};

const SUMMARY_CACHE_TTL_MS = 60_000;
const SUMMARY_CACHE_MAX_ENTRIES = 300;
const summaryCache = new Map<string, { expiresAt: number; value: Omit<SummaryPacket, 'cacheHit'> }>();

const toNumber = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : 0;
};

const toIso = (value: unknown): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (typeof (value as any)?.toDate === 'function') {
        const date = (value as any).toDate();
        return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
    }
    return null;
};

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const toBoundedCount = (value: unknown, maximum: number): number => {
    const normalized = Number(value);
    if (!Number.isFinite(normalized) || normalized < 0) return 0;
    return Math.min(maximum, Math.floor(normalized));
};

const normalizeLaunchRoute = (value: unknown): string => {
    const route = typeof value === 'string' ? value.trim() : '';
    return route.startsWith('/answerlattice/') && !route.startsWith('//')
        ? route.slice(0, 240)
        : ANSWERLATTICE_ROUTES.ACTIVATION;
};

const buildLaunchVerification = (activation: Record<string, any> | null): AnswerlatticeLaunchVerification => {
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
    const completeCount = toBoundedCount(launchProof.completeCount, 20);
    const totalCount = toBoundedCount(launchProof.totalCount, 20);
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
        verifiedAt: toIso(activation?.lastComputedAt || activation?.computedAtIso),
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
    const value = {
        coverage: snapshots[0]?.exists ? snapshots[0].data() || null : null,
        trust: snapshots[1]?.exists ? snapshots[1].data() || null : null,
        board: snapshots[2]?.exists ? snapshots[2].data() || null : null,
        friction: snapshots[3]?.exists ? snapshots[3].data() || null : null,
        intake: snapshots[4]?.exists ? snapshots[4].data() || null : null,
        activation: snapshots[5]?.exists
            && snapshots[5].data()?.pId === 'AL'
            && snapshots[5].data()?.tId === tId
            && snapshots[5].data()?.sId === sId
            ? snapshots[5].data() || null
            : null,
    };
    if (summaryCache.size >= SUMMARY_CACHE_MAX_ENTRIES) {
        const firstKey = summaryCache.keys().next().value;
        if (firstKey) summaryCache.delete(firstKey);
    }
    summaryCache.set(key, { value, expiresAt: Date.now() + SUMMARY_CACHE_TTL_MS });
    return { ...value, cacheHit: false };
};

const buildMetrics = (packet: SummaryPacket): AnswerlatticeOwnerAssistantBrief['metrics'] => ({
    coverageRate: packet.trust?.coverage?.rate !== undefined
        ? toNumber(packet.trust.coverage.rate)
        : packet.coverage?.coverage?.rate !== undefined
            ? toNumber(packet.coverage.coverage.rate)
            : null,
    resolutionRate: packet.trust?.resolution?.rate !== undefined ? toNumber(packet.trust.resolution.rate) : null,
    confirmedResolutionRate: toNumber(packet.trust?.confirmedResolution?.explicitOutcomeTotal) > 0
        ? toNumber(packet.trust.confirmedResolution.rate)
        : null,
    recontactEligible: toNumber(packet.trust?.confirmedResolution?.recontactEligible),
    recontactedSameSession: toNumber(packet.trust?.confirmedResolution?.recontactedSameSession),
    driftedAnswers: toNumber(packet.trust?.drift?.driftedCount),
    criticalEntities: toNumber(packet.trust?.entityHealth?.criticalCount),
    openBoardCards: toNumber(packet.board?.openCards),
    needsAnswerCards: toNumber(packet.board?.needsAnswerCards),
    reviewItems: toNumber(packet.intake?.reviewItems),
    signals7d: toNumber(packet.friction?.totalSignals7d),
    escalations7d: toNumber(packet.friction?.totalEscalations7d),
});

const getStatus = (metrics: AnswerlatticeOwnerAssistantBrief['metrics']): AnswerlatticeOwnerAssistantStatus => {
    if (metrics.coverageRate === null && metrics.resolutionRate === null && metrics.openBoardCards === 0 && metrics.reviewItems === 0) {
        return 'insufficient_data';
    }
    if (metrics.criticalEntities > 0 || metrics.driftedAnswers > 2 || (metrics.coverageRate !== null && metrics.coverageRate < 50)) {
        return 'at_risk';
    }
    if (metrics.needsAnswerCards > 0 || metrics.reviewItems > 0 || metrics.driftedAnswers > 0 || metrics.escalations7d > 0) {
        return 'needs_review';
    }
    return 'healthy';
};

const getUpdatedAt = (packet: SummaryPacket) => {
    const candidates = [packet.trust?.lastUpdated, packet.board?.lastUpdated, packet.friction?.lastUpdated, packet.intake?.lastUpdated, packet.coverage?.lastUpdated, packet.activation?.lastComputedAt, packet.activation?.computedAtIso]
        .map(toIso)
        .filter((value): value is string => Boolean(value))
        .sort()
        .reverse();
    return candidates[0] || null;
};

const DAILY_ACTION_LIMIT = 4;

const createDailyAction = (action: AnswerlatticeFounderDailyAction): AnswerlatticeFounderDailyAction => action;

const buildFounderDailyBrief = (
    status: AnswerlatticeOwnerAssistantStatus,
    metrics: AnswerlatticeOwnerAssistantBrief['metrics'],
    launchVerification: AnswerlatticeLaunchVerification,
): AnswerlatticeFounderDailyBrief => {
    const ranked: Array<AnswerlatticeFounderDailyAction & { rank: number }> = [];
    const add = (rank: number, action: AnswerlatticeFounderDailyAction) => {
        ranked.push({ rank, ...createDailyAction(action) });
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

    if (metrics.criticalEntities > 0 || metrics.driftedAnswers > 0) {
        add(10, {
            id: 'answer-risk-review',
            category: 'answer_review',
            severity: metrics.criticalEntities > 0 ? 'critical' : 'high',
            title: 'Review approved-answer risk first',
            description: `${metrics.driftedAnswers} approved answers and ${metrics.criticalEntities} product entities need governance attention before support volume grows.`,
            reason: 'Wrong or stale approved answers create the highest support-truth risk.',
            href: `${ANSWERLATTICE_ROUTES.GOVERNANCE}/drift`,
            cta: 'Open drift review',
            source: 'Trust summary',
            aiAssist: 'Drafts and proposals remain review-only inside Governance.',
            costImpact: 'No AI cost to open this brief or review the summary.',
        });
    }

    if (metrics.needsAnswerCards > 0) {
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

    if (metrics.reviewItems > 0) {
        add(30, {
            id: 'knowledge-intake-review',
            category: 'intake_review',
            severity: 'medium',
            title: 'Approve imported knowledge',
            description: `${metrics.reviewItems} Knowledge Intake items are waiting for review from docs, URLs, screenshots, recordings, notes, or replies.`,
            reason: 'Owner approval turns raw intake into reusable support knowledge.',
            href: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
            cta: 'Review intake',
            source: 'Knowledge Intake summary',
            aiAssist: 'OCR/transcription and draft preparation stay owner-reviewed.',
            costImpact: 'Review is no-cost; media extraction is already logged through support-credit settlement.',
        });
    }

    if (metrics.escalations7d > 0 || metrics.signals7d > 0) {
        add(40, {
            id: 'support-reply-grounding',
            category: 'support_reply',
            severity: metrics.escalations7d > 0 ? 'high' : 'medium',
            title: 'Reply from approved knowledge',
            description: `${metrics.signals7d} support signals and ${metrics.escalations7d} escalations are visible in the current seven-day summary.`,
            reason: 'Ticket replies should reuse approved answers where possible instead of becoming one-off explanations.',
            href: ANSWERLATTICE_ROUTES.TICKETS,
            cta: 'Open tickets',
            source: 'Friction summary',
            aiAssist: 'Use approved answers and drafts as starting points; customize before sending.',
            costImpact: 'Ticket review is no-cost; new AI drafts remain explicitly metered.',
        });
    }

    if (metrics.coverageRate !== null && metrics.coverageRate < 50) {
        add(50, {
            id: 'coverage-safety',
            category: 'answer_review',
            severity: 'high',
            title: 'Raise approved-answer coverage',
            description: `Canonical coverage is ${metrics.coverageRate}%. Add or approve answers for the screens where users repeat questions.`,
            reason: 'Low coverage means more fallback, more founder interruptions, and more support risk.',
            href: ANSWERLATTICE_ROUTES.ANSWER_TESTS,
            cta: 'Open Answer Tests',
            source: 'Coverage summary',
            aiAssist: 'Deterministic answer checks avoid fallback model calls when approved answers already cover the question.',
            costImpact: 'Canonical-only checks have no provider cost; full-runtime checks are capped and metered.',
        });
    }

    if (status === 'insufficient_data' && !launchVerification.available) {
        add(60, {
            id: 'launch-verification',
            category: 'launch_safety',
            severity: 'medium',
            title: 'Verify setup before users rely on support',
            description: 'Confirm widget install, allowed origin, blocked routes, safe page context, and first approved answers.',
            reason: 'Noisy or missing runtime context makes support feel generic.',
            href: ANSWERLATTICE_ROUTES.ACTIVATION,
            cta: 'Open activation',
            source: 'Available summary state',
            aiAssist: 'Install checks are deterministic; no model is needed.',
            costImpact: 'No AI cost.',
            preparedReviewCard: {
                title: 'Finish live support verification',
                description: 'Confirm widget install, allowed origin, blocked routes, safe page context, and first approved answers before users depend on support.',
                priority: 'high',
                tags: ['launch', 'widget', 'verification'],
            },
        });
    }

    if (ranked.length < DAILY_ACTION_LIMIT) {
        add(70, {
            id: 'release-safety',
            category: 'release_safety',
            severity: status === 'healthy' ? 'stable' : 'low',
            title: 'Run release checks before shipping changes',
            description: 'Record what changed, link the affected entities and surfaces, then use the existing release and drift checks before users see stale support.',
            reason: 'Fast product changes are where stale support usually appears first.',
            href: `${ANSWERLATTICE_ROUTES.CHANGELOG}?create=1`,
            cta: 'Record product change',
            source: 'Changelog and release checks',
            aiAssist: 'Release checks select linked cases instead of testing everything.',
            costImpact: 'Deterministic checks avoid provider calls; full-runtime checks are capped.',
            preparedReviewCard: {
                title: 'Review support impact for the next release',
                description: 'Run linked answer tests, review affected product surfaces, and confirm stale or changed answers before the release reaches users.',
                priority: 'medium',
                tags: ['release', 'answer-tests', 'drift'],
            },
        });
    }

    if (ranked.length < DAILY_ACTION_LIMIT) {
        add(80, {
            id: 'cost-guard',
            category: 'cost_guard',
            severity: 'stable',
            title: 'Keep AI work bounded',
            description: 'Prefer approved answers and deterministic checks first. Use support credits for media extraction, full-runtime tests, and AI draft preparation only when needed.',
            reason: 'Low AI cost still needs visible accounting so support stays predictable.',
            href: ANSWERLATTICE_ROUTES.BILLING,
            cta: 'Review credits',
            source: 'Billing guardrail',
            aiAssist: 'The brief itself does not call a model.',
            costImpact: 'No AI cost from this daily brief.',
        });
    }

    const actions = ranked
        .sort((left, right) => left.rank - right.rank)
        .slice(0, DAILY_ACTION_LIMIT)
        .map(({ rank: _rank, ...action }) => action);

    const focus: AnswerlatticeFounderDailyBrief['focus'] = launchVerification.available && !launchVerification.ready
        ? 'launch'
        : status === 'at_risk'
        ? 'stabilize'
        : status === 'needs_review'
            ? 'review'
            : status === 'insufficient_data'
                ? (launchVerification.ready ? 'maintain' : 'launch')
                : 'maintain';

    const headline = focus === 'stabilize'
        ? 'Stabilize support truth before adding traffic.'
        : focus === 'review'
            ? 'Review prepared support work today.'
            : focus === 'launch'
                ? 'Finish setup so support can answer correctly.'
                : status === 'insufficient_data'
                    ? 'Launch is verified; outcome data will appear after real support activity.'
                    : 'Support is stable; keep release checks ready.';

    return {
        enabled: true,
        headline,
        summary: actions.length
            ? `Start with ${actions[0].title.toLowerCase()}. The rest are ordered by support-truth risk and founder time saved.`
            : 'No support action is visible in the current summaries.',
        focus,
        actions,
        costNote: 'This brief is computed from existing summaries. It adds no model call, no new Firestore scan, and no support-credit debit.',
        sourceNote: 'Uses coverage, trust, support-board, friction, knowledge-intake, and activation summaries only.',
    };
};

export const getAnswerlatticeOwnerAssistantBrief = async (
    tId: number,
    sId: number,
): Promise<AnswerlatticeOwnerAssistantBrief> => {
    const packet = await loadSummaryPacket(tId, sId);
    const metrics = buildMetrics(packet);
    const status = getStatus(metrics);
    const launchVerification = buildLaunchVerification(packet.activation);
    const attentionCount = metrics.driftedAnswers + metrics.criticalEntities + metrics.needsAnswerCards + metrics.reviewItems
        + (launchVerification.available && !launchVerification.ready ? 1 : 0);
    const headline = status === 'healthy'
        ? 'Support looks stable. No urgent review is visible in the current summaries.'
        : status === 'insufficient_data'
            ? 'There is not enough support activity yet to judge system health.'
            : status === 'at_risk'
                ? `${attentionCount || 1} high-risk support items need owner review.`
                : `${attentionCount || 1} support items are ready for review.`;

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
            ? { dailyBrief: buildFounderDailyBrief(status, metrics, launchVerification) }
            : {}),
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
): Promise<AnswerlatticeOwnerAssistantAnswer> => {
    const packet = await loadSummaryPacket(tId, sId);
    const metrics = buildMetrics(packet);
    const status = getStatus(metrics);
    const intent = classifyIntent(question);
    const evidence: AnswerlatticeOwnerAssistantEvidence[] = [];
    const nextActions: Array<{ label: string; href: string }> = [];
    let directAnswer = '';

    if (intent === 'attention') {
        directAnswer = metrics.needsAnswerCards + metrics.reviewItems + metrics.driftedAnswers > 0
            ? `Review ${metrics.needsAnswerCards} support-board answers, ${metrics.reviewItems} intake items, and ${metrics.driftedAnswers} drifted answers. Start with critical entities and unresolved answer gaps.`
            : 'No queued answer, intake, or drift work is visible in the latest summaries.';
        evidence.push(
            { label: 'Support board', value: `${metrics.openBoardCards} open · ${metrics.needsAnswerCards} need answers`, href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD, source: 'support board summary' },
            { label: 'Knowledge review', value: `${metrics.reviewItems} items waiting`, href: ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE, source: 'intake summary' },
            { label: 'Drift review', value: `${metrics.driftedAnswers} drifted answers`, href: ANSWERLATTICE_ROUTES.GOVERNANCE, source: 'trust summary' },
        );
        nextActions.push({ label: 'Open Support Board', href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD });
    } else if (intent === 'answer_risk') {
        directAnswer = metrics.driftedAnswers > 0 || metrics.criticalEntities > 0
            ? `${metrics.driftedAnswers} approved answers are marked for drift review and ${metrics.criticalEntities} product entities are critical. Review those before expanding automation.`
            : 'No drifted answers or critical entities are visible in the latest trust summary.';
        evidence.push(
            { label: 'Drifted answers', value: String(metrics.driftedAnswers), href: ANSWERLATTICE_ROUTES.GOVERNANCE, source: 'trust summary' },
            { label: 'Critical entities', value: String(metrics.criticalEntities), href: ANSWERLATTICE_ROUTES.GOVERNANCE, source: 'trust summary' },
        );
        nextActions.push({ label: 'Open Drift Review', href: ANSWERLATTICE_ROUTES.GOVERNANCE });
    } else if (intent === 'friction') {
        directAnswer = metrics.signals7d > 0
            ? `${metrics.signals7d} support signals and ${metrics.escalations7d} escalations were recorded in the current seven-day summary. Review the top friction entities before adding more generic content.`
            : 'No recent friction signals are available yet.';
        evidence.push(
            { label: 'Signals in 7 days', value: String(metrics.signals7d), href: ANSWERLATTICE_ROUTES.GOVERNANCE, source: 'friction summary' },
            { label: 'Escalations in 7 days', value: String(metrics.escalations7d), href: ANSWERLATTICE_ROUTES.TICKETS, source: 'friction summary' },
        );
        nextActions.push({ label: 'Open Friction Review', href: ANSWERLATTICE_ROUTES.GOVERNANCE });
    } else if (intent === 'readiness') {
        directAnswer = metrics.coverageRate === null
            ? 'Coverage is not available yet. Let real users ask questions, then review the next nightly summary.'
            : metrics.confirmedResolutionRate === null
                ? `Canonical coverage is ${metrics.coverageRate}% and ${metrics.resolutionRate ?? 0}% of recent queries did not escalate. Explicit solved/not-solved outcomes are not available yet.`
                : `Canonical coverage is ${metrics.coverageRate}% and confirmed resolution is ${metrics.confirmedResolutionRate}%. ${metrics.recontactEligible > 0 ? `${metrics.recontactedSameSession} same-session recontacts were observed across ${metrics.recontactEligible} trackable solved outcomes. ` : ''}${status === 'healthy' ? 'The current summary is stable.' : 'Review gaps before increasing support traffic.'}`;
        evidence.push(
            { label: 'Canonical coverage', value: metrics.coverageRate === null ? 'Not available' : `${metrics.coverageRate}%`, href: ANSWERLATTICE_ROUTES.DASHBOARD, source: 'coverage summary' },
            { label: 'Confirmed resolution', value: metrics.confirmedResolutionRate === null ? 'Not available' : `${metrics.confirmedResolutionRate}%`, href: ANSWERLATTICE_ROUTES.DASHBOARD, source: 'explicit widget outcomes' },
            { label: 'No escalation', value: metrics.resolutionRate === null ? 'Not available' : `${metrics.resolutionRate}%`, href: ANSWERLATTICE_ROUTES.DASHBOARD, source: 'trust summary' },
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

    return {
        id: createRuntimeId('owner_support_answer'),
        status: intent === 'unsupported' ? 'unsupported' : status,
        intent,
        directAnswer,
        evidence,
        nextActions,
        limits: [
            'Uses compact operational summaries, not raw customer conversations.',
            'Does not publish answers, close tickets, or change widget settings.',
            'Open the linked review screen before making a support decision.',
        ],
        readModel: { firestoreReads: packet.cacheHit ? 0 : 6, source: 'summary_only', cacheHit: packet.cacheHit },
    };
};
