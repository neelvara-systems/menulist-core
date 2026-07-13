import assert from 'node:assert/strict';
import {
    filterProjectReferencedImageBatchUrls,
    getImageBatchImageUrls,
    getImageBatchStorageCleanupUrls,
    shouldDeleteImageBatchStorage,
} from '../../functions/src/schedulers/imageBatchRetentionBoundary';

const data = {
    itemsList: [
        {
            images: [
                { url: ' media/menuItem/1/2/selected.webp ', isSelected: true },
                { url: 'media/menuItem/1/2/unselected.webp', isSelected: false },
                { url: 'media/menuItem/1/2/unselected.webp', isSelected: false },
                { url: '   ', isSelected: false },
                { url: 42, isSelected: false },
            ],
        },
        null,
        { images: 'invalid' },
    ],
};

assert.deepEqual(
    getImageBatchImageUrls(data),
    [
        'media/menuItem/1/2/selected.webp',
        'media/menuItem/1/2/unselected.webp',
    ],
    'Legacy compaction must count every generated image URL exactly once before pruning item payloads.',
);

assert.deepEqual(
    getImageBatchStorageCleanupUrls(data, 'finished'),
    [],
    'Finished jobs must retain every URL because selection flags are not durable job data.',
);

for (const status of ['completed', 'failed', 'cancelled', 'discarded']) {
    assert.deepEqual(
        getImageBatchStorageCleanupUrls(data, status),
        [
            'media/menuItem/1/2/selected.webp',
            'media/menuItem/1/2/unselected.webp',
        ],
        `${status} jobs must clean every generated image exactly once.`,
    );
    assert.equal(shouldDeleteImageBatchStorage(status), true);
}

assert.deepEqual(
    getImageBatchStorageCleanupUrls({ ...data, selectedImagesPersisted: true }, 'cancelled'),
    [],
    'Cancelled partial jobs that persisted selected images must retain every potentially referenced URL.',
);

const persistedJobWithoutUiSelectionFlags = {
    itemsList: [{ images: [{ url: 'media/menuItem/1/2/persisted.webp' }] }],
    selectedImagesPersisted: true,
};
assert.deepEqual(
    getImageBatchStorageCleanupUrls(persistedJobWithoutUiSelectionFlags, 'finished'),
    [],
    'Cleanup must not depend on browser-only isSelected flags.',
);

for (const status of ['queued', 'processing', 'unknown', null, 1]) {
    assert.deepEqual(getImageBatchStorageCleanupUrls(data, status), []);
    assert.equal(shouldDeleteImageBatchStorage(status), false);
}

assert.deepEqual(getImageBatchStorageCleanupUrls(null, 'finished'), []);
assert.deepEqual(getImageBatchStorageCleanupUrls({ itemsList: {} }, 'finished'), []);

const projectReferenceFilter = filterProjectReferencedImageBatchUrls({
    files: [{
        extractedData: {
            data: {
                items: [{ images: [{ url: 'media/menuItem/1/2/selected.webp' }] }],
            },
        },
    }],
    overrides: {
        items: {
            inheritedItem: {
                images: [{ url: 'media/menuItem/1/2/override.webp' }],
            },
        },
    },
}, [
    'media/menuItem/1/2/selected.webp',
    'media/menuItem/1/2/override.webp',
    'media/menuItem/1/2/orphan.webp',
]);
assert.deepEqual(projectReferenceFilter, {
    complete: true,
    referencedUrls: [
        'media/menuItem/1/2/selected.webp',
        'media/menuItem/1/2/override.webp',
    ],
    unreferencedUrls: ['media/menuItem/1/2/orphan.webp'],
}, 'Retention must protect current standalone and linked-outlet project references.');

let oversizedProject: Record<string, unknown> = {};
let cursor = oversizedProject;
for (let depth = 0; depth < 40; depth += 1) {
    cursor.next = {};
    cursor = cursor.next as Record<string, unknown>;
}
assert.deepEqual(
    filterProjectReferencedImageBatchUrls(oversizedProject, ['media/menuItem/1/2/unknown.webp']),
    { complete: false, referencedUrls: [], unreferencedUrls: [] },
    'An incomplete project scan must fail closed and delete nothing.',
);

console.log('Image batch retention boundary tests passed.');
