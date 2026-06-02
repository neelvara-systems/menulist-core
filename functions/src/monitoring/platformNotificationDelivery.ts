import {
  getPlatformNotificationRegistryEntry,
  PLATFORM_NOTIFICATION_TRIGGER_TYPES,
  type PlatformNotificationRegistryEntry,
} from '../sharedData/platformNotificationRegistry';
import { isFunctionFeatureEnabled } from '../constants/features';
import { sendEmailViaSMTP } from '../messaging/providers/resend';

type PlatformAlertPayload = {
  id?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  tId?: string;
  sId?: string;
  metadata?: Record<string, any>;
};

const GRAPH_API_VERSION = 'v21.0';

function resolvePlatformRecipientEmail(): string | null {
  return (
    process.env.PLATFORM_ALERT_EMAIL_TO ||
    process.env.INTERNAL_NOTIFICATION_EMAIL ||
    ''
  ).trim() || null;
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

function buildText(alert: PlatformAlertPayload, entry: PlatformNotificationRegistryEntry): string {
  return [
    `[${alert.severity.toUpperCase()}] ${alert.title}`,
    '',
    alert.message,
    '',
    `Trigger: ${entry.triggerType}`,
    `Product: ${entry.productId}`,
    `Scope: tenant=${alert.tId || 'system'} store=${alert.sId || 'system'}`,
    `Runbook: ${entry.runbook}`,
    alert.id ? `Alert ID: ${alert.id}` : '',
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
  return value.replace(/[^\d]/g, '');
}

async function sendWhatsAppAlert(params: {
  to: string;
  text: string;
  severity: string;
  title: string;
  message: string;
}): Promise<void> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) return;

  const to = normalizeWhatsAppNumber(params.to);
  if (!to) return;

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

  if (!body) return;

  await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  }).catch(() => undefined);
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
      await sendEmailViaSMTP({
        to,
        subject,
        html: buildHtml(alert, entry),
      }).catch(() => undefined);
    }
  }

  if (isFunctionFeatureEnabled('ENABLE_PLATFORM_ALERT_WHATSAPP') && entry.defaultChannels.includes('whatsapp_web')) {
    const to = resolvePlatformRecipientWhatsApp();
    if (to) {
      await sendWhatsAppAlert({
        to,
        text,
        severity: alert.severity.toUpperCase(),
        title: entry.title,
        message: alert.message,
      });
    }
  }
}
