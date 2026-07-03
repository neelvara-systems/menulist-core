import type { AnswerlatticeRoleDefinition, AnswerlatticeRolePermissions } from '@constant/answerlattice/permissions';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

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

const ANSWERLATTICE_STAFF_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ANSWERLATTICE_STAFF_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type AnswerlatticeStaffResponseKind =
    | 'staff_list'
    | 'staff_create'
    | 'staff_update'
    | 'staff_remove'
    | 'staff_password_reset'
    | 'staff_force_signout'
    | 'role_save'
    | 'role_delete';

type AnswerlatticeStaffResponseOptions<T> = {
    isValid: (value: unknown) => value is T;
    responseKind: AnswerlatticeStaffResponseKind;
};

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isStaffUserSummary = (value: unknown): value is AnswerlatticeStaffUserSummary => (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.email === 'string'
    && typeof value.roleId === 'string'
    && Array.isArray(value.storeIds)
    && Array.isArray(value.stores)
    && typeof value.tenantId === 'number'
);

const isRoleDefinition = (value: unknown): value is AnswerlatticeRoleDefinition => (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.name === 'string'
);

const isAnswerlatticeStaffListResponse = (value: unknown): value is AnswerlatticeStaffListResponse => (
    isRecord(value)
    && Array.isArray(value.roles)
    && value.roles.every(isRoleDefinition)
    && isRecord(value.store)
    && typeof value.store.name === 'string'
    && typeof value.store.storeId === 'number'
    && typeof value.store.tenantId === 'number'
    && Array.isArray(value.users)
    && value.users.every(isStaffUserSummary)
);

const isAnswerlatticeStaffMutationResponse = (value: unknown): value is AnswerlatticeStaffMutationResponse => (
    isRecord(value)
    && value.success === true
    && (value.user === undefined || isStaffUserSummary(value.user))
    && (value.userId === undefined || typeof value.userId === 'string')
);

const isAnswerlatticeRoleMutationResponse = (value: unknown): value is AnswerlatticeRoleMutationResponse => (
    isRecord(value)
    && value.success === true
    && Array.isArray(value.roles)
    && value.roles.every(isRoleDefinition)
    && (value.role === undefined || isRoleDefinition(value.role))
);

const getStaffResponseLogContext = (responseKind: AnswerlatticeStaffResponseKind, response: Response) => ({
    ...getBoundedAnswerlatticeStringContext('responseKind', responseKind),
    responseOk: response.ok,
    responseStatus: response.status,
});

const getStaffResponseErrorCode = (value: unknown): string | undefined => {
    if (!isRecord(value) || typeof value.code !== 'string') return undefined;
    return value.code.slice(0, 80);
};

const parseAnswerlatticeStaffResponse = async <T>(
    response: Response,
    options: AnswerlatticeStaffResponseOptions<T>,
): Promise<T> => {
    let data: unknown = null;
    try {
        data = await readJsonResponseWithLimit<unknown>(response, ANSWERLATTICE_STAFF_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_staff_response_parse_failed',
            error,
            getStaffResponseLogContext(options.responseKind, response),
        );
        const nextError = new Error('Answerlattice staff request failed') as Error & { status?: number };
        nextError.status = response.status;
        throw nextError;
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_staff_response_rejected',
            undefined,
            getStaffResponseLogContext(options.responseKind, response),
        );
        const error = new Error('Answerlattice staff request failed') as Error & { code?: string; status?: number };
        error.code = getStaffResponseErrorCode(data);
        error.status = response.status;
        throw error;
    }

    if (!options.isValid(data)) {
        logAnswerlatticeFailure(
            'answerlattice_staff_response_invalid',
            undefined,
            getStaffResponseLogContext(options.responseKind, response),
        );
        const error = new Error('Answerlattice staff request failed') as Error & { status?: number };
        error.status = response.status;
        throw error;
    }

    return data;
};

export const fetchAnswerlatticeStaffUsers = async () => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffListResponse>(
        await fetch('/api/answerlattice/staff', {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            method: 'GET',
        }),
        {
            isValid: isAnswerlatticeStaffListResponse,
            responseKind: 'staff_list',
        },
    )
);

export const createAnswerlatticeStaffUser = async (payload: {
    countryCode?: string;
    dialCode?: string;
    email?: string;
    name?: string;
    phoneNumber?: string;
    roleId?: string;
}) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(
        await fetch('/api/answerlattice/staff', {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        }),
        {
            isValid: isAnswerlatticeStaffMutationResponse,
            responseKind: 'staff_create',
        },
    )
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
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(
        await fetch('/api/answerlattice/staff', {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
        }),
        {
            isValid: isAnswerlatticeStaffMutationResponse,
            responseKind: 'staff_update',
        },
    )
);

export const removeAnswerlatticeStaffUser = async (userId: string) => {
    const params = new URLSearchParams({ userId });
    return parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(
        await fetch(`/api/answerlattice/staff?${params.toString()}`, {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            method: 'DELETE',
        }),
        {
            isValid: isAnswerlatticeStaffMutationResponse,
            responseKind: 'staff_remove',
        },
    );
};

export const requestAnswerlatticeStaffPasswordReset = async (userId: string) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(
        await fetch('/api/answerlattice/staff/password-reset', {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            body: JSON.stringify({ userId }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        }),
        {
            isValid: isAnswerlatticeStaffMutationResponse,
            responseKind: 'staff_password_reset',
        },
    )
);

export const forceSignOutAnswerlatticeStaffUser = async (userId: string) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(
        await fetch('/api/answerlattice/staff/force-signout', {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            body: JSON.stringify({ userId }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        }),
        {
            isValid: isAnswerlatticeStaffMutationResponse,
            responseKind: 'staff_force_signout',
        },
    )
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
    parseAnswerlatticeStaffResponse<AnswerlatticeRoleMutationResponse>(
        await fetch('/api/answerlattice/staff/roles', {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            method: payload.role.id ? 'PATCH' : 'POST',
        }),
        {
            isValid: isAnswerlatticeRoleMutationResponse,
            responseKind: 'role_save',
        },
    )
);

export const deleteAnswerlatticeRoleDefinition = async (roleId: string) => {
    const params = new URLSearchParams({ roleId });
    return parseAnswerlatticeStaffResponse<AnswerlatticeRoleMutationResponse>(
        await fetch(`/api/answerlattice/staff/roles?${params.toString()}`, {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            method: 'DELETE',
        }),
        {
            isValid: isAnswerlatticeRoleMutationResponse,
            responseKind: 'role_delete',
        },
    );
};
