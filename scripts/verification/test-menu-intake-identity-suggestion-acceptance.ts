import assert from 'node:assert/strict';
import {
    mergeBusinessIdentityUpdatesForCurrentStore,
    normalizeBusinessTypeSuggestion,
} from '@lib/menu-intake-identity/suggestionAcceptance';

assert.equal(normalizeBusinessTypeSuggestion('Restaurant'), 'Restaurant');
assert.equal(normalizeBusinessTypeSuggestion(' restaurant '), 'Restaurant');
assert.equal(normalizeBusinessTypeSuggestion('CAKE SHOP'), 'Cake Shop');

for (const ambiguousValue of [
    'shop',
    'service',
    'studio',
    'restaurant and cafe',
    'pet grooming',
]) {
    assert.equal(
        normalizeBusinessTypeSuggestion(ambiguousValue),
        null,
        `ambiguous business type "${ambiguousValue}" must require owner selection instead of first-match persistence`,
    );
}

assert.equal(normalizeBusinessTypeSuggestion(null), null);
assert.equal(normalizeBusinessTypeSuggestion({ value: 'Restaurant' }), null);

const currentStore = { name: 'Current', storeId: 11, tenantId: 21 };
assert.deepEqual(
    mergeBusinessIdentityUpdatesForCurrentStore(
        currentStore,
        { storeId: 11, tenantId: 21 },
        { name: 'Updated' },
    ),
    { name: 'Updated', storeId: 11, tenantId: 21 },
);
assert.equal(
    mergeBusinessIdentityUpdatesForCurrentStore(
        null,
        { storeId: 11, tenantId: 21 },
        { name: 'Stale update' },
    ),
    null,
);
assert.deepEqual(
    mergeBusinessIdentityUpdatesForCurrentStore(
        currentStore,
        { storeId: 12, tenantId: 21 },
        { name: 'Wrong store' },
    ),
    currentStore,
);
assert.deepEqual(
    mergeBusinessIdentityUpdatesForCurrentStore(
        currentStore,
        { storeId: 11, tenantId: 22 },
        { name: 'Wrong tenant' },
    ),
    currentStore,
);

console.log('Menu intake identity suggestion acceptance tests passed.');
