import type {
    CreateStaffInput,
    DeleteRoleInput,
    ForceSignOutStaffInput,
    RemoveStaffInput,
    ResetStaffPasswordInput,
    RoleMutationResponse,
    SaveRoleInput,
    StaffListResponse,
    StaffMutationResponse,
    StaffMutationWithUserResponse,
    UpdateStaffInput,
} from "./types";
import { logStaffClientFailure } from "./diagnostics";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";

export const STAFF_CLIENT_RESPONSE_JSON_MAX_BYTES = 256 * 1024;
export const STAFF_CLIENT_REQUEST_POLICY = {
    cache: "no-store" as RequestCache,
    credentials: "same-origin" as RequestCredentials,
    redirect: "manual" as RequestRedirect,
};

type StaffResponseKind = "staff_list" | "staff_mutation" | "role_mutation" | "create_staff_compatibility";

type StaffResponseLogContext = Record<string, boolean | number | string | undefined>;
type StaffMutationParseOptions = {
    expectedModes?: StaffMutationResponse["mode"][];
    requireUser?: boolean;
    requireUserId?: boolean;
};
type CreateStaffCompatibilityRejectedResponse = {
    code?: string;
    error?: string;
    retryAfter?: number;
};

export type CreateStaffCompatibilityResponse = StaffMutationResponse | CreateStaffCompatibilityRejectedResponse;
type CreateStaffCompatibilitySuccessResponse = StaffMutationResponse & {
    mode: "existing_user_auth_bound";
    success: true;
    user: StaffMutationResponse["user"];
    userId: string;
};

const CREATE_STAFF_COMPATIBILITY_SUCCESS_MODES: Array<CreateStaffCompatibilitySuccessResponse["mode"]> = [
    "existing_user_auth_bound",
];

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const isPositiveSafeInteger = (value: unknown): value is number => (
    typeof value === "number" && Number.isSafeInteger(value) && value > 0
);

const isStaffStoreMappingResponse = (value: unknown): boolean => (
    isRecord(value)
    && isPositiveSafeInteger(value.storeId)
    && typeof value.name === "string"
    && typeof value.role === "string"
);

const isStaffStoreOptionResponse = (value: unknown): boolean => (
    isRecord(value)
    && isPositiveSafeInteger(value.storeId)
    && isPositiveSafeInteger(value.tenantId)
    && typeof value.name === "string"
    && Array.isArray(value.roles)
    && value.roles.every((role) => (
        isRecord(role)
        && typeof role.active === "boolean"
        && typeof role.id === "string"
        && role.id.length > 0
        && typeof role.name === "string"
        && isRecord(role.permissions)
        && Object.values(role.permissions).every((permission) => typeof permission === "boolean")
    ))
);

const isRoleDefinitionResponse = (value: unknown): boolean => (
    isRecord(value)
    && (value.active === undefined || typeof value.active === "boolean")
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.name === "string"
    && isRecord(value.permissions)
    && Object.values(value.permissions).every((permission) => typeof permission === "boolean")
);

const isStaffListResponse = (value: unknown): value is StaffListResponse => (
    isRecord(value)
    && Array.isArray(value.users)
    && value.users.every(isStaffUserSummaryResponse)
    && (
        value.stores === undefined
        || (Array.isArray(value.stores) && value.stores.every(isStaffStoreOptionResponse))
    )
);

const isStaffUserSummaryResponse = (value: unknown): value is StaffMutationResponse["user"] => (
    isRecord(value)
    && typeof value.active === "boolean"
    && typeof value.deleted === "boolean"
    && typeof value.email === "string"
    && typeof value.id === "string"
    && value.id.length > 0
    && typeof value.name === "string"
    && isPositiveSafeInteger(value.tenantId)
    && Array.isArray(value.storeIds)
    && value.storeIds.every(isPositiveSafeInteger)
    && Array.isArray(value.stores)
    && value.stores.every(isStaffStoreMappingResponse)
    && (value.isVerified === undefined || typeof value.isVerified === "boolean")
    && (value.ownerProtected === undefined || typeof value.ownerProtected === "boolean")
);

const hasConsistentStaffMutationIdentity = (value: Record<string, unknown>): boolean => {
    if (value.user === undefined || value.userId === undefined) return true;
    if (typeof value.userId !== "string" || !isStaffUserSummaryResponse(value.user)) return false;
    return value.user.id === value.userId;
};

