/**
 * Answerlattice — GitHub Integration Adapter
 * 
 * Creates GitHub issues from governance events via REST API.
 * Trigger events: mutation_proposed, knowledge_gap_detected, ai_failure_recurring
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §5.7
 */

import * as logger from 'firebase-functions/logger';
import {
    IIntegrationAdapter,
    IntegrationEvent,
    GithubConfig,
    DeliveryResult,
    ADAPTER_TYPES,
    INTEGRATION_LIMITS,
    INTEGRATION_EVENT_TYPES,
} from '../types';
import { safeText } from '../safety';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;

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
        `## Answerlattice Governance Event`,
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
                `- **Answer:** ${safeText(p.answerTitle || 'Unknown')}`,
                `- **Drift Class:** ${safeText(p.driftClass)}`,
                `- **Reason:** ${safeText(p.driftReason, 220)}`,
                `- **Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
            );
            break;

        case INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED:
            lines.push(
                `### Mutation Details`,
                '',
                `- **Type:** ${p.mutationType}`,
                `- **Entities:** ${(p.entityNames || []).map((name: unknown) => safeText(name, 80)).join(', ')}`,
                `- **Signal Count:** ${p.signalCount}`,
                `- **Confidence:** ${Math.round((p.confidenceScore || 0) * 100)}%`,
            );
            break;

        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            lines.push(
                `### Knowledge Gap Details`,
                '',
                `- **Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
                `- **Fallback Count:** ${p.fallbackCount} in ${p.windowDays} days`,
                '',
                `**Sample Queries:**`,
                ...(p.sampleQueries || []).map((q: string) => `- ${safeText(q, 160)}`),
            );
            break;

        case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
            lines.push(
                `### AI Failure Details`,
                '',
                `- **Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
                `- **Failure Count:** ${p.failureCount} in ${p.windowDays} days`,
                '',
                `**Common Queries:**`,
                ...(p.commonQueries || []).map((q: string) => `- ${safeText(q, 160)}`),
            );
            break;

        default:
            lines.push('```json', safeText(JSON.stringify(p, null, 2), 500), '```');
    }

    lines.push('', '---', '*Created automatically by Answerlattice governance engine.*');
    return lines.join('\n');
}

function getLabels(event: IntegrationEvent): string[] {
    const labels = ['answerlattice'];

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

function encodeGithubPathSegment(value: string): string {
    const normalized = value.trim();
    if (!GITHUB_PATH_SEGMENT_PATTERN.test(normalized)) return '';
    return encodeURIComponent(normalized);
}

export class GithubAdapter implements IIntegrationAdapter {
    readonly adapterType = ADAPTER_TYPES.GITHUB;

    formatPayload(event: IntegrationEvent): { title: string; body: string; labels: string[] } {
        const eventTitle = EVENT_TITLES[event.eventType] || event.eventType;
        const entityName = safeText(event.payload.entityName || event.payload.answerTitle || '', 80);
        const title = entityName
            ? `[Answerlattice] ${eventTitle}: ${entityName}`
            : `[Answerlattice] ${eventTitle}`;

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
            const encodedOwner = encodeGithubPathSegment(config.owner);
            const encodedRepo = encodeGithubPathSegment(config.repo);
            if (!encodedOwner || !encodedRepo) {
                return { success: false, error: 'No owner/repo configured', durationMs: Date.now() - startMs };
            }
            const url = `${GITHUB_API_URL}/repos/${encodedOwner}/${encodedRepo}/issues`;

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
                const issueUrl = typeof data.html_url === 'string' ? data.html_url : '';
                logger.info('[Answerlattice Integration] GitHub issue created', {
                    issueNumber: typeof data.number === 'number' ? data.number : undefined,
                    issueUrlPresent: issueUrl.length > 0,
                    issueUrlLength: issueUrl.length,
                });
                return { success: true, statusCode: response.status, durationMs };
            }

            return { success: false, statusCode: response.status, error: 'GitHub issue creation returned bad status', durationMs };
        } catch {
            return {
                success: false,
                error: 'GitHub issue creation failed',
                durationMs: Date.now() - startMs,
            };
        }
    }
}
