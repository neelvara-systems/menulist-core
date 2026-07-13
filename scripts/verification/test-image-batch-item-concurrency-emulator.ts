#!/usr/bin/env ts-node

import assert from 'node:assert/strict';
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from '../../src/constants/AI';
import { DB_COLLECTIONS } from '../../src/constants/database';
import {
    appendImageBatchItemResultAdmin,
    claimImageBatchItemAdmin,
    markImageBatchItemAttemptFailedAdmin,
    prepareImageBatchProcessingJobForTriggerAdmin,
    stageImageBatchItemResultAdmin,
} from '../../src/database/imageBatchProcessing/server';
import {
    getImageBatchItemExecutionKey,
    getImageBatchOperationId,
    normalizePersistedImageBatchJob,
} from '../../src/lib/ai/imageBatchServerBoundary';
import { consumeAICapacityIdempotently } from '../../src/lib/ai/capacityCheck';
import { firestoreAdmin } from '../../src/lib/firebase/firebaseAdmin';
import type { FirestoreSubscriptionDoc } from '../../src/types/razorpay';

const jobId = 'AbCdEfGhIjKlMnOpQrSt';
const projectId = '11-owner-22-project';
const itemId = 'menu-item-1';
const jobRef = firestoreAdmin.doc(`${DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS}/11/22/${jobId}`);
const partialJobId = 'BcDeFgHiJkLmNoPqRsTu';
const partialJobRef = firestoreAdmin.doc(`${DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS}/11/22/${partialJobId}`);
const cancelledJobId = 'CdEfGhIjKlMnOpQrStUv';
const cancelledJobRef = firestoreAdmin.doc(`${DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS}/11/22/${cancelledJobId}`);
const exhaustedJobId = 'DeFgHiJkLmNoPqRsTuVw';
const exhaustedJobRef = firestoreAdmin.doc(`${DB_COLLECTIONS.IMAGE_BATCH_PROCESSING_JOBS}/11/22/${exhaustedJobId}`);

