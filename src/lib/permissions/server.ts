import { DB_COLLECTIONS } from "@constant/database";
import { ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import {
    getBoundedSecurityRouteContext,
    getBoundedSecurityStringContext,
} from "@lib/security/securityDiagnostics";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasAnyPermission } from "./permissionRequirements";
import type { PermissionKey } from "@constant/permissions";
import { getPermissionsForRole } from "./hasPermission";
import type { StoreRoleDataType } from "@type/platform/roles";

const getSessionStoreId = (session: any) => Number(session?.sId ?? session?.user?.storeId);
const getSessionTenantId = (session: any) => Number(session?.tId ?? session?.user?.tenantId);

const isPlatformSession = (session: any) => (
    session?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
    || session?.user?.platformRole === ECOMSAI_PLATFORM_USER_ROLE
);

const isStorePermissionTargetBlocked = (storeData: any): boolean => (
    storeData?.active === false
    || storeData?.deleted === true
    || isPlatformEntityBlocked(storeData)
);

export async function requireAnyStorePermission(
    request: NextRequest,
    session: any,
    permissions: PermissionKey[],
    label: string,
) {
    if (isPlatformSession(session)) return null;

    const storeId = getSessionStoreId(session);
    const tenantId = getSessionTenantId(session);
    if (!storeId || !tenantId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const storeDoc = await admin.firestore()
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(storeId))
        .get();

    const storeData = storeDoc.data();
    if (!storeDoc.exists || Number(storeData?.tenantId) !== tenantId || isStorePermissionTargetBlocked(storeData)) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
            ...getBoundedSecurityStringContext("label", label),
            ...getBoundedSecurityStringContext("storeId", storeId),
            ...getBoundedSecurityStringContext("tenantId", tenantId),
        }, "high");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return requireAnyStorePermissionForStoreData(
        request,
        session,
        storeData,
        permissions,
        label,
        storeId,
        tenantId,
    );
}

export async function requireAnyStorePermissionForStore(
    request: NextRequest,
    session: any,
    permissions: PermissionKey[],
    label: string,
    storeId: string | number,
    tenantId: string | number = getSessionTenantId(session),
) {
    const normalizedStoreId = Number(storeId);
    const normalizedTenantId = Number(tenantId);
    if (!normalizedStoreId || !normalizedTenantId) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const storeDoc = await admin.firestore()
        .collection(DB_COLLECTIONS.STORES)
        .doc(String(normalizedStoreId))
        .get();

    const storeData = storeDoc.data();
    if (!storeDoc.exists || Number(storeData?.tenantId) !== normalizedTenantId || isStorePermissionTargetBlocked(storeData)) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
            ...getBoundedSecurityStringContext("label", label),
            ...getBoundedSecurityStringContext("storeId", normalizedStoreId),
            ...getBoundedSecurityStringContext("tenantId", normalizedTenantId),
        }, "high");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isPlatformSession(session)) return null;

    return requireAnyStorePermissionForStoreData(
        request,
        session,
        storeData,
        permissions,
        label,
        normalizedStoreId,
        normalizedTenantId,
    );
}

export function requireAnyStorePermissionForStoreData(
    request: NextRequest,
    session: any,
    storeData: any,
    permissions: PermissionKey[],
    label: string,
    storeId: number = getSessionStoreId(session),
    tenantId: number = getSessionTenantId(session),
) {
    if (isPlatformSession(session)) return null;

    if (!storeId || !tenantId || !storeData || Number(storeData?.tenantId) !== tenantId || isStorePermissionTargetBlocked(storeData)) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
            ...getBoundedSecurityStringContext("label", label),
            ...getBoundedSecurityStringContext("storeId", storeId),
            ...getBoundedSecurityStringContext("tenantId", tenantId),
        }, "high");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roleId = session?.user?.stores?.find((store: any) => Number(store?.storeId) === storeId)?.role
        || session?.role
        || session?.user?.role;
    const effectivePermissions = getPermissionsForRole(roleId, (storeData?.roles || []) as StoreRoleDataType[]);

    if (hasAnyPermission(effectivePermissions, permissions)) return null;

    logger.security("Authorization Failed - Permission Required", {
        ...getBoundedSecurityRouteContext(session, request),
        ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
        ...getBoundedSecurityStringContext("label", label),
        permissionCount: permissions.length,
        ...getBoundedSecurityStringContext("storeId", storeId),
        ...getBoundedSecurityStringContext("tenantId", tenantId),
    }, "high");

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
