import { DASHBOARD_URL } from '@constant/urls';
import type { OwnerNotificationTemplate } from '../types';

const VERSION = '2026-06-02';
const MAX_OWNER_NOTIFICATION_TEXT_LENGTH = 240;
const MAX_OWNER_NOTIFICATION_URL_LENGTH = 2048;
const PUBLISH_FAILURE_OWNER_COPY: Record<string, string> = {
    MENU_HTTP_FAIL: 'The public menu link did not respond successfully.',
    MENU_EMPTY: 'The public menu opened but did not show enough menu content.',
    MENU_TARGET_REJECTED: 'The public menu link could not be checked safely.',
    VERIFICATION_ERROR: 'The public menu check could not be completed.',
    FAILED: 'The public menu check could not be completed.',
    WARNING: 'The public menu check needs review.',
};
const DEFAULT_PUBLISH_FAILURE_OWNER_COPY = 'The public menu check could not be completed.';
const MENU_STALE_REASON_OWNER_COPY: Record<string, string> = {
    MENU_INFORMATION_STALE: 'Menu information may be older than expected.',
    MENU_STALE: 'Menu information may be older than expected.',
    STALE_DETECTED: 'Menu information may be older than expected.',
};
const DEFAULT_MENU_STALE_REASON_OWNER_COPY = 'Menu information may be older than expected.';

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

