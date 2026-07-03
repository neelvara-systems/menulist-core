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
import type { OwnerNotificationChannelResult } from '@lib/owner-notifications/types';
import { buildWhatsAppPhoneParam } from '@lib/phone/phoneNumber';
import { getBoundedOpsStringContext, logOpsFailure } from './opsDiagnostics';
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

type PlatformDeliveryLogContext = Record<string, boolean | number | string | null | undefined>;

const OPS_PLATFORM_ALERT_EMAIL_DELIVERY_FAILED = 'ops_platform_alert_email_delivery_failed';
const OPS_PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED = 'ops_platform_alert_whatsapp_delivery_failed';

function resolvePlatformRecipientEmail(): string | null {
  return (
    process.env.PLATFORM_ALERT_EMAIL_TO ||
    process.env.INTERNAL_NOTIFICATION_EMAIL ||
    ''
  ).trim() || null;
}

function resolvePlatformRecipientWhatsApp(): string | null {
  const raw = (
    process.env.PLATFORM_ALERT_WHATSAPP_TO ||
    process.env.INTERNAL_NOTIFICATION_WHATSAPP ||
    ''
  ).trim();
  const phone = buildWhatsAppPhoneParam({ phoneNumber: raw });
  return phone.length >= 10 && phone.length <= 15 ? phone : null;
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

function shouldSendWhatsApp(entry: PlatformNotificationRegistryEntry): boolean {
  return entry.defaultChannels.includes('whatsapp_web');
}

function getPlatformDeliveryLogContext(
  alert: PlatformAlertPayload,
  entry: PlatformNotificationRegistryEntry,
): PlatformDeliveryLogContext {
  return {
    ...getBoundedOpsStringContext('alertId', alert.id),
    ...getBoundedOpsStringContext('tenantId', alert.tId),
    ...getBoundedOpsStringContext('storeId', alert.sId),
    ...getBoundedOpsStringContext('triggerType', entry.triggerType),
    ...getBoundedOpsStringContext('productId', entry.productId),
  };
}

function logPlatformDeliveryChannelFailure(
  failureCode: string,
  alert: PlatformAlertPayload,
  entry: PlatformNotificationRegistryEntry,
  error?: unknown,
  context: PlatformDeliveryLogContext = {},
): void {
  logOpsFailure(failureCode, error, {
    ...getPlatformDeliveryLogContext(alert, entry),
    ...context,
  });
}

function logPlatformDeliveryResultFailure(
  failureCode: string,
  alert: PlatformAlertPayload,
  entry: PlatformNotificationRegistryEntry,
  result: OwnerNotificationChannelResult,
): void {
  logPlatformDeliveryChannelFailure(failureCode, alert, entry, undefined, {
    ...getBoundedOpsStringContext('channelError', result.error),
    ...getBoundedOpsStringContext('skippedReason', result.skippedReason),
  });
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
      try {
        const result = await sendOwnerNotificationEmail({
          to,
          subject,
          html: buildHtml(alert, entry),
        });

        if (!result.ok) {
          logPlatformDeliveryResultFailure(OPS_PLATFORM_ALERT_EMAIL_DELIVERY_FAILED, alert, entry, result);
        }
      } catch (error) {
        logPlatformDeliveryChannelFailure(OPS_PLATFORM_ALERT_EMAIL_DELIVERY_FAILED, alert, entry, error);
      }
    }
  }

  if (FEATURE_FLAGS.ENABLE_PLATFORM_ALERT_WHATSAPP && shouldSendWhatsApp(entry)) {
    const to = resolvePlatformRecipientWhatsApp();
    if (to) {
      const templateName = process.env.PLATFORM_ALERT_WHATSAPP_TEMPLATE_NAME;
      const sessionActive = process.env.PLATFORM_ALERT_WHATSAPP_SESSION_ACTIVE === 'true';
      try {
        const result = await sendOwnerNotificationWhatsApp({
          to,
          text,
          sessionActive,
          templateName,
          templateLanguage: process.env.PLATFORM_ALERT_WHATSAPP_TEMPLATE_LANGUAGE || 'en',
          templateParameters: templateName
            ? [alert.severity.toUpperCase(), entry.title, alert.message.slice(0, 900), new Date().toISOString()]
            : undefined,
        });

        if (!result.ok) {
          logPlatformDeliveryResultFailure(OPS_PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED, alert, entry, result);
        }
      } catch (error) {
        logPlatformDeliveryChannelFailure(OPS_PLATFORM_ALERT_WHATSAPP_DELIVERY_FAILED, alert, entry, error);
      }
    }
  }
}
