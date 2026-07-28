import assert from 'node:assert/strict';

import {
    adminImmutableObjectMatchesUpload,
    buildAdminImmutableObjectDownloadUrl,
    createOrReuseAdminImmutableObject,
    getAdminImmutableObjectDownloadToken,
    isAdminImmutableObjectCreateConflict,
    type AdminImmutableObjectMetadata,
    type AdminImmutableStorageFile,
} from '../../src/lib/storage/adminImmutableObject';

const buffer = Buffer.from('prepared-image');
const customMetadata = {
    checksum: 'prepared-image-checksum',
    mediaId: 'operation_image_0',
    profile: 'menuItem',
    variant: 'large',
};
const expectedMetadata: AdminImmutableObjectMetadata = {
    cacheControl: 'public,max-age=31536000,immutable',
    contentType: 'image/webp',
    metadata: {
        ...customMetadata,
        firebaseStorageDownloadTokens: 'existing-token,older-token',
    },
    size: String(buffer.length),
};

assert.equal(isAdminImmutableObjectCreateConflict({ code: 412 }), true);
assert.equal(isAdminImmutableObjectCreateConflict({ statusCode: '412' }), true);
assert.equal(isAdminImmutableObjectCreateConflict({ code: 403 }), false);
assert.equal(isAdminImmutableObjectCreateConflict({
    get code() {
        throw new Error('provider code getter must be contained');
    },
}), false);
assert.equal(adminImmutableObjectMatchesUpload(expectedMetadata, {
    buffer,
    cacheControl: 'public,max-age=31536000,immutable',
    contentType: 'image/webp',
    customMetadata,
}), true);
assert.equal(adminImmutableObjectMatchesUpload({ ...expectedMetadata, size: buffer.length + 1 }, {
    buffer,
    cacheControl: 'public,max-age=31536000,immutable',
    contentType: 'image/webp',
    customMetadata,
}), false);
assert.equal(adminImmutableObjectMatchesUpload({
    ...expectedMetadata,
    get size(): number {
        throw new Error('provider size getter must be contained');
    },
}, {
    buffer,
    cacheControl: 'public,max-age=31536000,immutable',
    contentType: 'image/webp',
    customMetadata,
}), false);
assert.equal(adminImmutableObjectMatchesUpload({ ...expectedMetadata, size: ' 14 ' }, {
    buffer,
    cacheControl: 'public,max-age=31536000,immutable',
    contentType: 'image/webp',
    customMetadata,
}), false);
assert.equal(adminImmutableObjectMatchesUpload(expectedMetadata, {
    buffer,
    cacheControl: 'public,max-age=31536000,immutable',
    contentType: 'image/webp',
    customMetadata: { ...customMetadata, checksum: 'different-checksum' },
}), false);
assert.equal(adminImmutableObjectMatchesUpload(expectedMetadata, {
    buffer,
    cacheControl: 'private,max-age=0',
    contentType: 'image/webp',
    customMetadata,
}), false);
assert.equal(getAdminImmutableObjectDownloadToken(expectedMetadata), 'existing-token');
assert.equal(getAdminImmutableObjectDownloadToken({ metadata: { firebaseStorageDownloadTokens: '' } }), null);
assert.equal(getAdminImmutableObjectDownloadToken({
    get metadata(): Record<string, string> {
        throw new Error('provider metadata getter must be contained');
    },
}), null);
assert.equal(
    buildAdminImmutableObjectDownloadUrl('bucket.example', 'media/menuItem/1/2/item/image.webp', 'token value'),
    'https://firebasestorage.googleapis.com/v0/b/bucket.example/o/media%2FmenuItem%2F1%2F2%2Fitem%2Fimage.webp?alt=media&token=token%20value',
);

async function main(): Promise<void> {
    let createOptions: unknown;
    const creatingFile: AdminImmutableStorageFile = {
        async getMetadata() {
            throw new Error('metadata lookup must not run after a successful create');
        },
        async save(_data, options) {
            createOptions = options;
        },
    };
    const created = await createOrReuseAdminImmutableObject({
        bucketName: 'bucket.example',
        buffer,
        cacheControl: 'public,max-age=31536000,immutable',
        contentType: 'image/webp',
        customMetadata,
        file: creatingFile,
        path: 'media/menuItem/1/2/item/image.webp',
        token: 'new-token',
    });
    assert.equal(created.created, true);
    assert.equal(created.token, 'new-token');
    assert.deepEqual((createOptions as { preconditionOpts?: unknown }).preconditionOpts, { ifGenerationMatch: 0 });

    let reuseSaveAttempts = 0;
    const reusingFile: AdminImmutableStorageFile = {
        async getMetadata() {
            return [expectedMetadata];
        },
        async save() {
            reuseSaveAttempts += 1;
            throw Object.assign(new Error('already exists'), { code: 412 });
        },
    };
    const reused = await createOrReuseAdminImmutableObject({
        bucketName: 'bucket.example',
        buffer,
        cacheControl: 'public,max-age=31536000,immutable',
        contentType: 'image/webp',
        customMetadata,
        file: reusingFile,
        path: 'media/menuItem/1/2/item/image.webp',
        token: 'must-not-replace-existing-token',
    });
    assert.equal(reuseSaveAttempts, 1);
    assert.equal(reused.created, false);
    assert.equal(reused.token, 'existing-token');
    assert.match(reused.url, /token=existing-token$/);

    await assert.rejects(
        () => createOrReuseAdminImmutableObject({
            bucketName: 'bucket.example',
            buffer,
            cacheControl: 'public,max-age=31536000,immutable',
            contentType: 'image/webp',
            customMetadata,
            file: {
                async getMetadata() {
                    return [{ ...expectedMetadata, size: buffer.length + 1 }];
                },
                async save() {
                    throw Object.assign(new Error('already exists'), { code: 412 });
                },
            },
            path: 'media/menuItem/1/2/item/image.webp',
            token: 'new-token',
        }),
        /storage_immutable_object_identity_mismatch/,
    );

    console.log('Admin immutable Storage object boundary tests passed.');
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
