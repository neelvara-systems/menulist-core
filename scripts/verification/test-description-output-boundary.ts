import assert from 'node:assert/strict';
import { AI_ACTIONS_TYPES } from '../../src/constants/common';
import {
    createDescriptionProviderItemAliases,
    isCompleteDescriptionGenerationResult,
    normalizeDescriptionGenerationResult,
    resolveDescriptionBillingAction,
    restoreDescriptionProviderItemIds,
} from '../../src/lib/ai/descriptionOutput';
import { DescriptionRequestSchema } from '../../src/lib/validation/apiSchemas';
import { hasAnyNonEmptyDescription } from '../../src/lib/menu/descriptionQuality';
import {
    chunkDescriptionItems,
    DESCRIPTION_ITEM_PAYLOAD_BYTES_PER_REQUEST,
    DESCRIPTION_OUTPUT_CELLS_PER_REQUEST,
    type DescriptionFileData,
    type DescriptionMergeData,
    mergeDescription,
    prepareDescriptionPayload,
} from '../../src/services/ai/description/descriptionUtils';
import {
    getDescriptionGenerationRequestCount,
    getDescriptionGenerationStats,
    runDescriptionGeneration,
} from '../../src/components/templates/main-app/projects/editorView/descriptionGeneration.shared';
import descriptionPrompt from '../../src/app/api/descriptions/prompt';
import {
    AICapacityError,
    isAICapacityError,
} from '../../src/services/ai/capacityError';

assert.equal(
    resolveDescriptionBillingAction(AI_ACTIONS_TYPES.ADD_DESCRIPTION, [{ description: '' }]),
    AI_ACTIONS_TYPES.ADD_DESCRIPTION,
);
assert.equal(isAICapacityError(new AICapacityError('Capacity', 'exhausted')), true);
assert.equal(isAICapacityError({ name: 'AICapacityError' }), true);
assert.equal(isAICapacityError(Object.create({ name: 'AICapacityError' })), false);
assert.equal(isAICapacityError({
    get name() {
        throw new Error('capacity error name getter must not execute');
    },
}), false);
assert.equal(isAICapacityError(new Proxy({}, {
    getOwnPropertyDescriptor() {
        throw new Error('capacity error descriptor lookup must remain contained');
    },
})), false);
assert.equal(
    resolveDescriptionBillingAction(AI_ACTIONS_TYPES.ADD_DESCRIPTION, [{ description: 'Existing copy' }]),
    AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
);
assert.equal(
    resolveDescriptionBillingAction(AI_ACTIONS_TYPES.REWRITE_DESCRIPTION, [{ description: '' }]),
    AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
);

assert.deepEqual(normalizeDescriptionGenerationResult({
    item_1: { en: '  Useful\ncopy  ', fr: 'Copie utile', extra: 'drop' },
    unknown: { en: 'drop' },
}, ['item_1'], ['en', 'fr']), {
    item_1: { en: 'Useful copy', fr: 'Copie utile' },
});
assert.equal(normalizeDescriptionGenerationResult(null, ['item_1'], ['en']), null);
assert.equal(normalizeDescriptionGenerationResult([], ['item_1'], ['en']), null);
assert.equal(normalizeDescriptionGenerationResult({ item_1: { en: 123 } }, ['item_1'], ['en']), null);
assert.equal(normalizeDescriptionGenerationResult({ unknown: { en: 'copy' } }, ['item_1'], ['en']), null);
assert.equal(isCompleteDescriptionGenerationResult({
    item_1: { en: 'Useful copy', fr: 'Copie utile' },
}, ['item_1'], ['en', 'fr']), true);
assert.equal(isCompleteDescriptionGenerationResult({
    item_1: { en: 'Useful copy' },
}, ['item_1'], ['en', 'fr']), false);
assert.equal(isCompleteDescriptionGenerationResult({
    item_1: { en: 'Useful copy', fr: 'Copie utile' },
}, ['item_1', 'item_2'], ['en', 'fr']), false);
const importedItemId = `legacy/imported:id@${'x'.repeat(60)}`;
const providerAliases = createDescriptionProviderItemAliases([
    { id: importedItemId, name: 'Imported item' },
]);
assert.equal(providerAliases.aliasedItems[0].id, 'item_1');
assert.equal(providerAliases.aliasedItems[0].id.includes(importedItemId), false);
assert.deepEqual(
    restoreDescriptionProviderItemIds({ item_1: { en: 'Restored copy' } }, providerAliases.originalItemIdsByAlias),
    { [importedItemId]: { en: 'Restored copy' } },
);
assert.equal(hasAnyNonEmptyDescription({ en: '', fr: 'Texte du proprietaire' }), true);
assert.equal(hasAnyNonEmptyDescription({ en: '  ', fr: '' }), false);

