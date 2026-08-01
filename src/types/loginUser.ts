import type { ProductId } from "@constant/product";
import type { PlatformBlockDetails } from "./platform/blocking";

export type AuthSessionStoreMapping = {
    role: string;
    storeId: number;
};

export type AuthSessionProductAccount = {
    active?: boolean;
    accessRevision?: number;
    authDisabled?: boolean;
    deleted?: boolean;
    platformRole?: string;
    role?: string;
    storeId?: number | null;
    storeIds?: number[];
    tenantId?: number | null;
};

/**
 * The compact, JSON-serializable user projection emitted by the NextAuth
 * session callback. This is deliberately not the persisted UserDataType.
 */
export type AuthSessionUserType = {
    active: boolean;
    authDisabled?: boolean;
    authIssuedAt?: number;
    blocked?: boolean;
    blockDetails?: PlatformBlockDetails;
    countryCode?: string;
    deleted?: boolean;
    dialCode?: string;
    displayEmail?: string;
    email: string;
    id: string;
    image?: string | null;
    isVerified: boolean;
    loginUsername?: string;
    name: string;
    pId: ProductId;
    phone?: string;
    phoneLoginEnabled?: boolean;
    phoneNumber?: string;
    phoneUsername?: string;
    platformRole: string;
    productAccounts?: Partial<Record<ProductId, AuthSessionProductAccount>>;
    productId: ProductId;
    profileImage?: string;
    resellerProfileId?: string;
    role: string;
    sessionRevokedAt?: string | number;
    staffAuthMode?: "email" | "owner_passcode";
    staffLoginId?: string;
    storeId: number | null;
    storeIds: number[];
    stores: AuthSessionStoreMapping[];
    tenantId: number | null;
};

interface LoginUserType {
    authIssuedAt?: number;
    expires: string;
    pId: ProductId;
    platformRole: string;
    productId?: ProductId;
    role: string;
    sId: number | null;
    sourceContext?: {
        pId: ProductId;
        sId?: number;
        tId?: number;
    };
    sourceProductId?: ProductId;
    tId: number | null;
    uId: string;
    user: AuthSessionUserType;
}

export default LoginUserType;
