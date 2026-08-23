import { SYSTEM_EMAIL_FROM } from '@constant/urls';
import nodemailer, { type Transporter } from '@lib/email/nodemailerRuntime';
import { getSmtpConfigFromEnv, isSmtpConfigured } from '@lib/notifications/smtpConfig';
import type { OwnerNotificationChannelResult } from '../types';
import { FEATURE_FLAGS } from '@config/features';
import { renderEmailOsLegacyContent } from '@lib/email-os/render';
import { sendServerEmailOs } from '@lib/email-os/provider';
import { createHash } from 'node:crypto';
import type { OwnerNotificationProductId } from '@data/shared/ownerNotificationRegistry';
import type { EmailOsAttachment, EmailOsClassification } from '@data/shared/emailOs';

let cachedTransporter: Transporter | null = null;
const OWNER_NOTIFICATION_SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const OWNER_NOTIFICATION_SMTP_GREETING_TIMEOUT_MS = 10_000;
const OWNER_NOTIFICATION_SMTP_SOCKET_TIMEOUT_MS = 15_000;
const MAX_OWNER_NOTIFICATION_EMAIL_PROVIDER_MESSAGE_ID_LENGTH = 200;

function normalizeProviderMessageId(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
    return normalized
        ? normalized.slice(0, MAX_OWNER_NOTIFICATION_EMAIL_PROVIDER_MESSAGE_ID_LENGTH)
        : undefined;
}

function getTransporter(): Transporter | null {
    if (cachedTransporter) return cachedTransporter;

    const smtpConfig = getSmtpConfigFromEnv();

    if (!smtpConfig) return null;

    cachedTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
        connectionTimeout: OWNER_NOTIFICATION_SMTP_CONNECTION_TIMEOUT_MS,
        greetingTimeout: OWNER_NOTIFICATION_SMTP_GREETING_TIMEOUT_MS,
        socketTimeout: OWNER_NOTIFICATION_SMTP_SOCKET_TIMEOUT_MS,
    });

    return cachedTransporter;
}

export function isOwnerNotificationEmailConfigured(productCode: OwnerNotificationProductId = 'ML'): boolean {
    const providerEnabled = productCode === 'AL'
        ? FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND
        : FEATURE_FLAGS.ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND;
    if (FEATURE_FLAGS.ENABLE_EMAIL_OS && providerEnabled) {
        const apiKey = productCode === 'AL'
            ? process.env.ANSWERLATTICE_RESEND_API_KEY
            : process.env.MENULIST_RESEND_API_KEY;
        const fromDomain = productCode === 'AL'
            ? process.env.ANSWERLATTICE_EMAIL_OS_FROM_DOMAIN
            : process.env.MENULIST_EMAIL_OS_FROM_DOMAIN;
        const from = productCode === 'AL'
            ? process.env.ANSWERLATTICE_EMAIL_OS_FROM
            : process.env.MENULIST_EMAIL_OS_FROM;
        return Boolean(
            apiKey?.trim()
            && fromDomain?.trim()
            && from?.trim(),
        );
    }
    return isSmtpConfigured();
}

export async function sendOwnerNotificationEmail(params: {
    productCode: OwnerNotificationProductId;
    to: string;
    subject: string;
    html: string;
    eventType: string;
    referenceId: string;
    classification?: EmailOsClassification;
    attachments?: readonly EmailOsAttachment[];
}): Promise<OwnerNotificationChannelResult> {
    const providerEnabled = params.productCode === 'AL'
        ? FEATURE_FLAGS.ENABLE_ANSWERLATTICE_EMAIL_OS_PROVIDER_SEND
        : FEATURE_FLAGS.ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND;
    if (FEATURE_FLAGS.ENABLE_EMAIL_OS && providerEnabled) {
        const content = renderEmailOsLegacyContent(params.html, params.subject);
        const localDeliveryReference = createHash('sha256')
            .update(`${params.eventType}\0${params.referenceId}\0${params.to.toLowerCase()}`)
            .digest('hex');
        const result = await sendServerEmailOs({
            productCode: params.productCode,
            classification: params.classification || 'operational',
            eventType: params.eventType.toLowerCase().replace(/[^a-z0-9._-]+/g, '_'),
            localDeliveryReference,
            from: params.productCode === 'AL'
                ? process.env.ANSWERLATTICE_EMAIL_OS_FROM || SYSTEM_EMAIL_FROM
                : process.env.MENULIST_EMAIL_OS_FROM || SYSTEM_EMAIL_FROM,
            to: params.to,
            replyTo: params.productCode === 'AL'
                ? process.env.ANSWERLATTICE_EMAIL_OS_REPLY_TO
                : process.env.MENULIST_EMAIL_OS_REPLY_TO,
            subject: params.subject,
            html: content.html,
            text: content.text,
            attachments: params.attachments,
        });
        return result.accepted
            ? { ok: true, providerMessageId: result.providerMessageId }
            : { ok: false, error: result.errorCode || 'email_os_send_failed' };
    }

    const transporter = getTransporter();
    if (!transporter) {
        return { ok: false, skippedReason: 'smtp_not_configured' };
    }

    try {
        const info = await transporter.sendMail({
            from: SYSTEM_EMAIL_FROM,
            to: params.to,
            subject: params.subject,
            html: params.html,
            attachments: params.attachments?.map((attachment) => ({
                filename: attachment.filename,
                content: Buffer.from(attachment.contentBase64, 'base64'),
                contentType: attachment.contentType,
            })),
        });

        return { ok: true, providerMessageId: normalizeProviderMessageId(info.messageId) };
    } catch {
        return {
            ok: false,
            error: 'smtp_send_failed',
        };
    }
}
