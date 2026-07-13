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
import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import { getOutletSessionScope, normalizeOutletDocumentId } from "@lib/multiOutlet/outletSessionScope";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import {
    getOutletSlugClaimDocumentId,
    isValidOutletSlugClaimCandidate,
    writeReleasedOutletSlugClaim,
} from "@lib/routing/outletSlugClaim";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";

const schema = z.object({ outletStoreId: z.number().int().positive() });
const OUTLET_ACTION_MAX_BODY_BYTES = 8 * 1024;
const INVALID_OUTLET_TARGET_CODE = "INVALID_OUTLET_TARGET";

class InvalidOutletTargetError extends Error {
    readonly code = INVALID_OUTLET_TARGET_CODE;

    constructor() {
        super(INVALID_OUTLET_TARGET_CODE);
        this.name = "InvalidOutletTargetError";
    }
}

const isInvalidOutletTargetError = (error: unknown): error is InvalidOutletTargetError => (
    error instanceof InvalidOutletTargetError
    || (
        typeof error === "object"
        && error !== null
        && (error as { code?: unknown }).code === INVALID_OUTLET_TARGET_CODE
    )
);

const getOutletDeactivateLogContext = (
    tenantId: string | number,
    storeId: string | number,
    outletStoreId?: string | number,
    extra: Record<string, boolean | number | string | null | undefined> = {},
) => ({
    ...getBoundedMultiOutletStringContext("tenantId", tenantId),
    ...getBoundedMultiOutletStringContext("storeId", storeId),
    ...getBoundedMultiOutletStringContext("outletStoreId", outletStoreId),
    ...extra,
});

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_OUTLET_DEACTIVATE) {
        return NextResponse.json({ error: "Disabled" }, { status: 403 });
    }
    const scope = getOutletSessionScope(session);
    if (!scope) return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;
    if (!verifyTenantAccess(session, tenantId, storeId, request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const tenantRateLimitHash = hashPublicRateLimitValue(tenantDocumentId);
    const rlResult = await checkRateLimit({ key: `outlet-deactivate:${tenantRateLimitHash}`, limit: 10, window: 3600 });
    if (!rlResult.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    let parsedOutletStoreId: number | undefined;
    let parsedOutletStoreDocumentId: string | undefined;

    try {
        const bodyResult = await readBoundedJsonBody(request, OUTLET_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: "Invalid input",
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { outletStoreId } = v.data;
        parsedOutletStoreId = outletStoreId;
        const outletStoreDocumentId = normalizeOutletDocumentId(outletStoreId);
        if (!outletStoreDocumentId) return NextResponse.json({ error: "Invalid outlet" }, { status: 400 });
        parsedOutletStoreDocumentId = outletStoreDocumentId;

        const db = admin.firestore();
        const now = admin.firestore.Timestamp.now();

        // Caller must be master store
        const callerSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${storeDocumentId}`).get();
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
        const tenantSnap = await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`).get();
        const storesList = tenantSnap.data()?.storesList || [];
        const target = storesList.find((s: any) => Number(s.storeId) === Number(outletStoreId));
        if (!target || target.isMaster) {
            return NextResponse.json({ error: "Invalid outlet" }, { status: 400 });
        }
        const targetStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${outletStoreDocumentId}`);
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
                tx.get(db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`)),
                tx.get(targetStoreRef),
            ]);
            const freshTarget = freshTargetSnap.data();
            if (
                !freshTargetSnap.exists
                || Number(freshTarget?.tenantId) !== Number(tenantId)
                || freshTarget?.isMaster === true
            ) {
                throw new InvalidOutletTargetError();
            }
            const freshOutletSlug = typeof freshTarget?.outletSlug === 'string'
                ? freshTarget.outletSlug.toLowerCase()
                : '';
            const outletSlugClaimRef = freshOutletSlug && isValidOutletSlugClaimCandidate(freshOutletSlug)
                ? db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                    .doc(getOutletSlugClaimDocumentId(tenantDocumentId, freshOutletSlug))
                : null;
            const outletSlugClaimSnap = outletSlugClaimRef ? await tx.get(outletSlugClaimRef) : null;
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
                    [outletStoreDocumentId]: {
                        active: false,
                        modifiedOn: now,
                    },
                },
            }, { merge: true });
            if (
                outletSlugClaimRef
                && (!outletSlugClaimSnap?.exists || String(outletSlugClaimSnap.data()?.storeId || '') === outletStoreDocumentId)
            ) {
                writeReleasedOutletSlugClaim(tx, {
                    claimRef: outletSlugClaimRef,
                    outletSlug: freshOutletSlug,
                    storeId: outletStoreDocumentId,
                    tenantId: tenantDocumentId,
                }, now);
            }
            tx.update(db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`), { storesList: updatedStoresList });
        });

        // Immediate billing removal for Razorpay-managed subscriptions only.
        // Manual/offline prepaid quantity is paid capacity, so deactivation
        // frees a replacement slot without refunding or reducing the license.
        let billingReduced = false;
        if (FEATURE_FLAGS.ENABLE_BILLING_REMOVAL_IMMEDIATE && FEATURE_FLAGS.ENABLE_OUTLET_BILLING) {
            try {
                const sub = await getActiveSubscriptionForStore(tenantId as number, storeId as number);
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
                logMultiOutletFailure(
                    "multi_outlet_billing_reduction_failed",
                    billingErr,
                    getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, outletStoreDocumentId, {
                        activeStoresAfterDeactivation,
                    }),
                );
            }
        }

        // Security Audit: Log outlet deactivation
        logger.security('Outlet Deactivated', {
            action: 'DEACTIVATE_OUTLET',
            ...getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, outletStoreDocumentId, {
                activeStoresAfterDeactivation,
                billingReduced,
            }),
        }, 'medium');
        revalidateTag(`menu-store-${outletStoreDocumentId}`);
        revalidateTag(`store-${outletStoreDocumentId}`);
        revalidateTag('client-stores');
        revalidateTag('screen-data');
        await touchDigitalScreenContentVersionForStoreServer(outletStoreDocumentId, 'outletDeactivate');
        await invalidateOwnerBusinessAssistantPacketCache({
            tId: tenantDocumentId,
            sId: outletStoreDocumentId,
        });

        return NextResponse.json({ success: true, outletStoreId, deactivatedAt: now, billingReduced });
    } catch (error) {
        if (isInvalidOutletTargetError(error)) {
            return NextResponse.json({ error: "Invalid outlet" }, { status: 400 });
        }
        logMultiOutletFailure(
            "multi_outlet_deactivate_failed",
            error,
            getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, parsedOutletStoreDocumentId || parsedOutletStoreId),
        );
        return NextResponse.json({ error: "Deactivation failed" }, { status: 500 });
    }
});
