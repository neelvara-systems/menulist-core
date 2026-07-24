export const dynamic = 'force-dynamic';

/**
 * POST /api/outlets/policy — update chain-wide outlet policy.
 *
 * Server-owned because outlet policy controls chain permissions and may need
 * one-time legacy master-store repair for pre-multi-location accounts.
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { normalizeStoreSummaryNumericDocumentId } from "@data/shared/storeSummaryBoundary";
import { admin } from "@lib/firebase/firebaseAdmin";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import {
    getBoundedMultiOutletStringContext,
    logMultiOutletFailure,
    type MultiOutletLogContext,
} from "@lib/multiOutlet/diagnostics";
import { getOutletSessionScope } from "@lib/multiOutlet/outletSessionScope";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { DEFAULT_OUTLET_POLICY } from "@type/multiOutlet.types";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";

const outletPolicySchema = z.object({
    priceOverride: z.boolean().optional(),
    availabilityOverride: z.boolean().optional(),
    descriptionOverride: z.boolean().optional(),
    imageOverride: z.boolean().optional(),
    allowLocalItems: z.boolean().optional(),
    allowLocalCategories: z.boolean().optional(),
    allowLocalProjects: z.boolean().optional(),
    allowProjectDeactivate: z.boolean().optional(),
    canUseMenuExtraction: z.boolean().optional(),
    canGenerateDescriptions: z.boolean().optional(),
    canGenerateImages: z.boolean().optional(),
    canOverrideTheme: z.boolean().optional(),
    canOverrideBrandIdentity: z.boolean().optional(),
    canOverrideLayout: z.boolean().optional(),
    canAddLanguages: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
    message: "At least one policy flag is required",
});

const schema = z.object({
    policy: outletPolicySchema,
});
const OUTLET_POLICY_MAX_BODY_BYTES = 8 * 1024;
const OUTLET_POLICY_EFFECT_CHUNK_SIZE = 1;
const OUTLET_POLICY_SCOPE_CHANGED_CODE = "OUTLET_POLICY_SCOPE_CHANGED";

class OutletPolicyScopeChangedError extends Error {
    readonly code = OUTLET_POLICY_SCOPE_CHANGED_CODE;

    constructor() {
        super(OUTLET_POLICY_SCOPE_CHANGED_CODE);
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = "OutletPolicyScopeChangedError";
    }
}

const isOutletPolicyScopeChangedError = (error: unknown): error is OutletPolicyScopeChangedError => (
    error instanceof OutletPolicyScopeChangedError
    || (
        Boolean(error)
        && typeof error === "object"
        && (error as { code?: unknown }).code === OUTLET_POLICY_SCOPE_CHANGED_CODE
    )
);

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }

    const scope = getOutletSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    const { tenantId, storeId, tenantDocumentId, storeDocumentId } = scope;
    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const failureContext: MultiOutletLogContext = {
        endpoint: "/api/outlets/policy",
        ...getBoundedMultiOutletStringContext("tenantId", tenantDocumentId),
        ...getBoundedMultiOutletStringContext("storeId", storeDocumentId),
        ...getBoundedMultiOutletStringContext("userId", session.uId || session.user?.id),
    };

    const tenantRateLimitHash = hashPublicRateLimitValue(tenantDocumentId);
    const rlResult = await checkRateLimit({ key: `outlet-policy:${tenantRateLimitHash}`, limit: 30, window: 3600 });
    if (!rlResult.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const bodyResult = await readBoundedJsonBody(request, OUTLET_POLICY_MAX_BODY_BYTES, {
            invalidJsonMessage: "Invalid input",
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const v = validateAPIInput(schema, body);
        if (!v.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const db = admin.firestore();
        const storeRef = db.doc(`${DB_COLLECTIONS.STORES}/${storeDocumentId}`);
        const tenantRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantDocumentId}`);
        const storeSnap = await storeRef.get();

        if (!storeSnap.exists) {
            return NextResponse.json({ error: "Store not found" }, { status: 404 });
        }

        const storeData = storeSnap.data()!;
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            storeData,
            [PERMISSIONS.MANAGE_OUTLETS],
            "Outlet policy",
            Number(storeId),
            Number(tenantId),
        );
        if (permissionError) return permissionError;

        const now = admin.firestore.Timestamp.now();
        const policyResult = await db.runTransaction(async (tx) => {
            const [freshStoreSnap, freshTenantSnap] = await Promise.all([
                tx.get(storeRef),
                tx.get(tenantRef),
            ]);
            const freshStore = freshStoreSnap.exists ? freshStoreSnap.data() || {} : {};
            if (
                !freshStoreSnap.exists
                || !freshTenantSnap.exists
                || normalizeStoreSummaryNumericDocumentId(freshStore.tenantId ?? freshStore.tId) !== tenantDocumentId
                || freshStore.active === false
                || freshStore.deleted === true
                || isPlatformEntityBlocked(freshStore)
                || freshTenantSnap.data()?.active === false
                || freshTenantSnap.data()?.deleted === true
                || isPlatformEntityBlocked(freshTenantSnap.data())
            ) {
                throw new OutletPolicyScopeChangedError();
            }
            const freshPermissionError = requireAnyStorePermissionForStoreData(
                request,
                session,
                freshStore,
                [PERMISSIONS.MANAGE_OUTLETS],
                "Outlet policy",
                Number(storeId),
                Number(tenantId),
            );
            if (freshPermissionError) throw new OutletPolicyScopeChangedError();
            const storesList = Array.isArray(freshTenantSnap.data()?.storesList)
                ? freshTenantSnap.data()?.storesList
                : [];
            const currentStoreSummary = storesList.find((store: any) => (
                Number(store?.storeId) === Number(storeId)
            ));
            const hasMasterStore = storesList.some((store: any) => store?.isMaster === true);
            const masterListRepairNeeded = freshStore.isMaster === true && !hasMasterStore;
            const masterPromoted = (
                freshStore.isMaster !== true
                && !hasMasterStore
                && storesList.length === 1
                && Number(storesList[0]?.storeId) === Number(storeId)
            );
            if (freshStore.isMaster !== true && !masterPromoted) {
                throw new OutletPolicyScopeChangedError();
            }
            if (
                !currentStoreSummary
                || currentStoreSummary.active === false
                || (
                    hasMasterStore
                    && freshStore.isMaster === true
                    && currentStoreSummary.isMaster !== true
                )
            ) {
                throw new OutletPolicyScopeChangedError();
            }
            const mergedPolicy = {
                ...(freshStore.outletPolicy || DEFAULT_OUTLET_POLICY),
                ...v.data.policy,
            };
            const shouldMarkCurrentStoreAsMasterInTenant = masterPromoted || masterListRepairNeeded;
            tx.set(storeRef, {
                ...(masterPromoted ? { isMaster: true } : {}),
                modifiedOn: now,
                outletPolicy: mergedPolicy,
            }, { merge: true });

            if (shouldMarkCurrentStoreAsMasterInTenant) {
                tx.update(tenantRef, {
                    storesList: storesList.map((store: any) => (
                        Number(store?.storeId) === Number(storeId)
                            ? { ...store, isMaster: true }
                            : store
                    )),
                });
                tx.set(db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/storesSummary`), {
                    lastUpdated: now,
                    stores: {
                        [storeDocumentId]: {
                            isMaster: true,
                            modifiedOn: now,
                        },
                    },
                }, { merge: true });
            }
            return { masterPromoted, mergedPolicy };
        });

        const postCommit = await runStorePublicTruthPostCommitEffects({
            chunkSize: OUTLET_POLICY_EFFECT_CHUNK_SIZE,
            storeIds: [storeDocumentId],
            tenantId: tenantDocumentId,
            deps: {
                invalidateAssistant: (storeId, tenantId) => (
                    invalidateOwnerBusinessAssistantPacketCache({ tId: tenantId, sId: storeId })
                ),
                revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                touchScreen: (storeId) => touchDigitalScreenContentVersionForStoreServer(storeId, "outletPolicy"),
            },
        });
        if (postCommit.effectsPending) {
            logMultiOutletFailure("outlet_policy_post_commit_effect_failed", postCommit.firstError, {
                ...failureContext,
                failedEffectCount: postCommit.failedEffectCount,
            });
        }

        return NextResponse.json({
            effectsPending: postCommit.effectsPending,
            failedEffectCount: postCommit.failedEffectCount,
            success: true,
            masterPromoted: policyResult.masterPromoted,
            outletPolicy: policyResult.mergedPolicy,
        });
    } catch (error) {
        if (isOutletPolicyScopeChangedError(error)) {
            return NextResponse.json({ error: "Outlet policy can only be set on the current main location" }, { status: 409 });
        }
        logMultiOutletFailure("outlet_policy_update_route_failed", error, failureContext);
        return NextResponse.json({ error: "Outlet policy update failed" }, { status: 500 });
    }
});
