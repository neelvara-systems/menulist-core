/**
 * Canonica — Slack Integration Adapter
 * 
 * Sends governance events to Slack via Incoming Webhook.
 * Uses Block Kit for rich message formatting.
 * No Slack app installation required — just a webhook URL.
 * 
 * @see __docs__/canonica/workflow-integrations/workflow-integrations_impl.md §5.4
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

function formatEventDetails(event: IntegrationEvent): string {
    const p = event.payload;

    switch (event.eventType) {
        case INTEGRATION_EVENT_TYPES.DRIFT_DETECTED:
            return `*Answer:* ${p.answerTitle || 'Unknown'}\n*Drift Class:* ${p.driftClass}\n*Reason:* ${p.driftReason}\n*Entity:* ${p.entityName} (${p.entityType})`;

        case INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED:
            return `*Type:* ${p.mutationType}\n*Entities:* ${(p.entityNames || []).join(', ')}\n*Signals:* ${p.signalCount}\n*Confidence:* ${Math.round((p.confidenceScore || 0) * 100)}%`;

        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            return `*Entity:* ${p.entityName} (${p.entityType})\n*Fallbacks:* ${p.fallbackCount} in ${p.windowDays} days\n*Sample queries:* ${(p.sampleQueries || []).slice(0, 2).join(', ')}`;

        case INTEGRATION_EVENT_TYPES.COVERAGE_DROP:
            return `*Current:* ${Math.round((p.currentRate || 0) * 100)}%\n*Previous:* ${Math.round((p.previousRate || 0) * 100)}%\n*Threshold:* ${Math.round((p.threshold || 0) * 100)}%\n*Queries:* ${p.totalQueries} total, ${p.canonicalHits} canonical`;

        case INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED:
            return `*Answer:* ${p.answerTitle}\n*Type:* ${p.mutationType}\n*Approved by:* ${p.approvedBy}\n*Entities:* ${(p.entityNames || []).join(', ')}`;

        case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
            return `*Entity:* ${p.entityName} (${p.entityType})\n*Failures:* ${p.failureCount} in ${p.windowDays} days\n*Common queries:* ${(p.commonQueries || []).slice(0, 2).join(', ')}`;

        case INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY: {
            const lines = [
                `*Tenants processed:* ${p.tenantsProcessed}`,
                `*Drift:* ${p.driftDetected} detected, ${p.driftCleared} cleared`,
                `*Proposals:* ${p.proposalsCreated} created`,
                `*Coverage:* ${Math.round((p.coverageRate || 0) * 100)}%`,
                `*Signals archived:* ${p.signalsArchived}`,
            ];
            if (p.errors && p.errors.length > 0) {
                lines.push(`*Errors:* ${p.errors.length}`);
            }
            return lines.join('\n');
        }

        default:
            return JSON.stringify(p, null, 2).slice(0, 500);
    }
}

export class SlackAdapter implements IIntegrationAdapter {
    readonly adapterType = ADAPTER_TYPES.SLACK;

    formatPayload(event: IntegrationEvent): Record<string, any> {
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
            text: `${emoji} Canonica: ${title}`, // Fallback for notifications
        };
    }

    async send(event: IntegrationEvent, config: SlackConfig): Promise<DeliveryResult> {
        const startMs = Date.now();

        if (!config.webhookUrl) {
            return {
                success: false,
                error: 'No webhook URL configured',
                durationMs: Date.now() - startMs,
            };
        }

        try {
            const payload = this.formatPayload(event);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), INTEGRATION_LIMITS.ADAPTER_TIMEOUT_MS);

            const response = await fetch(config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });

            clearTimeout(timeout);

            const durationMs = Date.now() - startMs;

            if (response.ok) {
                return { success: true, statusCode: response.status, durationMs };
            }

            const errorText = await response.text().catch(() => 'Unknown error');
            return {
                success: false,
                statusCode: response.status,
                error: errorText.slice(0, 200),
                durationMs,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                durationMs: Date.now() - startMs,
            };
        }
    }
}
