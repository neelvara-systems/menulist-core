import type { Currency } from '@data/common';
import { INDIAN_GST_STATES } from '@data/shared/indianGstStates';

export const BILLING_TAX_POLICY_VERSION = 'IN_GST_2026_08_V1' as const;
export const MENULIST_BILLING_TAX_POLICY_VERSION = BILLING_TAX_POLICY_VERSION;
export const INDIA_GST_RATE_BPS = 1_800;

export type BillingProfile = {
    legalName: string;
    email: string;
    countryCode: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    region: string;
    indianStateCode?: string;
    postalCode: string;
    taxId?: string;
    taxIdType?: 'GSTIN' | 'OTHER';
};

export type BillingTaxSupplierConfig = {
    productName: string;
    legalIdentityVerified: boolean;
    merchantEntityId: string;
    legalName: string;
    registeredAddress: string;
    gstin: string;
    supplierStateCode: string;
    sacCode: string;
    internationalCheckoutEnabled: boolean;
    exportZeroRatingEnabled: boolean;
    lutReference?: string;
};

export type MenuListTaxSupplierConfig = BillingTaxSupplierConfig;

export type BillingTaxSnapshot = {
    policyVersion: typeof BILLING_TAX_POLICY_VERSION;
    merchantEntityId: string;
    supplierLegalName: string;
    supplierRegisteredAddress: string;
    supplierGstin: string;
    supplierStateCode: string;
    sacCode: string;
    billingProfile: BillingProfile;
    currency: Currency;
    supplyClassification: 'domestic_intra_state' | 'domestic_inter_state' | 'export_zero_rated_lut';
    taxTreatment: 'cgst_sgst' | 'igst' | 'zero_rated_export';
    destinationTaxStatus: 'not_applicable' | 'merchant_review_required';
    baseUnitAmount: number;
    quantity: number;
    baseAmount: number;
    taxRateBps: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    taxAmount: number;
    grossUnitAmount: number;
    grossAmount: number;
    lutReference?: string;
};

export type MenuListTaxSnapshot = BillingTaxSnapshot;

export class BillingTaxConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BillingTaxConfigurationError';
        Object.setPrototypeOf(this, BillingTaxConfigurationError.prototype);
    }
}

export class BillingTaxProfileError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'BillingTaxProfileError';
        Object.setPrototypeOf(this, BillingTaxProfileError.prototype);
    }
}

