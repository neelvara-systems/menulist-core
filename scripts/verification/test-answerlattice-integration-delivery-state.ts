import assert from 'assert';
import { Timestamp } from 'firebase-admin/firestore';
import {
    isClaimableIntegrationEventDocument,
    isOwnedProcessingIntegrationEventDocument,
    resolveIntegrationEventCompletionStatus,
    shouldIntegrationAdapterReceiveEvent,
} from '../../functions-answerlattice/src/integrations/eventDeliveryState';
import { INTEGRATION_EVENT_TYPES } from '../../functions-answerlattice/src/integrations/types';

const createdAt = Timestamp.now();
const expected = {
    pId: 'AL' as const,
    tId: 11,
    sId: 22,
    eventType: 'nightly_summary' as const,
    severity: 'low' as const,
    payload: { driftDetected: 1 },
    createdAt,
};
const pending = {
    ...expected,
    status: 'pending',
    expiresAt: Timestamp.now(),
};

assert.equal(isClaimableIntegrationEventDocument(pending, expected), true);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, status: 'processing' }, expected), false);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, pId: 'ML' }, expected), false);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, sId: 23 }, expected), false);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, eventType: 'unknown' }, expected), false);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, payload: null }, expected), false);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, payload: { driftDetected: 2 } }, expected), false);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, createdAt: Timestamp.fromMillis(createdAt.toMillis() + 1) }, expected), false);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, idempotencyFingerprint: 'wrong' }, expected), false);
assert.equal(isClaimableIntegrationEventDocument({ ...pending, createdAt: 'now' }, expected), false);
assert.equal(isOwnedProcessingIntegrationEventDocument({ ...pending, status: 'processing' }, expected), true);
assert.equal(isOwnedProcessingIntegrationEventDocument(pending, expected), false);
assert.equal(isOwnedProcessingIntegrationEventDocument({ ...pending, status: 'processing', tId: 12 }, expected), false);
assert.equal(resolveIntegrationEventCompletionStatus({ delivered: 1, failed: 0 }, true), 'delivered');
assert.equal(resolveIntegrationEventCompletionStatus({ delivered: 1, failed: 1 }, true), 'failed');
assert.equal(resolveIntegrationEventCompletionStatus({ delivered: 0, failed: 1 }, true), 'failed');
assert.equal(resolveIntegrationEventCompletionStatus({ delivered: 0, failed: 0 }, true), 'failed');
assert.equal(resolveIntegrationEventCompletionStatus({ delivered: 0, failed: 0 }, false), 'delivered');
assert.equal(shouldIntegrationAdapterReceiveEvent({
    adapterType: 'slack',
    eventType: INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY,
    eventFilters: [INTEGRATION_EVENT_TYPES.COVERAGE_DROP],
    isOwnerConnectionTest: true,
}), true, 'owner connection tests must reach Slack even when its ordinary event filter differs');
assert.equal(shouldIntegrationAdapterReceiveEvent({
    adapterType: 'email',
    eventType: INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY,
    eventFilters: [INTEGRATION_EVENT_TYPES.COVERAGE_DROP],
    isOwnerConnectionTest: true,
}), true, 'owner connection tests must reach email even when its ordinary event filter differs');
assert.equal(shouldIntegrationAdapterReceiveEvent({
    adapterType: 'github',
    eventType: INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY,
    eventFilters: [INTEGRATION_EVENT_TYPES.COVERAGE_DROP],
    isOwnerConnectionTest: true,
}), false, 'owner self-service tests must not bypass controlled-adapter filters');
assert.equal(shouldIntegrationAdapterReceiveEvent({
    adapterType: 'slack',
    eventType: INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY,
    eventFilters: [INTEGRATION_EVENT_TYPES.COVERAGE_DROP],
    isOwnerConnectionTest: false,
}), false, 'ordinary events must continue to honor adapter filters');

console.log('Answerlattice integration delivery state contracts passed.');
