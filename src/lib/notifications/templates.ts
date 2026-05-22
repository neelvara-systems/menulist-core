/**
 * Notification Email Templates
 *
 * Generic, reusable templates for all notification types.
 * Infrastructure-grade tone: calm, professional, non-marketing.
 *
 * To add a new notification type:
 * 1. Add a new entry to NOTIFICATION_TEMPLATES
 * 2. Key = event type string (e.g., 'TICKET_REPLY')
 * 3. Value = function(metadata) => { subject, html }
 *
 * @see src/lib/notifications/index.ts — Notification sender
 */

// ================================================================
// SHARED STYLES (matches lifecycle messaging tone)
// ================================================================

const S = {
    body: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;',
    h2: 'font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;',
    p: 'font-size: 14px; color: #4a4a4a; margin-bottom: 12px;',
    info: 'background: #f8f9fa; border-left: 3px solid #6366f1; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
    preview: 'background: #f8f9fa; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-size: 14px; color: #4a4a4a; border: 1px solid #e5e7eb;',
    btn: 'display: inline-block; padding: 10px 24px; background: #6366f1; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500;',
    foot: 'margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;',
    muted: 'font-size: 12px; color: #999; margin-top: 8px;',
};

function wrap(content: string, productName = 'Canonica'): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${S.body}">${content}<div style="${S.foot}"><p>${productName}</p><p style="${S.muted}">This is an automated notification. Do not reply to this email.</p></div></body></html>`;
}

// ================================================================
// TEMPLATE TYPE
// ================================================================

type TemplateFn = (m: Record<string, any>) => { subject: string; html: string };

// ================================================================
// NOTIFICATION TEMPLATES
// ================================================================

const NOTIFICATION_TEMPLATES: Record<string, TemplateFn> = {
    /**
     * Sent when a support agent replies to a ticket.
     * Recipient: ticket creator (the user who submitted the ticket)
     */
    TICKET_REPLY: (m) => ({
        subject: `Reply on your ticket: ${m.ticketSubject || 'Support Request'}`,
        html: wrap(
            `<h2 style="${S.h2}">New reply on your support ticket</h2>` +
            `<p style="${S.p}">Hi ${m.recipientName || 'there'},</p>` +
            `<p style="${S.p}">There is a new reply on your ticket <strong>"${m.ticketSubject || 'Support Request'}"</strong>.</p>` +
            (m.replyPreview
                ? `<div style="${S.preview}">${truncate(m.replyPreview, 300)}</div>`
                : '') +
            (m.ticketUrl
                ? `<p style="margin-top: 20px;"><a href="${m.ticketUrl}" style="${S.btn}">View Ticket</a></p>`
                : '') +
            `<p style="${S.muted}">Ticket ID: ${m.ticketDisplayId || m.ticketId || 'N/A'}</p>`
        ),
    }),

    /**
     * Sent when a ticket's status changes (e.g., open → in_progress → resolved).
     * Recipient: ticket creator
     */
    TICKET_STATUS_CHANGED: (m) => ({
        subject: `Ticket updated: ${m.ticketSubject || 'Support Request'} — ${formatStatus(m.newStatus)}`,
        html: wrap(
            `<h2 style="${S.h2}">Your ticket status has been updated</h2>` +
            `<p style="${S.p}">Hi ${m.recipientName || 'there'},</p>` +
            `<p style="${S.p}">Your ticket <strong>"${m.ticketSubject || 'Support Request'}"</strong> has been updated.</p>` +
            `<div style="${S.info}">` +
            `<strong>New status:</strong> ${formatStatus(m.newStatus)}` +
            (m.remark ? `<br><strong>Note:</strong> ${m.remark}` : '') +
            `</div>` +
            (m.ticketUrl
                ? `<p style="margin-top: 20px;"><a href="${m.ticketUrl}" style="${S.btn}">View Ticket</a></p>`
                : '') +
            `<p style="${S.muted}">Ticket ID: ${m.ticketDisplayId || m.ticketId || 'N/A'}</p>`
        ),
    }),

    /**
     * Sent when a new ticket is created (confirmation to the submitter).
     * Recipient: ticket creator
     */
    TICKET_CREATED: (m) => ({
        subject: `Ticket received: ${m.ticketSubject || 'Support Request'}`,
        html: wrap(
            `<h2 style="${S.h2}">We received your support request</h2>` +
            `<p style="${S.p}">Hi ${m.recipientName || 'there'},</p>` +
            `<p style="${S.p}">Your ticket <strong>"${m.ticketSubject || 'Support Request'}"</strong> has been submitted. Our team will review it and respond as soon as possible.</p>` +
            `<div style="${S.info}">` +
            `<strong>Ticket ID:</strong> ${m.ticketDisplayId || 'N/A'}<br>` +
            `<strong>Category:</strong> ${m.category || 'General'}<br>` +
            `<strong>Priority:</strong> ${m.priority || 'Normal'}` +
            `</div>` +
            (m.ticketUrl
                ? `<p style="margin-top: 20px;"><a href="${m.ticketUrl}" style="${S.btn}">View Ticket</a></p>`
                : '')
        ),
    }),

    /**
     * Sent from the Canonica activation command center to verify sender config.
     * Recipient: workspace support email.
     */
    CANONICA_NOTIFICATION_TEST: (m) => ({
        subject: `Canonica notification test for ${m.productName || 'your product'}`,
        html: wrap(
            `<h2 style="${S.h2}">Notification delivery is connected</h2>` +
            `<p style="${S.p}">Hi ${m.recipientName || 'there'},</p>` +
            `<p style="${S.p}">This test confirms Canonica can send ticket and support notifications for <strong>${m.productName || 'your product'}</strong>.</p>` +
            `<div style="${S.info}">` +
            `<strong>Workspace:</strong> ${m.workspaceName || 'Canonica workspace'}<br>` +
            `<strong>Sent at:</strong> ${m.sentAt || 'Now'}` +
            `</div>` +
            `<p style="${S.p}">No action is needed if this arrived in the expected inbox.</p>`,
            m.productName || 'Canonica'
        ),
    }),
};

// ================================================================
// HELPERS
// ================================================================

function truncate(text: string, maxLen: number): string {
    if (!text) return '';
    const clean = text.replace(/<[^>]*>/g, ''); // Strip HTML
    return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
}

function formatStatus(status: string): string {
    if (!status) return 'Updated';
    const map: Record<string, string> = {
        open: 'Open',
        in_progress: 'In Progress',
        waiting_on_customer: 'Waiting on You',
        resolved: 'Resolved',
        closed: 'Closed',
    };
    return map[status] || status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ================================================================
// RESOLVER
// ================================================================

/**
 * Resolve an event type to an email template.
 * Returns null if no template is registered for the event type.
 */
export function resolveNotificationTemplate(
    eventType: string,
    metadata: Record<string, any>,
): { subject: string; html: string } | null {
    const fn = NOTIFICATION_TEMPLATES[eventType];
    return fn ? fn(metadata) : null;
}
