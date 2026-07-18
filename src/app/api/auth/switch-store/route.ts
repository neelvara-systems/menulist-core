export const dynamic = 'force-dynamic';
/**
 * POST /api/auth/switch-store — Switch active store context
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §8.4
 */
import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { admin } from "@lib/firebase/firebaseAdmin";
import { getAuthSessionLogContext, getBoundedAuthStringContext, logAuthFailure } from "@lib/auth/authDiagnostics";
import { logger } from "@lib/monitoring/logger";
import { canUserAccessStore } from "@lib/multiOutlet/storeSwitchAccess";
import { normalizeStorePermissionScopeDocumentId, requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
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

type TenantStoreSummary = {
    storeId?: unknown;
    active?: unknown;
    isMaster?: unknown;
    name?: unknown;
};

const isTenantStoreSummary = (value: unknown): value is TenantStoreSummary => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const getSwitchStoreLogContext = (session: any, targetStoreId?: unknown) => ({
    endpoint: SWITCH_STORE_ENDPOINT,
    ...getAuthSessionLogContext(session),
    ...getBoundedAuthStringContext("targetStoreId", targetStoreId),
});

export const POST = withAuth(async (request, session) => {
    if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET) {
        return NextResponse.json({ error: "Multi-outlet disabled" }, { status: 403 });
    }
    const tenantScope = normalizeStorePermissionScopeDocumentId(session.tId);
    const currentStoreScope = normalizeStorePermissionScopeDocumentId(session.sId);
    if (!tenantScope || !currentStoreScope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    if (!verifyTenantAccess(session, tenantScope.numericId, currentStoreScope.numericId, request)) {
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
        const body = bodyResult.data;
        const v = validateAPIInput(schema, body);
        if (!v.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        const { targetStoreId } = v.data;
        const targetStoreScope = normalizeStorePermissionScopeDocumentId(targetStoreId);
        if (!targetStoreScope) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        targetStoreIdForLog = targetStoreScope.numericId;

        const db = admin.firestore();
        const callerStoreSnap = await db.collection(DB_COLLECTIONS.STORES).doc(currentStoreScope.documentId).get();
        const callerStore = callerStoreSnap.data();
        const permissionError = requireAnyStorePermissionForStoreData(
            request,
            session,
            callerStore,
            [PERMISSIONS.SWITCH_STORES],
            "Store switching",
            currentStoreScope.numericId,
            tenantScope.numericId,
        );
        if (permissionError) return permissionError;

        const tenantSnap = await db.collection(DB_COLLECTIONS.TENANTS).doc(tenantScope.documentId).get();
        const tenantData = tenantSnap.exists ? tenantSnap.data() : null;
        if (!tenantData || isPlatformEntityBlocked(tenantData)) {
            return NextResponse.json({ error: "Store access not allowed" }, { status: 403 });
        }

        const storesList = Array.isArray(tenantData?.storesList) ? tenantData.storesList : [];
        const targetStore = storesList.find((store: unknown) => {
            if (!isTenantStoreSummary(store)) return false;
            return normalizeStorePermissionScopeDocumentId(store.storeId)?.numericId === targetStoreScope.numericId;
        });
        if (!targetStore) {
            return NextResponse.json({ error: "Store not in tenant" }, { status: 404 });
        }
        if (targetStore.active === false) {
            return NextResponse.json({ error: "Store is inactive" }, { status: 400 });
        }

        const targetStoreSnap = await db.collection(DB_COLLECTIONS.STORES).doc(targetStoreScope.documentId).get();
        const targetStoreData = targetStoreSnap.exists ? targetStoreSnap.data() : null;
        if (
            !targetStoreData
            || Number(targetStoreData.tenantId) !== tenantScope.numericId
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
        if (!canUserAccessStore({ sessionUser: switchAccessUser, storeId: targetStoreScope.numericId })) {
            logger.security("Unauthorized Store Switch Attempt", {
                ...getBoundedSecurityRouteContext(session, request),
                ...getSwitchStoreLogContext(session, targetStoreScope.numericId),
            }, "high");
            return NextResponse.json({ error: "Store access not allowed" }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            targetStoreId: targetStoreScope.numericId,
            targetStoreName: typeof targetStoreData.name === "string"
                ? targetStoreData.name
                : typeof targetStore.name === "string" ? targetStore.name : "",
            isMaster: targetStoreData.isMaster === true || targetStore.isMaster === true,
        });
    } catch (error) {
        logAuthFailure("switch_store_route_failed", error, getSwitchStoreLogContext(session, targetStoreIdForLog));
        return NextResponse.json({ error: "Switch failed" }, { status: 500 });
    }
});
