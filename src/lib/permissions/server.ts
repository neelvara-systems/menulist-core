import { DB_COLLECTIONS } from "@constant/database";
import { ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
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

export type StorePermissionScopeDocumentId = {
    numericId: number;
    documentId: string;
};

export function normalizeStorePermissionScopeDocumentId(value: unknown): StorePermissionScopeDocumentId | null {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

const getRawSessionStoreId = (session: any) => session?.sId ?? session?.user?.storeId;
const getRawSessionTenantId = (session: any) => session?.tId ?? session?.user?.tenantId;

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

    const storeScope = normalizeStorePermissionScopeDocumentId(getRawSessionStoreId(session));
    const tenantScope = normalizeStorePermissionScopeDocumentId(getRawSessionTenantId(session));
    if (!storeScope || !tenantScope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const storeDoc = await admin.firestore()
        .collection(DB_COLLECTIONS.STORES)
        .doc(storeScope.documentId)
        .get();

    const storeData = storeDoc.data();
    if (!storeDoc.exists || Number(storeData?.tenantId) !== tenantScope.numericId || isStorePermissionTargetBlocked(storeData)) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
            ...getBoundedSecurityStringContext("label", label),
            ...getBoundedSecurityStringContext("storeId", storeScope.numericId),
            ...getBoundedSecurityStringContext("tenantId", tenantScope.numericId),
        }, "high");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return requireAnyStorePermissionForStoreData(
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
    tenantId: string | number = getRawSessionTenantId(session),
) {
    const storeScope = normalizeStorePermissionScopeDocumentId(storeId);
    const tenantScope = normalizeStorePermissionScopeDocumentId(tenantId);
    if (!storeScope || !tenantScope) {
        return NextResponse.json({ error: "Not onboarded" }, { status: 400 });
    }

    const storeDoc = await admin.firestore()
        .collection(DB_COLLECTIONS.STORES)
        .doc(storeScope.documentId)
        .get();

    const storeData = storeDoc.data();
    if (!storeDoc.exists || Number(storeData?.tenantId) !== tenantScope.numericId || isStorePermissionTargetBlocked(storeData)) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...getBoundedSecurityRouteContext(session, request),
            ...getBoundedSecurityStringContext("endpoint", request.nextUrl.pathname),
            ...getBoundedSecurityStringContext("label", label),
            ...getBoundedSecurityStringContext("storeId", storeScope.numericId),
            ...getBoundedSecurityStringContext("tenantId", tenantScope.numericId),
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
        storeScope.numericId,
        tenantScope.numericId,
    );
}

export function requireAnyStorePermissionForStoreData(
    request: NextRequest,
    session: any,
    storeData: any,
    permissions: PermissionKey[],
    label: string,
    storeId: string | number = getRawSessionStoreId(session),
    tenantId: string | number = getRawSessionTenantId(session),
) {
    if (isPlatformSession(session)) return null;

    const storeScope = normalizeStorePermissionScopeDocumentId(storeId);
    const tenantScope = normalizeStorePermissionScopeDocumentId(tenantId);

    if (!storeScope || !tenantScope || !storeData || Number(storeData?.tenantId) !== tenantScope.numericId || isStorePermissionTargetBlocked(storeData)) {
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
