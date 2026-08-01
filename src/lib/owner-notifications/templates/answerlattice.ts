import type { OwnerNotificationTemplate } from '../types';

const VERSION = '2026-06-02';
const MAX_OWNER_NOTIFICATION_TEXT_LENGTH = 240;
const MAX_OWNER_NOTIFICATION_URL_LENGTH = 2048;
const DEFAULT_WIDGET_CONNECTION_FAILURE_OWNER_COPY = 'The widget connection check could not be completed.';
const DEFAULT_SOURCE_SYNC_FAILURE_OWNER_COPY = 'The support source could not be synced.';
const DEFAULT_HIGH_PRIORITY_ESCALATION_OWNER_COPY = 'A high priority support issue needs review.';

const WIDGET_CONNECTION_FAILURE_OWNER_COPY: Record<string, string> = {
    ADAPTER_CHECK_FAILED: DEFAULT_WIDGET_CONNECTION_FAILURE_OWNER_COPY,
    CONNECTION_CHECK_FAILED: DEFAULT_WIDGET_CONNECTION_FAILURE_OWNER_COPY,
    FAILED: DEFAULT_WIDGET_CONNECTION_FAILURE_OWNER_COPY,
    NO_ENABLED_ADAPTER: 'No enabled widget adapter is available for this workspace.',
    WIDGET_NOT_DETECTED: 'The widget was not detected on the expected page.',
};

const SOURCE_SYNC_FAILURE_OWNER_COPY: Record<string, string> = {
    ACCESS_DENIED: 'The support source could not be reached with the current access.',
    FAILED: DEFAULT_SOURCE_SYNC_FAILURE_OWNER_COPY,
    RATE_LIMITED: 'The support source is temporarily rate limited.',
    SOURCE_SYNC_FAILED: DEFAULT_SOURCE_SYNC_FAILURE_OWNER_COPY,
    SYNC_FAILED: DEFAULT_SOURCE_SYNC_FAILURE_OWNER_COPY,
};

const HIGH_PRIORITY_ESCALATION_OWNER_COPY: Record<string, string> = {
    FAILED: DEFAULT_HIGH_PRIORITY_ESCALATION_OWNER_COPY,
    HIGH_PRIORITY_ESCALATION: DEFAULT_HIGH_PRIORITY_ESCALATION_OWNER_COPY,
    NEEDS_OWNER_REVIEW: DEFAULT_HIGH_PRIORITY_ESCALATION_OWNER_COPY,
};

const S = {
    body: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;',
    h2: 'font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;',
    p: 'font-size: 14px; color: #4a4a4a; margin-bottom: 12px;',
    info: 'background: #f8f9fa; border-left: 3px solid #6366f1; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
    crit: 'background: #fff1f0; border-left: 3px solid #f5222d; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
    btn: 'display: inline-block; padding: 10px 24px; background: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;',
    foot: 'margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;',
};

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function textValue(value: unknown, fallback: string): string {
    return normalizeText(value, fallback, MAX_OWNER_NOTIFICATION_TEXT_LENGTH);
}

