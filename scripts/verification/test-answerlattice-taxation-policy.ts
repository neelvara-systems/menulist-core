import assert from 'node:assert/strict';
import {
    BillingTaxConfigurationError,
    BillingTaxProfileError,
    calculateBillingTaxSnapshot,
    resizeBillingTaxSnapshot,
    resolveBillingTaxSettlementSnapshot,
    type BillingProfile,
    type BillingTaxSupplierConfig,
} from '@data/shared/billingTaxPolicy';
import {
    assertAnswerlatticeSyntheticBillingQaBoundary,
    resolveAnswerlatticeBillingCurrency,
} from '@lib/billing/answerlatticeTaxServer';

const supplier: BillingTaxSupplierConfig = {
    productName: 'Answerlattice',
    legalIdentityVerified: true,
    merchantEntityId: 'answerlattice_test',
    legalName: 'Example Supplier Private Limited',
    registeredAddress: 'Mumbai, Maharashtra, India',
    gstin: '27ABCDE1234F1Z5',
    supplierStateCode: '27',
    sacCode: '9983',
    internationalCheckoutEnabled: false,
    exportZeroRatingEnabled: false,
};

const indiaProfile = (stateCode = '27'): BillingProfile => ({
    legalName: 'Example SaaS Customer',
    email: 'billing@example.com',
    countryCode: 'IN',
    addressLine1: '1 Example Road',
    city: 'Mumbai',
    region: stateCode === '27' ? 'Maharashtra' : 'Karnataka',
    indianStateCode: stateCode,
    postalCode: '400001',
});

assert.equal(resolveAnswerlatticeBillingCurrency('IN'), 'INR');
assert.equal(resolveAnswerlatticeBillingCurrency(' us '), 'USD');
assert.doesNotThrow(() => assertAnswerlatticeSyntheticBillingQaBoundary({
    syntheticQaEnabled: 'true',
    razorpayKeyId: 'rzp_test_answerlattice',
    vercelEnv: 'preview',
    vercelTargetEnv: 'qa',
}));
assert.doesNotThrow(() => assertAnswerlatticeSyntheticBillingQaBoundary({
    syntheticQaEnabled: 'false',
    razorpayKeyId: 'rzp_live_answerlattice',
    vercelEnv: 'production',
    vercelTargetEnv: 'production',
}));
for (const unsafeEnvironment of [
    {
        syntheticQaEnabled: 'true',
        razorpayKeyId: 'rzp_test_answerlattice',
        vercelEnv: 'production',
        vercelTargetEnv: 'production',
    },
    {
        syntheticQaEnabled: 'true',
        razorpayKeyId: 'rzp_live_answerlattice',
        vercelEnv: 'preview',
        vercelTargetEnv: 'qa',
    },
    {
        syntheticQaEnabled: 'true',
        razorpayKeyId: 'rzp_test_answerlattice',
        vercelEnv: 'preview',
        vercelTargetEnv: 'preview',
    },
]) {
    assert.throws(
        () => assertAnswerlatticeSyntheticBillingQaBoundary(unsafeEnvironment),
        BillingTaxConfigurationError,
    );
}
assert.throws(() => calculateBillingTaxSnapshot({
    baseUnitAmount: 149_900,
    billingProfile: indiaProfile(),
    currency: 'INR',
    quantity: 1,
    supplier: { ...supplier, legalIdentityVerified: false },
}), BillingTaxConfigurationError);

const launch = calculateBillingTaxSnapshot({
    baseUnitAmount: 149_900,
    billingProfile: indiaProfile(),
    currency: 'INR',
    quantity: 1,
    supplier,
});
assert.equal(launch.taxTreatment, 'cgst_sgst');
assert.equal(launch.baseAmount, 149_900);
assert.equal(launch.taxAmount, 26_982);
assert.equal(launch.grossAmount, 176_882);

const multiSeat = resizeBillingTaxSnapshot(launch, 3);
assert.equal(multiSeat.baseAmount, 449_700);
assert.equal(multiSeat.grossAmount, 530_646);
assert.equal(resolveBillingTaxSettlementSnapshot({
    amount: 530_646,
    currency: 'inr',
    quantity: 3,
    snapshot: launch,
})?.grossAmount, 530_646);
assert.equal(resolveBillingTaxSettlementSnapshot({
    amount: 530_645,
    currency: 'INR',
    quantity: 3,
    snapshot: launch,
}), null);

const foreignProfile: BillingProfile = {
    legalName: 'Example Foreign Customer',
    email: 'billing@example.com',
    countryCode: 'US',
    addressLine1: '1 Market Street',
    city: 'San Francisco',
    region: 'California',
    postalCode: '94105',
};
assert.throws(() => calculateBillingTaxSnapshot({
    baseUnitAmount: 2_900,
    billingProfile: foreignProfile,
    currency: 'USD',
    quantity: 1,
    supplier,
}), BillingTaxConfigurationError);
const exported = calculateBillingTaxSnapshot({
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
assert.equal(exported.destinationTaxStatus, 'merchant_review_required');
assert.throws(() => calculateBillingTaxSnapshot({
    baseUnitAmount: 149_900,
    billingProfile: indiaProfile(),
    currency: 'USD',
    quantity: 1,
    supplier,
}), BillingTaxProfileError);

console.log('Answerlattice taxation policy tests passed.');
