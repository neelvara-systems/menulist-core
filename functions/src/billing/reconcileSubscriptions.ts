/**
 * Subscription Reconciliation - Firebase Cloud Function
 * ═══════════════════════════════════════════════════════════════
 *
 * Migrated from Vercel API route (/api/internal/reconcile-subscriptions)
 * to Firebase Functions for:
 * - Longer timeout (540s vs Vercel's 10s)
 * - Runs alongside existing nightly scheduler (no extra cron needed)
 * - Same infrastructure as other nightly jobs
 *
 * Fetches all active/past_due/paused subscriptions from Firestore,
 * compares with Razorpay's authoritative state, and syncs mismatches.
 * This is the safety net for webhook failures.
 *
 * Called from: decisionBlocksScoring.ts nightly scheduler
 */

import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin } from '../firebaseAdmin';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type PaymentStatus = 'pending' | 'active' | 'past_due' | 'paused' | 'cancelled' | 'completed' | 'expired';

// Map Razorpay API status → our internal PaymentStatus
const RAZORPAY_STATUS_MAP: Record<string, PaymentStatus> = {
    active: 'active',
    pending: 'past_due',
    halted: 'past_due',
    paused: 'paused',
    cancelled: 'cancelled',
    completed: 'completed',
    expired: 'expired',
};

// ─────────────────────────────────────────────────────────────────────────────
// STATE MACHINE (mirrors src/lib/billing/subscriptionStateMachine.ts)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, PaymentStatus[]> = {
    pending: ['active'],
    active: ['past_due', 'paused', 'cancelled', 'completed', 'expired'],
    past_due: ['active', 'expired'],
    paused: ['active', 'cancelled', 'expired'],
    cancelled: ['expired'],
    expired: [],
    completed: [],
};

function validateTransition(from: string, to: string, context: string): boolean {
    if (from === to) return true;
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) {
        functions.logger.warn(`[Reconciliation] Unknown state: "${from}" → "${to}" (${context})`);
        return false;
    }
    const isValid = allowed.includes(to as PaymentStatus);
    if (!isValid) {
        functions.logger.warn(`[Reconciliation] Invalid transition: "${from}" → "${to}" (${context})`);
    }
    return isValid;
}

// ─────────────────────────────────────────────────────────────────────────────
// RAZORPAY CLIENT (initialized lazily with Firebase secrets)
// ─────────────────────────────────────────────────────────────────────────────

let razorpayInstance: any = null;

function getRazorpayClient(): any {
    if (razorpayInstance) return razorpayInstance;

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set as Firebase secrets');
    }

    // Dynamic import to avoid top-level require issues
    const Razorpay = require('razorpay');
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return razorpayInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN RECONCILIATION LOGIC
// ─────────────────────────────────────────────────────────────────────────────

export interface ReconciliationResult {
    success: boolean;
    processed: number;
    synced: number;
    errors: number;
    syncDetails?: Array<{ subId: string; field: string; local: string; remote: string }>;
    durationMs: number;
}

