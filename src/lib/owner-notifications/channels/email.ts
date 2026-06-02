import { SYSTEM_EMAIL_FROM } from '@constant/urls';
import * as nodemailer from 'nodemailer';
import type { OwnerNotificationChannelResult } from '../types';

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
    if (cachedTransporter) return cachedTransporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) return null;

    cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });

    return cachedTransporter;
}

export function isOwnerNotificationEmailConfigured(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
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
    } catch (error) {
        return {
            ok: false,
            error: error instanceof Error ? error.message : 'Unknown SMTP error',
        };
    }
}
