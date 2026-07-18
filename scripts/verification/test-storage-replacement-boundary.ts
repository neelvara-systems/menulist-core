import assert from 'node:assert/strict';

import { getStorageReplacementCleanupTargets } from '../../src/lib/storage/replacementUploadBoundary';

assert.deepEqual(getStorageReplacementCleanupTargets({
    commitState: 'not_persisted',
    previousUrl: 'https://storage.example/old',
    uploadedUrl: 'https://storage.example/new',
}), ['https://storage.example/new']);

assert.deepEqual(getStorageReplacementCleanupTargets({
    commitState: 'committed',
    previousUrl: 'https://storage.example/old',
    uploadedUrl: 'https://storage.example/new',
}), ['https://storage.example/old']);

assert.deepEqual(getStorageReplacementCleanupTargets({
    commitState: 'committed',
    previousUrl: 'https://storage.example/same',
    uploadedUrl: 'https://storage.example/same',
}), []);

assert.deepEqual(getStorageReplacementCleanupTargets({
    commitState: 'not_persisted',
    uploadedUrl: '   ',
}), []);

assert.deepEqual(getStorageReplacementCleanupTargets({
    commitState: 'ambiguous',
    previousUrl: 'https://storage.example/old',
    uploadedUrl: 'https://storage.example/new',
}), [], 'ambiguous persistence must preserve both possible current references');

console.log('Storage replacement boundary tests passed.');
