import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    ANSWERLATTICE_PERMISSION_KEYS,
    AnswerlatticePermissionKey,
    AnswerlatticeRoleDefinition,
    createDefaultAnswerlatticeRoles,
    DEFAULT_ANSWERLATTICE_ROLE_IDS,
    DEFAULT_ANSWERLATTICE_ROLE_METADATA,
    isDefaultAnswerlatticeRoleId,
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
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { resolveExactSessionPlatformRole } from '@lib/auth/sessionPlatformRole';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
    isAnswerlatticeActiveStoreInScope,
    normalizeConsistentAnswerlatticeScopeDocumentIds,
    normalizeAnswerlatticeScopeDocumentId,
    resolveAnswerlatticeSessionScope,
} from './sessionScope';
import {
    getAnswerlatticeStaffMembership,
    readAnswerlatticeStaffAccessState,
} from './staffAccessContracts';

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

export type AnswerlatticeAccessTargetScope = {
    tenantId: number | string;
    storeId: number | string;
};

export const ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
} as const;

export const getAnswerlatticeDb = () => {
    return answerlatticeFirestoreAdmin;
};

const isPlatformAdminSession = (session: any) => {
    const platformRole = resolveExactSessionPlatformRole(session);

    return platformRole === ECOMSAI_PLATFORM_USER_ROLE
        || platformRole === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE;
};

const normalizeEmail = (value: unknown) => String(value || '').toLowerCase().trim();

const normalizeScopeIdList = (values: unknown[]): number[] => {
    const normalized = values.map((value) => normalizeAnswerlatticeScopeDocumentId(value));
    if (normalized.some((value) => value === null)) return [];
    const storeIds = normalized as number[];
    return new Set(storeIds).size === storeIds.length ? storeIds : [];
};

const hasCompatibleAnswerlatticeProductIdentity = (userData: Record<string, any>): boolean => {
    const productIds = [userData.pId, userData.productId]
        .filter((productId) => productId !== undefined);
    return productIds.length === 0
        || productIds.every((productId) => productId === PRODUCT_IDS.ANSWERLATTICE);
};

const getUserStoreIds = (userData: Record<string, any>): number[] => {
    if (Array.isArray(userData.stores)) {
        const accessState = readAnswerlatticeStaffAccessState(userData);
        return accessState ? accessState.memberships.map(({ storeId }) => storeId) : [];
    }
    if (Array.isArray(userData.storeIds)) {
        return normalizeScopeIdList(userData.storeIds);
    }
    const storeId = normalizeConsistentAnswerlatticeScopeDocumentIds([userData.storeId, userData.sId]);
    return storeId ? [storeId] : [];
};

type AnswerlatticeAccessUserCandidate = {
    data: Record<string, any>;
    id: string;
    ref?: FirebaseFirestore.DocumentReference;
};

export const selectAnswerlatticeAccessUserCandidate = (
    candidates: AnswerlatticeAccessUserCandidate[],
    tenantId: number,
    storeId: number,
    userId?: string,
): AnswerlatticeAccessUserCandidate | null => {
    const matching = candidates.filter((candidate) => {
        const data = candidate.data || {};
        return (!userId || candidate.id === userId)
            && hasCompatibleAnswerlatticeProductIdentity(data)
            && normalizeConsistentAnswerlatticeScopeDocumentIds([data.tenantId, data.tId]) === tenantId
            && getUserStoreIds(data).includes(storeId);
    });

    // Duplicate scoped identities are an integrity error. Failing closed avoids
    // choosing an arbitrary role or store membership from a non-unique result.
    return matching.length === 1 ? matching[0] : null;
};

const findAnswerlatticeAccessUser = async (
    db: FirebaseFirestore.Firestore,
    email: string,
    tenantId: number,
    storeId: number,
    userId: string,
): Promise<AnswerlatticeAccessUserCandidate | null> => {
    const readCandidates = (snapshot: FirebaseFirestore.QuerySnapshot) => (
        snapshot.docs.map((document) => ({
            data: document.data() || {},
            id: document.id,
            ref: document.ref,
        }))
    );

    const canonicalSnapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('tenantId', '==', tenantId)
        .where('email', '==', email)
        .limit(2)
        .get();
    if (!canonicalSnapshot.empty) {
        return selectAnswerlatticeAccessUserCandidate(
            readCandidates(canonicalSnapshot),
            tenantId,
            storeId,
            userId,
        );
    }

    // Migration-safe fallback for records written before tenantId became the
    // canonical user scope field. It runs only when the canonical query misses.
    const legacySnapshot = await db.collection(DB_COLLECTIONS.USERS)
        .where('tId', '==', tenantId)
        .where('email', '==', email)
        .limit(2)
        .get();
    return selectAnswerlatticeAccessUserCandidate(
        readCandidates(legacySnapshot),
        tenantId,
        storeId,
        userId,
    );
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
    if (typeof role?.creationRequestFingerprint === 'string') {
        normalizedRole.creationRequestFingerprint = role.creationRequestFingerprint;
    }
    if (typeof role?.creationRequestId === 'string') {
        normalizedRole.creationRequestId = role.creationRequestId;
    }

    return normalizedRole;
};

const getFallbackRole = (roleId: string, tId: number, sId: number): AnswerlatticeRoleDefinition => {
    const createdBy = 'system';
    const defaults = createDefaultAnswerlatticeRoles({ tId, sId, createdBy });
    return defaults.find((role) => role.id === roleId) || {
        active: false,
        createdBy,
        createdOn: new Date(0).toISOString(),
        description: '',
        id: roleId,
        name: roleId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        permissions: normalizeAnswerlatticeRolePermissions({}),
        sId,
        tId,
    };
};

