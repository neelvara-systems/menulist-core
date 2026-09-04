import assert from 'node:assert/strict';

import {
    collectObpMediaReferences,
    filterUnreferencedObpMediaUrls,
} from '../../src/lib/media/obpMediaReferences';
import {
    enqueueObpMediaCleanupJournal,
    getObpMediaCleanupJournalKey,
    readObpMediaCleanupJournal,
    writeObpMediaCleanupJournal,
} from '../../src/lib/media/obpMediaCleanupJournal';

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

const journalValues = new Map<string, string>();
const journalStorage = {
    getItem: (key: string) => journalValues.get(key) || null,
    removeItem: (key: string) => { journalValues.delete(key); },
    setItem: (key: string, value: string) => { journalValues.set(key, value); },
};
const journalScope = { storeId: 99611, tenantId: 99601 };
const journalKey = getObpMediaCleanupJournalKey(journalScope);
assert.equal(
    journalKey,
    'menulist:obp-media-cleanup:v1:99601:99611',
    'OBP cleanup journal keys must be tenant/store scoped',
);
assert.deepEqual(
    enqueueObpMediaCleanupJournal(journalStorage, journalScope, [cover, cover]),
    [cover],
    'OBP cleanup journal must deduplicate candidates',
);
assert.deepEqual(
    enqueueObpMediaCleanupJournal(journalStorage, journalScope, removed),
    [cover, removed],
    'OBP cleanup journal must retain earlier candidates until acknowledged cleanup',
);
assert.deepEqual(
    readObpMediaCleanupJournal(journalStorage, journalScope),
    [cover, removed],
    'OBP cleanup journal must survive a new component lifecycle',
);
writeObpMediaCleanupJournal(journalStorage, journalScope, []);
assert.equal(journalValues.has(journalKey || ''), false, 'empty cleanup results must remove the journal');
journalStorage.setItem(journalKey || '', '{broken');
assert.deepEqual(
    readObpMediaCleanupJournal(journalStorage, journalScope),
    [],
    'malformed cleanup journals must fail closed',
);
assert.equal(
    getObpMediaCleanupJournalKey({ storeId: '../other', tenantId: 99601 }),
    null,
    'invalid scope identifiers must not create cleanup journal keys',
);

console.log('OBP media reference boundary tests passed.');
