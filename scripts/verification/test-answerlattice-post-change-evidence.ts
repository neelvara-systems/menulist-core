import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_POST_CHANGE_LIMITATIONS,
    ANSWERLATTICE_POST_CHANGE_MIN_BASELINE_EVENTS,
    ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT,
    AnswerlatticePostChangeCandidateListResponseSchema,
    AnswerlatticePostChangeReviewResponseSchema,
    buildAnswerlatticePostChangeBreakdown,
    buildAnswerlatticePostChangeComparison,
    buildAnswerlatticePostChangeWindowPlan,
} from '../../src/lib/answerlattice/postChangeEvidence';

const changeMillis = Date.parse('2026-07-10T15:45:00.000Z');
const eligibleMillis = Date.parse('2026-07-25T00:00:00.000Z');
const readyPlan = buildAnswerlatticePostChangeWindowPlan(changeMillis, eligibleMillis);
assert.ok(readyPlan);
assert.equal(readyPlan.status, 'query_ready');
assert.equal(readyPlan.excludedUtcDate, '2026-07-10');
assert.deepEqual(readyPlan.beforeWindow, {
    startAt: '2026-06-26T00:00:00.000Z',
    endAt: '2026-07-10T00:00:00.000Z',
    startDate: '2026-06-26',
    endDate: '2026-07-09',
});
assert.deepEqual(readyPlan.afterWindow, {
    startAt: '2026-07-11T00:00:00.000Z',
    endAt: '2026-07-25T00:00:00.000Z',
    startDate: '2026-07-11',
    endDate: '2026-07-24',
});
assert.equal(readyPlan.eligibleAt, '2026-07-25T00:00:00.000Z');

const waitingPlan = buildAnswerlatticePostChangeWindowPlan(
    changeMillis,
    eligibleMillis - 1,
);
assert.equal(waitingPlan?.status, 'waiting_for_post_window');
assert.equal(
    buildAnswerlatticePostChangeWindowPlan(changeMillis, eligibleMillis)?.status,
    'query_ready',
    'the after-window end instant must be eligible',
);

const outsideRetentionPlan = buildAnswerlatticePostChangeWindowPlan(
    Date.parse('2025-06-01T12:00:00.000Z'),
    Date.parse('2026-08-10T12:00:00.000Z'),
);
assert.equal(outsideRetentionPlan?.status, 'outside_retention');
assert.equal(
    buildAnswerlatticePostChangeWindowPlan(
        Date.parse('2026-08-10T12:10:01.000Z'),
        Date.parse('2026-08-10T12:00:00.000Z'),
    ),
    null,
    'future change times outside tolerance must fail closed',
);
assert.equal(buildAnswerlatticePostChangeWindowPlan(Number.NaN, eligibleMillis), null);

const before = buildAnswerlatticePostChangeBreakdown([
    'ticket',
    'ticket',
    'ticket',
    'chat_negative',
    'escalation',
    'canonical_miss',
    null,
]);
assert.deepEqual(before, {
    total: 5,
    ticketCount: 3,
    chatNegativeCount: 1,
    escalationCount: 1,
});
assert.equal(before.total, ANSWERLATTICE_POST_CHANGE_MIN_BASELINE_EVENTS);

const lower = buildAnswerlatticePostChangeComparison(
    before,
    buildAnswerlatticePostChangeBreakdown(['ticket', 'chat_negative']),
);
assert.equal(lower.status, 'ready');
assert.equal(lower.comparison.eventDelta, -3);
assert.equal(lower.comparison.relativeChangePercent, -60);
assert.equal(lower.comparison.direction, 'lower_observed');

const same = buildAnswerlatticePostChangeComparison(before, before);
assert.equal(same.status, 'ready');
assert.equal(same.comparison.relativeChangePercent, 0);
assert.equal(same.comparison.direction, 'same_observed');

