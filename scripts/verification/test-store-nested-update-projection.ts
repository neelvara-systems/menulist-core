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
        modifiedOn: 'now',
        publicPresence: { descriptor: { en: 'New English' }, photos: ['one'] },
        workingHours: { monday: '09:00-17:00' },
    }),
    [
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
