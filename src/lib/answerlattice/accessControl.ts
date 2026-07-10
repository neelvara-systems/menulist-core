import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    ANSWERLATTICE_PERMISSION_KEYS,
    AnswerlatticePermissionKey,
    AnswerlatticeRoleDefinition,
    createDefaultAnswerlatticeRoles,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
    DEFAULT_ANSWERLATTICE_ROLE_METADATA,
    normalizeAnswerlatticeRolePermissions,
} from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    ECOMSAI_PLATFORM_SUPPORT_USER_ROLE,
    ECOMSAI_PLATFORM_USER_ROLE,
} from '@constant/user';
import {
    getAnswerlatticeSecurityLogContext,
    getAnswerlatticeScopeLogContext,
    getBoundedAnswerlatticeStringContext,
} from '@lib/answerlattice/diagnostics';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { normalizeAnswerlatticeScopeDocumentId, resolveAnswerlatticeSessionScope } from './sessionScope';

export type AnswerlatticeAccessContext = {
    canUseManagement: boolean;
    currentRole?: AnswerlatticeRoleDefinition;
    currentRoleId: string;
    isPlatformAdmin: boolean;
    permissions: Record<AnswerlatticePermissionKey, boolean>;
    roles: AnswerlatticeRoleDefinition[];
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

export const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
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

const normalizeScopeIdList = (values: unknown[]): number[] => (
    values
        .map((value) => normalizeAnswerlatticeScopeDocumentId(value))
        .filter((value): value is number => value !== null)
);

const getUserStoreIds = (userData: Record<string, any>): number[] => {
    if (Array.isArray(userData.storeIds)) {
        return normalizeScopeIdList(userData.storeIds);
    }
    if (Array.isArray(userData.stores)) {
        return normalizeScopeIdList(userData.stores.map((store: any) => store?.storeId ?? store?.sId));
    }
    const storeId = normalizeAnswerlatticeScopeDocumentId(userData.storeId ?? userData.sId);
    return storeId ? [storeId] : [];
};

const serializeRole = (
    role: any,
    fallback: AnswerlatticeRoleDefinition,
    tId: number,
    sId: number,
): AnswerlatticeRoleDefinition => {
    const normalizedRole: AnswerlatticeRoleDefinition = {
        id: String(role?.id || fallback.id),
        name: String(role?.name || fallback.name),
        description: String(role?.description || fallback.description || ''),
        active: role?.active !== false,
        permissions: normalizeAnswerlatticeRolePermissions(role?.permissions, fallback.permissions),
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId,
        sId,
        createdOn: String(role?.createdOn || fallback.createdOn || new Date().toISOString()),
        createdBy: String(role?.createdBy || fallback.createdBy || 'system'),
    };

    if (role?.modifiedOn) {
        normalizedRole.modifiedOn = String(role.modifiedOn);
    }
    if (role?.modifiedBy) {
        normalizedRole.modifiedBy = String(role.modifiedBy);
    }

    return normalizedRole;
};

const getFallbackRole = (roleId: string, tId: number, sId: number): AnswerlatticeRoleDefinition => {
    const createdBy = 'system';
    const defaults = createDefaultAnswerlatticeRoles({ tId, sId, createdBy });
    return defaults.find((role) => role.id === roleId) || defaults[2];
};

export const normalizeAnswerlatticeRolesForStore = (
    rawRoles: any,
    tId: number,
    sId: number,
    actorEmail = 'system',
) => {
    const defaultRoles = createDefaultAnswerlatticeRoles({ tId, sId, createdBy: actorEmail });
    const rolesById = new Map<string, AnswerlatticeRoleDefinition>();
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
            if (
                before !== after
                || rawRole?.pId !== PRODUCT_IDS.ANSWERLATTICE
                || normalizeAnswerlatticeScopeDocumentId(rawRole?.tId) !== tId
                || normalizeAnswerlatticeScopeDocumentId(rawRole?.sId) !== sId
            ) {
                changed = true;
            }
            rolesById.set(roleId, normalized);
        });
    } else {
        changed = true;
    }

    ANSWERLATTICE_ALL_PERMISSIONS.forEach((permission) => {
        const owner = rolesById.get(DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER);
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

export const ensureAnswerlatticeRolesForStore = async (
    storeRef: FirebaseFirestore.DocumentReference,
    storeData: Record<string, any>,
    actorEmail?: string,
) => {
    const tId = normalizeAnswerlatticeScopeDocumentId(storeData?.tenantId ?? storeData?.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(storeData?.storeId ?? storeData?.sId ?? storeRef.id);
    if (!tId || !sId) {
        throw new Error('answerlattice_store_scope_invalid');
    }
    const normalized = normalizeAnswerlatticeRolesForStore(storeData?.answerlatticeRoles, tId, sId, actorEmail);

    if (normalized.changed) {
        await storeRef.set({
            answerlatticeRoles: normalized.roles,
            pId: PRODUCT_IDS.ANSWERLATTICE,
            productId: PRODUCT_IDS.ANSWERLATTICE,
            modifiedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }

    return normalized.roles;
};

export const findAnswerlatticeRole = (
    roles: AnswerlatticeRoleDefinition[],
    roleId?: string,
) => {
    const normalizedRoleId = String(roleId || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF).trim();
    return roles.find((role) => role.id === normalizedRoleId && role.active !== false)
        || roles.find((role) => role.id === DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF)
        || roles[0];
};

export const hasAnswerlatticePermission = (
    roleId: string | undefined,
    roles: AnswerlatticeRoleDefinition[],
    permission: AnswerlatticePermissionKey,
) => {
    if (roleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER) return true;
    const role = findAnswerlatticeRole(roles, roleId);
    return role?.permissions?.[permission] === true;
};

export async function getAnswerlatticeAccessContext(session: any): Promise<AnswerlatticeAccessContext | null> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) return null;

    const resolvedScope = resolveAnswerlatticeSessionScope(session);
    if (!resolvedScope) return null;
    const tenantId = normalizeAnswerlatticeScopeDocumentId(resolvedScope.tenantId);
    const storeId = normalizeAnswerlatticeScopeDocumentId(resolvedScope.storeId);
    if (!tenantId || !storeId) return null;
    const scope = {
        tenantId,
        storeId,
        role: resolvedScope.role,
    };

    const db = getAnswerlatticeDb();
    if (!db) return null;

    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) return null;

    const storeData = storeSnap.data() || {};
    const storeTenantId = normalizeAnswerlatticeScopeDocumentId(storeData.tenantId ?? storeData.tId);
    if (storeTenantId !== scope.tenantId) return null;

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
        if (normalizeAnswerlatticeScopeDocumentId(userData.tenantId ?? userData.tId) !== scope.tenantId) return null;
        const userStoreIds = getUserStoreIds(userData);
        if (!userStoreIds.includes(scope.storeId)) return null;
    }

    const roles = await ensureAnswerlatticeRolesForStore(storeRef, storeData, sessionEmail || 'system');
    const storeRole = Array.isArray(userData.stores)
        ? userData.stores.find((store: any) => normalizeAnswerlatticeScopeDocumentId(store?.storeId ?? store?.sId) === scope.storeId)?.role
        : undefined;
    const currentRoleId = isPlatformAdmin
        ? DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER
        : String(storeRole || userData.role || scope.role || DEFAULT_ANSWERLATTICE_ROLE_IDS.STAFF);
    const currentRole = findAnswerlatticeRole(roles, currentRoleId);
    const permissions = currentRoleId === DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER || isPlatformAdmin
        ? normalizeAnswerlatticeRolePermissions(DEFAULT_ANSWERLATTICE_ROLE_METADATA[DEFAULT_ANSWERLATTICE_ROLE_IDS.OWNER].permissions)
        : normalizeAnswerlatticeRolePermissions(currentRole?.permissions);

    return {
        canUseManagement: isPlatformAdmin || Object.values(permissions).some(Boolean),
        currentRole,
        currentRoleId,
        isPlatformAdmin,
        permissions,
        roles,
        scope: {
            tenantId: scope.tenantId,
            storeId: scope.storeId,
        },
        storeName: String(storeData.productName || storeData.name || `Workspace ${scope.storeId}`),
        user: {
            id: userDoc?.id || session?.uId || session?.user?.id || '',
            email: sessionEmail,
            name: userData.name || session?.user?.name || '',
        },
    };
}

export async function requireAnswerlatticePermission(
    request: NextRequest,
    session: any,
    permission: AnswerlatticePermissionKey,
) {
    const access = await getAnswerlatticeAccessContext(session);
    if (access?.isPlatformAdmin || access?.permissions?.[permission] === true) {
        return { access, response: null };
    }

    logger.security('Authorization Failed - Answerlattice Permission', {
        ...getAnswerlatticeSecurityLogContext(session, request, request.nextUrl.pathname, {
            ...getBoundedAnswerlatticeStringContext('permission', permission),
            ...getAnswerlatticeScopeLogContext({
                sId: access?.scope.storeId,
                tId: access?.scope.tenantId,
            }),
        }),
    }, 'high');

    return {
        access,
        response: NextResponse.json({ error: 'Forbidden', code: 'FORBIDDEN' }, { status: 403 }),
    };
}

export async function requireAnswerlatticeTeamPermission(request: NextRequest, session: any) {
    return requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM);
}
