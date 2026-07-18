import assert from 'node:assert/strict';
import { computeIntelligenceState, type MenuIntelligenceState } from '../../functions/src/intelligence/menuIntelligence';
import type { AggregatedAnalytics } from '../../functions/src/intelligence/shared/analyticsAggregator';
import { extractActiveItems } from '../../functions/src/intelligence/shared/itemExtractor';
import {
    getQuickPickThreshold,
    isQuickPickEnabledForCategory,
} from '../../functions/src/intelligence/shared/scoreNormalizer';

function analytics(overrides: Partial<AggregatedAnalytics> = {}): AggregatedAnalytics {
    return {
        totalViews: 0,
        totalClicks: 0,
        totalSessions: 0,
        clicksByItem: {},
        viewsByItem: {},
        recommendationClicksByItem: {},
        hourlyClicksByItem: {},
        itemNames: {},
        daysWithData: 0,
        source: 'intelligence_7d',
        ...overrides,
    };
}

const project = {
    files: [{
        extractedData: {
            data: {
                items: [
                    {
                        id: 'current-item',
                        extractionIdAliases: ['old-item', ' current-item ', ''],
                        name: { en: 'Current item' },
                        category: 'main',
                        price: '₹120',
                        duration: 0,
                        ownerBoost: 99,
                    },
                    {
                        id: 'inactive-item',
                        active: false,
                        name: { en: 'Inactive item' },
                    },
                ],
            },
        },
    }],
};

const extracted = extractActiveItems(project, analytics({
    totalViews: 1007,
    totalClicks: 13,
    viewsByItem: { 'current-item': 7, 'old-item': 8, 'deleted-item': 992 },
    clicksByItem: { 'current-item': 4, 'old-item': 5, 'deleted-item': 4 },
    recommendationClicksByItem: { 'old-item': 2, 'deleted-item': 30 },
    hourlyClicksByItem: {
        'current-item': { '7': 1 },
        'old-item': { '7': 2, '12': 3 },
        'deleted-item': { '20': 100 },
    },
}));

assert.equal(extracted.length, 1, 'analytics-only and inactive item IDs must not become scoreable');
assert.equal(extracted[0].itemId, 'current-item');
assert.equal(extracted[0].views, 15, 'current and retained alias views must be merged');
assert.equal(extracted[0].clicks, 9, 'current and retained alias clicks must be merged');
assert.equal(extracted[0].decisionBlockClicks, 2);
assert.deepEqual(extracted[0].hourlyClicks, { '7': 3, '12': 3 });
assert.equal(extracted[0].duration, 0, 'zero is a valid explicit duration');
assert.equal(extracted[0].price, 120);
assert.equal(extracted[0].ownerBoost, 20, 'owner boost must stay within the scoring boundary');

const negativePriceItem = extractActiveItems({
    files: [{ extractedData: { data: { items: [{ id: 'negative-price', name: { en: 'Invalid price' }, price: '-₹25' }] } } }],
}, analytics())[0];
assert.equal(negativePriceItem.price, 0, 'negative prices must not become positive during currency normalization');

assert.equal(isQuickPickEnabledForCategory('food'), true);
assert.equal(isQuickPickEnabledForCategory('specialty'), true);
assert.equal(isQuickPickEnabledForCategory('retail'), false);
assert.equal(isQuickPickEnabledForCategory('health'), false);
assert.equal(getQuickPickThreshold('food'), 10);
assert.equal(getQuickPickThreshold('specialty'), 20);
assert.equal(getQuickPickThreshold('unknown'), 10, 'unknown categories use the shared food fallback');

const intelligenceItem = {
    ...extracted[0],
    views: 50,
    clicks: 10,
    decisionBlockClicks: 0,
    hourlyClicks: { '7': 1, '12': 19 },
};
const dayOneAnalytics = analytics({
    totalViews: 50,
    totalClicks: 20,
    daysWithData: 7,
    clicksByItem: { 'current-item': 10 },
    viewsByItem: { 'current-item': 50 },
    lastSettledLocalDate: '2026-07-14',
});
const identity = { tId: '1', sId: '2', projectId: 'menu' };
const dayOne = computeIntelligenceState([intelligenceItem], dayOneAnalytics, null, identity);
assert.equal(dayOne.daysSinceCreation, 1);
assert.equal(dayOne.itemConfidence['current-item'].stableDays, 1);
assert.equal(dayOne.timeEligibility['current-item'].breakfast, false, 'a click below 10% does not make a slot eligible');
assert.equal(dayOne.timeEligibility['current-item'].lunch, true);

const sameDay = computeIntelligenceState([intelligenceItem], dayOneAnalytics, dayOne, identity);
assert.equal(sameDay.daysSinceCreation, 1, 'manual reruns of one settled date must not age calibration');
assert.equal(sameDay.itemConfidence['current-item'].stableDays, 1, 'manual reruns must not mature confidence');
assert.equal(sameDay.healthSummary?.topItemDays, dayOne.healthSummary?.topItemDays);

const nextDay = computeIntelligenceState(
    [intelligenceItem],
    { ...dayOneAnalytics, lastSettledLocalDate: '2026-07-15' },
    sameDay,
    identity,
);
assert.equal(nextDay.daysSinceCreation, 2);
assert.equal(nextDay.itemConfidence['current-item'].stableDays, 2);

const fatigueState: MenuIntelligenceState = {
    ...nextDay,
    daysSinceCreation: 5,
    lastAnalyticsDate: '2026-07-15',
    suppressionWindows: {},
    itemConfidence: {
        'current-item': {
            ...nextDay.itemConfidence['current-item'],
            score: 0.8,
            trend: 'stable',
            stableDays: 5,
        },
    },
};
const fatigued = computeIntelligenceState(
    [{ ...intelligenceItem, views: 10, clicks: 0 }],
    analytics({
        totalViews: 10,
        daysWithData: 7,
        viewsByItem: { 'current-item': 10 },
        lastSettledLocalDate: '2026-07-16',
    }),
    fatigueState,
    identity,
);
assert.equal(fatigued.itemConfidence['current-item'].trend, 'falling');
assert.equal(fatigued.suppressionWindows['current-item']?.reason, 'fatigue', 'fatigue must use the stable streak before the falling day');

console.log('Decision Intelligence and CMI boundary tests passed');
