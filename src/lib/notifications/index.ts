/**
 * Generic Notification Service
 *
 * Reusable email notification system for Answerlattice (and future products).
 * Built on top of the existing SMTP infrastructure (nodemailer).
 *
 * Design:
 * - Generic: any event type, any template, any recipient
 * - Fire-and-forget: never blocks the calling operation
 * - Feature-flagged: ENABLE_ANSWERLATTICE_NOTIFICATIONS
 * - Idempotent: dedup by eventType + referenceId
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
 * @see __docs__/answerlattice/email-notifications/
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS, ProductId } from '@constant/product';
import { SYSTEM_EMAIL_FROM } from '@constant/urls';
import { isOwnerNotificationTrigger } from '@data/shared/ownerNotificationRegistry';
import { admin } from '@lib/firebase/firebaseAdmin';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import * as nodemailer from 'nodemailer';
import { resolveNotificationTemplate } from './templates';

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
    /** Product owning this notification. Answerlattice writes logs to Answerlattice Firebase. */
    productId?: ProductId | string;
    /** Optional: skip idempotency check (for time-sensitive notifications) */
    skipDedup?: boolean;
}

type NotificationLogTarget = {
    db: Firestore;
    collectionName: string;
};

// ================================================================
// SMTP TRANSPORT (reuses same pattern as lifecycle messaging)
// ================================================================

let cachedTransporter: nodemailer.Transporter | null = null;

export function isNotificationSmtpConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export function getNotificationReadiness(productId: ProductId | string = PRODUCT_IDS.ANSWERLATTICE) {
    const isAnswerlattice = productId === PRODUCT_IDS.ANSWERLATTICE;
    const answerlatticeDbAvailable = Boolean(
        answerlatticeFirestoreAdmin
        && typeof (answerlatticeFirestoreAdmin as any).collection === 'function'
    );

    return {
        enabled: FEATURE_FLAGS.ENABLE_ANSWERLATTICE_NOTIFICATIONS,
        smtpConfigured: isNotificationSmtpConfigured(),
        fromAddress: DEFAULT_FROM,
        logTarget: isAnswerlattice ? DB_COLLECTIONS.ANSWERLATTICE_NOTIFICATION_LOGS : NOTIFICATION_LOGS,
        productId,
        answerlatticeDbAvailable,
    };
}

function getNotificationLogTarget(productId?: ProductId | string): NotificationLogTarget | null {
    if (productId === PRODUCT_IDS.ANSWERLATTICE) {
        if (answerlatticeFirestoreAdmin && typeof (answerlatticeFirestoreAdmin as any).collection === 'function') {
            return {
                db: answerlatticeFirestoreAdmin,
                collectionName: DB_COLLECTIONS.ANSWERLATTICE_NOTIFICATION_LOGS,
            };
        }
        return null;
    }

    return {
        db: admin.firestore(),
        collectionName: NOTIFICATION_LOGS,
    };
}

function getSafeLogId(eventType: string, referenceId: string): string {
    const hash = createHash('sha256')
        .update(`${eventType}:${referenceId}`)
        .digest('hex')
        .slice(0, 32);
    const eventKey = eventType.toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 40) || 'notification';
    return `${eventKey}_${hash}`;
}

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

async function isDuplicate(
    target: NotificationLogTarget,
    eventType: string,
    referenceId: string
): Promise<boolean> {
    try {
        const docSnap = await target.db
            .collection(target.collectionName)
            .doc(getSafeLogId(eventType, referenceId))
            .get();
        return docSnap.exists && docSnap.data()?.status === 'sent';
    } catch (error) {
        secureError('[Notification] Duplicate check failed', error as Error, { eventType });
        return false; // On error, allow the send (fail-open)
    }
}

// ================================================================
// RATE LIMIT (per recipient per day)
// ================================================================

async function isRateLimited(target: NotificationLogTarget, recipientEmail: string): Promise<boolean> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const snap = await target.db.collection(target.collectionName)
            .where('recipientEmail', '==', recipientEmail)
            .where('status', '==', 'sent')
            .where('createdAt', '>=', Timestamp.fromDate(today))
            .limit(MAX_PER_DAY_PER_RECIPIENT + 1)
            .get();
        return snap.size >= MAX_PER_DAY_PER_RECIPIENT;
    } catch (error) {
        secureError('[Notification] Rate-limit check failed', error as Error, { recipientEmail });
        return false; // Fail-open
    }
}