const isStaffMutationResponse = (
    value: unknown,
    options: StaffMutationParseOptions = {},
): value is StaffMutationResponse => (
    isRecord(value)
    && value.success === true
    && (options.expectedModes === undefined || options.expectedModes.includes(value.mode as StaffMutationResponse["mode"]))
    && (!options.requireUserId || typeof value.userId === "string")
    && (!options.requireUser || isStaffUserSummaryResponse(value.user))
    && hasConsistentStaffMutationIdentity(value)
);

const isCreateStaffCompatibilityRejectedResponse = (
    value: unknown,
): value is CreateStaffCompatibilityRejectedResponse => (
    isRecord(value)
    && (
        typeof value.code === "string"
        || typeof value.error === "string"
        || typeof value.retryAfter === "number"
    )
    && (value.code === undefined || typeof value.code === "string")
    && (value.error === undefined || typeof value.error === "string")
    && (value.retryAfter === undefined || typeof value.retryAfter === "number")
);

export const isCreateStaffCompatibilitySuccessResponse = (
    value: unknown,
): value is CreateStaffCompatibilitySuccessResponse => (
    isStaffMutationResponse(value, {
        expectedModes: CREATE_STAFF_COMPATIBILITY_SUCCESS_MODES,
        requireUser: true,
        requireUserId: true,
    })
);

export const isCreateStaffCompatibilityVerificationResponse = (
    value: unknown,
    expectedUserId: string,
    expectedEmail: string,
): value is CreateStaffCompatibilitySuccessResponse => (
    isCreateStaffCompatibilitySuccessResponse(value)
    && value.mode === "existing_user_auth_bound"
    && value.userId === expectedUserId
    && value.user?.id === expectedUserId
    && value.user?.isVerified === true
    && value.email?.trim().toLowerCase() === expectedEmail.trim().toLowerCase()
);

const isRoleMutationResponse = (value: unknown): value is RoleMutationResponse => (
    isRecord(value)
    && value.success === true
    && Array.isArray(value.roles)
    && value.roles.every(isRoleDefinitionResponse)
    && (value.role === undefined || isRoleDefinitionResponse(value.role))
);

const isExpectedStaffResponse = (
    kind: StaffResponseKind,
    value: unknown,
    mutationOptions?: StaffMutationParseOptions,
): boolean => {
    if (kind === "staff_list") return isStaffListResponse(value);
    if (kind === "role_mutation") return isRoleMutationResponse(value);
    return isStaffMutationResponse(value, mutationOptions);
};

const getStaffResponseLogContext = (
    kind: StaffResponseKind,
    response: Response,
): StaffResponseLogContext => ({
    responseKind: kind,
    responseOk: response.ok,
    responseStatus: response.status,
    maxBytes: STAFF_CLIENT_RESPONSE_JSON_MAX_BYTES,
});

const createStaffClientError = (
    response: Response,
    code?: unknown,
): Error & { code?: string; status?: number } => {
    const error = new Error("Staff request failed") as Error & { code?: string; status?: number };
    if (typeof code === "string") {
        error.code = code.slice(0, 64);
    }
    error.status = response.status;
    return error;
};

