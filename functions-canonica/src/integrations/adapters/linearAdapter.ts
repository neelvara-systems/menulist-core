/**
 * Canonica — Linear Integration Adapter
 * 
 * Creates Linear issues from governance events via GraphQL API.
 * Trigger events: mutation_proposed, knowledge_gap_detected, ai_failure_recurring
 * 
 * @see __docs__/canonica/workflow-integrations/workflow-integrations_impl.md §5.6
 */

import * as logger from 'firebase-functions/logger';
import {
    IIntegrationAdapter,
    IntegrationEvent,
    LinearConfig,
    DeliveryResult,
    ADAPTER_TYPES,
    INTEGRATION_LIMITS,
    INTEGRATION_EVENT_TYPES,
} from '../types';
import { safeText, sanitizeDeliveryError } from '../safety';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

const EVENT_TITLES: Record<string, string> = {
    [INTEGRATION_EVENT_TYPES.DRIFT_DETECTED]: 'Drift Detected',
    [INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED]: 'Mutation Proposed',
    [INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED]: 'Knowledge Gap Detected',
    [INTEGRATION_EVENT_TYPES.COVERAGE_DROP]: 'Coverage Drop',
    [INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED]: 'Article Approved',
    [INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING]: 'Recurring AI Failure',
    [INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY]: 'Nightly Summary',
};

// Map severity to Linear priority (1=urgent, 2=high, 3=medium, 4=low, 0=none)
const SEVERITY_TO_PRIORITY: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
};

function formatIssueDescription(event: IntegrationEvent): string {
    const p = event.payload;
    const lines: string[] = [
        `**Event:** ${event.eventType}`,
        `**Severity:** ${event.severity.toUpperCase()}`,
        `**Time:** ${new Date(event.createdAt.toMillis()).toISOString()}`,
        '',
        '---',
        '',
    ];

    switch (event.eventType) {
        case INTEGRATION_EVENT_TYPES.DRIFT_DETECTED:
            lines.push(
                `**Answer:** ${safeText(p.answerTitle || 'Unknown')}`,
                `**Drift Class:** ${safeText(p.driftClass)}`,
                `**Reason:** ${safeText(p.driftReason, 220)}`,
                `**Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
            );
            break;

        case INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED:
            lines.push(
                `**Mutation Type:** ${p.mutationType}`,
                `**Entities:** ${(p.entityNames || []).map((name: unknown) => safeText(name, 80)).join(', ')}`,
                `**Signal Count:** ${p.signalCount}`,
                `**Confidence:** ${Math.round((p.confidenceScore || 0) * 100)}%`,
            );
            break;

        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            lines.push(
                `**Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
                `**Fallback Count:** ${p.fallbackCount} in ${p.windowDays} days`,
                `**Sample Queries:**`,
                ...(p.sampleQueries || []).map((q: string) => `- ${safeText(q, 160)}`),
            );
            break;

        case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
            lines.push(
                `**Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
                `**Failure Count:** ${p.failureCount} in ${p.windowDays} days`,
                `**Common Queries:**`,
                ...(p.commonQueries || []).map((q: string) => `- ${safeText(q, 160)}`),
            );
            break;

        default:
            lines.push('```json', safeText(JSON.stringify(p, null, 2), 500), '```');
    }

    lines.push('', '---', '*Created automatically by Canonica governance engine.*');
    return lines.join('\n');
}

export class LinearAdapter implements IIntegrationAdapter {
    readonly adapterType = ADAPTER_TYPES.LINEAR;

    formatPayload(event: IntegrationEvent): { title: string; description: string; priority: number } {
        const eventTitle = EVENT_TITLES[event.eventType] || event.eventType;
        const entityName = safeText(event.payload.entityName || event.payload.answerTitle || '', 80);
        const title = entityName
            ? `[Canonica] ${eventTitle}: ${entityName}`
            : `[Canonica] ${eventTitle}`;

        return {
            title: title.slice(0, 200),
            description: formatIssueDescription(event),
            priority: SEVERITY_TO_PRIORITY[event.severity] || 3,
        };
    }

    async send(event: IntegrationEvent, config: LinearConfig): Promise<DeliveryResult> {
        const startMs = Date.now();

        if (!config.apiKey) {
            return { success: false, error: 'No API key configured', durationMs: Date.now() - startMs };
        }
        if (!config.teamId) {
            return { success: false, error: 'No team ID configured', durationMs: Date.now() - startMs };
        }

        try {
            const { title, description, priority } = this.formatPayload(event);

            const mutation = `
                mutation IssueCreate($input: IssueCreateInput!) {
                    issueCreate(input: $input) {
                        success
                        issue { id identifier title }
                    }
                }
            `;

            const variables = {
                input: {
                    teamId: config.teamId,
                    title,
                    description,
                    priority,
                    labelIds: [], // Linear labels can be added via config in future
                },
            };

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), INTEGRATION_LIMITS.LINEAR_TIMEOUT_MS);

            const response = await fetch(LINEAR_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': config.apiKey,
                },
                body: JSON.stringify({ query: mutation, variables }),
                signal: controller.signal,
            });

            clearTimeout(timeout);
            const durationMs = Date.now() - startMs;

            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                return { success: false, statusCode: response.status, error: sanitizeDeliveryError(errorText), durationMs };
            }

            const data = await response.json() as any;

            if (data.errors && data.errors.length > 0) {
                return { success: false, error: sanitizeDeliveryError(data.errors[0]?.message || 'GraphQL error'), durationMs };
            }

            if (data.data?.issueCreate?.success) {
                const issue = data.data.issueCreate.issue;
                logger.info('[Canonica Integration] Linear issue created', {
                    issueIdentifier: issue?.identifier,
                    issueId: issue?.id,
                });
                return { success: true, statusCode: 200, durationMs };
            }

            return { success: false, error: 'Issue creation returned success=false', durationMs };
        } catch (error) {
            return {
                success: false,
                error: sanitizeDeliveryError(error),
                durationMs: Date.now() - startMs,
            };
        }
    }
}
