import assert from 'node:assert/strict';
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from '../../src/constants/AI';
import {
    getImageBatchCloudTaskId,
    getImageBatchItemExecutionKey,
    getImageBatchOperationId,
    imageBatchExecutionNeedsAccounting,
    normalizeBatchGeneratedImages,
    normalizeImageBatchAccountingInput,
    normalizeImageBatchStoredMediaMetadata,
    normalizePersistedImageBatchJob,
} from '../../src/lib/ai/imageBatchServerBoundary';
import { buildImageBatchProjectJobKey } from '../../src/lib/ai/imageBatchIdBoundary';

const jobId = 'AbCdEfGhIjKlMnOpQrSt';
const projectId = '11-owner-project-22';
const itemId = 'menu-item-1';
const projectJobKey = buildImageBatchProjectJobKey(projectId, '2025-01-02T03:04:05.000Z', jobId);
assert.ok(projectJobKey);

const validJob = {
    createdOn: { seconds: 1_700_000_000 },
    enqueueFailedItemIds: [],
    failedItemIds: [],
    generatedCount: 0,
    generationConfig: { numberOfImages: 1, prompt: 'A plated dish' },
    itemExecutions: {},
    itemsList: [],
    modifiedOn: { toMillis: () => 1_700_000_001_000 },
    privateUnexpectedField: 'must-not-cross-the-boundary',
    projectId,
    projectJobKey,
    requestedItemIds: [itemId],
    status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
    statusHistory: [{
        createdOn: new Date('2025-01-02T03:04:05.000Z'),
        reason: 'Queued',
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
    }],
    totalImages: 1,
};

const normalized = normalizePersistedImageBatchJob(validJob, jobId, { requireRequestedItems: true });
assert.ok(normalized, 'A valid persisted image-batch job must normalize.');
assert.equal(normalized.hasStagedResults, false, 'Legacy jobs without staged output must derive a safe false summary.');
assert.equal(normalized.createdOn, '2023-11-14T22:13:20.000Z');
assert.equal(normalized.modifiedOn, '2023-11-14T22:13:21.000Z');
assert.equal(normalized.statusHistory[0].createdOn, '2025-01-02T03:04:05.000Z');
assert.equal('privateUnexpectedField' in normalized, false, 'Unexpected persisted fields must not cross the server boundary.');

const normalizedDiscarded = normalizePersistedImageBatchJob({
    ...validJob,
    selectedImagesPersisted: false,
    status: BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
    statusHistory: [{
        createdOn: new Date('2025-01-02T03:04:05.000Z'),
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
    }],
}, jobId, { requireRequestedItems: true });
assert.ok(normalizedDiscarded);
assert.equal(
    normalizedDiscarded.selectedImagesPersisted,
    false,
    'An explicit false terminal selection outcome must survive server normalization.',
);

const legacy = { ...validJob } as Record<string, unknown>;
delete legacy.statusHistory;
assert.deepEqual(
    normalizePersistedImageBatchJob(legacy, jobId, { requireRequestedItems: true })?.statusHistory,
    [],
    'Legacy jobs without status history must receive a safe empty default.',
);

assert.equal(
    normalizePersistedImageBatchJob({ ...validJob, error: 'x'.repeat(501) }, jobId),
    null,
    'Oversized persisted errors must be rejected.',
);
assert.equal(
    normalizePersistedImageBatchJob({ ...validJob, projectJobKey: `${projectId}::2025-01-02T03:04:05.000Z::BcDeFgHiJkLmNoPqRsTu` }, jobId),
    null,
    'A project sort key for another job must be rejected.',
);
assert.equal(
    normalizePersistedImageBatchJob({
        ...validJob,
        statusHistory: [{ createdOn: 'not-a-date', status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED }],
    }, jobId),
    null,
    'Malformed status-history timestamps must be rejected.',
);
assert.equal(
    normalizePersistedImageBatchJob({ ...validJob, requestedItemIds: [itemId, itemId], totalImages: 2 }, jobId),
    null,
    'Duplicate requested item IDs must be rejected.',
);

const executionKey = getImageBatchItemExecutionKey(itemId);
const operationId = getImageBatchOperationId(jobId, itemId);
const withExecution = {
    ...validJob,
    itemExecutions: {
        [executionKey]: {
            attemptCount: 1,
            claimToken: '88f37c5a-18ea-4dd0-976f-f6ac3170f398',
            itemId,
            leaseExpiresAtMs: 1_900_000_000_000,
            operationId,
            status: 'processing',
        },
    },
};
assert.ok(normalizePersistedImageBatchJob(withExecution, jobId, { requireRequestedItems: true }));
assert.equal(
    normalizePersistedImageBatchJob({
        ...withExecution,
        itemExecutions: {
            [executionKey]: {
                ...withExecution.itemExecutions[executionKey],
                operationId: 'attacker-controlled-operation-id',
            },
        },
    }, jobId, { requireRequestedItems: true }),
    null,
    'Persisted operation IDs must be derived from the exact job/item pair.',
);
assert.equal(
    normalizePersistedImageBatchJob({
        ...withExecution,
        itemExecutions: {
            [executionKey]: {
                ...withExecution.itemExecutions[executionKey],
                requiresFinalization: true,
            },
        },
    }, jobId, { requireRequestedItems: true }),
    null,
    'Finalization retries must always retain a staged item and accounting input.',
);

