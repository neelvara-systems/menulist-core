import type { OwnerNotificationTemplate } from '../types';

const VERSION = '2026-06-02';

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
    const text = typeof value === 'string' ? value.trim() : String(value ?? '').trim();
    return text || fallback;
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
    const actionUrl = textValue(metadata.actionUrl, '');

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
                `<h2 style="${S.h2}">Widget connection needs attention</h2><p style="${S.p}">The widget verification for <strong>${escapeHtml(productName)}</strong> did not complete successfully.</p><div style="${S.crit}"><strong>Reason:</strong> ${escapeHtml(textValue(metadata.failureReason, 'Connection check failed.'))}</div>${actionUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(actionUrl)}" style="${S.btn}">Open Answerlattice</a></p>` : ''}`,
                `Widget connection needs attention for ${productName}. ${textValue(metadata.failureReason, 'Connection check failed.')}`,
                productName,
            );
        case 'answerlattice.source_sync_failed':
            return template(
                templateKey,
                `Source sync needs attention — ${productName}`,
                `<h2 style="${S.h2}">Source sync needs attention</h2><p style="${S.p}">A required support source for <strong>${escapeHtml(productName)}</strong> could not be synced.</p><div style="${S.crit}"><strong>Source:</strong> ${escapeHtml(textValue(metadata.sourceName, 'Support source'))}<br><strong>Reason:</strong> ${escapeHtml(textValue(metadata.failureReason, 'Sync failed.'))}</div>`,
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
                `<h2 style="${S.h2}">High priority support attention needed</h2><p style="${S.p}">Answerlattice detected a support issue for <strong>${escapeHtml(productName)}</strong> that needs owner attention.</p><div style="${S.crit}"><strong>Reason:</strong> ${escapeHtml(textValue(metadata.reason, 'A high priority escalation was created.'))}</div>${actionUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(actionUrl)}" style="${S.btn}">Open Support Board</a></p>` : ''}`,
                `High priority support attention needed for ${productName}. ${textValue(metadata.reason, 'A high priority escalation was created.')}`,
                productName,
            );
        default:
            return null;
    }
}
