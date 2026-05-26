import { FEATURE_FLAGS } from '@config/features';
import {
    CANONICA_ALL_PERMISSIONS,
    CANONICA_PERMISSION_KEYS,
    CanonicaPermissionKey,
    CanonicaRoleDefinition,
    createDefaultCanonicaRoles,
    DEFAULT_CANONICA_ROLE_IDS,
    DEFAULT_CANONICA_ROLE_METADATA,
    normalizeCanonicaRolePermissions,
} from '@constant/canonica/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    ECOMSAI_PLATFORM_SUPPORT_USER_ROLE,
    ECOMSAI_PLATFORM_USER_ROLE,
} from '@constant/user';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import { buildSecurityContext } from '@lib/security/securityContext';
import { logger } from '@lib/monitoring/logger';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resolveCanonicaSessionScope } from './sessionScope';

export type CanonicaAccessContext = {
    canUseManagement: boolean;
    currentRole?: CanonicaRoleDefinition;
    currentRoleId: string;
    isPlatformAdmin: boolean;
    permissions: Record<CanonicaPermissionKey, boolean>;
    roles: CanonicaRoleDefinition[];
    scope: {
        tenantId: number;
        storeId: number;
    };
    storeName: string;
    user: {
        id: string;
        email: string;
        name?: string;
    };
};

const isPositiveId = (value: unknown) => {
    const numberValue = Number(value);
    return Number.isSafeInteger(numberValue) && numberValue > 0;
};

export const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? canonicaFirestoreAdmin : null;
};

const isPlatformAdminSession = (session: any) => {
    const platformRole = String(
        session?.platformRole
        || session?.user?.platformRole
        || ''
    ).toUpperCase();

    return platformRole === ECOMSAI_PLATFORM_USER_ROLE
        || platformRole === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE;
};

const normalizeEmail = (value: unknown) => String(value || '').toLowerCase().trim();

const serializeRole = (
    role: any,
    fallback: CanonicaRoleDefinition,
    tId: number,
    sId: number,
): CanonicaRoleDefinition => ({
    id: String(role?.id || fallback.id),
    name: String(role?.name || fallback.name),
    description: String(role?.description || fallback.description || ''),
    active: role?.active !== false,
    permissions: normalizeCanonicaRolePermissions(role?.permissions, fallback.permissions),
    pId: PRODUCT_IDS.CANONICA,
    tId,
    sId,
    createdOn: String(role?.createdOn || fallback.createdOn || new Date().toISOString()),
    createdBy: String(role?.createdBy || fallback.createdBy || 'system'),
    modifiedOn: role?.modifiedOn ? String(role.modifiedOn) : undefined,
    modifiedBy: role?.modifiedBy ? String(role.modifiedBy) : undefined,
});

const getFallbackRole = (roleId: string, tId: number, sId: number): CanonicaRoleDefinition => {
    const createdBy = 'system';
    const defaults = createDefaultCanonicaRoles({ tId, sId, createdBy });
    return defaults.find((role) => role.id === roleId) || defaults[2];
};

export const normalizeCanonicaRolesForStore = (
    rawRoles: any,
    tId: number,
    sId: number,
    actorEmail = 'system',
) => {
    const defaultRoles = createDefaultCanonicaRoles({ tId, sId, createdBy: actorEmail });
    const rolesById = new Map<string, CanonicaRoleDefinition>();
    let changed = false;

    defaultRoles.forEach((role) => rolesById.set(role.id, role));

    if (Array.isArray(rawRoles)) {
        rawRoles.forEach((rawRole) => {
            const roleId = String(rawRole?.id || '').trim();
            if (!roleId) {
                changed = true;
                return;
            }

            const defaultRole = defaultRoles.find((role) => role.id === roleId) || getFallbackRole(roleId, tId, sId);
            const normalized = serializeRole(rawRole, defaultRole, tId, sId);
            const before = JSON.stringify(rawRole?.permissions || {});
            const after = JSON.stringify(normalized.permissions);
            if (before !== after || rawRole?.pId !== PRODUCT_IDS.CANONICA || Number(rawRole?.tId) !== tId || Number(rawRole?.sId) !== sId) {
                changed = true;
            }
            rolesById.set(roleId, normalized);
        });
    } else {
        changed = true;
    }

    CANONICA_ALL_PERMISSIONS.forEach((permission) => {
        const owner = rolesById.get(DEFAULT_CANONICA_ROLE_IDS.OWNER);
        if (owner && owner.permissions[permission] !== true) {
            owner.permissions[permission] = true;
            changed = true;
        }
    });

    defaultRoles.forEach((defaultRole) => {
        if (!rolesById.has(defaultRole.id)) {
            rolesById.set(defaultRole.id, defaultRole);
            changed = true;
        }
    });

    return {
        changed,
        roles: Array.from(rolesById.values()),
    };
};

