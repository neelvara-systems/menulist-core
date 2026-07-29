import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    ANSWERLATTICE_PERMISSION_KEYS,
} from '@constant/answerlattice/permissions';
import { ANSWERLATTICE_ROUTES } from '@constant/answerlattice/routes';
import {
    ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS,
    buildAnswerlatticeOwnerAssistantCapabilities,
    canUseAnswerlatticeOwnerAssistantRoute,
    getAnswerlatticeOwnerAssistantStatus,
    isAnswerlatticeOwnerAssistantAnswer,
    isAnswerlatticeOwnerAssistantBrief,
    isAnswerlatticeOwnerAssistantBriefResponse,
    isAnswerlatticeOwnerAssistantQueryResponse,
    isAnswerlatticeOwnerAssistantRoute,
    parseAnswerlatticeOwnerAssistantSupportBoardSummary,
    type AnswerlatticeOwnerAssistantMetrics,
    type AnswerlatticeOwnerAssistantPermissionMap,
    type AnswerlatticeOwnerAssistantSummaryHealth,
} from '@lib/answerlattice/ownerSupportAssistantContracts';
import {
    getAnswerlatticeAnswerContextRoute,
    getAnswerlatticeEntityContextRoute,
    getAnswerlatticeReleaseContextRoute,
    normalizeAnswerlatticeOwnerReleaseContext,
} from '@lib/answerlattice/ownerDecisionNavigation';

const createPermissionMap = (
    enabled: Array<keyof AnswerlatticeOwnerAssistantPermissionMap>,
): AnswerlatticeOwnerAssistantPermissionMap => (
    Object.fromEntries(
        ANSWERLATTICE_ALL_PERMISSIONS.map(permission => [
            permission,
            enabled.includes(permission),
        ]),
    ) as AnswerlatticeOwnerAssistantPermissionMap
);

const supportOnly = createPermissionMap([
    ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
]);
const owner = createPermissionMap(ANSWERLATTICE_ALL_PERMISSIONS);

assert.equal(
    getAnswerlatticeEntityContextRoute(`${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction`, 'billing'),
    `${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction?entity=billing`,
);
assert.equal(
    getAnswerlatticeAnswerContextRoute(`${ANSWERLATTICE_ROUTES.GOVERNANCE}/answers`, 'answer one'),
    `${ANSWERLATTICE_ROUTES.GOVERNANCE}/answers?answer=answer%20one`,
);
assert.equal(
    getAnswerlatticeReleaseContextRoute(ANSWERLATTICE_ROUTES.ANSWER_TESTS, 'release_1'),
    `${ANSWERLATTICE_ROUTES.ANSWER_TESTS}?release=release_1`,
);
assert.equal(
    getAnswerlatticeEntityContextRoute(`${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction`, 'invalid/entity'),
    `${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction`,
    'unsafe entity context must be omitted',
);
assert.equal(
    getAnswerlatticeEntityContextRoute(
        `${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction?entity=stale&view=graph#selected`,
        'billing',
    ),
    `${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction?entity=billing&view=graph#selected`,
    'owner navigation must replace stale same-key context without losing other query/hash state',
);
assert.equal(
    normalizeAnswerlatticeOwnerReleaseContext('x'.repeat(181)),
    null,
    'owner navigation must cap release context',
);

for (const route of [
    ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT,
    ANSWERLATTICE_ROUTES.SUPPORT_BOARD,
    ANSWERLATTICE_ROUTES.TICKETS,
]) {
    assert.equal(canUseAnswerlatticeOwnerAssistantRoute(route, supportOnly), true);
}
assert.equal(
    canUseAnswerlatticeOwnerAssistantRoute(
        getAnswerlatticeEntityContextRoute(`${ANSWERLATTICE_ROUTES.GOVERNANCE}/friction`, 'billing'),
        owner,
    ),
    true,
    'validated owner context must preserve route permission checks',
);
for (const route of [
    ANSWERLATTICE_ROUTES.GOVERNANCE,
    ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE,
    ANSWERLATTICE_ROUTES.ACTIVATION,
    ANSWERLATTICE_ROUTES.BILLING,
    ANSWERLATTICE_ROUTES.CHANGELOG,
]) {
    assert.equal(canUseAnswerlatticeOwnerAssistantRoute(route, supportOnly), false);
    assert.equal(canUseAnswerlatticeOwnerAssistantRoute(route, owner), true);
}
assert.equal(isAnswerlatticeOwnerAssistantRoute('/answerlattice/not-a-real-surface'), false);
assert.equal(isAnswerlatticeOwnerAssistantRoute('https://example.com/answerlattice/tickets'), false);
assert.equal(isAnswerlatticeOwnerAssistantRoute('/answerlattice/tickets/../billing'), false);

