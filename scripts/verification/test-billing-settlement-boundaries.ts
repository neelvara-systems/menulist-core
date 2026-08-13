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
import {
    getMenuListSubscriptionEntitlementScope,
    isMenuListSubscriptionEntitledForTenant,
    isMenuListSubscriptionInExpectedEntitlementScope,
} from '../../src/lib/billing/menuListSubscriptionEntitlementBoundary';
import { getProductSubscriptionBillingScope } from '../../src/lib/billing/productSubscriptionScopeBoundary';
import {
    requireRazorpayRevenueAmountPaise,
    resolveRazorpayAuditAmountPaise,
    resolveRazorpayRevenueOccurredAtMillis,
    resolveRazorpaySubscriptionState,
    resolveRazorpaySubscriptionQuantity,
    resolveRazorpayWebhookProductDeclaration,
    resolveRazorpayWebhookSubscriptionId,
    resolveRazorpayWebhookSubscriptionLookupProducts,
    resolveRazorpayWebhookSubscriptionProduct,
} from '../../src/lib/billing/razorpayRevenueProjectionBoundary';
import { PRODUCT_IDS } from '../../src/constants/product';
import { resolveSubscriptionReplacementEvidence } from '../../src/lib/billing/subscriptionReplacementEvidence';
import { isMatchingCheckoutProviderSubscription } from '../../src/lib/billing/checkoutProviderSubscriptionRecovery';

