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
import { getBoundedFunctionsErrorName } from '../../utils/boundedErrorContext';

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9_.-]{1,100}$/;
const GITHUB_SUCCESS_RESPONSE_PARSE_FAILED = 'ANSWERLATTICE_GITHUB_SUCCESS_RESPONSE_PARSE_FAILED';

const EVENT_TITLES: Record<string, string> = {
    [INTEGRATION_EVENT_TYPES.DRIFT_DETECTED]: 'Drift Detected',
    [INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED]: 'Mutation Proposed',
    [INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED]: 'Knowledge Gap Detected',
    [INTEGRATION_EVENT_TYPES.COVERAGE_DROP]: 'Coverage Drop',
    [INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED]: 'Article Approved',
    [INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING]: 'Repeated AI Workflow Failure',
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
                `- **Type:** ${safeText(p.mutationType)}`,
                `- **Entities:** ${safePayloadStringArray(p.entityNames, 5, 80).join(', ')}`,
                `- **Signal Count:** ${safePayloadCount(p.signalCount)}`,
            );
            break;

        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            lines.push(
                `### Knowledge Gap Details`,
                '',
                `- **Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
                `- **Fallback Count:** ${safePayloadCount(p.fallbackCount)} in ${safePayloadCount(p.windowDays, 3650)} days`,
                '',
                `**Sample Queries:**`,
                ...safePayloadStringArray(p.sampleQueries, 5, 160).map(q => `- ${q}`),
            );
            break;

        case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
            lines.push(
                `### AI Failure Details`,
                '',
                `- **Entity:** ${safeText(p.entityName)} (${safeText(p.entityType, 80)})`,
                `- **Failure Count:** ${safePayloadCount(p.failureCount)} in ${safePayloadCount(p.windowDays, 3650)} days`,
                '',
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

            const response = await (async () => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), INTEGRATION_LIMITS.GITHUB_TIMEOUT_MS);
                try {
                    return await fetch(url, {
                        ...INTEGRATION_PROVIDER_FETCH_POLICY,
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
                } finally {
                    clearTimeout(timeout);
                }
            })();

            if (response.ok) {
                let data: Record<string, unknown> | null = null;
                try {
                    const payload = await readIntegrationProviderJson(response);
                    data = isIntegrationProviderRecord(payload) ? payload : null;
                } catch (error) {
                    logger.warn('[Answerlattice Integration] GitHub success response unavailable', {
                        failureCode: GITHUB_SUCCESS_RESPONSE_PARSE_FAILED,
                        sourceErrorName: getBoundedFunctionsErrorName(error) || typeof error,
                    });
                }
                const issueUrl = typeof data?.html_url === 'string' ? data.html_url : '';
                logger.info('[Answerlattice Integration] GitHub issue created', {
                    issueNumber: typeof data?.number === 'number' ? data.number : undefined,
                    issueUrlPresent: issueUrl.length > 0,
                    issueUrlLength: issueUrl.length,
                });
                return { success: true, statusCode: response.status, durationMs: Date.now() - startMs };
            }

            return {
                success: false,
                retryable: response.status === 429 || response.status >= 500,
                statusCode: response.status,
                error: 'GitHub issue creation returned bad status',
                durationMs: Date.now() - startMs,
            };
        } catch {
            return {
                success: false,
                retryable: false,
                error: 'GitHub issue creation failed',
                durationMs: Date.now() - startMs,
            };
        }
    }
}