function escapeHtml(value: unknown): string {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function textValue(value: unknown, fallback: string): string {
    return normalizeText(value, fallback, MAX_OWNER_NOTIFICATION_TEXT_LENGTH);
}

function normalizeText(value: unknown, fallback: string, maxLength: number): string {
    const raw = typeof value === 'string' ? value : String(value ?? '');
    const text = raw
        .replace(/[\u0000-\u001f\u007f]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return (text || fallback).slice(0, maxLength);
}

function urlValue(value: unknown): string {
    const text = normalizeText(value, '', MAX_OWNER_NOTIFICATION_URL_LENGTH);
    if (!text) return '';
    try {
        const url = new URL(text);
        return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password ? text : '';
    } catch {
        return '';
    }
}

function publishFailureReasonText(value: unknown): string {
    const code = textValue(value, '').toUpperCase();
    return PUBLISH_FAILURE_OWNER_COPY[code] || DEFAULT_PUBLISH_FAILURE_OWNER_COPY;
}

function menuStaleReasonText(value: unknown): string {
    const code = textValue(value, '').toUpperCase();
    return MENU_STALE_REASON_OWNER_COPY[code] || DEFAULT_MENU_STALE_REASON_OWNER_COPY;
}

function wrap(content: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="${S.body}">${content}<div style="${S.foot}"><p>MenuList — Your menu, always ready.</p><p>This is an automated system message. Do not reply to this email.</p></div></body></html>`;
}

function template(templateKey: string, subject: string, html: string, text: string): OwnerNotificationTemplate {
    return {
        subject,
        html: wrap(html),
        text,
        templateKey,
        templateVersion: VERSION,
    };
}

export function renderMenuListOwnerNotification(templateKey: string, metadata: Record<string, unknown>): OwnerNotificationTemplate | null {
    const storeName = escapeHtml(textValue(metadata.storeName, 'your business'));
    const storeNameText = textValue(metadata.storeName, 'your business');
    const amount = escapeHtml(textValue(metadata.amountLabel, `${metadata.currencyCode || 'INR'} ${metadata.amount || '0'}`));
    const planName = escapeHtml(textValue(metadata.planName, 'Subscription'));
    const nextBillingDate = escapeHtml(textValue(metadata.nextBillingDate, 'See dashboard'));
    const renewalDate = escapeHtml(textValue(metadata.renewalDate, 'See dashboard'));
    const publicUrl = urlValue(metadata.publicUrl);
    const dashboardUrl = urlValue(metadata.dashboardUrl) || DASHBOARD_URL;
    const documentUrl = urlValue(metadata.documentUrl);
    const publishFailureReason = publishFailureReasonText(metadata.failureReason);
    const menuStaleReason = menuStaleReasonText(metadata.reason);

    switch (templateKey) {
        case 'menulist.menu_published':
            return template(
                templateKey,
                `Your menu is now live — ${storeNameText}`,
                `<h2 style="${S.h2}">Your menu is now live</h2><p style="${S.p}">Your digital menu for <strong>${storeName}</strong> has been published.</p>${publicUrl ? `<div style="${S.info}"><strong>Your permanent menu link:</strong><br><a href="${escapeHtml(publicUrl)}" style="${S.link}">${escapeHtml(publicUrl)}</a></div>` : ''}<p style="${S.p}">No action is needed.</p>${dashboardUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(dashboardUrl)}" style="${S.btn}">Open Dashboard</a></p>` : ''}`,
                `Your menu for ${storeNameText} is now live.${publicUrl ? ` Menu link: ${publicUrl}` : ''}`,
            );
        case 'menulist.menu_publish_failed':
            return template(
                templateKey,
                `Menu publish needs attention — ${storeNameText}`,
                `<h2 style="${S.h2}">Menu publish needs attention</h2><p style="${S.p}">The latest publish check for <strong>${storeName}</strong> did not complete successfully.</p><div style="${S.crit}"><strong>What happened:</strong><br>${escapeHtml(publishFailureReason)}</div><p style="${S.p}">Open the dashboard and retry publish after reviewing the menu state.</p>`,
                `Menu publish needs attention for ${storeNameText}. ${publishFailureReason}`,
            );
        case 'menulist.payment_success':
            return template(
                templateKey,
                `Payment received — ${storeNameText}`,
                `<h2 style="${S.h2}">Payment received</h2><p style="${S.p}">Your subscription payment for <strong>${storeName}</strong> has been processed.</p><div style="${S.info}"><strong>Amount:</strong> ${amount}<br><strong>Plan:</strong> ${planName}<br><strong>Next billing date:</strong> ${nextBillingDate}</div><p style="${S.p}">No action required. Your service continues uninterrupted.</p>`,
                `Payment received for ${storeNameText}. Amount: ${textValue(metadata.amountLabel, String(metadata.amount || '0'))}. Next billing date: ${textValue(metadata.nextBillingDate, 'See dashboard')}.`,
            );
        case 'menulist.payment_recovered':
            return template(
                templateKey,
                `Payment recovered — ${storeNameText}`,
                `<h2 style="${S.h2}">Payment recovered</h2><p style="${S.p}">The overdue subscription payment for <strong>${storeName}</strong> has now been processed.</p><div style="${S.info}"><strong>Amount:</strong> ${amount}<br><strong>Plan:</strong> ${planName}</div><p style="${S.p}">No action is needed. Your subscription is active.</p>`,
                `Payment recovered for ${storeNameText}. No action is needed.`,
            );
        case 'menulist.payment_failed':
            return template(
                templateKey,
                `Payment failed — Action needed — ${storeNameText}`,
                `<h2 style="${S.h2}">Payment could not be processed</h2><p style="${S.p}">We were unable to process the payment of <strong>${amount}</strong> for <strong>${storeName}</strong>.</p><div style="${S.crit}"><strong>What to do:</strong><br>Please ensure your payment method has sufficient funds. The system will retry automatically.</div><p style="${S.p}">Your menu remains accessible to customers during this period.</p>`,
                `Payment could not be processed for ${storeNameText}. Amount: ${textValue(metadata.amountLabel, String(metadata.amount || '0'))}. Please check your payment method.`,
            );
        case 'menulist.grace_period_started':
            return template(
                templateKey,
                `Billing attention needed — ${storeNameText}`,
                `<h2 style="${S.h2}">Your subscription payment is overdue</h2><p style="${S.p}">The payment for <strong>${storeName}</strong> could not be collected. Your service continues temporarily during the grace period.</p><div style="${S.warn}"><strong>What happens next:</strong><br>We will continue to retry the payment. Please update your payment method if needed.</div><p style="${S.p}">Your menu remains live during this period.</p>`,
                `Billing attention needed for ${storeNameText}. The payment could not be collected and will be retried.`,
            );
        case 'menulist.renewal_reminder':
            return template(
                templateKey,
                `Upcoming renewal — ${storeNameText}`,
                `<h2 style="${S.h2}">Subscription renewal in 3 days</h2><p style="${S.p}">Your <strong>${planName}</strong> for <strong>${storeName}</strong> will renew on <strong>${renewalDate}</strong>.</p><div style="${S.info}"><strong>Amount:</strong> ${amount}<br><strong>Renewal date:</strong> ${renewalDate}</div><p style="${S.p}">Please ensure your payment method has sufficient funds.</p>`,
                `Your ${textValue(metadata.planName, 'subscription')} for ${storeNameText} renews on ${textValue(metadata.renewalDate, 'soon')}. Amount: ${textValue(metadata.amountLabel, String(metadata.amount || '0'))}.`,
            );
        case 'menulist.suspension_warning':
            return template(
                templateKey,
                `Action required to avoid service interruption — ${storeNameText}`,
                `<h2 style="${S.h2}">Service interruption notice</h2><p style="${S.p}">Your subscription for <strong>${storeName}</strong> has been overdue for ${escapeHtml(textValue(metadata.daysOverdue, 'several'))} days.</p><div style="${S.crit}"><strong>Action required:</strong><br>Please update your payment method to avoid service interruption. Your menu will remain accessible, but editing and AI features may be paused.</div><p style="${S.p}">Contact support@menulist.ai if you need assistance.</p>`,
                `Action required for ${storeNameText}. Your subscription has been overdue for ${textValue(metadata.daysOverdue, 'several')} days.`,
            );
        case 'menulist.credit_purchase_success':
            return template(
                templateKey,
                `Credits added — ${storeNameText}`,
                `<h2 style="${S.h2}">Credits added to your account</h2><p style="${S.p}">A credit pack has been added to <strong>${storeName}</strong>.</p><div style="${S.info}"><strong>Credits added:</strong> ${escapeHtml(textValue(metadata.creditsAdded, '0'))}<br><strong>New balance:</strong> ${escapeHtml(textValue(metadata.newBalance, 'See dashboard'))}<br>${metadata.amount ? `<strong>Amount paid:</strong> ${amount}` : ''}</div><p style="${S.p}">Credits are available immediately.</p>`,
                `Credits added to ${storeNameText}. Credits added: ${textValue(metadata.creditsAdded, '0')}. New balance: ${textValue(metadata.newBalance, 'See dashboard')}.`,
            );
        case 'menulist.credits_low':
            return template(
                templateKey,
                `Credit balance is low — ${storeNameText}`,
                `<h2 style="${S.h2}">Credit balance is low</h2><p style="${S.p}">The credit balance for <strong>${storeName}</strong> is running low.</p><div style="${S.warn}"><strong>Current balance:</strong> ${escapeHtml(textValue(metadata.newBalance, 'See dashboard'))}</div><p style="${S.p}">Your public menu remains available.</p>`,
                `Credit balance is low for ${storeNameText}. Current balance: ${textValue(metadata.newBalance, 'See dashboard')}.`,
            );
        case 'menulist.credits_exhausted':
            return template(
                templateKey,
                `Credit balance depleted — ${storeNameText}`,
                `<h2 style="${S.h2}">Your credit balance has been used up</h2><p style="${S.p}">The credit balance for <strong>${storeName}</strong> has reached zero.</p><div style="${S.warn}"><strong>What this means:</strong><br>AI features such as image generation, descriptions, and translations will pause until credits are replenished. Your menu remains accessible to customers.</div><p style="${S.p}">You can purchase additional credits from your dashboard at any time.</p>`,
                `Credit balance depleted for ${storeNameText}. AI features will pause until credits are replenished.`,
            );
        case 'menulist.subscription_activated':
        case 'menulist.subscription_completed':
        case 'menulist.subscription_cancelled':
        case 'menulist.subscription_paused':
        case 'menulist.subscription_resumed':
        case 'menulist.subscription_upgraded': {
            const action = templateKey.split('.').pop()?.replace('subscription_', '').replace(/_/g, ' ') || 'updated';
            return template(
                templateKey,
                `Subscription ${action} — ${storeNameText}`,
                `<h2 style="${S.h2}">Subscription ${escapeHtml(action)}</h2><p style="${S.p}">The subscription for <strong>${storeName}</strong> has been ${escapeHtml(action)}.</p><div style="${S.info}"><strong>Plan:</strong> ${planName}<br>${metadata.amount ? `<strong>Amount:</strong> ${amount}<br>` : ''}<strong>Date:</strong> ${escapeHtml(textValue(metadata.sentAtLabel || metadata.effectiveDate, 'Now'))}</div><p style="${S.p}">No action is needed if this matches your request.</p>`,
                `Subscription ${action} for ${storeNameText}.`,
            );
        }
        case 'menulist.refund_processed':
            return template(
                templateKey,
                `Refund processed — ${storeNameText}`,
                `<h2 style="${S.h2}">Refund processed</h2><p style="${S.p}">A refund for <strong>${storeName}</strong> has been processed.</p><div style="${S.info}"><strong>Amount:</strong> ${amount}<br><strong>Reference:</strong> ${escapeHtml(textValue(metadata.refundReference, 'See billing history'))}</div><p style="${S.p}">Your bank may take additional time to show the credit.</p>`,
                `Refund processed for ${storeNameText}. Amount: ${textValue(metadata.amountLabel, String(metadata.amount || '0'))}.`,
            );
        case 'menulist.billing_document_issued': {
            const documentNumber = textValue(metadata.documentNumber, 'Billing document');
            const documentTypeLabel = textValue(metadata.documentTypeLabel, 'billing document');
            return template(
                templateKey,
                `MenuList ${documentTypeLabel} ${documentNumber}`,
                `<h2 style="${S.h2}">Your ${escapeHtml(documentTypeLabel)} is ready</h2><p style="${S.p}">The billing document for <strong>${storeName}</strong> has been issued.</p><div style="${S.info}"><strong>Document:</strong> ${escapeHtml(documentNumber)}<br><strong>Amount:</strong> ${amount}</div>${documentUrl ? `<p style="margin-top:20px"><a href="${escapeHtml(documentUrl)}" style="${S.btn}">Open billing document</a></p><p style="${S.p}">Sign in to MenuList to open this private document.</p>` : `<p style="${S.p}">Open Billing in MenuList to access this private document.</p>`}`,
                `Your MenuList ${documentTypeLabel} ${documentNumber} is ready.${documentUrl ? ` Open the private document after signing in: ${documentUrl}` : ' Open Billing in MenuList to access it.'}`,
            );
        }
        case 'menulist.menu_stale':
            return template(
                templateKey,
                `Menu review suggested — ${storeNameText}`,
                `<h2 style="${S.h2}">Menu review suggested</h2><p style="${S.p}">The public menu for <strong>${storeName}</strong> may need review.</p><div style="${S.info}"><strong>Reason:</strong> ${escapeHtml(menuStaleReason)}</div><p style="${S.p}">Open the dashboard when convenient and confirm the menu is still current.</p>`,
                `Menu review suggested for ${storeNameText}. ${menuStaleReason}`,
            );
        default:
            return null;
    }
}