const utcDate = (year: number, monthIndex: number, day: number) => new Date(Date.UTC(year, monthIndex, day));
const cycleStart = utcDate(2026, 0, 31);
assert.equal(getBillingPeriodKey(cycleStart, utcDate(2026, 1, 27)), 202601);
assert.equal(getBillingPeriodKey(cycleStart, utcDate(2026, 1, 28)), 202602);
assert.equal(getBillingPeriodKey(cycleStart, utcDate(2026, 0, 1)), 202512);
assert.equal(getBillingPeriodKey({ seconds: Math.floor(cycleStart.getTime() / 1_000) }, utcDate(2026, 0, 31)), 202601);
assert.equal(getBillingPeriodKey({ seconds: 0 }), null);
assert.equal(getProviderCycleBillingPeriodKey(1_767_225_600), 202601);
assert.equal(getProviderCycleBillingPeriodKey('not-a-number'), null);
assert.equal(getProviderCycleBillingPeriodKey('1767225600'), null);
assert.equal(isValidBillingPeriodKey(202601), true);
assert.equal(isValidBillingPeriodKey(202600), false);
assert.equal(isValidBillingPeriodKey(202613), false);
assert.equal(requireRazorpayRevenueAmountPaise(12000), 12000);
assert.throws(() => requireRazorpayRevenueAmountPaise('12000'), /revenue amount is invalid/);
assert.throws(() => requireRazorpayRevenueAmountPaise(12.5), /revenue amount is invalid/);
assert.throws(() => requireRazorpayRevenueAmountPaise(0), /revenue amount is invalid/);
assert.equal(resolveRazorpayAuditAmountPaise(0), 0);
assert.equal(resolveRazorpayAuditAmountPaise(undefined), null);
assert.throws(() => resolveRazorpayAuditAmountPaise('12000'), /audit amount is invalid/);
assert.equal(resolveRazorpayRevenueOccurredAtMillis(1_767_225_600), 1_767_225_600_000);
assert.equal(resolveRazorpayRevenueOccurredAtMillis(null), undefined);
assert.throws(() => resolveRazorpayRevenueOccurredAtMillis('1767225600'), /event time is invalid/);
assert.throws(() => resolveRazorpayRevenueOccurredAtMillis(0), /event time is invalid/);
assert.deepEqual(resolveRazorpayWebhookProductDeclaration({
    productId: 'ML',
    payload: { payment: { entity: { notes: { pId: 'ML' } } } },
}), { outcome: 'declared', productId: 'ML' });
assert.deepEqual(resolveRazorpayWebhookProductDeclaration({
    pId: 'AL',
    payload: { subscription: { entity: { notes: { productId: 'AL' } } } },
}), { outcome: 'declared', productId: 'AL' });
assert.deepEqual(resolveRazorpayWebhookProductDeclaration({
    productId: 'ML',
    payload: { order: { entity: { notes: { pId: 'AL' } } } },
}), { outcome: 'invalid' });
assert.deepEqual(resolveRazorpayWebhookProductDeclaration({ productId: 'menulist' }), { outcome: 'invalid' });
assert.deepEqual(resolveRazorpayWebhookProductDeclaration({ payload: {} }), { outcome: 'missing' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionId({
    payload: {
        payment: { entity: { subscription_id: 'sub_exact' } },
        subscription: { entity: { id: 'sub_exact' } },
    },
}), { outcome: 'declared', subscriptionId: 'sub_exact' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionId({
    payload: {
        payment: { entity: { subscription_id: 'sub_payment' } },
        subscription: { entity: { id: 'sub_subscription' } },
    },
}), { outcome: 'invalid' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionId({
    payload: { payment: { entity: { subscription_id: 101 } } },
}), { outcome: 'invalid' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionId({
    payload: { payment: { entity: { subscription_id: ' sub_invalid' } } },
}), { outcome: 'invalid' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionId({ payload: {} }), { outcome: 'missing' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionLookupProducts({
    answerlatticeConfigured: false,
    declaration: { outcome: 'declared', productId: PRODUCT_IDS.MENULIST },
}), [PRODUCT_IDS.MENULIST]);
assert.deepEqual(resolveRazorpayWebhookSubscriptionLookupProducts({
    answerlatticeConfigured: false,
    declaration: { outcome: 'declared', productId: PRODUCT_IDS.ANSWERLATTICE },
}), [PRODUCT_IDS.ANSWERLATTICE]);
assert.deepEqual(resolveRazorpayWebhookSubscriptionLookupProducts({
    answerlatticeConfigured: false,
    declaration: { outcome: 'missing' },
}), [PRODUCT_IDS.MENULIST]);
assert.deepEqual(resolveRazorpayWebhookSubscriptionLookupProducts({
    answerlatticeConfigured: true,
    declaration: { outcome: 'missing' },
}), [PRODUCT_IDS.MENULIST, PRODUCT_IDS.ANSWERLATTICE]);
assert.deepEqual(resolveRazorpayWebhookSubscriptionLookupProducts({
    answerlatticeConfigured: true,
    declaration: { outcome: 'invalid' },
}), []);
assert.deepEqual(resolveRazorpayWebhookSubscriptionProduct({
    declaration: { outcome: 'missing' },
    hasAnswerlatticeSubscription: false,
    hasMenuListSubscription: true,
}), { outcome: 'resolved', productId: PRODUCT_IDS.MENULIST });
assert.deepEqual(resolveRazorpayWebhookSubscriptionProduct({
    declaration: { outcome: 'missing' },
    hasAnswerlatticeSubscription: true,
    hasMenuListSubscription: false,
}), { outcome: 'resolved', productId: PRODUCT_IDS.ANSWERLATTICE });
assert.deepEqual(resolveRazorpayWebhookSubscriptionProduct({
    declaration: { outcome: 'missing' },
    hasAnswerlatticeSubscription: false,
    hasMenuListSubscription: false,
}), { outcome: 'unresolved' });
const exactProviderSubscriptionState = {
    charge_at: 1_769_904_000,
    current_end: 1_769_904_000,
    current_start: 1_767_225_600,
    paid_count: 1,
    quantity: 2,
    start_at: 1_767_225_600,
    total_count: 12,
};
assert.deepEqual(resolveRazorpaySubscriptionState(exactProviderSubscriptionState), {
    chargeAtMillis: 1_769_904_000_000,
    chargeAtSeconds: 1_769_904_000,
    currentEndMillis: 1_769_904_000_000,
    currentEndSeconds: 1_769_904_000,
    currentStartMillis: 1_767_225_600_000,
    currentStartSeconds: 1_767_225_600,
    paidCount: 1,
    quantity: 2,
    startAtMillis: 1_767_225_600_000,
    startAtSeconds: 1_767_225_600,
    totalCount: 12,
});
assert.equal(resolveRazorpaySubscriptionState({
    ...exactProviderSubscriptionState,
    current_start: '1767225600',
}), null);
assert.equal(resolveRazorpaySubscriptionState({
    ...exactProviderSubscriptionState,
    quantity: '2',
}), null);
assert.equal(resolveRazorpaySubscriptionState({
    ...exactProviderSubscriptionState,
    paid_count: 13,
}), null);
assert.equal(resolveRazorpaySubscriptionState({
    ...exactProviderSubscriptionState,
    current_end: exactProviderSubscriptionState.current_start,
}), null);
assert.equal(resolveRazorpaySubscriptionState({
    ...exactProviderSubscriptionState,
    quantity: undefined,
}, 3)?.quantity, 3);
assert.equal(resolveRazorpaySubscriptionState({
    ...exactProviderSubscriptionState,
    quantity: undefined,
}, '3'), null);
assert.equal(resolveRazorpaySubscriptionQuantity(4), 4);
assert.equal(resolveRazorpaySubscriptionQuantity('4'), null);
assert.equal(resolveRazorpaySubscriptionQuantity(4.5), null);
const exactReplacementEvidence = {
    founderMonitorReplacementForSubscriptionId: 'sub_previous',
    founderMonitorReplacementMrrPaise: 299900,
};
assert.deepEqual(resolveSubscriptionReplacementEvidence(
    exactReplacementEvidence,
    { ...exactReplacementEvidence },
), {
    outcome: 'replacement',
    previousMrrPaise: 299900,
    subscriptionId: 'sub_previous',
});
assert.deepEqual(resolveSubscriptionReplacementEvidence({}, {
    founderMonitorReplacementMrrPaise: 0,
}), { outcome: 'none' });
assert.deepEqual(resolveSubscriptionReplacementEvidence({
    ...exactReplacementEvidence,
    founderMonitorReplacementMrrPaise: '299900',
}), { outcome: 'invalid' });
assert.deepEqual(resolveSubscriptionReplacementEvidence({
    ...exactReplacementEvidence,
    founderMonitorReplacementForSubscriptionId: 101,
}), { outcome: 'invalid' });
assert.deepEqual(resolveSubscriptionReplacementEvidence(
    exactReplacementEvidence,
    { ...exactReplacementEvidence, founderMonitorReplacementForSubscriptionId: 'sub_other' },
), { outcome: 'invalid' });
assert.deepEqual(resolveSubscriptionReplacementEvidence(
    exactReplacementEvidence,
    { ...exactReplacementEvidence, founderMonitorReplacementMrrPaise: 199900 },
), { outcome: 'invalid' });
assert.deepEqual(resolveSubscriptionReplacementEvidence({
    founderMonitorReplacementMrrPaise: 299900,
}), { outcome: 'invalid' });
const checkoutRecoveryExpectation = {
    attemptId: 'attempt_exact',
    planId: 'starter',
    providerPlanId: 'plan_exact',
    productId: 'ML',
    quantity: 2,
    storeId: 202,
    tenantId: 101,
};
const checkoutRecoveryCandidate = {
    id: 'sub_recovered',
    notes: {
        checkoutAttemptId: 'attempt_exact',
        planId: 'starter',
        productId: 'ML',
        quantity: '2',
        storeId: '202',
        tenantId: '101',
    },
    plan_id: 'plan_exact',
    quantity: 2,
    status: 'created',
};
assert.equal(isMatchingCheckoutProviderSubscription(checkoutRecoveryCandidate, checkoutRecoveryExpectation), true);
assert.equal(isMatchingCheckoutProviderSubscription({
    ...checkoutRecoveryCandidate,
    id: 'checkout_recovered',
}, checkoutRecoveryExpectation), false);
assert.equal(isMatchingCheckoutProviderSubscription({
    ...checkoutRecoveryCandidate,
    quantity: 3,
}, checkoutRecoveryExpectation), false);
assert.equal(isMatchingCheckoutProviderSubscription({
    ...checkoutRecoveryCandidate,
    quantity: '2',
}, checkoutRecoveryExpectation), false);
assert.equal(isMatchingCheckoutProviderSubscription({
    ...checkoutRecoveryCandidate,
    notes: { ...checkoutRecoveryCandidate.notes, quantity: '02' },
}, checkoutRecoveryExpectation), false);
assert.equal(isMatchingCheckoutProviderSubscription({
    ...checkoutRecoveryCandidate,
    notes: { ...checkoutRecoveryCandidate.notes, tenantId: '1.01e2' },
}, checkoutRecoveryExpectation), false);
assert.equal(isMatchingCheckoutProviderSubscription({
    ...checkoutRecoveryCandidate,
    notes: { ...checkoutRecoveryCandidate.notes, checkoutAttemptId: 101 },
}, checkoutRecoveryExpectation), false);
assert.equal(isMatchingCheckoutProviderSubscription({
    ...checkoutRecoveryCandidate,
    notes: { ...checkoutRecoveryCandidate.notes, quantity: undefined },
    quantity: undefined,
}, { ...checkoutRecoveryExpectation, quantity: 1 }), true);
assert.deepEqual(resolveRazorpayWebhookSubscriptionProduct({
    declaration: { outcome: 'missing' },
    hasAnswerlatticeSubscription: true,
    hasMenuListSubscription: true,
}), { outcome: 'conflict' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionProduct({
    declaration: { outcome: 'declared', productId: PRODUCT_IDS.MENULIST },
    hasAnswerlatticeSubscription: false,
    hasMenuListSubscription: true,
}), { outcome: 'resolved', productId: PRODUCT_IDS.MENULIST });
assert.deepEqual(resolveRazorpayWebhookSubscriptionProduct({
    declaration: { outcome: 'declared', productId: PRODUCT_IDS.MENULIST },
    hasAnswerlatticeSubscription: true,
    hasMenuListSubscription: false,
}), { outcome: 'conflict' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionProduct({
    declaration: { outcome: 'declared', productId: PRODUCT_IDS.ANSWERLATTICE },
    hasAnswerlatticeSubscription: true,
    hasMenuListSubscription: true,
}), { outcome: 'conflict' });
assert.deepEqual(resolveRazorpayWebhookSubscriptionProduct({
    declaration: { outcome: 'declared', productId: PRODUCT_IDS.ANSWERLATTICE },
    hasAnswerlatticeSubscription: false,
    hasMenuListSubscription: false,
}), { outcome: 'unresolved' });

const exactMenuListEntitlementSubscription = {
    pId: 'ML',
    productId: 'ML',
    tId: 101,
    tenantId: 101,
    sId: 202,
    storeId: 202,
};
assert.deepEqual(getMenuListSubscriptionEntitlementScope(exactMenuListEntitlementSubscription), {
    tenantId: 101,
    storeId: 202,
});
assert.equal(isMenuListSubscriptionEntitledForTenant(exactMenuListEntitlementSubscription, 101), true);
assert.equal(isMenuListSubscriptionEntitledForTenant(exactMenuListEntitlementSubscription, 999), false);
assert.equal(isMenuListSubscriptionInExpectedEntitlementScope(
    exactMenuListEntitlementSubscription,
    { tenantId: 101, storeId: 202 },
), true);
assert.equal(isMenuListSubscriptionInExpectedEntitlementScope(
    { ...exactMenuListEntitlementSubscription, tenantId: 999, tId: 999 },
    { tenantId: 101, storeId: 202 },
), false);
assert.equal(isMenuListSubscriptionInExpectedEntitlementScope(
    exactMenuListEntitlementSubscription,
    { tenantId: '0101', storeId: 202 },
), false);
assert.equal(isMenuListSubscriptionEntitledForTenant({
    ...exactMenuListEntitlementSubscription,
    productId: 'AL',
}, 101), false);
assert.deepEqual(getProductSubscriptionBillingScope(PRODUCT_IDS.MENULIST, exactMenuListEntitlementSubscription), {
    tenantId: 101,
    storeId: 202,
});
assert.equal(getProductSubscriptionBillingScope(PRODUCT_IDS.MENULIST, {
    ...exactMenuListEntitlementSubscription,
    productId: 'AL',
}), null);
assert.equal(getProductSubscriptionBillingScope(PRODUCT_IDS.MENULIST, {
    ...exactMenuListEntitlementSubscription,
    tId: 999,
}), null);
assert.deepEqual(getProductSubscriptionBillingScope(PRODUCT_IDS.ANSWERLATTICE, {
    pId: 'AL',
    productId: 'AL',
    tId: 303,
    tenantId: 303,
    sId: 404,
    storeId: 404,
}), { tenantId: 303, storeId: 404 });
assert.equal(isMenuListSubscriptionEntitledForTenant({
    ...exactMenuListEntitlementSubscription,
    tId: 999,
}, 101), false);
assert.equal(getMenuListSubscriptionEntitlementScope({
    ...exactMenuListEntitlementSubscription,
    sId: 999,
}), null);
assert.equal(isMenuListSubscriptionEntitledForTenant({
    ...exactMenuListEntitlementSubscription,
    tenantId: '101',
    tId: '101',
}, 101), false);

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
const razorpayPaymentEvidence = {
    billingHistory: ['pay_Entitlement123'],
    paymentProvider: 'razorpay',
} as const;
assert.equal(getActivePlanTypeForSubscription({
    ...razorpayPaymentEvidence,
    cycleEndDate: futureCycleEnd,
    status: 'active',
    planId: ' Pro ',
}, entitlementNowMs), 'pro');
assert.equal(
    getActivePlanTypeForSubscription({ status: 'active', planId: 'pro' }, entitlementNowMs),
    null,
    'active rows without exact paid-cycle evidence must fail closed',
);
assert.equal(getActivePlanTypeForSubscription({
    ...razorpayPaymentEvidence,
    cycleEndDate: { seconds: Math.floor((entitlementNowMs - 1_000) / 1_000) },
    planId: 'pro',
    status: 'active',
}, entitlementNowMs), null, 'an elapsed active row must not retain plan entitlement');
assert.equal(getActivePlanTypeForSubscription({
    ...razorpayPaymentEvidence,
    cycleEndDate: futureCycleEnd,
    planId: 'premium',
    status: 'cancelled',
}, entitlementNowMs), 'premium');
assert.equal(getActivePlanTypeForSubscription({
    ...razorpayPaymentEvidence,
    cycleEndDate: futureCycleEnd,
    planId: 'starter',
    status: 'paused',
}, entitlementNowMs), 'starter');
assert.equal(hasCurrentSubscriptionPlanEntitlement({
    ...razorpayPaymentEvidence,
    cycleEndDate: endedCycle,
    status: 'cancelled',
}, entitlementNowMs), false);
assert.equal(hasCurrentSubscriptionPlanEntitlement({
    ...razorpayPaymentEvidence,
    cycleEndDate: endedCycle,
    status: 'paused',
}, entitlementNowMs), false);
assert.equal(getActivePlanTypeForSubscription({ ...razorpayPaymentEvidence, cycleEndDate: futureCycleEnd, planId: 'pro', status: 'past_due' }, entitlementNowMs), null);
assert.equal(getActivePlanTypeForSubscription({ ...razorpayPaymentEvidence, cycleEndDate: futureCycleEnd, planId: 'pro', status: 'expired' }, entitlementNowMs), null);
assert.equal(getActivePlanTypeForSubscription({ ...razorpayPaymentEvidence, cycleEndDate: 'invalid', planId: 'pro', status: 'cancelled' }, entitlementNowMs), null);
assert.equal(getActivePlanTypeForSubscription({
    ...razorpayPaymentEvidence,
    cycleEndDate: { seconds: String(Math.floor((entitlementNowMs + 60_000) / 1_000)) },
    planId: 'pro',
    status: 'active',
}, entitlementNowMs), null, 'numeric-string timestamp components must not retain plan entitlement');
assert.equal(getActivePlanTypeForSubscription({
    ...razorpayPaymentEvidence,
    planId: { toString: () => 'pro' } as unknown as string,
    status: 'active',
}, entitlementNowMs), null, 'object plan IDs must not be coerced into plan entitlement');
assert.equal(getActivePlanTypeForSubscription({
    billingHistory: [],
    cycleEndDate: futureCycleEnd,
    paymentProvider: 'razorpay',
    planId: 'pro',
    status: 'active',
}, entitlementNowMs), null, 'provider active without a captured payment id must not grant entitlement');
assert.equal(getActivePlanTypeForSubscription({
    billingHistory: [],
    billingMode: 'manual',
    cycleEndDate: futureCycleEnd,
    manualPaymentConfirmed: true,
    paymentProvider: 'razorpay',
    planId: 'pro',
    status: 'active',
}, entitlementNowMs), 'pro', 'confirmed manual billing must retain prepaid entitlement');
let entitlementTimestampMethodCalled = false;
assert.equal(getActivePlanTypeForSubscription({
    ...razorpayPaymentEvidence,
    cycleEndDate: {
        toMillis: () => {
            entitlementTimestampMethodCalled = true;
            return entitlementNowMs + 60_000;
        },
    },
    planId: 'pro',
    status: 'active',
}, entitlementNowMs), null);
assert.equal(entitlementTimestampMethodCalled, false, 'persisted timestamp methods must not execute during entitlement projection');

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
    id: 'pay_ThrowingTimestamp01',
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
assert.equal(hasValidSubscriptionAccess({
    ...razorpayPaymentEvidence,
    status: 'active',
    cycleEndDate: { seconds: Math.floor((Date.now() + 60_000) / 1_000) },
} as unknown as FirestoreSubscriptionDoc), true);
assert.equal(hasValidSubscriptionAccess({
    billingHistory: [],
    paymentProvider: 'razorpay',
    status: 'active',
    cycleEndDate: { seconds: Math.floor((Date.now() + 60_000) / 1_000) },
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
assert.deepEqual(calculateProration({
    amount: 3000,
    cycleStartDate: { toDate: () => utcDate(2026, 6, 10) },
    cycleEndDate: { toDate: () => utcDate(2026, 7, 9) },
} as unknown as FirestoreSubscriptionDoc, utcDate(2026, 6, 1)), {
    proratedAmount: 3000,
    fullCycleAmount: 3000,
    daysRemaining: 30,
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
        pId: 'ML',
        productId: 'ML',
        tId: 101,
        tenantId: 101,
        sId: 202,
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
    pId: 'ML',
    productId: 'ML',
    tId: 101,
    tenantId: 101,
    sId: 202,
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
    billingStoreId: 303,
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
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: { ...topupSnapshot, pId: 'AL' },
}), null, 'conflicting immutable top-up product aliases must fail closed');
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: { ...topupSnapshot, tId: 999 },
}), null, 'conflicting immutable top-up tenant aliases must fail closed');
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: { ...topupSnapshot, sId: 999 },
}), null, 'conflicting immutable top-up store aliases must fail closed');
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: { ...topupSnapshot, pId: undefined },
}), null, 'incomplete immutable top-up product identity must fail closed');
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    order: { ...order, notes: { ...order.notes, tId: 999 } },
}), null, 'conflicting provider tenant aliases must fail closed');
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    order: { ...order, notes: { ...order.notes, productId: 'AL' } },
}), null, 'conflicting provider product aliases must fail closed');
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    order: { ...order, notes: { ...order.notes, billingStoreId: 304 } },
}), null, 'provider and immutable billing-store identity must agree');
assert.equal(resolveVerifiedTopupSettlement({
    ...settlementInput,
    topupSnapshot: { ...topupSnapshot, packName: 'Other Pack' },
}), null, 'immutable and provider pack names must agree');

