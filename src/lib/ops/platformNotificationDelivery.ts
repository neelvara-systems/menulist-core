import { FEATURE_FLAGS } from '@config/features';
import {
  getPlatformNotificationRegistryEntry,
  PLATFORM_NOTIFICATION_TRIGGER_TYPES,
  type PlatformNotificationRegistryEntry,
} from '@data/shared/platformNotificationRegistry';
import {
  sendOwnerNotificationEmail,
} from '@lib/owner-notifications/channels/email';
import {
  sendOwnerNotificationWhatsApp,
} from '@lib/owner-notifications/channels/whatsapp';
import { classifyPlatformAlert } from './platformNotificationClassifier';

type PlatformAlertPayload = {
  id?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  tId?: string;
  sId?: string;
  metadata?: Record<string, any>;
};

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
    classifyPlatformAlert(alert).entry ||
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

function shouldSendWhatsApp(entry: PlatformNotificationRegistryEntry): boolean {
  return entry.defaultChannels.includes('whatsapp_web');
}

export async function sendPlatformAlertDelivery(alert: PlatformAlertPayload): Promise<void> {
  if (alert.metadata?.platformDeliverySuppressed === true) return;

  const entry = resolveEntry(alert);
  if (entry.triggerType === PLATFORM_NOTIFICATION_TRIGGER_TYPES.UNKNOWN_SYSTEM_ALERT) return;

  const text = buildText(alert, entry);
  const subject = `[${alert.severity.toUpperCase()}] ${entry.title}`;

  if (FEATURE_FLAGS.ENABLE_PLATFORM_ALERT_EMAIL && entry.defaultChannels.includes('email')) {
    const to = resolvePlatformRecipientEmail();
    if (to) {
      await sendOwnerNotificationEmail({
        to,
        subject,
        html: buildHtml(alert, entry),
      }).catch(() => undefined);
    }
  }

  if (FEATURE_FLAGS.ENABLE_PLATFORM_ALERT_WHATSAPP && shouldSendWhatsApp(entry)) {
    const to = resolvePlatformRecipientWhatsApp();
    if (to) {
      const templateName = process.env.PLATFORM_ALERT_WHATSAPP_TEMPLATE_NAME;
      const sessionActive = process.env.PLATFORM_ALERT_WHATSAPP_SESSION_ACTIVE === 'true';
      await sendOwnerNotificationWhatsApp({
        to,
        text,
        sessionActive,
        templateName,
        templateLanguage: process.env.PLATFORM_ALERT_WHATSAPP_TEMPLATE_LANGUAGE || 'en',
        templateParameters: templateName
          ? [alert.severity.toUpperCase(), entry.title, alert.message.slice(0, 900), new Date().toISOString()]
          : undefined,
      }).catch(() => undefined);
    }
  }
}
