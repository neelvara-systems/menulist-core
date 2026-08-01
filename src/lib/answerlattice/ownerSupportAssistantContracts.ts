import {
    ANSWERLATTICE_PERMISSION_KEYS,
    getAnswerlatticeRouteRequiredPermission,
    type AnswerlatticePermissionKey,
} from '@constant/answerlattice/permissions';
import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/routes';
import type {
    AnswerlatticeFrictionLevel,
    AnswerlatticeSupportBoardSummary,
} from '@type/answerlattice';
import { projectAnswerlatticeSupportBoardSummary } from './supportBoardReadBoundary';

export const ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS = [
    'coverage',
    'trust',
    'support_board',
    'friction',
    'knowledge_intake',
    'activation',
] as const;

export type AnswerlatticeOwnerAssistantSourceKey =
    typeof ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS[number];

export type AnswerlatticeOwnerAssistantSourceState =
    | 'available'
    | 'missing'
    | 'invalid'
    | 'stale';

export type AnswerlatticeOwnerAssistantSourceHealth = {
    key: AnswerlatticeOwnerAssistantSourceKey;
    label: string;
    state: AnswerlatticeOwnerAssistantSourceState;
    updatedAt: string | null;
};

export type AnswerlatticeOwnerAssistantSummaryHealth = {
    expectedCount: 6;
    admittedCount: number;
    currentCount: number;
    complete: boolean;
    unavailableSources: string[];
    staleSources: string[];
    oldestUpdatedAt: string | null;
    newestUpdatedAt: string | null;
    sources: AnswerlatticeOwnerAssistantSourceHealth[];
};

export type AnswerlatticeOwnerAssistantCapabilities = {
    canPrepareReviewCard: boolean;
    canRecordProductChange: boolean;
    canViewLaunchVerification: boolean;
};

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

export type AnswerlatticeFounderDailyActionSeverity =
    | 'critical'
    | 'high'
    | 'medium'
    | 'low'
    | 'stable';

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

export type AnswerlatticeOwnerAssistantMetrics = {
    coverageRate: number | null;
    canonicalMisses: number;
    noEscalationRate: number | null;
    confirmedResolutionRate: number | null;
    recontactEligible: number;
    recontactedSameSession: number;
    driftedAnswers: number;
    uncoveredEntities: number;
    openBoardCards: number;
    needsAnswerCards: number;
    highPriorityCards: number;
    reviewItems: number;
    signals7d: number;
    escalations7d: number;
    frictionLevel: AnswerlatticeFrictionLevel | null;
};

export type AnswerlatticeOwnerAssistantAnswer = {
    id: string;
    status: AnswerlatticeOwnerAssistantStatus;
    intent: 'attention' | 'answer_risk' | 'friction' | 'readiness' | 'intake' | 'release' | 'install' | 'reply' | 'cost' | 'unsupported';
    directAnswer: string;
    evidence: AnswerlatticeOwnerAssistantEvidence[];
    nextActions: Array<{ label: string; href: string }>;
    limits: string[];
    summaryHealth: AnswerlatticeOwnerAssistantSummaryHealth;
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
    metrics: AnswerlatticeOwnerAssistantMetrics;
    promptChips: string[];
    launchVerification: AnswerlatticeLaunchVerification;
    dailyBrief?: AnswerlatticeFounderDailyBrief;
    summaryHealth: AnswerlatticeOwnerAssistantSummaryHealth;
    capabilities: AnswerlatticeOwnerAssistantCapabilities;
    updatedAt: string | null;
    readModel: {
        firestoreReads: number;
        source: 'summary_only';
        cacheHit: boolean;
    };
};

export type AnswerlatticeOwnerAssistantPermissionMap =
    Record<AnswerlatticePermissionKey, boolean>;

