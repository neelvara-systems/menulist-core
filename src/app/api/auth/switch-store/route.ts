export const dynamic = 'force-dynamic';
/**
 * POST /api/auth/switch-store — Switch active store context
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §8.4
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { getAuthSessionLogContext, getBoundedAuthStringContext, logAuthFailure } from "@lib/auth/authDiagnostics";
import { logger } from "@lib/monitoring/logger";
import { canUserAccessStore } from "@lib/multiOutlet/storeSwitchAccess";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const schema = z.object({ targetStoreId: z.number().int().positive() });
const SWITCH_STORE_MAX_BODY_BYTES = 1024;
const SWITCH_STORE_ENDPOINT = "/api/auth/switch-store";

const getSwitchStoreLogContext = (session: any, targetStoreId?: unknown) => ({
    endpoint: SWITCH_STORE_ENDPOINT,
    ...getAuthSessionLogContext(session),
    ...getBoundedAuthStringContext("targetStoreId", targetStoreId),
});

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }
    const { tId: tenantId, sId: currentStoreId } = session;
    if (!tenantId) return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    if (!verifyTenantAccess(session, tenantId, currentStoreId, request)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let targetStoreIdForLog: number | undefined;
    try {
        const userRateLimitHash = hashPublicRateLimitValue(session.uId || session.user?.id || "unknown");
        const rateLimit = await checkRateLimit({
            key: `switch-store:${userRateLimitHash}`,
            limit: 60,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, SWITCH_STORE_MAX_BODY_BYTES, {
            invalidJsonMessage: "Invalid input",
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { targetStoreId } = v.data;
        targetStoreIdForLog = targetStoreId;

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
        const tenantData = tenantSnap.exists ? tenantSnap.data() : null;
        if (!tenantData || isPlatformEntityBlocked(tenantData)) {
            return NextResponse.json({ error: "Store access not allowed" }, { status: 403 });
        }

        const storesList = tenantData?.storesList || [];
        const targetStore = storesList.find((s: any) => Number(s.storeId) === Number(targetStoreId));
        if (!targetStore) {
            return NextResponse.json({ error: "Store not in tenant" }, { status: 404 });
        }
        if (targetStore.active === false) {
            return NextResponse.json({ error: "Store is inactive" }, { status: 400 });
        }

        const targetStoreSnap = await db.doc(`${DB_COLLECTIONS.STORES}/${targetStoreId}`).get();
        const targetStoreData = targetStoreSnap.exists ? targetStoreSnap.data() : null;
        if (
            !targetStoreData
            || Number(targetStoreData.tenantId) !== Number(tenantId)
            || targetStoreData.active === false
            || targetStoreData.deleted === true
            || isPlatformEntityBlocked(targetStoreData)
        ) {
            return NextResponse.json({ error: "Store access not allowed" }, { status: 403 });
        }

        const switchAccessUser = {
            ...(session.user || {}),
            platformRole: session.user?.platformRole || session.platformRole,
        };
        if (!canUserAccessStore({ sessionUser: switchAccessUser as any, storeId: targetStoreId })) {
            logger.security("Unauthorized Store Switch Attempt", {
                ...getBoundedSecurityRouteContext(session, request),
                ...getSwitchStoreLogContext(session, targetStoreId),
            }, "high");
            return NextResponse.json({ error: "Store access not allowed" }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            targetStoreId,
            targetStoreName: targetStoreData.name || targetStore.name,
            isMaster: targetStoreData.isMaster || targetStore.isMaster || false,
        });
    } catch (error) {
        logAuthFailure("switch_store_route_failed", error, getSwitchStoreLogContext(session, targetStoreIdForLog));
        return NextResponse.json({ error: "Switch failed" }, { status: 500 });
    }
});
