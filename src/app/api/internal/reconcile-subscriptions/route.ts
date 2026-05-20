export const dynamic = 'force-dynamic';
import { getCollectionRef, updateSubscription } from "@database/subscriptions/server";
import {
    getActivePlanTypeForSubscription,
    isSubscriptionEntitlementSynced,
    safeSyncStorePlanEntitlementFromSubscription,
} from "@lib/billing/subscriptionEntitlementSync";
import {
    fetchRazorpaySubscription,
    getRazorpayManagedSubscriptionId,
} from "@lib/billing/subscriptionProviderSync";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { PaymentStatus } from "@type/razorpay";
import { writeLogEntry } from "logs/utils";
import { NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ DEPRECATED — Migrated to Firebase Functions
// ─────────────────────────────────────────────────────────────────────────────
// This route has been replaced by:
//   functions/src/billing/reconcileSubscriptions.ts
// Called from the nightly scheduler in:
//   functions/src/decisionBlocksScoring.ts (2:30 AM UTC)
//
// The Vercel cron has been removed from vercel.json.
// This file is kept temporarily for reference and will be deleted.
// ─────────────────────────────────────────────────────────────────────────────

const LOG_FILE = "razorpay-subscription.log";

// Map Razorpay API status → our internal PaymentStatus
const RAZORPAY_STATUS_MAP: Record<string, PaymentStatus> = {
    active: "active",
    pending: "past_due",
    halted: "past_due",
    paused: "paused",
    cancelled: "cancelled",
    completed: "completed",
    expired: "expired",
};

export async function GET(request: Request) {
    // 1. Verify CRON_SECRET — only Vercel Cron or manual trigger with secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        logger.warn("Reconciliation: unauthorized access attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const startTime = Date.now();
    let processed = 0;
    let synced = 0;
    let errors = 0;
    const syncDetails: Array<{ subId: string; field: string; local: string; remote: string }> = [];

    try {
        // 2. Query all subscriptions that should be "alive" in our system
        const snapshot = await getCollectionRef()
            .where("status", "in", ["active", "past_due", "paused"])
            .get();

        if (snapshot.empty) {
            return NextResponse.json({
                success: true,
                message: "No active subscriptions to reconcile",
                processed: 0,
                synced: 0,
                durationMs: Date.now() - startTime,
            });
        }

        // 3. For each subscription, fetch from Razorpay and compare
        for (const docSnap of snapshot.docs) {
            const sub = { id: docSnap.id, ...docSnap.data() } as any;
            processed++;

            try {
                const providerSubId = getRazorpayManagedSubscriptionId(sub);
                if (!providerSubId) {
                    continue;
                }

                const rzpSub = await fetchRazorpaySubscription(providerSubId);
                const updates: Record<string, any> = {};
                const rzpStatus = RAZORPAY_STATUS_MAP[rzpSub.status];

                // 3a. Status mismatch
                if (rzpStatus && rzpStatus !== sub.status && validateTransition(sub.status, rzpStatus, `reconciliation:status-sync`)) {
                    updates.status = rzpStatus;
                    syncDetails.push({
                        subId: sub.id,
                        field: "status",
                        local: sub.status,
                        remote: rzpStatus,
                    });
                }

                // 3b. Cycle dates mismatch (only if Razorpay has newer data)
                if (rzpSub.current_start && rzpSub.current_end) {
                    const rzpCycleStart = rzpSub.current_start * 1000;
                    const rzpCycleEnd = rzpSub.current_end * 1000;
                    const localCycleStart = sub.cycleStartDate?.toMillis?.() || 0;
                    const localCycleEnd = sub.cycleEndDate?.toMillis?.() || 0;

                    // Only sync if Razorpay's cycle is NEWER (start is later)
                    if (rzpCycleStart > localCycleStart) {
                        updates.cycleStartDate = admin.firestore.Timestamp.fromMillis(rzpCycleStart);
                        updates.cycleEndDate = admin.firestore.Timestamp.fromMillis(rzpCycleEnd);
                        syncDetails.push({
                            subId: sub.id,
                            field: "cycleDates",
                            local: `${new Date(localCycleStart).toISOString()} → ${new Date(localCycleEnd).toISOString()}`,
                            remote: `${new Date(rzpCycleStart).toISOString()} → ${new Date(rzpCycleEnd).toISOString()}`,
                        });
                    }
                }

                // 3c. Paid count mismatch
                if (rzpSub.paid_count != null && rzpSub.paid_count !== sub.totalPaymentsMadeCount) {
                    updates.totalPaymentsMadeCount = rzpSub.paid_count;
                    syncDetails.push({
                        subId: sub.id,
                        field: "paidCount",
                        local: String(sub.totalPaymentsMadeCount),
                        remote: String(rzpSub.paid_count),
                    });
                }

                // 3d. charge_at (renewsOn) mismatch
                if (rzpSub.charge_at) {
                    const rzpChargeAt = rzpSub.charge_at * 1000;
                    const localRenewsOn = sub.renewsOn?.toMillis?.() || 0;
                    if (Math.abs(rzpChargeAt - localRenewsOn) > 86400000) { // >1 day difference
                        updates.renewsOn = admin.firestore.Timestamp.fromMillis(rzpChargeAt);
                        syncDetails.push({
                            subId: sub.id,
                            field: "renewsOn",
                            local: new Date(localRenewsOn).toISOString(),
                            remote: new Date(rzpChargeAt).toISOString(),
                        });
                    }
                }

                // 4. Apply updates if any mismatch found
                if (Object.keys(updates).length > 0) {
                    updates.lastWebhook = {
                        event: "reconciliation.sync",
                        timestamp: admin.firestore.Timestamp.now(),
                    };
                    await updateSubscription(sub.id, updates);
                    synced++;

                    logger.info("Reconciliation: subscription synced", {
                        subId: sub.id,
                        updates: Object.keys(updates),
                    });
                }

                const finalStatus = updates.status || sub.status;
                const desiredActivePlanType = getActivePlanTypeForSubscription({
                    ...sub,
                    status: finalStatus,
                });
                if (!isSubscriptionEntitlementSynced(sub, desiredActivePlanType) || finalStatus !== sub.status) {
                    await safeSyncStorePlanEntitlementFromSubscription(
                        { ...sub, status: finalStatus },
                        'api:internal-reconcile-subscriptions',
                    );
                }
            } catch (subError) {
                errors++;
                logger.error("Reconciliation: failed to process subscription", subError, {
                    subId: sub.id,
                    providerSubId: sub.providerSubscriptionId,
                });
            }
        }

        const result = {
            success: true,
            processed,
            synced,
            errors,
            syncDetails: syncDetails.length > 0 ? syncDetails : undefined,
            durationMs: Date.now() - startTime,
        };

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: "RECONCILIATION_COMPLETE",
            data: result,
        });

        logger.info("Reconciliation completed", {
            processed,
            synced,
            errors,
            durationMs: Date.now() - startTime,
        });

        return NextResponse.json(result);
    } catch (error) {
        logger.error("Reconciliation job failed", error, {
            api: "reconcile-subscriptions",
        });
        return NextResponse.json(
            { error: "Reconciliation failed" },
            { status: 500 }
        );
    }
}
