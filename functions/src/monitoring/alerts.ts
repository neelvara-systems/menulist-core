/**
 * Alert System
 * Manages proactive alerts and notifications
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { ALERT_COOLDOWNS } from './analyticsMetrics';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { isAlertsMuted } from './deployMute';
import { logSystemError } from './errorTracking';
import { sendPlatformAlertDelivery } from './platformNotificationDelivery';
import { sendTelegramAlert } from './telegramAlert';
import {
  getBoundedFunctionsErrorCode,
  getBoundedFunctionsErrorName,
  getBoundedFunctionsErrorStatus,
} from '../utils/boundedErrorContext';
import { FUNCTION_RETENTION_CONFIG } from '../constants/features';
import { getPlatformNotificationRegistryEntry } from '../sharedData/platformNotificationRegistry';
import {
  getAlertCooldownDocumentIds,
  isAlertTimestampWithinCooldown,
} from './alertBoundary';

// @firestore-collection-evidence DB_COLLECTIONS.SYSTEM_ALERTS operations=write
const logger = functions.logger;
// ================================================================
// TYPES
// ================================================================

export interface Alert {
  id?: string;
  tId: string;
  sId: string;
  type: 'performance' | 'error' | 'health' | 'usage' | 'security';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: Timestamp;
  acknowledged: boolean;
  acknowledgedAt?: Timestamp;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
  triggerType?: string;
  productId?: string;
  category?: string;
  suppressPlatformDelivery?: boolean;
  actionRequired?: boolean;
  actionTaken?: boolean;
}

function getErrorLogContext(error: unknown): { name?: string; code?: string; status?: number } {
  return {
    name: getBoundedFunctionsErrorName(error),
    code: getBoundedFunctionsErrorCode(error),
    status: getBoundedFunctionsErrorStatus(error),
  };
}

function getAlertLogContext(alert: Pick<Alert, 'tId' | 'sId' | 'type' | 'severity' | 'title'>) {
  return {
    tIdPresent: alert.tId.length > 0,
    tIdLength: alert.tId.length,
    sIdPresent: alert.sId.length > 0,
    sIdLength: alert.sId.length,
    type: alert.type,
    severity: alert.severity,
    titleLength: alert.title.length,
  };
}

function getBoundedAlertStringContext(label: string, value: unknown): Record<string, boolean | number> {
  const normalized = typeof value === 'string' ? value : '';
  return {
    [`${label}Present`]: normalized.length > 0,
    [`${label}Length`]: normalized.length,
  };
}

// ================================================================
// ALERT MANAGEMENT
// ================================================================

/**
 * Create a new alert
 */
export async function createAlert(
  alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>
): Promise<string> {
  try {
    const {
      triggerType,
      productId,
      category,
      suppressPlatformDelivery,
      metadata,
      ...alertFields
    } = alert;
    const alertMetadata = {
      ...(metadata || {}),
      ...(triggerType ? { platformTriggerType: triggerType } : {}),
      ...(productId ? { productId } : {}),
      ...(category ? { category } : {}),
      ...(suppressPlatformDelivery ? { platformDeliverySuppressed: true } : {}),
    };
    const nowMillis = Date.now();
    const now = Timestamp.fromMillis(nowMillis);
    const cooldownMinutes = getAlertCooldownMinutes(alert);
    const cooldownMs = cooldownMinutes * 60 * 1000;
    const alertsCollection = db.collection(DB_COLLECTIONS.SYSTEM_ALERTS);
    const alertData = {
      ...alertFields,
      metadata: alertMetadata,
      timestamp: now,
      expiresAt: Timestamp.fromMillis(
        nowMillis + FUNCTION_RETENTION_CONFIG.SYSTEM_ALERT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      ),
      acknowledged: false,
      actionRequired: alert.actionRequired === true,
      actionTaken: false,
    };
    const creation = cooldownMinutes <= 0
      ? await (async () => {
        const ref = alertsCollection.doc();
        await ref.create(alertData);
        return { created: true, id: ref.id };
      })()
      : await (async () => {
        const documentIds = getAlertCooldownDocumentIds({
          tId: alert.tId,
          sId: alert.sId,
          title: alert.title,
          nowMillis,
          cooldownMs,
        });
        const currentRef = alertsCollection.doc(documentIds.current);
        const previousRef = alertsCollection.doc(documentIds.previous);
        return db.runTransaction(async (transaction) => {
          const [currentSnapshot, previousSnapshot] = await transaction.getAll(currentRef, previousRef);
          if (currentSnapshot.exists) {
            return { created: false, id: currentSnapshot.id };
          }

          const previousTimestamp = previousSnapshot.data()?.timestamp;
          const previousTimestampMillis = previousTimestamp instanceof Timestamp
            ? previousTimestamp.toMillis()
            : null;
          if (isAlertTimestampWithinCooldown(previousTimestampMillis, nowMillis, cooldownMs)) {
            return { created: false, id: previousSnapshot.id };
          }

          transaction.create(currentRef, alertData);
          return { created: true, id: currentRef.id };
        });
      })();

    if (!creation.created) {
      logger.info('[Alerts] Alert on cooldown', {
        ...getAlertLogContext(alert),
        cooldownMinutes,
      });
      return '';
    }

    logger.info('[Alerts] Created alert', {
      ...getAlertLogContext(alert),
      ...getBoundedAlertStringContext('alertId', creation.id),
    });

    // Telegram notification delivery (fire-and-forget)
    // Feature flag: ENABLE_OPS_ALERTS (checked via env var set from features.ts)
    try {
      const muted = await isAlertsMuted();
      if (!muted) {
        sendTelegramAlert({
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: {
            storeId: alert.sId,
            tenantId: alert.tId,
            ...alertMetadata,
          },
        }).catch((err) => logger.error('[Alerts] Telegram delivery failed', {
          ...getBoundedAlertStringContext('alertId', creation.id),
          ...getAlertLogContext(alert),
          error: getErrorLogContext(err),
        }));
        sendPlatformAlertDelivery({
          id: creation.id,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          tId: alert.tId,
          sId: alert.sId,
          metadata: alertMetadata,
        }).catch((err) => logger.error('[Alerts] Platform alert delivery failed', {
          ...getBoundedAlertStringContext('alertId', creation.id),
          ...getAlertLogContext(alert),
          error: getErrorLogContext(err),
        }));
      } else {
        logger.info('[Alerts] Alert muted', getBoundedAlertStringContext('alertId', creation.id));
      }
    } catch (notifError) {
      // Never fail alert creation due to notification error
      logger.error('[Alerts] Notification check failed', {
        ...getBoundedAlertStringContext('alertId', creation.id),
        error: getErrorLogContext(notifError),
      });
    }

    return creation.id;
  } catch (error) {
    logger.error('[Alerts] Failed to create alert', {
      ...getAlertLogContext(alert),
      error: getErrorLogContext(error),
    });
    await logSystemError({
      tId: alert.tId,
      sId: alert.sId,
      errorType: 'function',
      severity: 'medium',
      message: 'ALERT_CREATE_FAILED',
      functionName: 'createAlert',
    });
    throw error;
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function getAlertCooldownMinutes(
  alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>,
): number {
  const triggerType = alert.triggerType
    || (typeof alert.metadata?.platformTriggerType === 'string'
      ? alert.metadata.platformTriggerType
      : undefined);
  const registryCooldown = triggerType
    ? getPlatformNotificationRegistryEntry(triggerType)?.cooldownMinutes
    : undefined;
  if (registryCooldown !== undefined) return registryCooldown;

  return ALERT_COOLDOWNS.DEFAULT;
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  createAlert,
};
