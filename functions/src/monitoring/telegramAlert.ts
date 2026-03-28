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
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] Bot token or chat ID not configured. Skipping alert delivery.');
    return;
  }

  const emoji = SEVERITY_EMOJI[alert.severity] || 'ℹ️';
  const text = formatAlertMessage(emoji, alert);

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
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
      const errorText = await response.text().catch(() => 'Unable to read response');
      console.error(`[Telegram] Failed to send alert: ${response.status} - ${errorText}`);
    }
  } catch (error) {
    // Fire-and-forget — log but don't throw
    console.error('[Telegram] Error sending alert:', error);
  }
}

// ================================================================
// FORMATTING
// ================================================================

function formatAlertMessage(emoji: string, alert: TelegramAlertPayload): string {
  const lines = [
    `${emoji} <b>[${alert.severity.toUpperCase()}] ${alert.title}</b>`,
    '',
    alert.message,
  ];

  if (alert.metadata) {
    lines.push('');
    if (alert.metadata.storeId) lines.push(`Store: ${alert.metadata.storeId}`);
    if (alert.metadata.tenantId) lines.push(`Tenant: ${alert.metadata.tenantId}`);
    if (alert.metadata.failureCode) lines.push(`Code: ${alert.metadata.failureCode}`);
    if (alert.metadata.consecutiveFailures) lines.push(`Consecutive: ${alert.metadata.consecutiveFailures}`);
  }

  lines.push('');
  lines.push(`Time: ${new Date().toISOString()}`);

  return lines.join('\n');
}
