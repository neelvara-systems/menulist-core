import { OutletPolicy } from '@type/multiOutlet.types';

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

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const isNullableOutletPolicy = (value: unknown): value is OutletPolicy | null => (
    value === null
    || isRecord(value)
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
    && isFiniteNumber(data.storeId)
    && isNonEmptyString(data.outletSlug)
    && isNonEmptyString(data.outletName)
    && typeof data.masterPromoted === 'boolean'
    && isNullableOutletPolicy(data.outletPolicy)
    && typeof data.tenantName === 'string'
    && (data.quantity === null || isFiniteNumber(data.quantity))
);

export const isOutletRenameResponse = (data: unknown): data is OutletRenameResponse => (
    isRecord(data)
    && data.success === true
    && isNonEmptyString(data.outletStoreId)
    && isNonEmptyString(data.outletSlug)
    && Array.isArray(data.previousOutletSlugs)
    && data.previousOutletSlugs.every((slug) => typeof slug === 'string')
);

export const isOutletDeactivateResponse = (data: unknown): data is OutletDeactivateResponse => (
    isRecord(data)
    && data.success === true
    && isFiniteNumber(data.outletStoreId)
    && typeof data.billingReduced === 'boolean'
    && (data.alreadyInactive === undefined || typeof data.alreadyInactive === 'boolean')
);
