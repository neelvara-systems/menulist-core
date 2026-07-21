/**
 * Answerlattice — Linear Integration Adapter
 * 
 * Creates Linear issues from governance events via GraphQL API.
 * Trigger events: mutation_proposed, knowledge_gap_detected, ai_failure_recurring
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §5.6
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
import {
    safePayloadCount,
    safePayloadStringArray,
    safeText,
} from '../safety';
import {
    INTEGRATION_PROVIDER_FETCH_POLICY,
    isIntegrationProviderRecord,
    readIntegrationProviderJson,
} from './providerJson';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

const EVENT_TITLES: Record<string, string> = {
    [INTEGRATION_EVENT_TYPES.DRIFT_DETECTED]: 'Drift Detected',
    [INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED]: 'Mutation Proposed',
    [INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED]: 'Knowledge Gap Detected',
    [INTEGRATION_EVENT_TYPES.COVERAGE_DROP]: 'Coverage Drop',
    [INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED]: 'Article Approved',
    [INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING]: 'Repeated AI Workflow Failure',
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
                `**Mutation Type:** ${safeText(p.mutationType)}`,
                `**Entities:** ${safePayloadStringArray(p.entityNames, 5, 80).join(', ')}`,
                `**Signal Count:** ${safePayloadCount(p.signalCount)}`,
            );
            break;

        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            lines.push(
                `**Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
                `**Fallback Count:** ${safePayloadCount(p.fallbackCount)} in ${safePayloadCount(p.windowDays, 3650)} days`,
                `**Sample Queries:**`,
                ...safePayloadStringArray(p.sampleQueries, 5, 160).map(q => `- ${q}`),
            );
            break;

        case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
            lines.push(
                `**Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
                `**Failure Count:** ${safePayloadCount(p.failureCount)} in ${safePayloadCount(p.windowDays, 3650)} days`,
                `**Failed Phases:**`,
                ...safePayloadStringArray(p.failurePhases || p.commonQueries, 5, 160).map(q => `- ${q}`),
            );
            break;

        default:
            lines.push('```json', safeText(JSON.stringify(p, null, 2), 500), '```');
    }

    lines.push('', '---', '*Created automatically by Answerlattice governance engine.*');
    return lines.join('\n');
}

export class LinearAdapter implements IIntegrationAdapter {
    readonly adapterType = ADAPTER_TYPES.LINEAR;

    formatPayload(event: IntegrationEvent): { title: string; description: string; priority: number } {
        const eventTitle = EVENT_TITLES[event.eventType] || event.eventType;
        const entityName = safeText(event.payload.entityName || event.payload.answerTitle || '', 80);
        const title = entityName
            ? `[Answerlattice] ${eventTitle}: ${entityName}`
            : `[Answerlattice] ${eventTitle}`;

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

            const response = await (async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), INTEGRATION_LIMITS.LINEAR_TIMEOUT_MS);
                try {
                    return await fetch(LINEAR_API_URL, {
                        ...INTEGRATION_PROVIDER_FETCH_POLICY,
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': config.apiKey,
                        },
                        body: JSON.stringify({ query: mutation, variables }),
                        signal: controller.signal,
                    });
                } finally {
                    clearTimeout(timeout);
                }
            })();

            if (!response.ok) {
                return {
                    success: false,
                    retryable: response.status === 429 || response.status >= 500,
                    statusCode: response.status,
                    error: 'Linear issue creation returned bad status',
                    durationMs: Date.now() - startMs,
                };
            }

            const payload = await readIntegrationProviderJson(response);
            const root = isIntegrationProviderRecord(payload) ? payload : null;
            const errors = root && Array.isArray(root.errors) ? root.errors : [];

            if (errors.length > 0) {
                return {
                    success: false,
                    error: 'Linear issue creation returned errors',
                    durationMs: Date.now() - startMs,
                };
            }

            const data = isIntegrationProviderRecord(root?.data) ? root.data : null;
            const issueCreate = isIntegrationProviderRecord(data?.issueCreate) ? data.issueCreate : null;
            if (issueCreate?.success === true) {
                const issue = isIntegrationProviderRecord(issueCreate.issue) ? issueCreate.issue : null;
                const issueIdentifier = typeof issue?.identifier === 'string' ? issue.identifier : '';
                const issueId = typeof issue?.id === 'string' ? issue.id : '';
                logger.info('[Answerlattice Integration] Linear issue created', {
                    issueIdentifierPresent: issueIdentifier.length > 0,
                    issueIdentifierLength: issueIdentifier.length,
                    issueIdPresent: issueId.length > 0,
                    issueIdLength: issueId.length,
                });
                return { success: true, statusCode: 200, durationMs: Date.now() - startMs };
            }

            return {
                success: false,
                error: 'Issue creation returned success=false',
                durationMs: Date.now() - startMs,
            };
        } catch {
            return {
                success: false,
                retryable: false,
                error: 'Linear issue creation failed',
                durationMs: Date.now() - startMs,
            };
        }
    }
}
