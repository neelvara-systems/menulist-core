#!/usr/bin/env ts-node

import fs from 'fs';
import path from 'path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { deleteObject, getBytes, ref, uploadBytes } from 'firebase/storage';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-campaigncue-storage-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const BYTES = new Uint8Array([1, 2, 3, 4]);

const workspaceDoc = (
    tId: string,
    sId: string,
    ownerId: string,
    status: 'active' | 'disabled' = 'active',
) => {
    const workspaceId = `cc_${tId}_${sId}`;
    return {
        id: workspaceId,
        members: {
            [ownerId]: {
                role: 'owner',
            },
        },
        productId: 'CC',
        sId,
        status,
        tId,
        workspaceId,
    };
};

async function run(): Promise<void> {
    if (!process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
        throw new Error('FIREBASE_STORAGE_EMULATOR_HOST is required');
    }
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
        throw new Error('FIRESTORE_EMULATOR_HOST is required');
    }

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
            rules: fs.readFileSync(path.join(ROOT, 'firestore-campaigncue.rules'), 'utf8'),
        },
        storage: {
            rules: fs.readFileSync(path.join(ROOT, 'storage-campaigncue.rules'), 'utf8'),
        },
    });

    try {
        await testEnv.clearStorage();
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await setDoc(
                doc(db, 'campaigncueWorkspaces', 'cc_1_101'),
                workspaceDoc('1', '101', 'owner-1-101'),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', 'cc_2_202'),
                workspaceDoc('2', '202', 'owner-2-202'),
            );
            await setDoc(
                doc(db, 'campaigncueWorkspaces', 'cc_3_303'),
                workspaceDoc('3', '303', 'owner-3-303', 'disabled'),
            );
        });
        const ownerStorage = testEnv.authenticatedContext('owner-1-101', {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'owner-1-101',
        }).storage();
        const sameScopeNonmemberStorage = testEnv.authenticatedContext('former-member-1-101', {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'former-member-1-101',
        }).storage();
        const disabledOwnerStorage = testEnv.authenticatedContext('owner-3-303', {
            role: 'OWNER',
            storeId: '303',
            tenantId: '3',
            uId: 'owner-3-303',
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
        await assertFails(getBytes(ref(sameScopeNonmemberStorage, assetPath)));
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
            ref(sameScopeNonmemberStorage, 'campaigncue/assets/cc_1_101/uploads/former-member.png'),
            BYTES,
            { contentType: 'image/png' },
        ));
        await assertFails(uploadBytes(
            ref(disabledOwnerStorage, 'campaigncue/assets/cc_3_303/uploads/disabled.png'),
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
            await uploadBytes(
                ref(storage, 'campaigncue/templates/platform/food/template-1/arbitrary.json'),
                BYTES,
                { contentType: 'application/json' },
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
        await assertFails(getBytes(ref(sameScopeNonmemberStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(disabledOwnerStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
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
        await assertSucceeds(uploadBytes(
            ref(platformStorage, 'campaigncue/templates/platform/food/template-2/pack-template-0123456789abcdef.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(platformStorage, 'campaigncue/templates/platform/food/template-2/pack-template-0123456789abcdef.json'),
            new Uint8Array([9, 9, 9]),
            { contentType: 'application/json' },
        ));
        await assertFails(deleteObject(
            ref(platformStorage, 'campaigncue/templates/platform/food/template-2/pack-template-0123456789abcdef.json'),
        ));
        await assertFails(uploadBytes(
            ref(platformStorage, 'campaigncue/templates/platform/food/template-2/arbitrary.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(deleteObject(ref(platformStorage, 'campaigncue/templates/platform/food/template-1/arbitrary.json')));
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
        await assertSucceeds(uploadBytes(
            ref(ownerStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/versions/save-1/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(otherStorage, 'campaigncue/templates/workspaces/cc_1_101/template-2/versions/save-1/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(sameScopeNonmemberStorage, 'campaigncue/templates/workspaces/cc_1_101/template-2/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(disabledOwnerStorage, 'campaigncue/templates/workspaces/cc_3_303/template-2/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/templates/workspaces/cc_1_101/template-3/versions/save-1/unsafe.svg'),
            BYTES,
            { contentType: 'image/svg+xml' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/templates/workspaces/cc_1_101/template-3/versions/save-1/arbitrary.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/templates/workspaces/cc_1_101/template-3/random/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('CampaignCue Storage rules tests passed.\n');
}

void run();
