export const dynamic = 'force-dynamic';
/**
 * POST /api/outlets/deactivate — Deactivate an outlet store
 * Sets store.active = false. Razorpay-managed subscriptions reduce quantity
 * immediately; manual/offline prepaid capacity stays available until expiry.
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §16
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { getActiveSubscriptionForStore, updateSubscription } from "@database/subscriptions/server";
import { admin } from "@lib/firebase/firebaseAdmin";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import {
    getRazorpayManagedSubscriptionId,
    isRazorpayQuantityUpdateUnsupported,
    updateRazorpaySubscriptionQuantity,
} from "@lib/billing/subscriptionProviderSync";
import { logger } from "@lib/monitoring/logger";
import { getBoundedMultiOutletStringContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import { getOutletSessionScope, normalizeOutletDocumentId } from "@lib/multiOutlet/outletSessionScope";
import { isMultiOutletTenantStoreListEntryInScope } from "@lib/multiOutlet/projectIdBoundary";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
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
const OUTLET_DEACTIVATE_EFFECT_CHUNK_SIZE = 1;
const INVALID_OUTLET_TARGET_CODE = "INVALID_OUTLET_TARGET";
const OUTLET_DEACTIVATE_SCOPE_CHANGED_CODE = "OUTLET_DEACTIVATE_SCOPE_CHANGED";

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

class OutletDeactivateScopeChangedError extends Error {
    readonly code = OUTLET_DEACTIVATE_SCOPE_CHANGED_CODE;

    constructor() {
        super(OUTLET_DEACTIVATE_SCOPE_CHANGED_CODE);
        this.name = "OutletDeactivateScopeChangedError";
    }
}

const isOutletDeactivateScopeChangedError = (error: unknown): error is OutletDeactivateScopeChangedError => (
    error instanceof OutletDeactivateScopeChangedError
    || (
        typeof error === "object"
        && error !== null
        && (error as { code?: unknown }).code === OUTLET_DEACTIVATE_SCOPE_CHANGED_CODE
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
        const callerStoreRef = db.doc(`${DB_COLLECTIONS.STORES}/${storeDocumentId}`);
        const callerSnap = await callerStoreRef.get();
        const callerStore = callerSnap.data();
        const permissionError = await requireAnyStorePermissionForStoreData(
            request,
            session,
            callerStore,
            [PERMISSIONS.MANAGE_OUTLETS],
            "Outlet deactivation",
            Number(storeId),
            Number(tenantId),
        );
        if (permissionError) return permissionError;
        if (
            !callerSnap.exists
            || !callerStore?.isMaster
            || Number(callerStore?.tenantId) !== Number(tenantId)
            || callerStore?.active === false
            || callerStore?.deleted === true
            || isPlatformEntityBlocked(callerStore)
        ) {
            return NextResponse.json({ error: "Only master can deactivate" }, { status: 403 });
        }

        // Target must be in same tenant and not master. Validate against the
        // canonical store doc before writing because this server route runs
        // with Admin privileges and cannot trust a stale tenant storesList
        // entry as its only tenant boundary.
        const tenantSnap = await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`).get();
        const tenant = tenantSnap.data();
        if (
            !tenantSnap.exists
            || tenant?.active === false
            || tenant?.deleted === true
            || isPlatformEntityBlocked(tenant)
        ) {
            return NextResponse.json({ error: "Account not available" }, { status: 403 });
        }
        const storesList = Array.isArray(tenant?.storesList) ? tenant.storesList : [];
        const target = storesList.find((store: unknown) => (
            isMultiOutletTenantStoreListEntryInScope(store, {
                allowInactive: true,
                storeId: Number(outletStoreId),
            })
        ));
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
        // Update store, summary, and tenant storesList atomically so location
        // visibility cannot drift if one write fails.
        let alreadyInactive = false;
        let activeStoresAfterDeactivation = Math.max(1, storesList.filter((store: unknown) => (
            isMultiOutletTenantStoreListEntryInScope(store, {})
            && !isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(outletStoreId) })
        )).length);
        await db.runTransaction(async (tx) => {
            const [freshCallerSnap, freshTenantSnap, freshTargetSnap] = await Promise.all([
                tx.get(callerStoreRef),
                tx.get(db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`)),
                tx.get(targetStoreRef),
            ]);
            const freshCaller = freshCallerSnap.data();
            const freshTarget = freshTargetSnap.data();
            if (
                !freshCallerSnap.exists
                || Number(freshCaller?.tenantId) !== Number(tenantId)
                || freshCaller?.isMaster !== true
                || freshCaller?.active === false
                || freshCaller?.deleted === true
                || isPlatformEntityBlocked(freshCaller)
                || !freshTenantSnap.exists
                || freshTenantSnap.data()?.active === false
                || freshTenantSnap.data()?.deleted === true
                || isPlatformEntityBlocked(freshTenantSnap.data())
            ) {
                throw new OutletDeactivateScopeChangedError();
            }
            const freshPermissionError = await requireAnyStorePermissionForStoreData(
                request,
                session,
                freshCaller,
                [PERMISSIONS.MANAGE_OUTLETS],
                "Outlet deactivation",
                Number(storeId),
                Number(tenantId),
            );
            if (freshPermissionError) throw new OutletDeactivateScopeChangedError();
            if (
                !freshTargetSnap.exists
                || Number(freshTarget?.tenantId) !== Number(tenantId)
                || freshTarget?.isMaster === true
                || freshTarget?.deleted === true
                || isPlatformEntityBlocked(freshTarget)
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
            const freshStoresList = Array.isArray(freshTenantSnap.data()?.storesList)
                ? freshTenantSnap.data()?.storesList
                : [];
            const freshTargetSummary = freshStoresList.find((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, {
                    allowInactive: true,
                    storeId: Number(outletStoreId),
                })
            ));
            const freshCallerSummary = freshStoresList.find((store: unknown) => (
                isMultiOutletTenantStoreListEntryInScope(store, { storeId: Number(storeId) })
            ));
            if (
                !freshCallerSummary
                || freshCallerSummary.isMaster !== true
                || freshCallerSummary.active === false
            ) {
                throw new OutletDeactivateScopeChangedError();
            }
            if (!freshTargetSummary || freshTargetSummary.isMaster === true) {
                throw new InvalidOutletTargetError();
            }
            const updatedStoresList = freshStoresList.map((store: unknown) =>
                isMultiOutletTenantStoreListEntryInScope(store, {
                    allowInactive: true,
                    storeId: Number(outletStoreId),
                })
                    ? { ...store, active: false }
                    : store
            );
            activeStoresAfterDeactivation = Math.max(
                1,
                updatedStoresList.filter((store: unknown) => (
                    isMultiOutletTenantStoreListEntryInScope(store, {})
                )).length,
            );

            alreadyInactive = freshTarget?.active === false && freshTargetSummary.active === false;
            if (alreadyInactive) return;

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
        let billingReductionPending = false;
        let billingActionRequired: "CONTACT_SUPPORT" | null = null;
        if (FEATURE_FLAGS.ENABLE_BILLING_REMOVAL_IMMEDIATE && FEATURE_FLAGS.ENABLE_OUTLET_BILLING) {
            try {
                const sub = await getActiveSubscriptionForStore(tenantId as number, storeId as number);
                if (sub && (sub.quantity || 1) > activeStoresAfterDeactivation) {
                    const providerSubId = getRazorpayManagedSubscriptionId(sub);
                    if (providerSubId && sub.id) {
                        const newQty = activeStoresAfterDeactivation;
                        await updateRazorpaySubscriptionQuantity(providerSubId, newQty);
                        await updateSubscription(sub.id, { quantity: newQty });
                        billingReduced = true;
                    } else if (sub.billingMode !== "manual") {
                        billingReductionPending = true;
                        billingActionRequired = "CONTACT_SUPPORT";
                    }
                }
            } catch (billingErr) {
                // Store truth remains committed. Surface the billing follow-up
                // instead of silently implying that the provider was reduced.
                billingReductionPending = true;
                billingActionRequired = "CONTACT_SUPPORT";
                logMultiOutletFailure(
                    "multi_outlet_billing_reduction_failed",
                    billingErr,
                    getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, outletStoreDocumentId, {
                        activeStoresAfterDeactivation,
                        quantityUpdateUnsupported: isRazorpayQuantityUpdateUnsupported(billingErr),
                    }),
                );
            }
        }

        // Security Audit: Log outlet deactivation
        logger.security('Outlet Deactivated', {
            action: 'DEACTIVATE_OUTLET',
            ...getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, outletStoreDocumentId, {
                activeStoresAfterDeactivation,
                alreadyInactive,
                billingReductionPending,
                billingReduced,
            }),
        }, 'medium');
        const postCommit = alreadyInactive
            ? { effectsPending: false, failedEffectCount: 0, firstError: undefined }
            : await runStorePublicTruthPostCommitEffects({
                chunkSize: OUTLET_DEACTIVATE_EFFECT_CHUNK_SIZE,
                storeIds: [outletStoreDocumentId],
                tenantId: tenantDocumentId,
                deps: {
                    invalidateAssistant: (effectStoreId, effectTenantId) => (
                        invalidateOwnerBusinessAssistantPacketCache({ tId: effectTenantId, sId: effectStoreId })
                    ),
                    revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                    touchScreen: (effectStoreId) => (
                        touchDigitalScreenContentVersionForStoreServer(effectStoreId, 'outletDeactivate')
                    ),
                },
            });
        if (postCommit.effectsPending) {
            logMultiOutletFailure('multi_outlet_deactivate_post_commit_effect_failed', postCommit.firstError, {
                ...getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, outletStoreDocumentId),
                failedEffectCount: postCommit.failedEffectCount,
            });
        }

        return NextResponse.json({
            success: true,
            outletStoreId,
            alreadyInactive,
            deactivatedAt: now,
            billingReduced,
            billingReductionPending,
            billingActionRequired,
            effectsPending: postCommit.effectsPending,
            failedEffectCount: postCommit.failedEffectCount,
        });
    } catch (error) {
        if (isInvalidOutletTargetError(error)) {
            return NextResponse.json({ error: "Invalid outlet" }, { status: 400 });
        }
        if (isOutletDeactivateScopeChangedError(error)) {
            return NextResponse.json({ error: "Outlet setup changed. Refresh and try again." }, { status: 409 });
        }
        logMultiOutletFailure(
            "multi_outlet_deactivate_failed",
            error,
            getOutletDeactivateLogContext(tenantDocumentId, storeDocumentId, parsedOutletStoreDocumentId || parsedOutletStoreId),
        );
        return NextResponse.json({ error: "Deactivation failed" }, { status: 500 });
    }
});
