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
import { getAnswerlatticeRetentionFields } from '@lib/answerlattice/dataRetention';
import { admin } from '@lib/firebase/firebaseAdmin';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { secureLog } from '@lib/security/secureLogger';
import { createHash } from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';
import * as nodemailer from 'nodemailer';
import { claimNotificationDelivery, finalizeNotificationDelivery } from './deliveryClaim';
import { getSmtpConfigFromEnv, isSmtpConfigured } from './smtpConfig';
import {
    getBoundedNotificationStringContext,
    getNotificationPayloadLogContext,
    logNotificationFailure,
} from './notificationDiagnostics';
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
    return isSmtpConfigured();
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
    const smtpConfig = getSmtpConfigFromEnv();
    if (!smtpConfig) return null;
    cachedTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
    });
    return cachedTransporter;
}

async function sendViaSMTP(
    to: string,
    subject: string,
    html: string,
    messageId: string,
    from?: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const transporter = getTransporter();
    if (!transporter) {
        return { ok: false, error: 'smtp_not_configured' };
    }
    try {
        const info = await transporter.sendMail({
            from: from || DEFAULT_FROM,
            to,
            subject,
            html,
            messageId,
        });
        return { ok: true, messageId: info.messageId };
    } catch {
        return { ok: false, error: 'smtp_send_failed' };
    }
}

function getNotificationDeliveryError(result: { ok: boolean; error?: string }): string | null {
    if (result.ok) return null;
    const { error } = result;
    const errorCode = typeof error === 'string' && error.length > 0
        ? error
        : 'notification_delivery_failed';
    return errorCode;
}

// ================================================================
// IDEMPOTENCY (dedup within 24h by eventType + referenceId)
// ================================================================

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
        logNotificationFailure('notification_rate_limit_check_failed', error, {
            ...getBoundedNotificationStringContext('recipientEmail', recipientEmail),
        });
        return true;
    }
}

async function finalizeNotificationLog(
    target: NotificationLogTarget,
    payload: NotificationPayload,
    claimId: string,
    status: 'sent' | 'failed' | 'skipped',
    details: {
        subject?: string;
        messageId?: string | null;
        error?: string | null;
        reason?: string | null;
    } = {}
): Promise<void> {
    try {
        const logRef = target.db
            .collection(target.collectionName)
            .doc(getSafeLogId(payload.eventType, payload.referenceId));
        const finalized = await finalizeNotificationDelivery({
            claimId,
            ref: logRef,
            status,
            fields: {
                productId: payload.productId || null,
                eventType: payload.eventType,
                recipientEmail: payload.recipientEmail,
                referenceId: payload.referenceId,
                status,
                subject: details.subject || null,
                messageId: details.messageId || null,
                error: details.error || null,
                reason: details.reason || null,
                ...(payload.productId === PRODUCT_IDS.ANSWERLATTICE
                    ? getAnswerlatticeRetentionFields('notificationLogs', Timestamp.now())
                    : {}),
            },
        });
        if (!finalized) {
            logNotificationFailure('notification_log_claim_lost', undefined, getNotificationPayloadLogContext(payload));
        }
    } catch (error) {
        logNotificationFailure('notification_log_write_failed', error, getNotificationPayloadLogContext(payload));
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
            logNotificationFailure('notification_log_target_unavailable', undefined, {
                productId,
                eventType,
            });
            return false;
        }

        // 3. Transactional idempotency claim. This serializes concurrent route
        // retries before any rate-limit query or SMTP side effect.
        const logRef = logTarget.db
            .collection(logTarget.collectionName)
            .doc(getSafeLogId(eventType, referenceId));
        const claim = await claimNotificationDelivery({
            ref: logRef,
            fields: {
                eventType,
                productId,
                recipientEmail,
                referenceId,
            },
        });
        if (!claim.claimed) return false;

        // 4. Rate limit
        if (await isRateLimited(logTarget, recipientEmail)) {
            await finalizeNotificationLog(logTarget, { ...payload, productId }, claim.claimId, 'skipped', { reason: 'rate_limited' });
            return false;
        }

        // 5. Resolve template
        const template = resolveNotificationTemplate(eventType, {
            ...metadata,
            recipientName: recipientName || 'there',
        });
        if (!template) {
            logNotificationFailure('notification_template_not_found', undefined, {
                ...getNotificationPayloadLogContext({ ...payload, productId }),
            });
            await finalizeNotificationLog(logTarget, { ...payload, productId }, claim.claimId, 'failed', { error: 'template_not_found' });
            return false;
        }

        // 6. Send
        const result = await sendViaSMTP(
            recipientEmail,
            template.subject,
            template.html,
            `<${getSafeLogId(eventType, referenceId)}@menulist.ai>`,
            from,
        );

        // 7. Log. This is the production diagnostic trail for delivery failure.
        await finalizeNotificationLog(logTarget, { ...payload, productId }, claim.claimId, result.ok ? 'sent' : 'failed', {
            subject: template.subject,
            messageId: result.messageId || null,
            error: getNotificationDeliveryError(result),
        });

        if (result.ok) {
            secureLog('[Notification] Email sent', {
                eventType,
                productId,
                ...getBoundedNotificationStringContext('referenceId', referenceId),
            });
        }

        return result.ok;
    } catch (err) {
        // Never throw — fire-and-forget
        logNotificationFailure('notification_send_failed', err, getNotificationPayloadLogContext(payload));
        return false;
    }
}
