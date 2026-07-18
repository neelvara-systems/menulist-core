import assert from 'node:assert/strict';
import {
    filterProjectReferencedImageBatchUrls,
    getImageBatchImageUrls,
    getImageBatchStorageCleanupUrls,
    IMAGE_BATCH_STORAGE_DELETION_ENABLED,
    selectImageBatchRetentionStorePage,
    shouldDeleteImageBatchStorage,
} from '../../functions/src/schedulers/imageBatchRetentionBoundary';
import { selectDeterministicRetentionStorePage } from '../../functions/src/schedulers/retentionStorePageBoundary';

const DAY_MS = 24 * 60 * 60 * 1000;

const stores = Object.fromEntries(
    Array.from({ length: 451 }, (_, index) => {
        const storeId = String(451 - index);
        return [storeId, { active: storeId !== '451', tId: '1' }];
    }),
);
const firstStorePage = selectImageBatchRetentionStorePage(stores, 0, 200);
const secondStorePage = selectImageBatchRetentionStorePage(stores, DAY_MS, 200);
const thirdStorePage = selectImageBatchRetentionStorePage(stores, 2 * DAY_MS, 200);
const wrappedStorePage = selectImageBatchRetentionStorePage(stores, 3 * DAY_MS, 200);

assert.deepEqual(
    {
        first: firstStorePage.entries.map(([storeId]) => storeId),
        second: secondStorePage.entries.map(([storeId]) => storeId),
        third: thirdStorePage.entries.map(([storeId]) => storeId),
        wrapped: wrappedStorePage.entries.map(([storeId]) => storeId),
    },
    {
        first: Array.from({ length: 200 }, (_, index) => String(index + 1)),
        second: Array.from({ length: 200 }, (_, index) => String(index + 201)),
        third: Array.from({ length: 50 }, (_, index) => String(index + 401)),
        wrapped: Array.from({ length: 200 }, (_, index) => String(index + 1)),
    },
    'Daily retention pages must cover every active store and wrap without starving stores after the first 200.',
);

const snapshotPage = selectDeterministicRetentionStorePage(stores, 2 * DAY_MS, 200);
assert.equal(snapshotPage.totalStores, 451, 'Snapshot retention must include inactive stores with expiring historical data.');
assert.ok(
    snapshotPage.entries.some(([storeId]) => storeId === '451'),
    'The deterministic all-store retention cycle must eventually cover inactive stores.',
);
assert.deepEqual(
    {
        pageCount: thirdStorePage.pageCount,
        pageIndex: thirdStorePage.pageIndex,
        totalActiveStores: thirdStorePage.totalActiveStores,
    },
    { pageCount: 3, pageIndex: 2, totalActiveStores: 450 },
);

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
    'Finished jobs must retain Storage objects until exclusive cross-project reference proof exists.',
);

for (const status of ['completed', 'failed', 'cancelled', 'discarded']) {
    assert.deepEqual(getImageBatchStorageCleanupUrls(data, status), []);
    assert.equal(shouldDeleteImageBatchStorage(status), false);
}
assert.equal(IMAGE_BATCH_STORAGE_DELETION_ENABLED, false);

assert.deepEqual(
    getImageBatchStorageCleanupUrls({ ...data, selectedImagesPersisted: true }, 'cancelled'),
    [],
    'Cancelled partial jobs must retain every potentially shared media object.',
);

const persistedJobWithoutUiSelectionFlags = {
    itemsList: [{ images: [{ url: 'media/menuItem/1/2/persisted.webp' }] }],
    selectedImagesPersisted: true,
};
assert.deepEqual(
    getImageBatchStorageCleanupUrls(persistedJobWithoutUiSelectionFlags, 'finished'),
    [],
    'Cleanup must not infer exclusive ownership from browser-only selection state.',
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
