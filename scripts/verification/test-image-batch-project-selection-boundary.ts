#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import {
    appendImageBatchSelectionsToOutletProject,
    appendImageBatchSelectionsToProject,
    normalizeImageBatchProjectSelections,
} from '../../src/lib/ai/imageBatchProjectSelection';
import type { Project } from '../../src/components/templates/main-app/projects/types';

const projectId = '11-owner-22';
const image = {
    name: 'Dish',
    size: 123,
    type: 'image/webp',
    uid: 'generated-1',
    url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/media%2FmenuItem%2F11%2F22%2Fdish.webp?alt=media',
};
const selections = normalizeImageBatchProjectSelections(
    [{ itemId: 'item-1', images: [image] }],
    projectId,
    'demo',
);
assert.ok(selections);
assert.equal(
    normalizeImageBatchProjectSelections([{ itemId: 'item-1', images: [image] }], projectId, 'other-bucket'),
    null,
    'durable selection admission must reject another Firebase bucket',
);
assert.equal(normalizeImageBatchProjectSelections([{ itemId: '__proto__', images: [image] }], projectId), null);
assert.equal(normalizeImageBatchProjectSelections([{ itemId: 'item-1', images: [{ ...image, url: 'https://example.com/dish.webp' }] }], projectId), null);
assert.equal(normalizeImageBatchProjectSelections([
    { itemId: 'item-1', images: [image] },
    { itemId: 'item-1', images: [image] },
], projectId), null);
let imageSizeCoercionCalled = false;
assert.equal(normalizeImageBatchProjectSelections([{
    itemId: 'item-1',
    images: [{
        ...image,
        size: {
            valueOf() {
                imageSizeCoercionCalled = true;
                return 123;
            },
        },
    }],
}], projectId, 'demo'), null);
assert.equal(imageSizeCoercionCalled, false, 'image size admission must not execute coercion hooks');
assert.equal(normalizeImageBatchProjectSelections([{
    itemId: 'item-1',
    images: [{
        ...image,
        get url() {
            throw new Error('untrusted image URL getter');
        },
    }],
}], projectId, 'demo'), null, 'throwing image metadata must fail closed');
const { proxy: revokedSelectionEntry, revoke: revokeSelectionEntry } = Proxy.revocable({}, {});
revokeSelectionEntry();
assert.equal(
    normalizeImageBatchProjectSelections([revokedSelectionEntry], projectId, 'demo'),
    null,
    'revoked selection entries must fail closed',
);

const baseProject = {
    projectId,
    name: { en: 'Menu' },
    files: [{
        uid: 'file-1',
        extractedData: {
            data: {
                categories: [],
                items: [{ id: 'item-1', name: { en: 'Dish' }, images: [{ ...image, uid: 'existing' }] }],
                languages: [],
            },
        },
    }],
} as unknown as Project;

const standalone = appendImageBatchSelectionsToProject(baseProject, selections);
assert.ok(standalone.files?.[0], 'updated standalone project must retain its source file');
assert.equal(
    standalone.files[0].extractedData?.data.items[0]?.images?.length,
    1,
    'same URL must be idempotent',
);
assert.notEqual(standalone, baseProject);
assert.notEqual(standalone.files, baseProject.files);
assert.throws(
    () => appendImageBatchSelectionsToProject(baseProject, [{ ...selections[0], itemId: 'missing-item' }]),
    /item_missing/,
);
assert.ok(baseProject.files?.[0], 'batch project fixture must contain its source file');
const baseProjectFile = baseProject.files[0];
assert.ok(baseProjectFile.extractedData, 'batch project source file must contain extracted menu data');
const baseExtractedData = baseProjectFile.extractedData;
const duplicateItemProject = {
    ...baseProject,
    files: [
        baseProjectFile,
        {
            ...baseProjectFile,
            uid: 'file-2',
            extractedData: {
                ...baseExtractedData,
                data: {
                    ...baseExtractedData.data,
                    items: baseExtractedData.data.items.map((item) => ({
                        ...item,
                        name: { en: 'Duplicate dish' },
                    })),
                },
            },
        },
    ],
} as Project;
assert.throws(
    () => appendImageBatchSelectionsToProject(duplicateItemProject, selections),
    /item_ambiguous/,
    'batch selection must fail closed when an item ID resolves in multiple project files',
);

const outlet = {
    ...baseProject,
    projectId: '11-outlet-22',
    masterProjectId: '11-master-33',
    files: [{
        uid: 'local-file',
        extractedData: { data: { categories: [], items: [], languages: [] } },
    }],
    overrides: { items: {}, categories: {}, attributes: {} },
} as unknown as Project;
const master = {
    ...baseProject,
    projectId: '11-master-33',
} as Project;
const outletResult = appendImageBatchSelectionsToOutletProject(outlet, master, selections);
assert.equal(outletResult.overrides?.items?.['item-1']?.images?.length, 1);
assert.ok(outlet.files?.[0], 'outlet fixture must retain its local source file');
assert.equal(outlet.files[0].extractedData?.data.items.length, 0, 'pure append must not mutate the input outlet');
assert.throws(
    () => appendImageBatchSelectionsToOutletProject(outlet, duplicateItemProject, selections),
    /item_ambiguous/,
    'inherited batch selection must fail closed when the master item ID is ambiguous',
);

console.log('Image batch project selection boundary tests passed.');
