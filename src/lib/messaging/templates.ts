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

function wrap(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${S.body}">${content}<div style="${S.foot}"><p>MenuList — Your menu, always ready.</p><p>This is an automated system message. Do not reply to this email.</p></div></body></html>`;
}

// ================================================================
// TEMPLATES
// ================================================================

type TemplateFn = (m: Record<string, any>) => { subject: string; html: string };

const TEMPLATES: Record<string, TemplateFn> = {
  STORE_PUBLISHED: (m) => ({
    subject: `Your menu is now live — ${m.storeName || 'MenuList'}`,
    html: wrap(`<h2 style="${S.h2}">Your menu is now live</h2><p style="${S.p}">Your digital menu for <strong>${m.storeName || 'your business'}</strong> has been published.</p><div style="${S.info}"><strong>Your permanent menu link:</strong><br><a href="${m.publicUrl}" style="${S.link}">${m.publicUrl}</a></div><p style="${S.p}">Share this link with customers or generate a QR code from your dashboard.</p>${m.dashboardUrl ? `<p style="margin-top:20px"><a href="${m.dashboardUrl}" style="${S.btn}">Open Dashboard</a></p>` : ''}`),
  }),

  PAYMENT_SUCCESS: (m) => ({
    subject: `Payment received — ${m.storeName || 'MenuList'}`,
    html: wrap(`<h2 style="${S.h2}">Payment received</h2><p style="${S.p}">Your subscription payment for <strong>${m.storeName || 'your business'}</strong> has been processed.</p><div style="${S.info}"><strong>Amount:</strong> ${m.amountLabel || `${m.currency || 'INR'} ${m.amount || '0'}`}<br><strong>Plan:</strong> ${m.planName || 'Subscription'}<br><strong>Next billing date:</strong> ${m.nextBillingDate || 'See dashboard'}</div><p style="${S.p}">No action required. Your service continues uninterrupted.</p>`),
  }),

  PAYMENT_FAILED: (m) => ({
    subject: `Payment failed — Action needed — ${m.storeName || 'MenuList'}`,
    html: wrap(`<h2 style="${S.h2}">Payment could not be processed</h2><p style="${S.p}">We were unable to process the payment of <strong>${m.amountLabel || `${m.currency || 'INR'} ${m.amount || '0'}`}</strong> for <strong>${m.storeName || 'your business'}</strong>.</p><div style="${S.crit}"><strong>What to do:</strong><br>Please ensure your payment method has sufficient funds. The system will retry automatically.</div><p style="${S.p}">Your menu remains accessible to customers during this period.</p>`),
  }),

  RENEWAL_REMINDER: (m) => ({
    subject: `Upcoming renewal — ${m.storeName || 'MenuList'}`,
    html: wrap(`<h2 style="${S.h2}">Subscription renewal in 3 days</h2><p style="${S.p}">Your <strong>${m.planName || 'subscription'}</strong> for <strong>${m.storeName || 'your business'}</strong> will renew on <strong>${m.renewalDate || 'soon'}</strong>.</p><div style="${S.info}"><strong>Amount:</strong> ${m.amountLabel || `${m.currency || 'INR'} ${m.amount || '0'}`}<br><strong>Renewal date:</strong> ${m.renewalDate || 'See dashboard'}</div><p style="${S.p}">Please ensure your payment method has sufficient funds.</p>`),
  }),

  GRACE_PERIOD_STARTED: (m) => ({
    subject: `Billing attention needed — ${m.storeName || 'MenuList'}`,
    html: wrap(`<h2 style="${S.h2}">Your subscription payment is overdue</h2><p style="${S.p}">The payment for <strong>${m.storeName || 'your business'}</strong> could not be collected. Your service continues temporarily during the grace period.</p><div style="${S.warn}"><strong>What happens next:</strong><br>We will continue to retry the payment. Please update your payment method if needed. Your menu remains live during this period.</div><p style="${S.p}">If you need assistance, contact us at support@menulist.ai.</p>`),
  }),

  SUSPENSION_WARNING: (m) => ({
    subject: `Action required to avoid service interruption — ${m.storeName || 'MenuList'}`,
    html: wrap(`<h2 style="${S.h2}">Service interruption notice</h2><p style="${S.p}">Your subscription for <strong>${m.storeName || 'your business'}</strong> has been overdue for ${m.daysOverdue || 'several'} days.</p><div style="${S.crit}"><strong>Action required:</strong><br>Please update your payment method to avoid service interruption. Your menu will remain accessible, but editing and AI features may be paused.</div><p style="${S.p}">Contact us at support@menulist.ai if you need assistance.</p>`),
  }),

  CREDIT_PURCHASE_SUCCESS: (m) => ({
    subject: `Credits added — ${m.storeName || 'MenuList'}`,
    html: wrap(`<h2 style="${S.h2}">Credits added to your account</h2><p style="${S.p}">A credit pack has been added to <strong>${m.storeName || 'your business'}</strong>.</p><div style="${S.info}"><strong>Credits added:</strong> ${m.creditsAdded || '0'}<br><strong>New balance:</strong> ${m.newBalance || 'See dashboard'}<br>${m.amount ? `<strong>Amount paid:</strong> ${m.amountLabel || `${m.currency || 'INR'} ${m.amount}`}` : ''}</div><p style="${S.p}">Credits are available immediately for AI features.</p>`),
  }),

  CREDITS_EXHAUSTED: (m) => ({
    subject: `Credit balance depleted — ${m.storeName || 'MenuList'}`,
    html: wrap(`<h2 style="${S.h2}">Your credit balance has been used up</h2><p style="${S.p}">The credit balance for <strong>${m.storeName || 'your business'}</strong> has reached zero.</p><div style="${S.warn}"><strong>What this means:</strong><br>AI-powered features (image generation, descriptions, translations) will pause until credits are replenished. Your menu remains fully accessible to customers.</div><p style="${S.p}">You can purchase additional credits from your dashboard at any time.</p>`),
  }),
};

