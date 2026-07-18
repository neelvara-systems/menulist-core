import assert from 'node:assert/strict';

import {
    buildNoteAttachmentFileId,
    collectNoteAttachmentUrls,
    getNoteAttachmentCommitStatus,
    getRemovedNoteAttachmentUrls,
} from '../../src/lib/notes/noteAttachmentBoundary';

assert.equal(
    buildNoteAttachmentFileId({ attemptId: 'upload_123', index: 2, label: ' Price / List.pdf ' }),
    '2-Price-List.pdf-upload_123',
);
assert.notEqual(
    buildNoteAttachmentFileId({ attemptId: 'attempt_a', index: 0, label: 'menu' }),
    buildNoteAttachmentFileId({ attemptId: 'attempt_b', index: 0, label: 'menu' }),
);
assert.throws(
    () => buildNoteAttachmentFileId({ attemptId: '', index: 0, label: 'menu' }),
    /invalid_note_attachment_attempt_id/,
);
assert.throws(
    () => buildNoteAttachmentFileId({ attemptId: 'attempt', index: -1, label: 'menu' }),
    /invalid_note_attachment_index/,
);

const first = 'https://firebasestorage.googleapis.com/first.pdf';
const second = 'gs://demo/notes/documents/1/2/note/second.pdf';
assert.deepEqual(
    collectNoteAttachmentUrls({
        documents: [
            { url: ` ${first} ` },
            { url: first },
            { url: second },
            { url: '' },
            { url: 'data:application/pdf;base64,AAAA' },
            null,
        ],
    }),
    [first, second],
);
assert.deepEqual(collectNoteAttachmentUrls(null), []);
assert.deepEqual(collectNoteAttachmentUrls({ documents: 'invalid' }), []);
assert.deepEqual(getRemovedNoteAttachmentUrls({
    before: { documents: [{ url: first }, { url: second }] },
    after: { documents: [{ url: second }] },
}), [first]);
assert.deepEqual(getRemovedNoteAttachmentUrls({
    before: { documents: [{ url: first }] },
    after: { documents: [{ url: first }, { url: first }] },
}), []);
assert.equal(getNoteAttachmentCommitStatus({ documents: [{ url: first }, { url: second }] }, [first, second]), 'all');
assert.equal(getNoteAttachmentCommitStatus({ documents: [{ url: first }] }, [first, second]), 'partial');
assert.equal(getNoteAttachmentCommitStatus({ documents: [] }, [first, second]), 'none');
assert.equal(getNoteAttachmentCommitStatus({ documents: [] }, []), 'all');

console.log('Note attachment boundary tests passed.');
