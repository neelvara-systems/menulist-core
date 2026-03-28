import { GlobalAddressType } from "@type/common";

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
    index: number;//used to display in users list dropdown in case of ording or assigning user list

    deleted: boolean;
    deletedAt: string;

    email: string;
    name: string;
    countryCode?: string;
    phoneNumber: string;
    dialCode: string;

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