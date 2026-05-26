import type { CanonicaRoleDefinition, CanonicaRolePermissions } from '@constant/canonica/permissions';

export type CanonicaStaffUserSummary = {
    id: string;
    active?: boolean;
    authDisabled?: boolean;
    countryCode?: string;
    createdVia?: string;
    deleted?: boolean;
    dialCode?: string;
    displayEmail?: string;
    email: string;
    isVerified?: boolean;
    loginUsername?: string;
    name?: string;
    phoneNumber?: string;
    phoneUsername?: string;
    profileImage?: string;
    roleId: string;
    roleName?: string;
    sessionRevokedAt?: unknown;
    staffAuthMode?: 'email' | 'owner_passcode';
    staffLoginId?: string;
    storeId?: number;
    storeIds: number[];
    stores: Array<{ storeId: number; name?: string; role?: string }>;
    tenantId: number;
};

export type CanonicaStaffListResponse = {
    access?: unknown;
    roles: CanonicaRoleDefinition[];
    store: {
        name: string;
        storeId: number;
        tenantId: number;
    };
    users: CanonicaStaffUserSummary[];
};

export type CanonicaStaffMutationResponse = {
    success: boolean;
    message?: string;
    passwordResetEmailError?: string;
    passwordResetEmailSent?: boolean;
    staffAuthMode?: 'email' | 'owner_passcode';
    staffLoginId?: string;
    temporaryPasscode?: string;
    user?: CanonicaStaffUserSummary;
    userId?: string;
};

export type CanonicaRoleMutationResponse = {
    role?: CanonicaRoleDefinition;
    roles: CanonicaRoleDefinition[];
    success: boolean;
};

const parseCanonicaStaffResponse = async <T>(response: Response): Promise<T> => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data?.error || 'Canonica staff request failed') as Error & { code?: string; status?: number };
        error.code = data?.code;
        error.status = response.status;
        throw error;
    }
    return data as T;
};

export const fetchCanonicaStaffUsers = async () => (
    parseCanonicaStaffResponse<CanonicaStaffListResponse>(await fetch('/api/canonica/staff', { method: 'GET' }))
);

export const createCanonicaStaffUser = async (payload: {
    countryCode?: string;
    dialCode?: string;
    email?: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
}) => (
    parseCanonicaStaffResponse<CanonicaStaffMutationResponse>(await fetch('/api/canonica/staff', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    }))
);

export const updateCanonicaStaffUser = async (payload: {
    active?: boolean;
    countryCode?: string;
    dialCode?: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
    userId: string;
}) => (
    parseCanonicaStaffResponse<CanonicaStaffMutationResponse>(await fetch('/api/canonica/staff', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
    }))
);

export const removeCanonicaStaffUser = async (userId: string) => {
    const params = new URLSearchParams({ userId });
    return parseCanonicaStaffResponse<CanonicaStaffMutationResponse>(await fetch(`/api/canonica/staff?${params.toString()}`, {
        method: 'DELETE',
    }));
};

export const requestCanonicaStaffPasswordReset = async (userId: string) => (
    parseCanonicaStaffResponse<CanonicaStaffMutationResponse>(await fetch('/api/canonica/staff/password-reset', {
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    }))
);

export const forceSignOutCanonicaStaffUser = async (userId: string) => (
    parseCanonicaStaffResponse<CanonicaStaffMutationResponse>(await fetch('/api/canonica/staff/force-signout', {
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    }))
);

export const saveCanonicaRoleDefinition = async (payload: {
    role: {
        active?: boolean;
        description?: string;
        id?: string;
        name: string;
        permissions: CanonicaRolePermissions;
    };
}) => (
    parseCanonicaStaffResponse<CanonicaRoleMutationResponse>(await fetch('/api/canonica/staff/roles', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: payload.role.id ? 'PATCH' : 'POST',
    }))
);

export const deleteCanonicaRoleDefinition = async (roleId: string) => {
    const params = new URLSearchParams({ roleId });
    return parseCanonicaStaffResponse<CanonicaRoleMutationResponse>(await fetch(`/api/canonica/staff/roles?${params.toString()}`, {
        method: 'DELETE',
    }));
};
