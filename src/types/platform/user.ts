import { GlobalAddressType } from "@type/common";
import type { PlatformBlockDetails } from "./blocking";
import type { ProductId } from "@constant/product";

export type UserStoreMappingType = {
    storeId: number;
    name: string;
    role: string;  // Single role per store (e.g., 'owner', 'manager', 'staff')
}

export type EmergencyContactType = {
    name: string;
    phoneNumber: string;
    countryCode?: string;
    email: string;
    relation: string;
}

export type EmploymentType = {
    designation: string,
    startDate: string,
    endDate: string,
    type: string //full time, part time
    jobTitle: string //Visible to clients online
}

export type COMMISIONS_TYPE = {
    product: any,
    service: any,
    voucher: any,
    giftCard: any,

}
export type UserDataType = {
    id?: string;
    isVerified: boolean;
    active: boolean;
    blocked?: boolean;
    blockDetails?: PlatformBlockDetails;
    index: number;//used to display in users list dropdown in case of ording or assigning user list

    deleted: boolean;
    deletedAt: string;

    email: string;
    displayEmail?: string;
    name: string;
    countryCode?: string;
    phoneNumber: string;
    dialCode: string;
    phoneUsername?: string;
    loginUsername?: string;
    staffAuthMode?: "email" | "owner_passcode";
    staffLoginId?: string;
    phoneLoginEnabled?: boolean;

    alternatePhoneNumber?: {
        countryCode?: string;
        phoneNumber: string;
        dialCode: string;
    };
    platformRole: string;
    role?: string;

    //auth system keys
    id_token: string;
    access_token: string;
    providerAccountId: string;
    token_type: string;
    scope: string;
    expires_at: number;
    provider: string;

    // type: string;
    profileImage: string;

    tenantId: number;
    storeId: number;//defalt store id
    pId?: ProductId;
    productId?: ProductId;
    stores: UserStoreMappingType[],
    storeIds: number[],

    employment: EmploymentType,

    emergencyContact: EmergencyContactType,

    commissions: COMMISIONS_TYPE,

    defaultAddress: string,
    addresses: GlobalAddressType[],

    notes: string,
    skills: string,
    birthday: string,
    color: string
    gender: string;

    additionalDocuments: { label: string, url: string, size?: number, type: string }[],

    preferances: any,
}
