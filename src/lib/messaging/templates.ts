/**
 * Lifecycle Messaging — Email Templates (Frontend Side)
 * 
 * Mirrors functions/src/messaging/templates.ts for use in Next.js API routes.
 * Infrastructure-grade tone: calm, non-marketing, system-grade.
 * 
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_spec.md §Tone Rules
 */

// ================================================================
// SHARED STYLES
// ================================================================

const S = {
  body: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 560px; margin: 0 auto; padding: 24px;',
  h2: 'font-size: 18px; font-weight: 600; color: #1a1a1a; margin-bottom: 16px;',
  p: 'font-size: 14px; color: #4a4a4a; margin-bottom: 12px;',
  info: 'background: #f8f9fa; border-left: 3px solid #1890ff; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
  warn: 'background: #fff8e6; border-left: 3px solid #faad14; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
  crit: 'background: #fff1f0; border-left: 3px solid #f5222d; padding: 12px 16px; margin: 16px 0; font-size: 14px;',
  btn: 'display: inline-block; padding: 10px 24px; background: #1890ff; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 14px; font-weight: 500;',
  foot: 'margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee; font-size: 12px; color: #999;',
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
    return (
      (url.protocol === 'http:' || url.protocol === 'https:')
      && !url.username
      && !url.password
    ) ? text : '';
  } catch {
    return '';
  }
}

function publishFailureReasonText(value: unknown): string {
  const code = normalizeText(value, '').toUpperCase();
  return PUBLISH_FAILURE_OWNER_COPY[code] || DEFAULT_PUBLISH_FAILURE_OWNER_COPY;
}

function wrap(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${S.body}">${content}<div style="${S.foot}"><p>MenuList — Your menu, always ready.</p><p>This is an automated system message. Do not reply to this email.</p></div></body></html>`;
}

// ================================================================
// TEMPLATES
// ================================================================

type TemplateFn = (m: Record<string, any>) => { subject: string; html: string };

