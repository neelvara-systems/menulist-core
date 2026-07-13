/**
 * Answerlattice — Slack Integration Adapter
 * 
 * Sends governance events to Slack via Incoming Webhook.
 * Uses Block Kit for rich message formatting.
 * No Slack app installation required — just a webhook URL.
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §5.4
 */

import {
    IIntegrationAdapter,
    IntegrationEvent,
    SlackConfig,
    DeliveryResult,
    ADAPTER_TYPES,
    INTEGRATION_LIMITS,
    INTEGRATION_EVENT_TYPES,
} from '../types';
import {
    safePayloadCount,
    safePayloadRatio,
    safePayloadStringArray,
    safeText,
} from '../safety';
import { validateNetworkTargetUrl } from '../../utils/networkTarget';
import { INTEGRATION_PROVIDER_FETCH_POLICY } from './providerJson';

const SEVERITY_EMOJI: Record<string, string> = {
    critical: '🚨',
    high: '🔴',
    medium: '🟡',
    low: '📊',
};

const EVENT_EMOJI: Record<string, string> = {
    [INTEGRATION_EVENT_TYPES.DRIFT_DETECTED]: '🔴',
    [INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED]: '🟡',
    [INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED]: '🟠',
    [INTEGRATION_EVENT_TYPES.COVERAGE_DROP]: '🚨',
    [INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED]: '✅',
    [INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING]: '⚠️',
    [INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY]: '📊',
};

const EVENT_TITLES: Record<string, string> = {
    [INTEGRATION_EVENT_TYPES.DRIFT_DETECTED]: 'Drift Detected',
    [INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED]: 'Mutation Proposed',
    [INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED]: 'Knowledge Gap Detected',
    [INTEGRATION_EVENT_TYPES.COVERAGE_DROP]: 'Coverage Drop',
    [INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED]: 'Article Approved',
    [INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING]: 'Recurring AI Failure',
    [INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY]: 'Nightly Summary',
};

async function resolveSlackWebhookTarget(webhookUrl: string): Promise<{ normalizedUrl: string } | null> {
    let parsed: URL;
    try {
        parsed = new URL(webhookUrl);
    } catch {
        return null;
    }

    if (
        parsed.protocol !== 'https:' ||
        parsed.hostname !== 'hooks.slack.com' ||
        !parsed.pathname.startsWith('/services/') ||
        Boolean(parsed.search) ||
        Boolean(parsed.hash)
    ) {
        return null;
    }

    const targetValidation = await validateNetworkTargetUrl(parsed.toString());
    if (!targetValidation.valid || !targetValidation.normalizedUrl) return null;
    return { normalizedUrl: targetValidation.normalizedUrl };
}

