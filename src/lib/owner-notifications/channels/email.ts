import { SYSTEM_EMAIL_FROM } from '@constant/urls';
import nodemailer, { type Transporter } from '@lib/email/nodemailerRuntime';
import { getSmtpConfigFromEnv, isSmtpConfigured } from '@lib/notifications/smtpConfig';
import type { OwnerNotificationChannelResult } from '../types';

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

export function isOwnerNotificationEmailConfigured(): boolean {
    return isSmtpConfigured();
}

export async function sendOwnerNotificationEmail(params: {
    to: string;
    subject: string;
    html: string;
}): Promise<OwnerNotificationChannelResult> {
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
        });

        return { ok: true, providerMessageId: normalizeProviderMessageId(info.messageId) };
    } catch {
        return {
            ok: false,
            error: 'smtp_send_failed',
        };
    }
}
