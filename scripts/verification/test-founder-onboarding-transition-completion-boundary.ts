import assert from 'node:assert/strict';
import { resolveFounderOnboardingTransitionCompletion } from '../../functions/src/schedulers/founderOnboardingTransitionCompletionBoundary';

const candidate = {
    firstLiveAt: new Date('2026-07-03T08:00:00.000Z'),
    paymentAt: new Date('2026-07-01T08:00:00.000Z'),
    storeId: '20',
    tenantId: '10',
};

assert.deepEqual(
    resolveFounderOnboardingTransitionCompletion({
        candidate,
        currentData: {
            paymentAt: { seconds: Date.parse('2026-07-02T08:00:00.000Z') / 1000 },
            sId: 20,
            tId: 10,
        },
        documentId: '20',
    }),
    {
        firstLiveAt: candidate.firstLiveAt,
        paymentAt: new Date('2026-07-02T08:00:00.000Z'),
        status: 'write',
        timeToLiveHours: 24,
    },
);

assert.deepEqual(
    resolveFounderOnboardingTransitionCompletion({
        candidate,
        currentData: {
            firstLiveAt: { seconds: Date.parse('2026-07-03T08:00:00.000Z') / 1000 },
            paymentAt: { seconds: Date.parse('2026-07-02T08:00:00.000Z') / 1000 },
            sId: 20,
            tId: 10,
            timeToLiveHours: 24,
        },
        documentId: '20',
    }),
    { status: 'already_complete' },
);

assert.deepEqual(
    resolveFounderOnboardingTransitionCompletion({
        candidate,
        currentData: {
            paymentAt: { seconds: Date.parse('2026-07-02T08:00:00.000Z') / 1000 },
            sId: 20,
            tId: 11,
        },
        documentId: '20',
    }),
    { status: 'scope_conflict' },
);

assert.deepEqual(
    resolveFounderOnboardingTransitionCompletion({
        candidate,
        currentData: {
            paymentAt: { seconds: Date.parse('2026-07-02T08:00:00.000Z') / 1000 },
            sId: 21,
            tId: 10,
        },
        documentId: '20',
    }),
    { status: 'scope_conflict' },
);

console.log('Founder onboarding transition completion boundary tests passed.');
