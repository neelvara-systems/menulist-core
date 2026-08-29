import assert from 'node:assert/strict';

import { getStoreDeepDifference } from '../../src/lib/store/storeNestedUpdateProjection';
import { applyBusinessCopyManualOverrideMetaToUpdate } from '../../src/services/ai/businessCopy/metadata';

const originalStore = {
    businessCopyMeta: {
        lastManualOverrideAt: '2026-08-28T00:00:00.000Z',
        lastManualOverrideFieldKeys: ['tagline'],
    },
    city: 'Bengaluru',
    tagline: { en: 'Local coffee and calm mornings' },
};

const noChangeUpdate = applyBusinessCopyManualOverrideMetaToUpdate({
    existingMeta: originalStore.businessCopyMeta,
    update: getStoreDeepDifference({
        city: originalStore.city,
        tagline: originalStore.tagline,
    }, originalStore),
});

assert.deepEqual(
    noChangeUpdate,
    {},
    'An unchanged business-settings draft must not manufacture audit metadata or a Firestore write.',
);

const nonCopyUpdate = applyBusinessCopyManualOverrideMetaToUpdate({
    existingMeta: originalStore.businessCopyMeta,
    update: getStoreDeepDifference({ city: 'Mysuru' }, originalStore),
});

assert.deepEqual(
    nonCopyUpdate,
    { city: 'Mysuru' },
    'A non-copy update must remain free of business-copy audit metadata.',
);

const copyUpdate = applyBusinessCopyManualOverrideMetaToUpdate({
    existingMeta: originalStore.businessCopyMeta,
    update: getStoreDeepDifference({
        tagline: { en: 'Coffee, breakfast, and quiet work tables' },
    }, originalStore),
});

assert.deepEqual(copyUpdate.tagline, { en: 'Coffee, breakfast, and quiet work tables' });
assert.deepEqual(
    (copyUpdate.businessCopyMeta as { lastManualOverrideFieldKeys?: string[] }).lastManualOverrideFieldKeys,
    ['tagline'],
    'A real business-copy change must retain its audit field list.',
);
assert.match(
    String((copyUpdate.businessCopyMeta as { lastManualOverrideAt?: string }).lastManualOverrideAt),
    /^\d{4}-\d{2}-\d{2}T/,
    'A real business-copy change must retain its audit timestamp.',
);

console.log('Business settings no-op update regression tests passed.');