const TEMPLATES: Record<string, TemplateFn> = {
  STORE_PUBLISHED: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    const publicUrl = urlValue(m.publicUrl);
    const dashboardUrl = urlValue(m.dashboardUrl);
    return {
      subject: `Your menu is now live — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Your menu is now live</h2><p style="${S.p}">Your digital menu for <strong>${htmlValue(m.storeName, 'your business')}</strong> has been published.</p>${publicUrl ? `<div style="${S.info}"><strong>Your permanent menu link:</strong><br><a href="${escapeHtml(publicUrl)}" style="${S.link}">${escapeHtml(publicUrl)}</a></div>` : ''}<p style="${S.p}">Share this link with customers or generate a QR code from your dashboard.</p>${dashboardUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(dashboardUrl)}" style="${S.btn}">Open Dashboard</a></p>` : ''}`),
    };
  },

  MENU_PUBLISH_FAILED: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    const failureReason = publishFailureReasonText(m.failureReason);
    return {
      subject: `Menu publish needs attention — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Menu publish needs attention</h2><p style="${S.p}">The latest publish check for <strong>${htmlValue(m.storeName, 'your business')}</strong> did not complete successfully.</p><div style="${S.crit}"><strong>What happened:</strong><br>${escapeHtml(failureReason)}</div><p style="${S.p}">Open the dashboard and retry publish after reviewing the menu state.</p>`),
    };
  },

  PAYMENT_SUCCESS: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    const formattedAmount = normalizeText(m.amountLabel, `${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')}`);
    return {
      subject: `Payment received — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Payment received</h2><p style="${S.p}">Your subscription payment for <strong>${htmlValue(m.storeName, 'your business')}</strong> has been processed.</p><div style="${S.info}"><strong>Amount:</strong> ${escapeHtml(formattedAmount)}<br><strong>Plan:</strong> ${htmlValue(m.planName, 'Subscription')}<br><strong>Next billing date:</strong> ${htmlValue(m.nextBillingDate, 'See dashboard')}</div><p style="${S.p}">No action required. Your service continues uninterrupted.</p>`),
    };
  },

  PAYMENT_RECOVERED: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    const formattedAmount = normalizeText(m.amountLabel, `${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')}`);
    return {
      subject: `Payment recovered — ${storeName}`,
      html: wrap(
        `<h2 style="${S.h2}">Payment recovered</h2><p style="${S.p}">The overdue subscription payment for <strong>${htmlValue(m.storeName, 'your business')}</strong> has now been processed.</p><div style="${S.info}"><strong>Amount:</strong> ${escapeHtml(formattedAmount)}<br><strong>Plan:</strong> ${htmlValue(m.planName, 'Subscription')}</div><p style="${S.p}">No action is needed. Your subscription is active.</p>`,
      ),
    };
  },

  PAYMENT_FAILED: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    const formattedAmount = normalizeText(m.amountLabel, `${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')}`);
    return {
      subject: `Payment failed — Action needed — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Payment could not be processed</h2><p style="${S.p}">We were unable to process the payment of <strong>${escapeHtml(formattedAmount)}</strong> for <strong>${htmlValue(m.storeName, 'your business')}</strong>.</p><div style="${S.crit}"><strong>What to do:</strong><br>Please ensure your payment method has sufficient funds. The system will retry automatically.</div><p style="${S.p}">Your menu remains accessible to customers during this period.</p>`),
    };
  },

  RENEWAL_REMINDER: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    const formattedAmount = normalizeText(m.amountLabel, `${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')}`);
    return {
      subject: `Upcoming renewal — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Subscription renewal in 3 days</h2><p style="${S.p}">Your <strong>${htmlValue(m.planName, 'subscription')}</strong> for <strong>${htmlValue(m.storeName, 'your business')}</strong> will renew on <strong>${htmlValue(m.renewalDate, 'soon')}</strong>.</p><div style="${S.info}"><strong>Amount:</strong> ${escapeHtml(formattedAmount)}<br><strong>Renewal date:</strong> ${htmlValue(m.renewalDate, 'See dashboard')}</div><p style="${S.p}">Please ensure your payment method has sufficient funds.</p>`),
    };
  },

  GRACE_PERIOD_STARTED: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    return {
      subject: `Billing attention needed — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Your subscription payment is overdue</h2><p style="${S.p}">The payment for <strong>${htmlValue(m.storeName, 'your business')}</strong> could not be collected. Your service continues temporarily during the grace period.</p><div style="${S.warn}"><strong>What happens next:</strong><br>We will continue to retry the payment. Please update your payment method if needed. Your menu remains live during this period.</div><p style="${S.p}">If you need assistance, contact us at support@menulist.ai.</p>`),
    };
  },

  SUSPENSION_WARNING: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    return {
      subject: `Action required to avoid service interruption — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Service interruption notice</h2><p style="${S.p}">Your subscription for <strong>${htmlValue(m.storeName, 'your business')}</strong> has been overdue for ${htmlValue(m.daysOverdue, 'several')} days.</p><div style="${S.crit}"><strong>Action required:</strong><br>Please update your payment method to avoid service interruption. Your menu will remain accessible, but editing and AI features may be paused.</div><p style="${S.p}">Contact us at support@menulist.ai if you need assistance.</p>`),
    };
  },

  CREDIT_PURCHASE_SUCCESS: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    const amountPresent = m.amount !== undefined && m.amount !== null && normalizeText(m.amount, '') !== '';
    const formattedAmount = normalizeText(m.amountLabel, `${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')}`);
    return {
      subject: `Credits added — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Credits added to your account</h2><p style="${S.p}">A credit pack has been added to <strong>${htmlValue(m.storeName, 'your business')}</strong>.</p><div style="${S.info}"><strong>Credits added:</strong> ${htmlValue(m.creditsAdded, '0')}<br><strong>New balance:</strong> ${htmlValue(m.newBalance, 'See dashboard')}<br>${amountPresent ? `<strong>Amount paid:</strong> ${escapeHtml(formattedAmount)}` : ''}</div><p style="${S.p}">Credits are available immediately for AI features.</p>`),
    };
  },

  CREDITS_LOW: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    return {
      subject: `Credit balance is low — ${storeName}`,
      html: wrap(
        `<h2 style="${S.h2}">Credit balance is low</h2><p style="${S.p}">The credit balance for <strong>${htmlValue(m.storeName, 'your business')}</strong> is running low.</p><div style="${S.warn}"><strong>Remaining credits:</strong> ${htmlValue(m.remainingCredits, 'See dashboard')}</div><p style="${S.p}">Your public menu remains available.</p>`,
      ),
    };
  },

  CREDITS_EXHAUSTED: (m) => {
    const storeName = normalizeText(m.storeName, 'MenuList');
    return {
      subject: `Credit balance depleted — ${storeName}`,
      html: wrap(`<h2 style="${S.h2}">Your credit balance has been used up</h2><p style="${S.p}">The credit balance for <strong>${htmlValue(m.storeName, 'your business')}</strong> has reached zero.</p><div style="${S.warn}"><strong>What this means:</strong><br>AI features such as image generation, descriptions, and translations will pause until credits are replenished. Your menu remains fully accessible to customers.</div><p style="${S.p}">You can purchase additional credits from your dashboard at any time.</p>`),
    };
  },

  SUBSCRIPTION_ACTIVATED: (m) => ({
    subject: `Subscription activated — ${normalizeText(m.storeName, 'MenuList')}`,
    html: wrap(
      `<h2 style="${S.h2}">Subscription activated</h2><p style="${S.p}">The subscription for <strong>${htmlValue(m.storeName, 'your business')}</strong> is active.</p><p style="${S.p}">No action is needed.</p>`,
    ),
  }),

  SUBSCRIPTION_COMPLETED: (m) => ({
    subject: `Subscription completed — ${normalizeText(m.storeName, 'MenuList')}`,
    html: wrap(
      `<h2 style="${S.h2}">Subscription completed</h2><p style="${S.p}">The fixed subscription term for <strong>${htmlValue(m.storeName, 'your business')}</strong> has completed.</p><p style="${S.p}">Open billing if you want to review the account status.</p>`,
    ),
  }),

  REFUND_PROCESSED: (m) => {
    const formattedAmount = normalizeText(m.amountLabel, `${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')}`);
    return {
      subject: `Refund processed — ${normalizeText(m.storeName, 'MenuList')}`,
      html: wrap(
        `<h2 style="${S.h2}">Refund processed</h2><p style="${S.p}">A refund for <strong>${htmlValue(m.storeName, 'your business')}</strong> has been processed.</p><div style="${S.info}"><strong>Amount:</strong> ${escapeHtml(formattedAmount)}<br><strong>Reference:</strong> ${htmlValue(m.refundReference, 'See billing history')}</div><p style="${S.p}">Your bank may take additional time to show the credit.</p>`,
      ),
    };
  },
};

