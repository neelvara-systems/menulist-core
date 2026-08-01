import assert from 'node:assert/strict';
import {
    createSortableFontPresetList,
    removeSortableFontPresetUids,
    reorderSortableFontPresetList,
} from '../../src/lib/platform/fontPresetSortBoundary';
import type { FontPresetsType } from '../../src/types/assets';

const fonts: FontPresetsType[] = [
    {
        blackTextUrl: 'black-a',
        code: 'a',
        fileUrl: 'https://example.com/a.ttf',
        id: 'font-a',
        index: 0,
        name: 'A',
        size: 1,
        type: 'font/ttf',
        whiteTextUrl: 'white-a',
    },
    {
        blackTextUrl: 'black-b',
        code: 'b',
        fileUrl: 'https://example.com/b.ttf',
        id: 'font-b',
        index: 1,
        name: 'B',
        size: 1,
        type: 'font/ttf',
        whiteTextUrl: 'white-b',
    },
];

const originalSnapshot = JSON.stringify(fonts);
const ids = ['uid-a', 'uid-b'];
const sortable = createSortableFontPresetList(fonts, () => {
    const next = ids.shift();
    assert(next);
    return next;
});

assert.equal(JSON.stringify(fonts), originalSnapshot, 'opening the sort modal must not mutate parent font state');
assert.notEqual(sortable[0], fonts[0], 'sortable projection must clone font objects');

const reordered = reorderSortableFontPresetList(sortable, 'uid-a', 'uid-b');
assert.deepEqual(reordered.map(({ id, index }) => ({ id, index })), [
    { id: 'font-b', index: 0 },
    { id: 'font-a', index: 1 },
]);
assert.equal(JSON.stringify(fonts), originalSnapshot, 'dragging must not mutate parent font objects');
assert.equal(sortable[0].index, 0, 'dragging must not mutate the previous modal state');

const persisted = removeSortableFontPresetUids(reordered);
assert(!persisted.some((font) => Object.hasOwn(font, 'uid')), 'ephemeral drag IDs must not escape into persisted or shared state');
assert.equal(JSON.stringify(fonts), originalSnapshot, 'cancel or failed persistence must leave parent state unchanged');

console.log('Font preset sort boundary tests passed.');
