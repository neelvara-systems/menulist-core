import {
    ANSWERLATTICE_ALL_PERMISSIONS,
    type AnswerlatticeRoleDefinition,
    type AnswerlatticeRolePermissions,
} from '@constant/answerlattice/permissions';
import { PRODUCT_IDS } from '@constant/product';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export type AnswerlatticeStaffUserSummary = {
    id: string;
    accessRevision?: number;
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
    storeId: number;
    storeIds: number[];
    stores: Array<{ storeId: number; name: string; role: string }>;
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
    removed?: boolean;
    user?: AnswerlatticeStaffUserSummary;
    userId?: string;
};

export type AnswerlatticeRoleMutationResponse = {
    role?: AnswerlatticeRoleDefinition;
    roles: AnswerlatticeRoleDefinition[];
    success: boolean;
};

const ANSWERLATTICE_STAFF_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;
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

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPositiveSafeInteger = (value: unknown): value is number => (
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
);

const isPositiveSafeIntegerArray = (value: unknown): value is number[] => (
    Array.isArray(value) && value.every(isPositiveSafeInteger)
);

const isOptionalString = (value: unknown): value is string | undefined => (
    value === undefined || typeof value === 'string'
);

const isOptionalBoolean = (value: unknown): value is boolean | undefined => (
    value === undefined || typeof value === 'boolean'
);

const isOptionalSerializedTimestamp = (value: unknown): boolean => (
    value === undefined || typeof value === 'string' || typeof value === 'number'
);

const isStaffStoreMembership = (value: unknown): value is { storeId: number; name: string; role: string } => (
    isRecord(value)
    && isPositiveSafeInteger(value.storeId)
    && typeof value.role === 'string'
    && value.role.length > 0
    && value.role.length <= 120
    && value.role.trim() === value.role
    && typeof value.name === 'string'
    && value.name.length <= 200
);

const isStaffUserSummary = (value: unknown): value is AnswerlatticeStaffUserSummary => {
    if (!isRecord(value)) return false;
    const storeIds = value.storeIds;
    const stores = value.stores;
    if (!isPositiveSafeIntegerArray(storeIds) || !Array.isArray(stores) || !stores.every(isStaffStoreMembership)) return false;
    const workspaceStoreId = value.storeId;
    if (!isPositiveSafeInteger(workspaceStoreId) || !storeIds.includes(workspaceStoreId)) return false;
    const workspaceMembership = stores.find((membership) => membership.storeId === workspaceStoreId);
    if (
        typeof value.id !== 'string'
        || value.id.length === 0
        || value.id.length > 160
        || value.id.trim() !== value.id
        || typeof value.email !== 'string'
        || typeof value.roleId !== 'string'
        || value.roleId.length === 0
        || value.roleId.length > 120
        || value.roleId.trim() !== value.roleId
        || workspaceMembership?.role !== value.roleId
        || new Set(storeIds).size !== storeIds.length
        || new Set(stores.map((membership) => membership.storeId)).size !== stores.length
        || storeIds.length !== stores.length
        || !storeIds.every((storeId) => stores.some((membership) => (
            membership.storeId === storeId
        )))
        || !isPositiveSafeInteger(value.tenantId)
        || (value.accessRevision !== undefined && !(
        typeof value.accessRevision === 'number'
        && Number.isSafeInteger(value.accessRevision)
        && value.accessRevision >= 0
        ))
        || !isOptionalBoolean(value.active)
        || !isOptionalBoolean(value.authDisabled)
        || !isOptionalBoolean(value.deleted)
        || !isOptionalBoolean(value.isVerified)
        || !isOptionalSerializedTimestamp(value.sessionRevokedAt)
        || ![
            value.countryCode,
            value.createdVia,
            value.dialCode,
            value.displayEmail,
            value.loginUsername,
            value.name,
            value.phoneNumber,
            value.phoneUsername,
            value.profileImage,
            value.roleName,
            value.staffLoginId,
        ].every(isOptionalString)
        || (value.staffAuthMode !== undefined && value.staffAuthMode !== 'email' && value.staffAuthMode !== 'owner_passcode')
    ) return false;
    return true;
};

const isRoleDefinition = (value: unknown): value is AnswerlatticeRoleDefinition => (
    isRecord(value)
    && typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 120
    && value.id.trim() === value.id
    && typeof value.name === 'string' && value.name.length > 0 && value.name.length <= 80
    && typeof value.description === 'string'
    && typeof value.active === 'boolean'
    && value.pId === PRODUCT_IDS.ANSWERLATTICE
    && isPositiveSafeInteger(value.tId)
    && isPositiveSafeInteger(value.sId)
    && typeof value.createdOn === 'string'
    && typeof value.createdBy === 'string'
    && isOptionalString(value.creationRequestFingerprint)
    && isOptionalString(value.creationRequestId)
    && isOptionalString(value.modifiedOn)
    && isOptionalString(value.modifiedBy)
    && isRecord(value.permissions)
    && Object.keys(value.permissions).every((permission) => (
        ANSWERLATTICE_ALL_PERMISSIONS.includes(permission as typeof ANSWERLATTICE_ALL_PERMISSIONS[number])
    ))
    && Object.values(value.permissions).every((permission) => typeof permission === 'boolean')
);

