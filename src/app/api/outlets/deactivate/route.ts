export const dynamic = 'force-dynamic';
/**
 * POST /api/outlets/deactivate — Deactivate an outlet store
 * Sets store.active = false. Razorpay-managed subscriptions reduce quantity
 * immediately; manual/offline prepaid capacity stays available until expiry.
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §16
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { getActiveSubscriptionForStore, updateSubscription } from "@database/subscriptions/server";
import { admin } from "@lib/firebase/firebaseAdmin";
import {
    getRazorpayManagedSubscriptionId,
    updateRazorpaySubscriptionQuantity,
} from "@lib/billing/subscriptionProviderSync";
import { logger } from "@lib/monitoring/logger";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { revalidateTag } from "next/cache";
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
        const callerStore = callerSnap.data();
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            callerStore,
            [PERMISSIONS.MANAGE_OUTLETS],
            "Outlet deactivation",
            Number(storeId),
            Number(tenantId),
        );
        if (permissionError) return permissionError;
        if (!callerSnap.exists || !callerStore?.isMaster) {
            return NextResponse.json({ error: "Only master can deactivate" }, { status: 403 });
        }

        // Target must be in same tenant and not master. Validate against the
        // canonical store doc before writing because this server route runs
        // with Admin privileges and cannot trust a stale tenant storesList
        // entry as its only tenant boundary.
        const tenantSnap = await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).get();
        const storesList = tenantSnap.data()?.storesList || [];
        const target = storesList.find((s: any) => Number(s.storeId) === Number(outletStoreId));
        if (!target || target.isMaster) {
            return NextResponse.json({ error: "Invalid outlet" }, { status: 400 });
        }
        const targetStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreId}`);
        const targetStoreSnap = await targetStoreRef.get();
        const targetStore = targetStoreSnap.data();
        if (
            !targetStoreSnap.exists
            || Number(targetStore?.tenantId) !== Number(tenantId)
            || targetStore?.isMaster === true
        ) {
            return NextResponse.json({ error: "Invalid outlet" }, { status: 400 });
        }
        if (targetStore?.active === false && target.active === false) {
            return NextResponse.json({ success: true, outletStoreId, alreadyInactive: true, billingReduced: false });
        }

        // Update store, summary, and tenant storesList atomically so location
        // visibility cannot drift if one write fails.
        let activeStoresAfterDeactivation = Math.max(1, storesList.filter((s: any) => (
            Number(s?.storeId) !== Number(outletStoreId) && s?.active !== false
        )).length);
        await db.runTransaction(async (tx) => {
            const [freshTenantSnap, freshTargetSnap] = await Promise.all([
                tx.get(db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`)),
                tx.get(targetStoreRef),
            ]);
            const freshTarget = freshTargetSnap.data();
            if (
                !freshTargetSnap.exists
                || Number(freshTarget?.tenantId) !== Number(tenantId)
                || freshTarget?.isMaster === true
            ) {
                throw new Error("INVALID_OUTLET_TARGET");
            }
            const freshStoresList = freshTenantSnap.data()?.storesList || [];
            const updatedStoresList = freshStoresList.map((s: any) =>
                Number(s.storeId) === Number(outletStoreId) ? { ...s, active: false } : s
            );
            activeStoresAfterDeactivation = Math.max(
                1,
                updatedStoresList.filter((s: any) => s?.active !== false).length,
            );

            tx.update(targetStoreRef, {
                active: false,
                deactivatedAt: now,
            });
            tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`), {
                lastUpdated: now,
                stores: {
                    [outletStoreId]: {
                        active: false,
                        modifiedOn: now,
                    },
                },
            }, { merge: true });
            tx.update(db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`), { storesList: updatedStoresList });
        });

        // Immediate billing removal for Razorpay-managed subscriptions only.
        // Manual/offline prepaid quantity is paid capacity, so deactivation
        // frees a replacement slot without refunding or reducing the license.
        let billingReduced = false;
        if (FEATURE_FLAGS.ENABLE_BILLING_REMOVAL_IMMEDIATE && FEATURE_FLAGS.ENABLE_OUTLET_BILLING) {
            try {
                const sub = await getActiveSubscriptionForStore(tenantId, storeId);
                if (sub && (sub.quantity || 1) > activeStoresAfterDeactivation) {
                    const providerSubId = getRazorpayManagedSubscriptionId(sub);
                    if (providerSubId) {
                        const newQty = activeStoresAfterDeactivation;
                        await updateRazorpaySubscriptionQuantity(providerSubId, newQty);
                        await updateSubscription(sub.id, { quantity: newQty });
                        billingReduced = true;
                    }
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
        revalidateTag(`menu-store-${outletStoreId}`);
        revalidateTag(`store-${outletStoreId}`);
        revalidateTag('client-stores');
        await invalidateOwnerBusinessAssistantPacketCache({
            tId: tenantId,
            sId: outletStoreId,
        });

        return NextResponse.json({ success: true, outletStoreId, deactivatedAt: now, billingReduced });
    } catch (error) {
        if ((error as Error).message === "INVALID_OUTLET_TARGET") {
            return NextResponse.json({ error: "Invalid outlet" }, { status: 400 });
        }
        secureError("[Outlets] Deactivate failed", error as Error, { tenantId, storeId });
        return NextResponse.json({ error: "Deactivation failed" }, { status: 500 });
    }
});
