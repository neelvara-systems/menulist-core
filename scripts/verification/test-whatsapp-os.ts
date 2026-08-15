import assert from 'node:assert/strict';
import {
    WhatsAppOsContractError,
    assertWhatsAppOsSendRequest,
    getWhatsAppOsTemplateDefinition,
    normalizeWhatsAppOsRecipient,
    shouldAdvanceWhatsAppOsProviderStatus,
} from '../../src/data/shared/whatsappOs';

const request = assertWhatsAppOsSendRequest({
    productCode: 'ML',
    messageClass: 'authentication',
    localDeliveryReference: 'otp.challenge_123',
    ownerReference: { workflow: 'phone_otp', documentId: 'challenge_123' },
    to: '+91 98765 43210',
    template: { name: 'menulist_phone_otp', language: 'en_US', parameters: ['123456'] },
});
assert.equal(request.to, '919876543210');
assert.equal(normalizeWhatsAppOsRecipient('+1 (415) 555-2671'), '14155552671');
assert.throws(() => normalizeWhatsAppOsRecipient('call 14155552671'), WhatsAppOsContractError);

assert.throws(() => assertWhatsAppOsSendRequest({
    ...request,
    messageClass: 'operational',
    consentGranted: false,
}), WhatsAppOsContractError);
const pendingLifecycleTemplate = getWhatsAppOsTemplateDefinition('menulist.payment_failed');
assert.ok(pendingLifecycleTemplate);
assert.equal(pendingLifecycleTemplate.approvalState, 'pending_approval');
assert.throws(() => assertWhatsAppOsSendRequest({
    productCode: 'ML',
    messageClass: 'transactional',
    localDeliveryReference: 'payment.failed_123',
    ownerReference: { workflow: 'owner_notification', documentId: 'delivery_123' },
    to: '+919876543210',
    consentGranted: true,
    template: {
        registryKey: 'menulist.payment_failed',
        name: pendingLifecycleTemplate.metaName,
        language: pendingLifecycleTemplate.language,
        parameters: ['Payment needs attention.'],
    },
}), (error: unknown) => error instanceof WhatsAppOsContractError && error.code === 'WHATSAPP_OS_TEMPLATE_NOT_APPROVED');
assert.throws(() => assertWhatsAppOsSendRequest({
    ...request,
    messageClass: 'operational',
    ownerReference: { workflow: 'phone_otp', documentId: 'challenge_123' },
    consentGranted: true,
}), WhatsAppOsContractError);
assert.throws(() => assertWhatsAppOsSendRequest({
    ...request,
    messageClass: 'conversational',
    ownerReference: { workflow: 'owner_notification', documentId: 'delivery_123' },
}), WhatsAppOsContractError);
assert.throws(() => assertWhatsAppOsSendRequest({
    ...request,
    productCode: 'CC',
}), WhatsAppOsContractError);
assert.throws(() => assertWhatsAppOsSendRequest({
    ...request,
    session: { active: true, text: 'duplicate mode' },
}), WhatsAppOsContractError);
assert.equal(shouldAdvanceWhatsAppOsProviderStatus('sent', 'delivered'), true);
assert.equal(shouldAdvanceWhatsAppOsProviderStatus('read', 'sent'), false);
assert.equal(shouldAdvanceWhatsAppOsProviderStatus('delivered', 'delivered', 200, 100), false);
assert.equal(shouldAdvanceWhatsAppOsProviderStatus('delivered', 'delivered', 100, 200), true);

console.log('WhatsAppOS request, consent, product, and provider-state contracts passed.');
