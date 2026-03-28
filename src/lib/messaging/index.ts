/**
 * Lifecycle Messaging — Frontend Entry Point
 * 
 * Thin wrapper for Next.js API routes to send lifecycle messages.
 * Uses firebase-admin (server-side) for logging and nodemailer SMTP
 * for email delivery. FREE — no paid API needed.
 * 
 * The Cloud Functions side (nightly scheduler) uses
 * functions/src/messaging/messagingEngine.ts directly.
 * 
 * WIRED to all trigger points: Razorpay webhook, publish flow,
 * verify-subscription, verify-topup, capacityCheck, nightly scheduler.
 * 
 * Fire-and-forget: call from webhook catch blocks with try/catch.
 * 
 * @see __docs__/lifecycle-messaging/lifecycle-messaging_impl.md
 */

import { SYSTEM_EMAIL_FROM } from '@constant/urls';
import { admin } from '@lib/firebase/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';
import * as nodemailer from 'nodemailer';

const db = admin.firestore();
const MESSAGE_LOGS = 'messageLogs';
const OPS_CONFIG = 'ops_config';
const DEFAULT_FROM = SYSTEM_EMAIL_FROM;
const MAX_PER_DAY = 10;

// ================================================================
// TYPES (minimal, matches CF types)
// ================================================================

export interface LifecycleMessagePayload {
  storeId: string;
  tenantId: string;
  eventType: string;
  referenceId: string;
  recipientEmail: string;
  storeName: string;
  metadata?: Record<string, any>;
}

// ================================================================
// FEATURE FLAG (cached 60s)
// ================================================================

let flagCache: boolean | null = null;
let flagCacheAt = 0;

async function isEnabled(): Promise<boolean> {
  if (flagCache !== null && Date.now() - flagCacheAt < 60_000) return flagCache;
  try {
    const doc = await db.collection(OPS_CONFIG).doc('system').get();
    flagCache = doc.data()?.ENABLE_LIFECYCLE_MESSAGING === true;
    flagCacheAt = Date.now();
    return flagCache!;
  } catch { return false; }
}

// ================================================================
// IDEMPOTENCY
// ================================================================

async function isDuplicate(storeId: string, eventType: string, referenceId: string): Promise<boolean> {
  try {
    const snap = await db.collection(MESSAGE_LOGS)
      .where('storeId', '==', storeId)
      .where('eventType', '==', eventType)
      .where('referenceId', '==', referenceId)
      .where('status', '==', 'sent')
      .limit(1).get();
    return !snap.empty;
  } catch { return false; }
}

// ================================================================
// RATE LIMIT
// ================================================================

async function isRateLimited(storeId: string): Promise<boolean> {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const snap = await db.collection(MESSAGE_LOGS)
      .where('storeId', '==', storeId)
      .where('status', '==', 'sent')
      .where('createdAt', '>=', Timestamp.fromDate(today))
      .limit(MAX_PER_DAY + 1).get();
    return snap.size >= MAX_PER_DAY;
  } catch { return false; }
}

// ================================================================
// SEND VIA SMTP (nodemailer)
// ================================================================

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  cachedTransporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  return cachedTransporter;
}

// Track SMTP health to avoid flooding alerts
let smtpHealthy: boolean | null = null;
let smtpAlertedToday = '';

async function sendViaSMTP(to: string, subject: string, html: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) return { ok: false, error: 'SMTP not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)' };

  try {
    // SMTP Health Check: verify connection on first send (cached)
    if (smtpHealthy === null) {
      try {
        await transporter.verify();
        smtpHealthy = true;
      } catch (verifyErr) {
        smtpHealthy = false;
        // Alert founder ONCE per day if SMTP is broken
        const today = new Date().toISOString().split('T')[0];
        if (smtpAlertedToday !== today) {
          smtpAlertedToday = today;
          try {
            const { createAlert } = await import('@lib/ops/alerts');
            await createAlert({
              severity: 'critical',
              title: '🚨 SMTP Connection Failed — Emails NOT Sending',
              message: `SMTP verify failed: ${verifyErr instanceof Error ? verifyErr.message : 'Unknown'}\nHost: ${process.env.SMTP_HOST}\nAll lifecycle emails will fail until SMTP is fixed.`,
            });
          } catch { /* non-blocking */ }
        }
        return { ok: false, error: `SMTP verify failed: ${verifyErr instanceof Error ? verifyErr.message : 'Unknown'}` };
      }
    }

    const info = await transporter.sendMail({ from: DEFAULT_FROM, to, subject, html });
    smtpHealthy = true; // Reset on successful send
    return { ok: true, id: info.messageId };
  } catch (e) {
    smtpHealthy = null; // Reset so next send re-verifies
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown' };
  }
}

