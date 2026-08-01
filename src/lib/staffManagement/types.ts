import type { RolePermissions, StoreRoleDataType } from "@type/platform/roles";
import type { UserStoreMappingType } from "@type/platform/user";

export type StaffListResponse = {
    stores?: StaffStoreOption[];
    users: StaffUserSummary[];
};

export type StaffMutationResponse = {
    success: boolean;
    mode?: "new_user_created" | "existing_user_added_to_store" | "existing_user_auth_bound" | "user_updated" | "store_mapping_removed" | "user_deactivated" | "session_revoked";
    user?: StaffUserSummary;
    userId?: string;
    email?: string;
    message?: string;
    passwordResetEmailSent?: boolean;
    passwordResetEmailError?: string;
    staffAuthMode?: StaffAuthMode;
    staffLoginId?: string;
    temporaryPasscode?: string;
};

export type StaffMutationWithUserResponse = StaffMutationResponse & {
    success: true;
    user: StaffUserSummary;
    userId: string;
};

export type RoleMutationResponse = {
    role?: StoreRoleDataType;
    roles: StoreRoleDataType[];
    success: boolean;
};

export type StaffUserSummary = {
    id: string;
    email: string;
    displayEmail?: string;
    name?: string;
    active?: boolean;
    authDisabled?: boolean;
    deleted?: boolean;
    isVerified?: boolean;
    tenantId: number;
    storeId?: number;
    storeIds: number[];
    stores: UserStoreMappingType[];
    platformRole?: string;
    role?: string;
    countryCode?: string;
    dialCode?: string;
    phoneNumber?: string;
    alternatePhoneNumber?: {
        countryCode?: string;
        dialCode?: string;
        phoneNumber?: string;
    };
    profileImage?: string;
    createdVia?: string;
    staffAuthMode?: StaffAuthMode;
    staffLoginId?: string;
    loginUsername?: string;
    ownerProtected?: boolean;
    phoneUsername?: string;
    sessionRevokedAt?: unknown;
};

export type StaffFormUser = Omit<StaffUserSummary, "id"> & {
    id?: string;
};

export type StaffStoreMappingInput = {
    storeId: number;
    name?: string;
    role?: string;
};

export type StaffStoreOption = {
    active?: boolean;
    isMaster?: boolean;
    name: string;
    roles: Array<{
        active: boolean;
        description?: string;
        id: string;
        name: string;
        permissions: RolePermissions;
    }>;
    storeId: number;
    tenantId: number;
};

export type StaffAuthMode = "email" | "owner_passcode";

export type CreateStaffInput = {
    email?: string;
    name?: string;
    tenantId: number;
    storeId: number;
    storeName?: string;
    role?: string;
    countryCode?: string;
    dialCode?: string;
    phoneNumber?: string;
};

export type UpdateStaffInput = {
    userId: string;
    tenantId: number;
    name?: string;
    active?: boolean;
    storeId?: number;
    stores?: StaffStoreMappingInput[];
    countryCode?: string;
    dialCode?: string;
    phoneNumber?: string;
    alternatePhoneNumber?: {
        countryCode?: string;
        dialCode?: string;
        phoneNumber?: string;
    };
};

export type RemoveStaffInput = {
    userId: string;
    tenantId: number;
    storeId: number;
};

export type ResetStaffPasswordInput = {
    userId: string;
    tenantId: number;
    storeId: number;
};

export type ForceSignOutStaffInput = {
    userId: string;
    tenantId: number;
    storeId: number;
};

export type SaveRoleInput = {
    role: {
        active?: boolean;
        description?: string;
        id?: string;
        name: string;
        permissions: RolePermissions;
    };
    storeId: number;
    tenantId: number;
};

export type DeleteRoleInput = {
    roleId: string;
    storeId: number;
    tenantId: number;
};
