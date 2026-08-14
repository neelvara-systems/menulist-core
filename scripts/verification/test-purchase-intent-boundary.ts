import assert from 'node:assert/strict';
import { getB2CPlansList } from '../../src/data/PlatformPlansList';
import {
    normalizePurchaseIntent,
    parseStoredPurchaseIntent,
    PURCHASE_INTENT_MAX_AGE_MS,
    serializePurchaseIntent,
} from '../../src/lib/billing/purchaseIntentBoundary';

const now = Date.UTC(2026, 6, 22, 12, 0, 0);
const canonicalPlan = getB2CPlansList().find((plan) => plan.planId === 'pro' && plan.billingInterval === 'YEAR');
assert.ok(canonicalPlan);

const input = {
    businessName: '  Owner Cafe  ',
    businessIndustry: '  Cafe  ',
    businessDayEndTime: '02:00',
    currency: 'INR',
    plan: {
        ...canonicalPlan,
        amount: 1,
        name: 'Tampered plan name',
        priceINR: { price: 1, monthlyCredits: 999_999 },
    },
    selfReportedDiscoveryChannel: 'chatgpt',
    timeZone: 'Asia/Kolkata',
};

const normalized = normalizePurchaseIntent(input);
assert.ok(normalized);
assert.equal(normalized.businessName, 'Owner Cafe');
assert.equal(normalized.businessIndustry, 'Cafe');
assert.equal(normalized.plan.name, canonicalPlan.name);
assert.deepEqual(normalized.plan.priceINR, canonicalPlan.priceINR);
assert.equal(normalized.selfReportedDiscoveryChannel, 'chatgpt');

const serialized = serializePurchaseIntent(input, now);
assert.ok(serialized);
assert.deepEqual(parseStoredPurchaseIntent(serialized, now + 1_000), normalized);
assert.equal(parseStoredPurchaseIntent(serialized, now + PURCHASE_INTENT_MAX_AGE_MS + 1), null);
assert.equal(parseStoredPurchaseIntent(serialized, now - 60_001), null);
assert.equal(parseStoredPurchaseIntent(JSON.stringify(input), now), null, 'legacy unversioned localStorage state must not resume');
assert.equal(parseStoredPurchaseIntent('{broken', now), null);
assert.equal(parseStoredPurchaseIntent('x'.repeat(32_769), now), null);
assert.equal(normalizePurchaseIntent({ ...input, currency: 'EUR' }), null);
assert.equal(normalizePurchaseIntent({ ...input, businessName: '' }), null);
assert.equal(normalizePurchaseIntent({ ...input, plan: { ...input.plan, planId: 'unknown' } }), null);
assert.equal(normalizePurchaseIntent({ ...input, plan: { ...input.plan, billingInterval: 'WEEK' } }), null);
assert.equal(normalizePurchaseIntent({ ...input, selfReportedDiscoveryChannel: 'reddit' }), null);

console.log('Purchase intent boundary tests passed.');
