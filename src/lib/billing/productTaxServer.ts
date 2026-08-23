import { PRODUCT_IDS, type ProductId } from '@constant/product';
import type { Currency } from '@data/common';
import type { BillingProfile, BillingTaxSnapshot } from '@data/shared/billingTaxPolicy';
import { calculateConfiguredAnswerlatticeTax } from '@lib/billing/answerlatticeTaxServer';
import { calculateConfiguredMenuListTax } from '@lib/billing/menulistTaxServer';

export const productUsesConfiguredTax = (productId: ProductId): boolean => (
    productId === PRODUCT_IDS.MENULIST || productId === PRODUCT_IDS.ANSWERLATTICE
);

export const calculateConfiguredProductTax = (params: {
    productId: ProductId;
    baseUnitAmount: number;
    billingProfile: BillingProfile;
    currency: Currency;
    quantity: number;
}): BillingTaxSnapshot => {
    const { productId, ...taxParams } = params;
    if (productId === PRODUCT_IDS.MENULIST) return calculateConfiguredMenuListTax(taxParams);
    if (productId === PRODUCT_IDS.ANSWERLATTICE) return calculateConfiguredAnswerlatticeTax(taxParams);
    throw new Error('Product tax configuration is unavailable.');
};

export const getBillingProfileFromTaxSnapshot = (value: unknown): BillingProfile | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const snapshot = value as Partial<BillingTaxSnapshot>;
    return snapshot.billingProfile && typeof snapshot.billingProfile === 'object'
        ? snapshot.billingProfile
        : null;
};
