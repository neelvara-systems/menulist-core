import assert from 'node:assert/strict';
import {
    getCampaignCacheScope,
    getPastActivityCacheKey,
    getPastActivityProjectsCacheKey,
    getTodayCampaignsCacheKey,
    isCampaignExecutionSurface,
    isCampaignExportMethod,
    normalizeCampaignActivityDate,
    projectCampaignExportRecord,
    projectCampaignRecord,
    projectPhysicalSurfaceEligibility,
    projectStaffPrompt,
} from '../../src/lib/campaigns/campaignClientBoundary';
import {
    buildCampaignCompletionState,
    buildCampaignSkipState,
    getCampaignStatsState,
    getCampaignTodayState,
    isCampaignTodayState,
} from '../../src/lib/campaigns/campaignActionState';

const tenantOne = getCampaignCacheScope({ tId: 1, sId: 11 });
const tenantTwo = getCampaignCacheScope({ tId: 2, sId: 11 });

assert.deepEqual(getTodayCampaignsCacheKey(tenantOne), ['today-campaigns', 1, 11]);
assert.deepEqual(getTodayCampaignsCacheKey(tenantTwo), ['today-campaigns', 2, 11]);
assert.notDeepEqual(
    getTodayCampaignsCacheKey(tenantOne),
    getTodayCampaignsCacheKey(tenantTwo),
    'the same store id in different tenants must not share campaign cache state',
);
assert.deepEqual(getPastActivityCacheKey(tenantOne, ' project_1 '), ['past-activity', 1, 11, 'project_1']);
assert.deepEqual(getPastActivityProjectsCacheKey(tenantOne), ['past-activity-projects', 1, 11]);
assert.equal(getPastActivityCacheKey(tenantOne, '  '), null);
assert.equal(getTodayCampaignsCacheKey(getCampaignCacheScope({ tId: 0, sId: 11 })), null);
assert.equal(getTodayCampaignsCacheKey(getCampaignCacheScope({ tId: '1', sId: 11 })), null);

const expectedMillis = 1_700_000_000_123;
assert.equal(normalizeCampaignActivityDate(new Date(expectedMillis))?.getTime(), expectedMillis);
assert.equal(
    normalizeCampaignActivityDate({ toDate: () => new Date(expectedMillis) })?.getTime(),
    expectedMillis,
);
assert.equal(
    normalizeCampaignActivityDate({ toMillis: () => expectedMillis })?.getTime(),
    expectedMillis,
);
assert.equal(
    normalizeCampaignActivityDate({ seconds: 1_700_000_000, nanoseconds: 123_000_000 })?.getTime(),
    expectedMillis,
);
assert.equal(normalizeCampaignActivityDate({ toDate: () => { throw new Error('legacy timestamp'); } }), null);
assert.equal(normalizeCampaignActivityDate({ seconds: 1, nanoseconds: 1_000_000_000 }), null);
assert.equal(normalizeCampaignActivityDate('2024-01-01T00:00:00.000Z'), null);

const validCampaign = {
    campaignId: 'campaign_1',
    projectId: 'project_1',
    type: 'meal_push',
    kind: 'active',
    subject: { itemId: 'item_1', itemName: 'Soup' },
    intent: 'broadcast_attention',
    primarySurface: 'whatsapp_status',
    status: 'suggested',
    confidence: 0.8,
} as const;
const malformedSummary = {
    stats: {
        totalCompleted: '4',
        totalSkipped: -3,
        lastCampaignDate: 42,
        typeSkipCounts: {
            meal_push: '9',
            festival: 2,
            attacker_defined_type: 999,
        },
    },
    today: {
        date: '2026-07-26',
        primary: { ...validCampaign, confidence: Number.NaN },
        operational: [validCampaign, null, { ...validCampaign, projectId: '' }],
        isEmpty: true,
    },
};
assert.deepEqual(getCampaignStatsState(malformedSummary), {
    totalCompleted: 0,
    totalSkipped: 0,
    typeSkipCounts: { festival: 2 },
});
assert.deepEqual(getCampaignTodayState(malformedSummary, '2026-07-26'), {
    date: '2026-07-26',
    primary: undefined,
    operational: [validCampaign],
    isEmpty: false,
});
assert.equal(isCampaignTodayState(getCampaignTodayState(malformedSummary, '2026-07-26')), true);
assert.equal(isCampaignTodayState({
    date: '2026-07-26',
    primary: undefined,
    operational: [],
    isEmpty: false,
}), false);
assert.deepEqual(buildCampaignCompletionState(malformedSummary, '2026-07-26', 'campaign_1').stats, {
    totalCompleted: 1,
    totalSkipped: 0,
    lastCampaignDate: '2026-07-26',
    typeSkipCounts: { festival: 2 },
});
assert.deepEqual(buildCampaignSkipState(malformedSummary, '2026-07-26', 'campaign_1', 'festival').stats, {
    totalCompleted: 0,
    totalSkipped: 1,
    lastCampaignDate: '2026-07-26',
    typeSkipCounts: { festival: 3 },
});