assert.deepEqual(chunkDescriptionItems(Array.from({ length: 205 }, (_, index) => index)).map((chunk) => chunk.length), [100, 100, 5]);
const byteBoundedChunks = chunkDescriptionItems(Array.from({ length: 100 }, (_, index) => ({
    id: `large_${index}`,
    description: 'x'.repeat(4_000),
})));
assert.equal(byteBoundedChunks.length > 1, true);
assert.equal(byteBoundedChunks.every((chunk) => chunk.length <= 100), true);
assert.equal(byteBoundedChunks.every((chunk) => (
    new TextEncoder().encode(JSON.stringify(chunk)).byteLength
    <= DESCRIPTION_ITEM_PAYLOAD_BYTES_PER_REQUEST
)), true);
const multilingualChunks = chunkDescriptionItems(
    Array.from({ length: 100 }, (_, index) => index),
    { targetLanguageCount: 20 },
);
assert.deepEqual(multilingualChunks.map((chunk) => chunk.length), [15, 15, 15, 15, 15, 15, 10]);
assert.equal(multilingualChunks.every((chunk) => (
    chunk.length * 20 <= DESCRIPTION_OUTPUT_CELLS_PER_REQUEST
)), true);

const payloadData = {
    categories: [{ id: 'cat_1', name: { en: 'Mains' } }],
    items: [
        { id: 'missing', name: { en: 'Missing' }, category: 'cat_1', description: {} },
        { id: 'short-ai', name: { en: 'Short AI' }, category: 'cat_1', description: { en: 'Hot.' }, descriptionSource: 'ai' },
        { id: 'manual', name: { en: 'Manual' }, category: 'cat_1', description: { en: 'Hot.' }, descriptionSource: 'manual' },
        { id: 'manual-target-only', name: { en: 'Manual target' }, category: 'cat_1', description: { en: '', fr: 'Texte du proprietaire' }, descriptionSource: 'manual' },
        { id: 'ready', name: { en: 'Ready' }, category: 'cat_1', description: { en: 'A complete description.' }, descriptionSource: 'ai' },
        { id: 'unnamed', name: { en: '' }, category: 'cat_1', description: {} },
    ],
} satisfies DescriptionFileData & DescriptionMergeData;
assert.deepEqual(getDescriptionGenerationStats({
    files: [{
        extractedData: { data: payloadData },
        uid: 'file_1',
    }],
    languages: ['en'],
} as any, null), {
    aiDescriptionCount: 2,
    itemsCount: 5,
    itemsWithDescriptions: 4,
    itemsWithoutDescriptions: 1,
    manualDescriptionCount: 2,
});
assert.equal(getDescriptionGenerationRequestCount({
    files: [{
        extractedData: {
            data: {
                categories: [],
                items: Array.from({ length: 100 }, (_, index) => ({
                    description: { en: 'Existing description' },
                    descriptionSource: 'ai',
                    id: `ready_${index}`,
                    name: { en: `Ready ${index}` },
                })),
            },
        },
        uid: 'file_1',
    }],
    languages: ['en', 'fr', 'es', 'hi'],
} as any, null, AI_ACTIONS_TYPES.REWRITE_DESCRIPTION), 2);
assert.deepEqual(
    prepareDescriptionPayload(payloadData, 'en', AI_ACTIONS_TYPES.ADD_DESCRIPTION).map((item: any) => item.id),
    ['missing'],
);
assert.deepEqual(
    prepareDescriptionPayload(payloadData, 'en', AI_ACTIONS_TYPES.REWRITE_DESCRIPTION).map((item: any) => item.id),
    ['short-ai', 'ready'],
);
assert.equal(
    prepareDescriptionPayload(payloadData, 'en', AI_ACTIONS_TYPES.ADD_DESCRIPTION)[0].description,
    '',
);
assert.equal(
    prepareDescriptionPayload(payloadData, 'en', AI_ACTIONS_TYPES.REWRITE_DESCRIPTION)
        .find((item: any) => item.id === 'ready')?.description,
    'A complete description.',
);
const boundedPreparedItem = prepareDescriptionPayload({
    categories: [{ id: 'cat_1', name: { en: 'c'.repeat(300) } }],
    items: [{
        attributes: [{ name: { en: 'a'.repeat(600) } }],
        category: 'cat_1',
        description: { en: 'd'.repeat(3_000) },
        id: 'bounded',
        name: { en: 'n'.repeat(700) },
    }],
}, 'en', AI_ACTIONS_TYPES.REWRITE_DESCRIPTION)[0];
assert.equal(boundedPreparedItem.name.length, 500);
assert.equal(boundedPreparedItem.category.length, 200);
assert.equal(boundedPreparedItem.attributes.length, 500);
assert.equal(boundedPreparedItem.description.length, 2000);
const boundedDescriptionPrompt = descriptionPrompt('Detailed', AI_ACTIONS_TYPES.REWRITE_DESCRIPTION, {
    itemsList: [{
        attributes: 'a'.repeat(450),
        category: 'c'.repeat(150),
        description: 'd'.repeat(1_000),
        id: 'item_1',
        name: 'n'.repeat(450),
    }],
    sourceLang: { code: 'en', name: 'English' },
    targetLang: [{ code: 'fr', name: 'French' }],
});
assert.equal(boundedDescriptionPrompt.includes('n'.repeat(450)), true);
assert.equal(boundedDescriptionPrompt.includes('c'.repeat(150)), true);
assert.equal(boundedDescriptionPrompt.includes('a'.repeat(450)), true);
assert.equal(boundedDescriptionPrompt.includes('d'.repeat(1_000)), true);

