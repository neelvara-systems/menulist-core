import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
    EMAIL_OS_DELIVERY_TAG_NAME,
    EMAIL_OS_LIMITS,
    EMAIL_OS_PRODUCT_TAG_NAME,
    EmailOsContractError,
    assertEmailOsEnvelope,
    assertEmailOsSenderDomain,
    buildEmailOsIdempotencyKey,
    buildEmailOsRecipientHash,
    isEmailOsProviderEventBoundToProduct,
    normalizeEmailOsProviderEvent,
    shouldAdvanceEmailOsDeliveryStatus,
} from '../../src/data/shared/emailOs';
import { renderEmailOsLegacyContent, renderEmailOsTemplate } from '../../src/lib/email-os/render';

async function main(): Promise<void> {
    const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');
    const rendered = await renderEmailOsTemplate({
        productName: 'MenuList',
        previewText: 'Your menu is ready',
        title: 'Your menu is live',
        paragraphs: ['Customers can now open the latest menu.'],
        rows: [{ label: 'Status', value: 'Published' }],
        action: { label: 'View menu', url: 'https://menulist.online/example' },
        footer: 'You received this operational message because you manage this MenuList account.',
    });
    assert.match(rendered.html, /Your menu is live/);
    assert.match(rendered.text, /Customers can now open the latest menu/);
    assert.doesNotMatch(rendered.html, /undefined/);
    assert.match(renderEmailOsLegacyContent('<p>Delivery complete</p>').text, /Delivery complete/);

    const envelope = assertEmailOsEnvelope({
        productCode: 'ML',
        classification: 'transactional',
        eventType: 'menu.published',
        localDeliveryReference: 'publish:123',
        from: 'MenuList <system@mail.menulist.ai>',
        to: 'owner@example.com',
        subject: 'Your menu is live',
        html: rendered.html,
        text: rendered.text,
        attachments: [{
            filename: 'MenuList-ML26-27-000001.pdf',
            contentBase64: Buffer.from('%PDF-1.7 test').toString('base64'),
            contentType: 'application/pdf',
        }],
    });
    assert.equal(envelope.attachments?.[0]?.contentType, 'application/pdf');
    assert.equal(assertEmailOsSenderDomain(envelope.from, 'mail.menulist.ai'), envelope.from);
    const key = buildEmailOsIdempotencyKey(envelope, sha256);
    assert.equal(key, buildEmailOsIdempotencyKey(envelope, sha256));
    assert.match(key, /^email-os\/ml\/[a-f0-9]{64}$/);

    assert.equal(shouldAdvanceEmailOsDeliveryStatus('sent', 'delivered', 100, 90), true);
    assert.equal(shouldAdvanceEmailOsDeliveryStatus('outcome_unknown', 'sent', 100, 90), true);
    assert.equal(shouldAdvanceEmailOsDeliveryStatus('outcome_unknown', 'delivered', 100, 90), true);
    assert.equal(shouldAdvanceEmailOsDeliveryStatus('delivered', 'sent', 100, 200), false);
    assert.equal(shouldAdvanceEmailOsDeliveryStatus('delivered', 'delivered', 100, 200), true);

    const providerEvent = normalizeEmailOsProviderEvent({
        type: 'email.bounced',
        created_at: '2026-08-15T10:00:00.000Z',
        data: {
            email_id: 'email_123',
            to: ['owner@example.com'],
            tags: {
                [EMAIL_OS_DELIVERY_TAG_NAME]: 'a'.repeat(64),
                [EMAIL_OS_PRODUCT_TAG_NAME]: 'ML',
            },
        },
    }, 'evt_123');
    assert.equal(providerEvent.deliveryStatus, 'bounced');
    assert.equal(providerEvent.suppressionAction, 'activate');
    assert.equal(providerEvent.suppressionReason, 'bounce');
    assert.equal(providerEvent.localDeliveryId, 'a'.repeat(64));
    assert.equal(providerEvent.productCode, 'ML');
    assert.equal(isEmailOsProviderEventBoundToProduct(providerEvent, 'ML', true), true);
    assert.equal(isEmailOsProviderEventBoundToProduct(providerEvent, 'AL', true), false);
    assert.equal(isEmailOsProviderEventBoundToProduct(providerEvent, 'ML', false), false);

    const legacyProviderEvent = normalizeEmailOsProviderEvent({
        type: 'email.delivered',
        created_at: '2026-08-15T10:00:00.000Z',
        data: { email_id: 'email_legacy', to: ['owner@example.com'] },
    }, 'evt_legacy');
    assert.equal(legacyProviderEvent.productCode, null);
    assert.equal(isEmailOsProviderEventBoundToProduct(legacyProviderEvent, 'AL', true), true);
    assert.equal(isEmailOsProviderEventBoundToProduct(legacyProviderEvent, 'AL', false), false);

    assert.notEqual(
        buildEmailOsRecipientHash('ML', 'owner@example.com', sha256),
        buildEmailOsRecipientHash('AL', 'owner@example.com', sha256),
    );

    assert.throws(() => assertEmailOsEnvelope({ ...envelope, productCode: 'CC' }), EmailOsContractError);
    assert.throws(() => assertEmailOsEnvelope({ ...envelope, productCode: 'MC' }), EmailOsContractError);
    assert.throws(() => assertEmailOsEnvelope({
        ...envelope,
        tags: Array.from({ length: EMAIL_OS_LIMITS.MAX_TAG_COUNT + 1 }, (_, index) => ({
            name: `tag_${index}`,
            value: `value_${index}`,
        })),
    }), EmailOsContractError);
    assert.throws(() => assertEmailOsEnvelope({
        ...envelope,
        tags: [{ name: EMAIL_OS_DELIVERY_TAG_NAME, value: 'caller_override' }],
    }), EmailOsContractError);
    assert.throws(() => assertEmailOsEnvelope({
        ...envelope,
        tags: [{ name: EMAIL_OS_PRODUCT_TAG_NAME, value: 'AL' }],
    }), EmailOsContractError);
    assert.throws(() => assertEmailOsEnvelope({
        ...envelope,
        attachments: [{
            filename: '../invoice.pdf',
            contentBase64: Buffer.from('%PDF-1.7 test').toString('base64'),
            contentType: 'application/pdf',
        }],
    }), EmailOsContractError);
    assert.throws(() => assertEmailOsEnvelope({
        ...envelope,
        attachments: [{
            filename: 'invoice.pdf',
            contentBase64: Buffer.from('not a PDF').toString('base64'),
            contentType: 'application/pdf',
        }],
    }), EmailOsContractError);
    assert.throws(() => normalizeEmailOsProviderEvent({
        type: 'email.sent',
        created_at: '2026-08-15T10:00:00.000Z',
        data: {
            email_id: 'email_123',
            to: ['owner@example.com'],
            tags: { [EMAIL_OS_DELIVERY_TAG_NAME]: '../wrong-delivery' },
        },
    }, 'evt_invalid_tag'), EmailOsContractError);
    assert.throws(() => normalizeEmailOsProviderEvent({
        type: 'email.sent',
        created_at: '2026-08-15T10:00:00.000Z',
        data: {
            email_id: 'email_123',
            to: ['owner@example.com'],
            tags: { [EMAIL_OS_PRODUCT_TAG_NAME]: 'UNKNOWN' },
        },
    }, 'evt_invalid_product_tag'), EmailOsContractError);
    assert.throws(() => normalizeEmailOsProviderEvent({
        type: 'email.sent',
        created_at: '2019-12-31T23:59:59.000Z',
        data: { email_id: 'email_123', to: ['owner@example.com'] },
    }, 'evt_stale'), EmailOsContractError);
    assert.throws(() => normalizeEmailOsProviderEvent({
        type: 'email.sent',
        created_at: new Date(Date.now() + 2 * 86_400_000).toISOString(),
        data: { email_id: 'email_123', to: ['owner@example.com'] },
    }, 'evt_future'), EmailOsContractError);
    assert.throws(() => assertEmailOsSenderDomain(envelope.from, 'answerlattice.com'), EmailOsContractError);
    await assert.rejects(() => renderEmailOsTemplate({
        productName: 'MenuList',
        previewText: 'Invalid action',
        title: 'Invalid action',
        paragraphs: ['This should fail.'],
        action: { label: 'Open', url: 'http://example.com' },
        footer: 'Footer',
    }));

    console.log('EmailOS contract and rendering tests passed.');
}

void main();
