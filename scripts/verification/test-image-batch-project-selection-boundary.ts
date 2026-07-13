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
assert.equal(standalone.files[0].extractedData.data.items[0].images?.length, 1, 'same URL must be idempotent');
assert.notEqual(standalone, baseProject);
assert.notEqual(standalone.files, baseProject.files);
assert.throws(
    () => appendImageBatchSelectionsToProject(baseProject, [{ ...selections[0], itemId: 'missing-item' }]),
    /item_missing/,
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
assert.equal(outlet.files[0].extractedData.data.items.length, 0, 'pure append must not mutate the input outlet');

console.log('Image batch project selection boundary tests passed.');
