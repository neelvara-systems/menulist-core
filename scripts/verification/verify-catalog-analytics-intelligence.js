require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
        module: 'commonjs',
    },
});

process.env.GEMINI_AI_KEY = process.env.GEMINI_AI_KEY || 'catalog-analytics-verifier';
process.env.ENABLE_OWNER_ANALYTICS_AI_SUMMARIES = 'true';

const {
    buildCatalogActionCandidatesForTest,
} = require('../../functions/src/analytics/dashboardSummaryAggregation.ts');
const {
    resolveAnalyticsAiEntitlement,
} = require('../../functions/src/analytics/analyticsAiEntitlements.ts');
const fs = require('fs');
const path = require('path');

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function byType(actions, type) {
    return actions.find((action) => action.type === type);
}

function main() {
    const projectCatalog = {
        defaultLanguage: 'en',
        files: [{
            active: true,
            extractedData: {
                data: {
                    categories: [
                        { id: 'starters', active: true, name: { en: 'Starters' }, orderIndex: 0 },
                        { id: 'mains', active: true, name: { en: 'Mains' }, orderIndex: 1 },
                        { id: 'drinks', active: true, name: { en: 'Drinks' }, orderIndex: 3 },
                        {
                            id: 'breakfast',
                            active: true,
                            name: { en: 'Breakfast' },
                            orderIndex: 4,
                            timeSlots: [{ startTime: '08:00', endTime: '11:00', days: [1, 2, 3, 4, 5] }],
                        },
                        { id: 'hidden-category', active: false, name: { en: 'Hidden Specials' }, orderIndex: 5 },
                    ],
                    items: [
                        {
                            id: 'paneer-tikka',
                            active: true,
                            available: false,
                            category: 'starters',
                            name: { en: 'Paneer Tikka' },
                        },
                        {
                            id: 'cold-coffee',
                            active: true,
                            available: true,
                            category: 'drinks',
                            name: { en: 'Cold Coffee' },
                            description: { en: 'Chilled coffee drink' },
                            tags: [],
                        },
                        {
                            id: 'seasonal-juice',
                            active: true,
                            available: true,
                            category: 'drinks',
                            name: { en: 'Seasonal Juice' },
                        },
                        {
                            id: 'family-platter',
                            active: true,
                            available: true,
                            category: 'mains',
                            name: { en: 'Family Platter' },
                            description: { en: 'Family sharing meal' },
                            images: [{ url: 'https://example.com/family-platter.jpg' }],
                            attributes: [
                                { id: 'regular', active: true, name: { en: 'Regular' }, price: '499' },
                                { id: 'large', active: true, name: { en: 'Large' }, price: '699' },
                            ],
                        },
                        {
                            id: 'hidden-soup',
                            active: false,
                            available: true,
                            category: 'starters',
                            name: { en: 'Hidden Soup' },
                        },
                        {
                            id: 'breakfast-combo',
                            active: true,
                            available: true,
                            category: 'breakfast',
                            name: { en: 'Breakfast Combo' },
                            description: { en: 'Morning meal' },
                            images: [{ url: 'https://example.com/breakfast.jpg' }],
                        },
                        {
                            id: 'vegan-bowl',
                            active: true,
                            available: true,
                            category: 'mains',
                            name: { en: 'Vegan Bowl' },
                            dietaryTags: ['vegan'],
                            duration: 20,
                            images: [{ url: 'https://example.com/vegan-bowl.jpg' }],
                        },
                        {
                            id: 'premium-thali',
                            active: true,
                            available: true,
                            category: 'mains',
                            name: { en: 'Premium Thali' },
                            price: '999',
                            qualityReview: {
                                priceOutlierReviewedAt: '2026-05-01T00:00:00.000Z',
                                priceOutlierReviewedPrice: '999',
                            },
                        },
                    ],
                    languages: [{ code: 'en', isPrimary: true, name: 'English' }],
                },
            },
        }],
    };

    const analytics = {
        totalViews: 40,
        viewsByItem: {
            'paneer-tikka': 2,
            'cold-coffee': 9,
            'seasonal-juice': 12,
            'family-platter': 6,
            'hidden-soup': 3,
            'breakfast-combo': 5,
            'vegan-bowl': 7,
            'premium-thali': 8,
        },
        clicksByItem: {
            'cold-coffee': 2,
            'seasonal-juice': 3,
            'family-platter': 2,
            'breakfast-combo': 2,
            'vegan-bowl': 1,
        },
        recommendationClicksByItem: {
            'family-platter': 1,
        },
        unavailableItemTapsByItem: {
            'paneer-tikka': 4,
        },
        viewsByCategory: {
            breakfast: 10,
            'hidden-category': 6,
        },
        clicksByCategory: {
            breakfast: 5,
        },
        hourlyClicksByItem: {
            'breakfast-combo': {
                '8': 2,
                '9': 1,
            },
        },
    };

    const actions = buildCatalogActionCandidatesForTest(analytics, projectCatalog);
    const expectedTypes = [
        'unavailable_demand',
        'bestseller_validation',
        'category_reorder',
        'hidden_demand',
        'variant_clarity',
        'image_gap',
        'metadata_demand',
        'timed_category',
        'price_signal',
    ];

    expectedTypes.forEach((type) => {
        assert(byType(actions, type), `Expected catalog insight type ${type}`);
    });

    actions.forEach((action) => {
        assert(action.id && action.title && action.description, `Expected complete owner action card for ${action.type}`);
        assert(['high', 'medium', 'low'].includes(action.priority), `Expected valid priority for ${action.type}`);
        assert(action.actionLabel && action.reason, `Expected actionable reason for ${action.type}`);
    });

    assert(byType(actions, 'unavailable_demand').id.includes('paneer-tikka'), 'Expected unavailable demand to target Paneer Tikka');
    assert(byType(actions, 'category_reorder').description.includes('Breakfast'), 'Expected category reorder to target Breakfast');
    assert(byType(actions, 'variant_clarity').id.includes('family-platter'), 'Expected variant clarity to target item with active variants');
    assert(byType(actions, 'image_gap').id.includes('seasonal-juice'), 'Expected image gap to target high-demand item missing a photo');
    assert(byType(actions, 'image_gap').actionLabel === 'Add photo', 'Expected image gap to route to photo action label');
    assert(byType(actions, 'metadata_demand').id.includes('vegan-bowl'), 'Expected metadata demand to remain scoped to missing descriptions');
    assert(!byType(actions, 'metadata_demand').id.includes('seasonal-juice'), 'Expected metadata demand to skip the item already selected for image gap');
    assert(byType(actions, 'price_signal').id.includes('premium-thali'), 'Expected price signal to target reviewed price item');

    const proEntitlement = resolveAnalyticsAiEntitlement({ activePlanType: 'pro' });
    const freeEntitlement = resolveAnalyticsAiEntitlement({ activePlanType: 'free' });
    const missingEntitlement = resolveAnalyticsAiEntitlement({});
    const malformedEntitlement = resolveAnalyticsAiEntitlement({ activePlanType: { toString: () => 'pro' } });
    assert(proEntitlement.enabled === true, 'Expected Pro entitlement to enable menu intelligence');
    assert(freeEntitlement.enabled === false && freeEntitlement.reason === 'plan_not_eligible', 'Expected Free entitlement to be locked');
    assert(missingEntitlement.enabled === false && missingEntitlement.reason === 'missing_plan', 'Expected missing plan entitlement to fail closed');
    assert(malformedEntitlement.enabled === false && malformedEntitlement.reason === 'missing_plan', 'Expected malformed plan entitlement to fail closed without coercion');

    const schedulerSource = fs.readFileSync(path.join(__dirname, '../../functions/src/decisionBlocksScoring.ts'), 'utf8');
    const aggregationSource = fs.readFileSync(path.join(__dirname, '../../functions/src/aggregateCustomerAnalytics.ts'), 'utf8');
    assert(schedulerSource.includes('projectCatalogById') && schedulerSource.includes('projectEntries.map'), 'Expected scheduler to reuse already-loaded project docs');
    assert(aggregationSource.includes('projectCatalogById[projectId] || null'), 'Expected aggregation to pass catalog data into dashboard summary writer');

    console.log('PASS verify-catalog-analytics-intelligence');
    console.log(`Validated ${expectedTypes.length} catalog-aware analytics insight types, Pro gating, and scheduler catalog reuse.`);
}

main();
