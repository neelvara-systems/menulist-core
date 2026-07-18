import assert from 'node:assert/strict';

import {
    ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES,
    buildSupportTicketAttachmentFileId,
    getSupportTicketAttachmentDownloadUrl,
    isSupportTicketAttachmentStoragePath,
    parseSupportTicketAttachmentUpload,
} from '../../src/lib/answerlattice/supportTicketAttachmentBoundary';

const first = buildSupportTicketAttachmentFileId({
    attemptId: 'upload_a',
    stableId: 'ticket-1-message-1',
    uid: 'offer.pdf',
});
const second = buildSupportTicketAttachmentFileId({
    attemptId: 'upload_b',
    stableId: 'ticket-1-message-1',
    uid: 'offer.pdf',
});
assert.notEqual(first, second);
assert.match(first, /^ticket-1-message-1-offer\.pdf-upload_a$/);
assert.ok(first.length <= 260);
assert.throws(
    () => buildSupportTicketAttachmentFileId({ attemptId: '///' }),
    /answerlattice_ticket_attachment_attempt_id_invalid/,
);

const pngDataUrl = `data:image/png;base64,${Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')}`;
assert.deepEqual(parseSupportTicketAttachmentUpload({
    name: ' proof.png ',
    size: 4,
    type: 'IMAGE/PNG',
    uid: 'file-1',
    url: pngDataUrl,
}), {
    name: 'proof.png',
    size: 4,
    type: 'image/png',
    uid: 'file-1',
    url: pngDataUrl,
});
assert.throws(
    () => parseSupportTicketAttachmentUpload({ name: 'remote.png', size: 4, type: 'image/png', url: 'https://example.com/remote.png' }),
    /answerlattice_ticket_attachment_invalid/,
);
assert.throws(
    () => parseSupportTicketAttachmentUpload({ name: 'bad.png', size: Number.NaN, type: 'image/png', url: pngDataUrl }),
    /answerlattice_ticket_attachment_invalid/,
);
assert.throws(
    () => parseSupportTicketAttachmentUpload({ name: 'bad.png', size: 3, type: 'image/png', url: pngDataUrl }),
    /answerlattice_ticket_attachment_invalid/,
);
assert.throws(
    () => parseSupportTicketAttachmentUpload({ name: 'bad.svg', size: 4, type: 'image/svg+xml', url: pngDataUrl }),
    /answerlattice_ticket_attachment_invalid/,
);
assert.equal(ANSWERLATTICE_TICKET_ATTACHMENT_MAX_BYTES, 10 * 1024 * 1024);

assert.equal(isSupportTicketAttachmentStoragePath({
    collection: 'supportTickets',
    path: 'supportTickets/messages/12/34/ticket-message-file-upload',
    tId: 12,
    sId: 34,
}), true);
assert.equal(isSupportTicketAttachmentStoragePath({
    collection: 'supportTickets',
    path: 'supportTickets/messages/12/99/ticket-message-file-upload',
    tId: 12,
    sId: 34,
}), false);
assert.equal(isSupportTicketAttachmentStoragePath({
    collection: 'supportTickets',
    path: 'notes/documents/12/34/ticket-message-file-upload',
    tId: 12,
    sId: 34,
}), false);

const trustedDownloadUrl = 'https://firebasestorage.googleapis.com/v0/b/answerlattice-qa.firebasestorage.app/o/supportTickets%2Fdocuments%2F12%2F34%2Fproof.pdf?alt=media&token=token-value';
assert.equal(getSupportTicketAttachmentDownloadUrl({
    bucket: 'answerlattice-qa.firebasestorage.app',
    collection: 'supportTickets',
    url: trustedDownloadUrl,
    tId: 12,
    sId: 34,
}), trustedDownloadUrl);
for (const url of [
    'javascript:alert(1)',
    'https://example.com/proof.pdf',
    'https://firebasestorage.googleapis.com/v0/b/attacker.firebasestorage.app/o/supportTickets%2Fdocuments%2F12%2F34%2Fproof.pdf?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/answerlattice-qa.firebasestorage.app/o/supportTickets%2Fdocuments%2F12%2F99%2Fproof.pdf?alt=media',
    'https://firebasestorage.googleapis.com/v0/b/answerlattice-qa.firebasestorage.app/o/supportTickets%2Fdocuments%2F12%2F34%2Fproof.pdf',
]) {
    assert.equal(getSupportTicketAttachmentDownloadUrl({
        bucket: 'answerlattice-qa.firebasestorage.app',
        collection: 'supportTickets',
        url,
        tId: 12,
        sId: 34,
    }), null);
}

console.log('Support ticket attachment boundary tests passed.');
