import {
  getPlatformNotificationRegistryEntry,
  PLATFORM_NOTIFICATION_TRIGGER_TYPES,
  type PlatformNotificationRegistryEntry,
} from '../sharedData/platformNotificationRegistry';
import { normalizePlatformNotificationEmail } from '../sharedData/platformNotificationRecipient';
import { isFunctionFeatureEnabled } from '../constants/features';
import { logger } from '../lib/logger';
import { sendEmailViaSMTP } from '../messaging/providers/resend';
import { buildWhatsAppPhoneParam } from '../utils/phoneNumber';
import { getMonitoringErrorContext } from './diagnostics';

type PlatformAlertPayload = {
  id?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  tId?: string;
  sId?: string;
  metadata?: Record<string, unknown>;
};

type PlatformDeliveryResult = {
  success: boolean;
  error?: string;
  skippedReason?: string;
  statusCode?: number;
};

type PlatformDeliveryLogContext = Record<string, boolean | number | string | null | undefined>;

const GRAPH_API_VERSION = 'v21.0';
const PLATFORM_ALERT_EMAIL_DELIVERY_FAILED = 'ops_platform_alert_email_delivery_failed';
const PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED = 'ops_platform_alert_whatsapp_delivery_failed';

function resolvePlatformRecipientEmail(): string | null {
  return normalizePlatformNotificationEmail(
    process.env.PLATFORM_ALERT_EMAIL_TO ||
    process.env.INTERNAL_NOTIFICATION_EMAIL ||
    '',
  );
}