const mergedDescriptionData = mergeDescription(payloadData, {
    missing: { en: 'Generated description.', fr: 'Description generee.' },
});
assert.equal(mergedDescriptionData.items.find((item) => item.id === 'missing')?.description?.fr, 'Description generee.');
assert.equal(mergedDescriptionData.items.find((item) => item.id === 'missing')?.descriptionSource, 'ai');
const normalizedPrototypeNamedResult = normalizeDescriptionGenerationResult(
    JSON.parse('{"__proto__":{"en":"Safely merged description."}}'),
    ['__proto__'],
    ['en'],
);
assert.equal(Object.prototype.hasOwnProperty.call(normalizedPrototypeNamedResult, '__proto__'), true);
assert.equal(Object.getPrototypeOf(normalizedPrototypeNamedResult), Object.prototype);
assert.ok(normalizedPrototypeNamedResult);
const prototypeNamedSource: DescriptionMergeData = {
    items: [{ id: '__proto__', description: {} }],
};
const prototypeNamedItemData = mergeDescription(prototypeNamedSource, normalizedPrototypeNamedResult);
assert.ok(prototypeNamedItemData.items[0].description);
assert.equal(prototypeNamedItemData.items[0].description.en, 'Safely merged description.');
assert.equal(Object.getPrototypeOf(prototypeNamedItemData.items[0].description), Object.prototype);

