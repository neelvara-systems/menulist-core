#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-campaigncue-storage-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const BYTES = new Uint8Array([1, 2, 3, 4]);

async function run(): Promise<void> {
    if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        throw new Error('FIREBASE_STORAGE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        storage: {
            rules: fs.readFileSync(path.join(ROOT, 'storage-campaigncue.rules'), 'utf8'),
        },
    });

    try {
        await testEnv.clearStorage();
        const ownerStorage = testEnv.authenticatedContext('owner-1-101', {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'owner-1-101',
        }).storage();
        const otherStorage = testEnv.authenticatedContext('owner-2-202', {
            role: 'OWNER',
            storeId: '202',
            tenantId: '2',
            uId: 'owner-2-202',
        }).storage();
        const missingClaimsStorage = testEnv.authenticatedContext('missing-scope', {
            role: 'OWNER',
            uId: 'missing-scope',
        }).storage();
        const platformStorage = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
            uId: 'platform-user',
        }).storage();
        const publicStorage = testEnv.unauthenticatedContext().storage();

        const assetPath = 'campaigncue/assets/cc_1_101/uploads/logo.png';
        await assertSucceeds(uploadBytes(ref(ownerStorage, assetPath), BYTES, { contentType: 'image/png' }));
        await assertSucceeds(getBytes(ref(ownerStorage, assetPath)));
        await assertFails(getBytes(ref(otherStorage, assetPath)));
        await assertFails(getBytes(ref(publicStorage, assetPath)));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/assets/cc_2_202/uploads/cross.png'),
            BYTES,
            { contentType: 'image/png' },
        ));
        await assertFails(uploadBytes(
            ref(missingClaimsStorage, 'campaigncue/assets/cc_null_null/uploads/null.png'),
            BYTES,
            { contentType: 'image/png' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/assets/cc_1_101/uploads/script.svg'),
            BYTES,
            { contentType: 'image/svg+xml' },
        ));
        await assertSucceeds(deleteObject(ref(ownerStorage, assetPath)));

        await testEnv.withSecurityRulesDisabled(async (context) => {
            const storage = context.storage();
            await uploadBytes(
                ref(storage, 'campaigncue/renders/cc_1_101/render-1/output.png'),
                BYTES,
                { contentType: 'image/png' },
            );
            await uploadBytes(
                ref(storage, 'campaigncue/cue-layers/cc_1_101/design-1/exports/export-1/output.png'),
                BYTES,
                { contentType: 'image/png' },
            );
            await uploadBytes(
                ref(storage, 'campaigncue/templates/platform/food/template-1/preview.webp'),
                BYTES,
                { contentType: 'image/webp' },
            );
            await uploadBytes(
                ref(storage, 'campaigncue/templates/platform/not_allowed/template-1/preview.webp'),
                BYTES,
                { contentType: 'image/webp' },
            );
        });

        await assertSucceeds(getBytes(ref(ownerStorage, 'campaigncue/renders/cc_1_101/render-1/output.png')));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/renders/cc_1_101/render-2/output.png'),
            BYTES,
            { contentType: 'image/png' },
        ));
        await assertSucceeds(getBytes(ref(ownerStorage, 'campaigncue/cue-layers/cc_1_101/design-1/exports/export-1/output.png')));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/cue-layers/cc_1_101/design-1/exports/export-2/output.png'),
            BYTES,
            { contentType: 'image/png' },
        ));

        await assertSucceeds(getBytes(ref(ownerStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(ownerStorage, 'campaigncue/templates/platform/not_allowed/template-1/preview.webp')));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/templates/platform/food/template-2/preview.webp'),
            BYTES,
            { contentType: 'image/webp' },
        ));
        await assertSucceeds(uploadBytes(
            ref(platformStorage, 'campaigncue/templates/platform/food/template-2/preview.webp'),
            BYTES,
            { contentType: 'image/webp' },
        ));
        await assertFails(uploadBytes(
            ref(platformStorage, 'campaigncue/templates/platform/not_allowed/template-2/preview.webp'),
            BYTES,
            { contentType: 'image/webp' },
        ));
        await assertFails(uploadBytes(
            ref(platformStorage, 'campaigncue/templates/platform/food/template-3/script.js'),
            BYTES,
            { contentType: 'application/javascript' },
        ));

        await assertSucceeds(uploadBytes(
            ref(ownerStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(otherStorage, 'campaigncue/templates/workspaces/cc_1_101/template-2/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/templates/workspaces/cc_1_101/template-3/unsafe.svg'),
            BYTES,
            { contentType: 'image/svg+xml' },
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('CampaignCue Storage rules tests passed.\n');
}

void run();
