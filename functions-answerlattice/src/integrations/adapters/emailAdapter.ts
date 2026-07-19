/**
 * Answerlattice — Email Integration Adapter
 * 
 * Sends governance event emails via SMTP (nodemailer).
 * Reuses the established nodemailer transporter pattern with Answerlattice-only
 * SMTP secrets bound to the delivery function.
 * 
 * @see __docs__/answerlattice/workflow-integrations/workflow-integrations_impl.md §5.5
 */

import * as nodemailer from 'nodemailer';
import * as logger from 'firebase-functions/logger';
import {
    IIntegrationAdapter,
    IntegrationEvent,
    EmailConfig,
    DeliveryResult,
    ADAPTER_TYPES,
    INTEGRATION_EVENT_TYPES,
    INTEGRATION_LIMITS,
} from '../types';
import {
    escapeHtml,
    safePayloadCount,
    safePayloadRatio,
    safePayloadStringArray,
    safeText,
} from '../safety';

const EVENT_TITLES: Record<string, string> = {
    [INTEGRATION_EVENT_TYPES.DRIFT_DETECTED]: 'Drift Detected',
    [INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED]: 'Mutation Proposed',
    [INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED]: 'Knowledge Gap Detected',
    [INTEGRATION_EVENT_TYPES.COVERAGE_DROP]: 'Coverage Drop',
    [INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED]: 'Article Approved',
    [INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING]: 'Repeated AI Workflow Failure',
    [INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY]: 'Nightly Summary',
};

// Cached transporter (same pattern as lifecycle messaging)
let transporter: nodemailer.Transporter | null = null;
let smtpSender = '';

export interface AnswerlatticeSmtpRuntimeConfig {
    host: string;
    port: number;
    user: string;
    pass: string;
}

export function readAnswerlatticeSmtpRuntimeConfig(
    source: Record<string, string | undefined> = process.env,
): AnswerlatticeSmtpRuntimeConfig | null {
    const host = String(source.ANSWERLATTICE_SMTP_HOST || '').trim();
    const user = String(source.ANSWERLATTICE_SMTP_USER || '').trim();
    const pass = String(source.ANSWERLATTICE_SMTP_PASS || '');
    const rawPort = String(source.ANSWERLATTICE_SMTP_PORT || '587').trim();
    const port = Number(rawPort);
    if (!host || !user || !pass || !Number.isSafeInteger(port) || port <= 0 || port > 65_535) {
        return null;
    }
    return { host, port, user, pass };
}

function getTransporter(): nodemailer.Transporter | null {
    if (transporter) return transporter;

    const smtpConfig = readAnswerlatticeSmtpRuntimeConfig();
    if (!smtpConfig) {
        logger.warn('[Answerlattice Integration] SMTP not configured - email adapter disabled');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
        connectionTimeout: INTEGRATION_LIMITS.ADAPTER_TIMEOUT_MS,
        greetingTimeout: INTEGRATION_LIMITS.ADAPTER_TIMEOUT_MS,
        socketTimeout: INTEGRATION_LIMITS.ADAPTER_TIMEOUT_MS,
    });
    smtpSender = smtpConfig.user;

    return transporter;
}

