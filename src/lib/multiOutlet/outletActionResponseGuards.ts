import { DEFAULT_OUTLET_POLICY, OutletPolicy } from '@type/multiOutlet.types';

export const MULTI_OUTLET_ACTION_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};
export const MULTI_OUTLET_ACTION_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
export const OUTLET_LOCATION_PAYMENT_REQUIRED_CODE = 'OUTLET_LOCATION_PAYMENT_REQUIRED';
export const OUTLET_ADD_PAID_LOCATION_ACTION = 'ADD_PAID_LOCATION';

export type OutletCreateResponse = {
    masterPromoted: boolean;
    outletName: string;
    outletPolicy: OutletPolicy | null;
    outletSlug: string;
    quantity: number | null;
    storeId: number;
    success: true;
    tenantName: string;
};

export type OutletRenameResponse = {
    outletSlug: string;
    outletStoreId: string;
    previousOutletSlugs: string[];
    success: true;
};

export type OutletDeactivateResponse = {
    alreadyInactive?: boolean;
    billingActionRequired?: 'CONTACT_SUPPORT' | null;
    billingReductionPending?: boolean;
    billingReduced: boolean;
    outletStoreId: number;
    success: true;
};

export const createMultiOutletStatusError = (
    failureCode: string,
    status?: number,
    code?: string,
): Error & { code?: string; status?: number } => Object.assign(new Error(failureCode), {
    code,
    status,
});

export const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isPositiveSafeInteger = (value: unknown): value is number => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value > 0
);

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const isOutletSlug = (value: unknown): value is string => (
    typeof value === 'string'
    && value.length >= 1
    && value.length <= 60
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
);

const isOutletDocumentId = (value: unknown): value is string => (
    typeof value === 'string'
    && /^(?:[1-9]\d*)$/.test(value)
    && Number.isSafeInteger(Number(value))
);

const isNullableOutletPolicy = (value: unknown): value is OutletPolicy | null => (
    value === null
    || (
        isRecord(value)
        && Object.keys(DEFAULT_OUTLET_POLICY).every((key) => typeof value[key] === 'boolean')
    )
);

export const isOutletPaymentRequiredResponse = (data: unknown): boolean => (
    isRecord(data)
    && (
        data.code === OUTLET_LOCATION_PAYMENT_REQUIRED_CODE
        || data.billingAction === OUTLET_ADD_PAID_LOCATION_ACTION
    )
);

export const isOutletCreateResponse = (data: unknown): data is OutletCreateResponse => (
    isRecord(data)
    && data.success === true
    && isPositiveSafeInteger(data.storeId)
    && isOutletSlug(data.outletSlug)
    && isNonEmptyString(data.outletName)
    && typeof data.masterPromoted === 'boolean'
    && isNullableOutletPolicy(data.outletPolicy)
    && isNonEmptyString(data.tenantName)
    && (data.quantity === null || isPositiveSafeInteger(data.quantity))
);

export const isOutletRenameResponse = (
    data: unknown,
    expectedOutletStoreId?: string | number,
    expectedOutletSlug?: string,
): data is OutletRenameResponse => (
    isRecord(data)
    && data.success === true
    && isOutletDocumentId(data.outletStoreId)
    && isOutletSlug(data.outletSlug)
    && (
        expectedOutletStoreId === undefined
        || data.outletStoreId === String(expectedOutletStoreId)
    )
    && (
        expectedOutletSlug === undefined
        || data.outletSlug === expectedOutletSlug
    )
    && Array.isArray(data.previousOutletSlugs)
    && data.previousOutletSlugs.length <= 20
    && data.previousOutletSlugs.every(isOutletSlug)
);

export const isOutletDeactivateResponse = (
    data: unknown,
    expectedOutletStoreId?: string | number,
): data is OutletDeactivateResponse => (
    isRecord(data)
    && data.success === true
    && isPositiveSafeInteger(data.outletStoreId)
    && (
        expectedOutletStoreId === undefined
        || data.outletStoreId === Number(expectedOutletStoreId)
    )
    && typeof data.billingReduced === 'boolean'
    && (data.alreadyInactive === undefined || typeof data.alreadyInactive === 'boolean')
    && (data.billingReductionPending === undefined || typeof data.billingReductionPending === 'boolean')
    && (
        data.billingActionRequired === undefined
        || data.billingActionRequired === null
        || data.billingActionRequired === 'CONTACT_SUPPORT'
    )
);