const STATUS_VALUES = new Set<AnswerlatticeOwnerAssistantStatus>([
    'healthy',
    'needs_review',
    'at_risk',
    'insufficient_data',
    'unsupported',
]);
const INTENT_VALUES = new Set<AnswerlatticeOwnerAssistantAnswer['intent']>([
    'attention',
    'answer_risk',
    'friction',
    'readiness',
    'intake',
    'release',
    'install',
    'reply',
    'cost',
    'unsupported',
]);
const SOURCE_STATES = new Set<AnswerlatticeOwnerAssistantSourceState>([
    'available',
    'missing',
    'invalid',
    'stale',
]);
const DAILY_ACTION_CATEGORIES = new Set<AnswerlatticeFounderDailyActionCategory>([
    'answer_review',
    'needs_answer',
    'intake_review',
    'release_safety',
    'support_reply',
    'launch_safety',
    'cost_guard',
]);
const DAILY_ACTION_SEVERITIES = new Set<AnswerlatticeFounderDailyActionSeverity>([
    'critical',
    'high',
    'medium',
    'low',
    'stable',
]);
const DAILY_BRIEF_FOCUS_VALUES = new Set<AnswerlatticeFounderDailyBrief['focus']>([
    'review',
    'stabilize',
    'launch',
    'maintain',
]);
const KNOWN_ROUTE_ROOTS = Object.values(ANSWERLATTICE_ROUTES);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isBoundedString = (value: unknown, maxLength: number): value is string => (
    typeof value === 'string' && value.length > 0 && value.length <= maxLength
);

const isNullableIso = (value: unknown): value is string | null => {
    if (value === null) return true;
    if (typeof value !== 'string' || value.length > 40) return false;
    const millis = Date.parse(value);
    return Number.isFinite(millis) && new Date(millis).toISOString() === value;
};

const isCount = (value: unknown, maximum = 1_000_000): value is number => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= maximum
);

const isPercentageOrNull = (value: unknown): value is number | null => (
    value === null
    || (
        typeof value === 'number'
        && Number.isFinite(value)
        && value >= 0
        && value <= 100
    )
);

