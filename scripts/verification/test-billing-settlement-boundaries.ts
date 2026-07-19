import assert from 'node:assert/strict';
import {
    getBillingPeriodKey,
    getProviderCycleBillingPeriodKey,
    isValidBillingPeriodKey,
} from '../../src/lib/billing/billingPeriod';
import { resolveProviderBillingProductId } from '../../src/lib/billing/productBillingPlans';
import { resolveCurrentTopupSubscriptionSettlement, resolveVerifiedTopupSettlement } from '../../src/lib/billing/topupSettlement';
import {
    isAnswerlatticeIntakeLedgerInScope,
    resolveAnswerlatticeIntakeRefundAllocation,
} from '../../src/lib/answerlattice/intakeUsageSettlement';
import {
    normalizeAnswerlatticeBillingScopeDocumentId,
    normalizeAnswerlatticeIntakeUsageLedgerId,
    normalizeAnswerlatticeSubscriptionId,
} from '../../src/lib/answerlattice/billingDocumentIdBoundary';
import {
    getAnswerlatticeBillingRecordScope,
    isAnswerlatticePaymentHistoryItemInScope,
    isAnswerlatticeSubscriptionInScope,
} from '../../src/lib/answerlattice/billingScopeBoundary';
import {
    normalizeBillingSubscriptionDocumentId,
    normalizeBillingSubscriptionScopeDocumentId,
} from '../../src/lib/billing/subscriptionDocumentIdBoundary';
import {
    calculateProration,
    calculateRemainingCredits,
    getGracePeriodInfo,
    hasValidSubscriptionAccess,
} from '../../src/utils/razorpay';
import type { FirestoreSubscriptionDoc } from '../../src/types/razorpay';
import { resolveSubscriptionUpgradeCreditTransfer } from '../../src/lib/billing/subscriptionUpgradeSettlement';
import { formatBillingHistoryEvents } from '../../src/lib/billing/billingHistoryFormatter';
import {
    appendBoundedBillingStatusHistory,
    BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT,
} from '../../src/lib/billing/subscriptionStatusHistory';
import {
    getActivePlanTypeForSubscription,
    hasCurrentSubscriptionPlanEntitlement,
} from '../../src/lib/billing/subscriptionPlanEntitlement';

const utcDate = (year: number, monthIndex: number, day: number) => new Date(Date.UTC(year, monthIndex, day));
const cycleStart = utcDate(2026, 0, 31);
assert.equal(getBillingPeriodKey(cycleStart, utcDate(2026, 1, 27)), 202601);
assert.equal(getBillingPeriodKey(cycleStart, utcDate(2026, 1, 28)), 202602);
assert.equal(getBillingPeriodKey(cycleStart, utcDate(2026, 0, 1)), 202512);
assert.equal(getBillingPeriodKey({ seconds: Math.floor(cycleStart.getTime() / 1_000) }, utcDate(2026, 0, 31)), 202601);
assert.equal(getBillingPeriodKey({ seconds: 0 }), null);
assert.equal(getProviderCycleBillingPeriodKey(1_767_225_600), 202601);
assert.equal(getProviderCycleBillingPeriodKey('not-a-number'), null);
assert.equal(isValidBillingPeriodKey(202601), true);
assert.equal(isValidBillingPeriodKey(202600), false);
assert.equal(isValidBillingPeriodKey(202613), false);

const statusHistory = appendBoundedBillingStatusHistory(
    Array.from({ length: BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT + 20 }, (_, index) => index),
    999,
);
assert.equal(statusHistory.length, BILLING_SUBSCRIPTION_STATUS_HISTORY_LIMIT);
assert.equal(statusHistory[0], 21);
assert.equal(statusHistory.at(-1), 999);

