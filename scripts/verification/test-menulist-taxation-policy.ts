import assert from 'node:assert/strict';
import {
    BillingTaxConfigurationError,
    BillingTaxProfileError,
    calculateMenuListTaxSnapshot,
    resizeMenuListTaxSnapshot,
    resolveMenuListTaxSettlementSnapshot,
    type BillingProfile,
    type MenuListTaxSupplierConfig,
} from '@data/shared/billingTaxPolicy';

const supplier: MenuListTaxSupplierConfig = {
    legalIdentityVerified: true,
    merchantEntityId: 'merchant_test',
    legalName: 'Example Supplier Private Limited',
    registeredAddress: 'Mumbai, Maharashtra, India',
    gstin: '27ABCDE1234F1Z5',
    supplierStateCode: '27',
    sacCode: '9983',
    internationalCheckoutEnabled: false,
    exportZeroRatingEnabled: false,
};

const indiaProfile = (stateCode = '27'): BillingProfile => ({
    legalName: 'Example Customer',
    email: 'billing@example.com',
    countryCode: 'IN',
    addressLine1: '1 Example Road',
    city: 'Mumbai',
    region: stateCode === '27' ? 'Maharashtra' : 'Karnataka',
    indianStateCode: stateCode,
    postalCode: '400001',
});

assert.throws(() => calculateMenuListTaxSnapshot({
    baseUnitAmount: 59_900,
    billingProfile: indiaProfile(),
    currency: 'INR',
    quantity: 1,
    supplier: { ...supplier, legalIdentityVerified: false },
}), BillingTaxConfigurationError);

const intra = calculateMenuListTaxSnapshot({
    baseUnitAmount: 59_900,
    billingProfile: indiaProfile(),
    currency: 'INR',
    quantity: 1,
    supplier,
});
assert.equal(intra.taxTreatment, 'cgst_sgst');
assert.equal(intra.cgstAmount, 5_391);
assert.equal(intra.sgstAmount, 5_391);
assert.equal(intra.taxAmount, 10_782);
assert.equal(intra.grossAmount, 70_682);
assert.equal(intra.supplierRegisteredAddress, supplier.registeredAddress);

const inter = calculateMenuListTaxSnapshot({
    baseUnitAmount: 59_900,
    billingProfile: indiaProfile('29'),
    currency: 'INR',
    quantity: 2,
    supplier,
});
assert.equal(inter.taxTreatment, 'igst');
assert.equal(inter.baseAmount, 119_800);
assert.equal(inter.igstAmount, 21_564);
assert.equal(inter.grossAmount, 141_364);

const resizedInter = resizeMenuListTaxSnapshot(inter, 4);
assert.equal(resizedInter.quantity, 4);
assert.equal(resizedInter.baseUnitAmount, inter.baseUnitAmount);
assert.equal(resizedInter.grossUnitAmount, inter.grossUnitAmount);
assert.equal(resizedInter.baseAmount, 239_600);
assert.equal(resizedInter.igstAmount, 43_128);
assert.equal(resizedInter.grossAmount, 282_728);
assert.equal(inter.quantity, 2, 'Resizing must not mutate the prior snapshot object.');
assert.equal(resolveMenuListTaxSettlementSnapshot({
    amount: 282_728,
    currency: 'inr',
    quantity: 4,
    snapshot: inter,
})?.grossAmount, 282_728);
assert.equal(resolveMenuListTaxSettlementSnapshot({
    amount: 282_727,
    currency: 'INR',
    quantity: 4,
    snapshot: inter,
}), null);
assert.equal(resolveMenuListTaxSettlementSnapshot({
    amount: 282_728,
    currency: 'USD',
    quantity: 4,
    snapshot: inter,
}), null);

const resizedIntra = resizeMenuListTaxSnapshot(intra, 3);
assert.equal(resizedIntra.cgstAmount + resizedIntra.sgstAmount, resizedIntra.taxAmount);
assert.equal(resizedIntra.igstAmount, 0);
assert.throws(() => resizeMenuListTaxSnapshot(intra, 0), BillingTaxProfileError);

assert.throws(() => calculateMenuListTaxSnapshot({
    baseUnitAmount: 59_900,
    billingProfile: { ...indiaProfile(), taxId: '29ABCDE1234F1Z5', taxIdType: 'GSTIN' },
    currency: 'INR',
    quantity: 1,
    supplier,
}), BillingTaxProfileError);

assert.throws(() => calculateMenuListTaxSnapshot({
    baseUnitAmount: 59_900,
    billingProfile: indiaProfile('99'),
    currency: 'INR',
    quantity: 1,
    supplier,
}), BillingTaxProfileError);

assert.throws(() => calculateMenuListTaxSnapshot({
    baseUnitAmount: 59_900,
    billingProfile: indiaProfile(),
    currency: 'INR',
    quantity: 1,
    supplier: { ...supplier, legalName: '   ' },
}), BillingTaxConfigurationError);

assert.throws(() => calculateMenuListTaxSnapshot({
    baseUnitAmount: 59_900,
    billingProfile: indiaProfile(),
    currency: 'INR',
    quantity: 1,
    supplier: { ...supplier, supplierStateCode: '99' },
}), BillingTaxConfigurationError);

const foreignProfile: BillingProfile = {
    legalName: 'Example Foreign Customer',
    email: 'billing@example.com',
    countryCode: 'US',
    addressLine1: '1 Market Street',
    city: 'San Francisco',
    region: 'California',
    postalCode: '94105',
};
assert.throws(() => calculateMenuListTaxSnapshot({
    baseUnitAmount: 2_900,
    billingProfile: foreignProfile,
    currency: 'USD',
    quantity: 1,
    supplier,
}), BillingTaxConfigurationError);

const exported = calculateMenuListTaxSnapshot({
    baseUnitAmount: 2_900,
    billingProfile: foreignProfile,
    currency: 'USD',
    quantity: 1,
    supplier: {
        ...supplier,
        internationalCheckoutEnabled: true,
        exportZeroRatingEnabled: true,
        lutReference: 'LUT-VERIFIED',
    },
});
assert.equal(exported.taxTreatment, 'zero_rated_export');
assert.equal(exported.taxAmount, 0);
assert.equal(exported.destinationTaxStatus, 'merchant_review_required');

assert.throws(() => calculateMenuListTaxSnapshot({
    baseUnitAmount: 59_900,
    billingProfile: indiaProfile(),
    currency: 'USD',
    quantity: 1,
    supplier,
}), BillingTaxProfileError);

assert.throws(() => calculateMenuListTaxSnapshot({
    baseUnitAmount: Number.MAX_SAFE_INTEGER,
    billingProfile: indiaProfile(),
    currency: 'INR',
    quantity: 1,
    supplier,
}), BillingTaxProfileError);

console.log('MenuList taxation policy tests passed.');
