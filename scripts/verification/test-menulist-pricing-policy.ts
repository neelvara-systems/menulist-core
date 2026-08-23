#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { getB2CPlansList } from '../../src/data/PlatformPlansList';
import {
    MENULIST_CONTENT_CREDIT_PACK,
    resolveMenuListPromotionalCreditState,
    resolveMenuListMonthlyCreditAllowance,
    resolveMenuListQuantityCreditUpdate,
} from '../../src/data/shared/contentCreditPolicy';
import {
    getMenuListPlanCheckoutQuantity,
    getMenuListPlanMinimumQuantity,
    isValidMenuListPlanQuantity,
} from '../../src/lib/billing/menulistPricingPolicy';

const plans = getB2CPlansList();
const expectedPlans = [
    { planId: 'menulist_official', billingInterval: 'MONTH', name: 'Official', inr: 59_900, usd: 2_900, minimumQuantity: 1 },
    { planId: 'menulist_official', billingInterval: 'YEAR', name: 'Official (Yearly)', inr: 599_000, usd: 29_000, minimumQuantity: 1 },
    { planId: 'menulist_pro', billingInterval: 'MONTH', name: 'Pro', inr: 149_900, usd: 7_900, minimumQuantity: 1 },
    { planId: 'menulist_pro', billingInterval: 'YEAR', name: 'Pro (Yearly)', inr: 1_499_000, usd: 79_000, minimumQuantity: 1 },
    { planId: 'menulist_multi_location', billingInterval: 'MONTH', name: 'Multi-location', inr: 149_900, usd: 7_900, minimumQuantity: 2 },
    { planId: 'menulist_multi_location', billingInterval: 'YEAR', name: 'Multi-location (Yearly)', inr: 1_499_000, usd: 79_000, minimumQuantity: 2 },
] as const;

assert.equal(plans.length, expectedPlans.length);
for (const expected of expectedPlans) {
    const plan = plans.find((candidate) => (
        candidate.planId === expected.planId
        && candidate.billingInterval === expected.billingInterval
    ));
    assert.ok(plan, `${expected.name} plan is missing`);
    assert.equal(plan.name, expected.name);
    assert.equal(plan.priceINR.price, expected.inr);
    assert.equal(plan.priceUSD.price, expected.usd);
    assert.equal(plan.minimumQuantity, expected.minimumQuantity);
    assert.equal(getMenuListPlanMinimumQuantity(plan), expected.minimumQuantity);
    assert.equal(getMenuListPlanCheckoutQuantity(plan), expected.minimumQuantity);
}

const officialMonthly = plans.find((plan) => plan.planId === 'menulist_official' && plan.billingInterval === 'MONTH');
const multiMonthly = plans.find((plan) => plan.planId === 'menulist_multi_location' && plan.billingInterval === 'MONTH');
assert.ok(officialMonthly);
assert.ok(multiMonthly);

assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_official', quantity: 1, userType: 'B2C' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_official', quantity: 2, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_pro', quantity: 1, userType: 'B2C' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_pro', quantity: 2, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_multi_location', quantity: 1, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_multi_location', quantity: 2, userType: 'B2C' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_multi_location', quantity: 31, userType: 'B2C' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_multi_location', quantity: 32, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'starter', quantity: 1, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'pro', quantity: 1, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'premium', quantity: 2, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_api_starter', quantity: 1, userType: 'B2B' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'menulist_api_pro', quantity: 1, userType: 'B2B' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'starter', quantity: 1, userType: 'B2B' }), false);

assert.equal(resolveMenuListMonthlyCreditAllowance({ planId: 'menulist_official' }), 75);
assert.equal(resolveMenuListMonthlyCreditAllowance({ planId: 'menulist_pro' }), 250);
assert.equal(resolveMenuListMonthlyCreditAllowance({ planId: 'menulist_multi_location', quantity: 2 }), 600);
assert.equal(resolveMenuListMonthlyCreditAllowance({ planId: 'menulist_multi_location', quantity: 3 }), 900);
assert.throws(
    () => resolveMenuListMonthlyCreditAllowance({ planId: 'menulist_multi_location', quantity: 32 }),
    /quantity is invalid/,
);
assert.deepEqual(resolveMenuListQuantityCreditUpdate({
    currentMonthlyCredits: 500,
    currentMonthlyCreditsAllowance: 600,
    planId: 'menulist_multi_location',
    quantity: 3,
}), {
    monthlyCredits: 800,
    monthlyCreditsAllowance: 900,
});
assert.deepEqual(resolveMenuListQuantityCreditUpdate({
    currentMonthlyCredits: 800,
    currentMonthlyCreditsAllowance: 900,
    planId: 'menulist_multi_location',
    quantity: 2,
}), {
    monthlyCredits: 500,
    monthlyCreditsAllowance: 600,
});
assert.deepEqual(MENULIST_CONTENT_CREDIT_PACK, {
    creditAmount: 250,
    packId: 'enhancement',
    priceINRPaise: 79_900,
    priceUSDCents: 2_900,
});

const promotionalNowMs = Date.UTC(2026, 7, 22);
assert.deepEqual(resolveMenuListPromotionalCreditState({
    credits: 50,
    expiresAt: { seconds: Math.floor((promotionalNowMs + 60_000) / 1_000) },
    nowMs: promotionalNowMs,
}), { credits: 50, expiresAtMillis: promotionalNowMs + 60_000 });
assert.deepEqual(resolveMenuListPromotionalCreditState({
    credits: 50,
    expiresAt: { seconds: Math.floor((promotionalNowMs - 60_000) / 1_000) },
    nowMs: promotionalNowMs,
}), { credits: 0, expiresAtMillis: promotionalNowMs - 60_000 });
assert.equal(resolveMenuListPromotionalCreditState({
    credits: '50',
    expiresAt: new Date(promotionalNowMs + 60_000),
    nowMs: promotionalNowMs,
}).credits, null);

process.stdout.write('MenuList pricing policy tests passed.\n');
