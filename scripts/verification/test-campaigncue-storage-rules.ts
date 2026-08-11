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
    extraMembers: Record<string, { locationIds?: string[]; role: string }> = {},
) => {
    const workspaceId = `cc_${tId}_${sId}`;
    return {
        id: workspaceId,
        members: {
            [ownerId]: {
                role: 'owner',
            },
            ...extraMembers,
        },
        productId: 'CC',
        sId,
        status,
        tId,
        workspaceId,
    };
};

const assetMetadata = (uploadedBy: string, contentType: string) => ({
    contentType,
    customMetadata: { uploadedBy },
});

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
                workspaceDoc('1', '101', 'owner-1-101', 'active', {
                    'billing-1-101': { role: 'billing_admin' },
                    'local-1-101': { locationIds: ['location-1'], role: 'local_manager' },
                    'marketer-1-101': { role: 'marketer' },
                    'reviewer-1-101': { role: 'reviewer' },
                }),
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
        const ownerClaims = {
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'owner-1-101',
        };
        const ownerStorage = testEnv.authenticatedContext('owner-1-101', ownerClaims).storage();
        const ownerMediaStorage = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_owner1_abcd1234',
        }).storage();
        const ownerAudioStorage = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.mp3',
            mediaUploadId: 'upload_audio1_abcd1234',
        }).storage();
        const ownerInvalidTypeStorage = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.svg',
            mediaUploadId: 'upload_invalid_abcd1234',
        }).storage();
        const ownerOversizeStorage = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_oversize_abcd1234',
        }).storage();
        const ownerWrongUploaderStorage = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_wrongmeta_abcd1234',
        }).storage();
        const ownerMissingMetadataStorage = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_nometa1_abcd1234',
        }).storage();
        const ownerTemplateReadStorage = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'template_read',
        }).storage();
        const ownerTemplateWriteStorage = testEnv.authenticatedContext('owner-1-101', {
            ...ownerClaims,
            firebasePurpose: 'workspace_template_write',
        }).storage();
        const sameScopeNonmemberStorage = testEnv.authenticatedContext('former-member-1-101', {
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_former_abcd1234',
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'former-member-1-101',
        }).storage();
        const marketerClaims = {
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'marketer-1-101',
        };
        const marketerMediaStorage = testEnv.authenticatedContext('marketer-1-101', {
            ...marketerClaims,
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_marketer1_abcd1234',
        }).storage();
        const marketerTemplateReadStorage = testEnv.authenticatedContext('marketer-1-101', {
            ...marketerClaims,
            firebasePurpose: 'template_read',
        }).storage();
        const marketerTemplateWriteStorage = testEnv.authenticatedContext('marketer-1-101', {
            ...marketerClaims,
            firebasePurpose: 'workspace_template_write',
        }).storage();
        const reviewerStorage = testEnv.authenticatedContext('reviewer-1-101', {
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'reviewer-1-101',
        }).storage();
        const reviewerMediaStorage = testEnv.authenticatedContext('reviewer-1-101', {
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_reviewer_abcd1234',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'reviewer-1-101',
        }).storage();
        const reviewerTemplateReadStorage = testEnv.authenticatedContext('reviewer-1-101', {
            firebasePurpose: 'template_read',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'reviewer-1-101',
        }).storage();
        const reviewerTemplateWriteStorage = testEnv.authenticatedContext('reviewer-1-101', {
            firebasePurpose: 'workspace_template_write',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'reviewer-1-101',
        }).storage();
        const localManagerStorage = testEnv.authenticatedContext('local-1-101', {
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'local-1-101',
        }).storage();
        const localManagerMediaStorage = testEnv.authenticatedContext('local-1-101', {
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_local_abcd1234',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'local-1-101',
        }).storage();
        const localManagerTemplateReadStorage = testEnv.authenticatedContext('local-1-101', {
            firebasePurpose: 'template_read',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'local-1-101',
        }).storage();
        const localManagerTemplateWriteStorage = testEnv.authenticatedContext('local-1-101', {
            firebasePurpose: 'workspace_template_write',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'local-1-101',
        }).storage();
        const billingStorage = testEnv.authenticatedContext('billing-1-101', {
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'billing-1-101',
        }).storage();
        const billingMediaStorage = testEnv.authenticatedContext('billing-1-101', {
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_billing_abcd1234',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'billing-1-101',
        }).storage();
        const billingTemplateReadStorage = testEnv.authenticatedContext('billing-1-101', {
            firebasePurpose: 'template_read',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'billing-1-101',
        }).storage();
        const billingTemplateWriteStorage = testEnv.authenticatedContext('billing-1-101', {
            firebasePurpose: 'workspace_template_write',
            role: 'STAFF',
            storeId: '101',
            tenantId: '1',
            uId: 'billing-1-101',
        }).storage();
        const disabledOwnerStorage = testEnv.authenticatedContext('owner-3-303', {
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_disabled_abcd1234',
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
        const otherTemplateWriteStorage = testEnv.authenticatedContext('owner-2-202', {
            firebasePurpose: 'workspace_template_write',
            role: 'OWNER',
            storeId: '202',
            tenantId: '2',
            uId: 'owner-2-202',
        }).storage();
        const sameScopeNonmemberTemplateWriteStorage = testEnv.authenticatedContext('former-member-1-101', {
            firebasePurpose: 'workspace_template_write',
            role: 'OWNER',
            storeId: '101',
            tenantId: '1',
            uId: 'former-member-1-101',
        }).storage();
        const disabledOwnerTemplateWriteStorage = testEnv.authenticatedContext('owner-3-303', {
            firebasePurpose: 'workspace_template_write',
            role: 'OWNER',
            storeId: '303',
            tenantId: '3',
            uId: 'owner-3-303',
        }).storage();
        const missingClaimsStorage = testEnv.authenticatedContext('missing-scope', {
            firebasePurpose: 'media_upload',
            mediaSourceFileName: 'source.png',
            mediaUploadId: 'upload_missing_abcd1234',
            role: 'OWNER',
            uId: 'missing-scope',
        }).storage();
        const platformStorage = testEnv.authenticatedContext('platform-user', {
            platformRole: 'PLATFORM',
            uId: 'platform-user',
        }).storage();
        const publicStorage = testEnv.unauthenticatedContext().storage();

        const assetPath = 'campaigncue/assets/cc_1_101/upload_owner1_abcd1234/source.png';
        await assertSucceeds(uploadBytes(ref(ownerMediaStorage, assetPath), BYTES, assetMetadata('owner-1-101', 'image/png')));
        await assertSucceeds(uploadBytes(
            ref(ownerMediaStorage, 'campaigncue/assets/cc_1_101/upload_owner1_abcd1234/preview.webp'),
            BYTES,
            assetMetadata('owner-1-101', 'image/webp'),
        ));
        await assertFails(uploadBytes(
            ref(ownerMediaStorage, 'campaigncue/assets/cc_1_101/upload_owner1_abcd1234/source.jpg'),
            BYTES,
            assetMetadata('owner-1-101', 'image/jpeg'),
        ));
        await assertFails(uploadBytes(
            ref(ownerMediaStorage, 'campaigncue/assets/cc_1_101/upload_other1_abcd1234/source.png'),
            BYTES,
            assetMetadata('owner-1-101', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(ownerMediaStorage, 'campaigncue/assets/cc_1_101/upload_owner1_abcd1234/nested/source.png'),
            BYTES,
            assetMetadata('owner-1-101', 'image/png'),
        ));
        await assertFails(getBytes(ref(ownerMediaStorage, assetPath)));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/assets/cc_1_101/upload_generic_abcd1234/source.png'),
            BYTES,
            assetMetadata('owner-1-101', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(ownerInvalidTypeStorage, 'campaigncue/assets/cc_1_101/upload_invalid_abcd1234/preview.webp'),
            BYTES,
            assetMetadata('owner-1-101', 'image/png'),
        ));
        await assertFails(getBytes(ref(reviewerStorage, assetPath)));
        await assertFails(getBytes(ref(localManagerStorage, assetPath)));
        await assertFails(getBytes(ref(billingStorage, assetPath)));
        await assertFails(getBytes(ref(otherStorage, assetPath)));
        await assertFails(getBytes(ref(sameScopeNonmemberStorage, assetPath)));
        await assertFails(getBytes(ref(publicStorage, assetPath)));
        await assertFails(uploadBytes(
            ref(ownerMediaStorage, 'campaigncue/assets/cc_2_202/upload_owner1_abcd1234/source.png'),
            BYTES,
            assetMetadata('owner-1-101', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(ownerMissingMetadataStorage, 'campaigncue/assets/cc_1_101/upload_nometa1_abcd1234/source.png'),
            BYTES,
            { contentType: 'image/png' },
        ));
        await assertFails(uploadBytes(
            ref(missingClaimsStorage, 'campaigncue/assets/cc_null_null/upload_missing_abcd1234/source.png'),
            BYTES,
            assetMetadata('missing-scope', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(sameScopeNonmemberStorage, 'campaigncue/assets/cc_1_101/upload_former_abcd1234/source.png'),
            BYTES,
            assetMetadata('former-member-1-101', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(disabledOwnerStorage, 'campaigncue/assets/cc_3_303/upload_disabled_abcd1234/source.png'),
            BYTES,
            assetMetadata('owner-3-303', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(ownerInvalidTypeStorage, 'campaigncue/assets/cc_1_101/upload_invalid_abcd1234/source.svg'),
            BYTES,
            assetMetadata('owner-1-101', 'image/svg+xml'),
        ));
        await assertFails(uploadBytes(
            ref(ownerOversizeStorage, 'campaigncue/assets/cc_1_101/upload_oversize_abcd1234/source.png'),
            new Uint8Array((12 * 1024 * 1024) + 1),
            assetMetadata('owner-1-101', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(ownerWrongUploaderStorage, 'campaigncue/assets/cc_1_101/upload_wrongmeta_abcd1234/source.png'),
            BYTES,
            assetMetadata('marketer-1-101', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(reviewerMediaStorage, 'campaigncue/assets/cc_1_101/upload_reviewer_abcd1234/source.png'),
            BYTES,
            assetMetadata('reviewer-1-101', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(localManagerMediaStorage, 'campaigncue/assets/cc_1_101/upload_local_abcd1234/source.png'),
            BYTES,
            assetMetadata('local-1-101', 'image/png'),
        ));
        await assertFails(uploadBytes(
            ref(billingMediaStorage, 'campaigncue/assets/cc_1_101/upload_billing_abcd1234/source.png'),
            BYTES,
            assetMetadata('billing-1-101', 'image/png'),
        ));
        const marketerAssetPath = 'campaigncue/assets/cc_1_101/upload_marketer1_abcd1234/source.png';
        await assertSucceeds(uploadBytes(
            ref(marketerMediaStorage, marketerAssetPath),
            BYTES,
            assetMetadata('marketer-1-101', 'image/png'),
        ));
        await assertSucceeds(deleteObject(ref(marketerMediaStorage, marketerAssetPath)));
        const audioPath = 'campaigncue/assets/cc_1_101/upload_audio1_abcd1234/source.mp3';
        await assertSucceeds(uploadBytes(ref(ownerAudioStorage, audioPath), BYTES, assetMetadata('owner-1-101', 'audio/mpeg')));
        await assertFails(getBytes(ref(ownerAudioStorage, audioPath)));
        await assertFails(uploadBytes(ref(ownerAudioStorage, audioPath), new Uint8Array([9]), assetMetadata('owner-1-101', 'audio/mpeg')));
        await assertFails(uploadBytes(
            ref(ownerAudioStorage, 'campaigncue/assets/cc_1_101/upload_audio1_abcd1234/source.exe'),
            BYTES,
            assetMetadata('owner-1-101', 'application/x-msdownload'),
        ));
        await assertSucceeds(deleteObject(ref(ownerAudioStorage, audioPath)));
        await assertSucceeds(deleteObject(ref(ownerMediaStorage, assetPath)));
        await assertSucceeds(deleteObject(ref(
            ownerMediaStorage,
            'campaigncue/assets/cc_1_101/upload_owner1_abcd1234/preview.webp',
        )));

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
                ref(storage, 'campaigncue/reports/cc_1_101/campaigns/campaign-1/archive-a.zip'),
                BYTES,
                { contentType: 'application/zip' },
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

        await assertFails(getBytes(ref(ownerStorage, 'campaigncue/renders/cc_1_101/render-1/output.png')));
        await assertFails(getBytes(ref(reviewerStorage, 'campaigncue/renders/cc_1_101/render-1/output.png')));
        await assertFails(getBytes(ref(localManagerStorage, 'campaigncue/renders/cc_1_101/render-1/output.png')));
        await assertFails(getBytes(ref(billingStorage, 'campaigncue/renders/cc_1_101/render-1/output.png')));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/renders/cc_1_101/render-2/output.png'),
            BYTES,
            { contentType: 'image/png' },
        ));
        await assertFails(getBytes(ref(ownerStorage, 'campaigncue/cue-layers/cc_1_101/design-1/exports/export-1/output.png')));
        await assertFails(getBytes(ref(reviewerStorage, 'campaigncue/cue-layers/cc_1_101/design-1/exports/export-1/output.png')));
        await assertFails(getBytes(ref(localManagerStorage, 'campaigncue/cue-layers/cc_1_101/design-1/exports/export-1/output.png')));
        await assertFails(getBytes(ref(billingStorage, 'campaigncue/cue-layers/cc_1_101/design-1/exports/export-1/output.png')));
        await assertFails(uploadBytes(
            ref(ownerStorage, 'campaigncue/cue-layers/cc_1_101/design-1/exports/export-2/output.png'),
            BYTES,
            { contentType: 'image/png' },
        ));
        const reportPath = 'campaigncue/reports/cc_1_101/campaigns/campaign-1/archive-a.zip';
        await assertFails(getBytes(ref(ownerStorage, reportPath)));
        await assertFails(getBytes(ref(otherStorage, reportPath)));
        await assertFails(getBytes(ref(publicStorage, reportPath)));
        await assertFails(uploadBytes(ref(ownerStorage, reportPath), BYTES, { contentType: 'application/zip' }));
        await assertFails(deleteObject(ref(ownerStorage, reportPath)));

        await assertFails(getBytes(ref(ownerStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertSucceeds(getBytes(ref(ownerTemplateReadStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertSucceeds(getBytes(ref(marketerTemplateReadStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(ownerTemplateWriteStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(ownerMediaStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(reviewerTemplateReadStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(localManagerTemplateReadStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(billingTemplateReadStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(sameScopeNonmemberStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(disabledOwnerStorage, 'campaigncue/templates/platform/food/template-1/preview.webp')));
        await assertFails(getBytes(ref(ownerTemplateReadStorage, 'campaigncue/templates/platform/not_allowed/template-1/preview.webp')));
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

        await assertFails(uploadBytes(
            ref(ownerTemplateReadStorage, 'campaigncue/templates/workspaces/cc_1_101/template-read/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertSucceeds(uploadBytes(
            ref(ownerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/pack-template.json'),
            new Uint8Array([9, 9, 9]),
            { contentType: 'application/json' },
        ));
        await assertSucceeds(getBytes(ref(ownerTemplateReadStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/pack-template.json')));
        await assertFails(getBytes(ref(ownerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/pack-template.json')));
        await assertFails(getBytes(ref(reviewerTemplateReadStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/pack-template.json')));
        await assertFails(getBytes(ref(localManagerTemplateReadStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/pack-template.json')));
        await assertFails(getBytes(ref(billingTemplateReadStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/pack-template.json')));
        const marketerTemplatePath = 'campaigncue/templates/workspaces/cc_1_101/template-marketer/pack-template.json';
        await assertSucceeds(uploadBytes(
            ref(marketerTemplateWriteStorage, marketerTemplatePath),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertSucceeds(deleteObject(ref(marketerTemplateWriteStorage, marketerTemplatePath)));
        await assertFails(uploadBytes(
            ref(reviewerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-reviewer/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(localManagerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-local/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(billingTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-billing/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertSucceeds(uploadBytes(
            ref(ownerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/versions/save-1/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-1/versions/save-1/pack-template.json'),
            new Uint8Array([9, 9, 9]),
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(otherTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-2/versions/save-1/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(sameScopeNonmemberTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-2/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(disabledOwnerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_3_303/template-2/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-3/versions/save-1/unsafe.svg'),
            BYTES,
            { contentType: 'image/svg+xml' },
        ));
        await assertFails(uploadBytes(
            ref(ownerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-3/versions/save-1/arbitrary.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
        await assertFails(uploadBytes(
            ref(ownerTemplateWriteStorage, 'campaigncue/templates/workspaces/cc_1_101/template-3/random/pack-template.json'),
            BYTES,
            { contentType: 'application/json' },
        ));
    } finally {
        await testEnv.cleanup();
    }

    process.stdout.write('CampaignCue Storage rules tests passed.\n');
}

void run();
