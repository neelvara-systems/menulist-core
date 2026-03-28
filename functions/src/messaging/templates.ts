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
  const { storeName, publicUrl, dashboardUrl } = meta;
  return {
    subject: `Your menu is now live — ${storeName || 'MenuList'}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Your menu is now live</h2>
      <p style="${STYLES.text}">Your digital menu for <strong>${storeName || 'your business'}</strong> has been published and is accessible to your customers.</p>
      <div style="${STYLES.highlight}">
        <strong>Your permanent menu link:</strong><br>
        <a href="${publicUrl}" style="${STYLES.link}">${publicUrl}</a>
      </div>
      <p style="${STYLES.text}">Share this link with your customers, add it to your Google Business Profile, or generate a QR code from your dashboard.</p>
      <p style="margin-top: 20px;">
        <a href="${dashboardUrl || 'https://menulist.ai'}" style="${STYLES.button}">Open Dashboard</a>
      </p>
    `),
  };
}

function paymentSuccess(meta: Record<string, any>): EmailTemplate {
  const { storeName, amount, currency, planName, nextBillingDate } = meta;
  const formattedAmount = `${currency || 'INR'} ${amount || '0'}`;
  return {
    subject: `Payment received — ${storeName || 'MenuList'}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Payment received</h2>
      <p style="${STYLES.text}">Your subscription payment for <strong>${storeName || 'your business'}</strong> has been processed.</p>
      <div style="${STYLES.highlight}">
        <strong>Amount:</strong> ${formattedAmount}<br>
        <strong>Plan:</strong> ${planName || 'Subscription'}<br>
        <strong>Next billing date:</strong> ${nextBillingDate || 'See dashboard'}
      </div>
      <p style="${STYLES.text}">No action required. Your service continues uninterrupted.</p>
    `),
  };
}

function paymentFailed(meta: Record<string, any>): EmailTemplate {
  const { storeName, amount, currency, retryInfo } = meta;
  const formattedAmount = `${currency || 'INR'} ${amount || '0'}`;
  return {
    subject: `Payment failed — Action needed — ${storeName || 'MenuList'}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Payment could not be processed</h2>
      <p style="${STYLES.text}">We were unable to process the payment of <strong>${formattedAmount}</strong> for <strong>${storeName || 'your business'}</strong>.</p>
      <div style="${STYLES.critical}">
        <strong>What to do:</strong><br>
        Please ensure your payment method has sufficient funds. The system will retry automatically.
        ${retryInfo ? `<br><br>${retryInfo}` : ''}
      </div>
      <p style="${STYLES.text}">Your menu remains accessible to customers during this period. Please update your payment method to avoid service interruption.</p>
    `),
  };
}

function renewalReminder(meta: Record<string, any>): EmailTemplate {
  const { storeName, amount, currency, renewalDate, planName } = meta;
  const formattedAmount = `${currency || 'INR'} ${amount || '0'}`;
  return {
    subject: `Upcoming renewal — ${storeName || 'MenuList'}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Subscription renewal in 3 days</h2>
      <p style="${STYLES.text}">Your <strong>${planName || 'subscription'}</strong> for <strong>${storeName || 'your business'}</strong> will renew on <strong>${renewalDate || 'soon'}</strong>.</p>
      <div style="${STYLES.highlight}">
        <strong>Amount:</strong> ${formattedAmount}<br>
        <strong>Renewal date:</strong> ${renewalDate || 'See dashboard'}
      </div>
      <p style="${STYLES.text}">Please ensure your payment method has sufficient funds to avoid any service interruption.</p>
    `),
  };
}

function gracePeriodStarted(meta: Record<string, any>): EmailTemplate {
  const { storeName } = meta;
  return {
    subject: `Billing attention needed — ${storeName || 'MenuList'}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Your subscription payment is overdue</h2>
      <p style="${STYLES.text}">The payment for <strong>${storeName || 'your business'}</strong> could not be collected. Your service continues temporarily during the grace period.</p>
      <div style="${STYLES.warning}">
        <strong>What happens next:</strong><br>
        We will continue to retry the payment. Please update your payment method if needed. Your menu remains live during this period.
      </div>
      <p style="${STYLES.text}">If you need assistance, contact us at support@menulist.ai.</p>
    `),
  };
}

function suspensionWarning(meta: Record<string, any>): EmailTemplate {
  const { storeName, daysOverdue } = meta;
  return {
    subject: `Action required to avoid service interruption — ${storeName || 'MenuList'}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Service interruption notice</h2>
      <p style="${STYLES.text}">Your subscription for <strong>${storeName || 'your business'}</strong> has been overdue for ${daysOverdue || 'several'} days.</p>
      <div style="${STYLES.critical}">
        <strong>Action required:</strong><br>
        Please update your payment method to avoid service interruption. Your menu will remain accessible, but editing and AI features may be paused.
      </div>
      <p style="${STYLES.text}">If you need assistance or wish to discuss your billing, contact us at support@menulist.ai.</p>
    `),
  };
}

function creditPurchaseSuccess(meta: Record<string, any>): EmailTemplate {
  const { storeName, creditsAdded, newBalance, amount, currency } = meta;
  return {
    subject: `Credits added — ${storeName || 'MenuList'}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Credits added to your account</h2>
      <p style="${STYLES.text}">A credit pack has been added to <strong>${storeName || 'your business'}</strong>.</p>
      <div style="${STYLES.highlight}">
        <strong>Credits added:</strong> ${creditsAdded || '0'}<br>
        <strong>New balance:</strong> ${newBalance || 'See dashboard'}<br>
        ${amount ? `<strong>Amount paid:</strong> ${currency || 'INR'} ${amount}` : ''}
      </div>
      <p style="${STYLES.text}">Credits are available immediately for AI features like image generation and descriptions.</p>
    `),
  };
}

function creditsExhausted(meta: Record<string, any>): EmailTemplate {
  const { storeName } = meta;
  return {
    subject: `Credit balance depleted — ${storeName || 'MenuList'}`,
    html: wrap(`
      <h2 style="${STYLES.header}">Your credit balance has been used up</h2>
      <p style="${STYLES.text}">The credit balance for <strong>${storeName || 'your business'}</strong> has reached zero.</p>
      <div style="${STYLES.warning}">
        <strong>What this means:</strong><br>
        AI-powered features (image generation, descriptions, translations) will pause until credits are replenished. Your menu remains fully accessible to customers.
      </div>
      <p style="${STYLES.text}">You can purchase additional credits from your dashboard at any time.</p>
    `),
  };
}

// ================================================================
// TEMPLATE RESOLVER
// ================================================================

const TEMPLATE_MAP: Record<MessageEventType, (meta: Record<string, any>) => EmailTemplate> = {
  STORE_PUBLISHED: storePublished,
  PAYMENT_SUCCESS: paymentSuccess,
  PAYMENT_FAILED: paymentFailed,
  RENEWAL_REMINDER: renewalReminder,
  GRACE_PERIOD_STARTED: gracePeriodStarted,
  SUSPENSION_WARNING: suspensionWarning,
  CREDIT_PURCHASE_SUCCESS: creditPurchaseSuccess,
  CREDITS_EXHAUSTED: creditsExhausted,
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