const toTimestampIso = (value: unknown): string | null => {
    if (typeof value === 'string') {
        const millis = Date.parse(value);
        return Number.isFinite(millis) ? new Date(millis).toISOString() : null;
    }
    if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString() : null;
    if (!isRecord(value) || typeof value.toDate !== 'function') return null;
    try {
        const date = (value.toDate as () => unknown)();
        return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch {
        return null;
    }
};

export const isAnswerlatticeOwnerAssistantRoute = (value: unknown): value is string => {
    if (typeof value !== 'string' || value.length < 15 || value.length > 500) return false;
    const path = value.split(/[?#]/, 1)[0];
    return path.startsWith('/answerlattice/')
        && !path.startsWith('//')
        && !path.includes('\\')
        && !path.split('/').includes('..')
        && KNOWN_ROUTE_ROOTS.some(route => path === route || path.startsWith(`${route}/`));
};

export const canUseAnswerlatticeOwnerAssistantRoute = (
    href: string,
    permissions: AnswerlatticeOwnerAssistantPermissionMap,
): boolean => {
    if (!isAnswerlatticeOwnerAssistantRoute(href)) return false;
    const pathname = href.split(/[?#]/, 1)[0];
    const requiredPermission = getAnswerlatticeRouteRequiredPermission(pathname);
    return !requiredPermission || permissions[requiredPermission] === true;
};

export const buildAnswerlatticeOwnerAssistantCapabilities = (
    permissions: AnswerlatticeOwnerAssistantPermissionMap,
): AnswerlatticeOwnerAssistantCapabilities => ({
    canPrepareReviewCard: permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT] === true,
    canRecordProductChange: permissions[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE] === true,
    canViewLaunchVerification: permissions[ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS] === true,
});

export const parseAnswerlatticeOwnerAssistantSupportBoardSummary = (
    value: unknown,
    scope: { tenantId: number; storeId: number },
): AnswerlatticeSupportBoardSummary | null => projectAnswerlatticeSupportBoardSummary(value, {
    sId: scope.storeId,
    tId: scope.tenantId,
});

export const getAnswerlatticeOwnerAssistantStatus = (
    metrics: AnswerlatticeOwnerAssistantMetrics,
    summaryHealth: AnswerlatticeOwnerAssistantSummaryHealth,
): AnswerlatticeOwnerAssistantStatus => {
    const recontactRate = metrics.recontactEligible > 0
        ? Math.round((metrics.recontactedSameSession / metrics.recontactEligible) * 100)
        : 0;
    const hasFailedOutcomeEvidence = (
        (metrics.confirmedResolutionRate !== null && metrics.confirmedResolutionRate < 70)
        || (metrics.recontactEligible >= 3 && recontactRate >= 30)
    );
    const hasCoverageRepairEvidence = (
        metrics.coverageRate !== null
        && metrics.coverageRate < 50
        && (
            metrics.canonicalMisses > 0
            || metrics.uncoveredEntities > 0
            || metrics.highPriorityCards > 0
            || metrics.needsAnswerCards > 0
            || metrics.driftedAnswers > 0
        )
    );

    if (metrics.driftedAnswers > 2) {
        return 'at_risk';
    }
    if (
        metrics.driftedAnswers > 0
        || metrics.highPriorityCards > 0
        || metrics.needsAnswerCards > 0
        || hasFailedOutcomeEvidence
        || metrics.frictionLevel === 'HIGH'
        || metrics.escalations7d > 0
        || hasCoverageRepairEvidence
    ) {
        return 'needs_review';
    }
    if (
        !summaryHealth.complete
        || (
            metrics.coverageRate === null
            && metrics.noEscalationRate === null
            && metrics.openBoardCards === 0
            && metrics.reviewItems === 0
        )
    ) {
        return 'insufficient_data';
    }
    return 'healthy';
};

const isSourceHealth = (value: unknown): value is AnswerlatticeOwnerAssistantSourceHealth => (
    isRecord(value)
    && ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.includes(
        value.key as AnswerlatticeOwnerAssistantSourceKey,
    )
    && isBoundedString(value.label, 80)
    && SOURCE_STATES.has(value.state as AnswerlatticeOwnerAssistantSourceState)
    && isNullableIso(value.updatedAt)
);

const isSummaryHealth = (value: unknown): value is AnswerlatticeOwnerAssistantSummaryHealth => {
    if (
        !isRecord(value)
        || value.expectedCount !== ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length
        || !isCount(value.admittedCount, ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length)
        || !isCount(value.currentCount, ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length)
        || Number(value.currentCount) > Number(value.admittedCount)
        || typeof value.complete !== 'boolean'
        || !Array.isArray(value.unavailableSources)
        || value.unavailableSources.length > ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length
        || !value.unavailableSources.every(entry => isBoundedString(entry, 80))
        || !Array.isArray(value.staleSources)
        || value.staleSources.length > ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length
        || !value.staleSources.every(entry => isBoundedString(entry, 80))
        || !isNullableIso(value.oldestUpdatedAt)
        || !isNullableIso(value.newestUpdatedAt)
        || !Array.isArray(value.sources)
        || value.sources.length !== ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length
        || !value.sources.every(isSourceHealth)
    ) return false;

    const sourceKeys = value.sources.map(source => source.key);
    const unavailableSources = value.sources
        .filter(source => source.state === 'missing' || source.state === 'invalid')
        .map(source => source.label);
    const staleSources = value.sources
        .filter(source => source.state === 'stale')
        .map(source => source.label);
    const admittedCount = value.sources.filter(source => (
        source.state === 'available' || source.state === 'stale'
    )).length;
    const currentCount = value.sources.filter(source => source.state === 'available').length;
    return new Set(sourceKeys).size === ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.length
        && value.admittedCount === admittedCount
        && value.currentCount === currentCount
        && value.unavailableSources.length === unavailableSources.length
        && value.unavailableSources.every((label, index) => label === unavailableSources[index])
        && value.staleSources.length === staleSources.length
        && value.staleSources.every((label, index) => label === staleSources[index])
        && value.complete === (
            value.currentCount === value.expectedCount
            && value.unavailableSources.length === 0
            && value.staleSources.length === 0
        );
};

const isMetrics = (value: unknown): value is AnswerlatticeOwnerAssistantMetrics => (
    isRecord(value)
    && isPercentageOrNull(value.coverageRate)
    && isCount(value.canonicalMisses)
    && isPercentageOrNull(value.noEscalationRate)
    && isPercentageOrNull(value.confirmedResolutionRate)
    && [
        value.recontactEligible,
        value.recontactedSameSession,
        value.driftedAnswers,
        value.uncoveredEntities,
        value.openBoardCards,
        value.needsAnswerCards,
        value.highPriorityCards,
        value.reviewItems,
        value.signals7d,
        value.escalations7d,
    ].every(entry => isCount(entry))
    && (
        value.frictionLevel === null
        || value.frictionLevel === 'LOW'
        || value.frictionLevel === 'MODERATE'
        || value.frictionLevel === 'HIGH'
    )
    && Number(value.recontactedSameSession) <= Number(value.recontactEligible)
    && Number(value.needsAnswerCards) <= Number(value.openBoardCards)
    && Number(value.highPriorityCards) <= Number(value.openBoardCards)
);

const isReadModel = (value: unknown): boolean => (
    isRecord(value)
    && isCount(value.firestoreReads, 6)
    && value.source === 'summary_only'
    && typeof value.cacheHit === 'boolean'
    && value.firestoreReads === (value.cacheHit ? 0 : 6)
);

const isEvidence = (value: unknown): value is AnswerlatticeOwnerAssistantEvidence => (
    isRecord(value)
    && isBoundedString(value.label, 120)
    && isBoundedString(value.value, 500)
    && isAnswerlatticeOwnerAssistantRoute(value.href)
    && isBoundedString(value.source, 120)
);

const isNextAction = (value: unknown): value is { label: string; href: string } => (
    isRecord(value)
    && isBoundedString(value.label, 120)
    && isAnswerlatticeOwnerAssistantRoute(value.href)
);

const isCapabilities = (value: unknown): value is AnswerlatticeOwnerAssistantCapabilities => (
    isRecord(value)
    && typeof value.canPrepareReviewCard === 'boolean'
    && typeof value.canRecordProductChange === 'boolean'
    && typeof value.canViewLaunchVerification === 'boolean'
);

const isLaunchVerification = (value: unknown): value is AnswerlatticeLaunchVerification => (
    isRecord(value)
    && typeof value.available === 'boolean'
    && typeof value.ready === 'boolean'
    && isCount(value.completeCount, 20)
    && isCount(value.totalCount, 20)
    && Number(value.completeCount) <= Number(value.totalCount)
    && Array.isArray(value.blockers)
    && value.blockers.length <= 6
    && value.blockers.every(entry => isBoundedString(entry, 120))
    && (value.nextActionLabel === null || isBoundedString(value.nextActionLabel, 80))
    && isAnswerlatticeOwnerAssistantRoute(value.nextActionRoute)
    && isNullableIso(value.verifiedAt)
);

const isDailyAction = (value: unknown): value is AnswerlatticeFounderDailyAction => (
    isRecord(value)
    && isBoundedString(value.id, 100)
    && DAILY_ACTION_CATEGORIES.has(value.category as AnswerlatticeFounderDailyActionCategory)
    && DAILY_ACTION_SEVERITIES.has(value.severity as AnswerlatticeFounderDailyActionSeverity)
    && isBoundedString(value.title, 180)
    && isBoundedString(value.description, 1_200)
    && isBoundedString(value.reason, 1_000)
    && isAnswerlatticeOwnerAssistantRoute(value.href)
    && isBoundedString(value.cta, 100)
    && isBoundedString(value.source, 120)
    && isBoundedString(value.aiAssist, 500)
    && isBoundedString(value.costImpact, 500)
    && (
        value.preparedReviewCard === undefined
        || (
            isRecord(value.preparedReviewCard)
            && isBoundedString(value.preparedReviewCard.title, 180)
            && isBoundedString(value.preparedReviewCard.description, 1_200)
            && ['low', 'medium', 'high'].includes(String(value.preparedReviewCard.priority))
            && Array.isArray(value.preparedReviewCard.tags)
            && value.preparedReviewCard.tags.length <= 8
            && value.preparedReviewCard.tags.every(tag => isBoundedString(tag, 48))
        )
    )
);

const isDailyBrief = (value: unknown): value is AnswerlatticeFounderDailyBrief => {
    if (
        !isRecord(value)
        || value.enabled !== true
        || !isBoundedString(value.headline, 240)
        || !isBoundedString(value.summary, 600)
        || !DAILY_BRIEF_FOCUS_VALUES.has(value.focus as AnswerlatticeFounderDailyBrief['focus'])
        || !Array.isArray(value.actions)
        || value.actions.length > 4
        || !value.actions.every(isDailyAction)
        || !isBoundedString(value.costNote, 500)
        || !isBoundedString(value.sourceNote, 500)
    ) return false;

    const actionIds = value.actions.map(action => action.id);
    return new Set(actionIds).size === actionIds.length;
};

export const isAnswerlatticeOwnerAssistantBrief = (
    value: unknown,
): value is AnswerlatticeOwnerAssistantBrief => (
    isRecord(value)
    && STATUS_VALUES.has(value.status as AnswerlatticeOwnerAssistantStatus)
    && value.status !== 'unsupported'
    && isBoundedString(value.headline, 500)
    && isCount(value.attentionCount)
    && isMetrics(value.metrics)
    && Array.isArray(value.promptChips)
    && value.promptChips.length <= 12
    && value.promptChips.every(entry => isBoundedString(entry, 120))
    && isLaunchVerification(value.launchVerification)
    && (
        value.dailyBrief === undefined
        || (
            isDailyBrief(value.dailyBrief)
            && value.attentionCount === value.dailyBrief.actions.length
        )
    )
    && isSummaryHealth(value.summaryHealth)
    && isCapabilities(value.capabilities)
    && isNullableIso(value.updatedAt)
    && isReadModel(value.readModel)
);

export const isAnswerlatticeOwnerAssistantAnswer = (
    value: unknown,
): value is AnswerlatticeOwnerAssistantAnswer => (
    isRecord(value)
    && isBoundedString(value.id, 180)
    && STATUS_VALUES.has(value.status as AnswerlatticeOwnerAssistantStatus)
    && INTENT_VALUES.has(value.intent as AnswerlatticeOwnerAssistantAnswer['intent'])
    && isBoundedString(value.directAnswer, 2_000)
    && Array.isArray(value.evidence)
    && value.evidence.length <= 8
    && value.evidence.every(isEvidence)
    && Array.isArray(value.nextActions)
    && value.nextActions.length <= 6
    && value.nextActions.every(isNextAction)
    && Array.isArray(value.limits)
    && value.limits.length <= 6
    && value.limits.every(entry => isBoundedString(entry, 500))
    && isSummaryHealth(value.summaryHealth)
    && isReadModel(value.readModel)
);

export const isAnswerlatticeOwnerAssistantBriefResponse = (
    value: unknown,
): value is { brief: AnswerlatticeOwnerAssistantBrief } => (
    isRecord(value) && isAnswerlatticeOwnerAssistantBrief(value.brief)
);

export const isAnswerlatticeOwnerAssistantQueryResponse = (
    value: unknown,
): value is { answer: AnswerlatticeOwnerAssistantAnswer } => (
    isRecord(value) && isAnswerlatticeOwnerAssistantAnswer(value.answer)
);
