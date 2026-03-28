export const dynamic = 'force-dynamic';
/**
 * POST /api/outlets/deactivate — Deactivate an outlet store
 * Sets store.active = false, schedules billing removal for next cycle.
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §16
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { getActiveSubscriptionForStore, updateSubscription } from "@database/subscriptions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const schema = z.object({ outletStoreId: z.number().int().positive() });

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_OUTLET_DEACTIVATE) {
        return NextResponse.json({ error: "Disabled" }, { status: 403 });
    }
    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    if (!verifyTenantAccess(session, tenantId, storeId, request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const rlResult = await checkRateLimit({ key: `outlet-deactivate:${tenantId}`, limit: 10, window: 3600 });
    if (!rlResult.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    try {
        const body = await request.json();
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { outletStoreId } = v.data;

        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        // Caller must be master store
        const callerSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${storeId}`).get();
        if (!callerSnap.exists || !callerSnap.data()?.isMaster) {
            return NextResponse.json({ error: "Only master can deactivate" }, { status: 403 });
        }

        // Target must be in same tenant and not master
        const tenantSnap = await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).get();
        const storesList = tenantSnap.data()?.storesList || [];
        const target = storesList.find((s: any) => s.storeId === outletStoreId);
        if (!target || target.isMaster) {
            return NextResponse.json({ error: "Invalid outlet" }, { status: 400 });
        }

        // Deactivate store
        await db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreId}`).update({
            active: false,
            deactivatedAt: now,
        });

        // Update storesSummary
        await db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`).set({
            [`stores.${outletStoreId}.active`]: false,
        }, { merge: true });

        // Update tenant storesList to reflect deactivation
        const updatedStoresList = storesList.map((s: any) =>
            s.storeId === outletStoreId ? { ...s, active: false } : s
        );
        await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).update({ storesList: updatedStoresList });

        // Immediate billing removal: reduce Razorpay quantity now
        // Razorpay prorates refunds automatically for mid-cycle changes
        let billingReduced = false;
        if (FEATURE_FLAGS.ENABLE_BILLING_REMOVAL_IMMEDIATE && FEATURE_FLAGS.ENABLE_OUTLET_BILLING) {
            try {
                const sub = await getActiveSubscriptionForStore(tenantId, storeId);
                if (sub && sub.providerSubscriptionId && (sub.quantity || 1) > 1) {
                    const newQty = (sub.quantity || 1) - 1;
                    await razorpayClient.subscriptions.update(sub.providerSubscriptionId, {
                        quantity: newQty,
                    });
                    await updateSubscription(sub.id, { quantity: newQty });
                    billingReduced = true;
                }
            } catch (billingErr) {
                // Log but don't fail deactivation — billing can be reconciled later
                secureError("[Outlets] Billing reduction failed (non-blocking)", billingErr as Error, {
                    tenantId, outletStoreId,
                });
            }
        }

        // Security Audit: Log outlet deactivation
        logger.security('Outlet Deactivated', {
            action: 'DEACTIVATE_OUTLET',
            tenantId,
            masterStoreId: storeId,
            outletStoreId,
            billingReduced,
        }, 'medium');

        return NextResponse.json({ success: true, outletStoreId, deactivatedAt: now, billingReduced });
    } catch (error) {
        secureError("[Outlets] Deactivate failed", error as Error, { tenantId, storeId });
        return NextResponse.json({ error: "Deactivation failed" }, { status: 500 });
    }
});