export async function reconcileSubscriptions(): Promise<ReconciliationResult> {
    const logger = functions.logger;
    const startTime = Date.now();
    let processed = 0;
    let synced = 0;
    let errors = 0;
    const syncDetails: Array<{ subId: string; field: string; local: string; remote: string }> = [];

    const db = firestoreAdmin;
    const razorpay = getRazorpayClient();

    // 1. Query all subscriptions that should be "alive"
    const snapshot = await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)
        .where('status', 'in', ['active', 'past_due', 'paused'])
        .get();

    if (snapshot.empty) {
        logger.info('[Reconciliation] No active subscriptions to reconcile');
        return {
            success: true,
            processed: 0,
            synced: 0,
            errors: 0,
            durationMs: Date.now() - startTime,
        };
    }

    logger.info(`[Reconciliation] Found ${snapshot.size} subscriptions to check`);

    // 2. For each subscription, fetch from Razorpay and compare
    for (const docSnap of snapshot.docs) {
        const sub = { id: docSnap.id, ...docSnap.data() } as any;
        processed++;

        try {
            const rzpSub = await razorpay.subscriptions.fetch(sub.providerSubscriptionId);
            const updates: Record<string, any> = {};
            const rzpStatus = RAZORPAY_STATUS_MAP[rzpSub.status];

            // 2a. Status mismatch
            if (rzpStatus && rzpStatus !== sub.status) {
                validateTransition(sub.status, rzpStatus, 'reconciliation:status-sync');
                updates.status = rzpStatus;
                syncDetails.push({
                    subId: sub.id,
                    field: 'status',
                    local: sub.status,
                    remote: rzpStatus,
                });
            }

            // 2b. Cycle dates mismatch (only if Razorpay has newer data)
            if (rzpSub.current_start && rzpSub.current_end) {
                const rzpCycleStart = rzpSub.current_start * 1000;
                const rzpCycleEnd = rzpSub.current_end * 1000;
                const localCycleStart = sub.cycleStartDate?.toMillis?.() || 0;
                const localCycleEnd = sub.cycleEndDate?.toMillis?.() || 0;

                // Only sync if Razorpay's cycle is NEWER (start is later)
                if (rzpCycleStart > localCycleStart) {
                    updates.cycleStartDate = Timestamp.fromMillis(rzpCycleStart);
                    updates.cycleEndDate = Timestamp.fromMillis(rzpCycleEnd);
                    syncDetails.push({
                        subId: sub.id,
                        field: 'cycleDates',
                        local: `${new Date(localCycleStart).toISOString()} → ${new Date(localCycleEnd).toISOString()}`,
                        remote: `${new Date(rzpCycleStart).toISOString()} → ${new Date(rzpCycleEnd).toISOString()}`,
                    });
                }
            }

            // 2c. Paid count mismatch
            if (rzpSub.paid_count != null && rzpSub.paid_count !== sub.totalPaymentsMadeCount) {
                updates.totalPaymentsMadeCount = rzpSub.paid_count;
                syncDetails.push({
                    subId: sub.id,
                    field: 'paidCount',
                    local: String(sub.totalPaymentsMadeCount),
                    remote: String(rzpSub.paid_count),
                });
            }

            // 2d. charge_at (renewsOn) mismatch
            if (rzpSub.charge_at) {
                const rzpChargeAt = rzpSub.charge_at * 1000;
                const localRenewsOn = sub.renewsOn?.toMillis?.() || 0;
                if (Math.abs(rzpChargeAt - localRenewsOn) > 86400000) { // >1 day difference
                    updates.renewsOn = Timestamp.fromMillis(rzpChargeAt);
                    syncDetails.push({
                        subId: sub.id,
                        field: 'renewsOn',
                        local: new Date(localRenewsOn).toISOString(),
                        remote: new Date(rzpChargeAt).toISOString(),
                    });
                }
            }

            // 3. Apply updates if any mismatch found
            if (Object.keys(updates).length > 0) {
                updates.lastWebhook = {
                    event: 'reconciliation.sync',
                    timestamp: FieldValue.serverTimestamp(),
                };
                await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(sub.id).update(updates);
                synced++;

                logger.info('[Reconciliation] Subscription synced', {
                    subId: sub.id,
                    updates: Object.keys(updates),
                });
            }
        } catch (subError: any) {
            errors++;
            logger.error('[Reconciliation] Failed to process subscription', {
                subId: sub.id,
                providerSubId: sub.providerSubscriptionId,
                error: subError.message,
            });
        }
    }

    const result: ReconciliationResult = {
        success: true,
        processed,
        synced,
        errors,
        syncDetails: syncDetails.length > 0 ? syncDetails : undefined,
        durationMs: Date.now() - startTime,
    };

    logger.info('[Reconciliation] Completed', {
        processed,
        synced,
        errors,
        durationMs: result.durationMs,
    });

    return result;
}
