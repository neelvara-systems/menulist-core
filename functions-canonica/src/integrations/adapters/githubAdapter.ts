/**
 * Canonica — GitHub Integration Adapter
 * 
 * Creates GitHub issues from governance events via REST API.
 * Trigger events: mutation_proposed, knowledge_gap_detected, ai_failure_recurring
 * 
 * @see __docs__/canonica/workflow-integrations/workflow-integrations_impl.md §5.7
 */

import {
    IIntegrationAdapter,
    IntegrationEvent,
    GithubConfig,
    DeliveryResult,
    ADAPTER_TYPES,
    INTEGRATION_LIMITS,
    INTEGRATION_EVENT_TYPES,
} from '../types';

const GITHUB_API_URL = 'https://api.github.com';

const EVENT_TITLES: Record<string, string> = {
    [INTEGRATION_EVENT_TYPES.DRIFT_DETECTED]: 'Drift Detected',
    [INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED]: 'Mutation Proposed',
    [INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED]: 'Knowledge Gap Detected',
    [INTEGRATION_EVENT_TYPES.COVERAGE_DROP]: 'Coverage Drop',
    [INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED]: 'Article Approved',
    [INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING]: 'Recurring AI Failure',
    [INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY]: 'Nightly Summary',
};

function formatIssueBody(event: IntegrationEvent): string {
    const p = event.payload;
    const lines: string[] = [
        `## Canonica Governance Event`,
        '',
        `| Field | Value |`,
        `|-------|-------|`,
        `| **Event** | ${event.eventType} |`,
        `| **Severity** | ${event.severity.toUpperCase()} |`,
        `| **Time** | ${new Date(event.createdAt.toMillis()).toISOString()} |`,
        '',
    ];

    switch (event.eventType) {
        case INTEGRATION_EVENT_TYPES.DRIFT_DETECTED:
            lines.push(
                `### Drift Details`,
                '',
                `- **Answer:** ${p.answerTitle || 'Unknown'}`,
                `- **Drift Class:** ${p.driftClass}`,
                `- **Reason:** ${p.driftReason}`,
                `- **Entity:** ${p.entityName} (${p.entityType})`,
            );
            break;

        case INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED:
            lines.push(
                `### Mutation Details`,
                '',
                `- **Type:** ${p.mutationType}`,
                `- **Entities:** ${(p.entityNames || []).join(', ')}`,
                `- **Signal Count:** ${p.signalCount}`,
                `- **Confidence:** ${Math.round((p.confidenceScore || 0) * 100)}%`,
            );
            break;

        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            lines.push(
                `### Knowledge Gap Details`,
                '',
                `- **Entity:** ${p.entityName} (${p.entityType})`,
                `- **Fallback Count:** ${p.fallbackCount} in ${p.windowDays} days`,
                '',
                `**Sample Queries:**`,
                ...(p.sampleQueries || []).map((q: string) => `- ${q}`),
            );
            break;

        case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
            lines.push(
                `### AI Failure Details`,
                '',
                `- **Entity:** ${p.entityName} (${p.entityType})`,
                `- **Failure Count:** ${p.failureCount} in ${p.windowDays} days`,
                '',
                `**Common Queries:**`,
                ...(p.commonQueries || []).map((q: string) => `- ${q}`),
            );
            break;

        default:
            lines.push('```json', JSON.stringify(p, null, 2).slice(0, 500), '```');
    }

    lines.push('', '---', '*Created automatically by Canonica governance engine.*');
    return lines.join('\n');
}

function getLabels(event: IntegrationEvent): string[] {
    const labels = ['canonica'];

    switch (event.eventType) {
        case INTEGRATION_EVENT_TYPES.DRIFT_DETECTED:
            labels.push('drift');
            break;
        case INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED:
            labels.push('mutation');
            break;
        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            labels.push('knowledge-gap');
            break;
        case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
            labels.push('ai-failure');
            break;
        case INTEGRATION_EVENT_TYPES.COVERAGE_DROP:
            labels.push('coverage');
            break;
    }

    return labels;
}

export class GithubAdapter implements IIntegrationAdapter {
    readonly adapterType = ADAPTER_TYPES.GITHUB;

    formatPayload(event: IntegrationEvent): { title: string; body: string; labels: string[] } {
        const eventTitle = EVENT_TITLES[event.eventType] || event.eventType;
        const entityName = event.payload.entityName || event.payload.answerTitle || '';
        const title = entityName
            ? `[Canonica] ${eventTitle}: ${entityName}`
            : `[Canonica] ${eventTitle}`;

        return {
            title: title.slice(0, 200),
            body: formatIssueBody(event),
            labels: getLabels(event),
        };
    }

    async send(event: IntegrationEvent, config: GithubConfig): Promise<DeliveryResult> {
        const startMs = Date.now();

        if (!config.token) {
            return { success: false, error: 'No GitHub token configured', durationMs: Date.now() - startMs };
        }
        if (!config.owner || !config.repo) {
            return { success: false, error: 'No owner/repo configured', durationMs: Date.now() - startMs };
        }

        try {
            const { title, body, labels } = this.formatPayload(event);
            const url = `${GITHUB_API_URL}/repos/${config.owner}/${config.repo}/issues`;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), INTEGRATION_LIMITS.GITHUB_TIMEOUT_MS);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github+json',
                    'Authorization': `Bearer ${config.token}`,
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ title, body, labels }),
                signal: controller.signal,
            });

            clearTimeout(timeout);
            const durationMs = Date.now() - startMs;

            if (response.ok) {
                const data = await response.json() as any;
                console.log(`[Canonica Integration] GitHub issue created: #${data.number}`);
                return { success: true, statusCode: response.status, durationMs };
            }

            const errorText = await response.text().catch(() => 'Unknown error');
            return { success: false, statusCode: response.status, error: errorText.slice(0, 200), durationMs };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                durationMs: Date.now() - startMs,
            };
        }
    }
}
