import assert from 'node:assert/strict';
import {
    buildAnswerlatticeIntegrationConfigIdentity,
    classifyAnswerlatticeIntegrationConfigOwnership,
} from '../../src/lib/answerlattice/integrationConfigOwnership';
import {
    buildIntegrationConfigIdentity,
    classifyIntegrationConfigOwnership,
} from '../../functions-answerlattice/src/integrations/configOwnership';
import {
    ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES,
    AnswerlatticeWorkflowIntegrationTestResponseSchema,
    AnswerlatticeWorkflowIntegrationsResponseSchema,
} from '../../src/lib/answerlattice/workflowIntegrationContracts';

const scope = { tId: 11, sId: 22 };
const cases: Array<{ value: unknown; expected: 'owned' | 'legacy-unowned' | 'invalid' }> = [
    { value: {}, expected: 'legacy-unowned' },
    { value: { slack: {} }, expected: 'legacy-unowned' },
    { value: { pId: 'AL', tId: 11, sId: 22 }, expected: 'owned' },
    { value: { pId: 'AL', tId: '11', sId: '22' }, expected: 'owned' },
    { value: { pId: 'ML', tId: 11, sId: 22 }, expected: 'invalid' },
    { value: { pId: 'AL', tId: 99, sId: 22 }, expected: 'invalid' },
    { value: { pId: 'AL', tId: 11, sId: 99 }, expected: 'invalid' },
    { value: { pId: 'AL', tId: 11 }, expected: 'invalid' },
    { value: { pId: 'AL', tId: '011', sId: '22' }, expected: 'invalid' },
    { value: { pId: 'AL', tId: '11e0', sId: '22' }, expected: 'invalid' },
    { value: null, expected: 'invalid' },
    { value: [], expected: 'invalid' },
];

for (const testCase of cases) {
    assert.equal(classifyAnswerlatticeIntegrationConfigOwnership(testCase.value, scope), testCase.expected);
    assert.equal(classifyIntegrationConfigOwnership(testCase.value, scope.tId, scope.sId), testCase.expected);
}

assert.deepEqual(buildAnswerlatticeIntegrationConfigIdentity(scope), { pId: 'AL', tId: 11, sId: 22 });
assert.deepEqual(buildIntegrationConfigIdentity(scope.tId, scope.sId), { pId: 'AL', tId: 11, sId: 22 });
assert.equal(buildAnswerlatticeIntegrationConfigIdentity({ tId: 0, sId: 22 }), null);
assert.equal(buildIntegrationConfigIdentity('11', 22), null);

const validIntegrationResponse = {
    slack: {
        enabled: true,
        webhookConfigured: true,
        channel: '#support',
        eventFilters: ['nightly_summary'],
    },
    email: {
        enabled: true,
        recipients: ['owner@example.com'],
        eventFilters: ['coverage_drop'],
    },
    eventTypes: [...ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES],
    defaultEventFilters: ['nightly_summary', 'coverage_drop'],
    health: {
        slack: {
            lastStatus: 'success',
            lastAttemptAt: '2026-07-19T10:00:00.000Z',
            lastSuccessAt: '2026-07-19T10:00:00.000Z',
            lastFailureAt: null,
            lastError: null,
        },
        email: {
            lastStatus: null,
            lastAttemptAt: null,
            lastSuccessAt: null,
            lastFailureAt: null,
            lastError: null,
        },
    },
};

assert.equal(AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse(validIntegrationResponse).success, true);
assert.equal(AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse({
    ...validIntegrationResponse,
    unexpected: true,
}).success, false);
assert.equal(AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse({
    ...validIntegrationResponse,
    slack: {
        ...validIntegrationResponse.slack,
        eventFilters: ['unknown_event'],
    },
}).success, false);
assert.equal(AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse({
    ...validIntegrationResponse,
    health: {
        ...validIntegrationResponse.health,
        slack: {
            ...validIntegrationResponse.health.slack,
            lastAttemptAt: 'not-a-date',
        },
    },
}).success, false);
assert.equal(AnswerlatticeWorkflowIntegrationTestResponseSchema.safeParse({
    eventId: 'event-1',
    message: 'Test notification queued.',
}).success, true);
assert.equal(AnswerlatticeWorkflowIntegrationTestResponseSchema.safeParse({
    eventId: 'event-1',
    message: 'Test notification queued.',
    rawProviderResponse: 'must not pass',
}).success, false);

console.log('Answerlattice integration-config ownership boundaries passed.');
