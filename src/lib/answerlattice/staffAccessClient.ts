import type { AnswerlatticeRoleDefinition, AnswerlatticeRolePermissions } from '@constant/answerlattice/permissions';

export type AnswerlatticeStaffUserSummary = {
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

export type AnswerlatticeStaffListResponse = {
    access?: unknown;
    roles: AnswerlatticeRoleDefinition[];
    store: {
        name: string;
        storeId: number;
        tenantId: number;
    };
    users: AnswerlatticeStaffUserSummary[];
};

export type AnswerlatticeStaffMutationResponse = {
    success: boolean;
    message?: string;
    passwordResetEmailError?: string;
    passwordResetEmailSent?: boolean;
    staffAuthMode?: 'email' | 'owner_passcode';
    staffLoginId?: string;
    temporaryPasscode?: string;
    user?: AnswerlatticeStaffUserSummary;
    userId?: string;
};

export type AnswerlatticeRoleMutationResponse = {
    role?: AnswerlatticeRoleDefinition;
    roles: AnswerlatticeRoleDefinition[];
    success: boolean;
};

const parseAnswerlatticeStaffResponse = async <T>(response: Response): Promise<T> => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data?.error || 'Answerlattice staff request failed') as Error & { code?: string; status?: number };
        error.code = data?.code;
        error.status = response.status;
        throw error;
    }
    return data as T;
};

export const fetchAnswerlatticeStaffUsers = async () => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffListResponse>(await fetch('/api/answerlattice/staff', { method: 'GET' }))
);

export const createAnswerlatticeStaffUser = async (payload: {
    countryCode?: string;
    dialCode?: string;
    email?: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
}) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(await fetch('/api/answerlattice/staff', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    }))
);

export const updateAnswerlatticeStaffUser = async (payload: {
    active?: boolean;
    countryCode?: string;
    dialCode?: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
    userId: string;
}) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(await fetch('/api/answerlattice/staff', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
    }))
);

export const removeAnswerlatticeStaffUser = async (userId: string) => {
    const params = new URLSearchParams({ userId });
    return parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(await fetch(`/api/answerlattice/staff?${params.toString()}`, {
        method: 'DELETE',
    }));
};

export const requestAnswerlatticeStaffPasswordReset = async (userId: string) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(await fetch('/api/answerlattice/staff/password-reset', {
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    }))
);

export const forceSignOutAnswerlatticeStaffUser = async (userId: string) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(await fetch('/api/answerlattice/staff/force-signout', {
        body: JSON.stringify({ userId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    }))
);

export const saveAnswerlatticeRoleDefinition = async (payload: {
    role: {
        active?: boolean;
        description?: string;
        id?: string;
        name: string;
        permissions: AnswerlatticeRolePermissions;
    };
}) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeRoleMutationResponse>(await fetch('/api/answerlattice/staff/roles', {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: payload.role.id ? 'PATCH' : 'POST',
    }))
);

export const deleteAnswerlatticeRoleDefinition = async (roleId: string) => {
    const params = new URLSearchParams({ roleId });
    return parseAnswerlatticeStaffResponse<AnswerlatticeRoleMutationResponse>(await fetch(`/api/answerlattice/staff/roles?${params.toString()}`, {
        method: 'DELETE',
    }));
};
