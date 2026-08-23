/**
 * MenuList email provider compatibility adapter.
 * 
 * Routes through EmailOS/Resend when the provider cutover flag is enabled and
 * retains the bounded Nodemailer/SMTP bridge during migration and rollback.
 * 
 * Prerequisites:
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in Firebase Functions secrets
 * - For Gmail: use App Password (not regular password)
 *   → Google Account → Security → 2FA → App Passwords → generate one
 * 
 * @see __docs__/email-os/email-os_impl.md
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
 */

import * as nodemailer from 'nodemailer';
import * as functions from 'firebase-functions';
import { ProviderSendResult } from '../types';
import { getBoundedFunctionsErrorName } from '../../utils/boundedErrorContext';
import { FUNCTION_FLAGS } from '../../constants/features';
import { renderEmailOsLegacyContent } from '../../emailOs/render';
import { sendMenuListEmailOs } from '../../emailOs/provider';
import { createHash } from 'node:crypto';
import type { EmailOsAttachment, EmailOsClassification } from '../../sharedData/emailOs';

const DEFAULT_FROM = 'MenuList <system@menulist.ai>';
const SMTP_NOT_CONFIGURED_ERROR = 'SMTP_NOT_CONFIGURED';
const SMTP_SEND_FAILED_ERROR = 'SMTP_SEND_FAILED';
const SMTP_MIN_PORT = 1;
const SMTP_MAX_PORT = 65535;
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 15_000;
const MAX_SMTP_PROVIDER_MESSAGE_ID_LENGTH = 200;
const logger = functions.logger;

// Cached transporter (reused across invocations in same CF instance)
let cachedTransporter: nodemailer.Transporter | null = null;

function getSmtpErrorContext(error: unknown): {
  name?: string;
  code?: string;
  responseCode?: number;
  command?: string;
} {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  return {
    name: getBoundedFunctionsErrorName(error),
    code: typeof record.code === 'string' ? record.code : undefined,
    responseCode: typeof record.responseCode === 'number' ? record.responseCode : undefined,
    command: typeof record.command === 'string' ? record.command : undefined,
  };
}

function parseSmtpPort(rawPort: string | undefined): number | null {
  const normalizedPort = String(rawPort ?? '').trim();
  if (!/^\d+$/.test(normalizedPort)) return null;

  const port = Number(normalizedPort);
  return Number.isSafeInteger(port) && port >= SMTP_MIN_PORT && port <= SMTP_MAX_PORT
    ? port
    : null;
}

function normalizeProviderMessageId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return normalized ? normalized.slice(0, MAX_SMTP_PROVIDER_MESSAGE_ID_LENGTH) : undefined;
}

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = String(process.env.SMTP_HOST || '').trim();
  const port = parseSmtpPort(process.env.SMTP_PORT);
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = process.env.SMTP_PASS || '';
  const hasPassword = pass.trim().length > 0;

  if (!host || port === null || !user || !hasPassword) {
    logger.error('[Mailer] SMTP credentials not configured', {
      hasHost: Boolean(host),
      hasPort: Boolean(String(process.env.SMTP_PORT ?? '').trim()),
      smtpPortValid: port !== null,
      hasUser: Boolean(user),
      hasPassword,
    });
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587
    auth: { user, pass },
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
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
  eventType?: string;
  referenceId?: string;
  classification?: EmailOsClassification;
  attachments?: readonly EmailOsAttachment[];
}): Promise<ProviderSendResult> {
  if (FUNCTION_FLAGS.ENABLE_EMAIL_OS && FUNCTION_FLAGS.ENABLE_MENULIST_EMAIL_OS_PROVIDER_SEND) {
    if (!params.eventType || !params.referenceId) {
      return { success: false, error: 'EMAIL_OS_DELIVERY_IDENTITY_MISSING' };
    }
    const content = renderEmailOsLegacyContent(params.html, params.subject);
    const localDeliveryReference = createHash('sha256')
      .update(`${params.eventType}\0${params.referenceId}\0${params.to.toLowerCase()}`)
      .digest('hex');
    const result = await sendMenuListEmailOs({
      productCode: 'ML',
      classification: params.classification || 'operational',
      eventType: params.eventType.toLowerCase().replace(/[^a-z0-9._-]+/g, '_'),
      localDeliveryReference,
      from: params.from || process.env.MENULIST_EMAIL_OS_FROM || DEFAULT_FROM,
      to: params.to,
      replyTo: process.env.MENULIST_EMAIL_OS_REPLY_TO,
      subject: params.subject,
      html: content.html,
      text: content.text,
      attachments: params.attachments,
    });
    return {
      success: result.accepted,
      providerMessageId: result.providerMessageId,
      error: result.errorCode,
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, error: SMTP_NOT_CONFIGURED_ERROR };
  }

  try {
    const info = await transporter.sendMail({
      from: params.from || DEFAULT_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments?.map((attachment) => ({
        filename: attachment.filename,
        content: Buffer.from(attachment.contentBase64, 'base64'),
        contentType: attachment.contentType,
      })),
    });

    return {
      success: true,
      providerMessageId: normalizeProviderMessageId(info.messageId),
    };
  } catch (error) {
    logger.error('[Mailer] Send failed', {
      toPresent: Boolean(params.to),
      subjectLength: params.subject.length,
      source: getSmtpErrorContext(error),
    });
    return { success: false, error: SMTP_SEND_FAILED_ERROR };
  }
}