const readStaffResponseJson = async (
    response: Response,
    kind: StaffResponseKind,
): Promise<unknown> => {
    try {
        return await readJsonResponseWithLimit<unknown>(
            response,
            STAFF_CLIENT_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logStaffClientFailure(
            "staff_client_response_parse_failed",
            error,
            getStaffResponseLogContext(kind, response),
        );
        return null;
    }
};

const parseStaffResponse = async <T>(
    response: Response,
    kind: StaffResponseKind,
    mutationOptions?: StaffMutationParseOptions,
): Promise<T> => {
    const data = await readStaffResponseJson(response, kind);
    if (!response.ok) {
        throw createStaffClientError(response, isRecord(data) ? data.code : undefined);
    }

    if (!isExpectedStaffResponse(kind, data, mutationOptions)) {
        logStaffClientFailure(
            "staff_client_response_invalid",
            createStaffClientError(response, "STAFF_RESPONSE_INVALID"),
            getStaffResponseLogContext(kind, response),
        );
        throw createStaffClientError(response, "STAFF_RESPONSE_INVALID");
    }

    return data as T;
};

export const readCreateStaffCompatibilityResponse = async (
    response: Response,
): Promise<CreateStaffCompatibilityResponse | null> => {
    const kind: StaffResponseKind = "create_staff_compatibility";
    const data = await readStaffResponseJson(response, kind);

    if (response.ok) {
        if (isCreateStaffCompatibilitySuccessResponse(data)) return data;

        logStaffClientFailure(
            "staff_create_compatibility_response_invalid",
            createStaffClientError(response, "CREATE_STAFF_RESPONSE_INVALID"),
            getStaffResponseLogContext(kind, response),
        );
        return null;
    }

    if (isCreateStaffCompatibilityRejectedResponse(data)) return data;

    logStaffClientFailure(
        "staff_create_compatibility_response_invalid",
        createStaffClientError(response, "CREATE_STAFF_REJECTION_RESPONSE_INVALID"),
        getStaffResponseLogContext(kind, response),
    );
    return null;
};

export const fetchStaffUsers = async (tenantId: number, storeId: number) => {
    const params = new URLSearchParams({
        tenantId: String(tenantId),
        storeId: String(storeId),
    });

    return parseStaffResponse<StaffListResponse>(await fetch(`/api/staff?${params.toString()}`, STAFF_CLIENT_REQUEST_POLICY), "staff_list");
};

export const createStaffUser = async (payload: CreateStaffInput) => {
    return parseStaffResponse<StaffMutationWithUserResponse>(await fetch("/api/staff", {
        ...STAFF_CLIENT_REQUEST_POLICY,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    }), "staff_mutation", {
        expectedModes: ["new_user_created", "existing_user_added_to_store", "existing_user_auth_bound"],
        requireUser: true,
        requireUserId: true,
    });
};

export const updateStaffUser = async (payload: UpdateStaffInput) => {
    return parseStaffResponse<StaffMutationWithUserResponse>(await fetch("/api/staff", {
        ...STAFF_CLIENT_REQUEST_POLICY,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
    }), "staff_mutation", {
        expectedModes: ["user_updated"],
        requireUser: true,
        requireUserId: true,
    });
};

export const removeStaffFromStore = async (payload: RemoveStaffInput) => {
    const params = new URLSearchParams({
        tenantId: String(payload.tenantId),
        storeId: String(payload.storeId),
        userId: payload.userId,
    });

    return parseStaffResponse<StaffMutationWithUserResponse>(await fetch(`/api/staff?${params.toString()}`, {
        ...STAFF_CLIENT_REQUEST_POLICY,
        method: "DELETE",
    }), "staff_mutation", {
        expectedModes: ["store_mapping_removed", "user_deactivated"],
        requireUser: true,
        requireUserId: true,
    });
};

export const requestStaffPasswordReset = async (payload: ResetStaffPasswordInput) => {
    return parseStaffResponse<StaffMutationWithUserResponse>(await fetch("/api/staff/password-reset", {
        ...STAFF_CLIENT_REQUEST_POLICY,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    }), "staff_mutation", {
        expectedModes: ["user_updated"],
        requireUser: true,
        requireUserId: true,
    });
};

export const forceSignOutStaffUser = async (payload: ForceSignOutStaffInput) => {
    return parseStaffResponse<StaffMutationWithUserResponse>(await fetch("/api/staff/force-signout", {
        ...STAFF_CLIENT_REQUEST_POLICY,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    }), "staff_mutation", {
        expectedModes: ["session_revoked"],
        requireUser: true,
        requireUserId: true,
    });
};

export const saveRoleDefinition = async (payload: SaveRoleInput) => {
    return parseStaffResponse<RoleMutationResponse>(await fetch("/api/staff/roles", {
        ...STAFF_CLIENT_REQUEST_POLICY,
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: payload.role.id ? "PATCH" : "POST",
    }), "role_mutation");
};

export const deleteRoleDefinition = async (payload: DeleteRoleInput) => {
    const params = new URLSearchParams({
        roleId: payload.roleId,
        storeId: String(payload.storeId),
        tenantId: String(payload.tenantId),
    });

    return parseStaffResponse<RoleMutationResponse>(await fetch(`/api/staff/roles?${params.toString()}`, {
        ...STAFF_CLIENT_REQUEST_POLICY,
        method: "DELETE",
    }), "role_mutation");
};
