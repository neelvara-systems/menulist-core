import type { Currency } from '@data/common';
import {
    calculateBillingTaxSnapshot,
    type BillingProfile,
    type BillingTaxSnapshot,
    type BillingTaxSupplierConfig,
} from '@data/shared/billingTaxPolicy';
import { answerlatticeServerEnv } from '@lib/env/answerlatticeServerEnv';

const exactBoolean = (value: string | undefined): boolean => value === 'true';

export const getAnswerlatticeTaxSupplierConfig = (): BillingTaxSupplierConfig => ({
    productName: 'Answerlattice',
    legalIdentityVerified: exactBoolean(answerlatticeServerEnv.billingLegalIdentityVerified),
    merchantEntityId: answerlatticeServerEnv.billingMerchantEntityId || '',
    legalName: answerlatticeServerEnv.billingLegalSupplierName || '',
    registeredAddress: answerlatticeServerEnv.billingRegisteredAddress || '',
    gstin: answerlatticeServerEnv.billingGstin || '',
    supplierStateCode: answerlatticeServerEnv.billingSupplierStateCode || '',
    sacCode: answerlatticeServerEnv.billingSacCode || '',
    internationalCheckoutEnabled: exactBoolean(answerlatticeServerEnv.billingInternationalCheckoutEnabled),
    exportZeroRatingEnabled: exactBoolean(answerlatticeServerEnv.billingExportZeroRatingEnabled),
    lutReference: answerlatticeServerEnv.billingLutReference,
});

export const resolveAnswerlatticeBillingCurrency = (countryCode: string): Currency => (
    countryCode.trim().toUpperCase() === 'IN' ? 'INR' : 'USD'
);

export const calculateConfiguredAnswerlatticeTax = (params: {
    baseUnitAmount: number;
    billingProfile: BillingProfile;
    currency: Currency;
    quantity: number;
}): BillingTaxSnapshot => calculateBillingTaxSnapshot({
    ...params,
    supplier: getAnswerlatticeTaxSupplierConfig(),
});