const entitlementNowMs = Date.UTC(2026, 6, 16, 12, 0, 0);
const futureCycleEnd = { seconds: Math.floor((entitlementNowMs + 60_000) / 1_000) };
const endedCycle = { toMillis: () => entitlementNowMs - 1 };
assert.equal(getActivePlanTypeForSubscription({ status: 'active', planId: ' Pro ' }, entitlementNowMs), 'pro');
assert.equal(getActivePlanTypeForSubscription({
    cycleEndDate: futureCycleEnd,
    planId: 'premium',
    status: 'cancelled',
}, entitlementNowMs), 'premium');
assert.equal(getActivePlanTypeForSubscription({
    cycleEndDate: futureCycleEnd,
    planId: 'starter',
    status: 'paused',
}, entitlementNowMs), 'starter');
assert.equal(hasCurrentSubscriptionPlanEntitlement({
    cycleEndDate: endedCycle,
    status: 'cancelled',
}, entitlementNowMs), false);
assert.equal(hasCurrentSubscriptionPlanEntitlement({
    cycleEndDate: endedCycle,
    status: 'paused',
}, entitlementNowMs), false);
assert.equal(getActivePlanTypeForSubscription({ cycleEndDate: futureCycleEnd, planId: 'pro', status: 'past_due' }, entitlementNowMs), null);
assert.equal(getActivePlanTypeForSubscription({ cycleEndDate: futureCycleEnd, planId: 'pro', status: 'expired' }, entitlementNowMs), null);
assert.equal(getActivePlanTypeForSubscription({ cycleEndDate: 'invalid', planId: 'pro', status: 'cancelled' }, entitlementNowMs), null);

const validHistoryTimestampSeconds = 1_767_225_600;
assert.equal(formatBillingHistoryEvents([{
    amount: 299900,
    created_at: validHistoryTimestampSeconds,
    currency: 'INR',
    event: 'subscription.charged',
    id: 'pay_valid',
    status: 'captured',
}])[0]?.date, validHistoryTimestampSeconds * 1000);
assert.equal(formatBillingHistoryEvents([{
    amount: 299900,
    created_at: { toMillis: () => validHistoryTimestampSeconds * 1000 },
    currency: 'INR',
    event: 'subscription.charged',
    id: 'pay_timestamp',
    status: 'captured',
}])[0]?.date, validHistoryTimestampSeconds * 1000);
assert.deepEqual(formatBillingHistoryEvents([{
    amount: 299900,
    created_at: 'malformed',
    currency: 'INR',
    event: 'subscription.charged',
    id: 'pay_invalid',
    status: 'captured',
}]), []);
assert.deepEqual(formatBillingHistoryEvents([{
    amount: 299900,
    created_at: { toMillis: () => { throw new Error('legacy timestamp'); } },
    currency: 'INR',
    event: 'subscription.charged',
    id: 'pay_throwing_timestamp',
    status: 'captured',
}]), []);
assert.deepEqual(formatBillingHistoryEvents([{
    created_at: null,
    credits: 100,
    event: 'owner_referral.reward_issued',
    id: 'reward_invalid',
    transactionType: 'reward_credit',
}]), []);

assert.equal(resolveProviderBillingProductId('ML', 'ML'), 'ML');
assert.equal(resolveProviderBillingProductId('AL', 'AL'), 'AL');
assert.equal(resolveProviderBillingProductId('ML', 'AL'), null);
assert.equal(resolveProviderBillingProductId('AL', undefined), null);
assert.equal(resolveProviderBillingProductId(undefined, undefined), 'ML');
assert.equal(resolveProviderBillingProductId('CC', 'CC'), 'CC');
assert.deepEqual(normalizeAnswerlatticeBillingScopeDocumentId(101), { numericId: 101, documentId: '101' });
assert.equal(normalizeAnswerlatticeBillingScopeDocumentId(' 101'), null);
assert.equal(normalizeAnswerlatticeBillingScopeDocumentId('101.0'), null);
assert.equal(normalizeAnswerlatticeSubscriptionId('sub_valid123'), 'sub_valid123');
assert.equal(normalizeAnswerlatticeSubscriptionId(' sub_valid123'), null);
assert.equal(normalizeAnswerlatticeIntakeUsageLedgerId('ledger/invalid'), null);
assert.deepEqual(normalizeBillingSubscriptionScopeDocumentId(303), { numericId: 303, documentId: '303' });
assert.equal(normalizeBillingSubscriptionScopeDocumentId(null), null);
assert.equal(normalizeBillingSubscriptionScopeDocumentId(0), null);
assert.equal(normalizeBillingSubscriptionScopeDocumentId('3e2'), null);
assert.equal(normalizeBillingSubscriptionScopeDocumentId(' 303'), null);
assert.equal(normalizeBillingSubscriptionDocumentId('sub_valid456'), 'sub_valid456');
assert.equal(normalizeBillingSubscriptionDocumentId('sub_valid456 '), null);

