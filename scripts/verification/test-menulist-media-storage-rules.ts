#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-menulist-media-storage-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const ORIGINAL_BYTES = new Uint8Array([1, 2, 3, 4]);
const REPLACEMENT_BYTES = new Uint8Array([9, 8, 7, 6]);
const ELEVEN_MEGABYTES = 11 * 1024 * 1024;

async function run(): Promise<void> {
    if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        throw new Error('FIREBASE_STORAGE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        storage: {
            rules: fs.readFileSync(path.join(ROOT, 'storage.rules'), 'utf8'),
        },
    });

    try {
        await testEnv.clearStorage();
        const ownerStorage = testEnv.authenticatedContext('owner-1-101', {
            role: 'OWNER',
            storeId: '101',
            storeIds: ['101'],
            tenantId: '1',
            uId: 'owner-1-101',
        }).storage();
        const otherStorage = testEnv.authenticatedContext('owner-2-202', {
            role: 'OWNER',
            storeId: '202',
            storeIds: ['202'],
            tenantId: '2',
            uId: 'owner-2-202',
        }).storage();
        const publicStorage = testEnv.unauthenticatedContext().storage();
        const platformStorage = testEnv.authenticatedContext('platform-admin', {
            platformRole: 'PLATFORM',
            uId: 'platform-admin',
        }).storage();
        const mediaPath = 'media/menuItem/1/101/item_1/menuItem_abcdef12_large.webp';
        const metadata = { contentType: 'image/webp' };

        await assertSucceeds(uploadBytes(ref(ownerStorage, mediaPath), ORIGINAL_BYTES, metadata));
        await assertSucceeds(getBytes(ref(publicStorage, mediaPath)));
        await assertFails(uploadBytes(ref(ownerStorage, mediaPath), REPLACEMENT_BYTES, metadata));
        const persistedBytes = await assertSucceeds(getBytes(ref(ownerStorage, mediaPath)));
        if (!persistedBytes || Buffer.compare(Buffer.from(persistedBytes), Buffer.from(ORIGINAL_BYTES)) !== 0) {
            throw new Error('immutable media overwrite changed stored bytes');
        }

        await assertFails(uploadBytes(
            ref(otherStorage, 'media/menuItem/1/101/item_1/other_large.webp'),
            ORIGINAL_BYTES,
            metadata,
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'media/unknown/1/101/item_1/file.webp'),
            ORIGINAL_BYTES,
            metadata,
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'media/menuItem/1/101/item_1/not-image.webp'),
            ORIGINAL_BYTES,
            { contentType: 'text/plain' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'media/menuItem/1/101/item_1/animated.gif'),
            new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
            { contentType: 'image/gif' },
        ));
        await assertFails(deleteObject(ref(otherStorage, mediaPath)));
        await assertSucceeds(deleteObject(ref(ownerStorage, mediaPath)));

        const largePdf = new Uint8Array(ELEVEN_MEGABYTES);
        largePdf.set([0x25, 0x50, 0x44, 0x46]);
        await assertSucceeds(uploadBytes(
            ref(ownerStorage, 'projects/files/1/101/menu-large.pdf'),
            largePdf,
            { contentType: 'application/pdf' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'projects/project-images/1/101/menu-large.webp'),
            new Uint8Array(ELEVEN_MEGABYTES),
            { contentType: 'image/webp' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'projects/project-images/1/101/not-an-image.pdf'),
            ORIGINAL_BYTES,
            { contentType: 'application/pdf' },
        ));

        const blogImagePath = 'blogs/profileImages/blog_image_unique.jpeg';
        await assertFails(uploadBytes(ref(ownerStorage, blogImagePath), ORIGINAL_BYTES, { contentType: 'image/jpeg' }));
        await assertSucceeds(uploadBytes(ref(platformStorage, blogImagePath), ORIGINAL_BYTES, { contentType: 'image/jpeg' }));
        await assertSucceeds(getBytes(ref(publicStorage, blogImagePath)));
        await assertSucceeds(deleteObject(ref(platformStorage, blogImagePath)));

        const userTemplateDocumentPath = 'creative-editor/templates/user/1/101/tpl_1/document-v12345678_abcdef12.json';
        const userTemplatePreviewPath = 'creative-editor/templates/user/1/101/tpl_1/preview-v12345678_abcdef12.webp';
        await assertSucceeds(uploadBytes(
            ref(ownerStorage, userTemplateDocumentPath),
            ORIGINAL_BYTES,
            { contentType: 'application/json' },
        ));
        await assertSucceeds(uploadBytes(
            ref(ownerStorage, userTemplatePreviewPath),
            ORIGINAL_BYTES,
            { contentType: 'image/webp' },
        ));
        await assertFails(uploadBytes(
            ref(otherStorage, userTemplateDocumentPath),
            ORIGINAL_BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'creative-editor/templates/user/1/101/tpl_1/document-short.json'),
            ORIGINAL_BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'creative-editor/templates/user/1/101/tpl_1/preview-v12345678_abcdef12.webp'),
            ORIGINAL_BYTES,
            { contentType: 'text/plain' },
        ));

        const platformTemplatePath = 'creative-editor/templates/platform/food/tpl_1/document-v12345678_abcdef12.json';
        await assertSucceeds(uploadBytes(
            ref(platformStorage, platformTemplatePath),
            ORIGINAL_BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, platformTemplatePath),
            ORIGINAL_BYTES,
            { contentType: 'application/json' },
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('MenuList immutable media Storage rules tests passed.\n');
}

void run();