const timestamp = {
    toDate: () => new Date(expectedMillis),
    toMillis: () => expectedMillis,
};
const persistedCampaign = {
    assets: {
        imageUrl: 'https://example.com/image.webp',
        source: 'existing_image',
    },
    confidence: {
        availabilityScore: 1,
        behaviorScore: 0.8,
        timingScore: 0.5,
        total: 0.4,
    },
    createdAt: timestamp,
    id: 'campaign_1',
    intent: 'broadcast_attention',
    kind: 'active',
    primarySurface: 'whatsapp_status',
    projectId: 'project_1',
    sId: 11,
    secondarySurfaces: ['digital_screen'],
    skipCount: 0,
    status: 'suggested',
    subject: { itemId: 'item_1', itemName: 'Soup' },
    suggestedFor: '2026-07-27',
    tId: 1,
    type: 'meal_push',
    updatedAt: timestamp,
};
assert.equal(projectCampaignRecord(persistedCampaign, {
    campaignId: 'campaign_1',
    sId: 11,
    tId: 1,
})?.id, 'campaign_1');
assert.equal(projectCampaignRecord({ ...persistedCampaign, tId: '1' }, {
    campaignId: 'campaign_1',
    sId: 11,
    tId: 1,
}), null, 'coercible persisted tenant identity must fail closed');
assert.equal(projectCampaignRecord({
    ...persistedCampaign,
    confidence: { ...persistedCampaign.confidence, total: Number.NaN },
}, {
    campaignId: 'campaign_1',
    sId: 11,
    tId: 1,
}), null, 'malformed persisted confidence must fail closed');
assert.equal(projectCampaignRecord({
    ...persistedCampaign,
    secondarySurfaces: ['digital_screen', 'digital_screen'],
}, {
    campaignId: 'campaign_1',
    sId: 11,
    tId: 1,
}), null, 'duplicate persisted surfaces must fail closed');
assert.equal(projectCampaignRecord({
    ...persistedCampaign,
    suggestedFor: '2026-02-30',
}, {
    campaignId: 'campaign_1',
    sId: 11,
    tId: 1,
}), null, 'impossible persisted campaign dates must fail closed');

const persistedExport = {
    campaignId: 'campaign_1',
    exportedAt: timestamp,
    id: 'complete_campaign_1',
    method: 'download',
    projectId: 'project_1',
    sId: 11,
    surface: 'digital_screen',
    tId: 1,
};
assert.equal(projectCampaignExportRecord(persistedExport, {
    campaignId: 'campaign_1',
    exportId: 'complete_campaign_1',
    method: 'download',
    projectId: 'project_1',
    sId: 11,
    surface: 'digital_screen',
    tId: 1,
})?.id, 'complete_campaign_1');
assert.equal(projectCampaignExportRecord({ ...persistedExport, sId: '11' }, {
    campaignId: 'campaign_1',
    exportId: 'complete_campaign_1',
    method: 'download',
    projectId: 'project_1',
    sId: 11,
    surface: 'digital_screen',
    tId: 1,
}), null, 'coercible persisted export scope must fail closed');
assert.equal(isCampaignExecutionSurface('digital_screen'), true);
assert.equal(isCampaignExecutionSurface('unknown_surface'), false);
assert.equal(isCampaignExportMethod('download'), true);
assert.equal(isCampaignExportMethod('unknown_method'), false);

assert.deepEqual(projectStaffPrompt({
    confidence: 0.9,
    eligible: true,
    inertia: {
        consecutiveDays: 3,
        startDate: '2026-07-25',
        weekAppearances: 1,
        weekStartDate: '2026-07-20',
    },
    itemId: 'item_1',
    itemName: 'Masala Dosa',
    stableDays: 12,
    text: 'Most people take the Masala Dosa.',
    validatedOnSurfaces: ['decision_blocks', 'digital_screen'],
})?.text, 'Most people take the Masala Dosa.');
assert.equal(projectStaffPrompt({
    confidence: 0.9,
    eligible: true,
    inertia: {
        consecutiveDays: -1,
        startDate: '2026-07-25',
        weekAppearances: 1,
        weekStartDate: '2026-07-20',
    },
    itemId: 'item_1',
    itemName: 'Masala Dosa',
    stableDays: 12,
    text: 'Most people take the Masala Dosa.',
    validatedOnSurfaces: ['decision_blocks'],
}), undefined);
assert.equal(projectStaffPrompt({
    confidence: 0.9,
    eligible: true,
    inertia: {
        consecutiveDays: 3,
        startDate: '2026-02-30',
        weekAppearances: 1,
        weekStartDate: '2026-07-20',
    },
    itemId: 'item_1',
    itemName: 'Masala Dosa',
    stableDays: 12,
    text: 'Most people take the Masala Dosa.',
    validatedOnSurfaces: ['decision_blocks'],
}), undefined, 'impossible staff-prompt calendar dates must fail closed');
assert.equal(
    getCampaignStatsState({
        stats: {
            totalCompleted: 1,
            totalSkipped: 1,
            lastCampaignDate: '2026-02-30',
            typeSkipCounts: {},
        },
    }).lastCampaignDate,
    undefined,
    'impossible summary dates must not become campaign chronology authority',
);
assert.equal(projectPhysicalSurfaceEligibility({
    counterSticker: {
        confidence: 0.85,
        eligible: true,
        itemId: 'item_1',
        itemName: 'Masala Dosa',
        qrUrl: 'https://example.com/menu',
        recheckAfter: timestamp,
        stableSinceDays: 12,
        templateId: 2,
    },
    tentCard: {
        confidence: 0.75,
        eligible: true,
        itemId: 'item_1',
        itemName: 'Masala Dosa',
        qrUrl: 'https://example.com/menu',
        recheckAfter: timestamp,
        templateId: 1,
    },
})?.tentCard?.templateId, 1);
assert.equal(projectPhysicalSurfaceEligibility({
    tentCard: {
        confidence: 0.75,
        eligible: true,
        qrUrl: 'https://example.com/menu',
        recheckAfter: timestamp,
        templateId: 5,
    },
}), undefined);

process.stdout.write('Campaign client boundary tests passed.\n');
