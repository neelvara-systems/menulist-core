/**
 * Alert System
 * Manages proactive alerts and notifications
 */

import { Timestamp } from 'firebase-admin/firestore';
import { ALERT_COOLDOWNS, ALERT_THRESHOLDS } from '../../../src/constants/analyticsMetrics';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { isAlertsMuted } from './deployMute';
import { logSystemError } from './errorTracking';
import { sendTelegramAlert } from './telegramAlert';

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
  actionRequired?: boolean;
  actionTaken?: boolean;
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
      console.log(`[Alerts] Alert on cooldown: ${alert.title}`);
      return '';
    }

    // Create alert
    const docRef = await db.collection(DB_COLLECTIONS.SYSTEM_ALERTS).add({
      ...alert,
      timestamp: Timestamp.now(),
      acknowledged: false,
      actionRequired: alert.actionRequired || false,
      actionTaken: false,
    });

    console.log(`[Alerts] Created alert: ${alert.title} (${docRef.id})`);

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
            ...alert.metadata,
          },
        }).catch(err => console.error('[Alerts] Telegram delivery failed:', err));
      } else {
        console.log('[Alerts] Alert muted (deploy window active)');
      }
    } catch (notifError) {
      // Never fail alert creation due to notification error
      console.error('[Alerts] Notification check failed:', notifError);
    }

    return docRef.id;
  } catch (error) {
    console.error('[Alerts] Failed to create alert:', error);
    await logSystemError({
      tId: alert.tId,
      sId: alert.sId,
      errorType: 'function',
      severity: 'medium',
      message: `Failed to create alert: ${error instanceof Error ? error.message : 'Unknown'}`,
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

    console.log(`[Alerts] Alert acknowledged: ${alertId} by ${userId}`);
  } catch (error) {
    console.error('[Alerts] Failed to acknowledge alert:', error);
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
): Promise<Alert[]> {
  try {
    const alertsSnapshot = await db
      .collection(DB_COLLECTIONS.SYSTEM_ALERTS)
      .where('tId', '==', tId)
      .where('sId', '==', sId)
      .where('acknowledged', '==', false)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();

    return alertsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Alert));
  } catch (error) {
    console.error('[Alerts] Failed to get active alerts:', error);
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
  const triggeredAlerts: Promise<string>[] = [];

  for (const rule of ALERT_RULES) {
    if (!rule.enabled) continue;

    try {
      if (rule.condition(data)) {
        const message = renderTemplate(rule.messageTemplate, data);

        triggeredAlerts.push(
          createAlert({
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
          })
        );
      }
    } catch (error) {
      console.error(`[Alerts] Failed to evaluate rule ${rule.id}:`, error);
    }
  }

  await Promise.allSettled(triggeredAlerts);
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
    console.error('[Alerts] Failed to check cooldown:', error);
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
