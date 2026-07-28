import assert from 'node:assert/strict';
import { getReconciliationEntitlementDecision } from '../../functions/src/billing/reconcileSubscriptions';
import { getExactMenuListSubscriptionScope } from '../../functions/src/billing/subscriptionScope';

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

const nowMs = Date.UTC(2026, 6, 27);
const pausedCycleRepair = getReconciliationEntitlementDecision(
    {
        id: 'sub_repair',
        status: 'paused',
        planId: 'PRO',
        cycleEndDate: { seconds: Math.floor((nowMs - 60_000) / 1000) },
        analyticsEntitlement: { activePlanType: null },
    },
    {
        cycleEndDate: { seconds: Math.floor((nowMs + 86_400_000) / 1000) },
    },
    'sub_repair',
    nowMs,
);
assert.equal(pausedCycleRepair.desiredActivePlanType, 'pro');
assert.equal(pausedCycleRepair.shouldSyncEntitlement, true);
assert.equal(
    pausedCycleRepair.nextSubscription.cycleEndDate.seconds,
    Math.floor((nowMs + 86_400_000) / 1000),
);

const terminalTransition = getReconciliationEntitlementDecision(
    {
        id: 'sub_terminal',
        status: 'active',
        planId: 'starter',
        analyticsEntitlement: { activePlanType: 'starter' },
    },
    { status: 'completed' },
    'sub_terminal',
    nowMs,
);
assert.equal(terminalTransition.desiredActivePlanType, null);
assert.equal(terminalTransition.shouldSyncEntitlement, true);

const unchangedActive = getReconciliationEntitlementDecision(
    {
        id: 'sub_stable',
        status: 'active',
        planId: 'Starter',
        analyticsEntitlement: { activePlanType: 'starter' },
    },
    {},
    'sub_stable',
    nowMs,
);
assert.equal(unchangedActive.desiredActivePlanType, 'starter');
assert.equal(unchangedActive.shouldSyncEntitlement, false);

console.log('Functions subscription scope tests passed.');
