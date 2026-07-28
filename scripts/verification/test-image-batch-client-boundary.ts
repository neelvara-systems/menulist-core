import assert from 'node:assert/strict';

import { BATCH_IMAGE_GENERATION_JOB_STATUS } from '@constant/AI';
import {
    isAllowedImageBatchOwnerTransition,
    isImageBatchOwnerOutcomeAlreadyCommitted,
    isImageBatchOwnerVisibleStatus,
    mergeImageBatchSelectionState,
    normalizeImageBatchGenerationConfig,
    normalizeImageBatchJobCreateInput,
    normalizeImageBatchJobForClient,
    selectLatestOwnerVisibleImageBatchJob,
    shouldApplyImageBatchListenerSnapshot,
    toPersistedImageBatchProjectImage,
} from '@lib/ai/imageBatchClientBoundary';
import { buildImageBatchProjectJobKey } from '@lib/ai/imageBatchIdBoundary';

const PROJECT_ID = '1-menu-2';
const JOB_ID = 'AbCdEfGhIjKlMnOpQrSt';
const IMAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/media%2FmenuItem%2F1%2F2%2Fone.webp?alt=media';
const PROJECT_JOB_KEY = buildImageBatchProjectJobKey(PROJECT_ID, '2025-01-02T03:04:05.000Z', JOB_ID);
assert.ok(PROJECT_JOB_KEY);

function validJob(): Record<string, unknown> {
    return {
        createdOn: { seconds: 1_720_000_000 },
        generatedCount: 1,
        generationConfig: {
            aspectRatio: '1:1',
            numberOfImages: 1,
            prompt: 'Clean menu image',
            serverOnlyUnexpectedField: 'must not cross the client boundary',
            styles: ['Natural Light'],
        },
        itemExecutions: {
            item_one: {
                claimToken: 'server-only-token',
            },
        },
        itemsList: [{
            id: 'item_one',
            images: [{
                name: 'one.webp',
                size: 512,
                type: 'image/webp',
                uid: 'image-one',
                url: IMAGE_URL,
                unexpectedImageField: 'drop-me',
            }],
            name: 'Item One',
            unexpectedItemField: 'drop-me',
        }],
        modifiedOn: new Date('2024-07-05T00:00:00.000Z'),
        projectId: PROJECT_ID,
        projectJobKey: PROJECT_JOB_KEY,
        requestedItemIds: ['item_one'],
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
        statusHistory: [{
            createdOn: '2024-07-05T00:00:00.000Z',
            status: BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
        }],
        totalImages: 1,
        unexpectedRootField: 'drop-me',
    };
}

const normalized = normalizeImageBatchJobForClient(validJob(), JOB_ID, {
    projectId: PROJECT_ID,
    storeId: 2,
    tenantId: 1,
});
assert.ok(normalized, 'a valid same-scope job should normalize');
assert.equal(normalized.id, JOB_ID);
assert.equal(normalized.createdOn, '2024-07-03T09:46:40.000Z');
assert.deepEqual(normalized.generationConfig, {
    aspectRatio: '1:1',
    numberOfImages: 1,
    prompt: 'Clean menu image',
    styles: ['Natural Light'],
});
assert.deepEqual(normalized.itemExecutions, {});
assert.equal(normalized.hasStagedResults, undefined, 'Legacy owner snapshots may omit the server staging summary.');
assert.equal(isImageBatchOwnerVisibleStatus(normalized.status), true);
assert.equal(isImageBatchOwnerVisibleStatus(BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED), false);
assert.equal(shouldApplyImageBatchListenerSnapshot('legacy', false), true);
assert.equal(
    shouldApplyImageBatchListenerSnapshot('legacy', true),
    false,
    'A queued legacy callback must not replace a newer primary snapshot.',
);
assert.equal(shouldApplyImageBatchListenerSnapshot('primary', true), true);

