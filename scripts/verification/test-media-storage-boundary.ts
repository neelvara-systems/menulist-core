import assert from 'node:assert/strict';
import {
    buildMediaStoragePath,
    normalizeMediaStoragePathSegment,
} from '../../src/lib/media/mediaStorage';
import {
    assertMediaUploadBlobCandidate,
    cleanupUploadedMediaUrls,
    normalizeMediaUploadMimeType,
} from '../../src/lib/media/mediaUploadBoundary';

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

testCleanupRetries()
    .then(() => console.log('Media storage boundary tests passed.'))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
