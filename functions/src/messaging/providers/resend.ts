/**
 * Nodemailer Email Provider Adapter
 * 
 * Uses nodemailer with any SMTP server (Gmail, custom domain, etc.).
 * FREE — no paid API key needed. Gmail SMTP: 500/day personal, 2000/day Workspace.
 * 
 * Prerequisites:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in Firebase Functions secrets
 * - For Gmail: use App Password (not regular password)
 *   → Google Account → Security → 2FA → App Passwords → generate one
 * 
 * Firebase cost: ₹0 (SMTP is free, no Firestore operations for sending).
 * 
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
 */

import * as nodemailer from 'nodemailer';
import { ProviderSendResult } from '../types';

const DEFAULT_FROM = 'MenuList <system@menulist.ai>';

// Cached transporter (reused across invocations in same CF instance)
let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.error('[Mailer] SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: { user, pass },
  });

  return cachedTransporter;
}

/**
 * Send email via nodemailer SMTP.
 * Works with any SMTP server: Gmail, custom domain, etc.
 */
export async function sendEmailViaSMTP(params: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<ProviderSendResult> {
  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, error: 'SMTP not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: params.from || DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    return {
      success: true,
      providerMessageId: info.messageId,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Mailer] Send failed:', msg);
    return { success: false, error: msg };
  }
}