// ================================================================
// INTERNAL TEMPLATES (sent to founder/team — revenue notifications)
// ================================================================

const INTERNAL_TEMPLATES: Record<string, TemplateFn> = {
  INTERNAL_SUBSCRIPTION_PURCHASED: (m) => ({
    subject: `New Subscription: ${normalizeText(m.storeName, 'Unknown')} — ${normalizeText(m.planName, 'Plan')} (${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')})`,
    html: wrap(`<h2 style="${S.h2}">New Subscription Purchased</h2><div style="${S.info}"><strong>Store:</strong> ${htmlValue(m.storeName, 'Unknown')}<br><strong>Plan:</strong> ${htmlValue(m.planName, 'N/A')}<br><strong>Amount:</strong> ${htmlValue(m.currency, 'INR')} ${htmlValue(m.amount, '0')}<br><strong>Store ID:</strong> ${htmlValue(m.storeId, 'N/A')}<br><strong>Tenant ID:</strong> ${htmlValue(m.tenantId, 'N/A')}<br><strong>Customer Email:</strong> ${htmlValue(m.customerEmail, 'N/A')}</div>`),
  }),

  INTERNAL_CREDIT_PACK_PURCHASED: (m) => ({
    subject: `Credit Pack Sold: ${normalizeText(m.storeName, 'Unknown')} — ${normalizeText(m.creditsAdded, '0')} credits (${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')})`,
    html: wrap(`<h2 style="${S.h2}">Credit Pack Purchased</h2><div style="${S.info}"><strong>Store:</strong> ${htmlValue(m.storeName, 'Unknown')}<br><strong>Credits Added:</strong> ${htmlValue(m.creditsAdded, '0')}<br><strong>New Balance:</strong> ${htmlValue(m.newBalance, 'N/A')}<br><strong>Amount:</strong> ${htmlValue(m.currency, 'INR')} ${htmlValue(m.amount, '0')}<br><strong>Store ID:</strong> ${htmlValue(m.storeId, 'N/A')}<br><strong>Tenant ID:</strong> ${htmlValue(m.tenantId, 'N/A')}</div>`),
  }),

  INTERNAL_SUBSCRIPTION_RENEWED: (m) => ({
    subject: `Renewal: ${normalizeText(m.storeName, 'Unknown')} — ${normalizeText(m.planName, 'Plan')} (${normalizeText(m.currency, 'INR')} ${normalizeText(m.amount, '0')})`,
    html: wrap(`<h2 style="${S.h2}">Subscription Renewed</h2><div style="${S.info}"><strong>Store:</strong> ${htmlValue(m.storeName, 'Unknown')}<br><strong>Plan:</strong> ${htmlValue(m.planName, 'N/A')}<br><strong>Amount:</strong> ${htmlValue(m.currency, 'INR')} ${htmlValue(m.amount, '0')}<br><strong>Next Billing:</strong> ${htmlValue(m.nextBillingDate, 'N/A')}<br><strong>Store ID:</strong> ${htmlValue(m.storeId, 'N/A')}</div>`),
  }),
};

// ================================================================
// RESOLVER (handles both external + internal templates)
// ================================================================

export function resolveTemplate(
  eventType: string,
  metadata: Record<string, any>,
): { subject: string; html: string } | null {
  const fn = TEMPLATES[eventType] || INTERNAL_TEMPLATES[eventType];
  return fn ? fn(metadata) : null;
}
