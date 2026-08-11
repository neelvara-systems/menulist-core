export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS,
    AnswerlatticeGitHubInstallationRepositoriesWebhookSchema,
    AnswerlatticeGitHubInstallationWebhookSchema,
    AnswerlatticeGitHubPullRequestWebhookSchema,
    AnswerlatticeGitHubReleaseWebhookSchema,
} from '@lib/answerlattice/githubChangeIntakeContracts';
import {
    getAnswerlatticeGitHubWebhookSecret,
    isAnswerlatticeGitHubChangeIntakeConfigured,
    processAnswerlatticeGitHubPullRequestWebhook,
    processAnswerlatticeGitHubReleaseWebhook,
    removeAnswerlatticeGitHubRepositoryBindings,
    updateAnswerlatticeGitHubInstallationState,
} from '@lib/answerlattice/githubChangeIntakeServer';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedTextBody } from '@lib/security/boundedRequestBody';
import { validateGitHubWebhook } from '@lib/security/webhookValidation';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const WEBHOOK_HEADERS = {
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

const webhookJson = (body: unknown, status = 200) => NextResponse.json(body, {
    status,
    headers: WEBHOOK_HEADERS,
});

const getInstallationId = (payload: unknown): number | null => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const installation = (payload as Record<string, unknown>).installation;
    if (!installation || typeof installation !== 'object' || Array.isArray(installation)) return null;
    const value = (installation as Record<string, unknown>).id;
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
};

export async function POST(request: NextRequest) {
    if (
        !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS
        || !isAnswerlatticeGitHubChangeIntakeConfigured()
    ) return webhookJson({ error: 'Not found' }, 404);

    const bodyResult = await readBoundedTextBody(
        request,
        ANSWERLATTICE_GITHUB_CHANGE_INTAKE_LIMITS.MAX_WEBHOOK_BYTES,
        { invalidRequestMessage: 'Invalid webhook.', tooLargeMessage: 'Webhook is too large.' },
    );
    if (bodyResult.ok === false) return webhookJson({ error: 'Invalid webhook.' }, bodyResult.response.status);

    const signature = request.headers.get('x-hub-signature-256') || '';
    if (!validateGitHubWebhook(bodyResult.body, signature, getAnswerlatticeGitHubWebhookSecret())) {
        return webhookJson({ error: 'Invalid signature.' }, 401);
    }

    const eventName = request.headers.get('x-github-event') || '';
    const deliveryId = request.headers.get('x-github-delivery') || '';
    if (!/^[a-z_]{1,80}$/.test(eventName) || !/^[A-Za-z0-9-]{1,128}$/.test(deliveryId)) {
        return webhookJson({ error: 'Invalid webhook headers.' }, 400);
    }

    let payload: unknown;
    try {
        payload = JSON.parse(bodyResult.body);
    } catch {
        return webhookJson({ error: 'Invalid webhook payload.' }, 400);
    }
    if (eventName === 'ping') return webhookJson({ accepted: true, event: 'ping' });

    const installationId = getInstallationId(payload);
    if (!installationId) return webhookJson({ error: 'Invalid installation.' }, 400);
    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey('answerlattice-github-webhook', installationId),
        limit: 300,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        return webhookJson(
            { error: rateLimit.reason === 'provider_unavailable' ? 'Webhook processing is temporarily unavailable.' : 'Webhook rate limit exceeded.' },
            rateLimit.reason === 'provider_unavailable' ? 503 : 429,
        );
    }

    try {
        if (eventName === 'release') {
            const event = AnswerlatticeGitHubReleaseWebhookSchema.parse(payload);
            const result = await processAnswerlatticeGitHubReleaseWebhook({ deliveryId, event });
            return webhookJson({ accepted: result.failed === 0, result }, result.failed > 0 ? 503 : 200);
        }
        if (eventName === 'pull_request') {
            const event = AnswerlatticeGitHubPullRequestWebhookSchema.parse(payload);
            const result = await processAnswerlatticeGitHubPullRequestWebhook({ deliveryId, event });
            return webhookJson({ accepted: result.failed === 0, result }, result.failed > 0 ? 503 : 200);
        }
        if (eventName === 'installation') {
            const action = payload && typeof payload === 'object' && !Array.isArray(payload)
                ? (payload as Record<string, unknown>).action
                : null;
            if (!['deleted', 'suspend', 'unsuspend'].includes(String(action || ''))) {
                return webhookJson({ accepted: true, ignored: true });
            }
            const event = AnswerlatticeGitHubInstallationWebhookSchema.parse(payload);
            await updateAnswerlatticeGitHubInstallationState({
                action: event.action,
                installationId: event.installation.id,
            });
            return webhookJson({ accepted: true });
        }
        if (eventName === 'installation_repositories') {
            const action = payload && typeof payload === 'object' && !Array.isArray(payload)
                ? (payload as Record<string, unknown>).action
                : null;
            if (!['added', 'removed'].includes(String(action || ''))) {
                return webhookJson({ accepted: true, ignored: true });
            }
            const event = AnswerlatticeGitHubInstallationRepositoriesWebhookSchema.parse(payload);
            if (event.action === 'removed' && event.repositories_removed.length > 0) {
                await removeAnswerlatticeGitHubRepositoryBindings({
                    installationId: event.installation.id,
                    repositoryIds: event.repositories_removed.map(repository => repository.id),
                });
            }
            return webhookJson({ accepted: true, ignored: event.action === 'added' });
        }
        return webhookJson({ accepted: true, ignored: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return webhookJson({ error: 'Invalid webhook payload.' }, 400);
        }
        logRuntimeFailure('answerlattice_github_webhook_failed', error, {
            endpoint: '/api/answerlattice/webhooks/github',
            eventName,
        });
        return webhookJson({ error: 'Webhook processing failed.' }, 503);
    }
}
