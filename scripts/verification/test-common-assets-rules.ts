#!/usr/bin/env ts-node

import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
    deleteDoc,
    doc,
    getDoc,
    setDoc,
    Timestamp,
    updateDoc,
} from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-common-assets-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const UNSUPPORTED_ASSET_TYPE = ['unsupported'].join('');

const validMetadata = {
    createdBy: 'Platform Admin',
    createdOn: Timestamp.fromMillis(1_700_000_000_000),
    modifiedBy: 'Platform Admin',
    modifiedOn: Timestamp.fromMillis(1_700_000_000_000),
    pId: 'ML',
    role: 'PLATFORM',
    sId: 0,
    tId: 0,
    uId: 'platform-user',
};

const validFontPreset = {
    ...validMetadata,
    blackTextUrl: 'data:image/png;base64,AA==',
    code: 'eai-f-inter',
    fileUrl: 'https://firebasestorage.googleapis.com/v0/b/demo/o/common%2Fassets%2FfontPreset%2Finter.ttf?alt=media',
    fontSize: 30,
    height: 35,
    index: 0,
    name: 'Inter',
    size: 1024,
    type: 'font/ttf',
    whiteTextUrl: 'data:image/png;base64,AA==',
    width: 150,
};

const validAssetCategory = {
    ...validMetadata,
    active: true,
    items: [],
    name: 'Restaurant illustrations',
    preview: 'https://firebasestorage.googleapis.com/v0/b/demo/o/common%2Fassets%2Fillustrations%2Fpreview.svg?alt=media',
    previewType: 'image/svg+xml',
    subCategories: [],
    tags: 'restaurant',
};

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const environment = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'),
        },
    });

    try {
        const publicDb = environment.unauthenticatedContext().firestore();
        const ownerDb = environment.authenticatedContext('owner-user', {
            platformRole: 'OWNER',
        }).firestore();
        const platformDb = environment.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
        }).firestore();

        const fontRef = doc(platformDb, 'common/assets/fontPreset/inter');
        const illustrationRef = doc(platformDb, 'common/assets/illustrations/restaurant');

        await assertFails(getDoc(doc(publicDb, 'common/assets/fontPreset/inter')));
        await assertFails(setDoc(
            doc(ownerDb, 'common/assets/fontPreset/owner-write'),
            validFontPreset,
        ));

        await assertSucceeds(setDoc(fontRef, validFontPreset));
        await assertSucceeds(getDoc(fontRef));
        await assertSucceeds(getDoc(doc(ownerDb, 'common/assets/fontPreset/inter')));
        await assertSucceeds(updateDoc(fontRef, { index: 1 }));

        await assertFails(setDoc(
            doc(platformDb, 'common/assets/fontPreset/unknown-field'),
            { ...validFontPreset, privateNote: 'must not enter shared catalog' },
        ));
        await assertFails(setDoc(
            doc(platformDb, 'common/assets/fontPreset/invalid-index'),
            { ...validFontPreset, index: 500 },
        ));
        await assertFails(setDoc(
            doc(platformDb, 'common/assets/fontPreset/invalid-preview-size'),
            { ...validFontPreset, blackTextUrl: 'x'.repeat(300_001) },
        ));

        await assertSucceeds(setDoc(illustrationRef, validAssetCategory));
        await assertFails(setDoc(
            doc(platformDb, 'common/assets/illustrations/unknown-field'),
            { ...validAssetCategory, tenantSecret: 'must not enter shared catalog' },
        ));
        await assertFails(setDoc(
            doc(platformDb, `common/assets/${UNSUPPORTED_ASSET_TYPE}/record`),
            validAssetCategory,
        ));

        await assertFails(deleteDoc(doc(ownerDb, 'common/assets/fontPreset/inter')));
        await assertSucceeds(deleteDoc(fontRef));
        await assertSucceeds(deleteDoc(illustrationRef));
    } finally {
        await environment.cleanup();
    }

    process.stdout.write('Common asset Firestore rules tests passed.\n');
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
