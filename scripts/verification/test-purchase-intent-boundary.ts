import assert from 'node:assert/strict';
import { getB2CPlansList } from '../../src/data/PlatformPlansList';
import {
    normalizePurchaseIntent,
    parseStoredPurchaseIntent,
    PURCHASE_INTENT_MAX_AGE_MS,
    serializePurchaseIntent,
} from '../../src/lib/billing/purchaseIntentBoundary';

const now = Date.UTC(2026, 6, 22, 12, 0, 0);
const canonicalPlan = getB2CPlansList().find((plan) => plan.planId === 'menulist_pro' && plan.billingInterval === 'YEAR');
assert.ok(canonicalPlan);

const input = {
    billingProfile: {
        legalName: 'Owner Cafe Private Limited',
        email: 'billing@ownercafe.example',
        countryCode: 'IN',
        addressLine1: '1 Market Road',
        city: 'Pune',
        region: 'Maharashtra',
        indianStateCode: '27',
        postalCode: '411001',
    },
    businessName: '  Owner Cafe  ',
    businessIndustry: '  Cafe  ',
    businessDayEndTime: '02:00',
    currency: 'INR',
    quantity: 1,
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
assert.equal(normalized.quantity, 1);
assert.equal(normalized.billingProfile.legalName, 'Owner Cafe Private Limited');

const serialized = serializePurchaseIntent(input, now);
assert.ok(serialized);
assert.deepEqual(parseStoredPurchaseIntent(serialized, now + 1_000), normalized);
assert.equal(parseStoredPurchaseIntent(serialized, now + PURCHASE_INTENT_MAX_AGE_MS + 1), null);
assert.equal(parseStoredPurchaseIntent(serialized, now - 60_001), null);
assert.equal(parseStoredPurchaseIntent(JSON.stringify(input), now), null, 'legacy unversioned localStorage state must not resume');
assert.equal(parseStoredPurchaseIntent('{broken', now), null);
assert.equal(parseStoredPurchaseIntent('x'.repeat(32_769), now), null);
assert.equal(normalizePurchaseIntent({ ...input, currency: 'EUR' }), null);
assert.equal(normalizePurchaseIntent({ ...input, billingProfile: undefined }), null);
assert.equal(normalizePurchaseIntent({ ...input, businessName: '' }), null);
assert.equal(normalizePurchaseIntent({ ...input, plan: { ...input.plan, planId: 'unknown' } }), null);
assert.equal(normalizePurchaseIntent({ ...input, plan: { ...input.plan, billingInterval: 'WEEK' } }), null);
assert.equal(normalizePurchaseIntent({ ...input, selfReportedDiscoveryChannel: 'reddit' }), null);
assert.equal(normalizePurchaseIntent({ ...input, quantity: 0 }), null);
assert.equal(normalizePurchaseIntent({ ...input, quantity: 32 }), null);
assert.equal(normalizePurchaseIntent({ ...input, quantity: 2 }), null, 'single-location plans must reject multi-location quantities');

const multiLocationPlan = getB2CPlansList().find((plan) => plan.planId === 'menulist_multi_location' && plan.billingInterval === 'YEAR');
assert.ok(multiLocationPlan);
assert.ok(normalizePurchaseIntent({ ...input, plan: multiLocationPlan, quantity: 2 }));
assert.equal(normalizePurchaseIntent({ ...input, plan: multiLocationPlan, quantity: 1 }), null);

console.log('Purchase intent boundary tests passed.');