const graceNow = utcDate(2026, 6, 10);
const activeGracePeriod = getGracePeriodInfo({
    toDate: () => utcDate(2026, 6, 5),
}, 7, graceNow);
assert.equal(activeGracePeriod.hasKnownGracePeriod, true);
assert.equal(activeGracePeriod.remainingDays, 2);
const expiredGracePeriod = getGracePeriodInfo({
    seconds: Math.floor(utcDate(2026, 6, 1).getTime() / 1_000),
}, 7, graceNow);
assert.equal(expiredGracePeriod.hasKnownGracePeriod, true);
assert.equal(expiredGracePeriod.remainingDays, 0);
assert.deepEqual(getGracePeriodInfo({ toDate: () => { throw new Error('legacy value'); } }, 7, graceNow), {
    remainingDays: 0,
    graceEndsDate: null,
    graceEndsTimestamp: null,
    hasKnownGracePeriod: false,
});
assert.equal(getGracePeriodInfo('malformed', 7, graceNow).hasKnownGracePeriod, false);

const monthlyLegacyCredits = {
    planType: 'MONTH',
    monthlyCreditsAllowance: '200',
    monthlyCredits: '100',
    topUpCredits: '50',
} as unknown as FirestoreSubscriptionDoc;
assert.deepEqual(calculateRemainingCredits(monthlyLegacyCredits, graceNow), {
    monthlyCreditsAllowance: 200,
    monthsRemaining: 0,
    totalRemainingCredits: 150,
    unusedThisMonth: 100,
});
const invalidAnnualCredits = {
    planType: 'YEAR',
    cycleEndDate: 'invalid',
    monthlyCreditsAllowance: 200,
    monthlyCredits: 100,
    topUpCredits: 50,
} as unknown as FirestoreSubscriptionDoc;
assert.deepEqual(calculateRemainingCredits(invalidAnnualCredits, graceNow), {
    monthlyCreditsAllowance: 0,
    monthsRemaining: 0,
    totalRemainingCredits: 50,
    unusedThisMonth: 0,
});
assert.equal(hasValidSubscriptionAccess({
    status: 'paused',
    cycleEndDate: 'invalid',
} as unknown as FirestoreSubscriptionDoc), false);
assert.deepEqual(calculateProration({
    amount: '299900',
    cycleStartDate: 'invalid',
    cycleEndDate: 'invalid',
} as unknown as FirestoreSubscriptionDoc, graceNow), {
    proratedAmount: 299900,
    fullCycleAmount: 299900,
    daysRemaining: 0,
    totalDays: 30,
});

assert.deepEqual(resolveSubscriptionUpgradeCreditTransfer({
    calculatedRemainingCredits: 125.9,
    currentNewTopUpCredits: 40,
    oldSubscriptionId: 'sub_old',
    replacementCarryForwardCredits: 0,
    replacementCarryForwardFromSubscriptionId: null,
}), {
    carryAlreadyApplied: false,
    carryForwardCredits: 125,
    nextTopUpCredits: 165,
    remainingCredits: 125,
});
assert.deepEqual(resolveSubscriptionUpgradeCreditTransfer({
    calculatedRemainingCredits: 125,
    currentNewTopUpCredits: 165,
    oldSubscriptionId: 'sub_old',
    replacementCarryForwardCredits: 125,
    replacementCarryForwardFromSubscriptionId: 'sub_old',
}), {
    carryAlreadyApplied: true,
    carryForwardCredits: 125,
    nextTopUpCredits: 165,
    remainingCredits: 125,
});
assert.equal(resolveSubscriptionUpgradeCreditTransfer({
    calculatedRemainingCredits: 125,
    currentNewTopUpCredits: 'invalid',
    oldSubscriptionId: 'sub_old',
    replacementCarryForwardCredits: 0,
    replacementCarryForwardFromSubscriptionId: null,
}), null);
assert.equal(resolveSubscriptionUpgradeCreditTransfer({
    calculatedRemainingCredits: 125,
    currentNewTopUpCredits: 165,
    oldSubscriptionId: 'sub_old',
    replacementCarryForwardCredits: undefined,
    replacementCarryForwardFromSubscriptionId: 'sub_old',
}), null);

