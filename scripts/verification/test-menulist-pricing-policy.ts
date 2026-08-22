#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { getB2CPlansList } from '../../src/data/PlatformPlansList';
import {
    getMenuListPlanCheckoutQuantity,
    getMenuListPlanMinimumQuantity,
    isValidMenuListPlanQuantity,
} from '../../src/lib/billing/menulistPricingPolicy';

const plans = getB2CPlansList();
const officialMonthly = plans.find((plan) => plan.planId === 'starter' && plan.billingInterval === 'MONTH');
const officialYearly = plans.find((plan) => plan.planId === 'starter' && plan.billingInterval === 'YEAR');
const proMonthly = plans.find((plan) => plan.planId === 'pro' && plan.billingInterval === 'MONTH');
const multiMonthly = plans.find((plan) => plan.planId === 'premium' && plan.billingInterval === 'MONTH');
const multiYearly = plans.find((plan) => plan.planId === 'premium' && plan.billingInterval === 'YEAR');

assert.ok(officialMonthly);
assert.ok(officialYearly);
assert.ok(proMonthly);
assert.ok(multiMonthly);
assert.ok(multiYearly);

assert.equal(officialMonthly.name, 'Official');
assert.equal(officialMonthly.priceINR.price, 59_900);
assert.equal(officialYearly.priceINR.price, 599_000);
assert.equal(proMonthly.priceINR.price, 149_900);
assert.equal(multiMonthly.priceINR.price, 149_900);
assert.equal(multiYearly.priceINR.price, 1_499_000);

assert.equal(getMenuListPlanMinimumQuantity(officialMonthly), 1);
assert.equal(getMenuListPlanCheckoutQuantity(officialMonthly), 1);
assert.equal(getMenuListPlanMinimumQuantity(multiMonthly), 2);
assert.equal(getMenuListPlanCheckoutQuantity(multiMonthly), 2);

assert.equal(isValidMenuListPlanQuantity({ planId: 'starter', quantity: 1, userType: 'B2C' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'starter', quantity: 2, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'pro', quantity: 1, userType: 'B2C' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'pro', quantity: 2, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'premium', quantity: 1, userType: 'B2C' }), false);
assert.equal(isValidMenuListPlanQuantity({ planId: 'premium', quantity: 2, userType: 'B2C' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'premium', quantity: 31, userType: 'B2C' }), true);
assert.equal(isValidMenuListPlanQuantity({ planId: 'premium', quantity: 32, userType: 'B2C' }), false);

process.stdout.write('MenuList pricing policy tests passed.\n');