const currentTopupSubscription = {
    billingHistory: ['pay_TopupCurrent123'],
    cycleEndDate: { seconds: Math.floor((Date.now() + 60_000) / 1_000) },
    id: 'sub_current_001',
    paymentProvider: 'razorpay',
    providerSubscriptionId: 'sub_provider_001',
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
    status: 'active',
};
assert.deepEqual(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: currentTopupSubscription,
}), {
    creditsLastResetMonth: 202607,
    id: 'sub_current_001',
    monthlyCredits: 4,
    monthlyCreditsAllowance: 10,
    providerSubscriptionId: 'sub_provider_001',
    storeId: 202,
    tenantId: 101,
    topUpCredits: 9,
});
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: { ...currentTopupSubscription, billingHistory: [] },
}), null, 'top-up settlement must reject an unpaid provider-active subscription');
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
    subscriptionSnapshot: { ...currentTopupSubscription, tId: undefined },
}), null, 'incomplete transaction-current tenant aliases must fail closed');
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: { ...currentTopupSubscription, sId: undefined },
}), null, 'incomplete transaction-current store aliases must fail closed');
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: { ...currentTopupSubscription, topUpCredits: '9' },
}), null, 'coercible persisted balances must not enter credit arithmetic');
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: { ...currentTopupSubscription, providerSubscriptionId: ' '.repeat(2) },
}), null, 'malformed provider subscription identity must not enter the credit mirror');
assert.equal(resolveCurrentTopupSubscriptionSettlement({
    expectedProductId: 'ML',
    expectedTenantId: 101,
    expectedStoreId: 202,
    subscriptionSnapshot: {
        tenantId: 101,
        storeId: 202,
        topUpCredits: 0,
    },
}), null, 'legacy alias-less subscriptions must be migrated before credit mutation');
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
    false,
    'single-alias Answerlattice subscriptions must fail closed',
);
assert.equal(
    isAnswerlatticeSubscriptionInScope({ pId: 'AL', productId: 'AL', tId: 101, sId: 202 }, { tId: 101, sId: 202 }),
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
assert.equal(resolveAnswerlatticeIntakeRefundAllocation({
    currentBillingPeriod: 202607,
    currentMonthlyCredits: '90',
    monthlyCreditsAllowance: 100,
    refundMonthlyCredits: 10,
    refundTopUpCredits: 5,
    reservedBillingPeriod: 202607,
}), null, 'Coercible intake balances must not become refund authority.');
assert.equal(resolveAnswerlatticeIntakeRefundAllocation({
    currentBillingPeriod: 202607,
    currentMonthlyCredits: 90,
    monthlyCreditsAllowance: 100,
    refundMonthlyCredits: 0.5,
    refundTopUpCredits: 5,
    reservedBillingPeriod: 202607,
}), null, 'Fractional intake refund evidence must fail closed.');

console.log('Billing settlement boundary tests passed.');
