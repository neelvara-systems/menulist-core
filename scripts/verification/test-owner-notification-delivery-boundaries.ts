import assert from 'node:assert/strict';
import {
    getNextOwnerNotificationProcessingAttempt,
    normalizeOwnerNotificationDocumentId,
    normalizeOwnerNotificationNumericScopeDocumentId,
    normalizeOwnerNotificationReferenceId,
} from '../../src/data/shared/ownerNotificationDeliveryBoundary';

assert.equal(normalizeOwnerNotificationDocumentId('workspace_123'), 'workspace_123');
assert.equal(normalizeOwnerNotificationDocumentId(' workspace_123'), null);
assert.equal(normalizeOwnerNotificationDocumentId('workspace/123'), null);
assert.equal(normalizeOwnerNotificationDocumentId('__reserved__'), null);
assert.equal(normalizeOwnerNotificationDocumentId('.'), null);

assert.deepEqual(normalizeOwnerNotificationNumericScopeDocumentId(101), {
    documentId: '101',
    numericId: 101,
});
assert.deepEqual(normalizeOwnerNotificationNumericScopeDocumentId('101'), {
    documentId: '101',
    numericId: 101,
});
assert.equal(normalizeOwnerNotificationNumericScopeDocumentId('0101'), null);
assert.equal(normalizeOwnerNotificationNumericScopeDocumentId('101.0'), null);
assert.equal(normalizeOwnerNotificationNumericScopeDocumentId(0), null);
assert.equal(normalizeOwnerNotificationNumericScopeDocumentId(Number.MAX_SAFE_INTEGER + 1), null);

assert.equal(normalizeOwnerNotificationReferenceId('payment_pay_123'), 'payment_pay_123');
assert.equal(normalizeOwnerNotificationReferenceId(' payment_pay_123'), null);
assert.equal(normalizeOwnerNotificationReferenceId('payment\n123'), null);
assert.equal(normalizeOwnerNotificationReferenceId('x'.repeat(241)), null);

assert.equal(getNextOwnerNotificationProcessingAttempt('pending', undefined), 1);
assert.equal(getNextOwnerNotificationProcessingAttempt('failed', 1), 2);
assert.equal(getNextOwnerNotificationProcessingAttempt('failed', 2), null);
assert.equal(getNextOwnerNotificationProcessingAttempt('processing', 1), null);
assert.equal(getNextOwnerNotificationProcessingAttempt('delivered', 1), null);
assert.equal(getNextOwnerNotificationProcessingAttempt('partial', 1), null);
assert.equal(getNextOwnerNotificationProcessingAttempt('skipped', 1), null);
assert.equal(getNextOwnerNotificationProcessingAttempt('failed', -1), null);
assert.equal(getNextOwnerNotificationProcessingAttempt('failed', '1'), null);

console.log('Owner notification delivery boundary tests passed.');
