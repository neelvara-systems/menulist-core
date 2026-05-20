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
import { admin } from "@lib/firebase/firebaseAdmin";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { DEFAULT_OUTLET_POLICY } from "@type/multiOutlet.types";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

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

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }

    const { tId: tenantId, sId: storeId } = session;
    if (!tenantId || !storeId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    if (!verifyTenantAccess(session, tenantId, storeId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rlResult = await checkRateLimit({ key: `outlet-policy:${tenantId}`, limit: 30, window: 3600 });
    if (!rlResult.allowed) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    try {
        const body = await request.json();
        const v = validateAPIInput(schema, body);
        if (!v.success) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const db = admin.firestore();
        const storeRef = db.doc(`${DB_COLLECTIONS.STORES}/${storeId}`);
        const tenantRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`);
        const [storeSnap, tenantSnap] = await Promise.all([
            storeRef.get(),
            tenantRef.get(),
        ]);

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

        const storesList = tenantSnap.data()?.storesList || [];
        const hasMasterStore = storesList.some((store: any) => store?.isMaster === true);
        const masterPromoted = (
            storeData.isMaster !== true
            && !hasMasterStore
            && storesList.length === 1
            && Number(storesList[0]?.storeId) === Number(storeId)
        );

        if (storeData.isMaster !== true && !masterPromoted) {
            return NextResponse.json({ error: "Outlet policy can only be set on master store" }, { status: 403 });
        }

        const now = admin.firestore.Timestamp.now();
        const mergedPolicy = {
            ...(storeData.outletPolicy || DEFAULT_OUTLET_POLICY),
            ...v.data.policy,
        };

        await db.runTransaction(async (tx) => {
            tx.set(storeRef, {
                ...(masterPromoted ? { isMaster: true } : {}),
                modifiedOn: now,
                outletPolicy: mergedPolicy,
            }, { merge: true });

            if (masterPromoted) {
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
                        [storeId]: {
                            isMaster: true,
                            modifiedOn: now,
                        },
                    },
                }, { merge: true });
            }
        });

        revalidateTag(`menu-store-${storeId}`);
        revalidateTag(`store-${storeId}`);
        revalidateTag("client-stores");

        return NextResponse.json({
            success: true,
            masterPromoted,
            outletPolicy: mergedPolicy,
        });
    } catch (error) {
        secureError("[Outlets] Policy update failed", error as Error, { tenantId, storeId });
        return NextResponse.json({ error: "Outlet policy update failed" }, { status: 500 });
    }
});
