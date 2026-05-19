import { DB_COLLECTIONS } from "@constant/database";
import { ECOMSAI_PLATFORM_USER_ROLE } from "@constant/user";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { buildSecurityContext } from "@lib/security/securityContext";
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
    if (!storeDoc.exists || Number(storeData?.tenantId) !== tenantId) {
        logger.security("Authorization Failed - Permission Store Missing", {
            ...buildSecurityContext(session, request),
            endpoint: request.nextUrl.pathname,
            label,
            storeId,
            tenantId,
        }, "high");
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const roleId = session?.user?.stores?.find((store: any) => Number(store?.storeId) === storeId)?.role
        || session?.role
        || session?.user?.role;
    const effectivePermissions = getPermissionsForRole(roleId, (storeData?.roles || []) as StoreRoleDataType[]);

    if (hasAnyPermission(effectivePermissions, permissions)) return null;

    logger.security("Authorization Failed - Permission Required", {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        label,
        permissions,
        storeId,
        tenantId,
    }, "high");

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
