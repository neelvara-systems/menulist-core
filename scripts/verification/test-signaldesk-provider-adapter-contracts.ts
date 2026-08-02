import assert from 'node:assert/strict';
import { SIGNALDESK_INTEGRATION_ENV } from '../../src/constants/signaldesk/integrations';
import {
    assertSignalDeskProviderSendResult,
    assertSignalDeskSmtpSendAcknowledgement,
    canonicalizeSignalDeskProviderRecipient,
    extractSignalDeskMetaProviderMessageId,
    sendSignalDeskProviderMessage,
} from '../../src/lib/signaldesk/providerAdapters';

const validSmtpAcknowledgement = (recipient = 'Owner.Test+tag@example.com') => ({
    accepted: [recipient],
    envelope: {
        from: 'hello@sender.example',
        to: [recipient],
    },
    messageId: '<message-1@sender.example>',
    rejected: [],
    response: '250 2.0.0 OK queued as delivery-1',
});

const assertRecipientContracts = () => {
    assert.equal(
        canonicalizeSignalDeskProviderRecipient('email', ' Owner.Test+tag@Example.COM '),
        'Owner.Test+tag@example.com',
    );
    for (const invalid of [
        '',
        'owner@example.com,second@example.com',
        'owner@example.com;second@example.com',
        'Owner <owner@example.com>',
        'owner@example.com\r\nBcc: second@example.com',
        'owner@localhost',
        'owner@@example.com',
    ]) {
        assert.throws(
            () => canonicalizeSignalDeskProviderRecipient('email', invalid),
            /EMAIL_RECIPIENT_INVALID|PROVIDER_RECIPIENT_INVALID/,
        );
    }

    assert.equal(canonicalizeSignalDeskProviderRecipient('whatsapp', '+919876543210'), '919876543210');
    assert.equal(canonicalizeSignalDeskProviderRecipient('whatsapp', '14155552671'), '14155552671');
    for (const invalid of [
        '919876543210,14155552671',
        '+91 9876543210',
        '00919876543210',
        '+123',
        '+1234567890123456',
    ]) {
        assert.throws(
            () => canonicalizeSignalDeskProviderRecipient('whatsapp', invalid),
            /WHATSAPP_RECIPIENT_INVALID/,
        );
    }

    assert.equal(canonicalizeSignalDeskProviderRecipient('instagram', '17841400000000000'), '17841400000000000');
    assert.equal(canonicalizeSignalDeskProviderRecipient('messenger', '123456789'), '123456789');
    for (const [channel, invalid] of [
        ['instagram', '@public_handle'],
        ['instagram', 'public_handle'],
        ['messenger', 'psid_123'],
        ['messenger', '123,456'],
        ['messenger', '+123456'],
    ] as const) {
        assert.throws(
            () => canonicalizeSignalDeskProviderRecipient(channel, invalid),
            /PROVIDER_SCOPED_RECIPIENT_INVALID/,
        );
    }
    assert.throws(
        () => canonicalizeSignalDeskProviderRecipient('manual', 'owner@example.com'),
        /manual-only/,
    );
};