const baseRequest = {
    action: 'add_description' as const,
    contentLength: 'Standard' as const,
    fileId: 'file_1',
    itemsList: [{ id: 'item_1', name: 'Item' }],
    projectId: '1-project-2',
    sourceLang: { code: 'en', name: 'English' },
    targetLang: [{ code: 'en', name: 'English' }],
};
assert.equal(DescriptionRequestSchema.safeParse(baseRequest).success, true);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    itemsList: [{ id: 'item_1', name: 'One' }, { id: 'item_1', name: 'Two' }],
}).success, false);
assert.equal(DescriptionRequestSchema.safeParse({ ...baseRequest, projectId: 'other-project' }).success, false);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    targetLang: [{ code: 'en', name: 'English' }, { code: 'en', name: 'Duplicate' }],
}).success, false);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    itemsList: [{ id: '', name: '' }],
}).success, false);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    action: 'rewrite_description',
    itemsList: [{ id: 'item_1', name: 'Item', description: 'Existing copy' }],
    operationRequestCount: 2,
}).success, true);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    operationRequestCount: 2,
}).success, false);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    action: 'rewrite_description',
    operationRequestCount: 1,
}).success, false);
assert.equal(DescriptionRequestSchema.safeParse({
    ...baseRequest,
    action: 'rewrite_description',
    operationRequestCount: 1001,
}).success, false);

const createMultiBatchRewriteProject = () => ({
    files: [{
        extractedData: {
            data: {
                categories: [],
                items: Array.from({ length: 101 }, (_, index) => ({
                    description: { en: `Existing description ${index}` },
                    descriptionSource: 'ai',
                    id: `item_${index}`,
                    name: { en: `Item ${index}` },
                })),
            },
        },
        uid: 'file_1',
    }],
    languages: ['en'],
    projectId: '1-project-2',
}) as any;

const createDescriptionSuccessResponse = (requestBody: any): Response => new Response(JSON.stringify({
    data: Object.fromEntries(requestBody.itemsList.map((item: any) => [
        item.id,
        { en: `Updated ${item.id}` },
    ])),
}), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
});