export const normalizeAnswerlatticeRolesForStore = (
    rawRoles: any,
    tId: number,
    sId: number,
    actorEmail = 'system',
) => {
    const defaultRoles = createDefaultAnswerlatticeRoles({ tId, sId, createdBy: actorEmail });
    const rolesById = new Map<string, AnswerlatticeRoleDefinition>();
    const seenRawRoleIds = new Set<string>();
    let changed = false;

    defaultRoles.forEach((role) => rolesById.set(role.id, role));

    if (Array.isArray(rawRoles)) {
        rawRoles.forEach((rawRole) => {
            const rawRoleId = typeof rawRole?.id === 'string' ? rawRole.id : '';
            const roleId = rawRoleId.trim();
            if (!roleId || roleId !== rawRoleId || roleId.length > 120) {
                changed = true;
                return;
            }

            if (seenRawRoleIds.has(roleId)) {
                changed = true;
                if (!isDefaultAnswerlatticeRoleId(roleId)) {
                    const existingRole = rolesById.get(roleId);
                    rolesById.set(roleId, {
                        ...getFallbackRole(roleId, tId, sId),
                        active: false,
                        name: existingRole?.name || roleId,
                        permissions: normalizeAnswerlatticeRolePermissions({}),
                    });
                }
                return;
            }
            seenRawRoleIds.add(roleId);

            if (isDefaultAnswerlatticeRoleId(roleId)) {
                const defaultRole = defaultRoles.find((role) => role.id === roleId)!;
                if (
                    rawRole?.active !== true
                    || rawRole?.name !== defaultRole.name
                    || rawRole?.description !== defaultRole.description
                    || JSON.stringify(normalizeAnswerlatticeRolePermissions(rawRole?.permissions))
                        !== JSON.stringify(defaultRole.permissions)
                ) {
                    changed = true;
                }
                return;
            }

            const defaultRole = defaultRoles.find((role) => role.id === roleId) || getFallbackRole(roleId, tId, sId);
            const normalized = serializeRole(rawRole, defaultRole, tId, sId);
            if (!isDefaultAnswerlatticeRoleId(roleId) && rawRole?.active !== true) {
                normalized.active = false;
                changed = true;
            }
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

export const findAnswerlatticeRole = (
    roles: AnswerlatticeRoleDefinition[],
    roleId?: string,
) => {
    const normalizedRoleId = typeof roleId === 'string' ? roleId.trim() : '';
    if (!normalizedRoleId) return undefined;
    return roles.find((role) => role.id === normalizedRoleId && role.active !== false);
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

export async function getAnswerlatticeAccessContext(
    session: any,
    targetScope?: AnswerlatticeAccessTargetScope,
): Promise<AnswerlatticeAccessContext | null> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) return null;

    const resolvedScope = targetScope ? null : resolveAnswerlatticeSessionScope(session);
    if (!targetScope && !resolvedScope) return null;
    const tenantId = normalizeAnswerlatticeScopeDocumentId(
        targetScope?.tenantId ?? resolvedScope?.tenantId,
    );
    const storeId = normalizeAnswerlatticeScopeDocumentId(
        targetScope?.storeId ?? resolvedScope?.storeId,
    );
    if (!tenantId || !storeId) return null;
    const scope = {
        tenantId,
        storeId,
        role: resolvedScope?.role,
    };
    const sessionUserId = resolveCurrentSessionUserDocumentId(session);
    if (!sessionUserId) return null;

    const db = getAnswerlatticeDb();
    if (!db) return null;

    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
    const storeSnap = await storeRef.get();
    if (!storeSnap.exists) return null;

    const storeData = storeSnap.data() || {};
    if (!isAnswerlatticeActiveStoreInScope(storeData, scope, storeSnap.id)) return null;

    const isPlatformAdmin = isPlatformAdminSession(session);
    const sessionEmail = normalizeEmail(session?.user?.email);
    const userDoc = !isPlatformAdmin && sessionEmail
        ? await findAnswerlatticeAccessUser(db, sessionEmail, scope.tenantId, scope.storeId, sessionUserId)
        : null;
    const userData = userDoc?.data || {};

    if (!isPlatformAdmin) {
        if (!userDoc) return null;
        if (userData.active === false || userData.deleted === true || userData.authDisabled === true) return null;
        if (!hasCompatibleAnswerlatticeProductIdentity(userData)) return null;
        if (normalizeConsistentAnswerlatticeScopeDocumentIds([userData.tenantId, userData.tId]) !== scope.tenantId) return null;
        const userStoreIds = getUserStoreIds(userData);
        if (!userStoreIds.includes(scope.storeId)) return null;
    }

    const roles = normalizeAnswerlatticeRolesForStore(
        storeData.answerlatticeRoles,
        scope.tenantId,
        scope.storeId,
        sessionEmail || 'system',
    ).roles;
    const userAccessState = readAnswerlatticeStaffAccessState(userData);
    const storeRole = userAccessState
        ? getAnswerlatticeStaffMembership(userAccessState, scope.storeId)?.role
        : undefined;
    if (!isPlatformAdmin && !storeRole) return null;
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
            id: userDoc?.id || sessionUserId,
            email: sessionEmail,
            name: userData.name || session?.user?.name || '',
        },
    };
}

export async function requireAnswerlatticePermission(
    request: NextRequest,
    session: any,
    permission: AnswerlatticePermissionKey,
    targetScope?: AnswerlatticeAccessTargetScope,
) {
    const access = await getAnswerlatticeAccessContext(session, targetScope);
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
        response: NextResponse.json(
            { error: 'Forbidden', code: 'FORBIDDEN' },
            { headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS, status: 403 },
        ),
    };
}

export async function requireAnswerlatticeTeamPermission(request: NextRequest, session: any) {
    return requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM);
}