const assertSmtpAcknowledgementContracts = () => {
    assert.equal(
        assertSignalDeskSmtpSendAcknowledgement(validSmtpAcknowledgement(), 'Owner.Test+tag@EXAMPLE.com'),
        '<message-1@sender.example>',
    );
    assert.equal(
        assertSignalDeskSmtpSendAcknowledgement({
            ...validSmtpAcknowledgement(),
            pending: [],
        }, 'Owner.Test+tag@example.com'),
        '<message-1@sender.example>',
    );

    const invalidAcknowledgements: Array<[unknown, RegExp]> = [
        [null, /SMTP_SEND_ACKNOWLEDGEMENT_INVALID/],
        [{ ...validSmtpAcknowledgement(), envelope: { to: [] } }, /SMTP_ENVELOPE_RECIPIENT_MISMATCH/],
        [{ ...validSmtpAcknowledgement(), envelope: { to: ['Owner.Test+tag@example.com', 'other@example.com'] } }, /SMTP_ENVELOPE_RECIPIENT_MISMATCH/],
        [{ ...validSmtpAcknowledgement(), accepted: [] }, /SMTP_ACCEPTED_RECIPIENT_MISMATCH/],
        [{ ...validSmtpAcknowledgement(), accepted: ['other@example.com'] }, /SMTP_ACCEPTED_RECIPIENT_MISMATCH/],
        [
            (({ rejected: _rejected, ...acknowledgement }) => acknowledgement)(validSmtpAcknowledgement()),
            /SMTP_REJECTED_AMBIGUOUS/,
        ],
        [{ ...validSmtpAcknowledgement(), rejected: ['Owner.Test+tag@example.com'] }, /SMTP_REJECTED_NOT_EMPTY/],
        [{ ...validSmtpAcknowledgement(), pending: ['Owner.Test+tag@example.com'] }, /SMTP_PENDING_NOT_EMPTY/],
        [{ ...validSmtpAcknowledgement(), rejected: 'none' }, /SMTP_REJECTED_AMBIGUOUS/],
        [{ ...validSmtpAcknowledgement(), response: '354 Continue' }, /SMTP_FINAL_RESPONSE_UNRESOLVED/],
        [{ ...validSmtpAcknowledgement(), response: '250-continued' }, /SMTP_FINAL_RESPONSE_UNRESOLVED/],
        [{ ...validSmtpAcknowledgement(), response: '250 OK\r\n550 rejected' }, /SMTP_FINAL_RESPONSE_UNRESOLVED/],
        [{ ...validSmtpAcknowledgement(), messageId: '' }, /SMTP_MESSAGE_ID_UNRESOLVED/],
        [{ ...validSmtpAcknowledgement(), messageId: `id-${'x'.repeat(998)}` }, /SMTP_MESSAGE_ID_UNRESOLVED/],
    ];
    for (const [acknowledgement, expectedError] of invalidAcknowledgements) {
        assert.throws(
            () => assertSignalDeskSmtpSendAcknowledgement(acknowledgement, 'Owner.Test+tag@example.com'),
            expectedError,
        );
    }
};

const assertMetaAcknowledgementContracts = () => {
    assert.equal(
        extractSignalDeskMetaProviderMessageId('whatsapp', '919876543210', {
            contacts: [{ input: '919876543210' }],
            messaging_product: 'whatsapp',
            messages: [{ id: 'wamid.HBgLMTIzNDU2Nzg5MA==' }],
        }),
        'wamid.HBgLMTIzNDU2Nzg5MA==',
    );
    assert.equal(
        extractSignalDeskMetaProviderMessageId('instagram', '17841400000000000', {
            message_id: 'mid.instagram-1',
            recipient_id: '17841400000000000',
        }),
        'mid.instagram-1',
    );
    assert.equal(
        extractSignalDeskMetaProviderMessageId('messenger', '123456789', {
            message_id: 'mid.$messenger-1',
            recipient_id: '123456789',
        }),
        'mid.$messenger-1',
    );

    const invalidAcknowledgements: Array<[() => string, RegExp]> = [
        [() => extractSignalDeskMetaProviderMessageId('whatsapp', '919876543210', null), /META_SEND_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('whatsapp', '919876543210', { messages: [{ id: 'wrong-channel-shape' }] }), /META_WHATSAPP_RECIPIENT_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('whatsapp', '919876543210', { contacts: [{ input: '14155552671' }], messaging_product: 'whatsapp', messages: [{ id: 'wrong-recipient' }] }), /META_WHATSAPP_RECIPIENT_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('whatsapp', '919876543210', { contacts: [{ input: '919876543210' }], messaging_product: 'messenger', messages: [{ id: 'wrong-product' }] }), /META_WHATSAPP_RECIPIENT_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('whatsapp', '919876543210', { contacts: [{ input: '919876543210' }], messaging_product: 'whatsapp', messages: [] }), /META_WHATSAPP_SEND_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('whatsapp', '919876543210', { contacts: [{ input: '919876543210' }], messaging_product: 'whatsapp', messages: [{ id: 'one' }, { id: 'two' }] }), /META_WHATSAPP_SEND_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('whatsapp', '919876543210', { contacts: [{ input: '919876543210' }], messaging_product: 'whatsapp', messages: [{ id: '' }] }), /META_WHATSAPP_MESSAGE_ID_UNRESOLVED/],
        [() => extractSignalDeskMetaProviderMessageId('instagram', '17841400000000000', { message_id: 'missing-recipient' }), /META_INSTAGRAM_RECIPIENT_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('instagram', '17841400000000000', { message_id: 'wrong-recipient', recipient_id: '17841400000000001' }), /META_INSTAGRAM_RECIPIENT_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('instagram', '17841400000000000', { messages: [{ id: 'wrong-channel-shape' }], recipient_id: '17841400000000000' }), /META_INSTAGRAM_MESSAGE_ID_UNRESOLVED/],
        [() => extractSignalDeskMetaProviderMessageId('messenger', '123456789', { message_id: 'missing-recipient' }), /META_MESSENGER_RECIPIENT_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('messenger', '123456789', { message_id: 'wrong-recipient', recipient_id: '123456788' }), /META_MESSENGER_RECIPIENT_ACKNOWLEDGEMENT_INVALID/],
        [() => extractSignalDeskMetaProviderMessageId('messenger', '123456789', { message_id: 'contains whitespace', recipient_id: '123456789' }), /META_MESSENGER_MESSAGE_ID_UNRESOLVED/],
        [() => extractSignalDeskMetaProviderMessageId('messenger', '123456789', { message_id: 'x'.repeat(513), recipient_id: '123456789' }), /META_MESSENGER_MESSAGE_ID_UNRESOLVED/],
    ];
    for (const [read, expectedError] of invalidAcknowledgements) {
        assert.throws(read, expectedError);
    }
};

