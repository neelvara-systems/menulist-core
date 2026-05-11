/**
 * Canonica — Email Integration Adapter
 * 
 * Sends governance event emails via SMTP (nodemailer).
 * Reuses existing SMTP env vars from lifecycle messaging.
 * 
 * @see __docs__/canonica/workflow-integrations/workflow-integrations_impl.md §5.5
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
} from '../types';

const EVENT_TITLES: Record<string, string> = {
    [INTEGRATION_EVENT_TYPES.DRIFT_DETECTED]: 'Drift Detected',
    [INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED]: 'Mutation Proposed',
    [INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED]: 'Knowledge Gap Detected',
    [INTEGRATION_EVENT_TYPES.COVERAGE_DROP]: 'Coverage Drop',
    [INTEGRATION_EVENT_TYPES.ARTICLE_APPROVED]: 'Article Approved',
    [INTEGRATION_EVENT_TYPES.AI_FAILURE_RECURRING]: 'Recurring AI Failure',
    [INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY]: 'Nightly Summary',
};

// Cached transporter (same pattern as lifecycle messaging)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (transporter) return transporter;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        logger.warn('[Canonica Integration] SMTP not configured - email adapter disabled');
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: false,
        auth: { user, pass },
    });

    return transporter;
}

function formatEventHtml(event: IntegrationEvent): string {
    const p = event.payload;
    const title = EVENT_TITLES[event.eventType] || event.eventType;
    const severity = event.severity.toUpperCase();
    const time = new Date(event.createdAt.toMillis()).toISOString();

    let detailsHtml = '';

    switch (event.eventType) {
        case INTEGRATION_EVENT_TYPES.DRIFT_DETECTED:
            detailsHtml = `
                <tr><td><strong>Answer:</strong></td><td>${p.answerTitle || 'Unknown'}</td></tr>
                <tr><td><strong>Drift Class:</strong></td><td>${p.driftClass}</td></tr>
                <tr><td><strong>Reason:</strong></td><td>${p.driftReason}</td></tr>
                <tr><td><strong>Entity:</strong></td><td>${p.entityName} (${p.entityType})</td></tr>`;
            break;

        case INTEGRATION_EVENT_TYPES.MUTATION_PROPOSED:
            detailsHtml = `
                <tr><td><strong>Type:</strong></td><td>${p.mutationType}</td></tr>
                <tr><td><strong>Entities:</strong></td><td>${(p.entityNames || []).join(', ')}</td></tr>
                <tr><td><strong>Signals:</strong></td><td>${p.signalCount}</td></tr>
                <tr><td><strong>Confidence:</strong></td><td>${Math.round((p.confidenceScore || 0) * 100)}%</td></tr>`;
            break;

        case INTEGRATION_EVENT_TYPES.KNOWLEDGE_GAP_DETECTED:
            detailsHtml = `
                <tr><td><strong>Entity:</strong></td><td>${p.entityName} (${p.entityType})</td></tr>
                <tr><td><strong>Fallbacks:</strong></td><td>${p.fallbackCount} in ${p.windowDays} days</td></tr>`;
            break;

        case INTEGRATION_EVENT_TYPES.COVERAGE_DROP:
            detailsHtml = `
                <tr><td><strong>Current:</strong></td><td>${Math.round((p.currentRate || 0) * 100)}%</td></tr>
                <tr><td><strong>Previous:</strong></td><td>${Math.round((p.previousRate || 0) * 100)}%</td></tr>
                <tr><td><strong>Threshold:</strong></td><td>${Math.round((p.threshold || 0) * 100)}%</td></tr>`;
            break;

        case INTEGRATION_EVENT_TYPES.NIGHTLY_SUMMARY:
            detailsHtml = `
                <tr><td><strong>Tenants:</strong></td><td>${p.tenantsProcessed}</td></tr>
                <tr><td><strong>Drift:</strong></td><td>${p.driftDetected} detected, ${p.driftCleared} cleared</td></tr>
                <tr><td><strong>Proposals:</strong></td><td>${p.proposalsCreated}</td></tr>
                <tr><td><strong>Coverage:</strong></td><td>${Math.round((p.coverageRate || 0) * 100)}%</td></tr>
                <tr><td><strong>Errors:</strong></td><td>${(p.errors || []).length}</td></tr>`;
            break;

        default:
            detailsHtml = `<tr><td colspan="2"><pre>${JSON.stringify(p, null, 2).slice(0, 500)}</pre></td></tr>`;
    }

    return `
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
    <div style="border-left: 4px solid ${severity === 'CRITICAL' ? '#f5222d' : severity === 'HIGH' ? '#fa8c16' : '#1677ff'}; padding: 16px 20px; margin: 16px 0; background: #fafafa; border-radius: 0 4px 4px 0;">
        <h2 style="margin: 0 0 8px 0; color: #1a1a1a;">Canonica: ${title}</h2>
        <p style="margin: 0; color: #666; font-size: 13px;">Severity: ${severity} &middot; ${time}</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        ${detailsHtml}
    </table>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="font-size: 12px; color: #999;">This is an automated governance alert from Canonica. To change which events you receive, update your integration settings in the Canonica dashboard.</p>
</body>
</html>`.trim();
}

export class EmailAdapter implements IIntegrationAdapter {
    readonly adapterType = ADAPTER_TYPES.EMAIL;

    formatPayload(event: IntegrationEvent): { subject: string; html: string } {
        const title = EVENT_TITLES[event.eventType] || event.eventType;
        const entityName = event.payload.entityName || event.payload.answerTitle || '';
        const subject = entityName
            ? `[Canonica] ${title}: ${entityName}`
            : `[Canonica] ${title}`;

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

        if (!config.recipients || config.recipients.length === 0) {
            return {
                success: false,
                error: 'No recipients configured',
                durationMs: Date.now() - startMs,
            };
        }

        try {
            const { subject, html } = this.formatPayload(event);

            await smtp.sendMail({
                from: process.env.SMTP_USER || 'noreply@canonica.app',
                to: config.recipients.join(', '),
                subject,
                html,
            });

            return {
                success: true,
                durationMs: Date.now() - startMs,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'SMTP send failed',
                durationMs: Date.now() - startMs,
            };
        }
    }
}
