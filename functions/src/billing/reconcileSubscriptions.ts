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
import { revalidatePublicClientCacheForStore } from '../logic/publicCacheRevalidation';
import { invalidateOwnerBusinessAssistantContextPackets } from '../ownerBusinessAssistant/contextPacketCacheInvalidation';

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

const BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED =
    'BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED';

function getReconciliationStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
}

function getReconciliationErrorContext(error: unknown): Record<string, string> {
    if (error instanceof Error) {
        const record = error as Error & { code?: unknown; status?: unknown; statusCode?: unknown };
        const status = record.status ?? record.statusCode;

        return {
            sourceErrorName: (error.name || 'Error').slice(0, 80),
            ...(record.code === undefined || record.code === null ? {} : {
                sourceErrorCode: String(record.code).slice(0, 64),
            }),
            ...(status === undefined || status === null ? {} : {
                sourceErrorStatus: String(status).slice(0, 32),
            }),
        };
    }

    return {
        sourceErrorName: typeof error,
    };
}

function getReconciliationSubscriptionLogContext(
    sub: Record<string, any>,
    providerSubId?: string | null,
): Record<string, boolean | number> {
    return {
        ...getReconciliationStringContext('subscriptionId', sub?.id),
        ...getReconciliationStringContext('providerSubscriptionId', providerSubId || sub?.providerSubscriptionId),
        ...getReconciliationStringContext('tenantId', sub?.tenantId ?? sub?.tId),
        ...getReconciliationStringContext('storeId', sub?.storeId ?? sub?.sId),
        ...getReconciliationStringContext('status', sub?.status),
        ...getReconciliationStringContext('activePlanType', sub?.activePlanType),
        hasAnalyticsEntitlement: Boolean(sub?.analyticsEntitlement),
    };
}

function getReconciliationUpdateLogContext(updates: Record<string, any>): Record<string, boolean | number> {
    const updateKeys = Object.keys(updates);
    return {
        updateFieldCount: updateKeys.length,
        hasStatusUpdate: updateKeys.includes('status'),
        hasCycleStartUpdate: updateKeys.includes('cycleStartDate'),
        hasCycleEndUpdate: updateKeys.includes('cycleEndDate'),
        hasPaidCountUpdate: updateKeys.includes('totalPaymentsMadeCount'),
        hasRenewsOnUpdate: updateKeys.includes('renewsOn'),
    };
}

function normalizePlanId(planId: unknown): string | null {
    const normalized = String(planId || '').trim().toLowerCase();
    return normalized || null;
}

function getActivePlanTypeForSubscription(sub: Record<string, any>, status: PaymentStatus): string | null {
    if (status !== 'active') return null;
    return normalizePlanId(sub.planId);
}

