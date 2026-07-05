import { SYSTEM_EMAIL_FROM } from '@constant/urls';
import { getSmtpConfigFromEnv, isSmtpConfigured } from '@lib/notifications/smtpConfig';
import * as nodemailer from 'nodemailer';
import type { OwnerNotificationChannelResult } from '../types';

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (cachedTransporter) return cachedTransporter;

    const smtpConfig = getSmtpConfigFromEnv();

    if (!smtpConfig) return null;

    cachedTransporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: { user: smtpConfig.user, pass: smtpConfig.pass },
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

        return { ok: true, providerMessageId: info.messageId };
    } catch {
        return {
            ok: false,
            error: 'smtp_send_failed',
        };
    }
}