async function writeNotificationLog(
    target: NotificationLogTarget,
    payload: NotificationPayload,
    status: 'sent' | 'failed' | 'skipped',
    details: {
        subject?: string;
        messageId?: string | null;
        error?: string | null;
        reason?: string | null;
    } = {}
): Promise<void> {
    try {
        await target.db
            .collection(target.collectionName)
            .doc(getSafeLogId(payload.eventType, payload.referenceId))
            .set({
                productId: payload.productId || null,
                eventType: payload.eventType,
                recipientEmail: payload.recipientEmail,
                referenceId: payload.referenceId,
                status,
                subject: details.subject || null,
                messageId: details.messageId || null,
                error: details.error || null,
                reason: details.reason || null,
                createdAt: Timestamp.now(),
            }, { merge: true });
    } catch (error) {
        secureError('[Notification] Log write failed', error as Error, {
            eventType: payload.eventType,
            productId: payload.productId,
        });
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
            productId = PRODUCT_IDS.ANSWERLATTICE,
            skipDedup = false,
        } = payload;

        // 1. Feature flag
        if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_NOTIFICATIONS) return false;

        // 2. Basic validation
        if (!recipientEmail || !eventType || !referenceId) return false;

        if (
            FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATIONS
            && FEATURE_FLAGS.ENABLE_OWNER_NOTIFICATION_ANSWERLATTICE_MIGRATION
            &&
            productId === PRODUCT_IDS.ANSWERLATTICE
            && isOwnerNotificationTrigger(PRODUCT_IDS.ANSWERLATTICE, eventType)
        ) {
            const { enqueueOwnerNotification } = await import('@lib/owner-notifications');
            const result = await enqueueOwnerNotification({
                productId: PRODUCT_IDS.ANSWERLATTICE,
                triggerType: eventType,
                tenantId: String(metadata.tenantId || metadata.tId || '0'),
                storeId: metadata.storeId || metadata.sId ? String(metadata.storeId || metadata.sId) : undefined,
                workspaceId: metadata.workspaceId ? String(metadata.workspaceId) : undefined,
                referenceId,
                recipientHints: {
                    email: recipientEmail,
                    name: recipientName,
                },
                metadata: {
                    ...metadata,
                    recipientName,
                },
                source: {
                    runtime: 'next',
                    path: 'src/lib/notifications/index.ts:sendNotification',
                },
            }, { processImmediately: true });

            return 'sent' in result
                ? result.sent > 0
                : result.status === 'pending';
        }

        const logTarget = getNotificationLogTarget(productId);
        if (!logTarget) {
            secureError(
                '[Notification] No log target available',
                new Error('Notification log target is not configured'),
                { productId, eventType }
            );
            return false;
        }

        // 3. Idempotency
        if (!skipDedup && await isDuplicate(logTarget, eventType, referenceId)) return false;

        // 4. Rate limit
        if (await isRateLimited(logTarget, recipientEmail)) {
            await writeNotificationLog(logTarget, { ...payload, productId }, 'skipped', { reason: 'rate_limited' });
            return false;
        }

        // 5. Resolve template
        const template = resolveNotificationTemplate(eventType, {
            ...metadata,
            recipientName: recipientName || 'there',
        });
        if (!template) {
            console.warn(`[Notification] No template for event: ${eventType}`);
            await writeNotificationLog(logTarget, { ...payload, productId }, 'failed', { error: 'template_not_found' });
            return false;
        }

        // 6. Send
        const result = await sendViaSMTP(recipientEmail, template.subject, template.html, from);

        // 7. Log. This is the production diagnostic trail for delivery failure.
        await writeNotificationLog(logTarget, { ...payload, productId }, result.ok ? 'sent' : 'failed', {
            subject: template.subject,
            messageId: result.messageId || null,
            error: result.error || null,
        });

        if (result.ok) {
            secureLog('[Notification] Email sent', {
                eventType,
                productId,
                referenceId,
            });
        }

        return result.ok;
    } catch (err) {
        // Never throw — fire-and-forget
        console.warn('[Notification] Send failed:', err instanceof Error ? err.message : 'Unknown');
        return false;
    }
}