export const ensureCanonicaRolesForStore = async (
    storeRef: FirebaseFirestore.DocumentReference,
    storeData: Record<string, any>,
    actorEmail?: string,
) => {
    const tId = Number(storeData?.tenantId || storeData?.tId);
    const sId = Number(storeData?.storeId || storeData?.sId || storeRef.id);
    const normalized = normalizeCanonicaRolesForStore(storeData?.canonicaRoles, tId, sId, actorEmail);

    if (normalized.changed) {
        await storeRef.set({
            canonicaRoles: normalized.roles,
            pId: PRODUCT_IDS.CANONICA,
            productId: PRODUCT_IDS.CANONICA,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    return normalized.roles;
};

export const findCanonicaRole = (
    roles: CanonicaRoleDefinition[],
    roleId?: string,
) => {
    const normalizedRoleId = String(roleId || DEFAULT_CANONICA_ROLE_IDS.STAFF).trim();
    return roles.find((role) => role.id === normalizedRoleId && role.active !== false)
        || roles.find((role) => role.id === DEFAULT_CANONICA_ROLE_IDS.STAFF)
        || roles[0];
};

export const hasCanonicaPermission = (
    roleId: string | undefined,
    roles: CanonicaRoleDefinition[],
    permission: CanonicaPermissionKey,
) => {
    if (roleId === DEFAULT_CANONICA_ROLE_IDS.OWNER) return true;
    const role = findCanonicaRole(roles, roleId);
    return role?.permissions?.[permission] === true;
};

export async function getCanonicaAccessContext(session: any): Promise<CanonicaAccessContext | null> {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) return null;

    const scope = resolveCanonicaSessionScope(session);
    if (!scope || !isPositiveId(scope.tenantId) || !isPositiveId(scope.storeId)) return null;

    const db = getCanonicaDb();
    if (!db) return null;

    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) return null;

    const storeData = storeSnap.data() || {};
    const storeTenantId = Number(storeData.tenantId || storeData.tId);
    if (storeTenantId !== Number(scope.tenantId)) return null;

    const sessionEmail = normalizeEmail(session?.user?.email);
    const userSnapshot = sessionEmail
        ? await db.collection(DB_COLLECTIONS.USERS)
            .where('email', '==', sessionEmail)
            .limit(1)
            .get()
        : null;
    const userDoc = userSnapshot && !userSnapshot.empty ? userSnapshot.docs[0] : null;
    const userData = userDoc?.data() || {};
    const isPlatformAdmin = isPlatformAdminSession(session);

    if (!isPlatformAdmin) {
        if (!userDoc) return null;
        if (userData.active === false || userData.deleted === true || userData.authDisabled === true) return null;
        if (Number(userData.tenantId || userData.tId) !== Number(scope.tenantId)) return null;
        const userStoreIds = Array.isArray(userData.storeIds)
            ? userData.storeIds.map(Number)
            : Array.isArray(userData.stores)
                ? userData.stores.map((store: any) => Number(store?.storeId))
                : [Number(userData.storeId || userData.sId)];
        if (!userStoreIds.includes(Number(scope.storeId))) return null;
    }

    const roles = await ensureCanonicaRolesForStore(storeRef, storeData, sessionEmail || 'system');
    const storeRole = Array.isArray(userData.stores)
        ? userData.stores.find((store: any) => Number(store?.storeId) === Number(scope.storeId))?.role
        : undefined;
    const currentRoleId = isPlatformAdmin
        ? DEFAULT_CANONICA_ROLE_IDS.OWNER
        : String(storeRole || userData.role || scope.role || DEFAULT_CANONICA_ROLE_IDS.STAFF);
    const currentRole = findCanonicaRole(roles, currentRoleId);
    const permissions = currentRoleId === DEFAULT_CANONICA_ROLE_IDS.OWNER || isPlatformAdmin
        ? normalizeCanonicaRolePermissions(DEFAULT_CANONICA_ROLE_METADATA[DEFAULT_CANONICA_ROLE_IDS.OWNER].permissions)
        : normalizeCanonicaRolePermissions(currentRole?.permissions);

    return {
        canUseManagement: isPlatformAdmin || Object.values(permissions).some(Boolean),
        currentRole,
        currentRoleId,
        isPlatformAdmin,
        permissions,
        roles,
        scope: {
            tenantId: Number(scope.tenantId),
            storeId: Number(scope.storeId),
        },
        storeName: String(storeData.productName || storeData.name || `Workspace ${scope.storeId}`),
        user: {
            id: userDoc?.id || session?.uId || session?.user?.id || '',
            email: sessionEmail,
            name: userData.name || session?.user?.name || '',
        },
    };
}

export async function requireCanonicaPermission(
    request: NextRequest,
    session: any,
    permission: CanonicaPermissionKey,
) {
    const access = await getCanonicaAccessContext(session);
    if (access?.isPlatformAdmin || access?.permissions?.[permission] === true) {
        return { access, response: null };
    }

    logger.security('Authorization Failed - Canonica Permission', {
        ...buildSecurityContext(session, request),
        endpoint: request.nextUrl.pathname,
        permission,
        tenantId: access?.scope.tenantId,
        storeId: access?.scope.storeId,
    }, 'high');

    return {
        access,
        response: NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 }),
    };
}

export async function requireCanonicaTeamPermission(request: NextRequest, session: any) {
    return requireCanonicaPermission(request, session, CANONICA_PERMISSION_KEYS.MANAGE_TEAM);
}