const assertProviderSendResultContracts = () => {
    assert.deepEqual(assertSignalDeskProviderSendResult({
        provider: 'smtp',
        providerMessageId: '<message-1@sender.example>',
        status: 'sent',
    }), {
        provider: 'smtp',
        providerMessageId: '<message-1@sender.example>',
        status: 'sent',
    });
    assert.throws(() => assertSignalDeskProviderSendResult(null), /PROVIDER_SEND_RESULT_INVALID/);
    assert.throws(() => assertSignalDeskProviderSendResult({
        provider: 'untrusted-provider',
        providerMessageId: 'message-1',
        status: 'sent',
    }), /PROVIDER_SEND_RESULT_PROVIDER_INVALID/);
    assert.throws(() => assertSignalDeskProviderSendResult({
        provider: 'smtp',
        providerMessageId: null,
        status: 'sent',
    }), /PROVIDER_SEND_RESULT_MESSAGE_ID_INVALID/);
    assert.throws(() => assertSignalDeskProviderSendResult({
        provider: 'smtp',
        providerMessageId: { id: 'message-1' },
        status: 'sent',
    }), /PROVIDER_SEND_RESULT_MESSAGE_ID_INVALID/);
    assert.throws(() => assertSignalDeskProviderSendResult({
        provider: 'smtp',
        providerMessageId: 'message-1',
        status: 'failed',
    }), /PROVIDER_SEND_RESULT_STATUS_INVALID/);
};

