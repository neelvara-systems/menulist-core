import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import { GithubAdapter } from '../../functions-answerlattice/src/integrations/adapters/githubAdapter';
import { LinearAdapter } from '../../functions-answerlattice/src/integrations/adapters/linearAdapter';
import {
    EmailAdapter,
    readAnswerlatticeSmtpRuntimeConfig,
} from '../../functions-answerlattice/src/integrations/adapters/emailAdapter';
import {
    isRetryableSlackStatus,
    SlackAdapter,
} from '../../functions-answerlattice/src/integrations/adapters/slackAdapter';
import {
    INTEGRATION_PROVIDER_FETCH_POLICY,
    INTEGRATION_PROVIDER_JSON_MAX_BYTES,
    readIntegrationProviderJson,
} from '../../functions-answerlattice/src/integrations/adapters/providerJson';
import {
    EVENT_STATUS,
    INTEGRATION_EVENT_TYPES,
    type GithubConfig,
    type IntegrationEvent,
    type LinearConfig,
} from '../../functions-answerlattice/src/integrations/types';
import {
    normalizeEmailConfig,
    normalizeSlackConfig,
    sanitizeIntegrationPayload,
} from '../../functions-answerlattice/src/integrations/safety';

const event: IntegrationEvent = {
    createdAt: Timestamp.now(),
    eventType: INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED,
    pId: 'AL',
    payload: {
        confidenceScore: 0.8,
        entityNames: ['Billing'],
        mutationType: 'content_refinement',
        signalCount: 2,
    },
    sId: 22,
    severity: 'medium',
    status: EVENT_STATUS.PENDING,
    tId: 11,
};

const githubConfig: GithubConfig = {
    enabled: true,
    eventFilters: [event.eventType],
    owner: 'answerlattice',
    repo: 'governance',
    token: 'test-token',
};

const linearConfig: LinearConfig = {
    apiKey: 'test-key',
    enabled: true,
    eventFilters: [event.eventType],
    teamId: 'team-1',
};

