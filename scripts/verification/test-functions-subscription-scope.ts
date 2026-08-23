import assert from 'node:assert/strict';
import {
    getReconciliationEntitlementDecision,
    getReconciliationPaymentAuthorityDecision,
    projectSubscriptionEntitlementAuditStatus,
} from '../../functions/src/billing/reconcileSubscriptions';
import { getExactMenuListSubscriptionScope } from '../../functions/src/billing/subscriptionScope';
import { hasVerifiedSubscriptionPaymentEvidence } from '../../functions/src/billing/subscriptionPaymentEvidence';
import {
    isFounderMonitorActiveRevenueSubscription,
    isFounderMonitorPastDueRevenueSubscription,
    isFounderMonitorPaymentAttentionSubscription,
} from '../../functions/src/billing/founderMonitorSubscriptionAuthority';

const exact = {
    pId: 'ML',
    productId: 'ML',
    tId: 101,
    tenantId: 101,
    sId: 202,
    storeId: 202,
};

assert.deepEqual(getExactMenuListSubscriptionScope(exact), { tenantId: 101, storeId: 202 });
assert.equal(getExactMenuListSubscriptionScope({ ...exact, productId: 'AL' }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, tId: 999 }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, sId: 999 }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, tId: undefined }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, tenantId: '101', tId: '101' }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, tenantId: 0, tId: 0 }), null);
assert.equal(getExactMenuListSubscriptionScope({ ...exact, storeId: Number.MAX_SAFE_INTEGER + 1, sId: Number.MAX_SAFE_INTEGER + 1 }), null);

const paidWindowEnd = { seconds: Math.floor(Date.UTC(2026, 7, 1) / 1_000) };
const unpaidActive = {
    status: 'active',
    cycleEndDate: paidWindowEnd,
    paymentProvider: 'razorpay',
    billingHistory: [],
};
const capturedActive = {
    ...unpaidActive,
    billingHistory: ['pay_Functions123'],
};
assert.equal(hasVerifiedSubscriptionPaymentEvidence(unpaidActive), false);
assert.equal(hasVerifiedSubscriptionPaymentEvidence(capturedActive), true);
assert.equal(hasVerifiedSubscriptionPaymentEvidence({ ...capturedActive, billingHistory: ['pay_bad_id'] }), false);
assert.equal(isFounderMonitorActiveRevenueSubscription(unpaidActive, Date.UTC(2026, 6, 27)), false);
assert.equal(isFounderMonitorActiveRevenueSubscription(capturedActive, Date.UTC(2026, 6, 27)), true);
assert.equal(isFounderMonitorActiveRevenueSubscription(capturedActive, Date.UTC(2026, 7, 2)), false);
assert.equal(isFounderMonitorActiveRevenueSubscription({
    status: 'active',
    billingMode: 'manual',
    manualPaymentConfirmed: true,
    validUntil: paidWindowEnd,
}, Date.UTC(2026, 6, 27)), true);
assert.equal(isFounderMonitorActiveRevenueSubscription({
    status: 'active',
    billingMode: 'manual',
    manualPaymentConfirmed: false,
    validUntil: paidWindowEnd,
}, Date.UTC(2026, 6, 27)), false);
assert.equal(isFounderMonitorPastDueRevenueSubscription({ ...unpaidActive, status: 'past_due' }), false);
assert.equal(isFounderMonitorPastDueRevenueSubscription({ ...capturedActive, status: 'past_due' }), true);
assert.equal(isFounderMonitorPastDueRevenueSubscription({ ...capturedActive, status: 'pending' }), false);
assert.equal(isFounderMonitorPaymentAttentionSubscription({ status: 'pending' }), true);

const nowMs = Date.UTC(2026, 6, 27);
const paymentEvidence = {
    billingHistory: ['pay_Functions123'],
    paymentProvider: 'razorpay',
} as const;
const pausedCycleRepair = getReconciliationEntitlementDecision(
    {
        ...paymentEvidence,
        id: 'sub_repair',
        status: 'paused',
        planId: 'MENULIST_PRO',
        cycleEndDate: { seconds: Math.floor((nowMs - 60_000) / 1000) },
        analyticsEntitlement: { activePlanType: null },
    },
    {
        cycleEndDate: { seconds: Math.floor((nowMs + 86_400_000) / 1000) },
    },
    'sub_repair',
    nowMs,
);
assert.equal(pausedCycleRepair.desiredActivePlanType, 'menulist_pro');
assert.equal(pausedCycleRepair.shouldSyncEntitlement, true);
assert.equal(
    pausedCycleRepair.nextSubscription.cycleEndDate.seconds,
    Math.floor((nowMs + 86_400_000) / 1000),
);

