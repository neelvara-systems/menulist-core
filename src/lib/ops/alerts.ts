/**
 * Frontend Alert Creator — Writes alerts to systemAlerts collection from Next.js API routes.
 * 
 * This is a lightweight version of functions/src/monitoring/alerts.ts that uses
 * firebase-admin (server-side) instead of the Cloud Functions admin SDK.
 * 
 * Used by: Razorpay webhook, any Next.js API route that needs to create alerts.
 * 
 * Firebase cost: 1 write per alert.
 * 
 * @see __docs__/ops-alerting-delivery/ops-alerting-delivery_impl.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { admin } from '@lib/firebase/firebaseAdmin';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { sendPlatformAlertDelivery } from '@lib/ops/platformNotificationDelivery';
import { Timestamp } from 'firebase-admin/firestore';

const db = admin.firestore();

const TELEGRAM_BOT_TOKEN_PATTERN = /^\d{5,20}:[A-Za-z0-9_-]{20,256}$/;

function getTelegramSendMessageUrl(botToken: string): string | null {
  const normalizedToken = botToken.trim();
  if (!TELEGRAM_BOT_TOKEN_PATTERN.test(normalizedToken)) return null;
  return `https://api.telegram.org/bot${encodeURIComponent(normalizedToken)}/sendMessage`;
}

function escapeTelegramMarkdown(value: string): string {
  return value.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

interface CreateAlertParams {
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  type?: 'performance' | 'error' | 'health' | 'usage' | 'security';
  sId?: string;
  tId?: string;
  triggerType?: string;
  productId?: string;
  category?: string;
  metadata?: Record<string, any>;
}

/**
 * Create an alert from a Next.js API route.
 * Also triggers Telegram notification (fire-and-forget) if alerts are not muted.
 */
export async function createAlert(params: CreateAlertParams): Promise<string> {
  try {
    const alertMetadata = {
      ...(params.metadata || {}),
      ...(params.triggerType ? { platformTriggerType: params.triggerType } : {}),
      ...(params.productId ? { productId: params.productId } : {}),
      ...(params.category ? { category: params.category } : {}),
    };
    const docRef = await db.collection(DB_COLLECTIONS.SYSTEM_ALERTS).add({
      type: params.type || 'error',
      severity: params.severity,
      title: params.title,
      message: params.message,
      tId: params.tId || 'system',
      sId: params.sId || 'system',
      timestamp: Timestamp.now(),
      acknowledged: false,
      actionRequired: params.severity === 'critical',
      actionTaken: false,
      metadata: alertMetadata,
    });

    // Fire-and-forget Telegram notification
    try {
      const { FEATURE_FLAGS } = await import('@config/features');
      if (FEATURE_FLAGS.ENABLE_OPS_ALERTS) {
        // Use the ops_config/system doc to check mute status
        const opsDoc = await db.collection(DB_COLLECTIONS.OPS_CONFIG).doc('system').get();
        const opsData = opsDoc.data();
        const isMuted = opsData?.alertsMutedUntil &&
          opsData.alertsMutedUntil.toMillis() > Date.now();

        if (!isMuted) {
          const botToken = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
          if (botToken && chatId) {
            const telegramSendMessageUrl = getTelegramSendMessageUrl(botToken);
            if (!telegramSendMessageUrl) {
              logOpsFailure('ops_alert_telegram_configuration_invalid', undefined, {
                severity: params.severity,
                botTokenLength: botToken.trim().length,
                hasChatId: Boolean(chatId),
                ...getBoundedOpsStringContext('alertId', docRef.id),
                ...getBoundedOpsStringContext('title', params.title),
                ...getBoundedOpsStringContext('message', params.message),
              });
            } else {
              const severityEmoji = params.severity === 'critical' ? '🚨' : params.severity === 'warning' ? '⚠️' : 'ℹ️';
              const text = `${severityEmoji} *${escapeTelegramMarkdown(params.title)}*\n\n${escapeTelegramMarkdown(params.message)}`;
              fetch(telegramSendMessageUrl, {
                method: 'POST',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
              }).then((response) => {
                if (response.ok) return;
                logOpsFailure('ops_alert_telegram_delivery_failed', { status: response.status }, {
                  severity: params.severity,
                  hasBotToken: Boolean(botToken),
                  hasChatId: Boolean(chatId),
                  ...getBoundedOpsStringContext('alertId', docRef.id),
                  ...getBoundedOpsStringContext('title', params.title),
                  ...getBoundedOpsStringContext('message', params.message),
                });
              }).catch((error) => {
                logOpsFailure('ops_alert_telegram_delivery_failed', error, {
                  severity: params.severity,
                  hasBotToken: Boolean(botToken),
                  hasChatId: Boolean(chatId),
                  ...getBoundedOpsStringContext('alertId', docRef.id),
                  ...getBoundedOpsStringContext('title', params.title),
                  ...getBoundedOpsStringContext('message', params.message),
                });
              });
            }
          }

          sendPlatformAlertDelivery({
            id: docRef.id,
            severity: params.severity,
            title: params.title,
            message: params.message,
            tId: params.tId || 'system',
            sId: params.sId || 'system',
            metadata: alertMetadata,
          }).catch((error) => {
            logOpsFailure('ops_alert_platform_delivery_failed', error, {
              severity: params.severity,
              ...getBoundedOpsStringContext('alertId', docRef.id),
              ...getBoundedOpsStringContext('tenantId', params.tId),
              ...getBoundedOpsStringContext('storeId', params.sId),
            });
          });
        }
      }
    } catch (error) {
      logOpsFailure('ops_alert_delivery_check_failed', error, {
        severity: params.severity,
        ...getBoundedOpsStringContext('alertId', docRef.id),
      });
    }

    return docRef.id;
  } catch (error) {
    logOpsFailure('ops_alert_create_failed', error, {
      severity: params.severity,
      type: params.type || 'error',
      ...getBoundedOpsStringContext('tenantId', params.tId),
      ...getBoundedOpsStringContext('storeId', params.sId),
      ...getBoundedOpsStringContext('title', params.title),
      ...getBoundedOpsStringContext('message', params.message),
    });
    return '';
  }
}
