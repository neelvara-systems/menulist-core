import assert from 'node:assert/strict';
import {
    assertPricingPlanQueryWithinLimit,
    normalizePricingPlan,
    PRICING_PLAN_QUERY_MAX_RESULTS,
} from '../../src/database/pricingPlans';

const validPlan = {
    active: true,
    currency: 'INR',
    description: 'Public plan',
    features: ['Published menus'],
    name: 'Current',
    periodicity: 'MONTH',
    planType: 'B2C',
    price: 9900,
    razorpayPlanId: 'plan_safe123',
    recommended: false,
    version: 1,
};

assert.deepEqual(normalizePricingPlan(validPlan, 'current'), {
    ...validPlan,
    id: 'current',
});
assert.equal(normalizePricingPlan({ ...validPlan, active: 'true' }, 'current'), null);
assert.equal(normalizePricingPlan({ ...validPlan, price: '9900' }, 'current'), null);
assert.equal(normalizePricingPlan({ ...validPlan, version: 1.5 }, 'current'), null);
assert.equal(normalizePricingPlan(validPlan, 'a/b'), null);

assert.doesNotThrow(() => assertPricingPlanQueryWithinLimit(PRICING_PLAN_QUERY_MAX_RESULTS));
for (const invalidSize of [-1, 1.5, PRICING_PLAN_QUERY_MAX_RESULTS + 1, Number.NaN]) {
    assert.throws(
        () => assertPricingPlanQueryWithinLimit(invalidSize),
        /Pricing plan query limit exceeded/,
    );
}

process.stdout.write('Pricing plan boundary tests passed.\n');
