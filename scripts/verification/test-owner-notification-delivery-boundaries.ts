import assert from 'node:assert/strict';
import {
    getOwnerNotificationDeliveryClaimDecision,
    getNextOwnerNotificationProcessingAttempt,
    hasOwnerNotificationWhatsAppConsent,
    isOwnerNotificationEventWithinByteLimit,
    MAX_OWNER_NOTIFICATION_EVENT_JSON_BYTES,
    normalizeOwnerNotificationDocumentId,
    normalizeOwnerNotificationDocumentIdAliases,
    normalizeOwnerNotificationNumericScopeAliases,
    normalizeOwnerNotificationNumericScopeDocumentId,
    normalizeOwnerNotificationReferenceId,
    projectOwnerNotificationPersistedEvent,
    projectOwnerNotificationRateLimitCount,
} from '../../src/data/shared/ownerNotificationDeliveryBoundary';
import { Timestamp } from 'firebase-admin/firestore';

assert.equal(hasOwnerNotificationWhatsAppConsent({ whatsappConsent: true }), true);
assert.equal(hasOwnerNotificationWhatsAppConsent({ whatsappConsentStatus: 'granted' }), true);
assert.equal(hasOwnerNotificationWhatsAppConsent({
    whatsappConsent: true,
    whatsappConsentStatus: 'revoked',
}), false, 'An explicit revocation must override a stale legacy consent boolean.');
assert.equal(hasOwnerNotificationWhatsAppConsent({ whatsappConsentStatus: 'denied' }), false);
assert.equal(hasOwnerNotificationWhatsAppConsent(null), false);

assert.equal(isOwnerNotificationEventWithinByteLimit({ metadata: { value: 'ok' } }), true);
assert.equal(isOwnerNotificationEventWithinByteLimit({
    metadata: { value: 'x'.repeat(MAX_OWNER_NOTIFICATION_EVENT_JSON_BYTES) },
}), false);
const circular: Record<string, unknown> = {};
circular.self = circular;
assert.equal(isOwnerNotificationEventWithinByteLimit(circular), false);

assert.equal(normalizeOwnerNotificationDocumentId('workspace_123'), 'workspace_123');
assert.equal(normalizeOwnerNotificationDocumentId(' workspace_123'), null);
assert.equal(normalizeOwnerNotificationDocumentId('workspace/123'), null);
assert.equal(normalizeOwnerNotificationDocumentId('__reserved__'), null);
assert.equal(normalizeOwnerNotificationDocumentId('.'), null);
assert.equal(normalizeOwnerNotificationDocumentIdAliases(['tenant_alpha', 'tenant_alpha']), 'tenant_alpha');
assert.equal(normalizeOwnerNotificationDocumentIdAliases(['tenant_alpha', 'tenant_beta']), null);

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
assert.deepEqual(normalizeOwnerNotificationNumericScopeAliases([101, '101']), {
    documentId: '101',
    numericId: 101,
});
assert.equal(normalizeOwnerNotificationNumericScopeAliases([101, 102]), null);
assert.equal(normalizeOwnerNotificationNumericScopeAliases([101, '0101']), null);
assert.equal(normalizeOwnerNotificationNumericScopeAliases([undefined, null]), null);

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

const now = Timestamp.fromMillis(Date.parse('2026-07-28T00:00:00.000Z'));
const validMenuListEvent = {
    productId: 'ML',
    triggerType: 'PAYMENT_SUCCESS',
    tenantId: '101',
    storeId: '202',
    referenceId: 'payment_pay_123',
    dedupeKey: 'ML|PAYMENT_SUCCESS|101|202|payment_pay_123',
    recipientRole: 'billing_owner',
    requestedChannels: ['email'],
    metadata: { amount: 100 },
    priority: 'required',
    status: 'failed',
    source: { runtime: 'functions', path: 'functions/src/test.ts' },
    createdAt: now,
    updatedAt: now,
    processingAttempt: 1,
};
assert.deepEqual(
    projectOwnerNotificationPersistedEvent(validMenuListEvent, 'ML'),
    validMenuListEvent,
);
assert.equal(projectOwnerNotificationPersistedEvent({
    ...validMenuListEvent,
    dedupeKey: 'ML|PAYMENT_SUCCESS|101|999|payment_pay_123',
}, 'ML'), null);
assert.equal(projectOwnerNotificationPersistedEvent({
    ...validMenuListEvent,
    tenantId: '0101',
}, 'ML'), null);
assert.equal(projectOwnerNotificationPersistedEvent({
    ...validMenuListEvent,
    requestedChannels: ['email', 'email'],
}, 'ML'), null);
assert.equal(projectOwnerNotificationPersistedEvent({
    ...validMenuListEvent,
    metadata: [],
}, 'ML'), null);
assert.equal(projectOwnerNotificationPersistedEvent({
    ...validMenuListEvent,
    retryCount: '1',
}, 'ML'), null);
assert.deepEqual(projectOwnerNotificationPersistedEvent({
    ...validMenuListEvent,
    retryCount: 1,
    retriedAt: now,
}, 'ML'), {
    ...validMenuListEvent,
    retryCount: 1,
    retriedAt: now,
});
assert.equal(projectOwnerNotificationPersistedEvent({
    ...validMenuListEvent,
    retriedAt: now,
}, 'ML'), null);

const validAnswerlatticeEvent = {
    ...validMenuListEvent,
    productId: 'AL',
    tenantId: 'tenant_alpha',
    storeId: undefined,
    workspaceId: 'workspace_alpha',
    dedupeKey: 'AL|PAYMENT_SUCCESS|tenant_alpha|workspace_alpha|payment_pay_123',
};
assert.ok(projectOwnerNotificationPersistedEvent(validAnswerlatticeEvent, 'AL'));
assert.equal(projectOwnerNotificationPersistedEvent({
    ...validAnswerlatticeEvent,
    storeId: 'workspace_beta',
}, 'AL'), null);

const validRecipientLimit = {
    productId: 'ML',
    channel: 'email',
    recipientHash: 'hash',
    dateKey: '2026-07-28',
    count: 3,
    updatedAt: now,
};
assert.equal(projectOwnerNotificationRateLimitCount(validRecipientLimit, {
    productId: 'ML',
    dateKey: '2026-07-28',
    kind: 'recipient',
    channel: 'email',
    recipientHash: 'hash',
}), 3);
assert.equal(projectOwnerNotificationRateLimitCount({
    ...validRecipientLimit,
    count: '3',
}, {
    productId: 'ML',
    dateKey: '2026-07-28',
    kind: 'recipient',
    channel: 'email',
    recipientHash: 'hash',
}), null);

assert.equal(getOwnerNotificationDeliveryClaimDecision(undefined, undefined, 1), 'claim');
assert.equal(getOwnerNotificationDeliveryClaimDecision('failed', 1, 2), 'claim');
assert.equal(getOwnerNotificationDeliveryClaimDecision('failed', 1, 1), 'terminal');
assert.equal(getOwnerNotificationDeliveryClaimDecision('sent', 1, 2), 'terminal');
assert.equal(getOwnerNotificationDeliveryClaimDecision('sent', undefined, 2), 'invalid');
assert.equal(getOwnerNotificationDeliveryClaimDecision('sent', 2, 1), 'invalid');
assert.equal(getOwnerNotificationDeliveryClaimDecision('sending', 1, 2), 'ambiguous');
assert.equal(getOwnerNotificationDeliveryClaimDecision('sending', '1', 2), 'invalid');
assert.equal(getOwnerNotificationDeliveryClaimDecision('failed', 1, 3), 'invalid');

console.log('Owner notification delivery boundary tests passed.');
