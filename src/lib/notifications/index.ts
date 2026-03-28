/**
 * Generic Notification Service
 *
 * Reusable email notification system for Canonica (and future products).
 * Built on top of the existing SMTP infrastructure (nodemailer).
 *
 * Design:
 * - Generic: any event type, any template, any recipient
 * - Fire-and-forget: never blocks the calling operation
 * - Feature-flagged: ENABLE_CANONICA_NOTIFICATIONS
 * - Idempotent: dedup by eventType + referenceId within 24h
 * - Rate-limited: max 20 notifications per recipient per day
 * - Logged: all sends/failures written to notificationLogs collection
 *
 * Usage:
 *   import { sendNotification } from '@lib/notifications';
 *   await sendNotification({
 *     eventType: 'TICKET_REPLY',
 *     recipientEmail: 'user@example.com',
 *     recipientName: 'John',
 *     referenceId: ticketId,
 *     metadata: { ticketSubject, replyPreview, ticketUrl },
 *   });
 *
 * @see __docs__/canonica/email-notifications/
 */

import { FEATURE_FLAGS } from '@config/features';
import { SYSTEM_EMAIL_FROM } from '@constant/urls';
import { admin } from '@lib/firebase/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import * as nodemailer from 'nodemailer';
import { resolveNotificationTemplate } from './templates';

const db = admin.firestore();
const NOTIFICATION_LOGS = 'notificationLogs';
const DEFAULT_FROM = SYSTEM_EMAIL_FROM;
const MAX_PER_DAY_PER_RECIPIENT = 20;

// ================================================================
// TYPES
// ================================================================

export interface NotificationPayload {
    /** Event type identifier (e.g., 'TICKET_REPLY', 'TICKET_STATUS_CHANGED') */
    eventType: string;
    /** Recipient email address */
    recipientEmail: string;
    /** Recipient display name (for template personalization) */
    recipientName?: string;
    /** Unique reference ID for idempotency (e.g., ticketId + messageId) */
    referenceId: string;
    /** Template data — passed to the template function */
    metadata: Record<string, any>;
    /** Optional: override the "from" address */
    from?: string;
    /** Optional: skip idempotency check (for time-sensitive notifications) */
    skipDedup?: boolean;
}

// ================================================================
// SMTP TRANSPORT (reuses same pattern as lifecycle messaging)
// ================================================================

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (cachedTransporter) return cachedTransporter;
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;
    cachedTransporter = nodemailer.createTransport({
        host, port, secure: port === 465, auth: { user, pass },
    });
    return cachedTransporter;
}

async function sendViaSMTP(
    to: string,
    subject: string,
    html: string,
    from?: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const transporter = getTransporter();
    if (!transporter) {
        return { ok: false, error: 'SMTP not configured' };
    }
    try {
        const info = await transporter.sendMail({
            from: from || DEFAULT_FROM,
            to,
            subject,
            html,
        });
        return { ok: true, messageId: info.messageId };
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Unknown SMTP error' };
    }
}

// ================================================================
// IDEMPOTENCY (dedup within 24h by eventType + referenceId)
// ================================================================

async function isDuplicate(eventType: string, referenceId: string): Promise<boolean> {
    try {
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);
        const snap = await db.collection(NOTIFICATION_LOGS)
            .where('eventType', '==', eventType)
            .where('referenceId', '==', referenceId)
            .where('status', '==', 'sent')
            .where('createdAt', '>=', Timestamp.fromDate(yesterday))
            .limit(1)
            .get();
        return !snap.empty;
    } catch {
        return false; // On error, allow the send (fail-open)
    }
}

// ================================================================
// RATE LIMIT (per recipient per day)
// ================================================================

async function isRateLimited(recipientEmail: string): Promise<boolean> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const snap = await db.collection(NOTIFICATION_LOGS)
            .where('recipientEmail', '==', recipientEmail)
            .where('status', '==', 'sent')
            .where('createdAt', '>=', Timestamp.fromDate(today))
            .limit(MAX_PER_DAY_PER_RECIPIENT + 1)
            .get();
        return snap.size >= MAX_PER_DAY_PER_RECIPIENT;
    } catch {
        return false; // Fail-open
    }
}

// ================================================================
// MAIN: SEND NOTIFICATION
// ================================================================

/**
 * Send a notification email. Fire-and-forget safe.
 *
 * @returns true if sent, false if skipped/failed (never throws)
 */
export async function sendNotification(payload: NotificationPayload): Promise<boolean> {
    try {
        const {
            eventType,
            recipientEmail,
            recipientName,
            referenceId,
            metadata,
            from,
            skipDedup = false,
        } = payload;

        // 1. Feature flag
        if (!FEATURE_FLAGS.ENABLE_CANONICA_NOTIFICATIONS) return false;

        // 2. Basic validation
        if (!recipientEmail || !eventType || !referenceId) return false;

        // 3. Idempotency
        if (!skipDedup && await isDuplicate(eventType, referenceId)) return false;

        // 4. Rate limit
        if (await isRateLimited(recipientEmail)) return false;

        // 5. Resolve template
        const template = resolveNotificationTemplate(eventType, {
            ...metadata,
            recipientName: recipientName || 'there',
        });
        if (!template) {
            console.warn(`[Notification] No template for event: ${eventType}`);
            return false;
        }

        // 6. Send
        const result = await sendViaSMTP(recipientEmail, template.subject, template.html, from);

        // 7. Log (fire-and-forget)
        try {
            await db.collection(NOTIFICATION_LOGS).add({
                eventType,
                recipientEmail,
                referenceId,
                status: result.ok ? 'sent' : 'failed',
                subject: template.subject,
                messageId: result.messageId || null,
                error: result.error || null,
                createdAt: Timestamp.now(),
            });
        } catch { /* logging failure is non-blocking */ }

        return result.ok;
    } catch (err) {
        // Never throw — fire-and-forget
        console.warn('[Notification] Send failed:', err instanceof Error ? err.message : 'Unknown');
        return false;
    }
}