async function main(): Promise<void> {
    assert.equal(INTEGRATION_PROVIDER_FETCH_POLICY.redirect, 'error');
    assert.equal(isRetryableSlackStatus(429), false, 'Slack Retry-After responses must not use fixed-delay retries');
    assert.equal(isRetryableSlackStatus(500), true);
    assert.equal(isRetryableSlackStatus(503), true);
    assert.equal(isRetryableSlackStatus(400), false);
    assert.deepEqual(readAnswerlatticeSmtpRuntimeConfig({
        ANSWERLATTICE_SMTP_HOST: ' smtp.example.com ',
        ANSWERLATTICE_SMTP_PORT: '465',
        ANSWERLATTICE_SMTP_USER: 'notifications@example.com',
        ANSWERLATTICE_SMTP_PASS: 'app-password',
    }), {
        host: 'smtp.example.com',
        port: 465,
        user: 'notifications@example.com',
        pass: 'app-password',
    });
    assert.equal(readAnswerlatticeSmtpRuntimeConfig({
        SMTP_HOST: 'smtp.example.com',
        SMTP_USER: 'wrong-product@example.com',
        SMTP_PASS: 'wrong-product-secret',
    }), null, 'Answerlattice email must not fall back to MenuList/generic SMTP variables');
    assert.equal(readAnswerlatticeSmtpRuntimeConfig({
        ANSWERLATTICE_SMTP_HOST: 'smtp.example.com',
        ANSWERLATTICE_SMTP_PORT: 'not-a-port',
        ANSWERLATTICE_SMTP_USER: 'notifications@example.com',
        ANSWERLATTICE_SMTP_PASS: 'app-password',
    }), null);

    const unsafePayload = Object.create(null) as Record<string, unknown>;
    unsafePayload.__proto__ = 'polluted';
    unsafePayload.apiKey = 'must-not-survive';
    unsafePayload.api_key = 'must-also-not-survive';
    unsafePayload.errors = [
        'https://hooks.slack.com/services/T000/B000/SECRET',
        { token: 'nested-secret' },
        Number.NaN,
        true,
    ];
    unsafePayload.coverageRate = 0.8;
    const sanitizedPayload = sanitizeIntegrationPayload(unsafePayload);
    assert.equal(Object.prototype.hasOwnProperty.call(sanitizedPayload, '__proto__'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(sanitizedPayload, 'apiKey'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(sanitizedPayload, 'api_key'), false);
    assert.deepEqual(sanitizedPayload.errors, ['[redacted]', true]);
    assert.equal(sanitizedPayload.coverageRate, 0.8);
    assert.deepEqual(normalizeEmailConfig({
        enabled: true,
        eventFilters: ['nightly_summary'],
        recipients: ['Owner@Example.com', 'owner@example.com'],
    }).recipients, ['owner@example.com']);
    assert.equal(normalizeSlackConfig({
        enabled: true,
        eventFilters: ['nightly_summary'],
        webhookUrl: 'https://hooks.slack.com/services/T/B/secret?redirect=unexpected',
    }).enabled, false);
    assert.equal(normalizeSlackConfig({
        enabled: true,
        eventFilters: ['nightly_summary'],
        webhookUrl: 'https://hooks.slack.com/services/T/B/secret#unexpected',
    }).enabled, false);

    const malformedLegacyEvent: IntegrationEvent = {
        ...event,
        payload: {
            confidenceScore: 'not-a-number',
            entityNames: 'not-an-array',
            mutationType: '<script>alert(1)</script>',
            signalCount: '</td><img src=x onerror=alert(1)>',
        },
    };
    const malformedMarker = '</td><img src=x onerror=alert(1)>';
    const slackPayload = new SlackAdapter().formatPayload(malformedLegacyEvent);
    const emailPayload = new EmailAdapter().formatPayload(malformedLegacyEvent);
    const linearPayload = new LinearAdapter().formatPayload(malformedLegacyEvent);
    const githubPayload = new GithubAdapter().formatPayload(malformedLegacyEvent);
    for (const formatted of [slackPayload, emailPayload, linearPayload, githubPayload]) {
        assert.equal(JSON.stringify(formatted).includes(malformedMarker), false);
        assert.equal(JSON.stringify(formatted).includes('Confidence'), false, 'proposal notifications must not present an opaque confidence score');
    }
    assert.equal(String(emailPayload.html).includes('<script>alert(1)</script>'), false);
    assert.equal(String(emailPayload.html).includes('&lt;script&gt;alert(1)&lt;/script&gt;'), true);

    const slackControlEvent: IntegrationEvent = {
        ...event,
        eventType: INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING,
        payload: {
            entityName: '<!channel> & <https://example.com|open>',
            entityType: 'support_generation',
            failureCount: 3,
            failurePhases: ['draft_generation <!here>'],
            windowDays: 1,
        },
    };
    const slackControlPayload = new SlackAdapter().formatPayload(slackControlEvent);
    const slackControlJson = JSON.stringify(slackControlPayload);
    assert.equal(slackControlJson.includes('<!channel>'), false);
    assert.equal(slackControlJson.includes('<!here>'), false);
    assert.equal(slackControlJson.includes('<https://example.com|open>'), false);
    assert.equal(slackControlJson.includes('&lt;!channel&gt; &amp; &lt;https://example.com|open&gt;'), true);
    assert.equal(slackControlJson.includes('draft_generation &lt;!here&gt;'), true);
    assert.equal(slackControlJson.includes('"verbatim":true'), true);
    const emailControlPayload = new EmailAdapter().formatPayload(slackControlEvent);
    assert.equal(emailControlPayload.subject.includes('Repeated AI Workflow Failure'), true);
    assert.equal(emailControlPayload.html.includes('Failed phases:'), true);
    assert.equal(emailControlPayload.html.includes('draft_generation &lt;!here&gt;'), true);
    assert.equal(emailControlPayload.html.includes('Common Queries'), false);

    await assert.rejects(
        readIntegrationProviderJson(new Response('x'.repeat(INTEGRATION_PROVIDER_JSON_MAX_BYTES + 1))),
        /Integration provider response exceeded the configured limit/,
    );

    const originalFetch = globalThis.fetch;
    try {
        let requestCount = 0;
        globalThis.fetch = (async (_input, init) => {
            requestCount += 1;
            assert.equal(init?.redirect, 'error');
            return new Response('x'.repeat(INTEGRATION_PROVIDER_JSON_MAX_BYTES + 1), { status: 201 });
        }) as typeof fetch;
        const githubResult = await new GithubAdapter().send(event, githubConfig);
        assert.equal(githubResult.success, true, 'GitHub 2xx remains authoritative when optional diagnostics are oversized');
        assert.equal(requestCount, 1);

        globalThis.fetch = (async (_input, init) => {
            assert.equal(init?.redirect, 'error');
            return new Response(JSON.stringify({
                data: {
                    issueCreate: {
                        issue: { id: 'issue-1', identifier: 'GOV-1', title: 'Created' },
                        success: true,
                    },
                },
            }), { status: 200 });
        }) as typeof fetch;
        const linearSuccess = await new LinearAdapter().send(event, linearConfig);
        assert.equal(linearSuccess.success, true);

        globalThis.fetch = (async () => new Response(JSON.stringify({
            errors: [{ message: 'provider detail must not be persisted' }],
        }), { status: 200 })) as typeof fetch;
        const linearGraphqlFailure = await new LinearAdapter().send(event, linearConfig);
        assert.equal(linearGraphqlFailure.success, false);
        assert.equal(linearGraphqlFailure.error, 'Linear issue creation returned errors');
        assert.equal(JSON.stringify(linearGraphqlFailure).includes('provider detail'), false);

        globalThis.fetch = (async () => new Response(
            'x'.repeat(INTEGRATION_PROVIDER_JSON_MAX_BYTES + 1),
            { status: 200 },
        )) as typeof fetch;
        const linearOversized = await new LinearAdapter().send(event, linearConfig);
        assert.equal(linearOversized.success, false);
        assert.equal(linearOversized.retryable, false);
        assert.equal(linearOversized.error, 'Linear issue creation failed');
    } finally {
        globalThis.fetch = originalFetch;
    }

    console.log('Answerlattice integration adapter boundaries passed.');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
