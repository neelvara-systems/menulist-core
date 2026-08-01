import assert from 'node:assert/strict';
import {
    buildMediaStoragePath,
    isDataUrl,
    normalizeMediaStoragePathSegment,
} from '../../src/lib/media/mediaStorage';
import {
    assertMediaBlobMatchesDataUrl,
    assertMediaUploadBlobCandidate,
    cleanupUploadedMediaUrls,
    getMediaBlobChecksum,
    getMediaTextChecksum,
    normalizeMediaUploadMimeType,
    resolvePreparedMediaIdentity,
} from '../../src/lib/media/mediaUploadBoundary';
import { storageObjectMatchesUpload } from '../../src/database/storage/uploadBlobToStorage';

assert.equal(
    buildMediaStoragePath({
        entityId: 'item_123',
        extension: '.WEBP',
        mediaId: 'menuItem_abcdef12',
        profile: 'menuItem',
        storeId: '456',
        tenantId: '123',
        variant: 'large',
    }),
    'media/menuItem/123/456/item_123/menuItem_abcdef12_large.webp',
);

assert.equal(isDataUrl('data:image/png;base64,iVBORw0KGgo='), true);
assert.equal(isDataUrl('DATA:image/png;base64,iVBORw0KGgo='), true);
assert.equal(isDataUrl('https://example.com/base64/image.png'), false);
assert.equal(isDataUrl('data:image/png;base64,'), false);
assert.equal(isDataUrl('data:image/png;base64,%%%='), false);

for (const invalidSegment of [
    null,
    undefined,
    '',
    ' ',
    ' item',
    'item ',
    'item/name',
    '../item',
    'item name',
    'item.name',
    'x'.repeat(161),
]) {
    assert.throws(
        () => normalizeMediaStoragePathSegment(invalidSegment, 'entity_id'),
        /INVALID_MEDIA_STORAGE_ENTITY_ID/,
    );
}

assert.throws(
    () => buildMediaStoragePath({
        entityId: 'item',
        extension: 'svg',
        mediaId: 'media',
        profile: 'menuItem',
        storeId: '2',
        tenantId: '1',
        variant: 'large',
    }),
    /INVALID_MEDIA_STORAGE_EXTENSION/,
);
assert.throws(
    () => buildMediaStoragePath({
        entityId: 'item',
        mediaId: 'media',
        profile: 'menuItem',
        storeId: '2',
        tenantId: '1',
        variant: 'hero',
    }),
    /INVALID_MEDIA_STORAGE_VARIANT/,
);

assert.equal(normalizeMediaUploadMimeType('IMAGE/JPG'), 'image/jpeg');
assert.equal(normalizeMediaUploadMimeType(' image/webp '), 'image/webp');
assert.equal(normalizeMediaUploadMimeType(null), '');

assert.deepEqual(resolvePreparedMediaIdentity({
    blobFingerprint: 'abcdef1234567890',
    profile: 'menuItem',
}), {
    checksum: 'abcdef1234567890',
    mediaId: 'menuItem_abcdef1234567890',
});
assert.throws(() => resolvePreparedMediaIdentity({
    blobFingerprint: 'abcdef1234567890',
    mediaChecksum: '11111111',
    profile: 'menuItem',
}), /prepared_media_checksum_mismatch/);
assert.throws(() => resolvePreparedMediaIdentity({
    blobFingerprint: 'abcdef1234567890',
    mediaId: 'menuItem_11111111',
    profile: 'menuItem',
}), /prepared_media_identity_mismatch/);
assert.deepEqual(resolvePreparedMediaIdentity({
    blobFingerprint: 'differentblob123',
    preparedChecksum: 'abcdef12',
    preparedDataUrlChecksum: 'abcdef12',
    preparedMediaId: 'menuItem_abcdef12',
    profile: 'menuItem',
}), {
    checksum: 'abcdef12',
    mediaId: 'menuItem_abcdef12',
});
assert.throws(() => resolvePreparedMediaIdentity({
    blobFingerprint: 'differentblob123',
    mediaChecksum: '11111111',
    preparedChecksum: 'abcdef12',
    preparedDataUrlChecksum: 'abcdef12',
    preparedMediaId: 'menuItem_abcdef12',
    profile: 'menuItem',
}), /prepared_media_checksum_mismatch/);
assert.throws(() => resolvePreparedMediaIdentity({
    blobFingerprint: 'differentblob123',
    mediaId: 'menuItem_11111111',
    preparedChecksum: 'abcdef12',
    preparedDataUrlChecksum: 'abcdef12',
    preparedMediaId: 'menuItem_abcdef12',
    profile: 'menuItem',
}), /prepared_media_identity_mismatch/);
assert.throws(() => resolvePreparedMediaIdentity({
    blobFingerprint: 'differentblob123',
    preparedChecksum: 'abcdef12',
    preparedDataUrlChecksum: '11111111',
    preparedMediaId: 'menuItem_abcdef12',
    profile: 'menuItem',
}), /prepared_media_checksum_mismatch/);