const order = {
    id: 'order_valid123',
    amount: 299900,
    currency: 'INR',
    notes: {
        productId: 'ML',
        tenantId: 101,
        storeId: 202,
        billingStoreId: 303,
        packId: 'enhancement',
        creditAmount: 250,
        price: 299900,
        currency: 'INR',
        packName: 'Content Credit Pack',
    },
};
const topupSnapshot = {
    providerOrderId: 'order_valid123',
    productId: 'ML',
    tenantId: 101,
    storeId: 202,
    billingStoreId: 303,
    packId: 'enhancement',
    creditsAdded: 250,
    amount: 299900,
    currency: 'INR',
    status: 'pending',
    packName: 'Content Credit Pack',
};
const payment = {
    id: 'pay_valid123',
    order_id: 'order_valid123',
    amount: 299900,
    currency: 'INR',
};
const settlementInput = {
    expectedOrderId: 'order_valid123',
    expectedPaymentId: 'pay_valid123',
    expectedProductId: 'ML',
    expectedStoreId: 202,
    expectedTenantId: 101,
    order,
    payment,
    topupSnapshot,
};

assert.deepEqual(resolveVerifiedTopupSettlement(settlementInput), {
    amount: 299900,
    creditsToAdd: 250,
    currency: 'INR',
    packId: 'enhancement',
    packName: 'Content Credit Pack',
});
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: { ...topupSnapshot, billingStoreId: 304 },
}), null);
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    expectedProductId: 'AL',
}), null);

const currentTopupSubscription = {
    productId: 'ML',
    pId: 'ML',
    tenantId: 101,
    tId: 101,
    storeId: 202,
    sId: 202,
    topUpCredits: 9,
    monthlyCredits: 4,
    monthlyCreditsAllowance: 10,
    creditsLastResetMonth: 202607,
};
assert.deepEqual(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: currentTopupSubscription,
}), {
    creditsLastResetMonth: 202607,
    monthlyCredits: 4,
    monthlyCreditsAllowance: 10,
    storeId: 202,
    tenantId: 101,
    topUpCredits: 9,
});
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: null,
}), null, 'deleted subscriptions must not be recreated by top-up settlement');
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: { ...currentTopupSubscription, tId: 999 },
}), null, 'conflicting transaction-current tenant aliases must fail closed');
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: { ...currentTopupSubscription, sId: 999 },
}), null, 'conflicting transaction-current store aliases must fail closed');
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: { ...currentTopupSubscription, pId: 'AL' },
}), null, 'conflicting transaction-current product aliases must fail closed');
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: { ...currentTopupSubscription, topUpCredits: '9' },
}), null, 'coercible persisted balances must not enter credit arithmetic');
assert.deepEqual(resolveCurrentTopupSubscriptionSettlement({
    allowMissingProductId: true,
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: {
        tenantId: 101,
        storeId: 202,
        topUpCredits: 0,
    },
}), {
    creditsLastResetMonth: null,
    monthlyCredits: 0,
    monthlyCreditsAllowance: 0,
    storeId: 202,
    tenantId: 101,
    topUpCredits: 0,
}, 'legacy MenuList subscriptions may omit product identity when all scope and balance fields are valid');
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    payment: { ...payment, amount: 1 },
}), null);
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: { ...topupSnapshot, creditsAdded: 500 },
}), null);
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: { ...topupSnapshot, status: 'paid', providerPaymentId: 'pay_other' },
}), null);
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: null,
}), null);