async function verifyDescriptionOrchestrationBoundaries(): Promise<void> {
    const originalFetch = globalThis.fetch;

    try {
        const successfulRequestBodies: any[] = [];
        globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            const requestBody = JSON.parse(String(init?.body || '{}'));
            successfulRequestBodies.push(requestBody);
            return createDescriptionSuccessResponse(requestBody);
        }) as typeof fetch;

        let successfulProjectUpdates = 0;
        await runDescriptionGeneration({
            action: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
            contentLength: 'Standard',
            onProjectUpdate: () => {
                successfulProjectUpdates += 1;
            },
            projectData: createMultiBatchRewriteProject(),
            skipPersist: true,
        });

        assert.equal(successfulRequestBodies.length, 2);
        assert.equal(successfulRequestBodies[0].operationRequestCount, 2);
        assert.equal(Object.prototype.hasOwnProperty.call(successfulRequestBodies[1], 'operationRequestCount'), false);
        assert.equal(successfulProjectUpdates, 1);

        const singleRequestProject = createMultiBatchRewriteProject();
        singleRequestProject.files[0].extractedData.data.items = singleRequestProject.files[0].extractedData.data.items.slice(0, 1);
        const singleRequestBodies: any[] = [];
        globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            const requestBody = JSON.parse(String(init?.body || '{}'));
            singleRequestBodies.push(requestBody);
            return createDescriptionSuccessResponse(requestBody);
        }) as typeof fetch;
        await runDescriptionGeneration({
            action: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
            contentLength: 'Standard',
            projectData: singleRequestProject,
            skipPersist: true,
        });
        assert.equal(singleRequestBodies.length, 1);
        assert.equal(Object.prototype.hasOwnProperty.call(singleRequestBodies[0], 'operationRequestCount'), false);

        const freeMultiBatchProject = createMultiBatchRewriteProject();
        freeMultiBatchProject.files[0].extractedData.data.items = freeMultiBatchProject.files[0].extractedData.data.items.map((item: any) => ({
            ...item,
            description: {},
            descriptionSource: undefined,
        }));
        const freeRequestBodies: any[] = [];
        globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            const requestBody = JSON.parse(String(init?.body || '{}'));
            freeRequestBodies.push(requestBody);
            return createDescriptionSuccessResponse(requestBody);
        }) as typeof fetch;
        await runDescriptionGeneration({
            action: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
            contentLength: 'Standard',
            projectData: freeMultiBatchProject,
            skipPersist: true,
        });
        assert.equal(freeRequestBodies.length, 2);
        assert.equal(freeRequestBodies.every((body) => (
            !Object.prototype.hasOwnProperty.call(body, 'operationRequestCount')
        )), true);

        const capacityRequestBodies: any[] = [];
        globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            const requestBody = JSON.parse(String(init?.body || '{}'));
            capacityRequestBodies.push(requestBody);
            return new Response(JSON.stringify({ code: 'exhausted' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 402,
            });
        }) as typeof fetch;
        let capacityFailureProjectUpdates = 0;
        await assert.rejects(
            runDescriptionGeneration({
                action: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
                contentLength: 'Standard',
                onProjectUpdate: () => {
                    capacityFailureProjectUpdates += 1;
                },
                projectData: createMultiBatchRewriteProject(),
                skipPersist: true,
            }),
            (error: unknown) => error instanceof AICapacityError && error.code === 'exhausted',
        );
        assert.equal(capacityRequestBodies.length, 1);
        assert.equal(capacityRequestBodies[0].operationRequestCount, 2);
        assert.equal(capacityFailureProjectUpdates, 0);

        const failedBatchRequestBodies: any[] = [];
        globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            const requestBody = JSON.parse(String(init?.body || '{}'));
            failedBatchRequestBodies.push(requestBody);
            if (failedBatchRequestBodies.length === 1) {
                return createDescriptionSuccessResponse(requestBody);
            }
            return new Response(JSON.stringify({ error: 'Provider unavailable' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 500,
            });
        }) as typeof fetch;

        let failedBatchProjectUpdates = 0;
        const originalConsoleError = console.error;
        try {
            // The failure diagnostics are expected by this fault-injection
            // case; keep the verification output focused on assertion results.
            console.error = () => undefined;
            await assert.rejects(
                runDescriptionGeneration({
                    action: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
                    contentLength: 'Standard',
                    onProjectUpdate: () => {
                        failedBatchProjectUpdates += 1;
                    },
                    projectData: createMultiBatchRewriteProject(),
                    skipPersist: true,
                }),
                /Description generation failed/,
            );
        } finally {
            console.error = originalConsoleError;
        }
        assert.equal(failedBatchRequestBodies[0].operationRequestCount, 2);
        assert.equal(failedBatchProjectUpdates, 0);

        globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
            const requestBody = JSON.parse(String(init?.body || '{}'));
            return createDescriptionSuccessResponse(requestBody);
        }) as typeof fetch;

        let failedSaveProjectUpdates = 0;
        await assert.rejects(
            runDescriptionGeneration({
                action: AI_ACTIONS_TYPES.REWRITE_DESCRIPTION,
                contentLength: 'Standard',
                onProjectUpdate: () => {
                    failedSaveProjectUpdates += 1;
                },
                persistProject: async () => {
                    throw new Error('project_save_failed');
                },
                projectData: createMultiBatchRewriteProject(),
            }),
            /project_save_failed/,
        );
        assert.equal(failedSaveProjectUpdates, 0);
    } finally {
        globalThis.fetch = originalFetch;
    }
}

verifyDescriptionOrchestrationBoundaries()
    .then(() => console.log('description output boundary tests passed'))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