// ================================================================
// TEMPLATE IMPORT (lazy to avoid circular deps)
// ================================================================

async function getTemplate(eventType: string, meta: Record<string, any>): Promise<{ subject: string; html: string } | null> {
  // Inline minimal templates for webhook-triggered events
  // Full templates live in functions/src/messaging/templates.ts
  const { resolveTemplate } = await import('./templates');
  return resolveTemplate(eventType, meta);
}

// ================================================================
// MAIN: SEND LIFECYCLE MESSAGE
// ================================================================

/**
 * Send a lifecycle message from a Next.js API route.
 * Fire-and-forget safe — always wrap in try/catch.
 */
export async function sendLifecycleMessage(payload: LifecycleMessagePayload): Promise<boolean> {
  const { storeId, tenantId, eventType, referenceId, recipientEmail, storeName, metadata = {} } = payload;

  // 1. Feature flag
  if (!(await isEnabled())) return false;

  // 2. Idempotency
  if (await isDuplicate(storeId, eventType, referenceId)) return false;

  // 3. Rate limit (skip for critical: PAYMENT_FAILED, GRACE_PERIOD_STARTED, SUSPENSION_WARNING)
  const isCritical = ['PAYMENT_FAILED', 'GRACE_PERIOD_STARTED', 'SUSPENSION_WARNING'].includes(eventType);
  if (!isCritical && await isRateLimited(storeId)) return false;

  // 4. Resolve template
  const template = await getTemplate(eventType, { ...metadata, storeName });
  if (!template) return false;

  // 5. Send via SMTP
  const result = await sendViaSMTP(recipientEmail, template.subject, template.html);

  // 6. Log
  try {
    await db.collection(MESSAGE_LOGS).add({
      storeId, tenantId, eventType,
      channel: 'email',
      status: result.ok ? 'sent' : 'failed',
      recipientEmail,
      subject: template.subject,
      referenceId,
      providerMessageId: result.id || null,
      error: result.error || null,
      createdAt: Timestamp.now(),
    });
  } catch { /* logging failure is non-blocking */ }

  return result.ok;
}

// ================================================================
// INTERNAL NOTIFICATIONS (sent to founder/team — revenue events)
// ================================================================

/**
 * Send an internal notification to founder/team.
 * Used for revenue events: subscription purchased, credit pack bought.
 * 
 * Differences from sendLifecycleMessage:
 * - Recipient: founder email (from constants), NOT store owner
 * - No idempotency check (every revenue event should notify)
 * - No rate limiting (founder wants to know every sale)
 * - Still gated by ENABLE_LIFECYCLE_MESSAGING feature flag
 * - Also fires Telegram alert for instant push notification
 */
export async function sendInternalNotification(params: {
  eventType: string;
  metadata: Record<string, any>;
  storeId: string;
  tenantId: string;
}): Promise<void> {
  const { eventType, metadata, storeId, tenantId } = params;

  // Feature flag check
  if (!(await isEnabled())) return;

  // Send email to founder
  try {
    const { INTERNAL_RECIPIENTS } = await import('@constant/internalRecipients');
    const template = await getTemplate(eventType, metadata);
    if (template) {
      await sendViaSMTP(INTERNAL_RECIPIENTS.FOUNDER_EMAIL, template.subject, template.html);
    }
  } catch { /* non-blocking */ }

  // Also fire Telegram alert for instant push notification
  try {
    const { createAlert } = await import('@lib/ops/alerts');
    const isRevenue = eventType.includes('PURCHASED') || eventType.includes('RENEWED');
    const INTERNAL_TITLES: Record<string, string> = {
      INTERNAL_SUBSCRIPTION_PURCHASED: '💰 New Subscription',
      INTERNAL_CREDIT_PACK_PURCHASED: '💰 Credit Pack Sold',
      INTERNAL_SUBSCRIPTION_RENEWED: '💰 Subscription Renewed',
    };
    await createAlert({
      severity: 'info',
      title: INTERNAL_TITLES[eventType] || `Revenue: ${eventType}`,
      message: `Store: ${metadata.storeName || storeId}\nAmount: ${metadata.currency || 'INR'} ${metadata.amount || '0'}\nTenant: ${tenantId}`,
      sId: storeId,
      tId: tenantId,
      metadata: { ...metadata, isRevenue },
    });
  } catch { /* non-blocking */ }
}
