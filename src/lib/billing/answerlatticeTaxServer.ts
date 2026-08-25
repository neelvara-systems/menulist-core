import type { Currency } from '@data/common';
import {
    BillingTaxConfigurationError,
    calculateBillingTaxSnapshot,
    type BillingProfile,
    type BillingTaxSnapshot,
    type BillingTaxSupplierConfig,
} from '@data/shared/billingTaxPolicy';
import { answerlatticeServerEnv } from '@lib/env/answerlatticeServerEnv';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';

const exactBoolean = (value: string | undefined): boolean => value === 'true';

export const assertAnswerlatticeSyntheticBillingQaBoundary = (env: {
    syntheticQaEnabled?: string;
    razorpayKeyId?: string;
    vercelEnv?: string;
    vercelTargetEnv?: string;
}): void => {
    if (!exactBoolean(env.syntheticQaEnabled)) return;

    const isHostedQa = env.vercelEnv === 'preview' && env.vercelTargetEnv === 'qa';
    const isRazorpayTestMode = env.razorpayKeyId?.startsWith('rzp_test_') === true;
    if (!isHostedQa || !isRazorpayTestMode) {
        throw new BillingTaxConfigurationError(
            'Synthetic Answerlattice billing supplier configuration is restricted to hosted QA with Razorpay Test Mode.',
        );
    }
};

export const getAnswerlatticeTaxSupplierConfig = (): BillingTaxSupplierConfig => {
    assertAnswerlatticeSyntheticBillingQaBoundary({
        syntheticQaEnabled: answerlatticeServerEnv.billingSyntheticQaEnabled,
        razorpayKeyId: menulistServerEnv.razorpayKeyId,
        vercelEnv: process.env.VERCEL_ENV,
        vercelTargetEnv: process.env.VERCEL_TARGET_ENV,
    });

    return {
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
    };
};

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