function formatEventHtml(event: IntegrationEvent): string {
    const p = event.payload;
    const title = EVENT_TITLES[event.eventType] || event.eventType;
    const severity = event.severity.toUpperCase();
    const time = new Date(event.createdAt.toMillis()).toISOString();

    let detailsHtml = '';
    if (p.test === true) {
        detailsHtml = '<tr><td><strong>Test:</strong></td><td>Answerlattice workflow notifications are connected.</td></tr>';
    } else {

        switch (event.eventType) {
            case INTEGRATION_EVENT_TYPES.DRIFT_DETECTED:
                detailsHtml = `
                <tr><td><strong>Answer:</strong></td><td>${escapeHtml(p.answerTitle || 'Unknown')}</td></tr>
                <tr><td><strong>Drift Class:</strong></td><td>${escapeHtml(p.driftClass)}</td></tr>
                <tr><td><strong>Reason:</strong></td><td>${escapeHtml(p.driftReason)}</td></tr>
                <tr><td><strong>Entity:</strong></td><td>${escapeHtml(p.entityName)} (${escapeHtml(p.entityType, 80)})</td></tr>`;
                break;

            case INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED:
                detailsHtml = `
                <tr><td><strong>Type:</strong></td><td>${escapeHtml(p.mutationType)}</td></tr>
                <tr><td><strong>Entities:</strong></td><td>${escapeHtml(safePayloadStringArray(p.entityNames, 5, 80).join(', '), 300)}</td></tr>
                <tr><td><strong>Signals:</strong></td><td>${safePayloadCount(p.signalCount)}</td></tr>
                <tr><td><strong>Confidence:</strong></td><td>${Math.round(safePayloadRatio(p.confidenceScore) * 100)}%</td></tr>`;
                break;

            case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
                detailsHtml = `
                <tr><td><strong>Entity:</strong></td><td>${escapeHtml(p.entityName)} (${escapeHtml(p.entityType, 80)})</td></tr>
                <tr><td><strong>Fallbacks:</strong></td><td>${safePayloadCount(p.fallbackCount)} in ${safePayloadCount(p.windowDays, 3650)} days</td></tr>`;
                break;

            case INTEGRATION_EVENT_TYPES.COVERAGE_DROP:
                detailsHtml = `
                <tr><td><strong>Current:</strong></td><td>${Math.round(safePayloadRatio(p.currentRate) * 100)}%</td></tr>
                <tr><td><strong>Previous:</strong></td><td>${Math.round(safePayloadRatio(p.previousRate) * 100)}%</td></tr>
                <tr><td><strong>Threshold:</strong></td><td>${Math.round(safePayloadRatio(p.threshold) * 100)}%</td></tr>`;
                break;

            case INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING:
                detailsHtml = `
                <tr><td><strong>Entity:</strong></td><td>${escapeHtml(p.entityName)} (${escapeHtml(p.entityType, 80)})</td></tr>
                <tr><td><strong>Failures:</strong></td><td>${safePayloadCount(p.failureCount)} in ${safePayloadCount(p.windowDays, 3650)} days</td></tr>
                <tr><td><strong>Failed phases:</strong></td><td>${escapeHtml(safePayloadStringArray(p.failurePhases || p.commonQueries, 5, 120).join(', '), 600)}</td></tr>`;
                break;

            case INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY:
                detailsHtml = `
                <tr><td><strong>Tenants:</strong></td><td>${safePayloadCount(p.tenantsProcessed)}</td></tr>
                <tr><td><strong>Drift:</strong></td><td>${safePayloadCount(p.driftDetected)} detected, ${safePayloadCount(p.driftCleared)} cleared</td></tr>
                <tr><td><strong>Proposals:</strong></td><td>${safePayloadCount(p.proposalsCreated)}</td></tr>
                <tr><td><strong>Coverage:</strong></td><td>${Math.round(safePayloadRatio(p.coverageRate) * 100)}%</td></tr>
                <tr><td><strong>Errors:</strong></td><td>${safePayloadStringArray(p.errors).length}</td></tr>`;
                break;

            default:
                detailsHtml = `<tr><td colspan="2"><pre>${escapeHtml(JSON.stringify(p, null, 2), 500)}</pre></td></tr>`;
        }
    }

    return `
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
    <div style="border-left: 4px solid ${severity === 'CRITICAL' ? '#f5222d' : severity === 'HIGH' ? '#fa8c16' : '#1677ff'}; padding: 16px 20px; margin: 16px 0; background: #fafafa; border-radius: 0 4px 4px 0;">
        <h2 style="margin: 0 0 8px 0; color: #1a1a1a;">Answerlattice: ${title}</h2>
        <p style="margin: 0; color: #666; font-size: 13px;">Severity: ${severity} &middot; ${time}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        ${detailsHtml}
    </table>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="font-size: 12px; color: #999;">This is an automated governance alert from Answerlattice. To change which events you receive, update your integration settings in the Answerlattice dashboard.</p>
</body>
</html>`.trim();
}

export class EmailAdapter implements IIntegrationAdapter {
    readonly adapterType = ADAPTER_TYPES.EMAIL;

    formatPayload(event: IntegrationEvent): { subject: string; html: string } {
        const title = EVENT_TITLES[event.eventType] || event.eventType;
        const entityName = safeText(event.payload.entityName || event.payload.answerTitle || '', 80);
        const subject = entityName
            ? `[Answerlattice] ${title}: ${entityName}`
            : `[Answerlattice] ${title}`;

        return {
            subject,
            html: formatEventHtml(event),
        };
    }

    async send(event: IntegrationEvent, config: EmailConfig): Promise<DeliveryResult> {
        const startMs = Date.now();

        const smtp = getTransporter();
        if (!smtp) {
            return {
                success: false,
                error: 'SMTP not configured',
                durationMs: Date.now() - startMs,
            };
        }

        const recipients = Array.from(new Set((config.recipients || []).slice(0, INTEGRATION_LIMITS.MAX_EMAIL_RECIPIENTS)));
        if (recipients.length === 0) {
            return {
                success: false,
                error: 'No recipients configured',
                durationMs: Date.now() - startMs,
            };
        }

        try {
            const { subject, html } = this.formatPayload(event);

            await smtp.sendMail({
                from: smtpSender || 'noreply@answerlattice.com',
                to: recipients.join(', '),
                subject,
                html,
            });

            return {
                success: true,
                durationMs: Date.now() - startMs,
            };
        } catch {
            return {
                success: false,
                retryable: false,
                error: 'SMTP delivery failed',
                durationMs: Date.now() - startMs,
            };
        }
    }
}