// ================================================================
// INTERNAL TEMPLATES (sent to founder/team — revenue notifications)
// ================================================================

const INTERNAL_TEMPLATES: Record<string, TemplateFn> = {
  INTERNAL_SUBSCRIPTION_PURCHASED: (m) => ({
    subject: `New Subscription: ${m.storeName || 'Unknown'} — ${m.planName || 'Plan'} (${m.currency || 'INR'} ${m.amount || '0'})`,
    html: wrap(`<h2 style="${S.h2}">New Subscription Purchased</h2><div style="${S.info}"><strong>Store:</strong> ${m.storeName || 'Unknown'}<br><strong>Plan:</strong> ${m.planName || 'N/A'}<br><strong>Amount:</strong> ${m.currency || 'INR'} ${m.amount || '0'}<br><strong>Store ID:</strong> ${m.storeId || 'N/A'}<br><strong>Tenant ID:</strong> ${m.tenantId || 'N/A'}<br><strong>Customer Email:</strong> ${m.customerEmail || 'N/A'}</div>`),
  }),

  INTERNAL_CREDIT_PACK_PURCHASED: (m) => ({
    subject: `Credit Pack Sold: ${m.storeName || 'Unknown'} — ${m.creditsAdded || '0'} credits (${m.currency || 'INR'} ${m.amount || '0'})`,
    html: wrap(`<h2 style="${S.h2}">Credit Pack Purchased</h2><div style="${S.info}"><strong>Store:</strong> ${m.storeName || 'Unknown'}<br><strong>Credits Added:</strong> ${m.creditsAdded || '0'}<br><strong>New Balance:</strong> ${m.newBalance || 'N/A'}<br><strong>Amount:</strong> ${m.currency || 'INR'} ${m.amount || '0'}<br><strong>Store ID:</strong> ${m.storeId || 'N/A'}<br><strong>Tenant ID:</strong> ${m.tenantId || 'N/A'}</div>`),
  }),

  INTERNAL_SUBSCRIPTION_RENEWED: (m) => ({
    subject: `Renewal: ${m.storeName || 'Unknown'} — ${m.planName || 'Plan'} (${m.currency || 'INR'} ${m.amount || '0'})`,
    html: wrap(`<h2 style="${S.h2}">Subscription Renewed</h2><div style="${S.info}"><strong>Store:</strong> ${m.storeName || 'Unknown'}<br><strong>Plan:</strong> ${m.planName || 'N/A'}<br><strong>Amount:</strong> ${m.currency || 'INR'} ${m.amount || '0'}<br><strong>Next Billing:</strong> ${m.nextBillingDate || 'N/A'}<br><strong>Store ID:</strong> ${m.storeId || 'N/A'}</div>`),
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