const higher = buildAnswerlatticePostChangeComparison(
    before,
    buildAnswerlatticePostChangeBreakdown([
        'ticket',
        'ticket',
        'ticket',
        'ticket',
        'chat_negative',
        'escalation',
        'escalation',
    ]),
);
assert.equal(higher.status, 'ready');
assert.equal(higher.comparison.eventDelta, 2);
assert.equal(higher.comparison.relativeChangePercent, 40);
assert.equal(higher.comparison.direction, 'higher_observed');

const noAfter = buildAnswerlatticePostChangeComparison(
    before,
    buildAnswerlatticePostChangeBreakdown([]),
);
assert.equal(noAfter.comparison.relativeChangePercent, -100);
assert.equal(noAfter.comparison.direction, 'lower_observed');

const insufficient = buildAnswerlatticePostChangeComparison(
    buildAnswerlatticePostChangeBreakdown(['ticket', 'ticket', 'chat_negative', 'escalation']),
    buildAnswerlatticePostChangeBreakdown([]),
);
assert.equal(insufficient.status, 'insufficient_evidence');
assert.equal(insufficient.comparison.direction, null);
assert.equal(insufficient.comparison.relativeChangePercent, null);

assert.throws(
    () => buildAnswerlatticePostChangeBreakdown(
        Array.from({ length: ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT + 1 }, () => 'ticket'),
    ),
    'an over-cap breakdown must not enter the response contract',
);

const candidates = AnswerlatticePostChangeCandidateListResponseSchema.parse({
    schemaVersion: 1,
    mode: 'list',
    generatedAt: '2026-08-10T12:00:00.000Z',
    candidates: [
        {
            changeId: 'release_2_1',
            changeType: 'release',
            label: 'Release v2.1',
            changedAt: '2026-08-09T12:00:00.000Z',
            entityCount: 2,
        },
        {
            changeId: 'proposal_12',
            changeType: 'knowledge_correction',
            label: 'Answer content correction',
            changedAt: '2026-08-08T12:00:00.000Z',
            entityCount: 1,
        },
    ],
});
assert.equal(candidates.candidates.length, 2);
for (const malformed of [
    { ...candidates, unexpected: true },
    { ...candidates, candidates: [candidates.candidates[1], candidates.candidates[0]] },
    { ...candidates, candidates: [candidates.candidates[0], candidates.candidates[0]] },
]) {
    assert.equal(
        AnswerlatticePostChangeCandidateListResponseSchema.safeParse(malformed).success,
        false,
        'candidate responses must reject unknown fields, wrong ordering, and duplicate identities',
    );
}

const readyResponse = AnswerlatticePostChangeReviewResponseSchema.parse({
    schemaVersion: 1,
    mode: 'review',
    generatedAt: '2026-07-25T00:00:00.000Z',
    change: candidates.candidates[0],
    status: 'ready',
    mappingScope: 'direct_entity_links_only',
    excludedUtcDate: readyPlan.excludedUtcDate,
    eligibleAt: readyPlan.eligibleAt,
    beforeWindow: readyPlan.beforeWindow,
    afterWindow: readyPlan.afterWindow,
    sourceCapPerWindow: ANSWERLATTICE_POST_CHANGE_SIGNAL_LIMIT,
    comparison: lower.comparison,
    limitations: [...ANSWERLATTICE_POST_CHANGE_LIMITATIONS],
});
assert.equal(readyResponse.comparison?.direction, 'lower_observed');
for (const malformed of [
    { ...readyResponse, unexpected: true },
    { ...readyResponse, status: 'waiting_for_post_window' },
    { ...readyResponse, eligibleAt: '2026-07-26T00:00:00.000Z' },
    { ...readyResponse, comparison: { ...readyResponse.comparison, eventDelta: -2 } },
    { ...readyResponse, limitations: readyResponse.limitations.slice(0, 2) },
]) {
    assert.equal(
        AnswerlatticePostChangeReviewResponseSchema.safeParse(malformed).success,
        false,
        'review responses must reject unknown fields and contradictory status, timing, arithmetic, or limitation evidence',
    );
}

process.stdout.write('Answerlattice post-change support evidence contracts passed.\n');