async function run(): Promise<void> {
    if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST is required');

    await jobRef.set({
        enqueueFailedItemIds: [],
        failedItemIds: [],
        generatedCount: 0,
        generationConfig: { numberOfImages: 1, prompt: 'A plated dish' },
        itemExecutions: {},
        itemsList: [],
        projectId,
        requestedItemIds: [itemId],
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
        statusHistory: [],
        totalImages: 1,
    });

    const canonicalServerTime = '2027-01-15T12:34:56.789Z';
    const preflight = await prepareImageBatchProcessingJobForTriggerAdmin({
        expectedGenerationConfig: { numberOfImages: 1, prompt: 'A plated dish' },
        expectedItemIds: [itemId],
        jobId,
        projectId,
        serverNowIso: canonicalServerTime,
    });
    assert.equal(preflight.ready, true);
    assert.equal(
        (await jobRef.get()).data()?.projectJobKey,
        `${projectId}::${canonicalServerTime}::${jobId}`,
        'Accepted trigger preflight must replace browser-clock ordering with a server-clock key.',
    );
    assert.equal((await jobRef.get()).data()?.hasStagedResults, false);
    const mismatchedPreflight = await prepareImageBatchProcessingJobForTriggerAdmin({
        expectedGenerationConfig: { numberOfImages: 1, prompt: 'Different prompt' },
        expectedItemIds: [itemId],
        jobId,
        projectId,
        serverNowIso: '2027-01-16T12:34:56.789Z',
    });
    assert.equal(mismatchedPreflight.ready, false, 'Mismatched request data must not pass trigger preflight.');
    assert.equal(
        (await jobRef.get()).data()?.projectJobKey,
        `${projectId}::${canonicalServerTime}::${jobId}`,
        'A rejected trigger preflight must not rewrite the project ordering key.',
    );

    const claims = await Promise.all(Array.from({ length: 8 }, () => claimImageBatchItemAdmin({
        itemId,
        jobId,
        nowMs: 1_800_000_000_000,
        projectId,
    })));
    const winners = claims.filter((claim) => claim.state === 'claimed');
    assert.equal(winners.length, 1, 'exactly one concurrent task delivery may claim an item lease');
    assert.equal(claims.filter((claim) => claim.state === 'in_flight').length, 7);
    assert.equal(
        (await jobRef.get()).data()?.statusHistory?.at(-1)?.status,
        BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
        'The first item claim must record the queued-to-processing transition.',
    );
    const winner = winners[0];
    assert.equal(winner.state, 'claimed');
    if (winner.state !== 'claimed') throw new Error('claim winner missing');
    const executionKey = getImageBatchItemExecutionKey(itemId);

    await assert.rejects(
        stageImageBatchItemResultAdmin({
            accountingInput: { action: 'batch_image_generation', projectId, sId: 22, tId: 11, unitsConsumed: 1 },
            claimToken: '30727431-d5f7-4a48-9666-63127e4b0c48',
            item: {
                id: itemId,
                images: [{
                    name: 'Dish',
                    size: 100,
                    type: 'image/webp',
                    uid: 'image-1',
                    url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/media%2FmenuItem%2F11%2F22%2Fdish.webp?alt=media',
                }],
                name: 'Dish',
            },
            jobId,
            projectId,
            storagePaths: ['media/menuItem/11/22/dish.webp'],
        }),
        /claim is stale/,
        'a stale delivery must not stage output under another delivery claim',
    );

    await assert.rejects(
        stageImageBatchItemResultAdmin({
            accountingInput: { action: 'batch_image_generation', projectId, sId: 22, tId: 11, unitsConsumed: 1 },
            claimToken: winner.claimToken,
            item: {
                id: itemId,
                images: [{
                    name: 'Dish',
                    size: 100,
                    type: 'image/webp',
                    uid: 'image-1',
                    url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/media%2FmenuItem%2F11%2F22%2Fdish.webp?alt=media',
                }],
                name: 'Dish',
            },
            jobId,
            projectId,
            storagePaths: ['media/menuItem/11/22/different.webp'],
        }),
        /staged output is invalid/,
        'a cleanup path that does not match the generated asset URL must never be persisted',
    );

    await stageImageBatchItemResultAdmin({
        accountingInput: { action: 'batch_image_generation', projectId, sId: 22, tId: 11, unitsConsumed: 1 },
        claimToken: winner.claimToken,
        item: {
            id: itemId,
            images: [{
                name: 'Dish',
                size: 100,
                type: 'image/webp',
                uid: 'image-1',
                url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/media%2FmenuItem%2F11%2F22%2Fdish.webp?alt=media',
            }],
            name: 'Dish',
        },
        jobId,
        projectId,
        storagePaths: ['media/menuItem/11/22/dish.webp'],
    });
    assert.equal((await jobRef.get()).data()?.hasStagedResults, true, 'Staging must atomically block owner cancellation.');
    await appendImageBatchItemResultAdmin({ claimToken: winner.claimToken, itemId, jobId, projectId });
    const completedSnapshot = await jobRef.get();
    const completedData = completedSnapshot.data();
    assert.equal(completedData?.generatedCount, 1);
    assert.equal(completedData?.hasStagedResults, false, 'Appending the last staged output must clear the cancellation block.');
    assert.ok(
        normalizePersistedImageBatchJob(completedData, jobId, { requireRequestedItems: true }),
        'completed job must satisfy its persisted read contract',
    );
    assert.deepEqual(completedData?.itemExecutions?.[executionKey], {
        attemptCount: 1,
        itemId,
        operationId: winner.execution.operationId,
        status: 'completed',
    }, 'terminal execution replacement must remove claim, lease and staged worker fields');
    assert.equal((await claimImageBatchItemAdmin({ itemId, jobId, projectId })).state, 'completed');

    await partialJobRef.set({
        enqueueFailedItemIds: [],
        failedItemIds: [],
        generatedCount: 0,
        generationConfig: { numberOfImages: 1, prompt: 'A plated dish' },
        itemExecutions: {},
        itemsList: [],
        projectId,
        requestedItemIds: [itemId, 'menu-item-2'],
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
        statusHistory: [],
        totalImages: 2,
    });
    const partialClaim = await claimImageBatchItemAdmin({ itemId, jobId: partialJobId, projectId });
    assert.equal(partialClaim.state, 'claimed');
    if (partialClaim.state !== 'claimed') throw new Error('partial failure claim missing');
    const partialFailure = await markImageBatchItemAttemptFailedAdmin({
        claimToken: partialClaim.claimToken,
        itemId,
        jobId: partialJobId,
        projectId,
        reason: 'Non-retryable item failure.',
        retryable: false,
    });
    assert.equal(partialFailure.shouldRetry, false);
    const partialData = (await partialJobRef.get()).data();
    assert.equal(partialData?.status, BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING);
    assert.equal(
        partialData?.statusHistory?.at(-1)?.status,
        BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
        'A partial failure history entry must match the still-processing job state.',
    );

    await jobRef.set({
        failedItemIds: [],
        generatedCount: 0,
        itemExecutions: {
            [executionKey]: {
                attemptCount: 3,
                claimToken: winner.claimToken,
                itemId,
                leaseExpiresAtMs: 1_900_000_000_000,
                operationId: winner.execution.operationId,
                status: 'processing',
            },
        },
        itemsList: [],
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
    }, { merge: true });

    await stageImageBatchItemResultAdmin({
        accountingInput: { action: 'batch_image_generation', projectId, sId: 22, tId: 11, unitsConsumed: 1 },
        claimToken: winner.claimToken,
        item: {
            id: itemId,
            images: [{
                name: 'Dish',
                size: 100,
                type: 'image/webp',
                uid: 'image-finalization-retry',
                url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/media%2FmenuItem%2F11%2F22%2Fdish-final.webp?alt=media',
            }],
            name: 'Dish',
        },
        jobId,
        projectId,
        storagePaths: ['media/menuItem/11/22/dish-final.webp'],
    });

    const preserved = await markImageBatchItemAttemptFailedAdmin({
        claimToken: winner.claimToken,
        itemId,
        jobId,
        preserveForRetry: true,
        projectId,
        reason: 'Append failed after accounting.',
    });
    assert.equal(preserved.shouldRetry, true, 'charged work must remain retryable at the ordinary attempt ceiling');
    assert.equal(
        (await jobRef.get()).data()?.itemExecutions?.[executionKey]?.requiresFinalization,
        true,
        'charged work must persist its finalization requirement',
    );
    assert.equal((await jobRef.get()).data()?.hasStagedResults, true);
    assert.equal(
        (await claimImageBatchItemAdmin({ itemId, jobId, nowMs: 1_900_000_000_001, projectId })).state,
        'claimed',
        'a persisted finalization requirement must be reclaimable after the ordinary attempt ceiling',
    );
    assert.equal((await jobRef.get()).data()?.hasStagedResults, true, 'Reclaiming staged work must retain the cancellation block.');

    await cancelledJobRef.set({
        enqueueFailedItemIds: [],
        failedItemIds: [],
        generatedCount: 0,
        generationConfig: { numberOfImages: 1, prompt: 'A plated dish' },
        itemExecutions: {},
        itemsList: [],
        projectId,
        requestedItemIds: [itemId],
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
        statusHistory: [],
        totalImages: 1,
    });
    const cancelledClaim = await claimImageBatchItemAdmin({ itemId, jobId: cancelledJobId, projectId });
    assert.equal(cancelledClaim.state, 'claimed');
    if (cancelledClaim.state !== 'claimed') throw new Error('cancelled job claim missing');
    await cancelledJobRef.update({ status: BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED });
    await assert.rejects(
        stageImageBatchItemResultAdmin({
            accountingInput: { action: 'batch_image_generation', projectId, sId: 22, tId: 11, unitsConsumed: 1 },
            claimToken: cancelledClaim.claimToken,
            item: {
                id: itemId,
                images: [{
                    name: 'Dish',
                    size: 100,
                    type: 'image/webp',
                    uid: 'cancelled-image',
                    url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/media%2FmenuItem%2F11%2F22%2Fcancelled.webp?alt=media',
                }],
                name: 'Dish',
            },
            jobId: cancelledJobId,
            projectId,
            storagePaths: ['media/menuItem/11/22/cancelled.webp'],
        }),
        /terminal and cannot stage output/,
        'Cancellation committed before staging must prevent output persistence and accounting.',
    );
    const cancelledFailure = await markImageBatchItemAttemptFailedAdmin({
        claimToken: cancelledClaim.claimToken,
        itemId,
        jobId: cancelledJobId,
        projectId,
        reason: 'Cancelled while provider work was in flight.',
    });
    assert.equal(cancelledFailure.terminal, true);
    assert.equal((await cancelledJobRef.get()).data()?.status, BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED);

    await exhaustedJobRef.set({
        enqueueFailedItemIds: [],
        failedItemIds: [],
        generatedCount: 0,
        generationConfig: { numberOfImages: 1, prompt: 'A plated dish' },
        itemExecutions: {
            [executionKey]: {
                attemptCount: 3,
                claimToken: 'd3de2a95-2cf6-4986-8020-f990dcdf9a8d',
                itemId,
                leaseExpiresAtMs: 1_800_000_000_000,
                operationId: getImageBatchOperationId(exhaustedJobId, itemId),
                status: 'processing',
            },
        },
        itemsList: [],
        projectId,
        requestedItemIds: [itemId],
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
        statusHistory: [],
        totalImages: 1,
    });
    const exhaustedClaim = await claimImageBatchItemAdmin({
        itemId,
        jobId: exhaustedJobId,
        nowMs: 1_900_000_000_000,
        projectId,
    });
    assert.equal(exhaustedClaim.state, 'failed');
    const exhaustedData = (await exhaustedJobRef.get()).data();
    assert.equal(exhaustedData?.status, BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED);
    assert.deepEqual(exhaustedData?.failedItemIds, [itemId]);
    assert.equal(exhaustedData?.itemExecutions?.[executionKey]?.status, 'failed');
    assert.equal(exhaustedData?.itemExecutions?.[executionKey]?.claimToken, undefined);
    assert.equal(exhaustedData?.itemExecutions?.[executionKey]?.leaseExpiresAtMs, undefined);
    assert.ok(exhaustedData?.expiresAt, 'a max-attempt terminal job must enter retention');

    const subscriptionId = 'sub_image_batch_scope_test';
    const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
    const operationRef = firestoreAdmin.doc('testImageBatchAccounting/operation-1');
    await subscriptionRef.set({
        cycleStartDate: null,
        monthlyCredits: 10,
        monthlyCreditsAllowance: 10,
        storeId: 22,
        tenantId: 11,
        topUpCredits: 0,
    });
    const subscription = {
        id: subscriptionId,
        monthlyCredits: 10,
        monthlyCreditsAllowance: 10,
        storeId: 22,
        tenantId: 11,
        topUpCredits: 0,
    } as unknown as FirestoreSubscriptionDoc;
    const operationData = { action: 'batch_image_generation', sId: 22, tId: 11 };
    const consumed = await consumeAICapacityIdempotently({
        idempotencyKey: 'operation-1',
        operationData,
        operationRef,
        subscription,
        unitsToConsume: 1,
    });
    assert.equal(consumed.alreadyConsumed, false);
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 9);
    const replayed = await consumeAICapacityIdempotently({
        idempotencyKey: 'operation-1',
        operationData,
        operationRef,
        subscription,
        unitsToConsume: 1,
    });
    assert.equal(replayed.alreadyConsumed, true, 'an exact accounting replay must not debit twice');
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 9);
    await assert.rejects(
        consumeAICapacityIdempotently({
            idempotencyKey: 'operation-2',
            operationData,
            operationRef: firestoreAdmin.doc('testImageBatchAccounting/operation-2'),
            subscription: { ...subscription, tenantId: 99 },
            unitsToConsume: 1,
        }),
        /subscription scope mismatch/,
        'a subscription from another tenant must never fund the operation',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 9);

    const negativeMonthlyOperationRef = firestoreAdmin.doc('testImageBatchAccounting/operation-negative-monthly');
    await subscriptionRef.update({ monthlyCredits: -1, topUpCredits: 10 });
    await assert.rejects(
        consumeAICapacityIdempotently({
            idempotencyKey: 'operation-negative-monthly',
            operationData,
            operationRef: negativeMonthlyOperationRef,
            subscription,
            unitsToConsume: 1,
        }),
        /Not enough billing credits/,
        'a negative recurring-credit bucket must fail closed even when top-up credits keep the total positive',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, -1);
    assert.equal((await subscriptionRef.get()).data()?.topUpCredits, 10);
    assert.equal((await negativeMonthlyOperationRef.get()).exists, false);

    const negativeTopUpOperationRef = firestoreAdmin.doc('testImageBatchAccounting/operation-negative-topup');
    await subscriptionRef.update({ monthlyCredits: 10, topUpCredits: -1 });
    await assert.rejects(
        consumeAICapacityIdempotently({
            idempotencyKey: 'operation-negative-topup',
            operationData,
            operationRef: negativeTopUpOperationRef,
            subscription,
            unitsToConsume: 1,
        }),
        /Not enough billing credits/,
        'a negative top-up bucket must fail closed even when recurring credits keep the total positive',
    );
    assert.equal((await subscriptionRef.get()).data()?.monthlyCredits, 10);
    assert.equal((await subscriptionRef.get()).data()?.topUpCredits, -1);
    assert.equal((await negativeTopUpOperationRef.get()).exists, false);

    await jobRef.delete();
    await partialJobRef.delete();
    await cancelledJobRef.delete();
    await exhaustedJobRef.delete();
    await subscriptionRef.delete();
    await operationRef.delete();
    await negativeMonthlyOperationRef.delete();
    await negativeTopUpOperationRef.delete();
    console.log('Image batch item concurrency emulator tests passed.');
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