assert.deepEqual(buildAnswerlatticeOwnerAssistantCapabilities(supportOnly), {
    canPrepareReviewCard: true,
    canRecordProductChange: false,
    canViewLaunchVerification: false,
});
assert.deepEqual(buildAnswerlatticeOwnerAssistantCapabilities(owner), {
    canPrepareReviewCard: true,
    canRecordProductChange: true,
    canViewLaunchVerification: true,
});

const validSupportBoard = {
    pId: 'AL',
    tId: 7,
    sId: 9,
    schemaVersion: 1,
    openCards: 3,
    needsAnswerCards: 2,
    highPriorityCards: 1,
    totalRecentCards: 5,
    lastUpdated: {
        toDate: () => new Date('2026-07-19T00:00:00.000Z'),
    },
    breakdownFresh: true,
    sourceWindowsSaturated: false,
};
assert.ok(parseAnswerlatticeOwnerAssistantSupportBoardSummary(
    validSupportBoard,
    { tenantId: 7, storeId: 9 },
));
assert.equal(parseAnswerlatticeOwnerAssistantSupportBoardSummary(
    { ...validSupportBoard, tId: 8 },
    { tenantId: 7, storeId: 9 },
), null, 'cross-workspace summaries must fail closed');
assert.equal(parseAnswerlatticeOwnerAssistantSupportBoardSummary(
    { ...validSupportBoard, needsAnswerCards: 4 },
    { tenantId: 7, storeId: 9 },
), null, 'needs-answer cards cannot exceed open cards');
assert.equal(parseAnswerlatticeOwnerAssistantSupportBoardSummary(
    { ...validSupportBoard, openCards: 0, needsAnswerCards: 0 },
    { tenantId: 7, storeId: 9 },
), null, 'resolved high-priority cards cannot create current owner work');
assert.equal(parseAnswerlatticeOwnerAssistantSupportBoardSummary(
    { ...validSupportBoard, lastUpdated: 'not-a-date' },
    { tenantId: 7, storeId: 9 },
), null, 'malformed timestamps must fail closed');

const sourceLabels = {
    coverage: 'Coverage',
    trust: 'Answer evidence',
    support_board: 'Support Board',
    friction: 'Support friction',
    knowledge_intake: 'Knowledge Intake',
    activation: 'Activation',
} as const;
const createSummaryHealth = (
    state: 'available' | 'missing' | 'invalid' | 'stale' = 'available',
): AnswerlatticeOwnerAssistantSummaryHealth => {
    const sources = ANSWERLATTICE_OWNER_ASSISTANT_SOURCE_KEYS.map(key => ({
        key,
        label: sourceLabels[key],
        state,
        updatedAt: state === 'missing' || state === 'invalid'
            ? null
            : '2026-07-19T00:00:00.000Z',
    }));
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
        expectedCount: 6,
        admittedCount,
        currentCount,
        complete: currentCount === 6 && unavailableSources.length === 0 && staleSources.length === 0,
        unavailableSources,
        staleSources,
        oldestUpdatedAt: admittedCount > 0 ? '2026-07-19T00:00:00.000Z' : null,
        newestUpdatedAt: admittedCount > 0 ? '2026-07-19T00:00:00.000Z' : null,
        sources,
    };
};