const olderProcessingJob = {
    ...normalized,
    id: 'BcDeFgHiJkLmNoPqRsTu',
    modifiedOn: '2025-01-02T03:04:05.000Z',
    status: BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
    statusHistory: [{
        createdOn: '2025-01-02T03:04:05.000Z',
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING,
    }],
};
const newerFinishedJob = {
    ...normalized,
    id: 'CdEfGhIjKlMnOpQrStUv',
    modifiedOn: '2025-01-03T03:04:05.000Z',
    selectedImagesPersisted: true,
    status: BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
    statusHistory: [{
        createdOn: '2025-01-03T03:04:05.000Z',
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
    }],
};
assert.equal(
    selectLatestOwnerVisibleImageBatchJob([newerFinishedJob, olderProcessingJob])?.id,
    olderProcessingJob.id,
    'A newer owner-hidden terminal row must not conceal an older overlapping active job.',
);
assert.equal(
    selectLatestOwnerVisibleImageBatchJob([newerFinishedJob]),
    null,
    'A project with only owner-hidden terminal rows must clear the active job.',
);
assert.equal(
    isAllowedImageBatchOwnerTransition(
        BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
        BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
    ),
    true,
);
assert.equal(
    isAllowedImageBatchOwnerTransition(
        BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
        BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
    ),
    false,
    'A queued job cannot be resolved as finished before worker processing completes.',
);
const discardedJob = normalizeImageBatchJobForClient({
    ...validJob(),
    selectedImagesPersisted: false,
    status: BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
    statusHistory: [{
        createdOn: '2024-07-05T00:00:00.000Z',
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
    }],
}, JOB_ID);
assert.ok(discardedJob);
assert.equal(
    discardedJob.selectedImagesPersisted,
    false,
    'An explicit false terminal selection outcome must survive client normalization.',
);
assert.equal(
    isImageBatchOwnerOutcomeAlreadyCommitted(
        discardedJob,
        BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
        false,
    ),
    true,
    'A retry of the exact committed owner outcome should converge without another write.',
);
assert.equal(
    isImageBatchOwnerOutcomeAlreadyCommitted(
        discardedJob,
        BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
        true,
    ),
    false,
    'A terminal retry with a different selection outcome must not be accepted as committed.',
);
assert.equal(
    isImageBatchOwnerOutcomeAlreadyCommitted(
        discardedJob,
        BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
        false,
    ),
    false,
    'A different terminal status must still pass through normal transition rejection.',
);
assert.deepEqual(normalized.itemsList[0].images[0], {
    name: 'one.webp',
    size: 512,
    type: 'image/webp',
    uid: 'image-one',
    url: IMAGE_URL,
});
assert.equal('unexpectedRootField' in normalized, false);

const locallyDeselected = {
    ...normalized,
    itemsList: normalized.itemsList.map((item) => ({
        ...item,
        images: item.images.map((image) => ({ ...image, isSelected: false })),
    })),
};
const incomingWithAnotherImage = {
    ...normalized,
    generatedCount: 2,
    itemsList: [{
        ...normalized.itemsList[0],
        images: [
            normalized.itemsList[0].images[0],
            {
                ...normalized.itemsList[0].images[0],
                name: 'two.webp',
                uid: 'image-two',
                url: IMAGE_URL.replace('one.webp', 'two.webp'),
            },
        ],
    }],
};
const mergedSelection = mergeImageBatchSelectionState(locallyDeselected, incomingWithAnotherImage);
assert.equal(
    mergedSelection.itemsList[0].images[0].isSelected,
    false,
    'A listener snapshot must preserve an owner deselection for an existing image.',
);
assert.equal(
    mergedSelection.itemsList[0].images[1].isSelected,
    true,
    'A newly generated image should be selected by default.',
);
assert.equal(
    mergeImageBatchSelectionState(null, normalized).itemsList[0].images[0].isSelected,
    true,
    'The first snapshot should select generated images by default.',
);
assert.deepEqual(
    toPersistedImageBatchProjectImage({
        ...normalized.itemsList[0].images[0],
        blob: new Blob(['transient']),
        isSelected: true,
    }),
    normalized.itemsList[0].images[0],
    'Transient selection and browser media fields must not enter project truth.',
);
assert.equal(
    toPersistedImageBatchProjectImage({ ...normalized.itemsList[0].images[0], size: 0 }),
    null,
    'Invalid generated image metadata must fail closed before project persistence.',
);

assert.equal(
    normalizeImageBatchJobForClient(validJob(), JOB_ID, { projectId: '1-other-2' }),
    null,
    'a document from a different project must be rejected',
);
assert.equal(
    normalizeImageBatchJobForClient(validJob(), JOB_ID, { tenantId: 9, storeId: 2 }),
    null,
    'a document whose encoded tenant differs from the active tenant must be rejected',
);
assert.equal(
    normalizeImageBatchJobForClient(validJob(), JOB_ID, { tenantId: 1, storeId: 9 }),
    null,
    'a document whose encoded store differs from the active store must be rejected',
);

const malformedConfig = validJob();
malformedConfig.generationConfig = { numberOfImages: 99 };
assert.equal(normalizeImageBatchJobForClient(malformedConfig, JOB_ID), null);

const stagedSummaryJob = { ...validJob(), hasStagedResults: true };
assert.equal(normalizeImageBatchJobForClient(stagedSummaryJob, JOB_ID)?.hasStagedResults, true);
assert.equal(normalizeImageBatchJobForClient({ ...validJob(), hasStagedResults: 'yes' }, JOB_ID), null);

const inconsistentCount = validJob();
inconsistentCount.generatedCount = 0;
assert.equal(normalizeImageBatchJobForClient(inconsistentCount, JOB_ID), null);

const missingRequestedItem = validJob();
missingRequestedItem.requestedItemIds = [];
assert.equal(
    normalizeImageBatchJobForClient(missingRequestedItem, JOB_ID),
    null,
    'The browser must reject a job whose requested-item set does not match its declared total.',
);

