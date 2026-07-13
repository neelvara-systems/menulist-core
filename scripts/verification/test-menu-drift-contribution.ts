#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    addMenuDriftSummaryContribution,
    getPriceStaleAssessment,
    MENU_DRIFT_SUMMARY_MAX_ITEMS,
    readMenuDriftContributions,
    type MenuDriftSummaryContribution,
} from '../../src/data/shared/menuDriftContribution';

const detailedPrice = readMenuDriftContributions({
    itemId: 'item-1',
    changeType: 'PRICE',
});
assert.deepEqual(detailedPrice, [{
    itemId: 'item-1',
    priceChanges: 1,
    availabilityChanges: 0,
}]);

const detailedAvailability = readMenuDriftContributions({
    itemId: 'item-2',
    changeType: 'AVAILABILITY',
});
assert.equal(detailedAvailability[0]?.availabilityChanges, 1);

const extractedPriceCorrection = readMenuDriftContributions({
    itemId: 'item-3',
    changeType: 'EXTRACTION_CORRECTION',
    oldValue: { field: 'price', extracted: '10.00' },
});
assert.equal(extractedPriceCorrection[0]?.priceChanges, 1);
assert.deepEqual(readMenuDriftContributions({
    itemId: 'item-3',
    changeType: 'EXTRACTION_CORRECTION',
    oldValue: { field: 'name', extracted: 'Old name' },
}), []);

const compactSummary = readMenuDriftContributions({
    changeType: 'MENU_REVISION_SUMMARY',
    newValue: {
        itemDriftChanges: [
            { itemId: 'item-1', priceChanges: 1, availabilityChanges: 0 },
            { itemId: 'item-1', priceChanges: 0, availabilityChanges: 1 },
            { itemId: 'item-2', priceChanges: 2, availabilityChanges: 0 },
            { itemId: 'item-3', priceChanges: 0, availabilityChanges: 0 },
            { itemId: 'bad/id', priceChanges: 1, availabilityChanges: 0 },
        ],
    },
});
assert.deepEqual(compactSummary, [{
    itemId: 'item-1',
    priceChanges: 1,
    availabilityChanges: 1,
}], 'duplicates must merge without inflation and malformed entries must be ignored');

const built: MenuDriftSummaryContribution[] = [];
assert.equal(addMenuDriftSummaryContribution(built, 'item-1', 'price'), true);
assert.equal(addMenuDriftSummaryContribution(built, 'item-1', 'availability'), true);
assert.deepEqual(built, [{
    itemId: 'item-1',
    priceChanges: 1,
    availabilityChanges: 1,
}]);
assert.equal(addMenuDriftSummaryContribution(built, 'bad/id', 'price'), false);

const atCapacity: MenuDriftSummaryContribution[] = Array.from(
    { length: MENU_DRIFT_SUMMARY_MAX_ITEMS },
    (_, index) => ({
        itemId: `item-${index}`,
        priceChanges: 1,
        availabilityChanges: 0,
    }),
);
assert.equal(
    addMenuDriftSummaryContribution(atCapacity, 'overflow-item', 'price'),
    false,
    'producer must signal overflow so the caller can preserve it as a detailed event',
);
assert.deepEqual(readMenuDriftContributions({
    changeType: 'MENU_REVISION_SUMMARY',
    newValue: {
        itemDriftChanges: Array.from(
            { length: MENU_DRIFT_SUMMARY_MAX_ITEMS + 1 },
            (_, index) => ({
                itemId: `item-${index}`,
                priceChanges: 1,
                availabilityChanges: 0,
            }),
        ),
    },
}), [], 'oversized untrusted summary arrays must be rejected as a unit');

assert.deepEqual(getPriceStaleAssessment(null, 180), {
    value: null,
    status: 'unavailable_outside_rolling_window',
});
assert.deepEqual(getPriceStaleAssessment(20, 180), {
    value: false,
    status: 'measured',
});
assert.deepEqual(getPriceStaleAssessment(181, 180), {
    value: true,
    status: 'measured',
});

process.stdout.write('Menu drift contribution boundary tests passed.\n');
