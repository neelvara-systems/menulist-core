/**
 * Alert System
 * Manages proactive alerts and notifications
 */

import { Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { ALERT_COOLDOWNS, ALERT_THRESHOLDS } from '../../../src/constants/analyticsMetrics';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { isAlertsMuted } from './deployMute';
import { logSystemError } from './errorTracking';
import { sendPlatformAlertDelivery } from './platformNotificationDelivery';
import { sendTelegramAlert } from './telegramAlert';

const logger = functions.logger;
const SAFE_ALERT_METADATA_KEYS = new Set([
  'category',
  'failureCode',
  'platformTriggerType',
  'productId',
  'ruleId',
  'triggerType',
]);

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

export interface ActiveAlertSummary {
  id: string;
  type: Alert['type'];
  severity: Alert['severity'];
  title: string;
  message: string;
  timestamp: Timestamp | null;
  acknowledged: boolean;
  metadataPreview: Record<string, boolean | number | string>;
}

export interface AlertRule {
  id: string;
  name: string;
  condition: (data: any) => boolean;
  alertType: Alert['type'];
  severity: Alert['severity'];
  title: string;
  messageTemplate: string;
  enabled: boolean;
  cooldownMinutes: number; // Prevent spam
}

type TriggeredAlertCreate = {
  createPromise: Promise<string>;
  ruleId: string;
};

function getErrorLogContext(error: unknown): { name?: string; code?: string; status?: number } {
  if (!error || typeof error !== 'object') return {};

  const record = error as Record<string, unknown>;
  return {
    name: error instanceof Error ? error.name : undefined,
    code: typeof record.code === 'string' ? record.code : undefined,
    status: typeof record.status === 'number' ? record.status : undefined,
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

function cleanAlertText(value: unknown, max = 260): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function getStoredAlertTextSummary(label: string, value: unknown): string {
  const normalized = cleanAlertText(value, 1000);
  return normalized
    ? `${label} present (${normalized.length} chars).`
    : `No ${label.toLowerCase()} text.`;
}

function getAlertMetadataPreview(metadata: unknown): Record<string, boolean | number | string> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};

  return Object.entries(metadata as Record<string, unknown>).reduce<Record<string, boolean | number | string>>((acc, [key, value]) => {
    if (value === null || value === undefined) return acc;
    if (typeof value === 'boolean') {
      acc[key] = value;
      return acc;
    }
    if (typeof value === 'number') {
      acc[key] = Number.isFinite(value) ? value : 0;
      return acc;
    }

    const normalized = cleanAlertText(value, 1000);
    if (SAFE_ALERT_METADATA_KEYS.has(key)) {
      acc[key] = normalized.slice(0, 80);
      return acc;
    }

    Object.assign(acc, getBoundedAlertStringContext(key, normalized));
    return acc;
  }, {});
}

function buildActiveAlertSummary(doc: FirebaseFirestore.QueryDocumentSnapshot): ActiveAlertSummary {
  const data = doc.data() || {};

  return {
    id: doc.id,
    type: data.type || 'error',
    severity: data.severity || 'warning',
    title: getStoredAlertTextSummary('Alert title', data.title),
    message: getStoredAlertTextSummary('Alert message', data.message),
    timestamp: data.timestamp || null,
    acknowledged: data.acknowledged === true,
    metadataPreview: getAlertMetadataPreview(data.metadata),
  };
}

// ================================================================
// ALERT RULES
// ================================================================

export const ALERT_RULES: AlertRule[] = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    condition: (data) => data.errorCount > ALERT_THRESHOLDS.ERROR_RATE_HIGH && data.period === '1h',
    alertType: 'error',
    severity: 'critical',
    title: 'High Error Rate Detected',
    messageTemplate: 'System has logged {{errorCount}} errors in the last hour.',
    enabled: true,
    cooldownMinutes: ALERT_COOLDOWNS.HIGH_ERROR_RATE,
  },
  {
    id: 'low-satisfaction',
    name: 'Low Satisfaction Rate',
    condition: (data) => data.satisfactionRate < ALERT_THRESHOLDS.SATISFACTION_LOW,
    alertType: 'performance',
    severity: 'warning',
    title: 'Low User Satisfaction',
    messageTemplate: 'Satisfaction rate dropped to {{satisfactionRate}}%',
    enabled: true,
    cooldownMinutes: ALERT_COOLDOWNS.LOW_SATISFACTION,
  },
  {
    id: 'kb-coverage-low',
    name: 'Low KB Coverage',
    condition: (data) => data.articleCount < ALERT_THRESHOLDS.KB_ARTICLES_MIN,
    alertType: 'usage',
    severity: 'warning',
    title: 'Low Knowledge Base Coverage',
    messageTemplate: 'Only {{articleCount}} articles in knowledge base. Add more content.',
    enabled: true,
    cooldownMinutes: ALERT_COOLDOWNS.LOW_KB_COVERAGE,
  },
  {
    id: 'slow-response-time',
    name: 'Slow Response Time',
    condition: (data) => data.avgResponseTime > ALERT_THRESHOLDS.RESPONSE_TIME_SLOW,
    alertType: 'performance',
    severity: 'warning',
    title: 'Slow System Response',
    messageTemplate: 'Average response time is {{avgResponseTime}}ms',
    enabled: true,
    cooldownMinutes: ALERT_COOLDOWNS.SLOW_RESPONSE,
  },
  {
    id: 'system-down',
    name: 'System Component Down',
    condition: (data) => data.healthStatus === 'down',
    alertType: 'health',
    severity: 'critical',
    title: 'System Component Down',
    messageTemplate: 'Component {{componentName}} is not responding',
    enabled: true,
    cooldownMinutes: ALERT_COOLDOWNS.SYSTEM_DOWN,
  },
];

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
    // Check cooldown period
    const shouldCreate = await checkCooldown(alert);
    if (!shouldCreate) {
      logger.info('[Alerts] Alert on cooldown', getAlertLogContext(alert));
      return '';
    }

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

    // Create alert
    const docRef = await db.collection(DB_COLLECTIONS.SYSTEM_ALERTS).add({
      ...alertFields,
      metadata: alertMetadata,
      timestamp: Timestamp.now(),
      acknowledged: false,
      actionRequired: alert.actionRequired || false,
      actionTaken: false,
    });

    logger.info('[Alerts] Created alert', {
      ...getAlertLogContext(alert),
      ...getBoundedAlertStringContext('alertId', docRef.id),
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
          ...getBoundedAlertStringContext('alertId', docRef.id),
          ...getAlertLogContext(alert),
          error: getErrorLogContext(err),
        }));
        sendPlatformAlertDelivery({
          id: docRef.id,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          tId: alert.tId,
          sId: alert.sId,
          metadata: alertMetadata,
        }).catch((err) => logger.error('[Alerts] Platform alert delivery failed', {
          ...getBoundedAlertStringContext('alertId', docRef.id),
          ...getAlertLogContext(alert),
          error: getErrorLogContext(err),
        }));
      } else {
        logger.info('[Alerts] Alert muted', getBoundedAlertStringContext('alertId', docRef.id));
      }
    } catch (notifError) {
      // Never fail alert creation due to notification error
      logger.error('[Alerts] Notification check failed', {
        ...getBoundedAlertStringContext('alertId', docRef.id),
        error: getErrorLogContext(notifError),
      });
    }

    return docRef.id;
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

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(alertId: string, userId: string): Promise<void> {
  try {
    await db.collection(DB_COLLECTIONS.SYSTEM_ALERTS).doc(alertId).update({
      acknowledged: true,
      acknowledgedAt: Timestamp.now(),
      acknowledgedBy: userId,
    });

    logger.info('[Alerts] Alert acknowledged', {
      ...getBoundedAlertStringContext('alertId', alertId),
      ...getBoundedAlertStringContext('userId', userId),
    });
  } catch (error) {
    logger.error('[Alerts] Failed to acknowledge alert', {
      ...getBoundedAlertStringContext('alertId', alertId),
      error: getErrorLogContext(error),
    });
    throw error;
  }
}