function formatEventDetails(event: IntegrationEvent): string {
    const p = event.payload;
    if (p.test === true) {
        return '*Test notification:* Answerlattice workflow notifications are connected.';
    }

    switch (event.eventType) {
        case INTEGRATION_EVENT_TYPES.DRIFT_DETECTED:
            return `*Answer:* ${safeText(p.answerTitle || 'Unknown')}\n*Drift Class:* ${safeText(p.driftClass)}\n*Reason:* ${safeText(p.driftReason, 220)}\n*Entity:* ${safeText(p.entityName)} (${safeText(p.entityType, 60)})`;

        case INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED:
            return `*Type:* ${safeText(p.mutationType)}\n*Entities:* ${safePayloadStringArray(p.entityNames, 5, 80).join(', ')}\n*Signals:* ${safePayloadCount(p.signalCount)}\n*Confidence:* ${Math.round(safePayloadRatio(p.confidenceScore) * 100)}%`;

        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            return `*Entity:* ${safeText(p.entityName)} (${safeText(p.entityType, 60)})\n*Fallbacks:* ${safePayloadCount(p.fallbackCount)} in ${safePayloadCount(p.windowDays, 3650)} days\n*Sample queries:* ${safePayloadStringArray(p.sampleQueries, 2, 120).join(', ')}`;

        case INTEGRATION_EVENT_TYPES.COVERAGE_DROP:
            return `*Current:* ${Math.round(safePayloadRatio(p.currentRate) * 100)}%\n*Previous:* ${Math.round(safePayloadRatio(p.previousRate) * 100)}%\n*Threshold:* ${Math.round(safePayloadRatio(p.threshold) * 100)}%\n*Queries:* ${safePayloadCount(p.totalQueries)} total, ${safePayloadCount(p.canonicalHits)} canonical`;

        case INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED:
            return `*Answer:* ${safeText(p.answerTitle)}\n*Type:* ${safeText(p.mutationType)}\n*Approved by:* ${safeText(p.approvedBy, 80)}\n*Entities:* ${safePayloadStringArray(p.entityNames, 5, 80).join(', ')}`;

        case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
            return `*Entity:* ${safeText(p.entityName)} (${safeText(p.entityType, 60)})\n*Failures:* ${safePayloadCount(p.failureCount)} in ${safePayloadCount(p.windowDays, 3650)} days\n*Common queries:* ${safePayloadStringArray(p.commonQueries, 2, 120).join(', ')}`;

        case INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY: {
            const lines = [
                `*Tenants processed:* ${safePayloadCount(p.tenantsProcessed)}`,
                `*Drift:* ${safePayloadCount(p.driftDetected)} detected, ${safePayloadCount(p.driftCleared)} cleared`,
                `*Proposals:* ${safePayloadCount(p.proposalsCreated)} created`,
                `*Coverage:* ${Math.round(safePayloadRatio(p.coverageRate) * 100)}%`,
                `*Signals archived:* ${safePayloadCount(p.signalsArchived)}`,
            ];
            const errors = safePayloadStringArray(p.errors);
            if (errors.length > 0) {
                lines.push(`*Errors:* ${errors.length}`);
            }
            return lines.join('\n');
        }

        default:
            return safeText(JSON.stringify(p, null, 2), 500);
    }
}

export class SlackAdapter implements IIntegrationAdapter {
    readonly adapterType = ADAPTER_TYPES.SLACK;

    formatPayload(event: IntegrationEvent): Record<string, unknown> {
        const emoji = EVENT_EMOJI[event.eventType] || SEVERITY_EMOJI[event.severity] || 'ℹ️';
        const title = EVENT_TITLES[event.eventType] || event.eventType;
        const details = formatEventDetails(event);

        return {
            blocks: [
                {
                    type: 'header',
                    text: {
                        type: 'plain_text',
                        text: `${emoji} ${title}`,
                        emoji: true,
                    },
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: details,
                    },
                },
                {
                    type: 'context',
                    elements: [
                        {
                            type: 'mrkdwn',
                            text: `*Severity:* ${event.severity.toUpperCase()} | *Time:* ${new Date(event.createdAt.toMillis()).toISOString()}`,
                        },
                    ],
                },
                {
                    type: 'divider',
                },
            ],
            text: `${emoji} Answerlattice: ${title}`, // Fallback for notifications
        };
    }

    async send(event: IntegrationEvent, config: SlackConfig): Promise<DeliveryResult> {
        const startMs = Date.now();

        if (!config.webhookUrl || !config.webhookUrl.startsWith('https://hooks.slack.com/services/')) {
            return {
                success: false,
                error: 'Slack webhook URL is not configured',
                durationMs: Date.now() - startMs,
            };
        }

        try {
            const payload = this.formatPayload(event);
            const webhookTarget = await resolveSlackWebhookTarget(config.webhookUrl);
            if (!webhookTarget) {
                return {
                    success: false,
                    error: 'Slack webhook target rejected',
                    durationMs: Date.now() - startMs,
                };
            }

            const response = await (async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), INTEGRATION_LIMITS.ADAPTER_TIMEOUT_MS);
                try {
                    return await fetch(webhookTarget.normalizedUrl, {
                        ...INTEGRATION_PROVIDER_FETCH_POLICY,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: controller.signal,
                    });
                } finally {
                    clearTimeout(timeout);
                }
            })();

            const durationMs = Date.now() - startMs;

            if (response.ok) {
                return { success: true, statusCode: response.status, durationMs };
            }

            return {
                success: false,
                retryable: response.status === 429 || response.status >= 500,
                statusCode: response.status,
                error: 'Slack delivery returned bad status',
                durationMs,
            };
        } catch {
            return {
                success: false,
                retryable: false,
                error: 'Slack delivery failed',
                durationMs: Date.now() - startMs,
            };
        }
    }
}
