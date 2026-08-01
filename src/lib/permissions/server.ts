import { DB_COLLECTIONS } from "@constant/database";
import { ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
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
import {
    isStorePermissionDataInScope,
    normalizeStorePermissionScopeDocumentId,
    resolveStorePermissionSessionScope,
} from "./scopeDocumentId";

export {
    normalizeStorePermissionScopeDocumentId,
    resolveStorePermissionSessionScope,
    type StorePermissionScopeDocumentId,
    type StorePermissionSessionScope,
} from "./scopeDocumentId";

const isPlatformSession = (session: any) => (
    resolveExactSessionPlatformRole(session) === ECOMSAI_PLATFORM_USER_ROLE
);

async function requireCurrentPlatformPermissionAuthority(
    request: NextRequest,
    session: any,
    label: string,
    storeId?: string | number,
    tenantId?: string | number,
): Promise<NextResponse | null> {
    if (!isPlatformSession(session)) return null;
    if (await getCurrentPlatformUser(session)) return null;

    logger.security("Authorization Failed - Current Platform Authority Missing", {
        ...getBoundedSecurityRouteContext(session, request),
        ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
        ...getBoundedSecurityStringContext("label", label),
        ...getBoundedSecurityStringContext("storeId", storeId),
        ...getBoundedSecurityStringContext("tenantId", tenantId),
    }, "critical");
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

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
    if (isPlatformSession(session)) {
        return requireCurrentPlatformPermissionAuthority(request, session, label);
    }

    const sessionScope = resolveStorePermissionSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }
    const { storeScope, tenantScope } = sessionScope;

    const storeDoc = await admin.firestore()
        .collection(DB_COLLECTIONS.STORES)
        .doc(storeScope.documentId)
        .get();

    const storeData = storeDoc.data();
    if (!storeDoc.exists || !isStorePermissionDataInScope(storeData, storeScope, tenantScope) || isStorePermissionTargetBlocked(storeData)) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
            ...getBoundedSecurityStringContext("label", label),
            ...getBoundedSecurityStringContext("storeId", storeScope.numericId),
            ...getBoundedSecurityStringContext("tenantId", tenantScope.numericId),
        }, "high");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return await requireAnyStorePermissionForStoreData(
        request,
        session,
        storeData,
        permissions,
        label,
        storeScope.numericId,
        tenantScope.numericId,
    );
}

export async function requireAnyStorePermissionForStore(
    request: NextRequest,
    session: any,
    permissions: PermissionKey[],
    label: string,
    storeId: string | number,
    tenantId?: string | number,
) {
    const sessionScope = resolveStorePermissionSessionScope(session);
    const storeScope = normalizeStorePermissionScopeDocumentId(storeId);
    const tenantScope = normalizeStorePermissionScopeDocumentId(
        tenantId ?? sessionScope?.tenantScope.documentId,
    );
    if (
        !storeScope
        || !tenantScope
        || (!isPlatformSession(session) && (
            !sessionScope
            || sessionScope.tenantScope.numericId !== tenantScope.numericId
        ))
    ) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const storeDoc = await admin.firestore()
        .collection(DB_COLLECTIONS.STORES)
        .doc(storeScope.documentId)
        .get();

    const storeData = storeDoc.data();
    if (!storeDoc.exists || !isStorePermissionDataInScope(storeData, storeScope, tenantScope) || isStorePermissionTargetBlocked(storeData)) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
            ...getBoundedSecurityStringContext("label", label),
            ...getBoundedSecurityStringContext("storeId", storeScope.numericId),
            ...getBoundedSecurityStringContext("tenantId", tenantScope.numericId),
        }, "high");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isPlatformSession(session)) {
        return requireCurrentPlatformPermissionAuthority(
            request,
            session,
            label,
            storeScope.documentId,
            tenantScope.documentId,
        );
    }

    return await requireAnyStorePermissionForStoreData(
        request,
        session,
        storeData,
        permissions,
        label,
        storeScope.numericId,
        tenantScope.numericId,
    );
}

export async function requireAnyStorePermissionForStoreData(
    request: NextRequest,
    session: any,
    storeData: any,
    permissions: PermissionKey[],
    label: string,
    storeId?: string | number,
    tenantId?: string | number,
) {
    if (isPlatformSession(session)) {
        return requireCurrentPlatformPermissionAuthority(
            request,
            session,
            label,
            storeId,
            tenantId,
        );
    }

    const sessionScope = resolveStorePermissionSessionScope(session);
    const storeScope = normalizeStorePermissionScopeDocumentId(
        storeId ?? sessionScope?.storeScope.documentId,
    );
    const tenantScope = normalizeStorePermissionScopeDocumentId(
        tenantId ?? sessionScope?.tenantScope.documentId,
    );

    if (
        !sessionScope
        || !storeScope
        || !tenantScope
        || sessionScope.tenantScope.numericId !== tenantScope.numericId
        || !isStorePermissionDataInScope(storeData, storeScope, tenantScope)
        || isStorePermissionTargetBlocked(storeData)
    ) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
            ...getBoundedSecurityStringContext("label", label),
            ...getBoundedSecurityStringContext("storeId", storeScope?.numericId ?? storeId),
            ...getBoundedSecurityStringContext("tenantId", tenantScope?.numericId ?? tenantId),
        }, "high");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roleId = session?.user?.stores?.find((store: any) => (
        normalizeStorePermissionScopeDocumentId(store?.storeId)?.numericId === storeScope.numericId
    ))?.role
        || session?.role
        || session?.user?.role;
    const effectivePermissions = getPermissionsForRole(roleId, (storeData?.roles || []) as StoreRoleDataType[]);

    if (hasAnyPermission(effectivePermissions, permissions)) return null;

    logger.security("Authorization Failed - Permission Required", {
        ...getBoundedSecurityRouteContext(session, request),
        ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
        ...getBoundedSecurityStringContext("label", label),
        permissionCount: permissions.length,
        ...getBoundedSecurityStringContext("storeId", storeScope.numericId),
        ...getBoundedSecurityStringContext("tenantId", tenantScope.numericId),
    }, "high");

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
