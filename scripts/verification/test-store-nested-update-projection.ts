import assert from 'node:assert/strict';
import { sanitizeForFirestore } from '../../src/lib/firestore/sanitizeForFirestore';
import {
    getStoreDeepDifference,
    isStoreNestedDelete,
    mergeStoreNestedUpdateWithCurrent,
    projectStoreNestedUpdateEntries,
    STORE_NESTED_DELETE,
} from '../../src/lib/store/storeNestedUpdateProjection';

assert.deepEqual(
    getStoreDeepDifference(
        {
            name: 'Current name',
            publicPresence: {
                descriptor: { en: 'New English', hi: 'Hindi' },
                showCall: true,
            },
        },
        {
            name: 'Current name',
            publicPresence: {
                descriptor: { en: 'Old English', hi: 'Hindi' },
                showCall: true,
            },
        },
    ),
    { publicPresence: { descriptor: { en: 'New English' } } },
    'deep difference must carry only changed nested leaves',
);

assert.deepEqual(
    getStoreDeepDifference(
        { publicPresence: { showCall: false }, storeId: 101 },
        {
            analytics: { trackMenuViews: true },
            name: 'Concurrent business name',
            publicPresence: { descriptor: { en: 'Current' }, showCall: true },
            storeId: 101,
        },
    ),
    { publicPresence: { descriptor: STORE_NESTED_DELETE, showCall: false } },
    'partial top-level mutation DTOs must not delete omitted store fields while supplied complete nested maps retain deletion semantics',
);

const removalDifference = getStoreDeepDifference(
    { socialMedia: { instagram: 'https://instagram.com/current' } },
    { socialMedia: { facebook: 'https://facebook.com/old', instagram: 'https://instagram.com/current' } },
);
assert.equal(
    isStoreNestedDelete((removalDifference.socialMedia as Record<string, unknown>).facebook),
    true,
    'deep difference must represent intentional nested deletion without replacing concurrent siblings',
);
const removalProjection = projectStoreNestedUpdateEntries(removalDifference);
assert.equal(
    isStoreNestedDelete(removalProjection.find((entry) => entry.path.join('.') === 'socialMedia.facebook')?.value),
    true,
    'nested deletion markers must project onto the exact Firestore field path',
);
assert.equal(
    (sanitizeForFirestore(removalDifference).socialMedia as Record<string, unknown>).facebook,
    (removalDifference.socialMedia as Record<string, unknown>).facebook,
    'request composition sanitization must preserve the atomic deletion marker',
);
assert.deepEqual(
    mergeStoreNestedUpdateWithCurrent(
        { socialMedia: { facebook: 'old', instagram: 'current', tiktok: 'concurrent' } },
        removalDifference,
    ),
    { socialMedia: { instagram: 'current', tiktok: 'concurrent' } },
    'transaction-current projection must remove only the requested nested field',
);

assert.deepEqual(
    projectStoreNestedUpdateEntries({
        externalLocationIdentity: {
            schemaVersion: 'menulist.external-location-identity.v1',
            bindings: {
                google_maps: {
                    provider: 'google_maps',
                    providerLocationId: 'ChIJ-current',
                },
            },
        },
        modifiedOn: 'now',
        publicPresence: { descriptor: { en: 'New English' }, photos: ['one'] },
        workingHours: { monday: '09:00-17:00' },
    }),
    [
        {
            path: ['externalLocationIdentity', 'schemaVersion'],
            value: 'menulist.external-location-identity.v1',
        },
        {
            path: ['externalLocationIdentity', 'bindings', 'google_maps', 'provider'],
            value: 'google_maps',
        },
        {
            path: ['externalLocationIdentity', 'bindings', 'google_maps', 'providerLocationId'],
            value: 'ChIJ-current',
        },
        { path: ['modifiedOn'], value: 'now' },
        { path: ['publicPresence', 'descriptor', 'en'], value: 'New English' },
        { path: ['publicPresence', 'photos'], value: ['one'] },
        { path: ['workingHours', 'monday'], value: '09:00-17:00' },
    ],
    'nested store patches must become Firestore field paths',
);

assert.deepEqual(
    mergeStoreNestedUpdateWithCurrent(
        {
            externalLocationIdentity: {
                schemaVersion: 'menulist.external-location-identity.v1',
                bindings: {
                    google_business_profile: {
                        provider: 'google_business_profile',
                        providerLocationId: 'gbp-current',
                    },
                    google_maps: {
                        provider: 'google_maps',
                        providerLocationId: 'maps-old',
                    },
                },
            },
        },
        {
            externalLocationIdentity: {
                bindings: {
                    google_maps: {
                        provider: 'google_maps',
                        providerLocationId: 'maps-new',
                    },
                },
            },
        },
    ),
    {
        externalLocationIdentity: {
            schemaVersion: 'menulist.external-location-identity.v1',
            bindings: {
                google_business_profile: {
                    provider: 'google_business_profile',
                    providerLocationId: 'gbp-current',
                },
                google_maps: {
                    provider: 'google_maps',
                    providerLocationId: 'maps-new',
                },
            },
        },
    },
    'external location updates must preserve other provider bindings',
);
const externalLocationRemovalProjection = projectStoreNestedUpdateEntries({
    externalLocationIdentity: {
        bindings: {
            google_maps: STORE_NESTED_DELETE,
        },
    },
});
assert.equal(
    isStoreNestedDelete(
        externalLocationRemovalProjection.find(
            (entry) => entry.path.join('.') === 'externalLocationIdentity.bindings.google_maps',
        )?.value,
    ),
    true,
    'external location removal must target only the selected provider binding',
);

assert.deepEqual(
    mergeStoreNestedUpdateWithCurrent(
        {
            publicPresence: {
                descriptor: { en: 'Old English', hi: 'Concurrent Hindi' },
                photos: ['current-photo'],
                showCall: false,
            },
            workingHours: { monday: 'old', tuesday: 'concurrent' },
        },
        {
            publicPresence: { descriptor: { en: 'New English' } },
            workingHours: { monday: 'new' },
        },
    ),
    {
        publicPresence: {
            descriptor: { en: 'New English', hi: 'Concurrent Hindi' },
            photos: ['current-photo'],
            showCall: false,
        },
        workingHours: { monday: 'new', tuesday: 'concurrent' },
    },
    'transaction-current projection must preserve untouched sibling truth',
);

assert.deepEqual(
    projectStoreNestedUpdateEntries({ socialMedia: { 'x.com': 'https://x.com/current' } }),
    [{ path: ['socialMedia', 'x.com'], value: 'https://x.com/current' }],
    'literal dots in dynamic nested keys must remain one FieldPath segment',
);

assert.deepEqual(
    projectStoreNestedUpdateEntries({ 'posSync.webhookUrl': 'https://provider.example/menu' }),
    [{ path: ['posSync', 'webhookUrl'], value: 'https://provider.example/menu' }],
    'existing validated dotted-field callers must remain supported',
);
assert.throws(
    () => projectStoreNestedUpdateEntries({ 'posSync..webhookUrl': 'unsafe' }),
    /store_nested_update_field_invalid/,
    'malformed pre-projected Firestore paths must fail closed',
);

console.log('Store nested update projection tests passed.');
