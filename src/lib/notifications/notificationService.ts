import { logNotificationFailure } from './notificationDiagnostics';

export const LEGACY_NOTIFICATION_SERVICE_DISABLED = 'LEGACY_NOTIFICATION_SERVICE_DISABLED';

export class LegacyNotificationServiceDisabledError extends Error {
  code = LEGACY_NOTIFICATION_SERVICE_DISABLED;

  constructor(operation: string) {
    super(`Legacy notification service disabled for ${operation}. Use @lib/notifications or @lib/owner-notifications.`);
    this.name = 'LegacyNotificationServiceDisabledError';
  }
}

const createLegacyNotificationServiceError = (operation: string) => (
  new LegacyNotificationServiceDisabledError(operation)
);

const logLegacyNotificationServiceBlocked = (
  operation: string,
  context: Record<string, boolean | number | string>,
) => {
  logNotificationFailure(LEGACY_NOTIFICATION_SERVICE_DISABLED, createLegacyNotificationServiceError(operation), {
    operation,
    ...context,
  });
};

// ================================================================
// TYPES
// ================================================================

export interface NotificationPayload {
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}

export interface EmailNotification {
  to: string[];
  subject: string;
  body: string;
  html?: string;
}

export interface SlackNotification {
  channel: string;
  text: string;
  blocks?: any[];
}

// ================================================================
// IN-APP NOTIFICATIONS
// ================================================================

/**
 * Create an in-app notification
 */
export async function createNotification(
  tenantId: string,
  storeId: string,
  payload: NotificationPayload
): Promise<string> {
  const operation = 'createNotification';
  logLegacyNotificationServiceBlocked(operation, {
    tenantIdPresent: Boolean(tenantId),
    storeIdPresent: Boolean(storeId),
    titleLength: payload.title.length,
    type: payload.type,
  });
  throw createLegacyNotificationServiceError(operation);
}

// ================================================================
// EMAIL NOTIFICATIONS
// ================================================================

/**
 * Send email notification
 */
export async function sendEmailNotification(
  notification: EmailNotification
): Promise<void> {
  const operation = 'sendEmailNotification';
  logLegacyNotificationServiceBlocked(operation, {
    recipientCount: notification.to.length,
    subjectLength: notification.subject.length,
    hasHtml: Boolean(notification.html),
  });
  throw createLegacyNotificationServiceError(operation);
}

// ================================================================
// SLACK NOTIFICATIONS
// ================================================================

/**
 * Send Slack notification
 */
export async function sendSlackNotification(
  notification: SlackNotification
): Promise<void> {
  const operation = 'sendSlackNotification';
  logLegacyNotificationServiceBlocked(operation, {
    channelPresent: Boolean(notification.channel),
    textLength: notification.text.length,
    hasBlocks: Boolean(notification.blocks),
  });
  throw createLegacyNotificationServiceError(operation);
}

// ================================================================
// NOTIFICATION TEMPLATES
// ================================================================

/**
 * Format alert as Slack message
 */
export function formatAlertForSlack(alert: {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}): SlackNotification {
  const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
  const color = alert.severity === 'critical' ? '#f5222d' : alert.severity === 'warning' ? '#faad14' : '#1890ff';

  return {
    channel: '#alerts',
    text: `${emoji} ${alert.title}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} ${alert.title}`,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: alert.message,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Severity:* ${alert.severity.toUpperCase()} | *Time:* ${new Date().toLocaleString()}`,
          },
        ],
      },
    ],
  };
}

/**
 * Format weekly report as email
 */
export function formatWeeklyReportEmail(
  data: {
    weekStart: string;
    weekEnd: string;
    totalChats: number;
    satisfactionRate: number;
    highlights: string[];
  },
  recipients: string[]
): EmailNotification {
  const subject = `Weekly Analytics Report - ${data.weekStart} to ${data.weekEnd}`;
  
  const body = `
Weekly Analytics Summary

Period: ${data.weekStart} to ${data.weekEnd}

Key Metrics:
- Total Conversations: ${data.totalChats}
- Satisfaction Rate: ${data.satisfactionRate}%

Highlights:
${data.highlights.map(h => `• ${h}`).join('\n')}

View full report: https://dashboard.menulistai.com/platform/insights

---
This is an automated report. To unsubscribe, update your notification settings.
  `.trim();

  const html = `
<html>
  <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2>Weekly Analytics Summary</h2>
    <p><strong>Period:</strong> ${data.weekStart} to ${data.weekEnd}</p>
    
    <h3>Key Metrics</h3>
    <ul>
      <li>Total Conversations: <strong>${data.totalChats}</strong></li>
      <li>Satisfaction Rate: <strong>${data.satisfactionRate}%</strong></li>
    </ul>
    
    <h3>Highlights</h3>
    <ul>
      ${data.highlights.map(h => `<li>${h}</li>`).join('')}
    </ul>
    
    <p>
      <a href="https://dashboard.menulistai.com/platform/insights" 
         style="display: inline-block; padding: 10px 20px; background: #1890ff; color: white; text-decoration: none; border-radius: 4px;">
        View Full Report
      </a>
    </p>
    
    <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
    <p style="font-size: 12px; color: #999;">
      This is an automated report. To unsubscribe, update your notification settings.
    </p>
  </body>
</html>
  `.trim();

  return {
    to: recipients,
    subject,
    body,
    html,
  };
}

// ================================================================
// EXPORTS
// ================================================================

export default {
  createNotification,
  sendEmailNotification,
  sendSlackNotification,
  formatAlertForSlack,
  formatWeeklyReportEmail,
};