const noActivityMetrics: AnswerlatticeOwnerAssistantMetrics = {
    coverageRate: null,
    canonicalMisses: 0,
    noEscalationRate: null,
    confirmedResolutionRate: null,
    recontactEligible: 0,
    recontactedSameSession: 0,
    driftedAnswers: 0,
    uncoveredEntities: 0,
    openBoardCards: 0,
    needsAnswerCards: 0,
    highPriorityCards: 0,
    reviewItems: 0,
    signals7d: 0,
    escalations7d: 0,
    frictionLevel: null,
};
assert.equal(
    getAnswerlatticeOwnerAssistantStatus(noActivityMetrics, createSummaryHealth()),
    'insufficient_data',
    'complete but empty evidence is not proof of healthy support',
);
assert.equal(
    getAnswerlatticeOwnerAssistantStatus(
        { ...noActivityMetrics, coverageRate: 100, noEscalationRate: 100 },
        createSummaryHealth(),
    ),
    'healthy',
);
assert.equal(
    getAnswerlatticeOwnerAssistantStatus(
        { ...noActivityMetrics, coverageRate: 100, noEscalationRate: 100 },
        createSummaryHealth('missing'),
    ),
    'insufficient_data',
);
assert.equal(
    getAnswerlatticeOwnerAssistantStatus(
        { ...noActivityMetrics, uncoveredEntities: 1 },
        createSummaryHealth('missing'),
    ),
    'insufficient_data',
    'count-only uncovered coverage is not a critical owner action',
);
assert.equal(
    getAnswerlatticeOwnerAssistantStatus(
        { ...noActivityMetrics, needsAnswerCards: 1, openBoardCards: 1 },
        createSummaryHealth('stale'),
    ),
    'needs_review',
);
assert.equal(
    getAnswerlatticeOwnerAssistantStatus(
        {
            ...noActivityMetrics,
            openBoardCards: 1,
            highPriorityCards: 1,
        },
        createSummaryHealth(),
    ),
    'needs_review',
    'qualified high-priority Support Board work must be visible',
);
assert.equal(
    getAnswerlatticeOwnerAssistantStatus(
        {
            ...noActivityMetrics,
            coverageRate: 100,
            noEscalationRate: 100,
            signals7d: 10,
            frictionLevel: 'MODERATE',
        },
        createSummaryHealth(),
    ),
    'healthy',
    'ordinary friction signals do not displace the quiet state',
);
assert.equal(
    getAnswerlatticeOwnerAssistantStatus(
        {
            ...noActivityMetrics,
            signals7d: 10,
            frictionLevel: 'HIGH',
        },
        createSummaryHealth(),
    ),
    'needs_review',
    'high measured friction qualifies for owner review',
);