const isAnswerlatticeStaffListResponse = (value: unknown): value is AnswerlatticeStaffListResponse => {
    if (!isRecord(value)) return false;
    const roles = value.roles;
    const store = value.store;
    const users = value.users;
    if (!Array.isArray(roles) || !roles.every(isRoleDefinition)) return false;
    if (!isRecord(store) || typeof store.name !== 'string') return false;
    const storeId = store.storeId;
    const tenantId = store.tenantId;
    if (!isPositiveSafeInteger(storeId) || !isPositiveSafeInteger(tenantId)) return false;
    if (!Array.isArray(users) || !users.every(isStaffUserSummary)) return false;

    return new Set(roles.map((role) => role.id)).size === roles.length
        && new Set(users.map((user) => user.id)).size === users.length
        && roles.every((role) => (
        role.sId === storeId && role.tId === tenantId
    )) && users.every((user) => (
        user.storeId === storeId && user.tenantId === tenantId
    ));
};

const isAnswerlatticeStaffMutationResponseBase = (value: unknown): value is AnswerlatticeStaffMutationResponse => {
    if (!isRecord(value) || value.success !== true) return false;

    const user = value.user;
    const userId = value.userId;
    if (user !== undefined && !isStaffUserSummary(user)) return false;
    if (userId !== undefined && typeof userId !== 'string') return false;
    if (user !== undefined && userId !== undefined) {
        if (!isStaffUserSummary(user) || user.id !== userId) return false;
    }

    return (value.removed === undefined || typeof value.removed === 'boolean')
        && isOptionalString(value.message)
        && isOptionalString(value.passwordResetEmailError)
        && isOptionalBoolean(value.passwordResetEmailSent)
        && (value.staffAuthMode === undefined || value.staffAuthMode === 'email' || value.staffAuthMode === 'owner_passcode')
        && isOptionalString(value.staffLoginId)
        && isOptionalString(value.temporaryPasscode);
};

const isStaffMutationWithUser = (
    value: unknown,
    expectedUserId?: string,
): value is AnswerlatticeStaffMutationResponse => (
    isAnswerlatticeStaffMutationResponseBase(value)
    && value.user !== undefined
    && value.userId !== undefined
    && value.user.id === value.userId
    && (!expectedUserId || value.userId === expectedUserId)
);

const isStaffCreateResponse = (value: unknown): value is AnswerlatticeStaffMutationResponse => (
    isStaffMutationWithUser(value)
    && (value.staffAuthMode === 'email' || value.staffAuthMode === 'owner_passcode')
);

const isStaffRemoveResponse = (
    value: unknown,
    expectedUserId: string,
): value is AnswerlatticeStaffMutationResponse => (
    isAnswerlatticeStaffMutationResponseBase(value)
    && value.removed === true
    && value.userId === expectedUserId
);

const isStaffPasswordResetResponse = (
    value: unknown,
    expectedUserId: string,
): value is AnswerlatticeStaffMutationResponse => (
    isStaffMutationWithUser(value, expectedUserId)
    && typeof value.staffLoginId === 'string'
    && value.staffLoginId.length > 0
    && typeof value.temporaryPasscode === 'string'
    && value.temporaryPasscode.length > 0
);

const isAnswerlatticeRoleMutationResponse = (
    value: unknown,
    roleRequired: boolean,
): value is AnswerlatticeRoleMutationResponse => {
    const mutationRole = isRecord(value) && isRoleDefinition(value.role) ? value.role : undefined;
    if (
        !isRecord(value)
        || value.success !== true
        || !Array.isArray(value.roles)
        || value.roles.length === 0
        || !value.roles.every(isRoleDefinition)
        || (value.role !== undefined && !isRoleDefinition(value.role))
        || (roleRequired && !mutationRole)
    ) return false;

    const roles = value.roles as AnswerlatticeRoleDefinition[];
    const roleIds = roles.map((role) => role.id);
    if (new Set(roleIds).size !== roleIds.length) return false;
    const { sId, tId } = roles[0];
    if (!roles.every((role) => role.sId === sId && role.tId === tId)) return false;
    return !mutationRole || (
        mutationRole.sId === sId
        && mutationRole.tId === tId
        && roles.some((role) => role.id === mutationRole.id)
    );
};

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
    requestId: string;
}) => (
    parseAnswerlatticeStaffResponse<AnswerlatticeStaffMutationResponse>(
        await fetch('/api/answerlattice/staff', {
            ...ANSWERLATTICE_STAFF_REQUEST_POLICY,
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        }),
        {
            isValid: isStaffCreateResponse,
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
            isValid: (value) => isStaffMutationWithUser(value, payload.userId),
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
            isValid: (value) => isStaffRemoveResponse(value, userId),
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
            isValid: (value) => isStaffPasswordResetResponse(value, userId),
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
            isValid: (value) => isStaffMutationWithUser(value, userId),
            responseKind: 'staff_force_signout',
        },
    )
);

export const saveAnswerlatticeRoleDefinition = async (payload: {
    requestId?: string;
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
            isValid: (value) => isAnswerlatticeRoleMutationResponse(value, true),
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
            isValid: (value) => isAnswerlatticeRoleMutationResponse(value, false),
            responseKind: 'role_delete',
        },
    );
};
