/**
 * Telegram Alert Delivery
 * 
 * Simple HTTP POST to Telegram Bot API.
 * No Telegram library needed — just fetch().
 * Fire-and-forget — failure does NOT block alert creation.
 * 
 * Prerequisites:
 * - TELEGRAM_BOT_TOKEN in Firebase Functions secrets
 * - TELEGRAM_CHAT_ID in Firebase Functions secrets
 * 
 * Firebase cost: ₹0 (Telegram API is free, no Firestore operations).
 * 
 * @see __docs__/ops-alerting-delivery/ops-alerting-delivery_impl.md
 */

import * as functions from 'firebase-functions';
import { getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';

// ================================================================
// TYPES
// ================================================================

export interface TelegramAlertPayload {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

const SEVERITY_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  critical: '🚨',
};

const TELEGRAM_BOT_TOKEN_PATTERN = /^\d{5,20}:[A-Za-z0-9_-]{20,256}$/;

const logger = functions.logger;

function getErrorLogContext(error: unknown): { name?: string; code?: string; status?: number } {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  return {
    name: getBoundedFunctionsErrorName(error),
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
  };
}

function getTelegramSendMessageUrl(botToken: string): string | null {
  const normalizedToken = botToken.trim();
  if (!TELEGRAM_BOT_TOKEN_PATTERN.test(normalizedToken)) return null;
  return `https://api.telegram.org/bot${encodeURIComponent(normalizedToken)}/sendMessage`;
}

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getTelegramMetadataStringContext(label: string, value: unknown): string {
  const normalized = typeof value === 'string' ? value : '';
  return `${label}Present=${normalized.length > 0} ${label}Length=${normalized.length}`;
}

// ================================================================
// CORE FUNCTION
// ================================================================

/**
 * Send alert to Telegram channel.
 * Fire-and-forget — failure does NOT block alert creation.
 * 
 * Reads secrets from process.env (set via Firebase Functions secrets).
 */
export async function sendTelegramAlert(alert: TelegramAlertPayload): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    logger.warn('[Telegram] Bot token or chat ID not configured. Skipping alert delivery.', {
      hasToken: Boolean(token),
      hasChatId: Boolean(chatId),
    });
    return;
  }

  const telegramSendMessageUrl = getTelegramSendMessageUrl(token);
  if (!telegramSendMessageUrl) {
    logger.warn('[Telegram] Bot token format invalid. Skipping alert delivery.', {
      tokenLength: token.trim().length,
      hasChatId: Boolean(chatId),
      severity: alert.severity,
      titleLength: alert.title.length,
      messageLength: alert.message.length,
    });
    return;
  }

  const emoji = SEVERITY_EMOJI[alert.severity] || 'ℹ️';
  const text = formatAlertMessage(emoji, alert);

  try {
    const response = await fetch(
      telegramSendMessageUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(10000), // 10s timeout
      }
    );

    if (!response.ok) {
      logger.error('[Telegram] Failed to send alert', {
        status: response.status,
        severity: alert.severity,
        titleLength: alert.title.length,
        messageLength: alert.message.length,
      });
    }
  } catch (error) {
    // Fire-and-forget — log but don't throw
    logger.error('[Telegram] Error sending alert', {
      severity: alert.severity,
      titleLength: alert.title.length,
      messageLength: alert.message.length,
      error: getErrorLogContext(error),
    });
  }
}

// ================================================================
// FORMATTING
// ================================================================

function formatAlertMessage(emoji: string, alert: TelegramAlertPayload): string {
  const lines = [
    `${emoji} <b>[${alert.severity.toUpperCase()}] ${escapeTelegramHtml(alert.title)}</b>`,
    '',
    escapeTelegramHtml(alert.message),
  ];

  if (alert.metadata) {
    lines.push('');
    if (alert.metadata.storeId) lines.push(`Store: ${escapeTelegramHtml(getTelegramMetadataStringContext('storeId', alert.metadata.storeId))}`);
    if (alert.metadata.tenantId) lines.push(`Tenant: ${escapeTelegramHtml(getTelegramMetadataStringContext('tenantId', alert.metadata.tenantId))}`);
    if (alert.metadata.failureCode) lines.push(`Code: ${escapeTelegramHtml(String(alert.metadata.failureCode))}`);
    if (alert.metadata.consecutiveFailures) lines.push(`Consecutive: ${escapeTelegramHtml(String(alert.metadata.consecutiveFailures))}`);
  }

  lines.push('');
  lines.push(`Time: ${new Date().toISOString()}`);

  return lines.join('\n');
}