const GSTIN_PATTERN = /^([0-9]{2})[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const INDIAN_GST_STATE_CODES = new Set<string>(INDIAN_GST_STATES.map((state) => state.code));

const normalizeText = (value: string, max: number): string => value.trim().replace(/\s+/g, ' ').slice(0, max);
const calculateRoundedBasisPointAmount = (amount: number, rateBps: number): number => {
    const wholeRateBlocks = Math.floor(amount / 10_000) * rateBps;
    const remainderAmount = amount % 10_000;
    const roundedRemainder = Math.round((remainderAmount * rateBps) / 10_000);
    const result = wholeRateBlocks + roundedRemainder;
    if (!Number.isSafeInteger(result) || result < 0) {
        throw new BillingTaxProfileError('Billing amount is invalid.');
    }
    return result;
};

export const normalizeBillingProfile = (profile: BillingProfile): BillingProfile => {
    const countryCode = normalizeText(profile.countryCode, 2).toUpperCase();
    const indianStateCode = profile.indianStateCode
        ? normalizeText(profile.indianStateCode, 2)
        : undefined;
    const taxId = profile.taxId ? normalizeText(profile.taxId, 32).toUpperCase() : undefined;
    const normalized: BillingProfile = {
        legalName: normalizeText(profile.legalName, 160),
        email: normalizeText(profile.email, 254).toLowerCase(),
        countryCode,
        addressLine1: normalizeText(profile.addressLine1, 240),
        addressLine2: profile.addressLine2 ? normalizeText(profile.addressLine2, 240) : undefined,
        city: normalizeText(profile.city, 120),
        region: normalizeText(profile.region, 120),
        indianStateCode,
        postalCode: normalizeText(profile.postalCode, 24).toUpperCase(),
        taxId,
        taxIdType: taxId ? (countryCode === 'IN' ? 'GSTIN' : 'OTHER') : undefined,
    };

    if (!normalized.legalName || !normalized.email || !normalized.addressLine1 || !normalized.city || !normalized.region || !normalized.postalCode) {
        throw new BillingTaxProfileError('Complete billing details are required.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
        throw new BillingTaxProfileError('Billing email is invalid.');
    }
    if (!/^[A-Z]{2}$/.test(countryCode)) {
        throw new BillingTaxProfileError('Billing country is invalid.');
    }
    if (countryCode === 'IN') {
        if (!indianStateCode || !INDIAN_GST_STATE_CODES.has(indianStateCode)) {
            throw new BillingTaxProfileError('Select the Indian billing state.');
        }
        if (taxId) {
            const match = GSTIN_PATTERN.exec(taxId);
            if (!match || match[1] !== indianStateCode) {
                throw new BillingTaxProfileError('GSTIN does not match the selected billing state.');
            }
        }
    }
    return normalized;
};

export const calculateBillingTaxSnapshot = ({
    baseUnitAmount,
    billingProfile,
    currency,
    quantity,
    supplier,
}: {
    baseUnitAmount: number;
    billingProfile: BillingProfile;
    currency: Currency;
    quantity: number;
    supplier: BillingTaxSupplierConfig;
}): BillingTaxSnapshot => {
    if (!Number.isSafeInteger(baseUnitAmount) || baseUnitAmount <= 0 || !Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new BillingTaxProfileError('Billing amount is invalid.');
    }
    if (!supplier.legalIdentityVerified) {
        throw new BillingTaxConfigurationError(`${normalizeText(supplier.productName, 80) || 'Product'} billing legal identity is not verified.`);
    }
    const merchantEntityId = normalizeText(supplier.merchantEntityId, 120);
    const supplierLegalName = normalizeText(supplier.legalName, 200);
    const supplierRegisteredAddress = normalizeText(supplier.registeredAddress, 500);
    const supplierStateCode = normalizeText(supplier.supplierStateCode, 2);
    const sacCode = normalizeText(supplier.sacCode, 24);
    const lutReference = supplier.lutReference ? normalizeText(supplier.lutReference, 120) : undefined;
    if (
        !merchantEntityId
        || !supplierLegalName
        || !supplierRegisteredAddress
        || !supplier.gstin.trim()
        || !INDIAN_GST_STATE_CODES.has(supplierStateCode)
        || !sacCode
    ) {
        throw new BillingTaxConfigurationError(`${normalizeText(supplier.productName, 80) || 'Product'} billing supplier details are incomplete.`);
    }
    const supplierGstin = supplier.gstin.trim().toUpperCase();
    const supplierGstinMatch = GSTIN_PATTERN.exec(supplierGstin);
    if (!supplierGstinMatch || supplierGstinMatch[1] !== supplierStateCode) {
        throw new BillingTaxConfigurationError(`${normalizeText(supplier.productName, 80) || 'Product'} supplier GST details are invalid.`);
    }

    const profile = normalizeBillingProfile(billingProfile);
    const isDomestic = profile.countryCode === 'IN';
    if ((isDomestic && currency !== 'INR') || (!isDomestic && currency !== 'USD')) {
        throw new BillingTaxProfileError('Pricing currency does not match the billing country.');
    }
    if (!isDomestic && (!supplier.internationalCheckoutEnabled || !supplier.exportZeroRatingEnabled || !lutReference)) {
        throw new BillingTaxConfigurationError('International billing is not available until export tax setup is complete.');
    }

    const baseAmount = baseUnitAmount * quantity;
    if (!Number.isSafeInteger(baseAmount)) throw new BillingTaxProfileError('Billing amount is invalid.');

    if (!isDomestic) {
        return {
            policyVersion: BILLING_TAX_POLICY_VERSION,
            merchantEntityId,
            supplierLegalName,
            supplierRegisteredAddress,
            supplierGstin,
            supplierStateCode,
            sacCode,
            billingProfile: profile,
            currency,
            supplyClassification: 'export_zero_rated_lut',
            taxTreatment: 'zero_rated_export',
            destinationTaxStatus: 'merchant_review_required',
            baseUnitAmount,
            quantity,
            baseAmount,
            taxRateBps: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            taxAmount: 0,
            grossUnitAmount: baseUnitAmount,
            grossAmount: baseAmount,
            lutReference,
        };
    }

    const unitTaxAmount = calculateRoundedBasisPointAmount(baseUnitAmount, INDIA_GST_RATE_BPS);
    const taxAmount = unitTaxAmount * quantity;
    const grossUnitAmount = baseUnitAmount + unitTaxAmount;
    const grossAmount = grossUnitAmount * quantity;
    if (
        !Number.isSafeInteger(taxAmount)
        || !Number.isSafeInteger(grossUnitAmount)
        || !Number.isSafeInteger(grossAmount)
    ) {
        throw new BillingTaxProfileError('Billing amount is invalid.');
    }
    const isIntraState = profile.indianStateCode === supplierStateCode;
    const cgstAmount = isIntraState ? Math.floor(taxAmount / 2) : 0;
    const sgstAmount = isIntraState ? taxAmount - cgstAmount : 0;

    return {
        policyVersion: BILLING_TAX_POLICY_VERSION,
        merchantEntityId,
        supplierLegalName,
        supplierRegisteredAddress,
        supplierGstin,
        supplierStateCode,
        sacCode,
        billingProfile: profile,
        currency,
        supplyClassification: isIntraState ? 'domestic_intra_state' : 'domestic_inter_state',
        taxTreatment: isIntraState ? 'cgst_sgst' : 'igst',
        destinationTaxStatus: 'not_applicable',
        baseUnitAmount,
        quantity,
        baseAmount,
        taxRateBps: INDIA_GST_RATE_BPS,
        cgstAmount,
        sgstAmount,
        igstAmount: isIntraState ? 0 : taxAmount,
        taxAmount,
        grossUnitAmount,
        grossAmount,
    };
};

export const calculateMenuListTaxSnapshot = (params: Omit<Parameters<typeof calculateBillingTaxSnapshot>[0], 'supplier'> & {
    supplier: Omit<BillingTaxSupplierConfig, 'productName'> & { productName?: string };
}): MenuListTaxSnapshot => calculateBillingTaxSnapshot({
    ...params,
    supplier: { ...params.supplier, productName: params.supplier.productName || 'MenuList' },
});

export const resizeMenuListTaxSnapshot = (
    snapshot: MenuListTaxSnapshot,
    quantity: number,
): MenuListTaxSnapshot => {
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
        throw new BillingTaxProfileError('Billing quantity is invalid.');
    }

    const baseAmount = snapshot.baseUnitAmount * quantity;
    const grossAmount = snapshot.grossUnitAmount * quantity;
    const taxAmount = grossAmount - baseAmount;
    if (
        !Number.isSafeInteger(baseAmount)
        || !Number.isSafeInteger(grossAmount)
        || !Number.isSafeInteger(taxAmount)
        || taxAmount < 0
    ) {
        throw new BillingTaxProfileError('Billing amount is invalid.');
    }

    const isSplitDomesticTax = snapshot.taxTreatment === 'cgst_sgst';
    const cgstAmount = isSplitDomesticTax ? Math.floor(taxAmount / 2) : 0;

    return {
        ...snapshot,
        quantity,
        baseAmount,
        grossAmount,
        taxAmount,
        cgstAmount,
        sgstAmount: isSplitDomesticTax ? taxAmount - cgstAmount : 0,
        igstAmount: snapshot.taxTreatment === 'igst' ? taxAmount : 0,
    };
};

export const resolveMenuListTaxSettlementSnapshot = ({
    amount,
    currency,
    quantity,
    snapshot,
}: {
    amount: number;
    currency: string;
    quantity: number;
    snapshot: MenuListTaxSnapshot;
}): MenuListTaxSnapshot | null => {
    const current = resizeMenuListTaxSnapshot(snapshot, quantity);
    return Number.isSafeInteger(amount)
        && amount === current.grossAmount
        && currency.trim().toUpperCase() === current.currency
        ? current
        : null;
};

export const resizeBillingTaxSnapshot = resizeMenuListTaxSnapshot;
export const resolveBillingTaxSettlementSnapshot = resolveMenuListTaxSettlementSnapshot;
