import {
    type AnswerlatticeStaffAccessState,
    type AnswerlatticeStaffStoreMembership,
    getAnswerlatticeStaffMembership,
    isAnswerlatticeStaffAccountActive,
    readAnswerlatticeStaffAccessState,
} from '@lib/answerlattice/staffAccessContracts';
import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    type AnswerlatticePermissionKey,
} from '@constant/answerlattice/permissions';
import {
    MENULIST_PLATFORM_SUPPORT_USER_ROLE,
    MENULIST_PLATFORM_USER_ROLE,
} from '@constant/user';
import { normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';

export const ANSWERLATTICE_FIREBASE_CUSTOM_CLAIMS_MAX_BYTES = 1_000;

export const readActiveAnswerlatticeStaffClaimState = (
    value: unknown,
): AnswerlatticeStaffAccessState | null => {
    const state = readAnswerlatticeStaffAccessState(value);
    return state && isAnswerlatticeStaffAccountActive(value, state) ? state : null;
};

export const getAnswerlatticeStaffClaimMembership = (
    state: AnswerlatticeStaffAccessState | null,
    storeId: number,
): AnswerlatticeStaffStoreMembership | null => (
    state ? getAnswerlatticeStaffMembership(state, storeId) : null
);

export const getAnswerlatticeStaffClaimStoreIds = (
    state: AnswerlatticeStaffAccessState,
): string[] => state.memberships.map(({ storeId }) => String(storeId));

export const normalizeAnswerlatticeStaffClaimPlatformRole = (value: unknown): string => {
    const role = typeof value === 'string' ? value : '';
    if (role === MENULIST_PLATFORM_USER_ROLE || role === MENULIST_PLATFORM_SUPPORT_USER_ROLE) {
        return role;
    }
    return 'USER';
};

export const selectAnswerlatticeStaffClaimMembership = (
    state: AnswerlatticeStaffAccessState,
    params: {
        currentClaimStoreId?: unknown;
        preferredStoreId?: unknown;
    },
): AnswerlatticeStaffStoreMembership | null => {
    const currentClaimStoreId = normalizeAnswerlatticeScopeDocumentId(params.currentClaimStoreId);
    if (currentClaimStoreId) {
        const currentMembership = getAnswerlatticeStaffMembership(state, currentClaimStoreId);
        if (currentMembership) return currentMembership;
    }

    const preferredStoreId = normalizeAnswerlatticeScopeDocumentId(params.preferredStoreId);
    if (preferredStoreId) {
        const preferredMembership = getAnswerlatticeStaffMembership(state, preferredStoreId);
        if (preferredMembership) return preferredMembership;
    }

    return state.primaryMembership;
};

export const buildAnswerlatticeStaffClaimAccessProjection = (params: {
    accountActive: boolean;
    roleId: string;
    storeIds: string[];
    storeIsActive: boolean;
}) => ({
    roleId: params.accountActive && params.storeIsActive ? params.roleId : 'inactive',
    storeIds: params.accountActive && params.storeIsActive ? params.storeIds : [],
});

export const buildAnswerlatticeStaffClaimStateSignature = (params: {
    accountActive: boolean;
    admin: boolean;
    permissions: Record<AnswerlatticePermissionKey, boolean>;
    platformRole: string;
    roleId: string;
    storeId: number;
    storeIds: string[];
    storeIsActive: boolean;
    tenantId: number;
}) => JSON.stringify({
    accountActive: params.accountActive,
    admin: params.admin,
    permissions: ANSWERLATTICE_ALL_PERMISSIONS.map((permission) => [
        permission,
        params.permissions[permission] === true,
    ]),
    platformRole: params.platformRole,
    roleId: params.roleId,
    storeId: params.storeId,
    storeIds: params.storeIds,
    storeIsActive: params.storeIsActive,
    tenantId: params.tenantId,
});

export const hasAnswerlatticeTenantAdminClaim = (
    role: unknown,
    platformRole: unknown,
): boolean => {
    const normalizedRole = String(role || '').toLowerCase();
    const normalizedPlatformRole = normalizeAnswerlatticeStaffClaimPlatformRole(platformRole);
    return normalizedPlatformRole === MENULIST_PLATFORM_USER_ROLE
        || normalizedPlatformRole === MENULIST_PLATFORM_SUPPORT_USER_ROLE
        || normalizedRole === 'platform'
        || normalizedRole === 'owner';
};
