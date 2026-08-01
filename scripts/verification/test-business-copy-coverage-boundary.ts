import assert from 'node:assert/strict';
import { assertBusinessCopyCoverageCore } from '../../src/__tests__/businessCopyTranslationCoverage';
import {
    getBusinessCopyFieldConfigs,
    readBusinessCopyOwnValueAtPath,
} from '../../src/services/ai/businessCopy/fieldConfig';
import { computeBusinessCopyCoverage } from '../../src/services/ai/businessCopy/translationCoverage';
import { computeBusinessCopyCoverageCore } from '../../src/services/ai/businessCopy/translationCoverageCore';
import { getBusinessCopyFieldKeysFromUpdate } from '../../src/services/ai/businessCopy/metadata';

assertBusinessCopyCoverageCore();

let accessorReads = 0;
const localizedAccessor = Object.create(null) as Record<string, unknown>;
Object.defineProperty(localizedAccessor, 'en', {
    enumerable: true,
    get() {
        accessorReads += 1;
        return 'must not execute';
    },
});
const accessorCoverage = computeBusinessCopyCoverageCore({
    fields: [{ key: 'descriptor', value: localizedAccessor }],
    managedLanguages: ['en', 'hi'],
    preferredLanguage: 'en',
});
assert.equal(accessorCoverage.fields[0]?.status, 'empty');
assert.equal(accessorReads, 0);

const hostileLocalized = new Proxy({}, {
    ownKeys() {
        throw new Error('must stay contained');
    },
});
assert.doesNotThrow(() => computeBusinessCopyCoverageCore({
    fields: [{ key: 'descriptor', value: hostileLocalized }],
    managedLanguages: ['en', 'hi'],
    preferredLanguage: 'en',
}));

const legacyNullCoverage = computeBusinessCopyCoverageCore({
    fields: [{ key: 'descriptor', value: { en: 'Breakfast', hi: null } }],
    managedLanguages: ['en', 'hi'],
    preferredLanguage: 'en',
});
assert.equal(legacyNullCoverage.fields[0]?.sourceValue, 'Breakfast');
assert.deepEqual(legacyNullCoverage.fields[0]?.missingLanguages, ['hi']);

const inheritedStore = Object.create({
    publicPresence: {
        descriptor: { en: 'Foreign inherited value' },
    },
}) as Record<string, unknown>;
assert.equal(
    getBusinessCopyFieldConfigs().find((field) => field.key === 'descriptor')?.readValue(inheritedStore),
    undefined,
);

const storeWithAccessors = Object.create(null) as Record<string, unknown>;
Object.defineProperty(storeWithAccessors, 'publicPresence', {
    enumerable: true,
    get() {
        accessorReads += 1;
        return { descriptor: { en: 'must not execute' } };
    },
});
Object.defineProperty(storeWithAccessors, 'keywords', {
    enumerable: true,
    get() {
        accessorReads += 1;
        return { en: ['must not execute'] };
    },
});
assert.equal(readBusinessCopyOwnValueAtPath(storeWithAccessors, ['publicPresence']), undefined);
const fullCoverage = computeBusinessCopyCoverage(storeWithAccessors);
assert.equal(fullCoverage.fields.every((field) => field.status === 'empty'), true);
assert.equal(accessorReads, 0);

const inheritedUpdate = Object.create({
    tagline: 'inherited',
    publicPresence: { descriptor: 'inherited' },
}) as Record<string, unknown>;
inheritedUpdate.metaTitle = 'Current title';
assert.deepEqual(getBusinessCopyFieldKeysFromUpdate(inheritedUpdate), ['metaTitle']);

const hostileUpdate = new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('must stay contained');
    },
});
assert.deepEqual(getBusinessCopyFieldKeysFromUpdate(hostileUpdate), []);
assert.deepEqual(getBusinessCopyFieldKeysFromUpdate(1), []);

console.log('Business Copy coverage boundary tests passed.');
