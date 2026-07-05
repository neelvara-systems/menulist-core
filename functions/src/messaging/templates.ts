/**
 * Lifecycle Messaging — Email Templates
 * 
 * All templates follow infrastructure tone:
 * - No exclamation marks
 * - No emojis in subjects
 * - No marketing language
 * - Clean, minimal HTML
 * 
 * Templates are code-only. No UI template editor.
 * 
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_spec.md §Tone Rules
 */

import { EmailTemplate, MessageEventType } from './types';

// ================================================================
// SHARED STYLES
// ================================================================

const STYLES = {
  body: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;',
  header: 'font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;',
  text: 'font-size: 14px; color: #4a4a4a; margin-bottom: 12px;',
  highlight: 'background: #f8f9fa; border-left: 3px solid #1890ff; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
  warning: 'background: #fff8e6; border-left: 3px solid #faad14; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
  critical: 'background: #fff1f0; border-left: 3px solid #f5222d; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
  button: 'display: inline-block; padding: 10px 24px; background: #1890ff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;',
  footer: 'margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;',
  link: 'color: #1890ff; text-decoration: none;',
};

const MAX_TEMPLATE_TEXT_LENGTH = 240;
const MAX_TEMPLATE_URL_LENGTH = 2048;
const PUBLISH_FAILURE_OWNER_COPY: Record<string, string> = {
  MENU_HTTP_FAIL: 'The public menu link did not respond successfully.',
  MENU_EMPTY: 'The public menu opened but did not show enough menu content.',
  MENU_TARGET_REJECTED: 'The public menu link could not be checked safely.',
  VERIFICATION_ERROR: 'The public menu check could not be completed.',
  FAILED: 'The public menu check could not be completed.',
  WARNING: 'The public menu check needs review.',
};
const DEFAULT_PUBLISH_FAILURE_OWNER_COPY = 'The public menu check could not be completed.';

function normalizeText(value: unknown, fallback: string, maxLength = MAX_TEMPLATE_TEXT_LENGTH): string {
  const raw = typeof value === 'string' ? value : String(value ?? '');
  const text = raw
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (text || fallback).slice(0, maxLength);
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function htmlValue(value: unknown, fallback: string): string {
  return escapeHtml(normalizeText(value, fallback));
}

function urlValue(value: unknown): string {
  const text = normalizeText(value, '', MAX_TEMPLATE_URL_LENGTH);
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:' ? text : '';
  } catch {
    return '';
  }
}

function publishFailureReasonText(value: unknown): string {
  const code = normalizeText(value, '').toUpperCase();
  return PUBLISH_FAILURE_OWNER_COPY[code] || DEFAULT_PUBLISH_FAILURE_OWNER_COPY;
}