async function syncStorePlanEntitlement(
    db: FirebaseFirestore.Firestore,
    sub: Record<string, any>,
    activePlanType: string | null,
    source: string,
): Promise<void> {
    const storeId = String(sub.storeId || '').trim();
    if (!storeId) return;

    const entitlementValue = activePlanType || FieldValue.delete();
    const syncedAt = FieldValue.serverTimestamp();

    await Promise.all([
        db.collection(DB_COLLECTIONS.STORES).doc(storeId).set({
            activePlanType: entitlementValue,
            analyticsEntitlementUpdatedAt: syncedAt,
        }, { merge: true }),
        db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc('storesSummary').set({
            lastUpdated: syncedAt,
            stores: {
                [storeId]: {
                    activePlanType: entitlementValue,
                },
            },
        }, { merge: true }),
        db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(sub.id).set({
            analyticsEntitlement: {
                activePlanType,
                status: sub.status || null,
                syncedAt,
                source,
            },
        }, { merge: true }),
    ]);

    await Promise.all([
        revalidatePublicClientCacheForStore(storeId, source, {
            touchDigitalScreen: true,
        }),
        invalidateOwnerBusinessAssistantContextPackets({
            tId: sub.tenantId ?? sub.tId,
            sId: storeId,
        }),
    ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE MACHINE (mirrors src/lib/billing/subscriptionStateMachine.ts)
// ─────────────────────────────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<string, PaymentStatus[]> = {
    pending: ['active', 'past_due', 'cancelled'],
    active: ['past_due', 'paused', 'cancelled', 'completed', 'expired'],
    past_due: ['active', 'cancelled', 'expired'],
    paused: ['active', 'cancelled', 'expired'],
    cancelled: ['expired'],
    expired: [],
    completed: [],
};

function getTransitionLogContext(
    from: string,
    to: string,
    context: string,
    allowedTransitions: PaymentStatus[] = [],
): Record<string, boolean | number> {
    return {
        ...getReconciliationStringContext('fromStatus', from),
        ...getReconciliationStringContext('toStatus', to),
        ...getReconciliationStringContext('transitionContext', context),
        allowedTransitionCount: allowedTransitions.length,
    };
}

function validateTransition(from: string, to: string, context: string): boolean {
    if (from === to) return true;
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed) {
        functions.logger.warn(
            '[Reconciliation] Unknown subscription state transition',
            getTransitionLogContext(from, to, context),
        );
        return false;
    }
    const isValid = allowed.includes(to as PaymentStatus);
    if (!isValid) {
        functions.logger.warn(
            '[Reconciliation] Invalid subscription state transition',
            getTransitionLogContext(from, to, context, allowed),
        );
    }
    return isValid;
}

const RAZORPAY_SUBSCRIPTION_ID_PATTERN = /^sub_[A-Za-z0-9]+$/;

function getRazorpayManagedSubscriptionId(sub: Record<string, any>): string | null {
    const providerSubscriptionId = String(sub.providerSubscriptionId || '').trim();
    if (sub.paymentProvider && sub.paymentProvider !== 'razorpay') return null;
    if (sub.billingMode === 'manual') return null;
    if (!RAZORPAY_SUBSCRIPTION_ID_PATTERN.test(providerSubscriptionId)) return null;
    return providerSubscriptionId;
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
        let providerSubId: string | null = null;

        try {
            providerSubId = getRazorpayManagedSubscriptionId(sub);
            if (!providerSubId) {
                continue;
            }

            const razorpay = getRazorpayClient();
            const rzpSub = await razorpay.subscriptions.fetch(providerSubId);
            const updates: Record<string, any> = {};
            const rzpStatus = RAZORPAY_STATUS_MAP[rzpSub.status];

            // 2a. Status mismatch
            if (rzpStatus && rzpStatus !== sub.status && validateTransition(sub.status, rzpStatus, 'reconciliation:status-sync')) {
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

            const finalStatus = (updates.status || sub.status) as PaymentStatus;
            const desiredActivePlanType = getActivePlanTypeForSubscription(sub, finalStatus);
            const syncedActivePlanType = sub.analyticsEntitlement?.activePlanType ?? null;
            const shouldSyncEntitlement = syncedActivePlanType !== desiredActivePlanType
                || (updates.status && updates.status !== sub.status);

            // 3. Apply updates if any mismatch found
            if (Object.keys(updates).length > 0) {
                updates.lastWebhook = {
                    event: 'reconciliation.sync',
                    timestamp: FieldValue.serverTimestamp(),
                };
                await db.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(sub.id).update(updates);
                synced++;

                logger.info('[Reconciliation] Subscription synced', {
                    ...getReconciliationSubscriptionLogContext(sub, providerSubId),
                    ...getReconciliationUpdateLogContext(updates),
                });
            }

            if (shouldSyncEntitlement) {
                await syncStorePlanEntitlement(
                    db,
                    { ...sub, status: finalStatus },
                    desiredActivePlanType,
                    'reconciliation:subscription-entitlement',
                );
                synced++;
                syncDetails.push({
                    subId: sub.id,
                    field: 'analyticsEntitlement',
                    local: String(syncedActivePlanType),
                    remote: String(desiredActivePlanType),
                });
            }
        } catch (subError: any) {
            errors++;
            logger.error('[Reconciliation] Failed to process subscription', {
                failureCode: BILLING_SUBSCRIPTION_RECONCILIATION_SUBSCRIPTION_FAILED,
                ...getReconciliationSubscriptionLogContext(sub, providerSubId),
                ...getReconciliationErrorContext(subError),
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