const stagedImage = {
    name: 'Dish',
    size: 100,
    type: 'image/webp',
    uid: 'image-1',
    url: `https://firebasestorage.googleapis.com/v0/b/demo/o/${encodeURIComponent(`media/menuItem/11/22/${operationId}/${operationId}_0_primary.webp`)}?alt=media`,
};
const stagedExecution = {
    ...withExecution.itemExecutions[executionKey],
    requiresFinalization: true,
    stagedAccountingInput: {
        action: 'batch_image_generation' as const,
        projectId,
        sId: 22,
        tId: 11,
        unitsConsumed: 1,
    },
    stagedItem: { id: itemId, images: [stagedImage], name: 'Dish' },
    stagedStoragePaths: [`media/menuItem/11/22/${operationId}/${operationId}_0_primary.webp`],
    status: 'staged',
};
assert.equal(
    imageBatchExecutionNeedsAccounting(stagedExecution),
    false,
    'A paid staged result must resume at append-only finalization without another capacity/accounting read.',
);
assert.deepEqual(
    normalizeImageBatchStoredMediaMetadata({ mimeType: 'image/webp', sizeBytes: 321 }),
    { mimeType: 'image/webp', sizeBytes: 321 },
    'Persisted image metadata must come from the prepared Storage object.',
);
assert.equal(normalizeImageBatchStoredMediaMetadata({ mimeType: 'image/gif', sizeBytes: 321 }), null);
assert.equal(normalizeImageBatchStoredMediaMetadata({ mimeType: 'image/webp', sizeBytes: 0 }), null);
assert.equal(normalizeImageBatchStoredMediaMetadata({ mimeType: 'image/webp', sizeBytes: 15 * 1024 * 1024 + 1 }), null);
assert.equal(
    normalizeBatchGeneratedImages([{ ...stagedImage, type: 'image/svg+xml' }]),
    null,
    'Unsupported generated image MIME types must not enter durable job state.',
);
assert.equal(
    normalizeBatchGeneratedImages([{ ...stagedImage, size: 0 }]),
    null,
    'Empty generated image objects must not enter durable job state.',
);
assert.equal(
    normalizePersistedImageBatchJob({
        ...validJob,
        generatedCount: 1,
        itemsList: [{
            id: itemId,
            images: [{
                ...stagedImage,
                url: 'https://firebasestorage.googleapis.com/v0/b/demo/o/media%2FmenuItem%2F11%2F99%2Fdish.webp?alt=media',
            }],
            name: 'Dish',
        }],
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
    }, jobId, { requireRequestedItems: true }),
    null,
    'A generated image URL from another store scope must be rejected.',
);

assert.deepEqual(
    normalizeImageBatchAccountingInput({
        action: 'batch_image_generation',
        clientResponse: { generatedImageCount: 1, responseSummaryKind: 'batch_image_generation' },
        geminiResponse: { oversizedProviderPayload: 'x'.repeat(100_000) },
        imageCount: 1,
        projectId,
        sId: 22,
        tId: 11,
        uId: 'owner-1',
        unitsConsumed: 1,
    }),
    {
        action: 'batch_image_generation',
        clientResponse: { generatedImageCount: 1, responseSummaryKind: 'batch_image_generation' },
        imageCount: 1,
        projectId,
        sId: 22,
        tId: 11,
        uId: 'owner-1',
        unitsConsumed: 1,
    },
    'Staged accounting must retain attribution while dropping unknown provider payloads.',
);
assert.equal(
    normalizeImageBatchAccountingInput({
        action: 'batch_image_generation',
        projectId,
        promptTokenCount: -1,
        sId: 22,
        tId: 11,
        unitsConsumed: 1,
    }),
    null,
    'Negative accounting counts must be rejected.',
);
assert.equal(
    imageBatchExecutionNeedsAccounting({ ...stagedExecution, requiresFinalization: false }),
    true,
    'A staged result created before accounting committed must still finalize accounting once.',
);
assert.equal(
    imageBatchExecutionNeedsAccounting({}),
    false,
    'An execution without a complete staged result has no resumable accounting operation.',
);
assert.ok(normalizePersistedImageBatchJob({
    ...validJob,
    itemExecutions: { [executionKey]: stagedExecution },
}, jobId, { requireRequestedItems: true }));
assert.equal(
    normalizePersistedImageBatchJob({
        ...validJob,
        hasStagedResults: false,
        itemExecutions: { [executionKey]: stagedExecution },
    }, jobId, { requireRequestedItems: true }),
    null,
    'The cancellation summary must agree with the staged execution state.',
);
assert.equal(
    normalizePersistedImageBatchJob({ ...validJob, hasStagedResults: true }, jobId, { requireRequestedItems: true }),
    null,
    'A staged-result summary cannot be asserted without a staged execution.',
);
assert.equal(
    normalizePersistedImageBatchJob({
        ...validJob,
        itemExecutions: {
            [executionKey]: {
                ...stagedExecution,
                stagedItem: {
                    ...stagedExecution.stagedItem,
                    images: [{ ...stagedImage, size: 100.5 }],
                },
            },
        },
    }, jobId, { requireRequestedItems: true }),
    null,
    'Persisted generated-image byte sizes must be non-negative safe integers.',
);

assert.equal(getImageBatchOperationId(jobId, itemId), operationId, 'Accounting operation IDs must be deterministic.');
assert.equal(getImageBatchCloudTaskId(jobId, itemId), getImageBatchCloudTaskId(jobId, itemId), 'Cloud task IDs must be deterministic.');
assert.notEqual(getImageBatchCloudTaskId(jobId, itemId), getImageBatchCloudTaskId(jobId, 'menu-item-2'));

console.log('Image batch server boundary tests passed.');