/**
 * Get active alerts for a store
 */
export async function getActiveAlerts(
  tId: string,
  sId: string,
  limit: number = 50
): Promise<ActiveAlertSummary[]> {
  try {
    const alertsSnapshot = await db
      .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
      .where('tId', '==', tId)
      .where('sId', '==', sId)
      .where('acknowledged', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return alertsSnapshot.docs.map(buildActiveAlertSummary);
  } catch (error) {
    logger.error('[Alerts] Failed to get active alerts', {
      ...getBoundedAlertStringContext('tId', tId),
      ...getBoundedAlertStringContext('sId', sId),
      limit,
      error: getErrorLogContext(error),
    });
    throw error;
  }
}

/**
 * Evaluate alert rules against data
 */
export async function evaluateAlertRules(
  tId: string,
  sId: string,
  data: Record<string, any>
): Promise<void> {
  const triggeredAlerts: TriggeredAlertCreate[] = [];

  for (const rule of ALERT_RULES) {
    if (!rule.enabled) continue;

    try {
      if (rule.condition(data)) {
        const message = renderTemplate(rule.messageTemplate, data);

        triggeredAlerts.push({
          ruleId: rule.id,
          createPromise: createAlert({
            tId,
            sId,
            type: rule.alertType,
            severity: rule.severity,
            title: rule.title,
            message,
            metadata: {
              ruleId: rule.id,
              ruleName: rule.name,
              ...data,
            },
            actionRequired: rule.severity === 'critical',
          }),
        });
      }
    } catch (error) {
      logger.error('[Alerts] Failed to evaluate rule', {
        ...getBoundedAlertStringContext('tId', tId),
        ...getBoundedAlertStringContext('sId', sId),
        ruleId: rule.id,
        error: getErrorLogContext(error),
      });
    }
  }

  const results = await Promise.allSettled(
    triggeredAlerts.map((triggeredAlert) => triggeredAlert.createPromise),
  );
  const firstFailedIndex = results.findIndex((result) => result.status === 'rejected');
  const failedCount = results.filter((result) => result.status === 'rejected').length;

  if (firstFailedIndex >= 0) {
    const firstFailed = results[firstFailedIndex];
    logger.error('[Alerts] Rule alert creation failed', {
      ...getBoundedAlertStringContext('tId', tId),
      ...getBoundedAlertStringContext('sId', sId),
      failedCount,
      triggeredCount: triggeredAlerts.length,
      firstFailedRuleId: triggeredAlerts[firstFailedIndex]?.ruleId,
      error: firstFailed.status === 'rejected' ? getErrorLogContext(firstFailed.reason) : {},
    });
  }
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Check if alert is within cooldown period
 */
async function checkCooldown(alert: Omit<Alert, 'id' | 'timestamp' | 'acknowledged'>): Promise<boolean> {
  try {
    const rule = ALERT_RULES.find(r => r.title === alert.title);
    const cooldownMinutes = rule?.cooldownMinutes ?? ALERT_COOLDOWNS.DEFAULT;

    const cooldownDate = new Date();
    cooldownDate.setMinutes(cooldownDate.getMinutes() - cooldownMinutes);

    const recentAlertsSnapshot = await db
      .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
      .where('tId', '==', alert.tId)
      .where('sId', '==', alert.sId)
      .where('title', '==', alert.title)
      .where('timestamp', '>=', Timestamp.fromDate(cooldownDate))
      .limit(1)
      .get();

    return recentAlertsSnapshot.empty;
  } catch (error) {
    logger.error('[Alerts] Failed to check cooldown', {
      ...getAlertLogContext(alert),
      error: getErrorLogContext(error),
    });
    return true; // Allow alert on error
  }
}

/**
 * Render alert message template
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  let message = template;
  Object.entries(data).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  });
  return message;
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  createAlert,
  acknowledgeAlert,
  getActiveAlerts,
  evaluateAlertRules,
  ALERT_RULES,
};