const terminalTransition = getReconciliationEntitlementDecision(
    {
        ...paymentEvidence,
        id: 'sub_terminal',
        status: 'active',
        planId: 'menulist_official',
        analyticsEntitlement: { activePlanType: 'menulist_official' },
    },
    { status: 'completed' },
    'sub_terminal',
    nowMs,
);
assert.equal(terminalTransition.desiredActivePlanType, null);
assert.equal(terminalTransition.shouldSyncEntitlement, true);

const unchangedActive = getReconciliationEntitlementDecision(
    {
        ...paymentEvidence,
        id: 'sub_stable',
        status: 'active',
        planId: 'MenuList_Official',
        cycleEndDate: { seconds: Math.floor((nowMs + 86_400_000) / 1_000) },
        analyticsEntitlement: { activePlanType: 'menulist_official' },
    },
    {},
    'sub_stable',
    nowMs,
);
assert.equal(unchangedActive.desiredActivePlanType, 'menulist_official');
assert.equal(unchangedActive.shouldSyncEntitlement, false);

const elapsedActive = getReconciliationEntitlementDecision(
    {
        ...paymentEvidence,
        id: 'sub_elapsed',
        status: 'active',
        planId: 'MenuList_Official',
        cycleEndDate: { seconds: Math.floor((nowMs - 60_000) / 1_000) },
        analyticsEntitlement: { activePlanType: 'menulist_official' },
    },
    {},
    'sub_elapsed',
    nowMs,
);
assert.equal(elapsedActive.desiredActivePlanType, null);
assert.equal(elapsedActive.shouldSyncEntitlement, true);

const malformedActive = getReconciliationEntitlementDecision(
    {
        ...paymentEvidence,
        id: 'sub_malformed',
        status: 'active',
        planId: { toString: () => 'menulist_official' },
        cycleEndDate: { seconds: String(Math.floor((nowMs + 60_000) / 1_000)) },
        analyticsEntitlement: { activePlanType: 'menulist_official' },
    },
    {},
    'sub_malformed',
    nowMs,
);
assert.equal(malformedActive.desiredActivePlanType, null);
assert.equal(malformedActive.shouldSyncEntitlement, true);

assert.deepEqual(getReconciliationPaymentAuthorityDecision({
    ...paymentEvidence,
    creditsLastResetMonth: 202607,
    totalPaymentsMadeCount: 1,
}, 'active', 1, Date.UTC(2026, 6, 1) / 1_000), {
    canApplyProviderActiveStatus: true,
    canSyncProviderCycle: true,
    capturedPaymentSyncPending: false,
    localPaidCount: 1,
});
assert.deepEqual(getReconciliationPaymentAuthorityDecision({
    billingHistory: [],
    creditsLastResetMonth: 202607,
    paymentProvider: 'razorpay',
    totalPaymentsMadeCount: 0,
}, 'active', 0, Date.UTC(2026, 6, 1) / 1_000), {
    canApplyProviderActiveStatus: false,
    canSyncProviderCycle: false,
    capturedPaymentSyncPending: true,
    localPaidCount: 0,
});
assert.equal(getReconciliationPaymentAuthorityDecision({
    ...paymentEvidence,
    creditsLastResetMonth: 202607,
    totalPaymentsMadeCount: 1,
}, 'active', 2, Date.UTC(2026, 7, 1) / 1_000).capturedPaymentSyncPending, true);

assert.equal(projectSubscriptionEntitlementAuditStatus('active'), 'active');
assert.equal(projectSubscriptionEntitlementAuditStatus('paid'), 'paid');
assert.equal(projectSubscriptionEntitlementAuditStatus('trialing'), null);
assert.equal(projectSubscriptionEntitlementAuditStatus({ status: 'active' }), null);

console.log('Functions subscription scope tests passed.');