assert.equal(isAnswerlatticeIntakeLedgerInScope({ pId: 'AL', tId: 101, sId: 202 }, { tId: 101, sId: 202 }), true);
assert.equal(isAnswerlatticeIntakeLedgerInScope({ pId: 'AL', tId: 999, sId: 202 }, { tId: 101, sId: 202 }), false);
assert.equal(isAnswerlatticeIntakeLedgerInScope({ pId: 'AL', tId: 101, sId: 999 }, { tId: 101, sId: 202 }), false);
assert.equal(isAnswerlatticeIntakeLedgerInScope({ pId: ' al ', tId: 101, sId: 202 }, { tId: 101, sId: 202 }), false);
assert.equal(isAnswerlatticeIntakeLedgerInScope({ pId: 'AL', tId: ' 101 ', sId: 202 }, { tId: 101, sId: 202 }), false);
assert.equal(isAnswerlatticeIntakeLedgerInScope(null, { tId: 101, sId: 202 }), false);
assert.deepEqual(
    getAnswerlatticeBillingRecordScope({
        pId: 'AL',
        productId: 'AL',
        tId: 101,
        tenantId: 101,
        sId: 202,
        storeId: 202,
    }),
    { tId: 101, sId: 202 },
    'exact Answerlattice billing aliases must resolve to one authoritative scope',
);
assert.equal(
    getAnswerlatticeBillingRecordScope({ pId: 'AL', tId: 101, tenantId: 999, sId: 202 }),
    null,
    'conflicting Answerlattice billing tenant aliases must not resolve',
);
assert.equal(
    getAnswerlatticeBillingRecordScope({ pId: 'AL', tId: '101', sId: 202 }),
    null,
    'coercible Answerlattice billing scope must not resolve',
);
assert.equal(
    getAnswerlatticeBillingRecordScope({ tId: 101, sId: 202 }),
    null,
    'Answerlattice billing records must carry explicit product identity',
);
assert.equal(
    isAnswerlatticeSubscriptionInScope({ pId: 'AL', tId: 101, sId: 202 }, { tId: 101, sId: 202 }),
    true,
);
assert.equal(
    isAnswerlatticeSubscriptionInScope({ pId: ' al ', tId: 101, sId: 202 }, { tId: 101, sId: 202 }),
    false,
    'billing product identity must be exact',
);
assert.equal(
    isAnswerlatticeSubscriptionInScope({ pId: 'AL', tId: ' 101 ', sId: 202 }, { tId: 101, sId: 202 }),
    false,
    'billing tenant identity must not normalize whitespace',
);
assert.equal(
    isAnswerlatticeSubscriptionInScope({ pId: 'AL', tId: '101', sId: 202 }, { tId: 101, sId: 202 }),
    false,
    'persisted billing tenant identity must be numeric rather than a coercible string',
);
assert.equal(
    isAnswerlatticeSubscriptionInScope({ pId: 'AL', productId: 'ML', tId: 101, sId: 202 }, { tId: 101, sId: 202 }),
    false,
    'conflicting persisted billing product aliases must fail closed',
);
assert.equal(
    isAnswerlatticeSubscriptionInScope({ pId: 'AL', tId: 101, tenantId: 999, sId: 202 }, { tId: 101, sId: 202 }),
    false,
    'conflicting persisted billing tenant aliases must fail closed',
);
assert.equal(
    isAnswerlatticeSubscriptionInScope({ pId: 'AL', tId: 101, sId: 999 }, { tId: 101, sId: 202 }),
    false,
);
assert.equal(
    isAnswerlatticePaymentHistoryItemInScope({
        event: 'order.paid',
        pId: 'AL',
        productId: 'AL',
        tId: 101,
        tenantId: 101,
        sId: 202,
        storeId: 202,
    }, { tId: 101, sId: 202 }),
    true,
);
assert.equal(
    isAnswerlatticePaymentHistoryItemInScope({
        event: 'order.paid',
        pId: 'AL',
        tenantId: '101',
        storeId: 202,
    }, { tId: 101, sId: 202 }),
    false,
    'billing history must reject coercible persisted scope',
);
assert.deepEqual(resolveAnswerlatticeIntakeRefundAllocation({
    currentBillingPeriod: 202607,
    currentMonthlyCredits: 90,
    monthlyCreditsAllowance: 100,
    refundMonthlyCredits: 10,
    refundTopUpCredits: 5,
    reservedBillingPeriod: 202607,
}), {
    expiredMonthlyCredits: 0,
    refundedMonthlyCredits: 10,
    refundedTopUpCredits: 5,
});
assert.deepEqual(resolveAnswerlatticeIntakeRefundAllocation({
    currentBillingPeriod: 202608,
    currentMonthlyCredits: 100,
    monthlyCreditsAllowance: 100,
    refundMonthlyCredits: 10,
    refundTopUpCredits: 5,
    reservedBillingPeriod: 202607,
}), {
    expiredMonthlyCredits: 10,
    refundedMonthlyCredits: 0,
    refundedTopUpCredits: 5,
});
assert.equal(resolveAnswerlatticeIntakeRefundAllocation({
    currentBillingPeriod: 202613,
    currentMonthlyCredits: 90,
    monthlyCreditsAllowance: 100,
    refundMonthlyCredits: 10,
    refundTopUpCredits: 5,
    reservedBillingPeriod: 202607,
}), null);
assert.deepEqual(resolveAnswerlatticeIntakeRefundAllocation({
    currentBillingPeriod: 202607,
    currentMonthlyCredits: 95,
    monthlyCreditsAllowance: 100,
    refundMonthlyCredits: 10,
    refundTopUpCredits: 0,
    reservedBillingPeriod: 202607,
}), {
    expiredMonthlyCredits: 5,
    refundedMonthlyCredits: 5,
    refundedTopUpCredits: 0,
});

console.log('Billing settlement boundary tests passed.');