function wrap(content: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="${STYLES.body}">
${content}
<div style="${STYLES.footer}">
  <p>MenuList — Your menu, always ready.</p>
  <p>This is an automated system message. Do not reply to this email.</p>
</div>
</body></html>`;
}

// ================================================================
// TEMPLATE GENERATORS
// ================================================================

function storePublished(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  const publicUrl = urlValue(meta.publicUrl);
  const dashboardUrl = urlValue(meta.dashboardUrl) || 'https://menulist.ai';
  return {
    subject: `Your menu is now live — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Your menu is now live</h2>
      <p style="${STYLES.text}">Your digital menu for <strong>${storeNameHtml}</strong> has been published and is accessible to your customers.</p>
      ${publicUrl ? `<div style="${STYLES.highlight}">
        <strong>Your permanent menu link:</strong><br>
        <a href="${escapeHtml(publicUrl)}" style="${STYLES.link}">${escapeHtml(publicUrl)}</a>
      </div>` : ''}
      <p style="${STYLES.text}">Share this link with your customers, add it to your Google Business Profile, or generate a QR code from your dashboard.</p>
      <p style="margin-top: 20px;">
        <a href="${escapeHtml(dashboardUrl)}" style="${STYLES.button}">Open Dashboard</a>
      </p>
    `),
  };
}

function menuPublishFailed(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  const failureReason = publishFailureReasonText(meta.failureReason);
  return {
    subject: `Menu publish needs attention — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Menu publish needs attention</h2>
      <p style="${STYLES.text}">The latest publish check for <strong>${storeNameHtml}</strong> did not complete successfully.</p>
      <div style="${STYLES.critical}">
        <strong>What happened:</strong><br>
        ${escapeHtml(failureReason)}
      </div>
      <p style="${STYLES.text}">Open the dashboard and retry publish after reviewing the menu state.</p>
    `),
  };
}

function paymentSuccess(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  const formattedAmount = normalizeText(meta.amountLabel, `${normalizeText(meta.currency, 'INR')} ${normalizeText(meta.amount, '0')}`);
  const planName = htmlValue(meta.planName, 'Subscription');
  const nextBillingDate = htmlValue(meta.nextBillingDate, 'See dashboard');
  return {
    subject: `Payment received — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Payment received</h2>
      <p style="${STYLES.text}">Your subscription payment for <strong>${storeNameHtml}</strong> has been processed.</p>
      <div style="${STYLES.highlight}">
        <strong>Amount:</strong> ${escapeHtml(formattedAmount)}<br>
        <strong>Plan:</strong> ${planName}<br>
        <strong>Next billing date:</strong> ${nextBillingDate}
      </div>
      <p style="${STYLES.text}">No action required. Your service continues uninterrupted.</p>
    `),
  };
}

function paymentFailed(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  const formattedAmount = normalizeText(meta.amountLabel, `${normalizeText(meta.currency, 'INR')} ${normalizeText(meta.amount, '0')}`);
  const retryInfo = normalizeText(meta.retryInfo, '');
  return {
    subject: `Payment failed — Action needed — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Payment could not be processed</h2>
      <p style="${STYLES.text}">We were unable to process the payment of <strong>${escapeHtml(formattedAmount)}</strong> for <strong>${storeNameHtml}</strong>.</p>
      <div style="${STYLES.critical}">
        <strong>What to do:</strong><br>
        Please ensure your payment method has sufficient funds. The system will retry automatically.
        ${retryInfo ? `<br><br>${escapeHtml(retryInfo)}` : ''}
      </div>
      <p style="${STYLES.text}">Your menu remains accessible to customers during this period. Please update your payment method to avoid service interruption.</p>
    `),
  };
}

function renewalReminder(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  const planName = htmlValue(meta.planName, 'subscription');
  const renewalDate = htmlValue(meta.renewalDate, 'soon');
  const formattedAmount = normalizeText(meta.amountLabel, `${normalizeText(meta.currency, 'INR')} ${normalizeText(meta.amount, '0')}`);
  return {
    subject: `Upcoming renewal — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Subscription renewal in 3 days</h2>
      <p style="${STYLES.text}">Your <strong>${planName}</strong> for <strong>${storeNameHtml}</strong> will renew on <strong>${renewalDate}</strong>.</p>
      <div style="${STYLES.highlight}">
        <strong>Amount:</strong> ${escapeHtml(formattedAmount)}<br>
        <strong>Renewal date:</strong> ${htmlValue(meta.renewalDate, 'See dashboard')}
      </div>
      <p style="${STYLES.text}">Please ensure your payment method has sufficient funds to avoid any service interruption.</p>
    `),
  };
}

function gracePeriodStarted(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  return {
    subject: `Billing attention needed — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Your subscription payment is overdue</h2>
      <p style="${STYLES.text}">The payment for <strong>${storeNameHtml}</strong> could not be collected. Your service continues temporarily during the grace period.</p>
      <div style="${STYLES.warning}">
        <strong>What happens next:</strong><br>
        We will continue to retry the payment. Please update your payment method if needed. Your menu remains live during this period.
      </div>
      <p style="${STYLES.text}">If you need assistance, contact us at support@menulist.ai.</p>
    `),
  };
}

function suspensionWarning(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  const daysOverdue = htmlValue(meta.daysOverdue, 'several');
  return {
    subject: `Action required to avoid service interruption — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Service interruption notice</h2>
      <p style="${STYLES.text}">Your subscription for <strong>${storeNameHtml}</strong> has been overdue for ${daysOverdue} days.</p>
      <div style="${STYLES.critical}">
        <strong>Action required:</strong><br>
        Please update your payment method to avoid service interruption. Your menu will remain accessible, but editing and AI features may be paused.
      </div>
      <p style="${STYLES.text}">If you need assistance or wish to discuss your billing, contact us at support@menulist.ai.</p>
    `),
  };
}

function creditPurchaseSuccess(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  const amountPresent = meta.amount !== undefined && meta.amount !== null && normalizeText(meta.amount, '') !== '';
  const formattedAmount = normalizeText(meta.amountLabel, `${normalizeText(meta.currency, 'INR')} ${normalizeText(meta.amount, '0')}`);
  return {
    subject: `Credits added — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Credits added to your account</h2>
      <p style="${STYLES.text}">A credit pack has been added to <strong>${storeNameHtml}</strong>.</p>
      <div style="${STYLES.highlight}">
        <strong>Credits added:</strong> ${htmlValue(meta.creditsAdded, '0')}<br>
        <strong>New balance:</strong> ${htmlValue(meta.newBalance, 'See dashboard')}<br>
        ${amountPresent ? `<strong>Amount paid:</strong> ${escapeHtml(formattedAmount)}` : ''}
      </div>
      <p style="${STYLES.text}">Credits are available immediately for AI features like image generation and descriptions.</p>
    `),
  };
}

function creditsExhausted(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  return {
    subject: `Credit balance depleted — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Your credit balance has been used up</h2>
      <p style="${STYLES.text}">The credit balance for <strong>${storeNameHtml}</strong> has reached zero.</p>
      <div style="${STYLES.warning}">
        <strong>What this means:</strong><br>
        AI features such as image generation, descriptions, and translations will pause until credits are replenished. Your menu remains fully accessible to customers.
      </div>
      <p style="${STYLES.text}">You can purchase additional credits from your dashboard at any time.</p>
    `),
  };
}

function menuStale(meta: Record<string, any>): EmailTemplate {
  const storeName = normalizeText(meta.storeName, 'MenuList');
  const storeNameHtml = htmlValue(meta.storeName, 'your business');
  const daysSincePublish = normalizeText(meta.daysSincePublish, '');
  return {
    subject: `Menu review suggested — ${storeName}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Menu review suggested</h2>
      <p style="${STYLES.text}">The public menu for <strong>${storeNameHtml}</strong> may need review.</p>
      <div style="${STYLES.highlight}">
        <strong>Reason:</strong> ${htmlValue(meta.reason, 'Menu information may be older than expected.')}<br>
        ${daysSincePublish ? `<strong>Days since publish:</strong> ${escapeHtml(daysSincePublish)}` : ''}
      </div>
      <p style="${STYLES.text}">Open the dashboard when convenient and confirm the menu is still current.</p>
    `),
  };
}

// ================================================================
// TEMPLATE RESOLVER
// ================================================================

const TEMPLATE_MAP: Record<MessageEventType, (meta: Record<string, any>) => EmailTemplate> = {
  STORE_PUBLISHED: storePublished,
  MENU_PUBLISH_FAILED: menuPublishFailed,
  PAYMENT_SUCCESS: paymentSuccess,
  PAYMENT_FAILED: paymentFailed,
  RENEWAL_REMINDER: renewalReminder,
  GRACE_PERIOD_STARTED: gracePeriodStarted,
  SUSPENSION_WARNING: suspensionWarning,
  CREDIT_PURCHASE_SUCCESS: creditPurchaseSuccess,
  CREDITS_EXHAUSTED: creditsExhausted,
  MENU_STALE: menuStale,
};

/**
 * Resolve template for a given event type + metadata.
 * Returns null if event type has no template.
 */
export function resolveTemplate(
  eventType: MessageEventType,
  metadata: Record<string, any>
): EmailTemplate | null {
  const generator = TEMPLATE_MAP[eventType];
  if (!generator) return null;
  return generator(metadata);
}