const assertMetaTransportContracts = async () => {
    const originalFetch = globalThis.fetch;
    const envKeys = [
        SIGNALDESK_INTEGRATION_ENV.META_ACCESS_TOKEN,
        SIGNALDESK_INTEGRATION_ENV.WHATSAPP_PHONE_NUMBER_ID,
        SIGNALDESK_INTEGRATION_ENV.INSTAGRAM_PAGE_ID,
        SIGNALDESK_INTEGRATION_ENV.MESSENGER_PAGE_ID,
    ];
    const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
    let requestCount = 0;
    const requests: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    let responseFactory = () => new Response(JSON.stringify({
        contacts: [{ input: '919876543210' }],
        messaging_product: 'whatsapp',
        messages: [{ id: 'wamid.transport-1' }],
    }), {
        headers: { 'content-type': 'application/json' },
        status: 200,
    });

    try {
        process.env[SIGNALDESK_INTEGRATION_ENV.META_ACCESS_TOKEN] = 'test-meta-token';
        process.env[SIGNALDESK_INTEGRATION_ENV.WHATSAPP_PHONE_NUMBER_ID] = '1234567890';
        process.env[SIGNALDESK_INTEGRATION_ENV.INSTAGRAM_PAGE_ID] = '2345678901';
        process.env[SIGNALDESK_INTEGRATION_ENV.MESSENGER_PAGE_ID] = '3456789012';
        const mockedFetch: typeof fetch = async (input, init) => {
            requestCount += 1;
            requests.push({ input, init });
            return responseFactory();
        };
        globalThis.fetch = mockedFetch;

        assert.deepEqual(await sendSignalDeskProviderMessage({
            body: 'Hello',
            channel: 'whatsapp',
            recipient: '+919876543210',
        }), {
            provider: 'meta-whatsapp',
            providerMessageId: 'wamid.transport-1',
            status: 'sent',
        });
        assert.equal(requestCount, 1);
        const lastRequest = requests.at(-1);
        assert(lastRequest, 'provider transport must capture the outbound request');
        assert.match(String(lastRequest?.input), /\/v21\.0\/1234567890\/messages$/);
        assert.equal(lastRequest?.init?.method, 'POST');
        assert.equal(lastRequest?.init?.redirect, 'manual');
        assert.ok(lastRequest?.init?.signal instanceof AbortSignal);
        assert.deepEqual(JSON.parse(String(lastRequest?.init?.body)), {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            text: { body: 'Hello' },
            to: '919876543210',
            type: 'text',
        });

        await assert.rejects(
            sendSignalDeskProviderMessage({
                body: 'No public handles',
                channel: 'instagram',
                recipient: '@menu_owner',
            }),
            /INSTAGRAM_PROVIDER_SCOPED_RECIPIENT_INVALID/,
        );
        assert.equal(requestCount, 1, 'invalid recipients must fail before a provider attempt');

        responseFactory = () => new Response('{', {
            headers: { 'content-type': 'application/json' },
            status: 200,
        });
        await assert.rejects(
            sendSignalDeskProviderMessage({
                body: 'Malformed acknowledgment',
                channel: 'messenger',
                recipient: '123456789',
            }),
            SyntaxError,
        );

        responseFactory = () => new Response(JSON.stringify({ message_id: 'x'.repeat(70 * 1024) }), {
            headers: { 'content-type': 'application/json' },
            status: 200,
        });
        await assert.rejects(
            sendSignalDeskProviderMessage({
                body: 'Oversized acknowledgment',
                channel: 'messenger',
                recipient: '123456789',
            }),
            (error: unknown) => Boolean(
                error
                && typeof error === 'object'
                && 'code' in error
                && error.code === 'RESPONSE_BODY_TOO_LARGE'
            ),
        );

        responseFactory = () => new Response(JSON.stringify({ message_id: 'ignored-on-error' }), {
            headers: { 'content-type': 'application/json' },
            status: 503,
        });
        await assert.rejects(
            sendSignalDeskProviderMessage({
                body: 'Explicit provider failure',
                channel: 'messenger',
                recipient: '123456789',
            }),
            /Meta provider send failed: 503/,
        );

        responseFactory = () => new Response(JSON.stringify({
            accepted: true,
            recipient_id: '123456789',
        }), {
            headers: { 'content-type': 'application/json' },
            status: 200,
        });
        await assert.rejects(
            sendSignalDeskProviderMessage({
                body: 'Ambiguous success',
                channel: 'messenger',
                recipient: '123456789',
            }),
            /META_MESSENGER_MESSAGE_ID_UNRESOLVED/,
        );
    } finally {
        globalThis.fetch = originalFetch;
        for (const key of envKeys) {
            const originalValue = originalEnv[key];
            if (originalValue === undefined) delete process.env[key];
            else process.env[key] = originalValue;
        }
    }
};

async function main(): Promise<void> {
    assertRecipientContracts();
    assertSmtpAcknowledgementContracts();
    assertMetaAcknowledgementContracts();
    assertProviderSendResultContracts();
    await assertMetaTransportContracts();
    console.log('SignalDesk provider adapter contract tests passed');
}

void main();
