export const dynamic = 'force-dynamic';
/**
 * POST /api/auth/switch-store — Switch active store context
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §8.4
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { canUserAccessStore } from "@lib/multiOutlet/storeSwitchAccess";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { secureError } from "@lib/security/secureLogger";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const schema = z.object({ targetStoreId: z.number().int().positive() });

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }
    const { tId: tenantId, sId: currentStoreId } = session;
    if (!tenantId) return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    if (!verifyTenantAccess(session, tenantId, currentStoreId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { targetStoreId } = v.data;

        const rateLimit = await checkRateLimit({
            key: `switch-store:${session.uId || session.user?.id}`,
            limit: 60,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const db = admin.firestore();
        const callerStoreSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${currentStoreId}`).get();
        const callerStore = callerStoreSnap.data();
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            callerStore,
            [PERMISSIONS.SWITCH_STORES],
            "Store switching",
            Number(currentStoreId),
            Number(tenantId),
        );
        if (permissionError) return permissionError;

        const tenantSnap = await db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantId}`).get();
        const storesList = tenantSnap.data()?.storesList || [];
        const targetStore = storesList.find((s: any) => Number(s.storeId) === Number(targetStoreId));
        if (!targetStore) {
            return NextResponse.json({ error: "Store not in tenant" }, { status: 404 });
        }
        if (targetStore.active === false) {
            return NextResponse.json({ error: "Store is inactive" }, { status: 400 });
        }

        const switchAccessUser = {
            ...(session.user || {}),
            platformRole: session.user?.platformRole || session.platformRole,
        };
        if (!canUserAccessStore({ sessionUser: switchAccessUser as any, storeId: targetStoreId })) {
            logger.security("Unauthorized Store Switch Attempt", {
                ...buildSecurityContext(session, request),
                endpoint: "/api/auth/switch-store",
                targetStoreId,
                tenantId,
            }, "high");
            return NextResponse.json({ error: "Store access not allowed" }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            targetStoreId,
            targetStoreName: targetStore.name,
            isMaster: targetStore.isMaster || false,
        });
    } catch (error) {
        secureError("[SwitchStore] Failed", error as Error, { tenantId });
        return NextResponse.json({ error: "Switch failed" }, { status: 500 });
    }
});