const immutableBlob = new Blob(['same'], { type: 'image/webp' });
assert.equal(storageObjectMatchesUpload({
    contentType: 'image/webp',
    customMetadata: { checksum: 'abcdef12', variant: 'large' },
    size: immutableBlob.size,
}, {
    blob: immutableBlob,
    contentType: 'image/webp',
    customMetadata: { checksum: 'abcdef12', variant: 'large' },
}), true);
assert.equal(storageObjectMatchesUpload({
    contentType: 'image/webp',
    customMetadata: { checksum: 'different', variant: 'large' },
    size: immutableBlob.size,
}, {
    blob: immutableBlob,
    contentType: 'image/webp',
    customMetadata: { checksum: 'abcdef12', variant: 'large' },
}), false);
assert.equal(storageObjectMatchesUpload({
    contentType: 'image/webp',
    customMetadata: { checksum: 'abcdef12', variant: 'large' },
    size: immutableBlob.size + 1,
}, {
    blob: immutableBlob,
    contentType: 'image/webp',
    customMetadata: { checksum: 'abcdef12', variant: 'large' },
}), false);
assert.equal(storageObjectMatchesUpload({
    contentType: 'image/png',
    customMetadata: { checksum: 'abcdef12', variant: 'large' },
    size: immutableBlob.size,
}, {
    blob: immutableBlob,
    contentType: 'image/webp',
    customMetadata: { checksum: 'abcdef12', variant: 'large' },
}), false);
assert.equal(storageObjectMatchesUpload({
    contentType: 'image/webp',
    customMetadata: { checksum: 'abcdef12' },
    size: immutableBlob.size,
}, {
    blob: immutableBlob,
    contentType: 'image/webp',
    customMetadata: { checksum: 'abcdef12', variant: 'large' },
}), false);

assert.doesNotThrow(() => assertMediaUploadBlobCandidate({
    blob: new Blob(['valid'], { type: 'image/webp' }),
    mimeType: 'image/webp',
    preparedOutput: true,
    profile: 'menuItem',
    variant: 'large',
}));
assert.throws(() => assertMediaUploadBlobCandidate({
    blob: new Blob([], { type: 'image/webp' }),
    mimeType: 'image/webp',
    preparedOutput: true,
    profile: 'menuItem',
    variant: 'large',
}), /prepared_media_blob_empty/);
assert.throws(() => assertMediaUploadBlobCandidate({
    blob: new Blob(['not-an-image'], { type: 'text/plain' }),
    mimeType: 'text/plain',
    preparedOutput: true,
    profile: 'menuItem',
    variant: 'large',
}), /prepared_media_mime_type_invalid/);
assert.throws(() => assertMediaUploadBlobCandidate({
    blob: new Blob(['valid'], { type: 'image/webp' }),
    mimeType: 'image/webp',
    preparedOutput: true,
    profile: 'menuItem',
    variant: 'hero',
}), /prepared_media_variant_invalid/);
assert.throws(() => assertMediaUploadBlobCandidate({
    blob: new Blob([new Uint8Array((500 * 1024) + 1)], { type: 'image/webp' }),
    mimeType: 'image/webp',
    preparedOutput: true,
    profile: 'menuItem',
    variant: 'large',
}), /prepared_media_blob_too_large/);

async function testCleanupRetries(): Promise<void> {
    const attempts = new Map<string, number>();
    const cleanup = await cleanupUploadedMediaUrls(
        ['first', 'first', '', 'second'],
        async (url) => {
            const attempt = (attempts.get(url) || 0) + 1;
            attempts.set(url, attempt);
            if (url === 'first') return { success: attempt === 2 };
            throw new Error('delete_failed');
        },
    );
    assert.deepEqual(cleanup, { attemptedCount: 2, failedCount: 1 });
    assert.equal(attempts.get('first'), 2);
    assert.equal(attempts.get('second'), 2);
}

async function testMediaHashIntegrity(): Promise<void> {
    const dataUrl = 'data:image/webp;base64,c2FtZQ==';
    const blob = new Blob(['same'], { type: 'image/webp' });
    assert.equal((await getMediaBlobChecksum(blob)).length, 64);
    assert.equal((await getMediaTextChecksum(dataUrl)).length, 64);
    await assert.doesNotReject(() => assertMediaBlobMatchesDataUrl(blob, dataUrl));
    await assert.rejects(
        () => assertMediaBlobMatchesDataUrl(new Blob(['other'], { type: 'image/webp' }), dataUrl),
        /prepared_media_blob_data_url_mismatch/,
    );
}

Promise.all([testCleanupRetries(), testMediaHashIntegrity()])
    .then(() => console.log('Media storage boundary tests passed.'))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
