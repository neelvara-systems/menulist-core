import assert from 'node:assert/strict';
import {
    generateStoragePath,
    getStorePath,
    getTenantPath,
    parseStoragePath,
} from '@lib/storage/pathGenerator';

assert.equal(
    generateStoragePath({
        collection: 'projects',
        fileType: 'files',
        session: { tId: 17, sId: '29' },
        fileId: 'menu-1.pdf',
    }),
    'projects/files/17/29/menu-1.pdf',
    'valid canonical scope should produce the documented tenant/store path',
);

assert.equal(
    generateStoragePath({
        collection: 'notes',
        fileType: 'documents',
        session: { tId: 17, sId: 29 },
        fileId: 'note-A/0-invoice.pdf',
    }),
    'notes/documents/17/29/note-A/0-invoice.pdf',
    'intentional nested file IDs should preserve the noteId/fileId rule shape',
);

assert.equal(
    generateStoragePath({
        collection: 'stores',
        fileType: 'pwa-icons',
        session: { tId: 0, sId: 0 },
        fileId: 'platform-preview.png',
    }),
    'stores/pwa-icons/0/0/platform-preview.png',
    'explicit canonical platform scope should remain supported',
);

for (const session of [
    null,
    undefined,
    {},
    { tId: null, sId: 2 },
    { tId: 1, sId: null },
    { tId: '01', sId: 2 },
    { tId: 1, sId: '2e0' },
    { tId: ' 1', sId: 2 },
    { tId: -1, sId: 2 },
    { tId: Number.MAX_SAFE_INTEGER + 1, sId: 2 },
]) {
    assert.throws(
        () => generateStoragePath({
            collection: 'projects',
            fileType: 'files',
            session,
            fileId: 'menu.pdf',
        }),
        /invalid_storage_(tenant|store)_scope/,
        `malformed scope must fail closed: ${JSON.stringify(session)}`,
    );
}

for (const invalid of [
    { collection: '../projects', fileType: 'files', fileId: 'menu.pdf' },
    { collection: 'projects', fileType: 'files/other', fileId: 'menu.pdf' },
    { collection: 'projects', fileType: 'files', fileId: '../menu.pdf' },
    { collection: 'projects', fileType: 'files', fileId: 'folder//menu.pdf' },
    { collection: 'projects', fileType: 'files', fileId: 'menu\u0000.pdf' },
]) {
    assert.throws(
        () => generateStoragePath({ ...invalid, session: { tId: 1, sId: 2 } }),
        /invalid_storage_(collection|file_type|file_id)_segment/,
        `unsafe path input must fail closed: ${JSON.stringify(invalid)}`,
    );
}

assert.deepEqual(
    parseStoragePath('notes/documents/17/29/note-A/0-invoice.pdf'),
    {
        collection: 'notes',
        fileType: 'documents',
        tId: '17',
        sId: '29',
        fileId: 'note-A/0-invoice.pdf',
    },
);
assert.equal(parseStoragePath('projects/files/01/2/menu.pdf'), null);
assert.equal(parseStoragePath('projects/files/1/2/../menu.pdf'), null);
assert.equal(getTenantPath('projects', 'files', 17), 'projects/files/17');
assert.equal(getStorePath('projects', 'files', 17, 29), 'projects/files/17/29');

console.log('Storage path boundary regression passed.');