const throwingTimestamp = validJob();
throwingTimestamp.modifiedOn = {
    toDate() {
        throw new Error('malicious timestamp');
    },
};
assert.doesNotThrow(() => normalizeImageBatchJobForClient(throwingTimestamp, JOB_ID));
assert.equal(normalizeImageBatchJobForClient(throwingTimestamp, JOB_ID), null);

const foreignImageUrl = validJob();
foreignImageUrl.itemsList = [{
    id: 'item_one',
    images: [{
        name: 'one.webp',
        size: 512,
        type: 'image/webp',
        uid: 'image-one',
        url: 'https://attacker.example/image.webp',
    }],
    name: 'Item One',
}];
assert.equal(normalizeImageBatchJobForClient(foreignImageUrl, JOB_ID), null);

const wrongProjectJobKey = validJob();
wrongProjectJobKey.projectJobKey = `${PROJECT_ID}::2025-01-02T03:04:05.000Z::BcDeFgHiJkLmNoPqRsTu`;
assert.equal(normalizeImageBatchJobForClient(wrongProjectJobKey, JOB_ID), null);

const wrongImageScope = validJob();
((wrongImageScope.itemsList as Array<{ images: Array<{ url: string }> }>)[0].images[0]).url =
    'https://firebasestorage.googleapis.com/v0/b/demo.appspot.com/o/media%2FmenuItem%2F1%2F99%2Fone.webp?alt=media';
assert.equal(
    normalizeImageBatchJobForClient(wrongImageScope, JOB_ID, { projectId: PROJECT_ID, storeId: 2, tenantId: 1 }),
    null,
    'A generated image from another store path must not reach the owner UI.',
);

const unsupportedGeneratedImageType = validJob();
((unsupportedGeneratedImageType.itemsList as Array<{ images: Array<{ type: string }> }>)[0].images[0]).type = 'image/svg+xml';
assert.equal(normalizeImageBatchJobForClient(unsupportedGeneratedImageType, JOB_ID), null);

const emptyGeneratedImage = validJob();
((emptyGeneratedImage.itemsList as Array<{ images: Array<{ size: number }> }>)[0].images[0]).size = 0;
assert.equal(normalizeImageBatchJobForClient(emptyGeneratedImage, JOB_ID), null);

assert.deepEqual(
    normalizeImageBatchGenerationConfig({
        agreeToTerms: true,
        aspectRatio: '1:1',
        backgroundColor: null,
        foregroundColor: null,
        generatedImages: [{ url: IMAGE_URL }],
        loading: false,
        numberOfImages: 1,
        prompt: 'Clean menu image',
        referanceImages: [{ url: IMAGE_URL }],
        styles: ['Natural Light'],
    }),
    {
        agreeToTerms: true,
        aspectRatio: '1:1',
        numberOfImages: 1,
        prompt: 'Clean menu image',
        styles: ['Natural Light'],
    },
    'The durable/request config must omit UI-only fields and nullable optional colors.',
);
assert.equal(
    normalizeImageBatchGenerationConfig({
        prompt: 'Unsafe persisted reference',
        referanceImage: { url: 'data:image/png;base64,AAAA' },
    }),
    null,
    'Base64 reference images must not be persisted in an image batch job.',
);
assert.equal(
    normalizeImageBatchGenerationConfig({
        prompt: 'Reference without content type',
        referanceImage: { url: IMAGE_URL },
    }),
    null,
    'Reference images without a supported MIME type must be rejected before persistence.',
);
assert.equal(
    normalizeImageBatchGenerationConfig({ selectedImageTypes: ['front', 'side', 'top', 'detail', 'context'] }),
    null,
    'Batch generation must reject more output views than the durable per-item result contract supports.',
);

const canonicalCreate = normalizeImageBatchJobCreateInput({
    ...validJob(),
    enqueueFailedItemIds: [],
    failedItemIds: [],
    generatedCount: 0,
    id: 'caller-controlled-id',
    itemExecutions: {},
    itemsList: [],
    privateField: 'must-not-persist',
    status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
    statusHistory: [{
        createdOn: '2025-01-02T03:04:05.000Z',
        reason: 'Queued',
        status: BATCH_IMAGE_GENERATION_JOB_STATUS.QUEUED,
    }],
});
assert.ok(canonicalCreate, 'A valid queued job create input must normalize.');
assert.equal('id' in canonicalCreate, false, 'A caller-controlled document ID must not enter the Firestore payload.');
assert.equal('privateField' in canonicalCreate, false, 'Unknown create fields must not enter the Firestore payload.');
assert.equal(
    normalizeImageBatchJobCreateInput({ ...canonicalCreate, requestedItemIds: ['item_one', 'item_one'], totalImages: 2 }),
    null,
    'Duplicate requested item IDs must be rejected before the Firestore write.',
);

console.log('Image batch client boundary regression checks passed.');
