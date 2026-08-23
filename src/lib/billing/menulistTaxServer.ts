import {
    calculateMenuListTaxSnapshot,
    type BillingProfile,
    type MenuListTaxSnapshot,
    type MenuListTaxSupplierConfig,
} from '@data/shared/billingTaxPolicy';
import type { Currency } from '@data/common';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';

const exactBoolean = (value: string | undefined): boolean => value === 'true';

export const getMenuListTaxSupplierConfig = (): MenuListTaxSupplierConfig => ({
    legalIdentityVerified: exactBoolean(menulistServerEnv.billingLegalIdentityVerified),
    merchantEntityId: menulistServerEnv.billingMerchantEntityId || '',
    legalName: menulistServerEnv.billingLegalSupplierName || '',
    registeredAddress: menulistServerEnv.billingRegisteredAddress || '',
    gstin: menulistServerEnv.billingGstin || '',
    supplierStateCode: menulistServerEnv.billingSupplierStateCode || '',
    sacCode: menulistServerEnv.billingSacCode || '',
    internationalCheckoutEnabled: exactBoolean(menulistServerEnv.billingInternationalCheckoutEnabled),
    exportZeroRatingEnabled: exactBoolean(menulistServerEnv.billingExportZeroRatingEnabled),
    lutReference: menulistServerEnv.billingLutReference,
});

export const calculateConfiguredMenuListTax = (params: {
    baseUnitAmount: number;
    billingProfile: BillingProfile;
    currency: Currency;
    quantity: number;
}): MenuListTaxSnapshot => calculateMenuListTaxSnapshot({
    ...params,
    supplier: getMenuListTaxSupplierConfig(),
});

export const getBillingProfileFromTaxSnapshot = (value: unknown): BillingProfile | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }
    const snapshot = value as Partial<MenuListTaxSnapshot>;
    return snapshot.billingProfile && typeof snapshot.billingProfile === 'object'
        ? snapshot.billingProfile
        : null;
};