const validMetrics: AnswerlatticeOwnerAssistantMetrics = {
    ...noActivityMetrics,
    coverageRate: 100,
    noEscalationRate: 100,
    confirmedResolutionRate: 100,
    recontactEligible: 2,
};
const validBrief = {
    status: 'healthy',
    headline: 'Support looks stable.',
    attentionCount: 1,
    metrics: validMetrics,
    promptChips: ['What needs my attention today?'],
    launchVerification: {
        available: false,
        ready: false,
        completeCount: 0,
        totalCount: 0,
        blockers: [],
        nextActionLabel: null,
        nextActionRoute: ANSWERLATTICE_ROUTES.ACTIVATION,
        verifiedAt: null,
    },
    dailyBrief: {
        enabled: true,
        headline: 'Review prepared support work.',
        summary: 'Start with the first support action.',
        focus: 'review',
        actions: [{
            id: 'review-support',
            category: 'needs_answer',
            severity: 'high',
            title: 'Review repeated gaps',
            description: 'Two repeated questions need an approved answer.',
            reason: 'Repeated gaps interrupt the founder.',
            href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD,
            cta: 'Open Support Board',
            source: 'Support Board summary',
            aiAssist: 'Drafts remain review-only.',
            costImpact: 'No model call.',
            preparedReviewCard: {
                title: 'Review repeated gaps',
                description: 'Approve or reject the prepared answer.',
                priority: 'high',
                tags: ['support', 'review'],
            },
        }],
        costNote: 'No model call.',
        sourceNote: 'Six admitted summaries.',
    },
    summaryHealth: createSummaryHealth(),
    capabilities: buildAnswerlatticeOwnerAssistantCapabilities(owner),
    updatedAt: '2026-07-19T00:00:00.000Z',
    readModel: {
        firestoreReads: 6,
        source: 'summary_only',
        cacheHit: false,
    },
};
assert.equal(isAnswerlatticeOwnerAssistantBrief(validBrief), true);
assert.equal(isAnswerlatticeOwnerAssistantBriefResponse({ brief: validBrief }), true);
assert.equal(isAnswerlatticeOwnerAssistantBrief({
    ...validBrief,
    attentionCount: 0,
}), false, 'attention count must equal the permission-filtered daily action count');
assert.equal(isAnswerlatticeOwnerAssistantBrief({
    ...validBrief,
    status: 'healthy',
    headline: 'Nothing needs your decision right now.',
    attentionCount: 0,
    dailyBrief: {
        ...validBrief.dailyBrief,
        headline: 'Nothing needs your decision right now',
        summary: 'No current answer risk, qualified support gap, or launch blocker is visible in the latest summaries.',
        focus: 'maintain',
        actions: [],
    },
}), true, 'a complete healthy packet may return a true zero-action quiet state');
assert.equal(isAnswerlatticeOwnerAssistantBrief({
    ...validBrief,
    dailyBrief: {
        ...validBrief.dailyBrief,
        actions: [{
            ...validBrief.dailyBrief.actions[0],
            category: 'arbitrary_action',
        }],
    },
}), false);
assert.equal(isAnswerlatticeOwnerAssistantBrief({
    ...validBrief,
    dailyBrief: {
        ...validBrief.dailyBrief,
        actions: [{
            ...validBrief.dailyBrief.actions[0],
            preparedReviewCard: {
                ...validBrief.dailyBrief.actions[0].preparedReviewCard,
                tags: ['x'.repeat(49)],
            },
        }],
    },
}), false);
assert.equal(isAnswerlatticeOwnerAssistantBrief({
    ...validBrief,
    summaryHealth: {
        ...validBrief.summaryHealth,
        admittedCount: 5,
    },
}), false, 'derived summary-health counters must reconcile');
assert.equal(isAnswerlatticeOwnerAssistantBrief({
    ...validBrief,
    readModel: { firestoreReads: 6, source: 'summary_only', cacheHit: true },
}), false, 'cache hits cannot claim Firestore reads');

const validAnswer = {
    id: 'owner_support_answer_123',
    status: 'needs_review',
    intent: 'attention',
    directAnswer: 'Review the two support gaps first.',
    evidence: [{
        label: 'Support Board',
        value: '2 gaps',
        href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD,
        source: 'Support Board summary',
    }],
    nextActions: [{
        label: 'Open Support Board',
        href: ANSWERLATTICE_ROUTES.SUPPORT_BOARD,
    }],
    limits: ['Open the linked review screen before making a support decision.'],
    summaryHealth: createSummaryHealth(),
    readModel: {
        firestoreReads: 0,
        source: 'summary_only',
        cacheHit: true,
    },
};
assert.equal(isAnswerlatticeOwnerAssistantAnswer(validAnswer), true);
assert.equal(isAnswerlatticeOwnerAssistantQueryResponse({ answer: validAnswer }), true);
assert.equal(isAnswerlatticeOwnerAssistantAnswer({
    ...validAnswer,
    evidence: [{
        ...validAnswer.evidence[0],
        href: 'https://example.com/answerlattice/support-board',
    }],
}), false);
assert.equal(isAnswerlatticeOwnerAssistantAnswer({
    ...validAnswer,
    nextActions: [{
        label: 'Unknown',
        href: '/answerlattice/not-a-real-surface',
    }],
}), false);

process.stdout.write('Answerlattice Owner Support Assistant contracts passed.\n');
