import assert from 'node:assert/strict';
import { RESERVED_SUBDOMAINS, isReservedSubdomain } from '../../src/constants/reservedSlugs';
import { RESERVED_SUBDOMAINS as ROUTING_RESERVED_SUBDOMAINS } from '../../src/constants/urls';
import { AVAILABLE_LANGUAGES } from '../../src/constants/common';
import PlatformFeaturesList, { commonFeaturesList } from '../../src/data/PlatformFeaturesList';
import { B2BplansList, B2CplansList } from '../../src/data/PlatformPlansList';
import { MENULIST_B2B_PLAN_IDS, MENULIST_B2C_PLAN_IDS } from '../../src/constants/menulistPlans';
import {
    calculateOfflineAmount,
    calculateOfflineLocationTopup,
} from '../../src/config/resellerPricing';

assert.strictEqual(
    ROUTING_RESERVED_SUBDOMAINS,
    RESERVED_SUBDOMAINS,
    'subdomain admission and runtime routing must share one reserved-name registry',
);

for (const productHostLabel of [
    'answerlattice',
    'campaigncue',
    'neelvara',
    'signaldesk',
]) {
    assert.equal(isReservedSubdomain(productHostLabel), true);
    assert.equal(ROUTING_RESERVED_SUBDOMAINS.includes(productHostLabel), true);
}

assert.deepEqual(
    AVAILABLE_LANGUAGES.map(({ label, value }) => ({ label, value })),
    [
        { label: 'English', value: 'en' },
        { label: 'Hindi', value: 'hi' },
        { label: 'Arabic', value: 'ar' },
    ],
    'the exported language registry must remain precisely typed and use valid public labels',
);

for (const plans of [B2CplansList, B2BplansList]) {
    const monthlyByPlan = new Map(
        plans
            .filter(({ billingInterval }) => billingInterval === 'MONTH')
            .map((plan) => [plan.planId, plan]),
    );

    for (const yearly of plans.filter(({ billingInterval }) => billingInterval === 'YEAR')) {
        const monthly = monthlyByPlan.get(yearly.planId);
        assert(monthly, `missing monthly plan for ${yearly.planId}`);
        assert.equal(
            yearly.priceINR.price,
            monthly.priceINR.price * 10,
            `${yearly.type} ${yearly.planId} INR yearly price must equal ten monthly payments`,
        );
        assert.equal(
            yearly.priceUSD.price,
            monthly.priceUSD.price * 10,
            `${yearly.type} ${yearly.planId} USD yearly price must equal ten monthly payments`,
        );
        assert.equal(yearly.priceINR.monthlyCredits, monthly.priceINR.monthlyCredits);
        assert.equal(yearly.priceUSD.monthlyCredits, monthly.priceUSD.monthlyCredits);
    }
}

const activePlanIds = {
    B2C: [
        MENULIST_B2C_PLAN_IDS.OFFICIAL,
        MENULIST_B2C_PLAN_IDS.PRO,
        MENULIST_B2C_PLAN_IDS.MULTI_LOCATION,
    ],
    B2B: [MENULIST_B2B_PLAN_IDS.STARTER_API, MENULIST_B2B_PLAN_IDS.PRO_API, 'custom'],
} as const;
for (const planType of ['B2C', 'B2B'] as const) {
    for (const feature of [...commonFeaturesList[planType], ...PlatformFeaturesList[planType]]) {
        for (const planId of activePlanIds[planType]) {
            assert.equal(
                Object.prototype.hasOwnProperty.call(feature.values, planId),
                true,
                `${planType} feature ${feature.id} must define active plan ${planId}`,
            );
            assert.notEqual(Reflect.get(feature.values, planId), undefined);
        }
    }
}

assert.throws(
    () => calculateOfflineAmount('STANDARD', 0, 1),
    /Invalid prepaid duration/,
);
assert.throws(
    () => calculateOfflineAmount('STANDARD', Number.NaN, 1),
    /Invalid prepaid duration/,
);

for (const invalidTime of [
    new Date('invalid'),
    { toDate: () => { throw new Error('legacy getter failed'); } },
    { toDate: () => new Date('invalid') },
]) {
    const result = calculateOfflineLocationTopup({
        locationCount: 2,
        now: new Date('2026-01-01T00:00:00.000Z'),
        pricingTier: 'STANDARD',
        validUntil: invalidTime,
    });
    assert.deepEqual(result, {
        amountPaise: 0,
        daysRemaining: 0,
        locationCount: 2,
    });
}

const exactProration = calculateOfflineLocationTopup({
    locationCount: 2,
    now: new Date('2026-01-01T00:00:00.000Z'),
    pricingTier: 'STANDARD',
    validUntil: new Date('2026-01-31T00:00:00.000Z'),
});
assert.deepEqual(exactProration, {
    amountPaise: 99800,
    daysRemaining: 30,
    locationCount: 2,
});
assert(Number.isSafeInteger(exactProration.amountPaise));

console.log('Business policy constant regression tests passed.');
