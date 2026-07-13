import assert from 'node:assert/strict';
import {
  findDuplicateMenuExtractionFileUids,
  findInvalidMenuExtractionSourceIndexes,
  resolveMenuExtractionBatchCompletion,
  selectNewMenuExtractionProjectFiles,
} from '../../src/data/shared/menuExtractionIntegrity';
import {
  processParallelResponse,
  transformIdsForFile,
} from '../../functions/src/logic/redistributeUtils';
import { processAIResponseForFirebase } from '../../functions/src/logic/aiResponseUtils';
import {
  processParallelResponse as processClientParallelResponse,
  transformIdsForFile as transformClientIdsForFile,
} from '../../src/lib/extraction/redistribute';
import { isMessagingOnboardingMenuExtractionProjectId } from '../../src/data/shared/menuExtractionJob';

assert.equal(isMessagingOnboardingMenuExtractionProjectId('msg-onboarding-session-1'), true);
assert.equal(isMessagingOnboardingMenuExtractionProjectId(42), false);
assert.equal(isMessagingOnboardingMenuExtractionProjectId({ startsWith: () => true }), false);
assert.equal(isMessagingOnboardingMenuExtractionProjectId(null), false);

const sourceFile = {
  size: 100,
  type: 'image/jpeg',
  uid: 'file-a',
  url: 'https://storage.example/file-a',
};

assert.deepEqual(
  findDuplicateMenuExtractionFileUids([
    { uid: 'file-a' },
    { uid: 'file-b' },
    { uid: ' file-a ' },
    { uid: '' },
  ]),
  ['file-a'],
  'trim-equivalent file identities must be rejected as duplicates',
);

assert.equal(
  resolveMenuExtractionBatchCompletion(undefined, { canReviewPartialResult: false }),
  'complete',
  'deterministic extraction has no provider batch records',
);

assert.deepEqual(
  findInvalidMenuExtractionSourceIndexes([
    { sourceFileIndex: 0 },
    { sourceFileIndex: 1 },
    { sourceFileIndex: -1 },
    { sourceFileIndex: 2 },
    { sourceFileIndex: 0.5 },
    { sourceFileIndex: Number.NaN },
    { sourceFileIndex: '0' },
    {},
  ], 2),
  [2, 3, 4, 5, 6, 7],
);

const normalizedProviderResponse = processAIResponseForFirebase({
  message: '',
  data: {
    categories: [{ id: 1, name: { en: 'Mains' }, sourceFileIndex: '0' }],
    items: [{ id: 1, category: 1, name: { en: 'Soup' }, sourceFileIndex: null }],
    languages: [{ code: 'en', name: 'English' }],
    fileMessages: [
      {
        sourceFileIndex: '0',
        status: 'warning',
        type: 'verify_required',
        message: '<b>Check this price</b>',
      },
      {
        sourceFileIndex: 0,
        status: 'unexpected',
        type: 'verify_required',
        message: 'drop',
      },
    ],
  },
});
assert.equal(normalizedProviderResponse.data?.categories[0]?.sourceFileIndex, 0);
assert.equal(Object.prototype.hasOwnProperty.call(normalizedProviderResponse.data?.items[0] || {}, 'sourceFileIndex'), false);
assert.equal(normalizedProviderResponse.data?.fileMessages?.length, 1);
assert.equal(normalizedProviderResponse.data?.fileMessages?.[0]?.message, 'Check this price');
assert.throws(
  () => processAIResponseForFirebase({ message: '', data: { categories: {}, items: [], languages: [] } }),
  /unexpected format/,
  'malformed provider collections must fail instead of being partially coerced',
);
assert.equal(
  resolveMenuExtractionBatchCompletion([], { canReviewPartialResult: true }),
  'failed',
  'an empty provider batch result cannot be treated as complete',
);
assert.equal(
  resolveMenuExtractionBatchCompletion([
    { batchIndex: 0, filesProcessed: 10, success: true },
    { batchIndex: 1, filesProcessed: 2, success: true },
  ], { canReviewPartialResult: false }),
  'complete',
);
assert.equal(
  resolveMenuExtractionBatchCompletion([
    { batchIndex: 0, filesProcessed: 10, success: true },
    { batchIndex: 1, failedFileIndices: [10, 11], filesProcessed: 0, success: false },
  ], { canReviewPartialResult: true }),
  'needs_review',
  'an owner project may retain a partial result only behind review',
);
assert.equal(
  resolveMenuExtractionBatchCompletion([
    { batchIndex: 0, filesProcessed: 10, success: true },
    { batchIndex: 1, failedFileIndices: [10, 11], filesProcessed: 0, success: false },
  ], { canReviewPartialResult: false }),
  'failed',
  'an extraction-only destination must never publish a partial result',
);

assert.deepEqual(
  selectNewMenuExtractionProjectFiles([sourceFile], [sourceFile]),
  [],
  'replaying the same source file must be a no-op',
);
assert.deepEqual(
  selectNewMenuExtractionProjectFiles([sourceFile], [{
    ...sourceFile,
    uid: 'file-b',
    url: 'https://storage.example/file-b',
  }]).map((file) => file.uid),
  ['file-b'],
);
assert.throws(
  () => selectNewMenuExtractionProjectFiles([sourceFile], [{
    ...sourceFile,
    url: 'https://storage.example/different-object',
  }]),
  /MENU_EXTRACTION_FILE_UID_CONFLICT/,
  'the same UID must not alias a different source object',
);
assert.throws(
  () => selectNewMenuExtractionProjectFiles([], [sourceFile, { ...sourceFile }]),
  /MENU_EXTRACTION_DUPLICATE_INCOMING_FILE_UID/,
);

const prototypeLikeCategory = transformIdsForFile({
  data: {
    categories: [{ id: '__proto__', name: { en: 'Mains' } }],
    items: [{ id: '1', category: '__proto__', name: { en: 'Soup' } }],
    languages: [{ code: 'en', name: 'English' }],
  },
}, 'safe-file');
assert.equal(prototypeLikeCategory.data?.categories?.[0]?.id, 'safe-filec1');
assert.equal(prototypeLikeCategory.data?.items?.[0]?.category, 'safe-filec1');

const clientPrototypeLikeCategory = transformClientIdsForFile({
  data: {
    categories: [{ id: '__proto__', name: { en: 'Mains' } }],
    items: [{ id: '1', category: '__proto__', name: { en: 'Soup' } }],
    languages: [{ code: 'en', name: 'English' }],
  },
}, 'safe-file');
assert.equal(clientPrototypeLikeCategory.data?.categories?.[0]?.id, 'safe-filec1');
assert.equal(clientPrototypeLikeCategory.data?.items?.[0]?.category, 'safe-filec1');

const invalidIndexedResponse = {
  data: {
    categories: [{ id: '1', name: { en: 'Mains' }, sourceFileIndex: 2 }],
    items: [{ id: '1', category: '1', name: { en: 'Soup' }, sourceFileIndex: 2 }],
    languages: [{ code: 'en', name: 'English' }],
  },
};
assert.throws(
  () => processParallelResponse(invalidIndexedResponse, [{ uid: 'only-file' }]),
  /MENU_EXTRACTION_SOURCE_INDEX_INVALID/,
);
assert.throws(
  () => processClientParallelResponse(invalidIndexedResponse, [{ uid: 'only-file' }]),
  /MENU_EXTRACTION_SOURCE_INDEX_INVALID/,
);

console.log('Menu extraction integrity tests passed.');
