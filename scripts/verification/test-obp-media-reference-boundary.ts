import assert from 'node:assert/strict';

import {
    collectObpMediaReferences,
    filterUnreferencedObpMediaUrls,
} from '../../src/lib/media/obpMediaReferences';

const shared = 'https://firebasestorage.googleapis.com/shared.webp';
const removed = 'https://firebasestorage.googleapis.com/removed.webp';
const cover = 'https://firebasestorage.googleapis.com/cover.webp';

assert.deepEqual(
    collectObpMediaReferences({
        businessCover: ` ${cover} `,
        photos: [shared, shared, '', null, 'data:image/webp;base64,AAAA'],
    }),
    [cover, shared],
);
assert.deepEqual(collectObpMediaReferences(null), []);
assert.deepEqual(collectObpMediaReferences([]), []);

assert.deepEqual(
    filterUnreferencedObpMediaUrls(
        [shared, removed, removed, '', null, 'data:image/webp;base64,AAAA'],
        [shared],
    ),
    [removed],
);
assert.deepEqual(filterUnreferencedObpMediaUrls([shared], [shared]), []);
assert.deepEqual(filterUnreferencedObpMediaUrls('not-an-array', []), []);

console.log('OBP media reference boundary tests passed.');
