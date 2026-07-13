#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    assertFails,
    assertSucceeds,
    initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'demo-image-batch-rules';
const ROOT = path.resolve(__dirname, '..', '..');
const JOB_ID = 'AbCdEfGhIjKlMnOpQrSt';

const validJob = (
    tenantId: number,
    storeId: number,
    projectId = `${tenantId}-owner-${storeId}-project`,
    jobId = JOB_ID,
) => ({
    createdBy: 'Owner',
    createdOn: serverTimestamp(),
    enqueueFailedItemIds: [],
    failedItemIds: [],
    generatedCount: 0,
    generationConfig: { numberOfImages: 1, prompt: 'A plated dish' },
    itemExecutions: {},
    itemsList: [],
    modifiedBy: 'Owner',
    modifiedOn: serverTimestamp(),
    pId: 'ML',
    projectId,
    requestedItemIds: ['menu-item-1'],
    role: 'OWNER',
    sId: storeId,
    status: 'queued',
    statusHistory: [{ createdOn: '2025-01-02T03:04:05.000Z', reason: 'Queued', status: 'queued' }],
    tId: tenantId,
    totalImages: 1,
    uId: 'owner-user',
});

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    const testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: { rules: fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8') },
    });

    try {
        const ownerDb = testEnv.authenticatedContext('owner-user', {
            role: 'OWNER',
            storeId: 22,
            tenantId: 11,
            uId: 'owner-user',
        }).firestore();
        const staffDb = testEnv.authenticatedContext('staff-user', {
            role: 'STAFF',
            storeId: 22,
            tenantId: 11,
            uId: 'staff-user',
        }).firestore();
        const otherTenantDb = testEnv.authenticatedContext('other-owner', {
            role: 'OWNER',
            storeId: 22,
            tenantId: 99,
            uId: 'other-owner',
        }).firestore();
        const multiStoreOwnerDb = testEnv.authenticatedContext('multi-store-owner', {
            role: 'OWNER',
            storeId: 22,
            storeIds: ['22', '33'],
            tenantId: 11,
            uId: 'multi-store-owner',
        }).firestore();

        const ownerJobRef = doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', JOB_ID);
        await assertSucceeds(setDoc(ownerJobRef, validJob(11, 22)));
        const latestJobId = 'JkLmNoPqRsTuVwXyZaBc';
        await testEnv.withSecurityRulesDisabled(async (context) => {
            const adminDb = context.firestore();
            await setDoc(doc(adminDb, 'imageBatchProcessingJobs', '11', '22', JOB_ID), {
                ...validJob(11, 22),
                projectJobKey: `${validJob(11, 22).projectId}::2025-01-02T03:04:05.000Z::${JOB_ID}`,
            }, { merge: true });
            await setDoc(doc(adminDb, 'imageBatchProcessingJobs', '11', '22', latestJobId), {
                ...validJob(11, 22, undefined, latestJobId),
                projectJobKey: `${validJob(11, 22).projectId}::2025-01-03T03:04:05.000Z::${latestJobId}`,
            });
        });
        const projectKeyPrefix = `${validJob(11, 22).projectId}::`;
        const latestQuery = query(
            collection(ownerDb, 'imageBatchProcessingJobs', '11', '22'),
            where('projectJobKey', '>=', projectKeyPrefix),
            where('projectJobKey', '<', `${projectKeyPrefix}\uf8ff`),
            orderBy('projectJobKey', 'desc'),
            limit(1),
        );
        const latestSnapshot = await assertSucceeds(getDocs(latestQuery));
        assert.equal(latestSnapshot.docs[0]?.id, latestJobId, 'The one-document listener query must return the latest project job.');
        await assertSucceeds(getDoc(doc(staffDb, 'imageBatchProcessingJobs', '11', '22', JOB_ID)));
        await assertFails(getDoc(doc(otherTenantDb, 'imageBatchProcessingJobs', '11', '22', JOB_ID)));

        await assertFails(setDoc(
            doc(staffDb, 'imageBatchProcessingJobs', '11', '22', 'BcDeFgHiJkLmNoPqRsTu'),
            validJob(11, 22, undefined, 'BcDeFgHiJkLmNoPqRsTu'),
        ));
        await assertSucceeds(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'QrStUvWxYzAbCdEfGhIj'),
            {
                ...validJob(11, 22, undefined, 'QrStUvWxYzAbCdEfGhIj'),
                generationConfig: {
                    numberOfImages: 1,
                    prompt: 'A plated dish',
                    referanceImage: {
                        type: 'image/webp',
                        url: 'https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/media%2FmenuItem%2F11%2F22%2Fsource.webp?alt=media&token=test',
                    },
                },
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'StUvWxYzAbCdEfGhIjKl'),
            {
                ...validJob(11, 22, undefined, 'StUvWxYzAbCdEfGhIjKl'),
                generationConfig: {
                    numberOfImages: 1,
                    prompt: 'A plated dish',
                    referanceImage: {
                        type: 'image/webp',
                        url: 'https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/media%2FmenuItem%2F11%2F99%2Fsource.webp?alt=media&token=test',
                    },
                },
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '33', 'CdEfGhIjKlMnOpQrStUv'),
            validJob(11, 33, undefined, 'CdEfGhIjKlMnOpQrStUv'),
        ));
        await assertSucceeds(setDoc(
            doc(multiStoreOwnerDb, 'imageBatchProcessingJobs', '11', '33', 'DeFgHiJkLmNoPqRsTuVw'),
            {
                ...validJob(11, 33, undefined, 'DeFgHiJkLmNoPqRsTuVw'),
                uId: 'multi-store-owner',
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'EfGhIjKlMnOpQrStUvWx'),
            validJob(11, 22, '99-owner-22-project', 'EfGhIjKlMnOpQrStUvWx'),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', JOB_ID),
            validJob(11, 22),
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'GhIjKlMnOpQrStUvWxYz'),
            {
                ...validJob(11, 22, undefined, 'GhIjKlMnOpQrStUvWxYz'),
                projectJobKey: `${validJob(11, 22).projectId}::2025-01-02T03:04:05.000Z::${JOB_ID}`,
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'HiJkLmNoPqRsTuVwXyZa'),
            {
                ...validJob(11, 22, undefined, 'HiJkLmNoPqRsTuVwXyZa'),
                generationConfig: {
                    generatedImages: [],
                    numberOfImages: 1,
                    prompt: 'A plated dish',
                },
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'IjKlMnOpQrStUvWxYzAb'),
            {
                ...validJob(11, 22, undefined, 'IjKlMnOpQrStUvWxYzAb'),
                generationConfig: {
                    numberOfImages: 1,
                    prompt: 'A plated dish',
                    referanceImage: { url: 'data:image/png;base64,AAAA' },
                },
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'KlMnOpQrStUvWxYzAbCd'),
            {
                ...validJob(11, 22, undefined, 'KlMnOpQrStUvWxYzAbCd'),
                requestedItemIds: ['menu-item-1', 'menu-item-1'],
                totalImages: 2,
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'LmNoPqRsTuVwXyZaBcDe'),
            {
                ...validJob(11, 22, undefined, 'LmNoPqRsTuVwXyZaBcDe'),
                uId: 'another-user',
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'MnOpQrStUvWxYzAbCdEf'),
            {
                ...validJob(11, 22, undefined, 'MnOpQrStUvWxYzAbCdEf'),
                generationConfig: { aspectRatio: '100:1', numberOfImages: 1, prompt: 'A plated dish' },
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'NoPqRsTuVwXyZaBcDeFg'),
            {
                ...validJob(11, 22, undefined, 'NoPqRsTuVwXyZaBcDeFg'),
                generationConfig: {
                    numberOfImages: 1,
                    prompt: 'A plated dish',
                    styles: Array.from({ length: 21 }, (_, index) => `style-${index}`),
                },
            },
        ));
        await assertFails(setDoc(
            doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', 'OpQrStUvWxYzAbCdEfGh'),
            {
                ...validJob(11, 22, undefined, 'OpQrStUvWxYzAbCdEfGh'),
                generationConfig: {
                    numberOfImages: 1,
                    prompt: 'A plated dish',
                    selectedImageTypes: ['front', 'side', 'top', 'detail', 'context'],
                },
            },
        ));

        await assertFails(updateDoc(ownerJobRef, {
            generatedCount: 1,
            itemExecutions: { forged: { status: 'completed' } },
            itemsList: [{ id: 'menu-item-1', images: [], name: 'Dish' }],
        }));
        const now = Date.now();
        await assertFails(updateDoc(ownerJobRef, {
            expiresAt: Timestamp.fromMillis(now + 365 * 24 * 60 * 60 * 1000),
            itemsExpiresAt: Timestamp.fromMillis(now + 90 * 24 * 60 * 60 * 1000),
            modifiedBy: 'Owner',
            modifiedOn: serverTimestamp(),
            selectedImagesPersisted: false,
            status: 'cancelled',
            statusHistory: [
                ...validJob(11, 22).statusHistory,
                { createdOn: '2025-01-02T03:05:05.000Z', reason: 'Cancelled', status: 'cancelled' },
            ],
        }));
        await assertSucceeds(updateDoc(ownerJobRef, {
            expiresAt: Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000),
            itemsExpiresAt: Timestamp.fromMillis(now + 7 * 24 * 60 * 60 * 1000),
            modifiedBy: 'Owner',
            modifiedOn: serverTimestamp(),
            selectedImagesPersisted: false,
            status: 'cancelled',
            statusHistory: [
                ...validJob(11, 22).statusHistory,
                { createdOn: '2025-01-02T03:05:05.000Z', reason: 'Cancelled', status: 'cancelled' },
            ],
        }));

        const cancellableProcessingJobId = 'DeFgHiJkLmNoPqRsTuVw';
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'imageBatchProcessingJobs', '11', '22', cancellableProcessingJobId), {
                ...validJob(11, 22, undefined, cancellableProcessingJobId),
                hasStagedResults: false,
                projectJobKey: `${validJob(11, 22).projectId}::2025-01-02T03:04:05.000Z::${cancellableProcessingJobId}`,
                status: 'processing',
            });
        });
        await assertSucceeds(updateDoc(doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', cancellableProcessingJobId), {
            expiresAt: Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000),
            itemsExpiresAt: Timestamp.fromMillis(now + 7 * 24 * 60 * 60 * 1000),
            modifiedBy: 'Owner',
            modifiedOn: serverTimestamp(),
            selectedImagesPersisted: false,
            status: 'cancelled',
            statusHistory: [
                ...validJob(11, 22).statusHistory,
                { createdOn: '2025-01-02T03:05:05.000Z', reason: 'Cancelled', status: 'cancelled' },
            ],
        }));

        const stagedJobId = 'EfGhIjKlMnOpQrStUvWx';
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'imageBatchProcessingJobs', '11', '22', stagedJobId), {
                ...validJob(11, 22, undefined, stagedJobId),
                hasStagedResults: true,
                projectJobKey: `${validJob(11, 22).projectId}::2025-01-02T03:04:05.000Z::${stagedJobId}`,
                status: 'processing',
            });
        });
        await assertFails(updateDoc(doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', stagedJobId), {
            expiresAt: Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000),
            itemsExpiresAt: Timestamp.fromMillis(now + 7 * 24 * 60 * 60 * 1000),
            modifiedBy: 'Owner',
            modifiedOn: serverTimestamp(),
            selectedImagesPersisted: false,
            status: 'cancelled',
            statusHistory: [
                ...validJob(11, 22).statusHistory,
                { createdOn: '2025-01-02T03:05:05.000Z', reason: 'Cancelled', status: 'cancelled' },
            ],
        }));

        const failedJobId = 'FgHiJkLmNoPqRsTuVwXy';
        await testEnv.withSecurityRulesDisabled(async (context) => {
            await setDoc(doc(context.firestore(), 'imageBatchProcessingJobs', '11', '22', failedJobId), {
                ...validJob(11, 22),
                projectJobKey: `${validJob(11, 22).projectId}::2025-01-02T03:04:05.000Z::${failedJobId}`,
                error: 'Image generation failed for this item.',
                status: 'failed',
                statusHistory: [{ createdOn: '2025-01-02T03:04:05.000Z', reason: 'Failed', status: 'failed' }],
            });
        });
        await assertSucceeds(updateDoc(doc(ownerDb, 'imageBatchProcessingJobs', '11', '22', failedJobId), {
            expiresAt: Timestamp.fromMillis(now + 30 * 24 * 60 * 60 * 1000),
            itemsExpiresAt: Timestamp.fromMillis(now + 7 * 24 * 60 * 60 * 1000),
            modifiedBy: 'Owner',
            modifiedOn: serverTimestamp(),
            selectedImagesPersisted: true,
            status: 'finished',
            statusHistory: [
                { createdOn: '2025-01-02T03:04:05.000Z', reason: 'Failed', status: 'failed' },
                { createdOn: '2025-01-02T03:05:05.000Z', reason: 'Uploaded available images', status: 'finished' },
            ],
        }));
    } finally {
        await testEnv.cleanup();
    }

    console.log('Image batch Firestore rules tests passed.');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
