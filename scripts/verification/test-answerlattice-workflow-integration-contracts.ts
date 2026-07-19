import assert from 'node:assert/strict';
import {
    ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES,
    AnswerlatticeWorkflowIntegrationEventTypeSchema,
    AnswerlatticeWorkflowIntegrationTestResponseSchema,
    AnswerlatticeWorkflowIntegrationsResponseSchema,
} from '../../src/lib/answerlattice/workflowIntegrationContracts';

const nullHealth = {
    lastStatus: null,
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
};

assert.deepEqual([...ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES], [
    'coverage_drop',
    'ai_failure_recurring',
    'nightly_summary',
]);

for (const reservedType of [
    'drift_detected',
    'mutation_proposed',
    'knowledge_gap_detected',
    'article_approved',
]) {
    assert.equal(
        AnswerlatticeWorkflowIntegrationEventTypeSchema.safeParse(reservedType).success,
        false,
        `${reservedType} must remain hidden from owner self-service until a producer is active`,
    );
}

const validResponse = {
    slack: {
        enabled: true,
        webhookConfigured: true,
        channel: '#support-review',
        eventFilters: ['coverage_drop'],
    },
    email: {
        enabled: true,
        recipients: ['owner@example.com'],
        eventFilters: ['nightly_summary'],
    },
    eventTypes: [...ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES],
    defaultEventFilters: [...ANSWERLATTICE_WORKFLOW_INTEGRATION_EVENT_TYPES],
    health: {
        slack: nullHealth,
        email: nullHealth,
    },
};

assert.equal(AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse(validResponse).success, true);
assert.equal(AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse({
    ...validResponse,
    eventTypes: [...validResponse.eventTypes, 'drift_detected'],
}).success, false);
assert.equal(AnswerlatticeWorkflowIntegrationsResponseSchema.safeParse({
    ...validResponse,
    health: {
        ...validResponse.health,
        slack: { ...nullHealth, lastStatus: 'provider_error' },
    },
}).success, false);

assert.equal(AnswerlatticeWorkflowIntegrationTestResponseSchema.safeParse({
    eventId: 'test-event-1',
    message: 'Test notification queued. Delivery status will update shortly.',
}).success, true);
assert.equal(AnswerlatticeWorkflowIntegrationTestResponseSchema.safeParse({
    eventId: 'test-event-1',
    message: 'Test notification queued.',
    webhookUrl: 'https://hooks.slack.com/services/secret',
}).success, false);

console.log('Answerlattice workflow integration contracts passed.');
