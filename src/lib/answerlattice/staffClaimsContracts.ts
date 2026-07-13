import {
    type AnswerlatticeStaffAccessState,
    type AnswerlatticeStaffStoreMembership,
    getAnswerlatticeStaffMembership,
    isAnswerlatticeStaffAccountActive,
    readAnswerlatticeStaffAccessState,
} from '@lib/answerlattice/staffAccessContracts';
import {
    ECOMSAI_PLATFORM_SUPPORT_USER_ROLE,
    ECOMSAI_PLATFORM_USER_ROLE,
} from '@constant/user';

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

export const buildAnswerlatticeStaffClaimAccessProjection = (params: {
    accountActive: boolean;
    roleId: string;
    storeIds: string[];
    storeIsActive: boolean;
}) => ({
    roleId: params.accountActive && params.storeIsActive ? params.roleId : 'inactive',
    storeIds: params.accountActive ? params.storeIds : [],
});

export const hasAnswerlatticeTenantAdminClaim = (
    role: unknown,
    platformRole: unknown,
): boolean => {
    const normalizedRole = String(role || '').toLowerCase();
    const normalizedPlatformRole = String(platformRole || '').toUpperCase();
    return normalizedPlatformRole === ECOMSAI_PLATFORM_USER_ROLE
        || normalizedPlatformRole === ECOMSAI_PLATFORM_SUPPORT_USER_ROLE
        || normalizedRole === 'platform'
        || normalizedRole === 'owner';
};