function normalizeText(value: unknown, fallback: string, maxLength: number): string {
    const raw = typeof value === 'string' ? value : String(value ?? '');
    const text = raw
        .replace(/[\u0000-\u001f\u007f]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return (text || fallback).slice(0, maxLength);
}

function urlValue(value: unknown): string {
    const text = normalizeText(value, '', MAX_OWNER_NOTIFICATION_URL_LENGTH);
    if (!text) return '';
    try {
        const url = new URL(text);
        return (
            (url.protocol === 'http:' || url.protocol === 'https:')
            && !url.username
            && !url.password
        ) ? text : '';
    } catch {
        return '';
    }
}

function ownerFailureReasonText(
    value: unknown,
    ownerCopy: Record<string, string>,
    fallback: string,
): string {
    const code = textValue(value, '').toUpperCase();
    return ownerCopy[code] || fallback;
}

function wrap(content: string, productName: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${S.body}">${content}<div style="${S.foot}"><p>${escapeHtml(productName)}</p><p>This is an automated notification. Do not reply to this email.</p></div></body></html>`;
}

function template(templateKey: string, subject: string, html: string, text: string, productName: string): OwnerNotificationTemplate {
    return {
        subject,
        html: wrap(html, productName),
        text,
        templateKey,
        templateVersion: VERSION,
    };
}

export function renderAnswerlatticeOwnerNotification(
    templateKey: string,
    metadata: Record<string, unknown>,
): OwnerNotificationTemplate | null {
    const productName = textValue(metadata.productName, 'Answerlattice');
    const workspaceName = textValue(metadata.workspaceName, 'Answerlattice workspace');
    const supportEmail = textValue(metadata.supportEmail, 'support email');
    const sentAt = textValue(metadata.sentAtLabel || metadata.sentAt, 'Now');
    const actionUrl = urlValue(metadata.actionUrl);
    const widgetFailureReason = ownerFailureReasonText(
        metadata.failureReason,
        WIDGET_CONNECTION_FAILURE_OWNER_COPY,
        DEFAULT_WIDGET_CONNECTION_FAILURE_OWNER_COPY,
    );
    const sourceSyncFailureReason = ownerFailureReasonText(
        metadata.failureReason,
        SOURCE_SYNC_FAILURE_OWNER_COPY,
        DEFAULT_SOURCE_SYNC_FAILURE_OWNER_COPY,
    );
    const highPriorityReason = ownerFailureReasonText(
        metadata.reason,
        HIGH_PRIORITY_ESCALATION_OWNER_COPY,
        DEFAULT_HIGH_PRIORITY_ESCALATION_OWNER_COPY,
    );

    switch (templateKey) {
        case 'answerlattice.notification_test':
            return template(
                templateKey,
                `Answerlattice notification test for ${productName}`,
                `<h2 style="${S.h2}">Notification delivery is connected</h2><p style="${S.p}">Hi ${escapeHtml(textValue(metadata.recipientName, 'there'))},</p><p style="${S.p}">This test confirms Answerlattice can send owner and support notifications for <strong>${escapeHtml(productName)}</strong>.</p><div style="${S.info}"><strong>Workspace:</strong> ${escapeHtml(workspaceName)}<br><strong>Sent at:</strong> ${escapeHtml(sentAt)}</div><p style="${S.p}">No action is needed if this arrived in the expected inbox.</p>`,
                `Notification delivery is connected for ${productName}. Workspace: ${workspaceName}. Sent at: ${sentAt}.`,
                productName,
            );
        case 'answerlattice.support_email_missing':
            return template(
                templateKey,
                `Support email needs attention — ${productName}`,
                `<h2 style="${S.h2}">Support email needs attention</h2><p style="${S.p}">Answerlattice cannot send support notices for <strong>${escapeHtml(productName)}</strong> until the support email is valid.</p><div style="${S.crit}"><strong>Current support email:</strong> ${escapeHtml(supportEmail)}</div>${actionUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(actionUrl)}" style="${S.btn}">Open Settings</a></p>` : ''}`,
                `Support email needs attention for ${productName}. Current support email: ${supportEmail}.`,
                productName,
            );
        case 'answerlattice.widget_connection_verified':
            return template(
                templateKey,
                `Widget connection verified — ${productName}`,
                `<h2 style="${S.h2}">Widget connection verified</h2><p style="${S.p}">The Answerlattice widget connection for <strong>${escapeHtml(productName)}</strong> is verified.</p><div style="${S.info}"><strong>Workspace:</strong> ${escapeHtml(workspaceName)}</div>`,
                `Widget connection verified for ${productName}.`,
                productName,
            );
        case 'answerlattice.widget_connection_failed':
            return template(
                templateKey,
                `Widget connection needs attention — ${productName}`,
                `<h2 style="${S.h2}">Widget connection needs attention</h2><p style="${S.p}">The widget verification for <strong>${escapeHtml(productName)}</strong> did not complete successfully.</p><div style="${S.crit}"><strong>Reason:</strong> ${escapeHtml(widgetFailureReason)}</div>${actionUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(actionUrl)}" style="${S.btn}">Open Answerlattice</a></p>` : ''}`,
                `Widget connection needs attention for ${productName}. ${widgetFailureReason}`,
                productName,
            );
        case 'answerlattice.source_sync_failed':
            return template(
                templateKey,
                `Source sync needs attention — ${productName}`,
                `<h2 style="${S.h2}">Source sync needs attention</h2><p style="${S.p}">A required support source for <strong>${escapeHtml(productName)}</strong> could not be synced.</p><div style="${S.crit}"><strong>Source:</strong> ${escapeHtml(textValue(metadata.sourceName, 'Support source'))}<br><strong>Reason:</strong> ${escapeHtml(sourceSyncFailureReason)}</div>`,
                `Source sync needs attention for ${productName}. Source: ${textValue(metadata.sourceName, 'Support source')}.`,
                productName,
            );
        case 'answerlattice.canonical_approval_required':
            return template(
                templateKey,
                `Answer review needed — ${productName}`,
                `<h2 style="${S.h2}">Answer review needed</h2><p style="${S.p}">A support answer for <strong>${escapeHtml(productName)}</strong> needs owner review before it becomes canonical.</p><div style="${S.info}"><strong>Topic:</strong> ${escapeHtml(textValue(metadata.topic, 'Support answer'))}</div>${actionUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(actionUrl)}" style="${S.btn}">Review Answer</a></p>` : ''}`,
                `Answer review needed for ${productName}. Topic: ${textValue(metadata.topic, 'Support answer')}.`,
                productName,
            );
        case 'answerlattice.high_priority_escalation':
            return template(
                templateKey,
                `High priority support attention needed — ${productName}`,
                `<h2 style="${S.h2}">High priority support attention needed</h2><p style="${S.p}">Answerlattice detected a support issue for <strong>${escapeHtml(productName)}</strong> that needs owner attention.</p><div style="${S.crit}"><strong>Reason:</strong> ${escapeHtml(highPriorityReason)}</div>${actionUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(actionUrl)}" style="${S.btn}">Open Support Board</a></p>` : ''}`,
                `High priority support attention needed for ${productName}. ${highPriorityReason}`,
                productName,
            );
        default:
            return null;
    }
}
