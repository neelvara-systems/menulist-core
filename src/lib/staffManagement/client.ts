import type {
    CreateStaffInput,
    DeleteRoleInput,
    RemoveStaffInput,
    ResetStaffPasswordInput,
    RoleMutationResponse,
    SaveRoleInput,
    StaffListResponse,
    StaffMutationResponse,
    UpdateStaffInput,
} from "./types";

const parseStaffResponse = async <T>(response: Response): Promise<T> => {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data?.error || "Staff request failed") as Error & { code?: string; status?: number };
        error.code = data?.code;
        error.status = response.status;
        throw error;
    }
    return data as T;
};

export const fetchStaffUsers = async (tenantId: number, storeId: number) => {
    const params = new URLSearchParams({
        tenantId: String(tenantId),
        storeId: String(storeId),
    });

    return parseStaffResponse<StaffListResponse>(await fetch(`/api/staff?${params.toString()}`));
};

export const createStaffUser = async (payload: CreateStaffInput) => {
    return parseStaffResponse<StaffMutationResponse>(await fetch("/api/staff", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    }));
};

export const updateStaffUser = async (payload: UpdateStaffInput) => {
    return parseStaffResponse<StaffMutationResponse>(await fetch("/api/staff", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
    }));
};

export const removeStaffFromStore = async (payload: RemoveStaffInput) => {
    const params = new URLSearchParams({
        tenantId: String(payload.tenantId),
        storeId: String(payload.storeId),
        userId: payload.userId,
    });

    return parseStaffResponse<StaffMutationResponse>(await fetch(`/api/staff?${params.toString()}`, {
        method: "DELETE",
    }));
};

export const requestStaffPasswordReset = async (payload: ResetStaffPasswordInput) => {
    return parseStaffResponse<StaffMutationResponse>(await fetch("/api/staff/password-reset", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    }));
};

export const saveRoleDefinition = async (payload: SaveRoleInput) => {
    return parseStaffResponse<RoleMutationResponse>(await fetch("/api/staff/roles", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: payload.role.id ? "PATCH" : "POST",
    }));
};

export const deleteRoleDefinition = async (payload: DeleteRoleInput) => {
    const params = new URLSearchParams({
        roleId: payload.roleId,
        storeId: String(payload.storeId),
        tenantId: String(payload.tenantId),
    });

    return parseStaffResponse<RoleMutationResponse>(await fetch(`/api/staff/roles?${params.toString()}`, {
        method: "DELETE",
    }));
};