function resolvePlatformRecipientWhatsApp(): string | null {
  return (
    process.env.PLATFORM_ALERT_WHATSAPP_TO ||
    process.env.INTERNAL_NOTIFICATION_WHATSAPP ||
    ''
  ).trim() || null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolveEntry(alert: PlatformAlertPayload): PlatformNotificationRegistryEntry {
  const explicitTrigger = String(alert.metadata?.platformTriggerType || alert.metadata?.triggerType || '');
  return (
    (explicitTrigger ? getPlatformNotificationRegistryEntry(explicitTrigger) : undefined) ||
    getPlatformNotificationRegistryEntry(PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNKNOWN_SYSTEM_ALERT)!
  );
}

function getPlatformDeliveryStringContext(label: string, value: unknown): string {
  const normalized = typeof value === 'string' ? value : '';
  return `${label}Present=${normalized.length > 0} ${label}Length=${normalized.length}`;
}

function buildPlatformDeliveryScopeLine(alert: PlatformAlertPayload): string {
  return [
    'Scope:',
    getPlatformDeliveryStringContext('tenantId', alert.tId),
    getPlatformDeliveryStringContext('storeId', alert.sId),
  ].join(' ');
}

function buildPlatformDeliveryAlertLine(alert: PlatformAlertPayload): string {
  if (!alert.id) return '';
  return `Alert: ${getPlatformDeliveryStringContext('alertId', alert.id)}`;
}

function buildText(alert: PlatformAlertPayload, entry: PlatformNotificationRegistryEntry): string {
  return [
    `[${alert.severity.toUpperCase()}] ${alert.title}`,
    '',
    alert.message,
    '',
    `Trigger: ${entry.triggerType}`,
    `Product: ${entry.productId}`,
    buildPlatformDeliveryScopeLine(alert),
    `Runbook: ${entry.runbook}`,
    buildPlatformDeliveryAlertLine(alert),
    `Time: ${new Date().toISOString()}`,
  ].filter(Boolean).join('\n');
}

function buildHtml(alert: PlatformAlertPayload, entry: PlatformNotificationRegistryEntry): string {
  const lines = buildText(alert, entry)
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br />');

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 12px">${escapeHtml(alert.title)}</h2>
      <div>${lines}</div>
    </div>
  `;
}

function normalizeWhatsAppNumber(value: string): string {
  return buildWhatsAppPhoneParam({ phoneNumber: value });
}

function getBoundedPlatformDeliveryLogStringContext(
  label: string,
  value: unknown,
): PlatformDeliveryLogContext {
  const normalized = typeof value === 'string'
    ? value
    : typeof value === 'number' && Number.isFinite(value)
      ? String(value)
      : typeof value === 'boolean'
        ? String(value)
        : '';
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

function getPlatformDeliveryLogContext(
  alert: PlatformAlertPayload,
  entry: PlatformNotificationRegistryEntry,
): PlatformDeliveryLogContext {
  return {
    ...getBoundedPlatformDeliveryLogStringContext('alertId', alert.id),
    ...getBoundedPlatformDeliveryLogStringContext('tenantId', alert.tId),
    ...getBoundedPlatformDeliveryLogStringContext('storeId', alert.sId),
    ...getBoundedPlatformDeliveryLogStringContext('triggerType', entry.triggerType),
    ...getBoundedPlatformDeliveryLogStringContext('productId', entry.productId),
  };
}

function logPlatformDeliveryChannelFailure(
  failureCode: string,
  alert: PlatformAlertPayload,
  entry: PlatformNotificationRegistryEntry,
  error?: unknown,
  context: PlatformDeliveryLogContext = {},
): void {
  logger.error('[PlatformDelivery] Channel failed', error || new Error(failureCode), {
    failureCode,
    ...getPlatformDeliveryLogContext(alert, entry),
    ...context,
    ...getMonitoringErrorContext(error),
  });
}

function logPlatformDeliveryResultFailure(
  failureCode: string,
  alert: PlatformAlertPayload,
  entry: PlatformNotificationRegistryEntry,
  result: PlatformDeliveryResult,
): void {
  logPlatformDeliveryChannelFailure(failureCode, alert, entry, undefined, {
    statusCode: result.statusCode,
    ...getBoundedPlatformDeliveryLogStringContext('channelError', result.error),
    ...getBoundedPlatformDeliveryLogStringContext('skippedReason', result.skippedReason),
  });
}

async function sendWhatsAppAlert(params: {
  to: string;
  text: string;
  severity: string;
  title: string;
  message: string;
}): Promise<PlatformDeliveryResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return { success: false, skippedReason: 'whatsapp_not_configured' };
  const encodedPhoneNumberId = encodeURIComponent(phoneNumberId);

  const to = normalizeWhatsAppNumber(params.to);
  if (!to) return { success: false, skippedReason: 'whatsapp_recipient_missing' };

  const templateName = process.env.PLATFORM_ALERT_WHATSAPP_TEMPLATE_NAME;
  const sessionActive = process.env.PLATFORM_ALERT_WHATSAPP_SESSION_ACTIVE === 'true';
  const body = templateName
    ? {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: process.env.PLATFORM_ALERT_WHATSAPP_TEMPLATE_LANGUAGE || 'en' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: params.severity },
            { type: 'text', text: params.title },
            { type: 'text', text: params.message.slice(0, 900) },
            { type: 'text', text: new Date().toISOString() },
          ],
        }],
      },
    }
    : sessionActive
      ? {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: params.text },
      }
      : null;

  if (!body) return { success: false, skippedReason: 'whatsapp_template_or_session_required' };

  const response = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${encodedPhoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return {
      success: false,
      error: 'whatsapp_send_failed',
      statusCode: response.status,
    };
  }

  return { success: true };
}

export async function sendPlatformAlertDelivery(alert: PlatformAlertPayload): Promise<void> {
  if (alert.metadata?.platformDeliverySuppressed === true) return;

  const entry = resolveEntry(alert);
  if (entry.triggerType === PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNKNOWN_SYSTEM_ALERT) return;

  const text = buildText(alert, entry);
  const subject = `[${alert.severity.toUpperCase()}] ${entry.title}`;

  if (isFunctionFeatureEnabled('ENABLE_PLATFORM_ALERT_EMAIL') && entry.defaultChannels.includes('email')) {
    const to = resolvePlatformRecipientEmail();
    if (to) {
      try {
        const result = await sendEmailViaSMTP({
          to,
          subject,
          html: buildHtml(alert, entry),
        });

        if (!result.success) {
          logPlatformDeliveryResultFailure(PLATFORM_ALERT_EMAIL_DELIVERY_FAILED, alert, entry, result);
        }
      } catch (error) {
        logPlatformDeliveryChannelFailure(PLATFORM_ALERT_EMAIL_DELIVERY_FAILED, alert, entry, error);
      }
    }
  }

  if (isFunctionFeatureEnabled('ENABLE_PLATFORM_ALERT_WHATSAPP') && entry.defaultChannels.includes('whatsapp_web')) {
    const to = resolvePlatformRecipientWhatsApp();
    if (to) {
      try {
        const result = await sendWhatsAppAlert({
          to,
          text,
          severity: alert.severity.toUpperCase(),
          title: entry.title,
          message: alert.message,
        });

        if (!result.success) {
          logPlatformDeliveryResultFailure(PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED, alert, entry, result);
        }
      } catch (error) {
        logPlatformDeliveryChannelFailure(PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED, alert, entry, error);
      }
    }
  }
}
