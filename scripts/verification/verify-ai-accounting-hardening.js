#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');

const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const collectFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const absolutePath = path.join(directory, entry.name);
  return entry.isDirectory() ? collectFiles(absolutePath) : [absolutePath];
});

let failures = 0;

const assert = (condition, message) => {
  if (!condition) {
    failures += 1;
    console.error(`FAIL ${message}`);
    return;
  }
  console.log(`PASS ${message}`);
};

const assertOrder = (source, route, orderedNeedles, message) => {
  let cursor = -1;
  const missingOrOutOfOrder = [];
  for (const needle of orderedNeedles) {
    const index = source.indexOf(needle, cursor + 1);
    if (index === -1) {
      missingOrOutOfOrder.push(needle);
      continue;
    }
    cursor = index;
  }
  assert(missingOrOutOfOrder.length === 0, `${route} ${message}${missingOrOutOfOrder.length ? `: ${missingOrOutOfOrder.join(', ')}` : ''}`);
};

const billableRoutes = [
  'src/app/api/business-copy/route.ts',
  'src/app/api/campaigns/caption/route.ts',
  'src/app/api/descriptions/route.ts',
  'src/app/api/image-editing/route.ts',
  'src/app/api/image-generation/batch-generation/route.ts',
  'src/app/api/image-generation/route.ts',
  'src/app/api/menu-card-export/design-advisor/route.ts',
  'src/app/api/new-item-metadata/route.ts',
  'src/app/api/reviews/suggest/route.ts',
  'src/app/api/seo/route.ts',
  'src/app/api/translations/route.ts',
];

const imageViewTypeRegistry = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/imageViewType.ts');
assert(imageViewTypeRegistry.includes('export type ImageViewType = (typeof imageViewTypesData)[number];'), 'image view registry derives its exact static JSON contract');
assert(imageViewTypeRegistry.includes('export const IMAGE_VIEW_TYPES: readonly ImageViewType[] = imageViewTypesData;'), 'image view registry exports an exact readonly collection');
assert(imageViewTypeRegistry.includes('): ImageViewType {'), 'image view registry fallback resolver returns the exact registry row');
assert(!imageViewTypeRegistry.includes('IMAGE_VIEW_TYPES: any[]'), 'image view registry must not erase its static data contract');

for (const route of billableRoutes) {
  const source = read(route);
  assert(source.includes('finalizeAiOperationAccounting'), `${route} uses shared AI accounting finalizer`);
  assert(!source.includes('@database/aiOperations'), `${route} does not import client AI operation DAL`);
  assert(!/\baddAiOperation\s*\(/.test(source), `${route} does not write AI operations with client SDK`);
  assert(!/\bconsumeAICapacity\s*\(/.test(source), `${route} does not bypass shared credit finalizer`);
  assert(!/\brecordAiOperationForSession\s*\(/.test(source), `${route} does not bypass shared operation finalizer`);
}

{
  const imageOperationLogging = read('src/lib/ai/imageOperationLogging.ts');
  [
    'MAX_PROVIDER_CANDIDATES_TO_INSPECT',
    'MAX_PROVIDER_PARTS_TO_INSPECT',
    'readNonNegativeSafeInteger',
    'summarizeUsageMetadata',
    'cachedContentTokenCount',
    'candidatesTokenCount',
    'promptTokenCount',
    'thoughtsTokenCount',
    'totalTokenCount',
    'summarizeImageProviderResponse',
  ].forEach((token) => assert(
    imageOperationLogging.includes(token),
    `image provider logging keeps bounded allowlisted token ${token}`,
  ));
  [
    'sanitizeImageGenerationConfigForLogging',
    'summarizeUploadedImage',
    'usageMetadata: maybeResponse?.usageMetadata',
    'as ImageLike',
  ].forEach((token) => assert(
    !imageOperationLogging.includes(token),
    `image provider logging excludes dormant/raw token ${token}`,
  ));
}

{
  const adminPreparation = read('src/lib/media/prepareMediaImageAdmin.ts');
  [
    '@napi-rs/canvas',
    'getMediaImageProfile',
    'getSafeMediaAspectRatio',
    'profile.maxOutputSizeKB',
    'profile.maxDimension',
    'profile.outputFormat',
    'profile.minQuality',
    'getMediaDataFingerprint',
    'compressionRatio',
  ].forEach((token) => {
    assert(adminPreparation.includes(token), `admin generated-image preparation includes media-profile token ${token}`);
  });

  const adminUpload = read('src/database/storage/uploadBase64MediaImageAdmin.ts');
  [
    'prepareMediaImageAdmin',
    'prepared.buffer',
    'prepared.mimeType',
    'preparedSizeBytes',
    'originalSizeBytes',
    'compressionRatio',
    "source: 'batch-image-generation-worker'",
  ].forEach((token) => {
    assert(adminUpload.includes(token), `batch generated-image upload stores prepared media token ${token}`);
  });
  assert(!adminUpload.includes('Buffer.from(match[2]'), 'batch generated-image upload must not save raw provider bytes directly');

  const storageRules = read('storage.rules');
  assert(
    storageRules.includes('match /media/{profile}/{tId}/{sId}/{entityId}/{fileId}'),
    'generated media storage stays tenant/store-scoped',
  );
  assert(
    storageRules.includes('allow delete: if belongsToStore(tId, sId);'),
    'generated media deletion stays owned by the source store',
  );

  const riskTracker = read('__docs__/production-readiness/infrastructure-risk-tracker.md');
  [
    'AI image generation prompt caching uses store-owned media copies and bounded source retention',
    "copies cached source bytes into the requesting store's own `media/menuItem/{tId}/{sId}/...` path",
    'do not implement tenant-URL reuse',
    'batch non-reference prompt cache',
    'ai_image_prompt_cache_cleanup',
    'expired prompt-cache source objects',
    'single-image browser draft generation remains uncached',
  ].forEach((token) => {
    assert(riskTracker.includes(token), `AI image cache boundary is documented: ${token}`);
  });

  const promptCache = read('src/lib/ai/imageGenerationPromptCache.ts');
  const promptCacheBoundary = read('src/lib/ai/imagePromptCacheBoundary.ts');
  [
    'AI_IMAGE_PROMPT_CACHE',
    'isImagePromptCacheEligible',
    'copyCachedImagePromptToStore',
    'writeImagePromptCacheSource',
    'buildImagePromptCacheSourcePath',
    'getReusableImagePromptCacheSource',
    'imagePromptCacheWriteCommitted',
    'IMAGE_PROMPT_CACHE_TTL_DAYS',
    'generationConfig?.referanceImage?.url',
    'params.prompts.length !== 1',
    'Number(params.generationConfig?.numberOfImages || 1) !== 1',
    'buildMediaStoragePath({',
    'storeId: params.sId',
    'tenantId: params.tId',
    'promptCacheHit: "true"',
    'source: "ai-image-prompt-cache-hit"',
    'expiresAt: admin.firestore.Timestamp.fromMillis',
    'promptLength: params.prompt.length',
    "logRuntimeDiagnostic('ai_image_prompt_cache_write_acknowledgement_recovered'",
    "logRuntimeFailure('ai_image_prompt_cache_write_recovery_probe_failed'",
    "logRuntimeFailure('ai_image_prompt_cache_staged_source_cleanup_failed'",
    "file(stagedSourcePath).delete({ ignoreNotFound: true })",
  ].forEach((token) => {
    assert(promptCache.includes(token), `AI image prompt cache helper includes token ${token}`);
  });
  assert(!promptCache.includes('prompt,'), 'AI image prompt cache helper does not persist raw prompts');
  [
    'system/aiImagePromptCache',
    'getReusableImagePromptCacheSource',
    'cacheDoc.keyVersion !== IMAGE_PROMPT_CACHE_KEY_VERSION',
    'outputSizeBytes !== sourceBytes.byteLength',
    'validateMagicBytes(exactBuffer.buffer, mimeType)',
  ].forEach((token) => {
    assert(promptCacheBoundary.includes(token), `AI image prompt cache runtime boundary includes token ${token}`);
  });

  const maintenanceSchedulerSource = read('functions/src/schedulers/menulistMaintenanceScheduler.ts');
  const promptCacheRetentionBoundary = read('functions/src/schedulers/imagePromptCacheRetentionBoundary.ts');
  [
    'const IMAGE_PROMPT_CACHE_CLEANUP_LIMIT = 25;',
    'runImagePromptCacheCleanup',
    'DB_COLLECTIONS.AI_IMAGE_PROMPT_CACHE',
    ".where('expiresAt', '<=', now)",
    ".orderBy('expiresAt', 'asc')",
    '.limit(IMAGE_PROMPT_CACHE_CLEANUP_LIMIT + 1)',
    'const hasMoreExpired = snapshot.size > cleanupDocs.length;',
    'isImagePromptCacheSourcePath(sourcePath, doc.id)',
    "bucket.file(sourcePath).delete({ ignoreNotFound: true })",
    'if (!sourceCleanupSucceeded) continue;',
    'transaction.delete(doc.ref)',
    "'ai_image_prompt_cache_cleanup'",
    "cadence: { type: 'every', minutes: 60 }",
    'run: runImagePromptCacheCleanup',
  ].forEach((token) => {
    assert(maintenanceSchedulerSource.includes(token), `AI image prompt cache cleanup is source-gated: ${token}`);
  });
  [
    "const IMAGE_PROMPT_CACHE_STORAGE_PREFIX = 'system/aiImagePromptCache/';",
    'export function isImagePromptCacheSourcePath',
    'export function shouldDeleteCurrentImagePromptCacheDocument',
    'params.currentData.sourcePath === params.claimedSourcePath',
    'expiresAtMillis <= params.nowMillis',
  ].forEach((token) => {
    assert(promptCacheRetentionBoundary.includes(token), `AI image prompt cache retention boundary includes token ${token}`);
  });

  const batchWorker = read('src/app/api/image-generation/batch-generation/route.ts');
  const batchServer = read('src/database/imageBatchProcessing/server.ts');
  const batchTransactionStart = batchWorker.indexOf('const accountingInput: BatchImageAccountingInput = {');
  const batchTransactionEnd = batchWorker.indexOf('const updatedItem = {', batchTransactionStart);
  const batchTransactionInput = batchWorker.slice(batchTransactionStart, batchTransactionEnd);
  [
    'aspectRatio: generationConfig?.aspectRatio',
    'uploadBase64MediaImageAdminWithMetadata({',
    'mediaId: `${operationId}_${index}`',
    'operationId: execution.operationId',
    'copyCachedImagePromptToStore',
    'writeImagePromptCacheSource',
    'promptCacheImage',
    "promptCacheImage\n                ? 'ai_image_prompt_cache' as const\n                : 'gemini_image_generation' as const",
    'promptCacheImage\n                ? 0',
    "promptCacheImage ? 'Batch image generation cache hit' : 'Batch image generation'",
    'idempotencyKey: execution.operationId',
    'stageImageBatchItemResultAdmin',
    'appendImageBatchItemResultAdmin',
    'summarizeBatchGenerationConfig',
    'generationConfigSummary: summarizeBatchGenerationConfig',
    'model: AI_MODEL_ID',
  ].forEach((token) => {
    assert(batchWorker.includes(token), `batch worker passes generated-image preparation token ${token}`);
  });
  assert(batchTransactionStart >= 0 && batchTransactionEnd > batchTransactionStart, 'batch worker transaction input block is detectable');
  assert(batchWorker.includes('item: summarizeBatchItem'), 'batch worker local diagnostics use item summaries');
  assert(batchWorker.includes('generationConfigSummary: summarizeBatchGenerationConfig'), 'batch worker local diagnostics use config summaries');
  assert(!batchTransactionInput.includes('\n                itemDetails,'), 'batch worker AI accounting input must not persist raw item details');
  assert(!batchTransactionInput.includes('generationConfig: sanitizeImageGenerationConfigForLogging'), 'batch worker AI accounting input must not persist raw generation config');
  assert(!batchWorker.includes('logType: \'BATCH_GENERATION_IMAGE_GEN_STARTED\',\n            data: {\n                generationConfig: sanitizeImageGenerationConfigForLogging'), 'batch worker start logs must not write raw generation config payloads');

  const singleImageRoute = read('src/app/api/image-generation/route.ts');
  const generatedImageOutput = read('src/lib/ai/generatedImageOutput.ts');
  const imageGenerators = read('src/app/api/image-generation/generators.ts');
  const singleImageTransactionStart = singleImageRoute.indexOf('// Update the transaction object with calculated values and other details');
  const singleImageTransactionEnd = singleImageRoute.indexOf('// Add the operation to the database', singleImageTransactionStart);
  const singleImageTransactionInput = singleImageRoute.slice(singleImageTransactionStart, singleImageTransactionEnd);
  [
    'runImageGenerationPrompts',
    'checkAICapacity',
    'finalizeAiOperationAccounting',
    'getImageGenerationConfigLogSummary',
    'getImageItemDetailsLogSummary',
    'getTransactionLogSummary',
    'requestSummary',
    'responseSummary',
  ].forEach((token) => {
    assert(singleImageRoute.includes(token), `single image generation route retains existing browser-draft flow token ${token}`);
  });
  assert(!singleImageRoute.includes('copyCachedImagePromptToStore'), 'single image generation route does not create cache-hit Storage drafts without cleanup');
  assert(singleImageTransactionStart >= 0 && singleImageTransactionEnd > singleImageTransactionStart, 'single image generation transaction input block is detectable');
  assert(singleImageTransactionInput.includes('itemSummary: getImageItemDetailsLogSummary'), 'single image generation AI accounting input uses item summaries');
  assert(singleImageTransactionInput.includes('generationConfigSummary: getImageGenerationConfigLogSummary'), 'single image generation AI accounting input uses config summaries');
  assert(!singleImageTransactionInput.includes('\n                itemDetails,'), 'single image generation AI accounting input must not persist raw item details');
  assert(!singleImageTransactionInput.includes('generationConfig: sanitizeImageGenerationConfigForLogging'), 'single image generation AI accounting input must not persist raw generation config');
  assert(!singleImageRoute.includes('transaction: transactionObject'), 'single image generation local logs must not write full transaction objects');
  assert(!singleImageRoute.includes('data: transactionObject'), 'single image generation local error logs must not write full transaction objects');
  [
    'normalizeGeneratedImagesFromProvider(response)',
    'let contents: ContentListUnion',
  ].forEach((token) => {
    assert(imageGenerators.includes(token), `shared image provider runner uses exact output/input token ${token}`);
  });
  [
    'GENERATED_IMAGE_MAX_BYTES = 15 * 1024 * 1024',
    'GENERATED_IMAGE_MAX_COUNT = 4',
    'normalizeMediaUploadMimeType(inlineData.mimeType)',
    'getBase64DecodedSize(base64)',
    'validateMagicBytes(exactArrayBuffer, mimeType).valid',
    'export const normalizeGeneratedImagesFromProvider',
  ].forEach((token) => {
    assert(generatedImageOutput.includes(token), `generated image provider output boundary includes ${token}`);
  });
  assert(!imageGenerators.includes('let contents: any'), 'shared image provider runner must not erase Gemini request input types');
  assert(!imageGenerators.includes("part.inlineData.mimeType.split('/')"), 'shared image provider runner must not construct an image MIME type from an untrusted suffix');
  assert(!singleImageRoute.includes('request: {\n                    generationConfig:'), 'single image generation local success logs must not write raw request payloads');
  assert(!singleImageRoute.includes('generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),\n                    itemDetails,'), 'single image generation no-image logs must not write raw config/item payloads');
  assert(!singleImageRoute.includes('writeMissingParamsLogEntry(LOG_FILE, userId, rawData?.projectId'), 'single image generation validation local logs must not write raw project IDs into local log fields');
  assert(singleImageRoute.includes('attemptedData: getAIRouteLogContext({\n                    hasGenerationConfig:'), 'single image generation validation local logs use bounded attempted-data summaries');
  assert(!singleImageRoute.includes("logger.debug('Prompts to execute'"), 'single image generation must not debug-log prompt-count breadcrumbs');
  assert(!singleImageRoute.includes("logger.debug('Image generation transaction recorded'"), 'single image generation must not debug-log transaction breadcrumbs');

  const imageEditingRoute = read('src/app/api/image-editing/route.ts');
  const imageEditingTransactionStart = imageEditingRoute.indexOf('const transactionObject = {');
  const imageEditingTransactionEnd = imageEditingRoute.indexOf('// Add the operation to the database', imageEditingTransactionStart);
  const imageEditingTransactionInput = imageEditingRoute.slice(imageEditingTransactionStart, imageEditingTransactionEnd);
  [
    'getImageEditingConfigLogSummary',
    'getImageItemDetailsLogSummary',
    'getTransactionLogSummary',
    'requestSummary',
    'responseSummary',
  ].forEach((token) => {
    assert(imageEditingRoute.includes(token), `image editing route keeps bounded local log token ${token}`);
  });
  assert(imageEditingTransactionStart >= 0 && imageEditingTransactionEnd > imageEditingTransactionStart, 'image editing transaction input block is detectable');
  assert(imageEditingTransactionInput.includes('itemSummary: getImageItemDetailsLogSummary'), 'image editing AI accounting input uses item summaries');
  assert(imageEditingTransactionInput.includes('generationConfigSummary: getImageEditingConfigLogSummary'), 'image editing AI accounting input uses config summaries');
  assert(!imageEditingTransactionInput.includes('\n            itemDetails,'), 'image editing AI accounting input must not persist raw item details');
  assert(!imageEditingTransactionInput.includes('generationConfig: sanitizeImageGenerationConfigForLogging'), 'image editing AI accounting input must not persist raw generation config');
  assert(!imageEditingRoute.includes('data: transactionObject'), 'image editing local error logs must not write full transaction objects');
  assert(!imageEditingRoute.includes('\n                transactionObject,\n'), 'image editing local success logs must not write full transaction objects');
  assert(!imageEditingRoute.includes('imageEditResponse: {'), 'image editing local success logs must use response summaries');
  assert(!imageEditingRoute.includes('generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),\n                    itemDetails,'), 'image editing no-image logs must not write raw config/item payloads');
  assert(!imageEditingRoute.includes('writeMissingParamsLogEntry(LOG_FILE, userId, rawData?.projectId, rawData?.fileId'), 'image editing validation local logs must not write raw project/file IDs into local log fields');
  assert(imageEditingRoute.includes('attemptedData: getAIRouteLogContext({\n                    hasGenerationConfig:'), 'image editing validation local logs use bounded attempted-data summaries');
  assert(!imageEditingRoute.includes("logger.debug('Started image edit via flash'"), 'image editing must not debug-log provider-start breadcrumbs');
  assert(!imageEditingRoute.includes("logger.debug('Completed image edit via flash'"), 'image editing must not debug-log provider-complete breadcrumbs');
  assert(!imageEditingRoute.includes("logger.debug('Prompt generated for image edit'"), 'image editing must not debug-log generated-prompt breadcrumbs');
  assert(imageEditingRoute.includes('normalizeGeneratedImagesFromProvider(response)'), 'image editing must use the exact generated-image provider output boundary');
  assert(!imageEditingRoute.includes("part.inlineData.mimeType.split('/')"), 'image editing must not construct an image MIME type from an untrusted suffix');

  const paidProviderReservationRoutes = [
    ['src/app/api/business-copy/route.ts', 'response = await genAIClient.models.generateContent({'],
    ['src/app/api/reviews/suggest/route.ts', 'const result = await model.generateContent({'],
    ['src/app/api/campaigns/caption/route.ts', 'response = await genAIClient.models.generateContent({'],
    ['src/app/api/menu-card-export/design-advisor/route.ts', 'response = await genAIClient.models.generateContent({'],
    ['src/app/api/descriptions/route.ts', 'response = await genAIClient.models.generateContent({'],
    ['src/app/api/translations/route.ts', 'response = await genAIClient.models.generateContent({'],
    ['src/app/api/seo/route.ts', 'response = await genAIClient.models.generateContent({'],
    ['src/app/api/image-editing/route.ts', 'const imageEditGemeiniResponse = await editImageViaFlash({'],
    ['src/app/api/image-generation/route.ts', 'const promptRun = await runImageGenerationPrompts({'],
  ];
  for (const [route, providerToken] of paidProviderReservationRoutes) {
    const source = read(route);
    const capacityIndex = source.indexOf('checkAICapacity(');
    const reservationIndex = source.indexOf('reserveAiCapacity({', capacityIndex);
    const providerIndex = source.indexOf(providerToken, reservationIndex);
    const finalizerIndex = source.indexOf('finalizeAiOperationAccounting({', providerIndex);
    assert(capacityIndex >= 0, `${route} checks paid capacity`);
    assert(reservationIndex > capacityIndex, `${route} reserves paid credits after capacity admission`);
    assert(providerIndex > reservationIndex, `${route} reserves paid credits before provider work`);
    assert(finalizerIndex > providerIndex, `${route} settles the reservation after provider work`);
    assert(source.includes('capacityReservation'), `${route} passes the reservation into shared accounting`);
    assert(source.includes('refundAiCapacityReservationSafely'), `${route} refunds unsettled provider work`);
  }

  const accountingCore = read('src/lib/ai/accounting.ts');
  const capacityCore = read('src/lib/ai/capacityCheck.ts');
  const aiCreditScalarContract = read('src/data/shared/aiCreditScalarContract.ts');
  const functionsAiCreditScalarContract = read('functions/src/sharedData/aiCreditScalarContract.ts');
  assert(
    aiCreditScalarContract === functionsAiCreditScalarContract,
    'MenuList AI credit scalar contract is byte-identical across app and Functions runtimes',
  );
  [
    'getNonNegativeCreditInteger',
    "typeof value === 'number'",
    'Number.isSafeInteger(value)',
    'getPositiveCreditInteger',
    'getCreditBillingPeriodKey',
  ].forEach((token) => assert(aiCreditScalarContract.includes(token), `AI credit scalar contract includes exact-value token ${token}`));
  [
    'reserveAiCapacity',
    'finalizeAiCapacityReservation',
    'refundAiCapacityReservation',
    'accountingStatus: "reserved"',
    'accountingStatus: "consumed"',
    'accountingStatus: "refunded"',
    'AI_CAPACITY_RESERVATION_TTL_MS',
    'AI_CAPACITY_REFUND_RETENTION_MS',
  ].forEach((token) => assert(capacityCore.includes(token), `AI capacity core includes reservation contract token ${token}`));
  [
    'billingStoreId: subscriptionStoreId',
    'accountingBillingStoreId: Number(expected.billingStoreId)',
    'getPersistedBillingStoreId',
    'remainingBalance: {\n                billingStoreId: Number(expected.billingStoreId),',
  ].forEach((token) => assert(capacityCore.includes(token), `AI capacity core preserves effective inherited billing scope token ${token}`));
  assert(accountingCore.includes('paid provider work requires a pre-provider credit reservation'), 'shared accounting rejects unreserved paid provider output');
  assert(accountingCore.includes('finalizeAiCapacityReservation'), 'shared accounting settles reserved capacity atomically');
  assert(accountingCore.includes('getPositiveCreditInteger(data.accountingBillingStoreId ?? data.sId)'), 'legacy idempotent replay requires an exact effective billing store scope');
  assert(accountingCore.includes('remainingBalance: { billingStoreId, monthlyCredits, promotionalCredits, topUpCredits }'), 'legacy idempotent replay returns the complete scoped balance event');
  [
    'const unitsConsumed = getNonNegativeCreditInteger(',
    'data.accountingUnits !== unitsConsumed',
    'getNonNegativeCreditInteger(data.remainingMonthlyCredits)',
    'getNonNegativeCreditInteger(data.remainingPromotionalCredits ?? 0)',
    'getNonNegativeCreditInteger(data.remainingTopUpCredits)',
    '!Number.isSafeInteger(monthlyCredits + promotionalCredits + topUpCredits)',
  ].forEach((token) => assert(accountingCore.includes(token), `shared accounting includes exact AI credit scalar token ${token}`));
  [
    'Number(input.unitsConsumed',
    'Number(data.accountingUnits)',
    'Number(data.accountingBillingStoreId',
    'Number(data.remainingMonthlyCredits)',
    'Number(data.remainingTopUpCredits)',
  ].forEach((token) => assert(!accountingCore.includes(token), `shared accounting forbids coercive AI credit scalar token ${token}`));

  const batchReservationStart = batchWorker.indexOf("if (!promptCacheImage) {");
  const batchReservationIndex = batchWorker.indexOf('capacityReservation = await reserveAiCapacity({', batchReservationStart);
  const batchProviderIndex = batchWorker.indexOf(': await runImageGenerationPrompts({', batchReservationIndex);
  const batchFinalizerIndex = batchWorker.indexOf('await finalizeAiOperationAccounting({', batchProviderIndex);
  assert(batchReservationIndex > batchReservationStart, 'batch provider work reserves capacity with its stable operation ID');
  assert(batchProviderIndex > batchReservationIndex, 'batch provider work starts only after its durable reservation');
  assert(batchFinalizerIndex > batchProviderIndex, 'batch staged output settles the same durable reservation');
  assert(batchWorker.includes("recoveryMode: 'durable_retry'"), 'batch reservations survive staged-result retries');
  assert(batchWorker.includes('retainCapacityReservationForRetry = stagedResultPersisted'), 'batch retains a durable reservation only while staged work remains retryable');
  assert(batchServer.includes('retainsStagedResult: shouldRetry && Boolean(execution.stagedItem && execution.stagedAccountingInput)'), 'batch failure settlement reports authoritative staged-media retention');
  assert(batchWorker.includes('!stagedResultPersisted && !failure.retainsStagedResult ? uploadedStoragePaths : []'), 'batch cleanup excludes route-local paths when current truth retained a staged result');
  assert(batchWorker.includes('refundDurableAiCapacityReservationByIdSafely'), 'terminal batch acknowledgements recover stranded durable reservations by operation ID');
  assert(capacityCore.includes('Number.isSafeInteger(unitsToReserve)'), 'capacity reservations reject fractional and unsafe integer units');
  const accountingSource = read('src/lib/ai/accounting.ts');
  assert(accountingSource.includes('getNonNegativeCreditInteger(input.unitsConsumed ?? getUnitCost(input.action))'), 'shared accounting finalizer rejects fractional and unsafe integer units');
  assert(capacityCore.includes('Number.isSafeInteger(unitsToConsume)'), 'legacy credit helpers reject fractional and unsafe integer units');
  assert(capacityCore.includes('refundDurableAiCapacityReservationByIdSafely'), 'capacity core exposes bounded durable reservation recovery');
  assert(batchWorker.includes('if (!retainCapacityReservationForRetry) {'), 'batch failures refund unless the same durable staged output remains retryable');
  [
    'getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0)',
    'getNonNegativeCreditInteger(subscription.topUpCredits ?? 0)',
    'if (!Number.isSafeInteger(remaining)) {',
    'getPositiveCreditInteger(operation.accountingUnits)',
    'getCreditBillingPeriodKey(rawReservedBillingPeriod)',
    'AI capacity reservation refund credit balance overflowed.',
  ].forEach((token) => assert(capacityCore.includes(token), `capacity core includes exact AI credit scalar token ${token}`));
  [
    'Number(data.accountingUnits)',
    'Number(operationData.unitsConsumed)',
    'Number(existing.accountingUnits)',
    'Number(current.monthlyCredits',
    'Number(current.topUpCredits',
    'Number(existing.accountingCharged',
    'Number(existing.accountingReservationBillingPeriod)',
  ].forEach((token) => assert(!capacityCore.includes(token), `capacity core forbids coercive AI credit scalar token ${token}`));

  const reservationRecovery = read('functions/src/schedulers/aiCapacityReservationRecovery.ts');
  assert(reservationRecovery.includes("operation.accountingStatus === 'refunded'"), 'maintenance deletes expired refunded reservation shells');
  assert(reservationRecovery.includes("operation.accountingRecoveryMode !== 'automatic_refund'"), 'maintenance never auto-refunds durable batch reservations');
  assert(reservationRecovery.includes("accountingStatus: 'refunded'"), 'maintenance refunds stale interactive reservations');
  assert(reservationRecovery.includes('operation.accountingBillingStoreId || operation.sId'), 'maintenance refunds an inherited-outlet reservation against its effective billing store');
  assert(reservationRecovery.includes('currentRecoveryAt > params.now.toMillis()'), 'maintenance rechecks the current recovery deadline inside the transaction');
  assert(reservationRecovery.includes('errors++'), 'one malformed reservation cannot abort later rows in the same store');
  [
    'getNonNegativeCreditInteger(subscription.monthlyCredits ?? 0)',
    'getNonNegativeCreditInteger(subscription.topUpCredits ?? 0)',
    'getCreditBillingPeriodKey(rawReservedBillingPeriod)',
    'AI capacity reservation refund credit balance overflowed.',
  ].forEach((token) => assert(reservationRecovery.includes(token), `reservation recovery includes exact AI credit scalar token ${token}`));
  [
    'Number(subscription.monthlyCredits',
    'Number(subscription.topUpCredits',
    'Number(operation.accountingCharged',
    'Number(operation.accountingReservationBillingPeriod)',
  ].forEach((token) => assert(!reservationRecovery.includes(token), `reservation recovery forbids coercive AI credit scalar token ${token}`));
  assert(maintenanceSchedulerSource.includes('recoverAiCapacityReservationsInCollectionRef'), 'consolidated maintenance scheduler runs bounded reservation recovery');
  assert(maintenanceSchedulerSource.includes('storeErrors += reservationResult.errors'), 'consolidated maintenance scheduler reports per-row reservation recovery failures');
  assert(maintenanceSchedulerSource.includes('AI_OPERATION_STORE_CLEANUP_FAILED_CODE'), 'consolidated maintenance scheduler isolates and logs per-store cleanup failures');

  const packageJson = read('package.json');
  assert(packageJson.includes('"test:ai-capacity-reservation:emulator"'), 'package exposes AI capacity reservation emulator regression suite');
  const reservationEmulator = read('scripts/verification/test-ai-capacity-reservation-emulator.ts');
  [
    'reservation-inherited-outlet',
    'inherited outlet debits the effective HQ subscription',
    'reservation records the distinct effective billing store',
    'legacy replay responses retain the effective billing store scope',
    'stale inherited-outlet reservations refund the effective HQ subscription',
    'numeric-string subscription balances must not authorize paid AI work',
    'numeric-string accounting units must not satisfy idempotent reservation replay',
    'conflicting authenticated and input scope must fail before deterministic operation lookup or write',
    'numeric-string charged-credit evidence must not mint a refund',
    'numeric-string billing-period evidence must not authorize a refund',
    'numeric-string recovery evidence must not mint credits',
  ].forEach((token) => assert(reservationEmulator.includes(token), `reservation emulator covers inherited-outlet scope token ${token}`));
  assert(packageJson.includes('"@napi-rs/canvas": "0.1.84"'), 'root package pins server-side canvas encoder dependency');
}

[
  ['business copy prompt', 'src/app/api/business-copy/prompt.ts'],
  ['SEO prompt', 'src/app/api/seo/prompt.ts'],
  ['Menu Card design advisor prompt', 'src/app/api/menu-card-export/design-advisor/prompt.ts'],
].forEach(([label, route]) => {
  const source = read(route);
  [
    'const PROMPT_INPUT_TEXT_MAX_LENGTH = 300;',
    'const PROMPT_INPUT_LIST_ITEM_MAX_LENGTH = 120;',
    'const PROMPT_INPUT_LIST_MAX_ITEMS = 20;',
    'function sanitizePromptText(',
    ".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')",
    ".replace(/[{}<>`$\\\\]/g, '')",
    '.slice(0, PROMPT_INPUT_LIST_MAX_ITEMS)',
    "sanitizePromptText(item, '', PROMPT_INPUT_LIST_ITEM_MAX_LENGTH)",
  ].forEach((token) => {
    assert(source.includes(token), `${label} includes bounded prompt input token ${token}`);
  });
  assert(!source.includes('items.join(\', \')'), `${label} must not join prompt list input directly`);
  assert(!source.includes('${store.description || \'Not provided\'}'), `${label} must not interpolate raw store description`);
  assert(!source.includes('${store.tenantName || store.name}'), `${label} must not interpolate raw brand name`);
});

{
  const menuCardAdvisorPrompt = read('src/app/api/menu-card-export/design-advisor/prompt.ts');
  [
    'function buildPromptPayload(',
    'preflightWarnings: payload.preflightWarnings',
    "sourceHash: sanitizePromptText(payload.sourceHash, 'unknown', 160)",
    'JSON.stringify(promptPayload.sourceSummary)',
    'JSON.stringify(promptPayload.preflightWarnings)',
  ].forEach((token) => {
    assert(menuCardAdvisorPrompt.includes(token), `Menu Card design advisor prompt includes bounded payload token ${token}`);
  });
  assert(!menuCardAdvisorPrompt.includes('JSON.stringify(payload.sourceSummary)'), 'Menu Card design advisor prompt must not serialize raw source summary');
  assert(!menuCardAdvisorPrompt.includes('JSON.stringify(payload.preflightWarnings)'), 'Menu Card design advisor prompt must not serialize raw preflight warnings');
  assert(!menuCardAdvisorPrompt.includes('`Source hash: ${payload.sourceHash}`'), 'Menu Card design advisor prompt must not interpolate raw source hash');
}

{
  const reviewSuggest = read('src/app/api/reviews/suggest/route.ts');
  [
    'getReviewSuggestLogContext',
    'const REVIEW_PROMPT_TEXT_MAX_LENGTH = 2000;',
    'const REVIEW_BUSINESS_TYPE_MAX_LENGTH = 80;',
    'businessType: z.string().max(REVIEW_BUSINESS_TYPE_MAX_LENGTH).optional()',
    'function sanitizeReviewPromptText(',
    ".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')",
    ".replace(/[{}<>`$\\\\]/g, '')",
    'const promptReviewText = sanitizeReviewPromptText(reviewText, REVIEW_PROMPT_TEXT_MAX_LENGTH);',
    'const promptBusinessType = sanitizeReviewPromptText(businessType, REVIEW_BUSINESS_TYPE_MAX_LENGTH);',
    'JSON.stringify(promptReviewText)',
    'getReviewReplyClientResponseSummary',
    "responseSummaryKind: 'review_reply_suggestion'",
    'replyLength: reply.length',
    "logRuntimeFailure('review_reply_accounting_failed'",
    "getBoundedRuntimeStringContext('tenantId'",
    "getBoundedRuntimeStringContext('storeId'",
    "getBoundedRuntimeStringContext('userId'",
    "getBoundedRuntimeStringContext('businessType'",
  ].forEach((token) => {
    assert(reviewSuggest.includes(token), `review reply suggestion route includes bounded accounting diagnostic token ${token}`);
  });
  assert(!reviewSuggest.includes("logger.error('Failed to record review reply AI transaction'"), 'review reply suggestion route must not raw-log accounting failures');
  assert(!reviewSuggest.includes('clientResponse: {\n                        rating,\n                        reply,'), 'review reply suggestion route must not persist generated reply text in transaction input');
  assert(!reviewSuggest.includes('businessType: promptBusinessType || null'), 'review reply operation rows must not persist request-derived business type outside the compact result summary');
  assert(!reviewSuggest.includes('reviewLength: promptReviewText.length'), 'review reply operation rows must not persist request-derived review length outside bounded runtime diagnostics');
  assert(!reviewSuggest.includes('transactionError, {'), 'review reply suggestion route must not pass raw accounting exceptions and context to logger');
  assert(!reviewSuggest.includes('reviewText.slice(0, 2000)'), 'review reply suggestion route must not inject raw review text into the prompt');
  assert(!reviewSuggest.includes('const normalizedType = businessType.toLowerCase();'), 'review reply suggestion route must not use raw business type for industry constraints');
}

{
  const validationSchemas = read('src/lib/validation/apiSchemas.ts');
  [
    'const TRANSLATION_INPUT_KEY_MAX_LENGTH = 240;',
    'const TRANSLATION_INPUT_VALUE_MAX_LENGTH = 2000;',
    'const TRANSLATION_INPUT_MAX_ITEMS = 1000;',
    '.max(TRANSLATION_INPUT_KEY_MAX_LENGTH)',
    'z.string().trim().min(1).max(TRANSLATION_INPUT_VALUE_MAX_LENGTH)',
    'Object.keys(obj).length > 0 && Object.keys(obj).length <= TRANSLATION_INPUT_MAX_ITEMS',
  ].forEach((token) => {
    assert(validationSchemas.includes(token), `translation request schema includes bounded input token ${token}`);
  });
}

{
  const translationPrompt = read('src/app/api/translations/prompt.ts');
  [
    'const TRANSLATION_PROMPT_TEXT_MAX_LENGTH = 2000;',
    'const TRANSLATION_PROMPT_MAX_ITEMS = 1000;',
    'function sanitizeTranslationPromptText(',
    ".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')",
    ".replace(/[{}<>`$\\\\]/g, '')",
    'function buildPromptInputJson(',
    '.slice(0, TRANSLATION_PROMPT_MAX_ITEMS)',
    'sanitizeTranslationPromptText(value)',
    'const promptInputJson = buildPromptInputJson(inputJson);',
    'JSON.stringify(promptInputJson, null, 2)',
  ].forEach((token) => {
    assert(translationPrompt.includes(token), `translation prompt includes bounded prompt input token ${token}`);
  });
  assert(!translationPrompt.includes('JSON.stringify(inputJson, null, 2)'), 'translation prompt must not serialize raw inputJson into provider prompt');
  assert(!translationPrompt.includes('from ${sourceLang} to ${targetLang}'), 'translation prompt must use normalized target label for batch prompts');
}

{
  const campaignCaptionPrompt = read('src/services/gemini/prompts/v1/campaignCaption.prompt.ts');
  [
    'const PROMPT_INPUT_TEXT_MAX_LENGTH = 300;',
    'function sanitizePromptText(',
    ".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')",
    ".replace(/[{}<>`$\\\\]/g, '')",
    'const surfaceGuidelines: Record<CampaignCaptionInput',
    'const campaignContext: Record<string, string>',
    'function getSafeCampaignType(',
    'function getSafeSurface(',
    'const safeCampaignType = getSafeCampaignType(campaignType);',
    'const safeSurface = getSafeSurface(surface);',
    "sanitizePromptText(itemName, 'Not provided', 160)",
    "sanitizePromptText(itemDescription, 'Not provided', 500)",
    "sanitizePromptText(itemPrice, 'Not provided', 60)",
    "sanitizePromptText(categoryName, 'Not provided', 120)",
    "sanitizePromptText(businessName, 'Not provided', 160)",
    "sanitizePromptText(language, 'en', 60)",
  ].forEach((token) => {
    assert(campaignCaptionPrompt.includes(token), `campaign caption prompt includes bounded prompt token ${token}`);
  });
  assert(!campaignCaptionPrompt.includes('- Name: ${itemName}'), 'campaign caption prompt must not inject raw item name');
  assert(!campaignCaptionPrompt.includes("- Description: ${itemDescription || 'Not provided'}"), 'campaign caption prompt must not inject raw item description');
  assert(!campaignCaptionPrompt.includes("- Price: ${itemPrice || 'Not provided'}"), 'campaign caption prompt must not inject raw item price');
  assert(!campaignCaptionPrompt.includes("- Category: ${categoryName || 'Not provided'}"), 'campaign caption prompt must not inject raw category name');
  assert(!campaignCaptionPrompt.includes("- Business: ${businessName || 'Not provided'}"), 'campaign caption prompt must not inject raw business name');
  assert(!campaignCaptionPrompt.includes('- Language: ${language}'), 'campaign caption prompt must not inject raw language');
  assert(!campaignCaptionPrompt.includes('const surfaceGuidelines: Record<string, string> = {'), 'campaign caption prompt should keep surface guidelines outside the user builder');
  assert(!campaignCaptionPrompt.includes('const campaignContext: Record<string, string> = {'), 'campaign caption prompt should keep campaign context outside the user builder');
}

[
  ['frontend AI Gateway', 'src/lib/google/genAi/aiGateway.ts'],
  ['Functions AI Gateway', 'functions/src/ai/aiGateway.ts'],
].forEach(([label, route]) => {
  const source = read(route);
  [
    '[AIGateway] Gemini provider config missing',
    'AI_PROVIDER_CONFIG_MISSING_CODE',
    'this.keyManager.hasConfiguredKeys()',
    'getProviderErrorLogContext',
    'return getProviderErrorStrings(error).filter(Boolean).join',
    'PROVIDER_ERROR_INDICATOR_KEYS',
    'function isProviderErrorIndicatorEntry',
    "key.toLowerCase().includes('message')",
    'sourceErrorName',
    'sourceErrorCode',
    'sourceStatusCode',
    '[AIGateway] Retryable provider error; retrying with jittered backoff',
    '[AIGateway] Provider attempts exhausted',
  ].forEach((token) => {
    assert(source.includes(token), `${label} includes bounded gateway diagnostic token ${token}`);
  });
  assert(!source.includes('${error.message ||'), `${label} must not log raw provider retry messages`);
  assert(!source.includes('error.message'), `${label} must not parse raw provider error messages`);
  assert(!source.includes('error?.message'), `${label} must not parse optional raw provider messages`);
  assert(!source.includes('error?.error?.message'), `${label} must not parse nested raw provider messages`);
  assert(!source.includes('value.message'), `${label} must not collect nested provider message text`);
  assert(!source.includes('lastError?.message'), `${label} must not log raw final provider messages`);
  assert(!source.includes('JSON.stringify(error?.errorDetails'), `${label} must not stringify raw provider details`);
  assert(!source.includes('[AIGateway] All ${MAX_RETRY_ATTEMPTS} attempts exhausted'), `${label} must use bounded exhaustion diagnostics`);
});

{
  const functionsGatewayRoute = 'functions/src/ai/aiGateway.ts';
  const functionsGateway = read(functionsGatewayRoute);
  [
    "import { isSafeModeActive } from '../monitoring/safeMode';",
    "AI_PROVIDER_SAFE_MODE_ACTIVE_CODE = 'AI_PROVIDER_SAFE_MODE_ACTIVE'",
    'class AIProviderSafeModeActiveError extends Error',
    'readonly code = AI_PROVIDER_SAFE_MODE_ACTIVE_CODE',
    "this.executeWithRetry('fileDelete', config)",
    "if (method !== 'fileDelete' && await isSafeModeActive())",
    'const error = new AIProviderSafeModeActiveError()',
    "'[AIGateway] Provider call blocked by SAFE_MODE'",
    'failureCode: AI_PROVIDER_SAFE_MODE_ACTIVE_CODE',
  ].forEach((token) => {
    assert(functionsGateway.includes(token), `Functions AI Gateway includes SAFE_MODE provider guard token ${token}`);
  });
  assertOrder(
    functionsGateway,
    functionsGatewayRoute,
    [
      'private async executeWithRetry',
      "if (method !== 'fileDelete' && await isSafeModeActive())",
      'this.keyManager.hasConfiguredKeys()',
      'for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++)',
      'const client = this.keyManager.getClient()',
    ],
    'checks SAFE_MODE before provider key selection and retry execution',
  );

  const directFunctionsClients = collectFiles(path.join(repoRoot, 'functions/src'))
    .filter((filePath) => filePath.endsWith('.ts'))
    .filter((filePath) => !filePath.endsWith(path.join('ai', 'keyManager.ts')))
    .filter((filePath) => fs.readFileSync(filePath, 'utf8').includes('new GoogleGenAI'))
    .map((filePath) => path.relative(repoRoot, filePath));
  assert(
    directFunctionsClients.length === 0,
    `Functions provider clients stay behind the shared SAFE_MODE gateway${directFunctionsClients.length ? `: ${directFunctionsClients.join(', ')}` : ''}`,
  );

  const costProtectionReadme = read('__docs__/cost-self-protection/README.md');
  const costProtectionSpec = read('__docs__/cost-self-protection/cost-self-protection_spec.md');
  const costProtectionImpl = read('__docs__/cost-self-protection/cost-self-protection_impl.md');
  const costProtectionFirebase = read('__docs__/cost-self-protection/cost-self-protection_firebase.md');
  const incidentResponseRunbook = read('__docs__/production-readiness/incident-response-runbook.md');
  const externalCertificationRunbook = read('__docs__/production-readiness/external-certification-runbook.md');
  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  [
    [costProtectionReadme, 'shared MenuList Functions gateway'],
    [costProtectionReadme, 'AI_PROVIDER_SAFE_MODE_ACTIVE'],
    [costProtectionSpec, 'SAFE_MODE is not a global write lock'],
    [costProtectionImpl, 'checks cached Functions SAFE_MODE before provider key selection'],
    [costProtectionFirebase, 'always consults the cached Functions SAFE_MODE helper before provider access'],
    [incidentResponseRunbook, 'all Gemini calls through the shared MenuList Functions AI gateway'],
    [externalCertificationRunbook, 'shared Functions AI-gateway SAFE_MODE guard'],
    [externalCertificationRunbook, 'functions:startGeneration,functions:processMenuImagesJob,functions:embedArticleWorker,functions:regenerateEmbedding,functions:mapsPlaceCheck,functions:menulistMaintenanceScheduler,functions:triggerSchedulerManually,functions:triggerWeeklyNarrativeManually,functions:triggerCustomerAnalyticsManually,functions:computeDecisionBlocksScores,functions:triggerDecisionBlocksScoring,functions:triggerStoreNightlyScheduler,functions:messagingOnboarding'],
    [externalCertificationRunbook, 'Gateway-subset blocker recorded July 11, 2026'],
    [productionReadinessAudit, 'Cloud Functions AI-gateway SAFE_MODE coverage checkpoint'],
    [productionReadinessAudit, 'AI_PROVIDER_SAFE_MODE_ACTIVE'],
    [productionReadinessAudit, 'the final `npm run verify:production-readiness-local` run passes 97/97 checks, including all 93 child root `verify:*` scripts'],
    [changelog, 'MenuList Functions AI SAFE_MODE Gateway Boundary'],
  ].forEach(([source, token]) => {
    assert(source.includes(token), `SAFE_MODE docs include Functions provider boundary token ${token}`);
  });
}

[
  ['frontend Gemini key manager', 'src/lib/google/genAi/keyManager.ts', true],
  ['Functions Gemini key manager', 'functions/src/ai/keyManager.ts', false],
].forEach(([label, route, hasLegacyEnvFallback]) => {
  const source = read(route);
  [
    'AI_PROVIDER_CONFIG_MISSING_CODE',
    'AIProviderConfigMissingError',
    '[KeyManager] No Gemini API key found',
    '[KeyManager] Initialized',
    '[KeyManager] All keys are in cooldown',
    '[KeyManager] Key rate limited',
    'configuredKeyCount',
    'candidateSlotCount',
    'candidateEnvVarCount',
    'keyRotationEnabled',
    'cooldownSeconds',
    'rateLimitHits',
    'hasConfiguredKeys()',
    'throw new AIProviderConfigMissingError()',
  ].forEach((token) => {
    assert(source.includes(token), `${label} includes bounded key-manager diagnostic token ${token}`);
  });
  if (hasLegacyEnvFallback) {
    assert(source.includes('[KeyManager] Legacy Gemini env var configured'), `${label} bounds legacy env-var diagnostics`);
  }
  [
    'Using legacy Gemini env var ${matchedEnvVar}',
    'KEY_ENV_VAR_CANDIDATES.flat().join',
    'Initialized with ${this.keys.length}',
    'Initialized with 1 API key',
    'All ${this.keys.length} keys are in cooldown',
    'Key ${this.currentIndex} rate-limited',
    'No GEMINI_AI_KEY found in environment variables',
    'Create a dummy entry so the system doesn',
    "new GoogleGenAI({ apiKey: '' })",
    'Using key ${shortestCooldownIdx}',
    'hit #${entry.rateLimitHits}',
  ].forEach((token) => {
    assert(!source.includes(token), `${label} must not use raw/interpolated key-manager diagnostic token ${token}`);
  });
});

{
  const providerErrors = read('src/lib/ai/providerErrors.ts');
  [
    'PROVIDER_ERROR_INDICATOR_KEYS',
    'const isProviderErrorIndicatorEntry',
    "key.toLowerCase().includes('message')",
    'const getProviderErrorIndicators',
    'const normalizeRetryAfterSeconds',
    "['details', 'retryDelay']",
    'getUnknownObjectValueAtPath(error, path)',
    "getBoundedErrorNumberAtPath(error, ['status']) === 429",
    "indicators.includes('resource_exhausted')",
  ].forEach((token) => {
    assert(providerErrors.includes(token), `AI provider error helper includes structured provider token ${token}`);
  });
  [
    'error?.message',
    'String(error',
    'retry in',
    'message.match',
    'error: any',
    'quota exceeded',
    'rate limit',
  ].forEach((token) => {
    assert(!providerErrors.includes(token), `AI provider error helper must not parse raw provider text token ${token}`);
  });
}

{
  const operationLog = read('src/lib/ai/operationLog.ts');
  [
    'AI_OPERATION_LOG_MODE',
    'responseTextPresent',
    'responseTextLength',
    'usageMetadata',
    'summarizeClientResponseForOperation',
    'projectAiOperationClientResponseSummary',
    'AI_OPERATION_RESPONSE_SUMMARY_SCHEMAS',
    'responseSummaryKind',
    'descriptionSummary',
    'translationsCount',
    'generatedImageCount',
    'clientResponse: detailed ? input.clientResponse : summarizeClientResponseForOperation(input.clientResponse, input.action)',
    'geminiResponse: detailed ? serializeGeminiResponse(input.geminiResponse) : null',
  ].forEach((token) => {
    assert(operationLog.includes(token), `AI operation log keeps bounded detailed response token ${token}`);
  });
  assert(!operationLog.includes('clientResponse: input.clientResponse'), 'AI operation log must not always store raw client responses');
  assert(!operationLog.includes('clientResponse: input.clientResponse ||'), 'AI operation log must not fallback to raw client responses');
  assert(!operationLog.includes('return omitUndefined(response)'), 'AI operation log must not clone marker-only response summaries');
  assert(!operationLog.includes('if (typeof response === "string") return response'), 'AI operation log must not store raw string provider responses');
  assert(!operationLog.includes('response.text.slice'), 'AI operation log must not store raw provider response text slices');
  assert(!operationLog.includes('text: typeof response.text'), 'AI operation log must not serialize raw provider text');
  const buildOperationLogStart = operationLog.indexOf('export function buildAiOperationLog');
  const buildOperationLogEnd = operationLog.indexOf('export function normalizeAiOperationDocumentId', buildOperationLogStart);
  const buildOperationLog = operationLog.slice(buildOperationLogStart, buildOperationLogEnd);
  assert(buildOperationLogStart >= 0 && buildOperationLogEnd > buildOperationLogStart, 'AI operation log projector block is detectable');
  assert(!buildOperationLog.includes('...input'), 'AI operation log must not spread arbitrary top-level input fields into persistence');
  assert(operationLog.includes('createdOn: now'), 'AI operation documents use server-owned creation time');
  assert(!operationLog.includes('createdOn: input.createdOn'), 'AI operation documents must not accept caller-owned creation time');
  assert(operationLog.includes('requireAiOperationBillingMode'), 'AI operation documents validate billing mode');
  assert(operationLog.includes('requireAiOperationTokenCountSource'), 'AI operation documents validate token-count source');
}

{
  const answerTestServer = read('src/lib/answerlattice/answerTestServer.ts');
  assert(answerTestServer.includes('providerOperationCount: resolved.aiProviderOperations?.length || 0'), 'Answerlattice answer-test accounting stores only provider-operation count');
  assert(!answerTestServer.includes('providerOperations: resolved.aiProviderOperations'), 'Answerlattice answer-test accounting must not persist provider-operation arrays');
}

{
  const operationPresentation = read('src/lib/ai/operationPresentation.ts');
  [
    'countFromSummary',
    'getAiOperationHistoryJsonObject(operation.clientResponse)',
    'descriptionSummary?.descriptionCount',
    'response?.translationsCount',
    'clientResponse?.generatedImageCount',
    'clientResponse?.arrayCount',
  ].forEach((token) => {
    assert(operationPresentation.includes(token), `AI operation presentation reads compact response summary token ${token}`);
  });
}

{
  const riskTracker = read('__docs__/production-readiness/infrastructure-risk-tracker.md');
  const aiSystemFirebase = read('__docs__/ai-system-layer/ai-system-layer_firebase.md');
  const aiSystemReadme = read('__docs__/ai-system-layer/README.md');
  const aiSystemSpec = read('__docs__/ai-system-layer/ai-system-layer_spec.md');
  const aiSystemImpl = read('__docs__/ai-system-layer/ai-system-layer_impl.md');
  const aiSystemMarketing = read('__docs__/ai-system-layer/ai-system-layer_marketing.md');
  const aiSystemHelp = read('__docs__/ai-system-layer/ai-system-layer_helpdoc.md');
  const aiSystemMobile = read('__docs__/ai-system-layer/ai-system-layer_mobile-support.md');
  const aiSystemWebsite = read('__docs__/ai-system-layer/ai-system-layer_website.md');
  const extractionMonitoringReadme = read('__docs__/ai-extraction-monitoring/README.md');
  const extractionMonitoringFirebase = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_firebase.md');
  const extractionMonitoringHelp = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_helpdoc.md');
  const extractionMonitoringImpl = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_impl.md');
  const extractionMonitoringMarketing = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_marketing.md');
  const extractionMonitoringMobile = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_mobile-support.md');
  const extractionMonitoringReleaseValidation = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_release-validation.md');
  const extractionMonitoringSpec = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_spec.md');
  const extractionMonitoringWebsite = read('__docs__/ai-extraction-monitoring/ai-extraction-monitoring_website.md');
  const aiEnhancementPacksFirebase = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_firebase.md');
  const aiDataExtractionFirebase = read('__docs__/projects/ai-data-extraction/ai-data-extraction_firebase.md');
  const extractionCostAudit = read('__docs__/projects/ai-data-extraction/firebase-cost-scalability-audit.md');
  const aiImageReadme = read('__docs__/projects/ai-image-generation/README.md');
  const aiImageImpl = read('__docs__/projects/ai-image-generation/ai-image-generation_impl.md');
  const aiImageFirebase = read('__docs__/projects/ai-image-generation/ai-image-generation_firebase.md');
  const aiImageVerification = read('__docs__/projects/ai-image-generation/ai-image-generation_verification.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');

  const aiSystemDocs = {
    readme: aiSystemReadme,
    spec: aiSystemSpec,
    implementation: aiSystemImpl,
    firebase: aiSystemFirebase,
    help: aiSystemHelp,
    marketing: aiSystemMarketing,
    mobile: aiSystemMobile,
    website: aiSystemWebsite,
  };
  Object.entries(aiSystemDocs).forEach(([label, content]) => {
    const top = content.slice(0, 4000);
    [
      'Launch boundary:** Not current launch certification or deploy approval',
      'source-gated AI System Layer evidence only',
      'active production-readiness audit',
      'External Certification Runbook evidence',
      '`npm run verify:production-readiness-local`',
      '`npm run verify:ai-accounting`',
      '`npm run verify:functions-deploy-preflight`',
      '`npm run verify:menu-extraction-pipeline`',
      'scoped Firebase deploy evidence for affected MenuList Functions',
      'target Vercel deploy evidence for affected app routes',
      'provider smoke with target-specific key/model/quota configuration',
      'SAFE_MODE/rate-limit/accounting/provider-health smoke',
      'authenticated browser/device QA for affected owner/platform surfaces',
      'production-host smoke',
      'Answerlattice retains separate doctrine, credentials, Firebase target, billing/cost evidence, deploy approval, and release certification',
      'this document cannot authorize an Answerlattice deploy or release',
    ].forEach((token) => {
      assert(top.includes(token), `AI System Layer ${label} doc includes top release/product boundary token ${token}`);
    });
  });

  [aiSystemReadme, aiSystemSpec, aiSystemImpl].forEach((content) => {
    assert(!content.includes('PRODUCTION HARDENING ACTIVE'), 'AI System core docs must not retain production-hardening status as release approval');
  });
  assert(aiSystemReadme.includes('Shared pool of 1-3 GoogleGenAI clients'), 'AI System README documents the current shared MenuList key count');
  assert(aiSystemReadme.includes('Sticky current-key selection with health tracking'), 'AI System README documents sticky key selection');
  assert(aiSystemReadme.includes('One paid MENULIST_GEMINI_TEXT_AI_KEY; no shared-pool fallback'), 'AI System README documents the isolated extraction key');
  assert(!aiSystemReadme.includes('Pool of 1-4 GoogleGenAI clients'), 'AI System README must not restore the retired four-key shared pool');
  assert(!aiSystemReadme.includes('Round-robin with health tracking'), 'AI System README must not misstate sticky selection as round-robin');
  assert(aiSystemSpec.includes('Shared API key failover pool (1-3 keys) plus one dedicated paid menu-extraction credential'), 'AI System spec documents shared and extraction credential roles');
  assert(!aiSystemSpec.includes('multi-key pool (1-4 keys'), 'AI System spec must not restore the retired four-key shared pool');
  assert(aiSystemImpl.includes('Shared pool of 1-3 GoogleGenAI clients'), 'AI System implementation documents the current shared MenuList key count');
  assert(aiSystemImpl.includes('One paid extraction-only client'), 'AI System implementation documents the isolated extraction client');
  assert(!aiSystemImpl.includes('Pool of 1-4 GoogleGenAI clients'), 'AI System implementation must not restore the retired four-key shared pool');
  [
    'Faster menu processing',
    'More reliable extraction',
    'Consistent quality',
    'This system runs reliably in the background',
    'Your menu will complete processing',
    'Contact us via WhatsApp or email',
  ].forEach((token) => {
    assert(!aiSystemHelp.includes(token), `AI System help doc must not retain provider guarantee ${token}`);
  });
  [
    'Provider capacity or configuration can delay or stop processing',
    'Do not assume an unfinished job will always complete.',
    'Email support@menulist.ai',
  ].forEach((token) => {
    assert(aiSystemHelp.includes(token), `AI System help doc includes bounded provider guidance ${token}`);
  });
  [
    'Every AI feature now has the same protection',
    'see exactly what AI costs per feature',
    '10 lines of code instead of 100',
    'Single SDK, single entry point',
    'Zero overhead on extraction',
    'Append-only usage log with 90-day TTL',
  ].forEach((token) => {
    assert(!aiSystemMarketing.includes(token), `AI System marketing doc must not retain universal runtime claim ${token}`);
  });
  [
    'It does not create one universal queue, limiter, circuit breaker, or usage ledger for every AI call.',
    'No universal `aiUsageLog` collection exists',
    '`MENULIST_AI_OPERATIONS`',
    '`menulistAiOperations/{tId}/{sId}`',
  ].forEach((token) => {
    assert(aiSystemMarketing.includes(token), `AI System marketing doc includes current runtime boundary ${token}`);
  });
  assert(!aiSystemWebsite.includes('reliable pipeline with automatic error recovery'), 'AI System website doc must not guarantee provider reliability');
  assert(
    aiSystemWebsite.includes('If processing cannot complete, MenuList keeps the current approved menu unchanged and shows the available retry path.'),
    'AI System website doc includes bounded provider failure path',
  );
  assert(productionAudit.includes('AI System Layer active-doc release-boundary checkpoint'), 'Production audit records AI System active-doc release boundary');
  assert(changelog.includes('AI System Layer Active Docs Release Boundary'), 'Changelog records AI System active-doc release boundary');

  const extractionMonitoringDocs = {
    readme: extractionMonitoringReadme,
    firebase: extractionMonitoringFirebase,
    help: extractionMonitoringHelp,
    implementation: extractionMonitoringImpl,
    marketing: extractionMonitoringMarketing,
    mobile: extractionMonitoringMobile,
    releaseValidation: extractionMonitoringReleaseValidation,
    spec: extractionMonitoringSpec,
    website: extractionMonitoringWebsite,
  };
  Object.entries(extractionMonitoringDocs).forEach(([label, content]) => {
    const top = content.slice(0, 5000);
    [
      'Launch boundary:** Not current launch certification or deploy approval',
      'source-gated AI Extraction Monitoring evidence only',
      '`ENABLE_EXTRACTION_MONITORING_DASHBOARD=true`',
      '`/ops/extraction`',
      '`/platform/extraction-monitor`',
      '`MobileExtractionMonitorScreen` inside `MobileShell`',
      'Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins',
      'ordinary authenticated users retain own-job reads only',
      'active production-readiness audit',
      'External Certification Runbook evidence',
      '`npm run verify:ai-accounting`',
      '`npm run verify:menu-extraction-pipeline`',
      '`npm run verify:mobile-shell-route-map`',
      'authenticated platform desktop/mobile browser QA',
      'bounded read/cost and desktop retry smoke',
      'production-host smoke',
    ].forEach((token) => {
      assert(top.includes(token), `AI extraction monitoring ${label} doc includes top source/release boundary token ${token}`);
    });
    assert(!content.includes('Feature flag OFF'), `AI extraction monitoring ${label} doc must not retain flag-off wording`);
    assert(!content.includes('ENABLE_EXTRACTION_MONITORING_DASHBOARD: false'), `AI extraction monitoring ${label} doc must not claim a disabled source flag`);
  });

  const extractionFeatureFlags = read('src/config/features.ts');
  const extractionDesktopMonitor = read('src/components/templates/main-app/platform/extractionMonitor/index.tsx');
  const extractionMobileMonitor = read('src/components/mobile/screens/MobileExtractionMonitorScreen.tsx');
  const extractionMobileShell = read('src/components/mobile/MobileShell.tsx');
  const extractionMobileMore = read('src/components/mobile/screens/MobileMoreScreen.tsx');
  const extractionFirestoreRules = read('firestore.rules');
  assert(extractionFeatureFlags.includes('ENABLE_EXTRACTION_MONITORING_DASHBOARD: true,'), 'AI extraction monitoring source flag is enabled');
  assert(!extractionFeatureFlags.includes('ENABLE_EXTRACTION_MONITORING_DASHBOARD: false,'), 'AI extraction monitoring source flag is not disabled');
  [
    'dashboardKey = isEnabled && isPlatform',
    'getExtractionDashboardSnapshot({ status: statusFilter, pageSize: 30 })',
    'dedupingInterval: EXTRACTION_MONITOR_DEDUPING_INTERVAL_MS',
    'revalidateOnFocus: false',
    '<JobInspector',
  ].forEach((token) => {
    assert(extractionDesktopMonitor.includes(token), `AI extraction desktop monitor includes current runtime token ${token}`);
  });
  [
    "const isPlatform = platformRole === 'PLATFORM';",
    'if (!isPlatform || !isEnabled) return;',
    'getExtractionDashboardSnapshot({ status: filterToStatus(jobFilter), pageSize: 20 })',
    'Extraction health, cost, quality, and recent job failures.',
  ].forEach((token) => {
    assert(extractionMobileMonitor.includes(token), `AI extraction mobile monitor includes bounded runtime token ${token}`);
  });
  assert(!extractionMobileMonitor.includes('retryExtractionJob'), 'AI extraction mobile summary does not expose retry mutation');
  assert(extractionMobileShell.includes("'/platform/extraction-monitor': 'extractionMonitor'"), 'AI extraction platform route maps into MobileShell');
  assert(extractionMobileShell.includes("'/ops/extraction': 'extractionMonitor'"), 'AI extraction ops route maps into MobileShell');
  assert(extractionMobileMore.includes("subScreen === 'extractionMonitor'"), 'AI extraction mobile sub-screen mounts in MobileMoreScreen');
  [
    'match /MENULIST_AI_OPERATIONS/{docId}',
    'allow read: if isAuthenticated() && isPlatformAdmin();',
    'match /menuImageProcessingJobs/{jobId}',
    'resource.data.uId == request.auth.uid',
    'resource.data.uId == request.auth.token.uId',
    'isMenuProcessingJobScopeMember()',
    'belongsToTenantById(resource.data.tId)',
    'belongsToStoreById(resource.data.sId)',
  ].forEach((token) => {
    assert(extractionFirestoreRules.includes(token), `AI extraction monitoring Firestore boundary includes token ${token}`);
  });
  assert(
    /match \/menuImageProcessingJobs\/\{jobId\}[\s\S]{0,500}isPlatformAdmin\(\)[\s\S]{0,500}isMenuProcessingJobOwner\(\)[\s\S]{0,200}isMenuProcessingJobScopeMember\(\)/.test(extractionFirestoreRules),
    'AI extraction monitoring job reads keep the platform bypass and owner-plus-current-scope boundary',
  );
  [
    'Mobile summary',
    'Mobile does not expose the desktop Job Inspector or retry action.',
    'No separate `aiUsageLog` collection is read by this dashboard',
  ].forEach((token) => {
    assert(extractionMonitoringReadme.includes(token), `AI extraction monitoring README includes current surface token ${token}`);
  });
  ['HCR trend', 'Ops Alerts'].forEach((token) => {
    assert(!extractionMonitoringReadme.includes(token), `AI extraction monitoring README must not claim unmounted surface ${token}`);
  });
  [
    'A platform admin can use the desktop retry action',
    'ordinary authenticated users can read only their own jobs within their current tenant and store',
    'historical `uId` alone does not survive a scope switch',
    'Platform admins can read all jobs for the monitor.',
    '`MENULIST_AI_OPERATIONS`: readable only by platform admins',
    'Firestore rules independently enforce the cross-tenant job and cost-ledger boundary',
  ].forEach((token) => {
    assert(extractionMonitoringFirebase.includes(token), `AI extraction monitoring Firebase doc includes current source/rules token ${token}`);
  });
  [
    'Mobile Relevance Decision: **BOUNDED PLATFORM SUPPORT**',
    '`getExtractionDashboardSnapshot({ status, pageSize: 20 })`',
    'Mobile has no Job Inspector, raw-data copy, or retry action.',
    'no automatic interval',
    'authenticated platform session and a non-platform denial state',
  ].forEach((token) => {
    assert(extractionMonitoringMobile.includes(token), `AI extraction monitoring mobile doc includes current bounded-mobile token ${token}`);
  });
  ['Mobile Relevance Decision: **NO**', 'No mobile UI needed', 'Telegram'].forEach((token) => {
    assert(!extractionMonitoringMobile.includes(token), `AI extraction monitoring mobile doc must not retain stale mobile token ${token}`);
  });
  [
    'Consolidates debugging evidence',
    'Surfaces recorded failures',
    'Enables controlled desktop recovery',
  ].forEach((token) => {
    assert(extractionMonitoringMarketing.includes(token), `AI extraction monitoring marketing doc includes bounded internal claim ${token}`);
  });
  [
    'hours to minutes',
    'prevents silent failures',
    'without re-uploading',
    'under 5 minutes',
  ].forEach((token) => {
    assert(!extractionMonitoringMarketing.toLowerCase().includes(token.toLowerCase()), `AI extraction monitoring marketing doc must not retain unsupported claim ${token}`);
  });
  assert(productionAudit.includes('AI extraction monitoring enabled-runtime and active-doc checkpoint'), 'Production audit records AI extraction monitoring enabled-runtime boundary');
  assert(changelog.includes('AI Extraction Monitoring Enabled Runtime And Active Docs Boundary'), 'Changelog records AI extraction monitoring enabled-runtime boundary');

  [
    'App-route rows store count/shape summaries for `clientResponse` in `accounting_only` mode',
    'compact-not-delete ledger retention',
    'Full compact ledger rows are retained by design for platform audit and owner transaction history',
  ].forEach((token) => {
    assert(riskTracker.includes(token), `CG-1 risk tracker documents app-route clientResponse compaction token ${token}`);
  });
  [
    'app-route operation rows store count/shape summaries for `clientResponse` instead of full generated text, translation maps, image arrays, or support-answer payloads',
    'stores only count/shape metadata for client responses',
  ].forEach((token) => {
    assert(aiSystemFirebase.includes(token), `AI system Firebase doc documents clientResponse compaction token ${token}`);
  });
  [
    ['AI System Layer README', aiSystemReadme],
    ['AI System Layer implementation', aiSystemImpl],
    ['AI System Layer Firebase', aiSystemFirebase],
    ['Production-readiness audit', productionAudit],
    ['Changelog', changelog],
  ].forEach(([label, content]) => {
    assert(content.toLowerCase().includes('text ai operation response summaries'), `${label} documents text AI operation response summaries`);
    [
      'responseSummaryKind',
      'generated owner-facing text objects',
    ].forEach((token) => {
      assert(content.includes(token), `${label} documents text AI operation response summary token ${token}`);
    });
  });
  [
    'Do not reuse the older broad command shape from that attempt.',
    'Current retry evidence must route through `npm run verify:functions-deploy-preflight` and the External Certification Runbook Gate 1 scoped MenuList QA commands.',
    'Any additional Gemini consumer Function beyond the documented Gate 1 or source-file hardening subsets must be listed in the production-readiness audit before deploy retry.',
  ].forEach((token) => {
    assert(aiSystemFirebase.includes(token), `AI system Firebase doc documents scoped Functions retry boundary token ${token}`);
  });
  [
    'firebase deploy --only functions:',
    'triggerWeeklyNarrativeManually',
    'triggerCustomerAnalyticsManually --project menulist-qa',
  ].forEach((token) => {
    assert(!aiSystemFirebase.includes(token), `AI system Firebase doc must not retain stale broad Functions deploy token ${token}`);
  });
  [
    ['AI system README', aiSystemReadme],
    ['AI system spec', aiSystemSpec],
    ['AI system implementation doc', aiSystemImpl],
    ['AI system Firebase doc', aiSystemFirebase],
    ['AI system marketing doc', aiSystemMarketing],
    ['AI system help doc', aiSystemHelp],
    ['AI system mobile doc', aiSystemMobile],
    ['AI system website doc', aiSystemWebsite],
    ['AI extraction monitoring README', extractionMonitoringReadme],
    ['AI extraction monitoring Firebase doc', extractionMonitoringFirebase],
    ['AI extraction monitoring help doc', extractionMonitoringHelp],
    ['AI extraction monitoring implementation doc', extractionMonitoringImpl],
    ['AI extraction monitoring marketing doc', extractionMonitoringMarketing],
    ['AI extraction monitoring mobile doc', extractionMonitoringMobile],
    ['AI extraction monitoring release validation', extractionMonitoringReleaseValidation],
    ['AI extraction monitoring spec', extractionMonitoringSpec],
    ['AI extraction monitoring website doc', extractionMonitoringWebsite],
  ].forEach(([label, doc]) => {
    [
      'Phase 2',
      'Phase 3',
      'PHASE 2',
      'PHASE 3',
      'Still deferred',
      'deferred to Phase',
      'post-launch',
    ].forEach((token) => {
      assert(!doc.includes(token), `${label} must not retain stale roadmap token ${token}`);
    });
  });
  [
    'Current extraction cost rows use `MENULIST_AI_OPERATIONS`',
    'Billable app-route operation rows use `menulistAiOperations/{tId}/{sId}`',
    '`AI_TASK_TYPES` and `AI_GLOBAL_RATE_LIMIT` are not live constants',
    'do not imply a universal tracker',
    'Operation ledgers',
    'Scoped AI route limiters',
  ].forEach((token) => {
    assert(aiSystemImpl.includes(token), `AI system implementation doc documents current source contract token ${token}`);
  });
  [
    'Universal task queue',
    'Not current runtime',
    'Conditional candidate only',
  ].forEach((token) => {
    assert(aiSystemReadme.includes(token), `AI system README documents current AI runtime boundary token ${token}`);
  });
  [
    'Extraction and billable app-route operation ledgers',
    'Conditional Cost Control Candidates',
    'Conditional Knowledge Reuse Candidates',
    'Do not treat them as production savings, launched behavior, or committed runtime scope',
  ].forEach((token) => {
    assert(aiSystemSpec.includes(token), `AI system spec documents current AI runtime boundary token ${token}`);
  });
  [
    'No separate `aiUsageLog` collection is read by this dashboard',
    'Current extraction cost data comes from `MENULIST_AI_OPERATIONS`',
    'billable app-route operations live in `menulistAiOperations/{tId}/{sId}` outside this extraction monitor',
  ].forEach((token) => {
    assert(extractionMonitoringReadme.includes(token), `AI extraction monitoring README documents operation-ledger boundary token ${token}`);
  });
  [
    'no separate `aiUsageLog` collection is read',
    'No separate aiUsageLog collection is read',
    'NOT CURRENT SCOPE',
  ].forEach((token) => {
    assert(
      extractionMonitoringFirebase.includes(token)
        || extractionMonitoringSpec.includes(token)
        || extractionMonitoringImpl.includes(token),
      `AI extraction monitoring docs document operation-ledger boundary token ${token}`,
    );
  });
  [
    '`aiUsageLog` (Phase',
    '`aiUsageLog` collection                | —',
    'AI usage log        | `aiUsageLog`',
    'aiUsageLog (cross-feature costs',
    '📝 P2',
  ].forEach((token) => {
    assert(!aiSystemImpl.includes(token), `AI system implementation doc must not retain stale aiUsageLog token ${token}`);
    assert(!extractionMonitoringReadme.includes(token), `AI extraction monitoring README must not retain stale aiUsageLog token ${token}`);
    assert(!extractionMonitoringFirebase.includes(token), `AI extraction monitoring Firebase doc must not retain stale aiUsageLog token ${token}`);
    assert(!extractionMonitoringSpec.includes(token), `AI extraction monitoring spec must not retain stale aiUsageLog token ${token}`);
  });
  [
    'accounting_only stores exact allowlisted or generic count/shape summaries',
    'detailed mode stores bounded metadata, not raw provider text',
  ].forEach((token) => {
    assert(aiEnhancementPacksFirebase.includes(token), `AI enhancement packs Firebase doc documents compact operation row token ${token}`);
  });
  [
    'Compact accounting/audit row by default',
    '`AI_OPERATION_LOG_MODE="accounting_only"` avoids raw provider response storage',
    '`MENULIST_AI_OPERATIONS` compact ledger retention',
  ].forEach((token) => {
    assert(aiDataExtractionFirebase.includes(token), `AI extraction Firebase doc documents compact operation row token ${token}`);
  });
  [
    'compact-not-delete retention',
    'Accounting-only rows retain cost/token fields, response counts, message presence/length, and summarized file metadata',
    'Compact Ledger Retention',
    'Do not delete compact ledger rows unless accounting, owner transaction history, and platform audit retention are redesigned',
  ].forEach((token) => {
    assert(extractionCostAudit.includes(token), `AI extraction cost audit documents compact operation retention token ${token}`);
  });
  [
    'no TTL/cleanup',
    'grows unbounded at 1 doc per extraction forever',
    'Documents contain full `clientResponse`',
    'No TTL — 120GB/year',
  ].forEach((token) => {
    assert(!aiDataExtractionFirebase.includes(token), `AI extraction Firebase doc must not retain stale no-cleanup token ${token}`);
    assert(!extractionCostAudit.includes(token), `AI extraction cost audit must not retain stale no-cleanup token ${token}`);
  });
  assert(
    productionAudit.includes('App-route AI operation rows also compact `clientResponse` into count/shape summaries in `accounting_only` mode'),
    'production readiness audit documents app-route AI operation clientResponse compaction',
  );
  assert(
    productionAudit.includes('compact-not-delete retention: accounting/audit rows remain for platform cost review and owner transaction history'),
    'production readiness audit documents compact-not-delete AI operation ledger retention',
  );
  assert(
    productionAudit.includes('AI image-generation verification boundary checkpoint'),
    'production readiness audit documents AI image-generation verification launch boundary',
  );
  assert(
    productionAudit.includes('full certification remains gated by provider smoke, browser/device QA'),
    'production readiness audit documents AI image-generation external certification gates',
  );
  [
    ['AI Image README', aiImageReadme],
    ['AI Image implementation', aiImageImpl],
    ['AI Image Firebase', aiImageFirebase],
    ['Production-readiness audit', productionAudit],
    ['Changelog', changelog],
	  ].forEach(([label, content]) => {
	    [
	      'bounded local',
	      'request, response, and transaction summaries',
	      'full transaction objects',
	      'debug breadcrumbs',
	    ].forEach((token) => {
	      assert(content.includes(token), `${label} documents AI image local route-log summary token ${token}`);
	    });
	  });
  [
    'Code-side hardening is complete for the reviewed scope',
    'controlled-owner-testing ready',
    'This is not current MenuList launch certification',
    'External Certification Runbook',
    'provider smoke, browser/device QA',
    'Firebase scheduler deployment for retention cleanup',
  ].forEach((token) => {
    assert(aiImageVerification.includes(token), `AI image verification report keeps current launch boundary token ${token}`);
  });
  [
    'Feature is **production-ready**',
    'Feature is production-ready with fixes applied',
  ].forEach((token) => {
    assert(!aiImageVerification.includes(token), `AI image verification report must not retain stale production-ready claim ${token}`);
  });
}

{
  const processMenuImages = read('functions/src/logic/processMenuImages.ts');
  [
    'messagePresent: message.length > 0',
    'messageLength: message.length',
    'dataSummary',
    'clientResponse: detailed',
  ].forEach((token) => {
    assert(processMenuImages.includes(token), `Cloud Function extraction operation compaction keeps bounded response metadata token ${token}`);
  });
  assert(!processMenuImages.includes("message: typeof response?.message === 'string' ? response.message.slice"), 'Cloud Function extraction operation compaction must not store raw response message slices');
  assert(!processMenuImages.includes('response.message.slice'), 'Cloud Function extraction operation compaction must not retain response message previews');
}

{
  const diagnostics = read('src/lib/google/genAi/diagnostics.ts');
	  [
	    'getSafeDiagnosticValue',
	    'getStatusCode',
	    'getAIRouteLogContext',
	    'logAIRouteFailure',
	    'getBoundedRuntimeStringContext',
	    'nestedDetailCount',
	    'hasMessage',
	    'hasNestedMessage',
	    'hasStack',
	    'hasReferenceImage',
	    'imageCount',
	    'pageCount',
	    'promptLength',
	    'responseTextSummary',
      'storeName',
	    'gatewayTotalKeys',
	    '[response_text_present:length=',
	  ].forEach((token) => {
	    assert(diagnostics.includes(token), `AI error diagnostics helper includes bounded token ${token}`);
	  });
  assert(!diagnostics.includes('message: resolved instanceof Error'), 'AI error diagnostics helper must not return raw provider messages');
  assert(!diagnostics.includes('String(error ||'), 'AI error diagnostics helper must not stringify raw thrown values');
  assert(!diagnostics.includes('nestedDetails'), 'AI error diagnostics helper must not return raw nested provider details');
  assert(!diagnostics.includes('nestedMessage'), 'AI error diagnostics helper must not return raw nested provider messages');
  assert(!diagnostics.includes('stackPreview'), 'AI error diagnostics helper must not return raw stack previews');
  assert(!diagnostics.includes('rawTextLength'), 'AI route diagnostics helper must not expose raw text field names');
  assert(!diagnostics.includes("return String(value || '').slice"), 'AI response preview helper must not return raw response text');

  const campaignCaptionRoute = read('src/app/api/campaigns/caption/route.ts');
  const campaignCaptionOutput = read('src/lib/ai/campaignCaptionOutput.ts');
  const campaignCaptionPrompt = read('src/services/gemini/prompts/v1/campaignCaption.prompt.ts');
  const campaignCaptionTransactionStart = campaignCaptionRoute.indexOf('const transactionObject: any = {');
  const campaignCaptionTransactionEnd = campaignCaptionRoute.indexOf('let remainingBalance', campaignCaptionTransactionStart);
  const campaignCaptionTransactionInput = campaignCaptionRoute.slice(campaignCaptionTransactionStart, campaignCaptionTransactionEnd);
  [
    'campaign_caption_provider_response_parse_failed',
    'MAX_CAMPAIGN_CAPTION_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS',
    'reportedCampaignCaptionProviderResponseParseFailures',
    "fallbackPolicy: 'return_caption_generation_failed'",
    "stage: 'object_fragment'",
    "stage: 'object_fragment_missing'",
    "stage: 'empty_response'",
    'parseCampaignCaptionProviderResponse(response.text',
    'campaign_caption_non_object_response',
    'getCampaignCaptionResponseSummary',
    'normalizeCampaignCaptionGenerationResult(providerData)',
    'clientResponse: getCampaignCaptionResponseSummary(generatedData)',
    'promptSummary',
  ].forEach((token) => {
    assert(campaignCaptionRoute.includes(token), `campaign caption route includes provider-response boundary token ${token}`);
  });
  ['caption: string', 'hashtags: string[]', 'shortCaption: string', ').slice(0, 5)'].forEach((token) => {
    assert(campaignCaptionOutput.includes(token), `campaign caption output boundary includes ${token}`);
  });
  assert(campaignCaptionRoute.includes('const generatedData = {'), 'campaign caption route returns a normalized exact provider DTO');
  assert(!campaignCaptionRoute.includes('let generatedData: any'), 'campaign caption route does not trust an untyped provider DTO');
  const reviewSuggestRoute = read('src/app/api/reviews/suggest/route.ts');
  assert(reviewSuggestRoute.includes('failClosedOnProviderError: true'), 'review suggestion paid-provider admission fails closed when the limiter is unavailable');
  assert(reviewSuggestRoute.includes("rateLimitResult.reason === 'provider_unavailable'"), 'review suggestion distinguishes limiter outage from quota exhaustion');
  assert(reviewSuggestRoute.includes('status: providerUnavailable ? 503 : 429'), 'review suggestion returns retryable unavailable status for limiter outages');
  assert(campaignCaptionRoute.includes('responseTextLength'), 'campaign caption parse diagnostics keep response length metadata');
  assert(campaignCaptionRoute.includes('responseTextPresent: Boolean(response.text)'), 'campaign caption parse diagnostics keep response presence metadata');
  assert(!campaignCaptionRoute.includes('JSON.parse(response.text)'), 'campaign caption route must parse provider responses through bounded parser');
  assert(!campaignCaptionRoute.includes('responseTextSummary: getPreviewText'), 'campaign caption parse diagnostics must not log provider response preview summaries');
  assert(!campaignCaptionRoute.includes('rawResponse: response.text?.substring'), 'campaign caption parse diagnostics must not log raw provider responses');
  assert(!campaignCaptionRoute.includes('rawTextLength'), 'campaign caption parse diagnostics must not use raw response text field names');
  assert(!campaignCaptionRoute.includes('rawTextPreview: getPreviewText'), 'campaign caption parse diagnostics must not label bounded response diagnostics as raw previews');
  assert(campaignCaptionTransactionStart >= 0 && campaignCaptionTransactionEnd > campaignCaptionTransactionStart, 'campaign caption transaction input block is detectable');
  assert(!campaignCaptionTransactionInput.includes('businessName'), 'campaign caption transaction input must not persist raw business names');
  assert(!campaignCaptionTransactionInput.includes('categoryName'), 'campaign caption transaction input must not persist raw category names');
  assert(!campaignCaptionTransactionInput.includes('itemDescription'), 'campaign caption transaction input must not persist raw item descriptions');
  assert(!campaignCaptionTransactionInput.includes('itemName'), 'campaign caption transaction input must not persist raw item names');
  assert(!campaignCaptionTransactionInput.includes('itemPrice'), 'campaign caption transaction input must not persist raw item prices');
  assert(!campaignCaptionTransactionInput.includes('language,'), 'campaign caption transaction input must not persist raw prompt language');
  assert(!campaignCaptionTransactionInput.includes('clientResponse: generatedData'), 'campaign caption transaction input must not persist generated captions');
  ['captionLength', 'shortCaptionLength', 'hashtagCount', 'hasCallToAction'].forEach((token) => {
    assert(campaignCaptionRoute.includes(token), `campaign caption route keeps response summary token ${token}`);
  });
  assert(campaignCaptionPrompt.includes('function sanitizePromptText('), 'campaign caption prompt includes prompt input sanitizer');
  assert(campaignCaptionPrompt.includes("sanitizePromptText(itemDescription, 'Not provided', 500)"), 'campaign caption prompt bounds item description interpolation');
  assert(campaignCaptionPrompt.includes('getSafeCampaignType(campaignType)'), 'campaign caption prompt clamps campaign type to known context');
  assert(campaignCaptionPrompt.includes('getSafeSurface(surface)'), 'campaign caption prompt clamps surface to known guidelines');
  assert(campaignCaptionPrompt.includes('Object.prototype.hasOwnProperty.call(campaignContext, value)'), 'campaign caption prompt validates campaign context lookup');
  assert(campaignCaptionPrompt.includes('Object.prototype.hasOwnProperty.call(surfaceGuidelines, value)'), 'campaign caption prompt validates surface guideline lookup');
  assert(!campaignCaptionPrompt.includes('- Name: ${itemName}'), 'campaign caption prompt must not interpolate raw item name');
  assert(!campaignCaptionPrompt.includes("- Description: ${itemDescription || 'Not provided'}"), 'campaign caption prompt must not interpolate raw item description');
  assert(!campaignCaptionPrompt.includes('- Campaign Type: ${campaignType}'), 'campaign caption prompt must not interpolate raw campaign type');
  assert(!campaignCaptionPrompt.includes('- Surface: ${surface}'), 'campaign caption prompt must not interpolate raw surface');
  assert(!campaignCaptionPrompt.includes('- Language: ${language}'), 'campaign caption prompt must not interpolate raw language');

  [
    ['src/app/api/business-copy/route.ts', 'Business copy generation requested'],
    ['src/app/api/descriptions/route.ts', 'Description generation requested'],
    ['src/app/api/new-item-metadata/route.ts', 'New item metadata requested'],
    ['src/app/api/seo/route.ts', 'SEO generation requested'],
    ['src/app/api/translations/route.ts', 'Translation requested'],
  ].forEach(([route, message]) => {
    const source = read(route);
    assert(source.includes(`logger.info('${message}', getAIRouteLogContext({`), `${route} bounds normal request diagnostics`);
    assert(!source.includes(`logger.info('${message}', {`), `${route} must not log raw normal request context`);
  });

  const aiRouteSecurityBoundedRoutes = [
    'src/app/api/business-copy/route.ts',
    'src/app/api/campaigns/caption/route.ts',
    'src/app/api/descriptions/route.ts',
    'src/app/api/image-editing/route.ts',
    'src/app/api/image-generation/batch-trigger/route.ts',
    'src/app/api/image-generation/route.ts',
    'src/app/api/menu-card-export/design-advisor/route.ts',
    'src/app/api/new-item-metadata/route.ts',
    'src/app/api/reviews/suggest/route.ts',
    'src/app/api/seo/route.ts',
    'src/app/api/translations/route.ts',
  ];
  aiRouteSecurityBoundedRoutes.forEach((route) => {
    const source = read(route);
    assert(source.includes('getAIRouteSecurityContext(session, request)'), `${route} uses bounded AI route security context`);
    assert(!source.includes('buildSecurityContext'), `${route} must not spread raw security context into owner AI security logs`);
  });
  [
    'src/app/api/descriptions/route.ts',
    'src/app/api/translations/route.ts',
  ].forEach((route) => {
    const source = read(route);
    assert(!source.includes('attemptedProjectId'), `${route} must not log raw attempted project IDs in security events`);
    assert(!source.includes('\n                projectId,\n                reason: outletPolicyBlockReason,'), `${route} must not log raw project IDs in outlet policy security events`);
  });
  assert(!read('src/app/api/new-item-metadata/route.ts').includes('substring(0, 50)'), 'new item metadata validation security logs must not include raw item text previews');

  {
    const route = 'src/app/api/new-item-metadata/route.ts';
    const source = read(route);
    assert(source.includes('new_item_metadata_provider_response_parse_failed'), `${route} logs provider response parse failures with a stable code`);
    assert(source.includes('MAX_NEW_ITEM_METADATA_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS'), `${route} caps provider response parse diagnostics`);
    assert(source.includes('reportedNewItemMetadataProviderResponseParseFailures'), `${route} deduplicates provider response parse diagnostics`);
    assert(source.includes("fallbackPolicy: 'return_metadata_generation_failed'"), `${route} uses fixed metadata parse fallback policy`);
    assert(source.includes("stage: 'object_fragment'"), `${route} logs malformed object-fragment parse stage`);
    assert(source.includes("stage: 'object_fragment_missing'"), `${route} logs missing object-fragment parse stage`);
    assert(source.includes("stage: 'empty_response'"), `${route} logs empty provider response parse stage`);
    assert(source.includes('parseNewItemMetadataProviderResponse(response.text'), `${route} parses provider response through bounded parser`);
    assert(source.includes('responseTextPresent: Boolean(response.text)'), `${route} logs provider response presence metadata only for API_RESPONSE`);
    assert(source.includes('responseTextLength: response.text?.length || 0'), `${route} keeps bounded response text length metadata`);
    assert(source.includes('itemSummary'), `${route} stores bounded item summaries in AI accounting input`);
    assert(source.includes('languageSummary'), `${route} stores bounded language summaries in AI accounting input`);
    assert(source.includes('getNewItemMetadataClientResponseSummary'), `${route} stores generated metadata response summaries in AI accounting input`);
    assert(source.includes('normalizeNewItemMetadataOutput'), `${route} projects provider output onto the exact new-item metadata contract`);
    assert(source.includes('getLinkedOutletPolicyBlockReason'), `${route} verifies project scope and linked-outlet ownership before provider work`);
    assert(source.includes("responseSummaryKind: 'new_item_metadata'"), `${route} labels generated metadata response summaries`);
    assert(!source.includes("logType: 'API_RESPONSE', data: response"), `${route} must not hand full provider response objects to local API_RESPONSE logs`);
    assert(!source.includes('clientResponse: generatedData'), `${route} must not persist generated metadata in transaction input`);
    assert(!source.includes('responseTextSummary: getPreviewText'), `${route} must not log provider response preview summaries`);
    assert(!source.includes('rawTextLength'), `${route} must not use raw response text field names`);
    assert(!source.includes('rawTextPreview: getPreviewText'), `${route} must not label bounded response diagnostics as raw previews`);
    assert(!source.includes('\n            item,\n            targetLang,\n            sourceLang,'), `${route} must not persist raw prompt item/language payloads in transaction input`);
    assert(!source.includes('request: { item, targetLang, sourceLang, contentLength }'), `${route} must not write raw request payloads to local success logs`);
    assert(!source.includes('response: generatedData'), `${route} must not write full generated metadata to local success logs`);
    assert(!source.includes('transaction: transactionObject'), `${route} must not write full transaction object to local success logs`);
    assert(!source.includes('data: transactionObject'), `${route} must not write full transaction object to local error logs`);
  }
  {
    const route = 'src/app/api/campaigns/caption/route.ts';
    const source = read(route);
    const transactionStart = source.indexOf('const transactionObject: any = {');
    const transactionEnd = source.indexOf('let remainingBalance', transactionStart);
    const transactionInput = source.slice(transactionStart, transactionEnd);
    assert(source.includes('campaign_caption_provider_response_parse_failed'), `${route} logs provider response parse failures with a stable code`);
    assert(source.includes('MAX_CAMPAIGN_CAPTION_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS'), `${route} caps provider response parse diagnostics`);
    assert(source.includes('reportedCampaignCaptionProviderResponseParseFailures'), `${route} deduplicates provider response parse diagnostics`);
    assert(source.includes("fallbackPolicy: 'return_caption_generation_failed'"), `${route} uses fixed campaign-caption parse fallback policy`);
    assert(source.includes("stage: 'object_fragment'"), `${route} logs malformed object-fragment parse stage`);
    assert(source.includes("stage: 'object_fragment_missing'"), `${route} logs missing object-fragment parse stage`);
    assert(source.includes("stage: 'empty_response'"), `${route} logs empty provider response parse stage`);
    assert(source.includes('parseCampaignCaptionProviderResponse(response.text'), `${route} parses provider response through bounded parser`);
    assert(source.includes('responseTextLength: response.text?.length || 0'), `${route} keeps bounded response text length metadata`);
    assert(source.includes('campaign_caption_non_object_response'), `${route} fail-closes non-object provider responses`);
    assert(source.includes('promptSummary'), `${route} stores bounded prompt summaries in AI accounting input`);
    assert(source.includes("responseSummaryKind: 'campaign_caption'"), `${route} labels generated caption response summaries`);
    assert(!source.includes('JSON.parse(response.text)'), `${route} must not parse provider response directly`);
    assert(!source.includes('responseTextSummary: getPreviewText'), `${route} must not log provider response preview summaries`);
    assert(!source.includes('rawTextLength'), `${route} must not use raw response text field names`);
    assert(!source.includes('rawTextPreview: getPreviewText'), `${route} must not label bounded response diagnostics as raw previews`);
    assert(transactionStart >= 0 && transactionEnd > transactionStart, `${route} transaction input block is detectable`);
    assert(!transactionInput.includes('businessName'), `${route} must not persist raw business names in transaction input`);
    assert(!transactionInput.includes('categoryName'), `${route} must not persist raw category names in transaction input`);
    assert(!transactionInput.includes('itemDescription'), `${route} must not persist raw item descriptions in transaction input`);
    assert(!transactionInput.includes('itemName'), `${route} must not persist raw item names in transaction input`);
    assert(!transactionInput.includes('itemPrice'), `${route} must not persist raw item prices in transaction input`);
    assert(!transactionInput.includes('language,'), `${route} must not persist raw prompt language in transaction input`);
  }
  {
    const route = 'src/app/api/descriptions/route.ts';
    const source = read(route);
    const transactionStart = source.indexOf('let transactionObject = {');
    const transactionEnd = source.indexOf('let remainingBalance', transactionStart);
    const transactionInput = source.slice(transactionStart, transactionEnd);
    assert(source.includes('description_provider_response_parse_failed'), `${route} logs provider response parse failures with a stable code`);
    assert(source.includes('MAX_DESCRIPTION_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS'), `${route} caps provider response parse diagnostics`);
    assert(source.includes('reportedDescriptionProviderResponseParseFailures'), `${route} deduplicates provider response parse diagnostics`);
    assert(source.includes("fallbackPolicy: 'return_description_generation_failed'"), `${route} uses fixed description parse fallback policy`);
    assert(source.includes("stage: 'object_fragment'"), `${route} logs malformed object-fragment parse stage`);
    assert(source.includes("stage: 'object_fragment_missing'"), `${route} logs missing object-fragment parse stage`);
    assert(source.includes("stage: 'empty_response'"), `${route} logs empty provider response parse stage`);
    assert(source.includes('responseTextPresent: Boolean(response.text)'), `${route} logs provider response presence metadata only for API_RESPONSE`);
    assert(source.includes('responseTextLength: response.text?.length || 0'), `${route} keeps bounded response text length metadata`);
    assert(source.includes('itemSummary'), `${route} stores bounded item summaries in AI accounting input`);
    assert(source.includes('languageSummary'), `${route} stores bounded language summaries in AI accounting input`);
    assert(source.includes('getDescriptionClientResponseSummary'), `${route} stores generated description response summaries in AI accounting input`);
    assert(source.includes('normalizeDescriptionGenerationResult'), `${route} projects provider output to requested item and language IDs`);
    assert(source.includes('resolveDescriptionBillingAction'), `${route} derives free add versus paid rewrite accounting from validated content`);
    assert(source.includes("responseSummaryKind: 'description_generation'"), `${route} labels generated description response summaries`);
    assert(source.includes('getTransactionLogSummary'), `${route} local transaction logs use bounded summaries`);
    assert(source.includes('requestSummary'), `${route} local success logs use request summaries`);
    assert(source.includes('responseSummary'), `${route} local success logs use response summaries`);
    assert(transactionStart >= 0 && transactionEnd > transactionStart, `${route} transaction input block is detectable`);
    assert(!transactionInput.includes('\n            itemsList,'), `${route} must not persist raw item lists in transaction input`);
    assert(!transactionInput.includes('\n            targetLang,'), `${route} must not persist raw target language payloads in transaction input`);
    assert(!transactionInput.includes('\n            sourceLang,'), `${route} must not persist raw source language payloads in transaction input`);
    assert(!transactionInput.includes('clientResponse: generatedData'), `${route} must not persist generated descriptions in transaction input`);
    assert(!source.includes("logType: 'API_RESPONSE', data: response"), `${route} must not hand full provider response objects to local API_RESPONSE logs`);
    assert(!source.includes('responseTextSummary: getPreviewText'), `${route} must not log provider response preview summaries`);
    assert(!source.includes('rawTextLength'), `${route} must not use raw response text field names`);
    assert(!source.includes('rawTextPreview: getPreviewText'), `${route} must not label bounded response diagnostics as raw previews`);
    assert(!source.includes('request: { itemsList, targetLang, sourceLang, contentLength }'), `${route} must not write raw request payloads to local success logs`);
    assert(!source.includes('response: generatedData'), `${route} must not write full generated descriptions to local success logs`);
    assert(!source.includes('transaction: transactionObject'), `${route} must not write full transaction object to local success logs`);
    assert(!source.includes('data: transactionObject'), `${route} must not write full transaction object to local error logs`);
  }
  {
    const route = 'src/app/api/business-copy/route.ts';
    const source = read(route);
    assert(source.includes('business_copy_provider_response_parse_failed'), `${route} logs provider response parse failures with a stable code`);
    assert(source.includes('MAX_BUSINESS_COPY_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS'), `${route} caps provider response parse diagnostics`);
    assert(source.includes('reportedBusinessCopyProviderResponseParseFailures'), `${route} deduplicates provider response parse diagnostics`);
    assert(source.includes("fallbackPolicy: 'retry_once_then_return_business_copy_failed'"), `${route} uses fixed business-copy parse fallback policy`);
    assert(source.includes("stage: 'object_fragment'"), `${route} logs malformed object-fragment parse stage`);
    assert(source.includes("stage: 'object_fragment_missing'"), `${route} logs missing object-fragment parse stage`);
    assert(source.includes("stage: 'empty_response'"), `${route} logs empty provider response parse stage`);
    assert(source.includes('responseTextLength'), `${route} keeps bounded response text length metadata`);
    assert(source.includes('getBusinessCopyClientResponseSummary'), `${route} stores generated business-copy response summaries in AI accounting input`);
    assert(source.includes("responseSummaryKind: 'business_copy_generation'"), `${route} labels generated business-copy response summaries`);
    assert(source.includes('specialNoteLength'), `${route} retains bounded special-note shape metadata while accounting omits generated copy`);
    assert(source.includes('normalizeBusinessCopyGenerationResult'), `${route} validates the exact business-copy provider output contract`);
    assert(source.includes('summarizeAiProviderUsage(providerResponses)'), `${route} accounts for every successful provider call, including JSON retry calls`);
    assert(source.includes('providerCallCount: providerUsage.providerCallCount'), `${route} persists bounded provider call counts`);
    assert(source.includes('getRealCostPaise(action) * providerUsage.providerCallCount'), `${route} includes retry calls in internal real-cost estimates`);
    assert(source.includes('getTransactionLogSummary'), `${route} local transaction error logs use bounded summaries`);
    assert(source.includes('responseSummary'), `${route} local transaction error logs include result shape summaries`);
    assert(!source.includes('responseTextSummary: getPreviewText'), `${route} must not log provider response preview summaries`);
    assert(!source.includes('rawTextLength'), `${route} must not use raw response text field names`);
    assert(!source.includes('rawTextPreview: getPreviewText'), `${route} must not label bounded response diagnostics as raw previews`);
    assert(!source.includes('clientResponse: cleaned'), `${route} must not persist generated business copy in transaction input`);
    assert(!source.includes('data: transactionObject'), `${route} must not write full transaction object to local error logs`);
  }
  {
    const route = 'src/app/api/translations/route.ts';
    const source = read(route);
    const transactionStart = source.indexOf('let transactionObject = {');
    const transactionEnd = source.indexOf('// Add the operation to the database', transactionStart);
    const transactionInput = source.slice(transactionStart, transactionEnd);
    assert(source.includes('translation_provider_response_parse_failed'), `${route} logs provider response parse failures with a stable code`);
    assert(source.includes('MAX_TRANSLATION_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS'), `${route} caps provider response parse diagnostics`);
    assert(source.includes('reportedTranslationProviderResponseParseFailures'), `${route} deduplicates provider response parse diagnostics`);
    assert(source.includes("fallbackPolicy: 'retry_once_then_return_translation_failed'"), `${route} uses fixed translation parse fallback policy`);
    assert(source.includes("stage: 'object_fragment'"), `${route} logs malformed object-fragment parse stage`);
    assert(source.includes("stage: 'object_fragment_missing'"), `${route} logs missing object-fragment parse stage`);
    assert(source.includes("stage: 'empty_response'"), `${route} logs empty provider response parse stage`);
    assert(source.includes('responseTextLength'), `${route} keeps bounded response text length metadata`);
    assert(source.includes('inputSummary'), `${route} stores bounded input summaries in AI accounting input`);
    assert(source.includes('summarizeAiProviderUsage(providerResponses)'), `${route} accounts for every successful provider call, including malformed-JSON retries`);
    assert(source.includes('providerCallCount: providerUsage.providerCallCount'), `${route} persists bounded provider call counts`);
    assert(source.includes('getRealCostPaise(action) * providerUsage.providerCallCount'), `${route} includes retry calls in internal real-cost estimates`);
    assert(source.indexOf('const processingTime = Date.now() - startTime;') > source.indexOf('providerResponses.push(retryResponse);'), `${route} measures retry latency before accounting`);
    assert(source.includes('languageSummary'), `${route} stores bounded language summaries in AI accounting input`);
    assert(source.includes('targetLanguages: targetLanguageSummary'), `${route} stores bounded target language summaries in AI accounting input`);
    assert(source.includes('translationCoverageSummary'), `${route} stores bounded coverage summaries in AI accounting input`);
    assert(source.includes('getTranslationClientResponseSummary'), `${route} stores generated translation response summaries in AI accounting input`);
    assert(source.includes('resolveTranslationBillingAction'), `${route} derives the minimum safe translation billing action from validated request scope`);
    assert(source.includes('requestedAction'), `${route} preserves the requested action for bounded accounting diagnostics`);
    assert(source.includes("responseSummaryKind: 'translation_generation'"), `${route} labels generated translation response summaries`);
    assert(source.includes('getTransactionLogSummary'), `${route} local transaction logs use bounded summaries`);
    assert(source.includes('requestSummary'), `${route} local success logs use request summaries`);
    assert(source.includes('responseSummary'), `${route} local success logs use response summaries`);
    assert(transactionStart >= 0 && transactionEnd > transactionStart, `${route} transaction input block is detectable`);
    assert(!transactionInput.includes('\n            inputJson,'), `${route} must not persist raw input JSON in transaction input`);
    assert(!transactionInput.includes('\n            targetLang,'), `${route} must not persist raw target language payloads in transaction input`);
    assert(!transactionInput.includes('\n            sourceLang,'), `${route} must not persist raw source language payloads in transaction input`);
    assert(!transactionInput.includes('\n            translationCoverage,'), `${route} must not persist raw coverage arrays in transaction input`);
    assert(!transactionInput.includes('clientResponse: normalizedData'), `${route} must not persist normalized translations in transaction input`);
    assert(!source.includes('responseTextSummary: getPreviewText'), `${route} must not log provider response preview summaries`);
    assert(!source.includes('rawTextLength'), `${route} must not use raw response text field names`);
    assert(!source.includes('rawTextPreview: getPreviewText'), `${route} must not label bounded response diagnostics as raw previews`);
    assert(!source.includes('data: transactionObject'), `${route} must not write full transaction object to local error logs`);
    assert(!source.includes('transaction: transactionObject'), `${route} must not write full transaction object to local success logs`);
    assert(!source.includes('response: normalizedData'), `${route} must not write full normalized translations to local success logs`);
    assert(!source.includes('inputJson,\n                    targetLang'), `${route} must not write raw request payloads to local success logs`);
  }
  {
    const route = 'src/app/api/seo/route.ts';
    const source = read(route);
    assert(source.includes('seo_provider_response_parse_failed'), `${route} logs provider response parse failures with a stable code`);
    assert(source.includes('MAX_SEO_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS'), `${route} caps provider response parse diagnostics`);
    assert(source.includes('reportedSeoProviderResponseParseFailures'), `${route} deduplicates provider response parse diagnostics`);
    assert(source.includes("fallbackPolicy: 'return_seo_generation_failed'"), `${route} uses fixed SEO parse fallback policy`);
    assert(source.includes("stage: 'object_fragment'"), `${route} logs malformed object-fragment parse stage`);
    assert(source.includes("stage: 'object_fragment_missing'"), `${route} logs missing object-fragment parse stage`);
    assert(source.includes("stage: 'empty_response'"), `${route} logs empty provider response parse stage`);
    assert(source.includes('parseSeoProviderResponse(response.text'), `${route} parses provider response through bounded parser`);
    assert(source.includes('responseTextLength'), `${route} keeps bounded response text length metadata`);
    assert(source.includes('getSeoClientResponseSummary'), `${route} stores generated SEO response summaries in AI accounting input`);
    assert(source.includes("responseSummaryKind: 'seo_generation'"), `${route} labels generated SEO response summaries`);
    assert(source.includes('getTransactionLogSummary'), `${route} local transaction error logs use bounded summaries`);
    assert(source.includes('responseSummary'), `${route} local transaction error logs include result shape summaries`);
    assert(!source.includes('responseTextSummary: getPreviewText'), `${route} must not log provider response preview summaries`);
    assert(!source.includes('rawTextLength'), `${route} must not use raw response text field names`);
    assert(!source.includes('rawTextPreview: getPreviewText'), `${route} must not label bounded response diagnostics as raw previews`);
    assert(!source.includes('clientResponse: cleaned'), `${route} must not persist generated SEO copy in transaction input`);
    assert(!source.includes('data: transactionObject'), `${route} must not write full transaction object to local error logs`);
  }
  {
    const route = 'src/app/api/menu-card-export/design-advisor/route.ts';
    const source = read(route);
    assert(source.includes('menu_card_design_advisor_provider_response_parse_failed'), `${route} logs provider response parse failures with a stable code`);
    assert(source.includes('responseTextLength'), `${route} keeps bounded response text length metadata`);
    assert(source.includes('getMenuCardDesignAdvisorClientResponseSummary'), `${route} stores generated design-advice response summaries in AI accounting input`);
    assert(source.includes("responseSummaryKind: 'menu_card_design_advisor'"), `${route} labels generated design-advice response summaries`);
    assert(!source.includes('responseTextSummary: getPreviewText'), `${route} must not log provider response preview summaries`);
    assert(!source.includes('rawTextLength'), `${route} must not use raw response text field names`);
    assert(!source.includes('rawTextPreview: getPreviewText'), `${route} must not label bounded response diagnostics as raw previews`);
    assert(!source.includes('clientResponse: recommendation'), `${route} must not persist generated design advice in transaction input`);
  }

	  [
	    {
	      route: 'src/app/api/business-copy/route.ts',
	      codes: [
	        'business_copy_generation_model_call_failed',
	        'business_copy_provider_response_parse_failed',
	        'business_copy_generation_invalid_json_after_retry',
	        'business_copy_generation_invalid_shape_response',
	        'business_copy_generation_accounting_failed',
	        'business_copy_generation_api_failed',
	      ],
	      legacy: [
	        "logger.error('Business copy generation model call failed'",
	        "logger.error('Business copy generation returned invalid JSON after retry'",
	        "logger.error('Business copy generation returned non-object response'",
	        "logger.error('Failed to record business copy transaction'",
	        "logger.error('Business copy generation API error'",
	      ],
	    },
	    {
	      route: 'src/app/api/campaigns/caption/route.ts',
	      codes: [
	        'campaign_caption_model_call_failed',
	        'campaign_caption_provider_response_parse_failed',
	        'campaign_caption_invalid_json',
	        'campaign_caption_non_object_response',
	        'campaign_caption_accounting_failed',
	        'campaign_caption_api_failed',
	      ],
	      legacy: [
	        "logger.error('Campaign caption JSON parse error'",
	        "logger.error('Failed to record campaign caption transaction'",
	        "logger.error('Campaign Caption API error'",
	      ],
	    },
	    {
	      route: 'src/app/api/descriptions/route.ts',
	      codes: [
	        'description_generation_model_call_failed',
	        'description_provider_response_parse_failed',
	        'description_generation_invalid_json',
	        'description_generation_invalid_shape_response',
	        'description_generation_accounting_failed',
	        'description_generation_api_failed',
	      ],
	      legacy: [
	        "logger.error('Description generation model call failed'",
	        "logger.error('Description generation returned invalid JSON'",
	        "logger.error('Description generation returned non-object response'",
	        "logger.error('Failed to record description transaction'",
	        "logger.error('Description API error'",
	        'missingIds: missingIds.slice',
	      ],
	    },
	    {
	      route: 'src/app/api/seo/route.ts',
	      codes: [
	        'seo_generation_model_call_failed',
	        'seo_provider_response_parse_failed',
	        'seo_generation_invalid_json',
	        'seo_generation_invalid_shape_response',
	        'seo_generation_accounting_failed',
	        'seo_generation_api_failed',
	      ],
	      legacy: [
	        "logger.error('SEO generation model call failed'",
	        "logger.error('SEO generation returned invalid JSON'",
	        "logger.error('SEO generation returned non-object response'",
	        "logger.error('Failed to record SEO generation transaction'",
	        "logger.error('SEO generation API error'",
	      ],
	    },
	    {
	      route: 'src/app/api/new-item-metadata/route.ts',
	      codes: [
	        'new_item_metadata_model_call_failed',
	        'new_item_metadata_provider_response_parse_failed',
	        'new_item_metadata_invalid_json',
	        'new_item_metadata_invalid_shape_response',
	        'new_item_metadata_accounting_failed',
	        'new_item_metadata_api_failed',
	      ],
	      legacy: [
	        "logger.error('New item metadata model call failed'",
	        "logger.error('New item metadata returned invalid JSON'",
	        "logger.error('New item metadata returned non-object response'",
	        "logger.error('Failed to record new item metadata transaction'",
	        "logger.error('New item metadata API error'",
	      ],
	    },
	    {
	      route: 'src/app/api/translations/route.ts',
	      codes: [
	        'translation_model_call_failed',
	        'translation_retry_model_call_failed',
	        'translation_provider_response_parse_failed',
	        'translation_invalid_json_after_retry',
	        'translation_accounting_failed',
	        'translation_api_failed',
	      ],
	      legacy: [
	        "logger.error('Translation model call failed'",
	        "logger.error('Translation retry model call failed'",
	        "logger.error('Translation returned invalid JSON after retry'",
	        "logger.error('Failed to record translation transaction'",
	        "logger.error('Translation API error'",
	      ],
	    },
		  ].forEach(({ route, codes, legacy }) => {
		    const source = read(route);
		    assert(source.includes('logAIRouteFailure'), `${route} uses bounded AI route failure diagnostics`);
		    codes.forEach((code) => {
		      assert(source.includes(code), `${route} includes stable AI route failure code ${code}`);
		    });
		    legacy.forEach((token) => {
		      assert(!source.includes(token), `${route} removes legacy raw diagnostic token ${token}`);
		    });
		    assert(!source.includes('logger.error('), `${route} must not pass raw route exceptions to logger.error`);
		  });

  [
    'src/app/api/business-copy/route.ts',
    'src/app/api/descriptions/route.ts',
    'src/app/api/image-editing/route.ts',
    'src/app/api/new-item-metadata/route.ts',
    'src/app/api/seo/route.ts',
    'src/app/api/translations/route.ts',
  ].forEach((route) => {
    const source = read(route);
    assert(source.includes('error: getAIErrorDiagnostics(transactionError)'), `${route} writes bounded transaction DB error diagnostics to local logs`);
    assert(!source.includes('error: transactionError'), `${route} must not write raw accounting exceptions to local transaction DB logs`);
  });

  const businessCopyRoute = read('src/app/api/business-copy/route.ts');
	  assert(businessCopyRoute.includes('parseBusinessCopyProviderResponse(parsedRawText'), 'business copy route parses provider responses through bounded parser');
	  assert(!businessCopyRoute.includes("logger.warn('Business copy generation returned invalid JSON, retrying once'"), 'business copy route must not use ad hoc invalid-JSON retry warnings');
	  assert(businessCopyRoute.includes("logger.info('Business copy generation completed', getAIRouteLogContext"), 'business copy route bounds completion diagnostics');
	  assert(!businessCopyRoute.includes("logger.info('Business copy generation completed', {"), 'business copy route must not log raw completion context');

	  const descriptionRoute = read('src/app/api/descriptions/route.ts');
	  assert(descriptionRoute.includes('const getPendingAiTransactionId = (): string | null => null;'), 'description route types the unsettled accounting transaction sentinel');
	  assert(descriptionRoute.includes('parseDescriptionProviderResponse(response.text'), 'description route parses provider response through bounded parser');
	  assert(descriptionRoute.includes("logger.warn('Description generation returned incomplete response', getAIRouteLogContext"), 'description route bounds incomplete-response warning context');
	  assert(descriptionRoute.includes("logger.info('Description generation completed', getAIRouteLogContext"), 'description route bounds completion diagnostics');
	  assert(!descriptionRoute.includes("logger.info('Description generation completed', {"), 'description route must not log raw completion context');
	  assert(descriptionRoute.includes('validated.operationRequestCount ?? 1'), 'description route defaults old and single-request clients to one capacity unit');
	  assert(descriptionRoute.includes('action,\n            operationRequestCount,\n        );'), 'description route admits the complete declared paid request scope before provider work');
	  assert(descriptionRoute.includes('const requestUnitsRequired = getUnitCost(action);'), 'description route keeps reservation units scoped to the current request');
	  assert(descriptionRoute.includes('unitsToReserve: requestUnitsRequired'), 'description route reserves only the current request after whole-scope admission');
	  assert(!descriptionRoute.includes('unitsToReserve: capacityCheck.unitsRequired'), 'description route must not settle the whole-scope admission as one request row');

	  const mobileDescriptionSheet = read('src/components/mobile/sheets/GenerateDescriptionsSheet.tsx');
	  assert(
	    mobileDescriptionSheet.includes("Toast.show({ content: t('enhancementPackRequired'), duration: 2200 });"),
	    'mobile description generation uses enhancement-pack capacity copy',
	  );
	  assert(
	    !mobileDescriptionSheet.includes("Toast.show({ content: t('translationCreditsRequired'), duration: 2200 });"),
	    'mobile description generation must not label description capacity as translation credits',
	  );

	  const mobileItemEditSheet = read('src/components/mobile/sheets/ItemEditSheet.tsx');
	  assert(
	    mobileItemEditSheet.includes("Toast.show({ content: t('enhancementPackRequired'), duration: 2200 });"),
	    'mobile single-item description generation uses enhancement-pack capacity copy',
	  );

	  const mobileBulkActionsSheet = read('src/components/mobile/sheets/BulkActionsSheet.tsx');
	  assert(
	    mobileBulkActionsSheet.includes("Toast.show({ content: t('enhancementPackRequired'), duration: 2200 });"),
	    'mobile repair flow uses operation-neutral enhancement-pack capacity copy',
	  );

	  const mobileLocaleDirectory = path.join(repoRoot, 'public/locales/menulist.ai');
	  collectFiles(mobileLocaleDirectory)
	    .filter((file) => file.endsWith('.json'))
	    .forEach((file) => {
	      const locale = JSON.parse(fs.readFileSync(file, 'utf8'));
	      if (!locale.MobileMenu) return;
	      const enhancementPackRequired = locale.MobileMenu.enhancementPackRequired;
	      const isCanonicalEnglishLocale = path.basename(file) === 'en-US.json';
	      assert(
	        typeof enhancementPackRequired === 'string'
	          && enhancementPackRequired.trim().length > 0
	          && enhancementPackRequired.length <= 240,
	        `${path.relative(repoRoot, file)} defines a bounded owner-safe mobile enhancement-pack message`,
	      );
	      assert(
	        !enhancementPackRequired.toLowerCase().includes('translation credit'),
	        `${path.relative(repoRoot, file)} does not reuse stale translation-credit wording for general enhancements`,
	      );
	      if (isCanonicalEnglishLocale) assert(
	        enhancementPackRequired === 'Get more enhancements to continue. Open Billing to add an enhancement pack.',
	        'en-US defines the canonical owner-safe mobile enhancement-pack message',
	      );
	    });

	  const newItemMetadataRoute = read('src/app/api/new-item-metadata/route.ts');
	  assert(newItemMetadataRoute.includes('const getPendingAiTransactionId = (): string | null => null;'), 'new item metadata route types the unsettled accounting transaction sentinel');
	  assert(newItemMetadataRoute.includes("logger.info('New item metadata completed', getAIRouteLogContext"), 'new item metadata route bounds completion diagnostics');
	  assert(!newItemMetadataRoute.includes("logger.info('New item metadata completed', {"), 'new item metadata route must not log raw completion context');

	  const seoRoute = read('src/app/api/seo/route.ts');
	  assert(seoRoute.includes('parseSeoProviderResponse(response.text'), 'SEO route parses provider response through bounded parser');
	  assert(seoRoute.includes("logger.info('SEO generation completed', getAIRouteLogContext"), 'SEO route bounds completion diagnostics');
	  assert(!seoRoute.includes("logger.info('SEO generation completed', {"), 'SEO route must not log raw completion context');

	  const translationRoute = read('src/app/api/translations/route.ts');
	  assert(translationRoute.includes('const getPendingAiTransactionId = (): string | null => null;'), 'translation route types the unsettled accounting transaction sentinel');
	  assert(translationRoute.includes('parseTranslationProviderResponse(response.text'), 'translation route parses initial provider response through bounded parser');
	  assert(translationRoute.includes('parseTranslationProviderResponse(retryResponse.text'), 'translation route parses retry provider response through bounded parser');
	  assert(!translationRoute.includes("logger.warn('Translation returned invalid JSON, retrying once'"), 'translation route must not use ad hoc invalid-JSON retry warnings');
	  assert(translationRoute.includes("logger.warn('Translation completed with partial coverage', getAIRouteLogContext"), 'translation route bounds partial-coverage warning context');
	  assert(translationRoute.includes("logger.info('Translation completed with full coverage', getAIRouteLogContext"), 'translation route bounds full-coverage completion diagnostics');
	  assert(translationRoute.includes('geminiResponse: response'), 'translation route passes provider response through shared AI operation serializer');
	  assert(!translationRoute.includes('geminiResponse: JSON.stringify(response)'), 'translation route must not pre-stringify provider responses for transaction logs');
	  assert(!translationRoute.includes("logger.warn('Translation completed with partial coverage', {"), 'translation route must not log raw partial-coverage context');
	  assert(!translationRoute.includes("logger.info('Translation completed with full coverage', {"), 'translation route must not log raw full-coverage completion context');
	  assert(!translationRoute.includes('translationCoverage,\n                transactionId'), 'translation route must not log raw translation coverage arrays in warning context');
	  const translationReadme = read('__docs__/projects/multi-language-translation/README.md');
	  const translationImpl = read('__docs__/projects/multi-language-translation/multi-language-translation_impl.md');
	  const translationFirebase = read('__docs__/projects/multi-language-translation/multi-language-translation_firebase.md');
	  const descriptionReadme = read('__docs__/projects/description-generation/README.md');
	  const descriptionImpl = read('__docs__/projects/description-generation/description-generation_impl.md');
	  const descriptionFirebase = read('__docs__/projects/description-generation/description-generation_firebase.md');
	  const aiSystemReadme = read('__docs__/ai-system-layer/README.md');
	  const aiSystemImpl = read('__docs__/ai-system-layer/ai-system-layer_impl.md');
	  const aiSystemFirebase = read('__docs__/ai-system-layer/ai-system-layer_firebase.md');
	  const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
	  const changelog = read('__docs__/changelog.md');
	  [
	    ['AI System Layer README', aiSystemReadme],
	    ['AI System Layer implementation', aiSystemImpl],
	    ['AI System Layer Firebase', aiSystemFirebase],
	    ['Production-readiness audit', productionReadinessAudit],
	    ['Changelog', changelog],
		  ].forEach(([label, content]) => {
		    [
		      'seo_provider_response_parse_failed',
		      'return_seo_generation_failed',
		    ].forEach((token) => {
		      assert(content.includes(token), `${label} documents SEO provider-response parse diagnostic token ${token}`);
		    });
		  });
		  [
		    ['AI System Layer README', aiSystemReadme],
		    ['AI System Layer implementation', aiSystemImpl],
		    ['AI System Layer Firebase', aiSystemFirebase],
		    ['Production-readiness audit', productionReadinessAudit],
		    ['Changelog', changelog],
		  ].forEach(([label, content]) => {
		    [
		      'transaction DB local error',
		      'TRANSACTION_DB_ERROR',
		      'raw accounting exception',
		    ].forEach((token) => {
		      assert(content.includes(token), `${label} documents AI transaction DB local error boundary token ${token}`);
		    });
		  });
		  [
		    ['AI System Layer README', aiSystemReadme],
	    ['AI System Layer implementation', aiSystemImpl],
	    ['AI System Layer Firebase', aiSystemFirebase],
	    ['Production-readiness audit', productionReadinessAudit],
	    ['Changelog', changelog],
	  ].forEach(([label, content]) => {
	    [
	      'new_item_metadata_provider_response_parse_failed',
	      'return_metadata_generation_failed',
	    ].forEach((token) => {
	      assert(content.includes(token), `${label} documents new-item metadata provider-response parse diagnostic token ${token}`);
	    });
	  });
	  [
	    ['AI System Layer README', aiSystemReadme],
	    ['AI System Layer implementation', aiSystemImpl],
	    ['AI System Layer Firebase', aiSystemFirebase],
	    ['Production-readiness audit', productionReadinessAudit],
	    ['Changelog', changelog],
	  ].forEach(([label, content]) => {
	    [
	      'campaign_caption_provider_response_parse_failed',
	      'return_caption_generation_failed',
	      'caption response summaries',
	    ].forEach((token) => {
	      assert(content.includes(token), `${label} documents campaign caption provider-response parse diagnostic token ${token}`);
	    });
	  });
	  [
	    'extra provider calls',
	    'AI accounting writes',
	    'credit consumption',
	    'Firebase deploy requirement',
	    'Vercel deploy action',
	  ].forEach((token) => {
	    assert(aiSystemFirebase.includes(token), `AI System Layer Firebase doc documents SEO provider-response parse cost token ${token}`);
	  });
	  [
	    'New item metadata provider response parse diagnostics checkpoint',
	    'no raw response preview',
	    'full provider response objects',
	    'raw prompt item/language payloads',
	  ].forEach((token) => {
	    assert(productionReadinessAudit.includes(token), `Production-readiness audit documents new-item metadata provider-response checkpoint token ${token}`);
	  });
	  [
	    'New Item Metadata Provider Response Parse Diagnostics',
	    'no raw response preview logging',
	    'full provider response objects',
	    'raw prompt item/language payloads',
	  ].forEach((token) => {
	    assert(changelog.includes(token), `Changelog documents new-item metadata provider-response checkpoint token ${token}`);
	  });
	  [
	    'Campaign Caption provider response parse diagnostics checkpoint',
	    'no raw response preview',
	    'raw prompt item/business fields',
	    'generated caption objects',
	  ].forEach((token) => {
	    assert(productionReadinessAudit.includes(token), `Production-readiness audit documents campaign caption provider-response checkpoint token ${token}`);
	  });
	  [
	    'Campaign Caption Provider Response Parse Diagnostics',
	    'no raw response preview logging',
	    'raw prompt item/business fields',
	    'generated caption objects',
	  ].forEach((token) => {
	    assert(changelog.includes(token), `Changelog documents campaign caption provider-response checkpoint token ${token}`);
	  });
	  [
	    'SEO provider response parse diagnostics checkpoint',
	    'no raw response preview',
	    'seo_provider_response_parse_failed',
	    'local accounting-error logs',
	  ].forEach((token) => {
	    assert(productionReadinessAudit.includes(token), `Production-readiness audit documents SEO provider-response checkpoint token ${token}`);
	  });
	  [
	    'SEO Provider Response Parse Diagnostics',
	    'no raw response preview logging',
	    'seo_provider_response_parse_failed',
	    'local accounting-error logs',
	  ].forEach((token) => {
	    assert(changelog.includes(token), `Changelog documents SEO provider-response checkpoint token ${token}`);
	  });
	  [
	    ['Description Generation README', descriptionReadme],
	    ['Description Generation implementation', descriptionImpl],
	    ['Description Generation Firebase', descriptionFirebase],
	    ['Production-readiness audit', productionReadinessAudit],
	    ['Changelog', changelog],
	  ].forEach(([label, content]) => {
	    [
	      'description_provider_response_parse_failed',
	      'return_description_generation_failed',
	    ].forEach((token) => {
	      assert(content.includes(token), `${label} documents description provider-response parse diagnostic token ${token}`);
	    });
	  });
	  [
	    'extra provider calls',
	    'AI accounting writes',
	    'credit consumption',
	    'Firebase deploy requirement',
	    'Vercel deploy action',
	  ].forEach((token) => {
	    assert(descriptionFirebase.includes(token), `Description Generation Firebase doc documents provider-response parse cost token ${token}`);
	  });
	  [
	    'Description provider response parse diagnostics checkpoint',
	    'no raw response preview',
	    'full provider response objects',
	    'raw prompt item/language payloads',
	    'local success/error logs',
	  ].forEach((token) => {
	    assert(productionReadinessAudit.includes(token), `Production-readiness audit documents description provider-response checkpoint token ${token}`);
	  });
	  [
	    'Description Provider Response Parse Diagnostics',
	    'no raw response preview logging',
	    'full provider response objects',
	    'raw prompt item/language payloads',
	    'local success/error logs',
	  ].forEach((token) => {
	    assert(changelog.includes(token), `Changelog documents description provider-response checkpoint token ${token}`);
	  });
	  [
	    ['AI System Layer README', aiSystemReadme],
	    ['AI System Layer implementation', aiSystemImpl],
	    ['AI System Layer Firebase', aiSystemFirebase],
	    ['Production-readiness audit', productionReadinessAudit],
	    ['Changelog', changelog],
	  ].forEach(([label, content]) => {
	    [
	      'business_copy_provider_response_parse_failed',
	      'retry_once_then_return_business_copy_failed',
	    ].forEach((token) => {
	      assert(content.includes(token), `${label} documents business-copy provider-response parse diagnostic token ${token}`);
	    });
	  });
	  [
	    'extra provider calls beyond the existing retry policy',
	    'AI accounting writes',
	    'credit consumption',
	    'Firebase deploy requirement',
	    'Vercel deploy action',
	  ].forEach((token) => {
	    assert(aiSystemFirebase.includes(token), `AI System Layer Firebase doc documents business-copy provider-response parse cost token ${token}`);
	  });
	  [
	    'Business Copy provider response parse diagnostics checkpoint',
	    'no raw response preview',
	    'local accounting-error logs',
	    'old ad hoc invalid-JSON retry warning',
	  ].forEach((token) => {
	    assert(productionReadinessAudit.includes(token), `Production-readiness audit documents business-copy provider-response checkpoint token ${token}`);
	  });
	  [
	    'Business Copy Provider Response Parse Diagnostics',
	    'no raw response preview logging',
	    'local accounting-error logs',
	    'old ad hoc invalid-JSON retry warning',
	  ].forEach((token) => {
	    assert(changelog.includes(token), `Changelog documents business-copy provider-response checkpoint token ${token}`);
	  });
	  [
	    ['Multi-Language Translation README', translationReadme],
	    ['Multi-Language Translation implementation', translationImpl],
	    ['Multi-Language Translation Firebase', translationFirebase],
	    ['Production-readiness audit', productionReadinessAudit],
	    ['Changelog', changelog],
	  ].forEach(([label, content]) => {
	    [
	      'translation_provider_response_parse_failed',
	      'retry_once_then_return_translation_failed',
	    ].forEach((token) => {
	      assert(content.includes(token), `${label} documents translation provider-response parse diagnostic token ${token}`);
	    });
	  });
	  [
	    'extra provider calls beyond the existing retry policy',
	    'AI accounting writes',
	    'credit consumption',
	    'Firebase deploy requirement',
	    'Vercel deploy action',
	  ].forEach((token) => {
	    assert(translationFirebase.includes(token), `Multi-Language Translation Firebase doc documents provider-response parse cost token ${token}`);
	  });
	  [
	    'Translation provider response parse diagnostics checkpoint',
	    'no raw response preview',
	    'raw prompt input/language payloads',
	    'local success/error logs',
	    'old ad hoc invalid-JSON retry warning',
	  ].forEach((token) => {
	    assert(productionReadinessAudit.includes(token), `Production-readiness audit documents translation provider-response checkpoint token ${token}`);
	  });
	  [
	    'Translation Provider Response Parse Diagnostics',
	    'no raw response preview logging',
	    'raw prompt input/language payloads',
	    'local success/error logs',
	    'old ad hoc invalid-JSON retry warning',
	  ].forEach((token) => {
	    assert(changelog.includes(token), `Changelog documents translation provider-response checkpoint token ${token}`);
	  });
	}

{
  [
    {
      route: 'src/app/api/campaigns/caption/route.ts',
      codes: [
        'campaign_caption_model_call_failed',
        'campaign_caption_provider_response_parse_failed',
        'campaign_caption_invalid_json',
        'campaign_caption_non_object_response',
        'campaign_caption_accounting_failed',
        'campaign_caption_api_failed',
      ],
      bounded: [
        'parseCampaignCaptionProviderResponse(response.text',
        'campaign_caption_non_object_response',
        'getAIGatewayDiagnostics(genAIClient)',
      ],
      legacy: [
        "logger.error('Campaign caption JSON parse error'",
        "logger.error('Failed to record campaign caption transaction'",
        "logger.error('Campaign Caption API error'",
      ],
    },
    {
      route: 'src/app/api/menu-card-export/design-advisor/route.ts',
      codes: [
        'menu_card_design_advisor_model_call_failed',
        'menu_card_design_advisor_invalid_json',
        'menu_card_design_advisor_accounting_failed',
        'menu_card_design_advisor_api_failed',
      ],
      bounded: [
        'logger.info(\'Menu card design advisor requested\', getAIRouteLogContext',
        'menu_card_design_advisor_provider_response_parse_failed',
        'getAIGatewayDiagnostics(genAIClient)',
      ],
      legacy: [
        "logger.error('Menu card design advisor returned invalid JSON'",
        "logger.error('Failed to record menu card design advisor transaction'",
        "logger.error('Menu card design advisor API error'",
        'getAIErrorDiagnostics(error)',
      ],
    },
    {
      route: 'src/app/api/image-generation/route.ts',
      codes: [
        'image_generation_accounting_failed',
        'image_generation_api_failed',
      ],
      bounded: [
        'attemptedData: getAIRouteLogContext',
        'getAIRouteSecurityContext(session, request)',
        'getTransactionLogSummary',
        'getAIGatewayDiagnostics(genAIClient)',
      ],
      legacy: [
        'buildSecurityContext',
        "logger.error('Failed to record image generation transaction'",
        "logger.error('Image generation API error'",
      ],
      forbidden: [
        'CHARGE_PER_IMAGEN_IMAGE',
        'TOKENS_PER_IMAGEN_IMAGE',
      ],
    },
    {
      route: 'src/app/api/image-editing/route.ts',
      codes: [
        'image_editing_flash_failed',
        'image_editing_accounting_failed',
        'image_editing_api_failed',
      ],
      bounded: [
        'attemptedData: getAIRouteLogContext',
        'getAIRouteSecurityContext(session, request)',
        'getAIGatewayDiagnostics(genAIClient)',
      ],
      legacy: [
        'buildSecurityContext',
        "logger.error('Error editing image'",
        "logger.error('Failed to record transaction'",
        "logger.error('Image editing API error'",
      ],
    },
    {
      route: 'src/app/api/image-generation/generators.ts',
      codes: [
        'image_generation_gemini_flash_failed',
      ],
      bounded: [
        'logAIRouteFailure',
        'promptLength: prompt.length',
      ],
      legacy: [
        "logger.error('Error generating image (Gemini Flash)'",
        "logger.error('Error generating image (Imagen 3)'",
      ],
      forbidden: [
        'GenerateImagesResponse',
        'generateImages(',
        'IMAGE_AI_MODELS.IMAGEN',
        'IMAGEN_3',
        'image_generation_imagen3_failed',
      ],
    },
    {
      route: 'src/app/api/image-generation/batch-generation/route.ts',
      codes: [
        'image_batch_worker_generation_failed',
      ],
      bounded: [
        'logRuntimeFailure',
        'workerLogContext',
      ],
      legacy: [],
      forbidden: [
        'CHARGE_PER_IMAGEN_IMAGE',
        'TOKENS_PER_IMAGEN_IMAGE',
      ],
    },
  ].forEach(({ route, codes, bounded, legacy, forbidden = [] }) => {
    const source = read(route);
    if (route === 'src/app/api/image-generation/batch-generation/route.ts') {
      assert(source.includes('logRuntimeFailure'), `${route} uses bounded runtime failure diagnostics`);
    } else {
      assert(source.includes('logAIRouteFailure'), `${route} uses bounded AI route failure diagnostics`);
    }
    codes.forEach((code) => {
      assert(source.includes(code), `${route} includes stable AI route failure code ${code}`);
    });
    bounded.forEach((token) => {
      assert(source.includes(token), `${route} includes bounded diagnostic token ${token}`);
    });
    legacy.forEach((token) => {
      assert(!source.includes(token), `${route} removes legacy raw diagnostic token ${token}`);
    });
    forbidden.forEach((token) => {
      assert(!source.includes(token), `${route} avoids deprecated Imagen image generation token ${token}`);
    });
    assert(!source.includes('logger.error('), `${route} must not pass raw route exceptions to logger.error`);
  });
}

{
  const diagnostics = read('src/lib/google/genAi/diagnostics.ts');
  assert(diagnostics.includes('getBoundedSecurityStringContext'), 'AI route diagnostics expose bounded security string context');
  [
    'export function getAIRouteSecurityContext',
    "getBoundedSecurityStringContext('userId'",
    "getBoundedSecurityStringContext('email'",
    "getBoundedSecurityStringContext('tenantId'",
    "getBoundedSecurityStringContext('storeId'",
    "getBoundedSecurityStringContext('ip'",
    "getBoundedSecurityStringContext('userAgent'",
  ].forEach((token) => {
    assert(diagnostics.includes(token), `AI route diagnostics include bounded security token ${token}`);
  });
}

{
  const apiUtils = read('src/lib/apiUtils/index.ts');
  [
    'validateServerNetworkTargetUrl',
    'function getAllowedStorageBucket',
    'function getStoragePathFromFirebaseStorageUrl',
    'function isAllowedAiReferenceStoragePath',
    '`media/menuItem/${tenantId}/${storeId}/`',
    '`projects/itemImages/${tenantId}/${storeId}/`',
	    'validateServerNetworkTargetUrl(value)',
	    "fetch(imageUrl, { redirect: 'manual' })",
	    'readResponseUint8ArrayWithLimit(response, MAX_AI_REFERENCE_IMAGE_BYTES)',
	    'isResponseBodyTooLargeError(error)',
	  ].forEach((token) => {
	    assert(apiUtils.includes(token), `AI reference image helper includes scoped fetch guard token ${token}`);
	  });
	  [
	    'fetch(referanceImage.url)',
	    'referanceImage.url.includes("https://firebasestorage.googleapis.com")',
	    'const imageArrayBuffer = await response.arrayBuffer()',
	    'Buffer.from(imageArrayBuffer)',
	  ].forEach((token) => {
    assert(!apiUtils.includes(token), `AI reference image helper does not use legacy raw URL fetch token ${token}`);
  });

  const singleImageRoute = read('src/app/api/image-generation/route.ts');
  const imagePrompt = read('src/app/api/image-generation/prompt.ts');
  const apiSchemas = read('src/lib/validation/apiSchemas.ts');
  assert(!singleImageRoute.includes('as unknown as GenerateImageViaApiPayloadType'), 'single image generation must use its validated runtime DTO without a double assertion');
  assert(!singleImageRoute.includes('const rawData = bodyResult.data as any'), 'single image generation raw input must remain unknown until validation');
  assert(!singleImageRoute.includes('let transactionObject: any'), 'single image generation accounting must retain an explicit transaction type');
  assert(singleImageRoute.includes('let accountingFailureLogged = false;'), 'single image generation must track accounting diagnostics without mutating thrown values');
  assert(!singleImageRoute.includes('__imageGenerationLogged'), 'single image generation must not mutate a provider or accounting error object');
  assert(imagePrompt.includes("const details = inputJson.itemDetails || {};"), 'single image prompt construction must support the schema-valid missing-item-details case');
  assert(apiSchemas.includes("projectId: z.string().max(160).refine((value) => normalizeMultiOutletProjectId(value)?.projectId === value)"), 'single image generation schema must require exact tenant/store-bearing project identity');
  assert(singleImageRoute.includes('referenceImageStorageScope'), 'single image generation passes reference image storage scope');
  assert(singleImageRoute.includes('sId: session.sId'), 'single image generation scopes reference images to session store');
  assert(singleImageRoute.includes('tId: session.tId'), 'single image generation scopes reference images to session tenant');

  const batchWorker = read('src/app/api/image-generation/batch-generation/route.ts');
  assert(batchWorker.includes('referenceImageStorageScope: { sId, tId }'), 'batch image worker scopes reference images to project tenant/store');

	  const imageEditingRoute = read('src/app/api/image-editing/route.ts');
	  assert(imageEditingRoute.includes('const getPendingAiTransactionId = (): string | null => null;'), 'image editing route types the unsettled accounting transaction sentinel');
	  assert(imageEditingRoute.includes('const getEmptyAiClientResponse = (): unknown => null;'), 'image editing route types the intentionally empty operation response');
	  assert(imageEditingRoute.includes('type ImageFetchStorageScope'), 'image editing route imports the reference image scope type');
	  assert(imageEditingRoute.includes('storageScope: referenceImageStorageScope'), 'image editing route passes scope into source and prompt image reads');
	  assert(imageEditingRoute.includes('sId: session.sId'), 'image editing route scopes reference images to session store');
	  assert(imageEditingRoute.includes('tId: session.tId'), 'image editing route scopes reference images to session tenant');
	  assert(imageEditingRoute.includes('const generatedPrompt = generateImageEditingPrompt(businessType, generationConfig, itemDetails);'), 'image editing route stores generated prompt before provider call');
	  assert(imageEditingRoute.includes('if (!generatedPrompt)'), 'image editing route rejects missing generated prompts before provider call');
	  assert(imageEditingRoute.includes("Image editing needs a valid editing prompt"), 'image editing route returns fixed missing-prompt copy');
	  assert(imageEditingRoute.includes('generationConfig.prompt = generatedPrompt;'), 'image editing route sends only generated prompt to provider helper');
	  assert(!imageEditingRoute.includes('generationConfig.prompt = generateImageEditingPrompt(businessType, generationConfig, itemDetails)'), 'image editing route must not assign nullable generated prompt directly');

	  const generators = read('src/app/api/image-generation/generators.ts');
	  assert(generators.includes('referenceImageStorageScope?: ImageFetchStorageScope'), 'shared image generators expose optional reference image storage scope');
	  assert(generators.includes('storageScope: options.referenceImageStorageScope'), 'Gemini Flash helper passes scoped Storage guard into reference image reads');
	}

const imageEditingPromptHelpers = [
  'src/app/api/image-editing/promptsList/index.ts',
  'src/app/api/image-editing/promptsList/getBusinessSpecificPrompt.ts',
];

{
  const compatibilityEntry = read('src/app/api/image-editing/promptsList/prompt.ts').trim();
  assert(
    compatibilityEntry === "// Compatibility entry point. Keep one authoritative prompt-selection contract.\nexport { generateImageEditingPrompt } from './index';",
    'image editing prompt compatibility entry re-exports the authoritative sanitized router only',
  );
}

{
  const diagnostics = read('src/app/api/image-editing/promptsList/diagnostics.ts');
  assert(diagnostics.includes('getBoundedSecurityStringContext'), 'image editing prompt diagnostics must bound business/feature values');
  assert(diagnostics.includes('logImageEditingPromptFailure'), 'image editing prompt diagnostics must expose a normalized failure helper');
  assert(diagnostics.includes("getBoundedSecurityStringContext('businessType', context.businessType)"), 'image editing prompt diagnostics must bound business type');
  assert(diagnostics.includes("getBoundedSecurityStringContext('feature', context.feature)"), 'image editing prompt diagnostics must bound feature name');
  assert(diagnostics.includes('logSecurityFailure(failureCode, error'), 'image editing prompt diagnostics must preserve source error metadata through security diagnostics');
}

for (const helper of imageEditingPromptHelpers) {
  const source = read(helper);
  assert(source.includes('logImageEditingPromptFailure'), `${helper} uses bounded prompt diagnostics`);
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(source), `${helper} does not direct-console prompt failures`);
  assert(!source.includes('secureError('), `${helper} must not pass raw prompt failures to secureError`);
  assert(!source.includes('new Error(String(error))'), `${helper} must not stringify thrown prompt failures`);
  assert(!source.includes('error instanceof Error ? error'), `${helper} must not pass raw prompt exceptions to secure logging`);
  assert(!source.includes('businessType?.slice'), `${helper} must not log raw business type strings`);
  assert(!source.includes('featureName?.slice'), `${helper} must not log raw feature strings`);
  assert(!source.includes('feature?.slice'), `${helper} must not log raw feature strings`);
}

{
  const promptInput = read('src/app/api/image-editing/promptsList/promptInput.ts');
  [
    'export const IMAGE_EDITING_PROMPT_TEXT_MAX_LENGTH = 2000;',
    'export const IMAGE_EDITING_ITEM_NAME_MAX_LENGTH = 500;',
    'export const IMAGE_EDITING_ITEM_CATEGORY_MAX_LENGTH = 200;',
    'export function sanitizeImageEditingPromptText(',
    ".replace(/[\\u0000-\\u001f\\u007f]/g, ' ')",
    ".replace(/[{}<>`$\\\\]/g, '')",
    'export function sanitizeImageEditingItemDetails(',
    'category: sanitizeOptionalImageEditingText(itemDetails.category, IMAGE_EDITING_ITEM_CATEGORY_MAX_LENGTH)',
    'description: sanitizeOptionalImageEditingText(itemDetails.description, IMAGE_EDITING_PROMPT_TEXT_MAX_LENGTH)',
    'name: sanitizeOptionalImageEditingText(itemDetails.name, IMAGE_EDITING_ITEM_NAME_MAX_LENGTH)',
  ].forEach((token) => {
    assert(promptInput.includes(token), `image editing prompt input helper includes bounded token ${token}`);
  });

  const promptRouter = read('src/app/api/image-editing/promptsList/index.ts');
  [
    'sanitizeImageEditingPromptText(generationConfig.prompt, IMAGE_EDITING_PROMPT_TEXT_MAX_LENGTH)',
    'const safeItemDetails = sanitizeImageEditingItemDetails(itemDetails);',
    'return getBusinessSpecificPrompt(businessType, feature, safeItemDetails);',
    'hasItemCategory: Boolean(safeItemDetails.category)',
    'hasItemDescription: Boolean(safeItemDetails.description)',
    'hasItemName: Boolean(safeItemDetails.name)',
  ].forEach((token) => {
    assert(promptRouter.includes(token), `image editing prompt router includes sanitized input token ${token}`);
  });

  [
    'src/app/api/image-editing/promptsList/getBusinessSpecificPrompt.ts',
  ].forEach((helper) => {
    const source = read(helper);
    assert(source.includes('sanitizeImageEditingItemDetails'), `${helper} sanitizes item-detail placeholders`);
    assert(source.includes('const safeItemDetails = sanitizeImageEditingItemDetails(itemDetails);'), `${helper} creates sanitized item details before placeholder replacement`);
    assert(!source.includes('replace(/\\[Item\\/Service Name,.*?\\]/g, itemDetails.name)'), `${helper} must not inject raw item names into prompt placeholders`);
    assert(!source.includes('replace(/\\[Category Name,.*?\\]/g, itemDetails.category)'), `${helper} must not inject raw category names into prompt placeholders`);
    assert(!source.includes('replace(/\\[Optional Description:.*?\\]/g, itemDetails.description)'), `${helper} must not inject raw descriptions into prompt placeholders`);
  });
}

{
  const diagnostics = read('src/components/templates/main-app/projects/utils/translationDiagnostics.ts');
  [
    'secureError',
    'getBoundedTranslationStringContext',
    'getTranslationScopeLogContext',
    'getTranslationLanguageLogContext',
    'logTranslationFailure',
    'sourceErrorName',
    'sourceErrorCode',
    'sourceStatusCode',
  ].forEach((token) => {
    assert(diagnostics.includes(token), `translation diagnostics helper includes ${token}`);
  });

  const client = read('src/components/templates/main-app/projects/generateTranslations.ts');
  [
    'readAiServiceResponseJson(response,',
    'MENU_TRANSLATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024',
    'menu_translation_response_parse_failed',
    'menu_translation_response_invalid',
    'menu_translation_api_request_failed',
    'translationKeyCount',
    'responseStatus',
    'getTranslationScopeLogContext',
    'getTranslationLanguageLogContext',
  ].forEach((token) => {
    assert(client.includes(token), `translation API client includes bounded diagnostic token ${token}`);
  });
  assert(!client.includes("console.error('Error calling translation API:'"), 'translation API client does not direct-console API failures');
  assert(!client.includes('response.statusText'), 'translation API client does not copy raw provider status text into thrown errors');
  assert(!client.includes('const responseJson = await response.json()'), 'translation API client must not parse unbounded response JSON');

  const utils = read('src/components/templates/main-app/projects/utils/translationsUtils.ts');
  [
    'menu_translation_file_empty_response',
    'menu_translation_file_failed',
    'menu_translation_category_empty_response',
    'menu_translation_category_failed',
    'menu_translation_item_empty_response',
    'menu_translation_item_failed',
    'translationKeyCount',
  ].forEach((token) => {
    assert(utils.includes(token), `translation utilities include bounded diagnostic token ${token}`);
  });
  assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(utils), 'translation utilities do not direct-console translation failures');
  assert(!utils.includes('Error getting translations for'), 'translation utilities do not embed raw language-pair diagnostics');

  const editor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
  assert(editor.includes('menu_translation_language_toggle_failed'), 'desktop language toggle catch logs bounded translation diagnostics');
  assert(editor.includes('menu_translation_file_retry_failed'), 'desktop file retry catch logs bounded translation diagnostics');
  assert(!editor.includes('console.error("Translation failed:", error)'), 'desktop editor does not direct-console translation failures');

  const editItemModal = read('src/components/templates/main-app/projects/editorView/editItemModal.tsx');
  assert(editItemModal.includes('menu_translation_item_retry_failed'), 'desktop item retry catch logs bounded translation diagnostics');
  assert(!editItemModal.includes("console.error('Translation failed:', error)"), 'desktop item modal does not direct-console translation failures');
}

{
  const aiServiceDiagnostics = read('src/services/ai/aiServiceDiagnostics.ts');
  [
    'secureError',
    'secureLog',
    'readJsonResponseWithLimit',
    'getBoundedAiServiceStringContext',
    'createAiServiceHttpError',
    'readAiServiceResponseJson',
    'AI_SERVICE_ROUTE_REQUEST_OPTIONS',
    "cache: 'no-store'",
    "credentials: 'same-origin'",
    "redirect: 'manual'",
    'logAiServiceFailure',
    'logAiServiceDiagnostic',
    "'[AI Service] Diagnostic'",
    'sourceErrorName',
    'sourceErrorCode',
    'sourceStatusCode',
    'parseFailureCode',
    'invalidFailureCode',
    'Promise<Record<string, unknown>>',
    'return payload as Record<string, unknown>;',
  ].forEach((token) => {
    assert(aiServiceDiagnostics.includes(token), `AI service diagnostics helper includes ${token}`);
  });

  const clientWrappers = [
    ['new item metadata client', 'src/services/ai/dataGeneration/getNewItemMetadataViaAPI.ts', 'ai_new_item_metadata_request_failed', 'ai_new_item_metadata_api_failed'],
    ['SEO generation client', 'src/services/ai/seo/generateSeoViaAPI.ts', 'ai_seo_generation_request_failed', 'ai_seo_generation_api_failed'],
    ['description generation client', 'src/services/ai/description/generateDescriptionViaAPI.ts', 'ai_description_request_failed', 'ai_description_api_failed'],
    ['image generation client', 'src/services/ai/image/generateImageViaApi.ts', 'ai_image_generation_request_failed', 'ai_image_generation_api_failed'],
    ['batch image trigger client', 'src/services/ai/image/triggerBatchImageGenerationApi.ts', 'ai_batch_image_trigger_request_failed', 'ai_batch_image_trigger_api_failed'],
    ['image edit client', 'src/services/ai/image/editImageViaApi.ts', 'ai_image_edit_request_failed', 'ai_image_edit_api_failed'],
    ['menu card design advisor client', 'src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts', 'ai_menu_card_design_advisor_request_failed', 'ai_menu_card_design_advisor_api_failed'],
    ['business copy generation client', 'src/services/ai/businessCopy/generateBusinessCopyViaAPI.ts', 'ai_business_copy_generation_request_failed', 'ai_business_copy_generation_api_failed'],
  ];

  clientWrappers.forEach(([label, relPath, requestFailureCode, catchFailureCode]) => {
    const source = read(relPath);
    assert(source.includes('AI_SERVICE_ROUTE_REQUEST_OPTIONS'), `${label} uses shared AI service request policy`);
    assert(source.includes('...AI_SERVICE_ROUTE_REQUEST_OPTIONS'), `${label} applies shared AI service request policy to fetch`);
    assert(source.includes('createAiServiceHttpError'), `${label} uses coded HTTP errors`);
    assert(source.includes('logAiServiceFailure'), `${label} uses bounded AI service diagnostics`);
    assert(source.includes(requestFailureCode), `${label} includes request failure code ${requestFailureCode}`);
    assert(source.includes(catchFailureCode), `${label} includes catch failure code ${catchFailureCode}`);
    assert(!source.includes('response.statusText'), `${label} does not copy raw response.statusText into errors`);
    assert(!source.includes('@lib/monitoring/logger'), `${label} does not use raw client logger for API failures`);
    assert(!source.includes('serverMessage'), `${label} does not build browser errors from raw server messages`);
    assert(!source.includes('errorJson?.details'), `${label} does not surface raw error details from API responses`);
    assert(!/\bconsole\.(?:error|warn|log)\s*\(/.test(source), `${label} does not direct-console API failures`);
  });

  const boundedAiResponseClients = [
    ['new item metadata client', 'src/services/ai/dataGeneration/getNewItemMetadataViaAPI.ts', 'NEW_ITEM_METADATA_RESPONSE_JSON_MAX_BYTES = 1024 * 1024', 'ai_new_item_metadata_response_parse_failed', 'ai_new_item_metadata_response_invalid'],
    ['SEO generation client', 'src/services/ai/seo/generateSeoViaAPI.ts', 'SEO_GENERATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024', 'ai_seo_generation_response_parse_failed', 'ai_seo_generation_response_invalid'],
    ['description generation client', 'src/services/ai/description/generateDescriptionViaAPI.ts', 'DESCRIPTION_GENERATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024', 'ai_description_response_parse_failed', 'ai_description_response_invalid'],
    ['image generation client', 'src/services/ai/image/generateImageViaApi.ts', 'IMAGE_GENERATION_RESPONSE_JSON_MAX_BYTES = 24 * 1024 * 1024', 'ai_image_generation_response_parse_failed', 'ai_image_generation_response_invalid'],
    ['batch image trigger client', 'src/services/ai/image/triggerBatchImageGenerationApi.ts', 'BATCH_IMAGE_TRIGGER_RESPONSE_JSON_MAX_BYTES = 64 * 1024', 'ai_batch_image_trigger_response_parse_failed', 'ai_batch_image_trigger_response_invalid'],
    ['image edit client', 'src/services/ai/image/editImageViaApi.ts', 'IMAGE_EDIT_RESPONSE_JSON_MAX_BYTES = 24 * 1024 * 1024', 'ai_image_edit_response_parse_failed', 'ai_image_edit_response_invalid'],
    ['business copy generation client', 'src/services/ai/businessCopy/generateBusinessCopyViaAPI.ts', 'BUSINESS_COPY_GENERATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024', 'ai_business_copy_generation_response_parse_failed', 'ai_business_copy_generation_response_invalid'],
  ];

  boundedAiResponseClients.forEach(([label, relPath, maxBytesToken, parseFailureCode, invalidFailureCode]) => {
    const source = read(relPath);
    assert(source.includes('readAiServiceResponseJson(response,'), `${label} parses successful responses through the bounded AI response helper`);
    assert(!source.includes('readAiServiceResponseJson<'), `${label} must not apply an unchecked generic response DTO`);
    assert(source.includes(maxBytesToken), `${label} declares response byte cap ${maxBytesToken}`);
    assert(source.includes(parseFailureCode), `${label} logs parse failures with ${parseFailureCode}`);
    assert(source.includes(invalidFailureCode), `${label} logs invalid responses with ${invalidFailureCode}`);
    assert(!source.includes('const responseJson = await response.json()'), `${label} must not parse unbounded response JSON`);
  });
  assert(!aiServiceDiagnostics.includes('return payload as T;'), 'AI response helper must not manufacture a caller-selected DTO type');
  [
    'src/services/ai/image/generateImageViaApi.ts',
    'src/services/ai/image/editImageViaApi.ts',
  ].forEach((relPath) => {
    const source = read(relPath);
    assert(source.includes('normalizeAiImageResponseItems(responseJson.data)'), `${relPath} validates every returned image item`);
  });

  const aiTranslationRequestPolicyClients = [
    ['menu translation client', 'src/components/templates/main-app/projects/generateTranslations.ts'],
    ['business copy localization client', 'src/services/ai/businessCopy/localizeBusinessCopyResult.ts'],
  ];

  aiTranslationRequestPolicyClients.forEach(([label, relPath]) => {
    const source = read(relPath);
    assert(source.includes('AI_SERVICE_ROUTE_REQUEST_OPTIONS'), `${label} uses shared AI service request policy`);
    assert(source.includes('...AI_SERVICE_ROUTE_REQUEST_OPTIONS'), `${label} applies shared AI service request policy to fetch`);
  });

  const descriptionUtils = read('src/services/ai/description/descriptionUtils.ts');
  [
    'ai_description_empty_response',
    'ai_description_file_generation_failed',
    'logAiServiceFailure(AI_DESCRIPTION_EMPTY_RESPONSE',
    'logAiServiceFailure(AI_DESCRIPTION_FILE_GENERATION_FAILED',
    "getBoundedAiServiceStringContext('projectId'",
    "getBoundedAiServiceStringContext('fileId'",
    "getBoundedAiServiceStringContext('sourceLanguage'",
    'targetLanguageCount',
  ].forEach((token) => {
    assert(descriptionUtils.includes(token), `description generation utility includes bounded diagnostic token ${token}`);
  });
  assert(!descriptionUtils.includes('@lib/monitoring/logger'), 'description generation utility must not import raw logger diagnostics');
  assert(!descriptionUtils.includes('logger.'), 'description generation utility must not use raw logger diagnostics');
  assert(!descriptionUtils.includes("logger.error('Description generation failed'"), 'description generation utility must not raw-log generation failures');
  assert(!descriptionUtils.includes("logger.warn('Description generation returned no data'"), 'description generation utility must not raw-log empty responses');

  const descriptionModal = read('src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx');
  [
    'menu_description_modal_generation_failed',
    'getDescriptionModalLogContext',
    'logRuntimeFailure(MENU_DESCRIPTION_MODAL_GENERATION_FAILED',
    "getBoundedRuntimeStringContext('projectId'",
    "getBoundedRuntimeStringContext('sourceFileId'",
    'itemsWithoutDescriptions',
  ].forEach((token) => {
    assert(descriptionModal.includes(token), `description generation modal includes bounded diagnostic token ${token}`);
  });
  assert(!descriptionModal.includes('@lib/monitoring/logger'), 'description generation modal must not import raw logger diagnostics');
  assert(!descriptionModal.includes("logger.error('Description generation failed', error"), 'description generation modal must not raw-log generation failures');

  const batchTrigger = read('src/services/ai/image/triggerBatchImageGenerationApi.ts');
  assert(batchTrigger.includes("throw new Error('Image generation could not start.');"), 'batch image trigger rethrows generic owner-safe startup error');

  const designAdvisor = read('src/services/ai/menuCardExport/getDesignAdviceViaAPI.ts');
  assert(designAdvisor.includes('throw new MenuCardDesignAdvisorPlanError();'), 'design advisor plan error uses local fixed owner-facing copy');

  const businessCopyTranslationRepair = read('src/services/ai/businessCopy/syncMissingBusinessCopyTranslations.ts');
  [
    'ai_business_copy_translation_repair_noop',
    'ai_business_copy_translation_repair_started',
    'ai_business_copy_translation_repair_empty_result',
    'ai_business_copy_translation_repair_succeeded',
    'getTranslationRepairLogContext',
    'logAiServiceDiagnostic(BUSINESS_COPY_TRANSLATION_REPAIR_NOOP',
    'logAiServiceDiagnostic(BUSINESS_COPY_TRANSLATION_REPAIR_STARTED',
    'logAiServiceFailure(BUSINESS_COPY_TRANSLATION_REPAIR_EMPTY_RESULT',
    'logAiServiceDiagnostic(BUSINESS_COPY_TRANSLATION_REPAIR_SUCCEEDED',
    "getBoundedAiServiceStringContext('projectId'",
    "getBoundedAiServiceStringContext('storeId'",
    "getBoundedAiServiceStringContext('referenceLanguage'",
    'targetLanguageCount',
    'developmentOnly: true',
  ].forEach((token) => {
    assert(businessCopyTranslationRepair.includes(token), `business copy translation repair includes bounded diagnostic token ${token}`);
  });
  assert(!businessCopyTranslationRepair.includes('@lib/monitoring/logger'), 'business copy translation repair must not import raw logger diagnostics');
  assert(!businessCopyTranslationRepair.includes('logger.'), 'business copy translation repair must not use raw logger diagnostics');
  assert(!businessCopyTranslationRepair.includes('targetLanguages: targetLanguages.map'), 'business copy translation repair must not log raw target language arrays');
  assert(!businessCopyTranslationRepair.includes('storeId: storeDetails?.storeId'), 'business copy translation repair must not log raw store IDs');

  const businessCopyLocalization = read('src/services/ai/businessCopy/localizeBusinessCopyResult.ts');
  [
    'readAiServiceResponseJson(response,',
    "getUnknownObjectValueAtPath(responseJson.data, ['translationsByLanguage'])",
    'BUSINESS_COPY_TRANSLATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024',
    'business_copy_batch_translation_response_parse_failed',
    'business_copy_batch_translation_response_invalid',
  ].forEach((token) => {
    assert(businessCopyLocalization.includes(token), `business copy localization response parser includes ${token}`);
  });
  assert(!businessCopyLocalization.includes('const responseJson = await response.json()'), 'business copy localization must not parse unbounded response JSON');
}

const boundedBillableBodyRoutes = [
  {
    route: 'src/app/api/business-copy/route.ts',
    cap: 'BUSINESS_COPY_AI_MAX_BODY_BYTES',
    validation: 'validateAPIInput(BusinessCopyGenerationRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkAIOperationLimit();',
  },
  {
    route: 'src/app/api/campaigns/caption/route.ts',
    cap: 'CAMPAIGN_CAPTION_AI_MAX_BODY_BYTES',
    validation: 'validateAPIInput(CampaignCaptionRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkAIOperationLimit();',
  },
  {
    route: 'src/app/api/descriptions/route.ts',
    cap: 'DESCRIPTION_AI_MAX_BODY_BYTES',
    validation: 'validateAPIInput(DescriptionRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkAIOperationLimit();',
  },
  {
    route: 'src/app/api/image-editing/route.ts',
    cap: 'IMAGE_EDITING_AI_MAX_BODY_BYTES',
    validation: 'validateAPIInput(ImageEditingRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkExpensiveAILimit();',
  },
  {
    route: 'src/app/api/image-generation/batch-trigger/route.ts',
    cap: 'BATCH_IMAGE_TRIGGER_MAX_BODY_BYTES',
    validation: 'validateAPIInput(BatchImageGenerationRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkBatchOperationLimit();',
  },
  {
    route: 'src/app/api/image-generation/route.ts',
    cap: 'IMAGE_GENERATION_AI_MAX_BODY_BYTES',
    validation: 'validateAPIInput(ImageGenerationRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkExpensiveAILimit();',
  },
  {
    route: 'src/app/api/menu-card-export/design-advisor/route.ts',
    cap: 'MENU_CARD_DESIGN_ADVISOR_MAX_BODY_BYTES',
    validation: 'validateAPIInput(MenuCardDesignAdvisorRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkAIOperationLimit();',
    reader: 'readBoundedJsonBody(',
  },
  {
    route: 'src/app/api/new-item-metadata/route.ts',
    cap: 'NEW_ITEM_METADATA_AI_MAX_BODY_BYTES',
    validation: 'validateAPIInput(NewItemMetadataRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkAIOperationLimit();',
  },
  {
    route: 'src/app/api/reviews/suggest/route.ts',
    cap: 'REVIEW_SUGGEST_MAX_BODY_BYTES',
    validation: 'SuggestSchema.safeParse(bodyResult.data)',
    gate: 'const rateLimitResult = await checkRateLimit({',
  },
  {
    route: 'src/app/api/seo/route.ts',
    cap: 'SEO_AI_MAX_BODY_BYTES',
    validation: 'validateAPIInput(SeoGenerationRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkAIOperationLimit();',
  },
  {
    route: 'src/app/api/translations/route.ts',
    cap: 'TRANSLATION_AI_MAX_BODY_BYTES',
    validation: 'validateAPIInput(TranslationRequestSchema, rawData)',
    gate: 'const rateLimitResponse = await checkAIOperationLimit();',
  },
];

for (const { route, cap, validation, gate, reader } of boundedBillableBodyRoutes) {
  const source = read(route);
  assert(source.includes('readBoundedJsonBody'), `${route} uses bounded JSON body reader`);
  assert(source.includes(cap), `${route} declares explicit AI request body cap`);
  assertOrder(
    source,
    route,
    [
      gate,
      reader || `readBoundedJsonBody(request, ${cap}`,
      cap,
      validation,
      'checkAICapacity(',
    ],
    'bounds JSON before validation and AI capacity/provider work',
  );
}

[
  [
    'src/app/api/business-copy/route.ts',
    [
      'const attemptedData = getAIRouteLogContext({',
      'categoryCount: Array.isArray(rawData?.menu?.categories) ? rawData.menu.categories.length : 0',
      'itemCount: Array.isArray(rawData?.menu?.items) ? rawData.menu.items.length : 0',
      'sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang',
      'storeName: rawData?.store?.name',
      'attemptedData,',
      'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
    ],
    'business copy validation failure uses bounded attempted-data diagnostics',
  ],
  [
    'src/app/api/seo/route.ts',
    [
      'const attemptedData = getSeoAttemptedInputSummary(rawData)',
      "typeof record.menu === 'object'",
      "typeof record.store === 'object'",
      'categoryCount: Array.isArray(menu.categories) ? menu.categories.length : 0',
      'itemCount: Array.isArray(menu.items) ? menu.items.length : 0',
      'storeName: store.name',
      'attemptedData,',
      'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
    ],
    'SEO validation failure uses bounded attempted-data diagnostics',
  ],
  [
    'src/app/api/descriptions/route.ts',
    [
      'const attemptedData = getAIRouteLogContext({',
      'action: rawData?.action',
      'itemCount: Array.isArray(rawData?.itemsList) ? rawData.itemsList.length : 0',
      'sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang',
      'targetLang: rawData?.targetLang?.code || rawData?.targetLang',
      'attemptedData,',
      'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
    ],
    'description validation failure uses bounded attempted-data diagnostics',
  ],
  [
    'src/app/api/translations/route.ts',
    [
      'const attemptedData = getAIRouteLogContext({',
      'action: rawData?.action',
      'inputKeyCount: Object.keys(rawData?.inputJson || {}).length',
      'sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang',
      'targetLang: rawData?.targetLang?.code || rawData?.targetLang',
      'attemptedData,',
      'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
    ],
    'translation validation failure uses bounded attempted-data diagnostics',
  ],
  [
    'src/app/api/new-item-metadata/route.ts',
    [
      'const attemptedData = getAIRouteLogContext({',
      'contentLength: rawData?.contentLength',
      'itemCount: rawData?.item ? 1 : 0',
      'sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang',
      'targetLang: rawData?.targetLang?.code || rawData?.targetLang',
      'attemptedData,',
      'writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData)',
    ],
    'new item metadata validation failure uses bounded attempted-data diagnostics',
  ],
].forEach(([route, tokens, message]) => {
  const source = read(route);
  tokens.forEach((token) => {
    assert(source.includes(token), `${route} ${message}: ${token}`);
  });
  assert(!source.includes('writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, rawData)'), `${route} must not write raw invalid AI payloads to local validation logs`);
});

{
  const route = 'src/lib/ai/imageBatchIdBoundary.ts';
  const source = read(route);
  [
    "import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';",
    'IMAGE_BATCH_JOB_ID_PATTERN = /^[A-Za-z0-9]{20}$/',
    'IMAGE_BATCH_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/',
    'export function normalizeImageBatchScopeDocumentId',
    'Number.isSafeInteger(numericId)',
    'String(numericId) !== documentId',
    'export function normalizeImageBatchProjectId',
    "const parts = projectId.split('-');",
    'const tenantScope = normalizeImageBatchScopeDocumentId(parts[0]);',
    'const storeScope = normalizeImageBatchScopeDocumentId(parts[parts.length - 1]);',
    'export function normalizeImageBatchJobId',
  ].forEach((token) => {
    assert(source.includes(token), `${route} includes image batch ID boundary token ${token}`);
  });
}

{
  const route = 'src/lib/validation/apiSchemas.ts';
  const source = read(route);
  [
    "import { normalizeImageBatchJobId, normalizeImageBatchProjectId } from '@lib/ai/imageBatchIdBoundary';",
    'projectId: z.string().max(160).refine((value) => normalizeImageBatchProjectId(value)?.projectId === value)',
    'jobId: z.string().max(100).refine((value) => normalizeImageBatchJobId(value) === value)',
  ].forEach((token) => {
    assert(source.includes(token), `${route} validates image batch IDs with shared boundary: ${token}`);
  });
  assert(!source.includes('projectId: z.string().max(100),\n    itemsList:'), `${route} batch trigger schema must not use loose project IDs`);
  assert(!source.includes('projectId: z.string().max(100),\n    businessType:'), `${route} batch worker schema must not use loose project IDs`);
  assert(!source.includes('jobId: z.string().max(100)\n});'), `${route} batch schemas must not use loose job IDs`);
}

{
  const route = 'src/app/api/image-generation/batch-trigger/route.ts';
  const source = read(route);
  const taskStartLogStart = source.indexOf("logType: 'BATCH_GENERATION_TASK_STARTED'");
  const taskStartLogEnd = source.indexOf('await updateImageBatchProcessingJobAdmin', taskStartLogStart);
  const taskStartLog = source.slice(taskStartLogStart, taskStartLogEnd);
  [
    "import { normalizeImageBatchJobId, normalizeImageBatchProjectId } from '@lib/ai/imageBatchIdBoundary';",
    'projectId: requestedProjectId',
    'jobId: requestedJobId',
    'const projectScope = normalizeImageBatchProjectId(requestedProjectId);',
    'const jobId = normalizeImageBatchJobId(requestedJobId);',
    'const projectId = projectScope.projectId;',
  ].forEach((token) => {
    assert(source.includes(token), `${route} normalizes batch trigger IDs: ${token}`);
  });
  assertOrder(
    source,
    route,
    [
      'const validation = validateAPIInput(BatchImageGenerationRequestSchema, rawData);',
      'const projectScope = normalizeImageBatchProjectId(requestedProjectId);',
      'const jobId = normalizeImageBatchJobId(requestedJobId);',
      'const projectId = projectScope.projectId;',
      'const permissionError = await requireAnyStorePermission(',
    ],
    'normalizes project/job IDs before permission, policy, capacity, and task fanout work',
  );
  assert(source.includes("'Image generation could not start.'"), `${route} uses owner-safe all-task enqueue failure reason`);
  assert(source.includes("'Some image generation tasks could not start.'"), `${route} uses owner-safe partial enqueue failure reason`);
  assert(source.includes("'Could not start the image batch. Please try again.'"), `${route} returns generic catch response`);
  assert(source.includes('getImageGenerationTaskConfigStatus'), `${route} checks Cloud Tasks config before capacity/enqueue`);
  assert(source.includes('IMAGE_BATCH_TASK_CONFIG_MISSING'), `${route} uses stable missing-config code`);
  assert(source.includes('image_batch_config_block_status_update_failed'), `${route} codes config-block status update failures`);
  assert(source.includes("const reason = 'Image generation is temporarily unavailable.'"), `${route} uses owner-safe missing-config reason`);
  assertOrder(
    source,
    route,
    [
      'const taskConfigStatus = getImageGenerationTaskConfigStatus();',
      'if (!taskConfigStatus.ready)',
      'const capacityCheck = await checkAICapacity(',
      "businessType: businessType || '',",
    ],
    'checks Cloud Tasks config before capacity reads and enqueue fanout',
  );
	  assert(source.includes('IMAGE_BATCH_TASK_ENQUEUE_FAILED'), `${route} uses stable enqueue failure codes`);
	  assert(source.includes('getBatchGenerationConfigSummary'), `${route} summarizes batch generation config before local start logging`);
	  assert(source.includes('generationConfigSummary: getBatchGenerationConfigSummary'), `${route} writes batch trigger config summaries`);
	  assert(source.includes('itemsWithoutPromptsCount'), `${route} reports no-prompt failures by count only`);
	  assert(source.includes('itemsWithIdCount'), `${route} logs item ID presence by count only`);
	  assert(!source.includes('itemsWithoutPrompts.push(itemDetails.id'), `${route} must not collect raw item identifiers for no-prompt responses`);
	  assert(!source.includes('items: promptEstimate.itemsWithoutPrompts'), `${route} must not return raw no-prompt item identifiers`);
	  assert(taskStartLogStart >= 0 && taskStartLogEnd > taskStartLogStart, `${route} local task-start log block is detectable`);
	  assert(!taskStartLog.includes('generationConfig: sanitizeImageGenerationConfigForLogging'), `${route} must not write raw generation config payloads to local batch-trigger logs`);
	  assert(!taskStartLog.includes('itemIds: itemsList.map((item) => item.id)'), `${route} must not write raw item ID arrays to local batch-trigger logs`);
	  assert(!source.includes('message: errorMessage'), `${route} must not return raw exception messages`);
  assert(!source.includes('as unknown as Required<Pick<GenerateImageViaApiPayloadBatchType'), `${route} must use the validated batch DTO without a double assertion`);
  assert(!source.includes('const rawData = bodyResult.data as any'), `${route} raw input must remain unknown until validation`);
  assert(!source.includes('Record<string, any>'), `${route} config summaries must retain unknown boundaries`);
  assert(!source.includes('writeMissingParamsLogEntry(LOG_FILE, userId, rawData?.projectId'), `${route} validation local logs must not write raw project IDs into local log fields`);
  assert(source.includes('attemptedData: {\n                    ...requestLogContext,'), `${route} validation local logs reuse bounded request context`);
  assert(!source.includes('result.reason instanceof Error ? result.reason.message'), `${route} must not log raw rejected task messages`);
  assert(!source.includes('e.message ||'), `${route} must not summarize raw enqueue exception messages`);
  assert(!source.includes('GCT FAILURE'), `${route} must not expose internal Cloud Tasks labels`);
  assert(source.includes("import { mapWithConcurrency } from '@lib/async/boundedConcurrency';"), `${route} reuses bounded concurrency for Cloud Tasks creation`);
  assert(source.includes('const IMAGE_BATCH_TASK_ENQUEUE_CONCURRENCY = 8;'), `${route} caps concurrent Cloud Tasks creation`);
  assert(source.includes('await mapWithConcurrency('), `${route} applies the enqueue concurrency cap`);
  assert(!source.includes('const taskPromises = itemsList.map'), `${route} does not create every Cloud Task request simultaneously`);
}

{
  const route = 'src/app/api/image-generation/batch-generation/route.ts';
  const source = read(route);
  [
    'checkRateLimit',
    'getRateLimitForFeature',
    'hashPublicRateLimitValue',
    "const BATCH_IMAGE_WORKER_RATE_LIMIT_KEY = 'batch-image-worker';",
    'async function applyBatchImageWorkerRateLimit',
    "getRateLimitForFeature('BATCH_IMAGE_WORKER')",
    'key: `${BATCH_IMAGE_WORKER_RATE_LIMIT_KEY}:${tenantRateLimitHash}:${storeRateLimitHash}`',
    "logger.security('Rate Limit Exceeded - Batch Image Worker'",
    'normalizeImageBatchJobId',
    'normalizeImageBatchProjectId',
    'projectId: requestedProjectId',
    'jobId: requestedJobId',
    'const projectScope = normalizeImageBatchProjectId(requestedProjectId);',
    'const jobId = normalizeImageBatchJobId(requestedJobId);',
    'const { projectId, sId, tId } = projectScope;',
  ].forEach((token) => {
    assert(source.includes(token), `${route} normalizes batch worker IDs: ${token}`);
  });
  assert(source.includes('readBoundedJsonBody'), `${route} uses bounded JSON body reader`);
  assert(source.includes('BATCH_IMAGE_WORKER_MAX_BODY_BYTES'), `${route} declares explicit worker request body cap`);
  assert(source.includes('getBatchWorkerLogContext'), `${route} uses bounded worker diagnostic context`);
  assert(source.includes("logRuntimeFailure('image_batch_worker_safe_mode_check_failed'"), `${route} logs SAFE_MODE failures with a stable code`);
  assert(source.includes("failOpen: false"), `${route} marks SAFE_MODE check failures as fail-closed diagnostics`);
  assert(source.includes("getBoundedRuntimeStringContext('itemId', item.id)"), `${route} bounds batch item IDs in summaries`);
  assert(source.includes("getBoundedRuntimeStringContext('itemName', item.name)"), `${route} bounds batch item names in summaries`);
  assert(!source.includes("} catch { /* fail-open */ }"), `${route} must not silently fail open on SAFE_MODE check errors`);
  assertOrder(
    source,
    route,
    [
      'hasValidWorkerSecret(request)',
      'readBoundedJsonBody(request, BATCH_IMAGE_WORKER_MAX_BODY_BYTES',
      'validateAPIInput(BatchImageGenerationWorkerRequestSchema, rawData)',
      'const projectScope = normalizeImageBatchProjectId(requestedProjectId);',
      'const jobId = normalizeImageBatchJobId(requestedJobId);',
      'const rateLimitResponse = await applyBatchImageWorkerRateLimit({ jobId, sId, tId });',
      'getImageBatchProcessingJobByIdAdmin',
      'checkAICapacity(',
    ],
    'verifies worker secret, bounds JSON, normalizes IDs, and rate-limits before job reads and provider work',
  );
  const rateLimitConfigs = read('src/lib/rateLimit/configs.ts');
  assert(rateLimitConfigs.includes('BATCH_IMAGE_WORKER: {'), 'rate limit configs include batch image worker profile');
  assert(rateLimitConfigs.includes("description: 'Batch image worker - 600 per minute per store'"), 'rate limit configs document batch image worker profile');
  assert(!source.includes('key: `batch-image-worker:${tId'), `${route} must not store raw tenant IDs in worker limiter keys`);
  assert(!source.includes('key: `batch-image-worker:${sId'), `${route} must not store raw store IDs in worker limiter keys`);
  assert(!source.includes('const [tId, , sId] = projectId.split("-")'), `${route} must not split worker project IDs directly`);
  assert(source.includes("const ownerSafeReason = 'Image generation failed for this item.'"), `${route} uses generic owner-visible item reason`);
  assert(source.includes('image_batch_worker_generation_failed'), `${route} codes worker generation failures`);
  assert(source.includes('image_batch_worker_failure_status_update_failed'), `${route} codes worker failure-status update failures`);
  assert(source.includes('reason: ownerSafeReason'), `${route} persists generic item error through the item-attempt boundary`);
  assert(source.includes('reason: ownerSafeReason'), `${route} persists generic item status reason`);
  assert(source.includes('return NextResponse.json({ error: ownerSafeReason }, { status: 200 });'), `${route} returns generic worker task error`);
  assert(source.includes("message: 'Image generation completed for this item.'"), `${route} returns generic worker success text`);
  assert(source.includes('image_batch_worker_job_not_found'), `${route} codes missing-job skip diagnostics`);
  assert(source.includes('logRuntimeDiagnostic(IMAGE_BATCH_WORKER_JOB_NOT_FOUND'), `${route} logs missing-job skips with stable code`);
  assert(!source.includes('logger.error'), `${route} must not raw-log worker failures`);
  assert(!source.includes("logger.warn('Batch image generation task skipped - job not found'"), `${route} must not use ad hoc missing-job skip warnings`);
  assert(!source.includes('Batch image generation API error'), `${route} must not use legacy raw worker failure message`);
  assert(!source.includes('as unknown as GenerateImageViaApiPayloadBatchType'), `${route} must use the validated worker DTO without a double assertion`);
  assert(!source.includes('const rawData = bodyResult.data as any'), `${route} raw input must remain unknown until validation`);
  assert(!source.includes('Record<string, any>'), `${route} config summaries must retain unknown boundaries`);
  assert(!source.includes('Failed to update batch job with error status'), `${route} must not use legacy raw job-update failure message`);
  assert(!source.includes('Processing failed for ${itemDetails.name}-${itemDetails.id}: ${errorMessage}'), `${route} must not return raw worker exception messages`);
  assert(!source.includes('Image generation completed for item ${itemDetails.name}-${itemDetails.id}'), `${route} must not return raw item identifiers on success`);
  assert(!source.includes('Image generation failed for item ${itemDetails.name}-${itemDetails.id}'), `${route} must not persist raw item identifiers on failure`);
  assert(!source.includes('id: item.id'), `${route} must not log raw summarized item IDs`);
  assert(!source.includes('name: item.name'), `${route} must not log raw summarized item names`);
  assert(!source.includes('writeMissingParamsLogEntry(LOG_FILE, userIdForLog, rawData?.projectId'), `${route} validation local logs must not write raw project IDs into local log fields`);
  assert(!source.includes('projectId: rawData?.projectId,\n        });'), `${route} validation local logs must not write raw project IDs in data`);
  assert(source.includes('attemptedData: getBatchWorkerLogContext({'), `${route} validation local logs use bounded attempted-data summaries`);
  assert(!source.includes("logger.debug('Fetched job data'"), `${route} must not debug-log fetched job breadcrumbs`);
  assert(!source.includes("logger.debug('Images uploaded'"), `${route} must not debug-log uploaded image breadcrumbs`);
  assert(!source.includes("logger.debug('Batch image generation transaction recorded'"), `${route} must not debug-log raw transaction breadcrumbs`);
  assert(!source.includes("logger.debug('Batch generation capacity consumed'"), `${route} must not debug-log capacity balance breadcrumbs`);
  assert(!source.includes("logger.debug('Batch job updated'"), `${route} must not debug-log batch job update breadcrumbs`);
}

{
  const route = 'src/app/api/image-generation/batch-trigger/route.ts';
  const source = read(route);
  assert(source.includes('getBatchImageRouteLogContext'), `${route} uses bounded batch route diagnostic context`);
  assert(source.includes('getAIRouteSecurityContext(session, request)'), `${route} uses bounded AI route security context`);
  assert(source.includes('attemptedData: requestLogContext'), `${route} reuses bounded batch context for validation attempted data`);
  [
    'image_batch_policy_block_status_update_failed',
    'image_batch_prompt_block_status_update_failed',
    'image_batch_capacity_block_status_update_failed',
    'image_batch_task_enqueue_failed',
    'image_batch_task_enqueue_rejected',
    'image_batch_trigger_api_failed',
  ].forEach((token) => {
    assert(source.includes(token), `${route} includes bounded batch-trigger diagnostic token ${token}`);
  });
  assert(source.includes('logRuntimeFailure(IMAGE_BATCH_TASK_ENQUEUE_FAILED'), `${route} logs enqueue failures with stable code`);
  assert(source.includes('logRuntimeDiagnostic(IMAGE_BATCH_TASK_ENQUEUE_REJECTED'), `${route} logs rejected enqueue summaries with stable code`);
  assert(!source.includes("logger.error('Failed to mark image batch job failed"), `${route} must not raw-log job status update failures`);
  assert(!source.includes("logger.error('Failed to enqueue image batch task'"), `${route} must not raw-log task enqueue failures`);
  assert(!source.includes('logger.warn(`Some tasks failed to enqueue`'), `${route} must not use ad hoc task enqueue warning diagnostics`);
  assert(!source.includes("logger.error('Batch trigger API error'"), `${route} must not raw-log top-level route failures`);
  assert(!source.includes('buildSecurityContext'), `${route} must not spread raw security context into security logs`);
  assert(!source.includes('projectId: rawData?.projectId,\n                    jobId: rawData?.jobId'), `${route} must not log raw project/job IDs in validation attempted data`);
  assert(!source.includes('\n                projectId,\n                reason: outletPolicyBlockReason,'), `${route} must not log raw project IDs in outlet policy security events`);
  assert(!source.includes('{ jobId, projectId }'), `${route} must not pass raw job/project IDs into failure diagnostics`);
}

{
  const route = 'src/lib/google/cloudTask/index.ts';
  const source = read(route);
  assert(source.includes('let client: CloudTasksClient | null = null'), `${route} lazily initializes CloudTasksClient`);
  assert(source.includes('getImageGenerationTaskConfigStatus'), `${route} exposes Cloud Tasks config readiness`);
  assert(source.includes('cloud_tasks_batch_image_config_missing'), `${route} codes missing Cloud Tasks config`);
  assert(source.includes('getCloudTasksClient'), `${route} wraps CloudTasksClient initialization`);
  assert(source.includes('getImageGenerationTaskLogContext'), `${route} uses bounded task diagnostic context`);
  assert(source.includes('cloud_tasks_client_initialization_failed'), `${route} codes client initialization failure`);
  assert(source.includes('cloud_tasks_batch_image_task_create_failed'), `${route} codes task creation failure`);
  assert(source.includes("getBoundedRuntimeStringContext('taskName', response.name)"), `${route} bounds task-name logging`);
  assertOrder(
    source,
    route,
    [
      'const configStatus = getImageGenerationTaskConfigStatus();',
      'if (!configStatus.ready)',
      'const cloudTasksClient = getCloudTasksClient();',
    ],
    'checks config before CloudTasksClient initialization',
  );
  assert(!source.includes('logger.error'), `${route} must not use raw logger error diagnostics`);
  assert(!source.includes('Failed to initialize CloudTasksClient'), `${route} must not use legacy raw client init failure message`);
  assert(!source.includes('Error creating batch image generation task'), `${route} must not use legacy raw task create failure message`);
  assert(!source.includes('writeLogEntry'), `${route} must not write unreachable raw helper fallback logs`);
  assert(!/itemId:\s*data\.itemDetails/.test(source), `${route} must not log raw item IDs`);
  assert(!/jobId:\s*data\.jobId/.test(source), `${route} must not log raw job IDs`);
  assert(!/projectId:\s*data\.projectId/.test(source), `${route} must not log raw project IDs`);
}

{
  const route = 'src/database/imageBatchProcessing/index.tsx';
  const source = read(route);
  [
    'normalizeImageBatchJobId',
    'normalizeImageBatchProjectId',
    'normalizeImageBatchScopeDocumentId',
    'isImageBatchOwnerOutcomeAlreadyCommitted',
    'export function assertImageBatchJobCreateSucceeded',
    'export function assertImageBatchJobUpdateSucceeded',
    'isImageBatchJobUpdateResult',
    'getImageBatchRetentionFields',
    'itemsExpiresAt',
    'expiresAt',
    'IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES',
    'satisfies ImageBatchJobUpdateResult',
    'where("projectId", "==", projectScope.projectId)',
    'const jobId = normalizeImageBatchJobId(data.id);',
    'const docRef = await getDocRef(jobId, { tId: projectScope.tId, sId: projectScope.sId });',
  ].forEach((token) => {
    assert(source.includes(token), `${route} includes batch job acknowledgement token ${token}`);
  });
  assertOrder(
    source,
    route,
    [
      'if (isImageBatchOwnerOutcomeAlreadyCommitted(currentJob, data.status, data.selectedImagesPersisted))',
      'if (!isAllowedImageBatchOwnerTransition(currentJob.status, data.status))',
      'transaction.update(docRef, finalUpdateData);',
    ],
    'converges identical terminal owner retries before transition rejection or another write',
  );
  assert(!source.includes('const [tId, _, sId] = projectId.split("-")'), `${route} must not split image batch project IDs directly`);
}

{
  const clientBoundary = read('src/lib/ai/imageBatchClientBoundary.ts');
  const serverBoundary = read('src/lib/ai/imageBatchServerBoundary.ts');
  [
    ['client boundary', clientBoundary],
    ['server boundary', serverBoundary],
  ].forEach(([label, source]) => {
    assert(
      source.includes("typeof value.selectedImagesPersisted === 'boolean'")
        && source.includes('selectedImagesPersisted: value.selectedImagesPersisted'),
      `image batch ${label} preserves explicit false selected-image outcomes`,
    );
  });
  assert(
    clientBoundary.includes('export function isImageBatchOwnerOutcomeAlreadyCommitted'),
    'image batch client boundary exports exact terminal-outcome convergence helper',
  );
}

{
  const route = 'src/database/imageBatchProcessing/server.ts';
  const source = read(route);
  [
    'normalizeImageBatchJobId',
    'normalizeImageBatchProjectId',
    'normalizeImageBatchScopeDocumentId',
    'function requireImageBatchJobId',
    'function requireImageBatchProjectScope',
    'const jobId = requireImageBatchJobId(id);',
    'const projectScope = requireImageBatchProjectScope(projectId);',
    'getImageBatchRetentionFields',
    'itemsExpiresAt',
    'expiresAt',
    'IMAGE_BATCH_TERMINAL_JOB_STATUS_VALUES',
    'type ImageBatchItemAttemptFailureResult = {',
    'runTransaction<ImageBatchItemAttemptFailureResult>',
    'const finalData: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {',
    'transaction.update(jobRef, finalData);',
    "import { sanitizeForFirestore } from \"@lib/firestore/sanitizeForFirestore\";",
    "return sanitizeForFirestore(value, { undefinedObjectValue: 'omit' });",
    'Timestamp.fromMillis(now + IMAGE_BATCH_JOB_RETENTION_DAYS * DAY_MS)',
    'Timestamp.fromMillis(now + IMAGE_BATCH_ITEMS_RETENTION_DAYS * DAY_MS)',
  ].forEach((token) => {
    assert(source.includes(token), `${route} includes server batch job retention token ${token}`);
  });
  assert(
    !source.includes('transaction.set(jobRef, finalData, { merge: true });'),
    `${route} must not recreate a missing batch job during an update`,
  );
  assert(!source.includes('const [tId, , sId] = projectId.split("-")'), `${route} must not split image batch project IDs directly`);
}

{
  [
    ['AI image implementation docs', '__docs__/projects/ai-image-generation/ai-image-generation_impl.md'],
    ['AI image Firebase docs', '__docs__/projects/ai-image-generation/ai-image-generation_firebase.md'],
    ['AI System implementation docs', '__docs__/ai-system-layer/ai-system-layer_impl.md'],
    ['AI System Firebase docs', '__docs__/ai-system-layer/ai-system-layer_firebase.md'],
    ['Production-readiness audit', '__docs__/audits/menulist-production-readiness-audit.md'],
    ['Changelog', '__docs__/changelog.md'],
    ['Lowercase changelog', '__docs__/changelog.md'],
  ].forEach(([label, filePath]) => {
    const content = read(filePath);
    assert(content.includes('Batch image project/job ID boundary') || content.includes('Batch Image Project/Job ID Boundary'), `${label} documents batch image project/job ID boundary`);
    assert(content.includes('src/lib/ai/imageBatchIdBoundary.ts'), `${label} cites the image batch ID boundary helper`);
  });
  [
    ['AI image implementation docs', '__docs__/projects/ai-image-generation/ai-image-generation_impl.md'],
    ['AI image Firebase docs', '__docs__/projects/ai-image-generation/ai-image-generation_firebase.md'],
    ['Production-readiness audit', '__docs__/audits/menulist-production-readiness-audit.md'],
    ['Changelog', '__docs__/changelog.md'],
    ['Lowercase changelog', '__docs__/changelog.md'],
  ].forEach(([label, filePath]) => {
    const content = read(filePath);
    assert(content.includes('Batch Image Worker Rate-Limit Boundary') || content.includes('Batch image worker rate-limit boundary'), `${label} documents batch image worker rate-limit boundary`);
    assert(content.includes('BATCH_IMAGE_WORKER'), `${label} cites the batch image worker limiter profile`);
  });
}

{
  const route = 'functions/src/schedulers/menulistMaintenanceScheduler.ts';
  const source = read(route);
  const retentionBoundary = read('functions/src/schedulers/imageBatchRetentionBoundary.ts');
  [
    'runImageBatchJobRetentionCleanup',
    'image_batch_job_retention_cleanup',
    "where('itemsExpiresAt', '<=', params.now)",
    "where('expiresAt', '<=', params.now)",
    'getImageBatchImageUrls',
    'getImageBatchStorageCleanupUrls',
    'shouldDeleteImageBatchStorage',
    'media/menuItem',
    'IMAGE_BATCH_STORAGE_DELETE_FAILED',
  ].forEach((token) => {
    assert(source.includes(token), `${route} includes image batch retention cleanup token ${token}`);
  });
  assert(
    /import\s*{[\s\S]*getImageBatchImageUrls[\s\S]*getImageBatchStorageCleanupUrls[\s\S]*}\s*from '\.\/imageBatchRetentionBoundary';/.test(source),
    `${route} imports image batch URL helpers from the shared retention boundary`,
  );
  [
    'export function getImageBatchImageUrls',
    'IMAGE_BATCH_DELETE_ALL_STATUSES',
    'export const IMAGE_BATCH_STORAGE_DELETION_ENABLED = false',
    'global reference ledger or equivalent cross-project proof exists',
    'This branch is intentionally unreachable until exclusive-reference proof is',
  ].forEach((token) => {
    assert(retentionBoundary.includes(token), `image batch retention boundary includes ${token}`);
  });
  assert(!retentionBoundary.includes('image.isSelected'), 'image batch retention cleanup must not infer durable selection from job image rows');
}

{
  const protectedImageRoutes = [
    'src/app/api/image-generation/route.ts',
    'src/app/api/image-editing/route.ts',
    'src/app/api/image-generation/batch-trigger/route.ts',
    'src/app/api/image-generation/batch-generation/route.ts',
  ];
  protectedImageRoutes.forEach((route) => {
    const source = read(route);
    assert(source.includes("import { FEATURE_FLAGS }"), `${route} imports the shared feature flags`);
    assert(source.includes('if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION)'), `${route} enforces the image-generation master flag`);
  });

  const worker = read('src/app/api/image-generation/batch-generation/route.ts');
  assert(worker.includes("{ status: 503, headers: { 'Retry-After': '60' } }"), 'disabled batch workers keep admitted Cloud Tasks retryable');

  const projectImages = read('src/lib/image/projectImageGeneration.ts');
  assert(projectImages.includes("return { skippedReason: 'feature-disabled' }"), 'automatic project-cover generation respects the master flag');
  assert((projectImages.match(/if \(!FEATURE_FLAGS\.ENABLE_AI_IMAGE_GENERATION\)/g) || []).length >= 3, 'project and business-cover helpers fail closed when generation is disabled');

  const imageModal = read('src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx');
  [
    "setActiveTab(FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? preferredInitialTab : 'upload')",
    'FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION && initialBatchItemIdSet.size > 0',
    'FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION ? [{',
    'IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS',
  ].forEach((token) => assert(imageModal.includes(token), `image upload modal includes flag/limit token ${token}`));

  const batchSelection = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx');
  assert(batchSelection.includes('applySelectionLimit'), 'batch item selection applies the visible 50-item cap before navigation');
  assert(batchSelection.includes('IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS'), 'batch item selection uses the shared project-selection maximum');
  assert(!batchSelection.includes('Math.ceil(selectedItemsForBatch.length * 0.5)'), 'batch item selection must not show an unsupported fixed duration estimate');

  const batchConfig = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationView.tsx');
  assert(!batchConfig.includes("from '@ant-design/icons'"), 'batch image configuration uses the approved Lucide icon library');
  assert(!batchConfig.includes('Use Smart Defaults'), 'batch image configuration avoids prohibited Smart owner copy');
  assert(batchConfig.includes('Use Recommended Defaults'), 'batch image configuration exposes plain recommended-default copy');

  const mobileMenu = read('src/components/mobile/screens/MobileMenuScreen.tsx');
  assert(
    mobileMenu.includes("openImageUploadModal(editingItem.id, 'item', 'generate', [], editingItem.fileId)"),
    'mobile Generate image opens the generation tab with the exact source-file identity',
  );
  assert(mobileMenu.includes('FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION && filters.hasImage === false'), 'mobile missing-image batch entry respects the master flag');

  const uploadedImages = read('src/components/templates/main-app/projects/editorView/uploadedImagesList.tsx');
  assert(uploadedImages.includes('!disabled && FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION'), 'image editing UI respects the master flag while delete remains available');

  const aiMenuManagerActions = read('src/lib/ai-menu-manager/actionTypes.ts');
  assert(
    (aiMenuManagerActions.match(/requiredFlags: \['ENABLE_AI_MENU_MANAGER_IMAGE_ACTIONS', 'ENABLE_AI_IMAGE_GENERATION'\]/g) || []).length >= 3,
    'AI Menu Manager image actions require both the assistant image flag and the image-generation master flag',
  );
  const aiMenuManagerPrompts = read('src/lib/ai-menu-manager/projectPromptHints.ts');
  assert(
    (aiMenuManagerPrompts.match(/FEATURE_FLAGS\.ENABLE_AI_IMAGE_GENERATION && missingImageItem/g) || []).length >= 2,
    'AI Menu Manager does not recommend disabled image-generation actions',
  );
  const aiMenuManagerConversation = read('src/lib/ai-menu-manager/domainConversationRouter.ts');
  assert(
    aiMenuManagerConversation.includes('suggestedReplies: FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION'),
    'AI Menu Manager photo-gap answers hide disabled generation replies',
  );
}

{
  const route = 'src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx';
  const source = read(route);
  [
    'assertImageBatchJobCreateSucceeded',
    'image_upload_batch_job_create_rejected',
    'createAndTriggerBatchGeneration',
    'triggerResult.partial',
    'We could not confirm that image generation started. Check this job before trying again.',
  ].forEach((token) => {
    assert(source.includes(token), `${route} includes batch start acknowledgement token ${token}`);
  });
}

{
  const route = 'src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/BatchImageGenerationResultView.tsx';
  const source = read(route);
  [
    'assertImageBatchJobUpdateSucceeded',
    'image_batch_result_cancel_failed',
    'image_batch_result_cancel_update_rejected',
    'image_batch_result_upload_failed',
    'image_batch_result_upload_update_rejected',
    'image_batch_result_discard_failed',
    'image_batch_result_discard_update_rejected',
    'image_batch_result_retry_failed',
    'await onRetry(activeJobData)',
    'IMAGE_BATCH_JOB_FAILED_OWNER_COPY',
    'Image generation could not finish. Try again with fewer items or start a new batch.',
    'getBatchResultLogContext',
    "getBoundedRuntimeStringContext('jobId'",
    "getBoundedRuntimeStringContext('projectId'",
    'generatedImageCount',
    'selectedImageCount',
    'logRuntimeFailure(IMAGE_BATCH_RESULT_CANCEL_FAILED',
    'logRuntimeFailure(IMAGE_BATCH_RESULT_UPLOAD_FAILED',
    'logRuntimeFailure(IMAGE_BATCH_RESULT_DISCARD_FAILED',
    'logRuntimeFailure(IMAGE_BATCH_RESULT_RETRY_FAILED',
    'selectedImagesPersisted: action === "upload"',
    'selectedImagesPersisted: true',
    'normalizeImageBatchProjectSelections',
    'await onBatchImagesPersist(selections)',
    'No images will be added to your menu',
    'Your current menu images will not change.',
  ].forEach((token) => {
    assert(source.includes(token), `${route} includes bounded batch result diagnostic token ${token}`);
  });
  assert(!source.includes('deleteFileByUrl'), `${route} must not delete content-addressed generated media from browser-only reference truth`);
  assert(!source.includes('cleanupGeneratedImages'), `${route} must not infer exclusive Storage ownership from batch review state`);
  assert(!source.includes('.forEach(async'), `${route} must not launch unobserved asynchronous cleanup`);
  assert(!source.includes('new Promise<void>(async'), `${route} must not use an async Promise constructor`);
  assert(!source.includes("import { logger }"), `${route} must not import raw logger diagnostics`);
  assert(!source.includes("logger.error('Error cancelling batch job', error"), `${route} must not raw-log cancel failures`);
  assert(!source.includes("logger.error('Error updating batch job status', error"), `${route} must not raw-log batch status failures`);
  assert(!source.includes('activeJobData.error'), `${route} must not render stored batch job error text`);
  assert(!/jobId:\s*activeJobData/.test(source), `${route} must not log raw active job IDs`);
  assert(!/projectId:\s*activeJobData/.test(source), `${route} must not log raw active project IDs`);

  const selectionBoundary = read('src/lib/ai/imageBatchProjectSelection.ts');
  [
    'normalizeImageBatchProjectSelections',
    'isImageBatchGeneratedStorageAsset',
    'IMAGE_BATCH_PROJECT_SELECTION_MAX_ITEMS',
    'IMAGE_BATCH_PROJECT_MAX_IMAGES_PER_ITEM',
    'appendImageBatchSelectionsToProject',
    'appendImageBatchSelectionsToOutletProject',
    'expectedBucket?: string',
    'expectedBucket,',
    'image_batch_project_item_missing',
    'image_batch_project_item_image_limit_exceeded',
  ].forEach((token) => {
    assert(selectionBoundary.includes(token), `image batch project selection boundary includes ${token}`);
  });

  const projectsDal = read('src/database/projects/index.ts');
  [
    'appendImageBatchProjectSelections',
    'normalizeMenuChangeLogScope(operationSession)',
    "const expectedBucket = firebaseStorage?.app?.options?.storageBucket",
    'normalizeImageBatchProjectSelections(rawSelections, projectId, expectedBucket)',
    'runTransaction(firebaseClient',
    'transaction.get(projectRef)',
    'appendImageBatchSelectionsToProject(current, selections)',
    "revalidatePublicClientCacheForProject(projectId, 'appendImageBatchProjectSelections')",
    "operation: 'append_image_batch_selection'",
  ].forEach((token) => {
    assert(projectsDal.includes(token), `image batch project selection DAL includes ${token}`);
  });

  const outletSaveRoute = read('src/app/api/projects/outlet-save/route.ts');
  [
    'append_image_batch_selection',
    'const expectedBucket = storageAdmin.bucket().name',
    'normalizeImageBatchProjectSelections(',
    'db.runTransaction',
    'transaction.get(persistedOutletProjectRef)',
    'transaction.get(masterProjectDocumentRef)',
    'outletPolicy.imageOverride !== true',
    'appendImageBatchSelectionsToOutletProject',
    'transaction.set(persistedOutletProjectRef, safeProject, { merge: true })',
    'linkedOutletImageBatchSelection',
  ].forEach((token) => {
    assert(outletSaveRoute.includes(token), `linked outlet image batch append includes ${token}`);
  });

  const desktopEditor = read('src/components/templates/main-app/projects/editorView/Editor.tsx');
  assert(desktopEditor.includes('activeEditorSavePromiseRef'), 'desktop image batch append serializes against active editor saves');
  assert(desktopEditor.includes('await persistEditorProject(projectData)'), 'desktop image batch append flushes pending editor changes first');

  const mobileMenu = read('src/components/mobile/screens/MobileMenuScreen.tsx');
  assert(mobileMenu.includes('waitForMenuPersistenceIdle'), 'mobile image batch append waits for active menu persistence');
  assert(mobileMenu.includes('await persistMenuProjectImmediately(pendingProject)'), 'mobile image batch append drains pending menu changes first');

  const aiImageImpl = read('__docs__/projects/ai-image-generation/ai-image-generation_impl.md');
  const aiImageFirebase = read('__docs__/projects/ai-image-generation/ai-image-generation_firebase.md');
  const productionAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
  const changelog = read('__docs__/changelog.md');
  const systemLedger = read('__docs__/system-strengthening/menulist-system-data-flow-audit-2026-06-20.md');
  [
    ['AI image implementation docs', aiImageImpl],
    ['AI image Firebase docs', aiImageFirebase],
    ['Production-readiness audit', productionAudit],
    ['Changelog', changelog],
    ['System data-flow audit', systemLedger],
  ].forEach(([label, content]) => {
    assert(content.includes('Batch image result stored-error display boundary'), `${label} documents batch image result stored-error display boundary`);
  });
}

{
  const route = 'src/app/api/owner-business-assistant/answer/route.ts';
  const source = read(route);
  assert(source.includes('readBoundedJsonBody'), `${route} uses bounded JSON body reader`);
  assert(source.includes('OWNER_BUSINESS_ASSISTANT_ANSWER_MAX_BODY_BYTES'), `${route} declares explicit answer request body cap`);
  assertOrder(
    source,
    route,
    [
      'const rateLimit = await applyOwnerBusinessAssistantRateLimit({',
      'readBoundedJsonBody(',
      'OwnerBusinessAssistantAnswerRequestSchema.safeParse(bodyResult.data)',
      'requireAnyStorePermissionForStore(',
      'resolveOwnerBusinessAssistantAnswer({',
    ],
    'rate-limits and bounds JSON before permission checks and answer resolution',
  );
  assert(source.includes('owner_business_assistant_thread_persistence_failed'), `${route} codes thread persistence diagnostics`);
  assert(source.includes('owner_business_assistant_answer_event_logging_failed'), `${route} codes answer event diagnostics`);
  assert(!source.includes('logger.warn'), `${route} must not use raw logger diagnostics`);
  assert(!source.includes('error instanceof Error ? error.message'), `${route} must not log raw exception messages`);
}

const accounting = read('src/lib/ai/accounting.ts');
const operationLogSource = read('src/lib/ai/operationLog.ts');
assert(accounting.includes('recordAiOperationForSession'), 'shared accounting finalizer records session operations');
assert(accounting.includes('recordAiOperation(operationInput)'), 'shared accounting finalizer records worker operations without session');
assert(
  accounting.includes('? normalizeAiOperationForSessionInput(session, input)'),
  'shared accounting finalizer reconciles session/input identity before every accounting branch',
);
assert(
  accounting.includes('session accounting scope is invalid.'),
  'shared accounting finalizer fails closed on conflicting session/input identity',
);
[
  'pId: input.pId ?? session?.pId',
  'tId: input.tId ?? session?.tId',
  'sId: input.sId ?? session?.sId',
  'uId: input.uId ?? session?.uId',
].forEach((token) => assert(!accounting.includes(token), `shared accounting finalizer forbids first-value session identity token ${token}`));
assert(accounting.includes('ai_accounting_operation_log_failed'), 'shared accounting finalizer treats operation logging as best effort with bounded diagnostics');
assert(accounting.includes('ai_accounting_credit_consumption_failed'), 'shared accounting finalizer logs credit consumption failures with bounded diagnostics');
assert(accounting.includes('getAiAccountingLogContext'), 'shared accounting finalizer uses bounded accounting log context');
assert(!accounting.includes('logger.error'), 'shared accounting finalizer must not use raw logger diagnostics');
assert(!accounting.includes('operationLogError, context'), 'shared accounting finalizer must not pass raw operation-log context');
assert(!accounting.includes('creditConsumptionError, context'), 'shared accounting finalizer must not pass raw credit-consumption context');
assert(accounting.includes('consumeAICapacity'), 'shared accounting finalizer consumes billable credits');
assert(accounting.includes('throw creditConsumptionError'), 'shared accounting finalizer fails paid requests when credit consumption fails');
assert(
  accounting.indexOf('ai_accounting_operation_log_failed') < accounting.lastIndexOf('if (capacitySubscription && unitsConsumed > 0)'),
  'shared accounting finalizer does not let log failure skip credit consumption'
);
[
  'type JsonRecord = Record<string, unknown>;',
  'getGeminiUsageMetadata(response: unknown)',
  'requireNonNegativeSafeInteger(input.promptTokenCount',
  'requireNonNegativeSafeInteger(input.candidatesTokenCount',
  'requireNonNegativeSafeInteger(input.totalTokenCount',
  'requirePositiveSafeInteger(input.tokenPerCredit',
  'requireNonNegativeSafeInteger(input.unitsConsumed',
  'requireNonNegativeSafeInteger(input.realCostPaise',
  'requireSafeInteger(input.marginPaise',
  'normalizeAiOperationWriteScope(',
  'assertAiOperationStorageAvailable(',
  'normalizeAiOperationForSessionInput(',
  "throw new Error('Answerlattice AI operation storage is unavailable.')",
  "typeof value === 'number' && Number.isFinite(value)",
].forEach((token) => assert(operationLogSource.includes(token), `AI operation log includes exact scalar/type token ${token}`));
[
  'type JsonRecord = Record<string, any>',
  'clientResponse?: any',
  'geminiResponse?: any',
  'const numberValue = Number(value)',
  'Number(input.promptTokenCount',
  'Number(input.candidatesTokenCount',
  'Number(input.totalTokenCount',
  'Number(input.unitsConsumed',
  'Number(input.realCostPaise',
  'Number(input.ourChargePaise',
  'Number(input.marginPaise',
  "String(input.pId || '').toUpperCase()",
  "shouldWriteAnswerlatticeOperation = productId === PRODUCT_IDS.ANSWERLATTICE\n        && answerlatticeFirestoreAdmin",
  'recordAiOperationForSession(session: any',
  'pId: input.pId ?? session?.pId',
  'tId: input.tId ?? session?.tId',
  'sId: input.sId ?? session?.sId',
].forEach((token) => assert(!operationLogSource.includes(token), `AI operation log forbids coercive scalar/type token ${token}`));

const aiOperationsDal = read('src/database/aiOperations/index.tsx');
const answerlatticeAiOperationsDal = read('src/database/answerlattice/aiOperations.ts');
const aiOperationHistoryClientContract = read('src/lib/ai/operationHistoryClientContract.ts');
assert(aiOperationsDal.includes('Client AI operation writes are disabled'), 'legacy addAiOperation helper is disabled with explicit message');
assert(!/\baddDoc\s*\(/.test(aiOperationsDal), 'client AI operation DAL no longer writes documents');
[
  [
    'AI operations DAL',
    aiOperationsDal,
    'AI_OPERATIONS_RESPONSE_JSON_MAX_BYTES',
    'readAiOperationsResponse',
    'AI_OPERATIONS_RESPONSE_PARSE_FAILED',
    'AI_OPERATIONS_RESPONSE_REJECTED',
    'AI_OPERATIONS_RESPONSE_INVALID',
  ],
  [
    'Answerlattice AI operations DAL',
    answerlatticeAiOperationsDal,
    'ANSWERLATTICE_AI_OPERATIONS_RESPONSE_JSON_MAX_BYTES',
    'readAnswerlatticeAiOperationsResponse',
    'ANSWERLATTICE_AI_OPERATIONS_RESPONSE_PARSE_FAILED',
    'ANSWERLATTICE_AI_OPERATIONS_RESPONSE_REJECTED',
    'ANSWERLATTICE_AI_OPERATIONS_RESPONSE_INVALID',
  ],
].forEach(([label, source, capToken, helperToken, parseToken, rejectedToken, invalidToken]) => {
  assert(source.includes(capToken), `${label} declares a bounded read response cap`);
  assert(source.includes(helperToken), `${label} uses a central bounded response helper`);
  assert(source.includes('readJsonResponseWithLimit<unknown>'), `${label} parses read responses through the bounded parser`);
  assert(source.includes('normalizeAiOperationHistoryPage'), `${label} guards and normalizes every paginated response row`);
  assert(source.includes(parseToken), `${label} logs parse failures with a stable code`);
  assert(source.includes(rejectedToken), `${label} logs rejected responses with a stable code`);
  assert(source.includes(invalidToken), `${label} logs invalid successful responses with a stable code`);
  assert(!source.includes('return result.json()'), `${label} must not return direct response JSON parsing`);
});
[
  'export function normalizeAiOperationHistoryRow',
  'export function normalizeAiOperationHistoryPage',
  'if (value.hasMore && !lastVisibleDoc) return null;',
  'if (value.requiresManualContinuation && (!value.hasMore || !lastVisibleDoc || rows.length > 0)) return null;',
  'const rows = value.data.map(normalizeAiOperationHistoryRow);',
  'if (!rows.every((row): row is AiOperationHistoryRow => Boolean(row))) return null;',
  'transactionId?: string;',
  "value.contentLength !== 'Large' && value.contentLength !== 'Medium' && value.contentLength !== 'Small'",
].forEach((token) => {
  assert(aiOperationHistoryClientContract.includes(token), `AI operation browser response contract includes token ${token}`);
});
assert(!aiOperationsDal.includes('data: any[]'), 'MenuList AI operations DAL must not expose untyped rows');
assert(!answerlatticeAiOperationsDal.includes('data: any[]'), 'Answerlattice AI operations DAL must not expose untyped rows');
[
  'AI_OPERATIONS_REQUEST_POLICY',
  "cache: 'no-store'",
  "credentials: 'same-origin'",
  "redirect: 'manual'",
  '...AI_OPERATIONS_REQUEST_POLICY',
].forEach((token) => {
  assert(aiOperationsDal.includes(token), `MenuList AI operations DAL request policy includes token ${token}`);
});
[
  'getAllAiOperations',
  'getAiOperationsByStoreId',
  'getAiOperationById',
].forEach((token) => {
  assert(!aiOperationsDal.includes(token), `MenuList AI operations DAL removes unused invalid legacy reader ${token}`);
});

const rules = read('firestore.rules');
const aiOperationsRules = rules.match(/match \/menulistAiOperations\/\{tId\}\/\{sId\}\/\{docId\} \{[\s\S]*?\n\s*\}/);
assert(Boolean(aiOperationsRules), 'Firestore rules include menulistAiOperations scoped collection');
assert(Boolean(aiOperationsRules && aiOperationsRules[0].includes('allow read: if isAuthenticated() && isPlatformAdmin();')), 'full AI operation documents are platform-read-only in Firestore rules');
assert(Boolean(aiOperationsRules && aiOperationsRules[0].includes('allow write: if false;')), 'menulistAiOperations writes are server/Admin-only');

const aiOperationsApi = read('src/app/api/ai-operations/route.ts');
const aiOperationHistoryQuery = read('src/lib/ai/operationHistoryQuery.ts');
const aiOperationHistoryProjection = read('src/lib/ai/operationHistoryProjection.ts');
assert(aiOperationsApi.includes('sanitizeOwnerOperation'), 'AI operations API sanitizes owner transaction responses');
assert(aiOperationsApi.includes('PLATFORM_ONLY_FIELDS'), 'AI operations API has explicit platform-only field denylist');
assert(aiOperationsApi.includes('OWNER_VISIBLE_FIELDS'), 'AI operations API uses an owner-visible allowlist');
assert(aiOperationsApi.includes('PLATFORM_VISIBLE_FIELDS'), 'AI operations API uses a platform-visible allowlist');
assert(aiOperationsApi.includes('sanitizePlatformOperation'), 'AI operations API sanitizes platform transaction responses');
assert(aiOperationsApi.includes('projectAiOperationHistoryFields'), 'AI operations API delegates response rows to the canonical projection helper');
assert(aiOperationsApi.includes('visibleFields: OWNER_RESPONSE_FIELDS'), 'AI operations API projects owner rows through the owner-only allowlist');
assert(aiOperationsApi.includes('visibleFields: PLATFORM_VISIBLE_FIELDS'), 'AI operations API projects platform rows through the platform allowlist');
[
  'export function projectAiOperationHistoryFields',
  "if (key === 'id' || !hasOwn(data, key)) return;",
  'const serialized = serializeVisibleFirestoreValue(data[key]);',
  'projected.id = documentId;',
].forEach((token) => {
  assert(aiOperationHistoryProjection.includes(token), `AI operation history projection includes canonical allowlist token ${token}`);
});
assert(!aiOperationsApi.includes('serializeFirestoreValue({ id, ...data })'), 'AI operations API must not serialize hidden fields before applying role allowlists');
assert(aiOperationsApi.includes("'realCostPaise'"), 'AI operations API keeps actual provider cost platform-only');
assert(aiOperationsApi.includes("'ourChargePaise'"), 'AI operations API keeps configured owner charge platform-only');
assert(aiOperationsApi.includes("'marginPaise'"), 'AI operations API keeps margin platform-only');
assert(aiOperationsApi.includes('getActionFilteredDocs'), 'AI operations API supports action filtering without relying on dynamic collection composite indexes');
assert(aiOperationsApi.includes('resolveAiOperationActionScanBoundary'), 'AI operations API resolves capped filtered scans through the shared pagination boundary');
assert(aiOperationsApi.includes('requiresManualContinuation: boundary.requiresManualContinuation'), 'AI operations API reports empty capped scans as explicit continuations');
assert(aiOperationsApi.includes("boundary.cursorSource === 'scan_cursor'"), 'AI operations API advances capped scan cursors past fully inspected windows');
assert(!aiOperationsApi.includes('const hasMore = docs.length > 0 &&'), 'AI operations API must not declare an empty capped filtered scan terminal');
[
  'export function resolveAiOperationActionScanBoundary',
  'hasMore: hasBufferedMatch || scanLimitReached',
  "requiresManualContinuation: input.matchedCount === 0 && scanLimitReached",
  "? 'scan_cursor'",
].forEach((token) => {
  assert(aiOperationHistoryQuery.includes(token), `AI operation history query includes filtered-scan boundary token ${token}`);
});
[
  'export function isAiOperationHistoryCursorAdmissible',
  'if (!cursorRequested) return true;',
  'if (!cursorExists) return false;',
  'const cursorDate = normalizeAiOperationHistoryCursorDate(cursorCreatedOn);',
  'if (dateRange.start && cursorTime < dateRange.start.getTime()) return false;',
  'if (dateRange.end && cursorTime > dateRange.end.getTime()) return false;',
].forEach((token) => {
  assert(aiOperationHistoryQuery.includes(token), `AI operation history query includes persisted-cursor admission token ${token}`);
});
assert(aiOperationsApi.includes('isAiOperationHistoryCursorAdmissible({'), 'AI operations API validates the persisted cursor before query continuation');
assert(aiOperationsApi.includes("return privateJson({ error: 'Invalid cursor' }, { status: 400 });"), 'AI operations API rejects an invalid persisted cursor with a fixed private client response');
assert(aiOperationsApi.includes("'Cache-Control': 'private, no-store, max-age=0'"), 'AI operations API prevents authenticated ledger responses from being cached');
assert(aiOperationsApi.includes("'X-Content-Type-Options': 'nosniff'"), 'AI operations API hardens authenticated JSON content handling');
assert(aiOperationsApi.includes('failClosedOnProviderError: true'), 'AI operations API fails closed when read admission is unavailable');
assert(aiOperationsApi.includes("rateLimit.reason === 'provider_unavailable'"), 'AI operations API distinguishes provider admission outages');
assert((aiOperationsApi.match(/return NextResponse\.json\(/g) || []).length === 1, 'AI operations API keeps NextResponse.json encapsulated by its private response helper');
assert(aiOperationsApi.includes("import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';"), 'AI operations API uses the shared Firestore document ID guard for history scope');
assert(aiOperationsApi.includes('function normalizeAiOperationHistoryScopeDocumentId(value: unknown): AiOperationHistoryScopeDocumentId | null'), 'AI operations API exposes a history scope document ID normalizer');
assert(aiOperationsApi.includes('Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId'), 'AI operations API requires exact positive numeric tenant/store scope');
assert(aiOperationsApi.includes('const sessionScope = resolveStorePermissionSessionScope(session);'), 'AI operations API reconciles every session scope alias before reads');
assert(aiOperationsApi.includes('const tenantScope = normalizeAiOperationHistoryScopeDocumentId(sessionScope?.tenantScope.documentId);'), 'AI operations API normalizes exact reconciled tenant scope before reads');
assert(aiOperationsApi.includes('const storeScope = normalizeAiOperationHistoryScopeDocumentId(sessionScope?.storeScope.documentId);'), 'AI operations API normalizes exact reconciled store scope before reads');
assert(aiOperationsApi.includes('const tenantId = tenantScope.documentId;'), 'AI operations API reads tenant history through normalized document ID');
assert(aiOperationsApi.includes('const storeId = storeScope.documentId;'), 'AI operations API reads store history through normalized document ID');
assert(aiOperationsApi.includes("platformRole === 'PLATFORM'"), 'AI operations API detects platform role before response shaping');
assert(aiOperationsApi.includes('? sanitizePlatformOperation(doc.id, doc.data())'), 'AI operations API filters platform rows through the bounded platform allowlist');
assert(aiOperationsApi.includes("withAuth"), 'AI operations API is protected by auth middleware');
assert(aiOperationsApi.includes("import { PERMISSIONS } from '@constant/permissions';"), 'AI operations API imports the billing permission contract');
assert(aiOperationsApi.includes("import { requireAnyStorePermission } from '@lib/permissions/server';"), 'AI operations API uses current persisted store permission authority');
assert(aiOperationsApi.includes('[PERMISSIONS.ACCESS_BILLING]'), 'AI operations API requires billing access');
assertOrder(
  aiOperationsApi,
  'AI operations API',
  [
    "const rateLimit = await checkRateLimit({",
    'const dateRange = normalizeAiOperationHistoryDateRange(startDate, endDate);',
    'const permissionError = await requireAnyStorePermission(',
    'let query: FirebaseFirestore.Query = firestoreAdmin',
    'const cursorDoc = await getCursorDoc(tenantId, storeId, cursorId);',
  ],
  'rate-limits and validates before current billing permission, then authorizes before ledger reads',
);
assert(aiOperationsApi.includes("getRateLimitForFeature('DATA_READ')"), 'AI operations API rate-limits read requests before Firestore reads');
assert(aiOperationsApi.includes('const userRateLimitHash = hashPublicRateLimitValue(userId);'), 'AI operations API hashes user key material before rate limiting');
assert(aiOperationsApi.includes('const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);'), 'AI operations API hashes tenant key material before rate limiting');
assert(aiOperationsApi.includes('const storeRateLimitHash = hashPublicRateLimitValue(storeId);'), 'AI operations API hashes store key material before rate limiting');
assert(aiOperationsApi.includes('key: `ai-operations:${userRateLimitHash}:${tenantRateLimitHash}:${storeRateLimitHash}`'), 'AI operations API uses hashed limiter key segments');
assert(aiOperationsApi.includes('getAiOperationsReadLogContext'), 'AI operations API uses bounded diagnostic context for read failures');
assert(aiOperationsApi.includes("logRuntimeFailure('ai_operations_read_failed'"), 'AI operations API logs read failures with a stable diagnostic code');
assert(aiOperationsApi.includes("getBoundedRuntimeStringContext('tenantId'"), 'AI operations API bounds tenant ID diagnostics');
assert(aiOperationsApi.includes("getBoundedRuntimeStringContext('storeId'"), 'AI operations API bounds store ID diagnostics');
assert(aiOperationsApi.includes("getBoundedRuntimeStringContext('userId'"), 'AI operations API bounds user ID diagnostics');
assert(aiOperationsApi.includes("getBoundedRuntimeStringContext('cursorId'"), 'AI operations API bounds cursor ID diagnostics');
assert(aiOperationsApi.includes("logger.security('Rate Limit Exceeded', {"), 'AI operations API logs rate-limit events through the approved security logger');
assert(aiOperationsApi.includes('...getAiOperationsReadLogContext(request, session'), 'AI operations API rate-limit security logs reuse bounded read context');
assert(!aiOperationsApi.includes("secureError('[ai-operations] Failed to load operations'"), 'AI operations API does not log read failures through the legacy raw secureError path');
assert(!aiOperationsApi.includes('secureError('), 'AI operations API does not pass raw read exceptions into secureError');
assert(!aiOperationsApi.includes('key: `ai-operations:${userId}:${tenantId}:${storeId}`'), 'AI operations API must not store raw user/tenant/store IDs in rate-limit keys');
assert(!aiOperationsApi.includes('.doc(String(tenantId))'), 'AI operations API must not build history refs from raw tenant IDs');
assert(!aiOperationsApi.includes('.collection(String(storeId))'), 'AI operations API must not build history refs from raw store IDs');
assert(read('__docs__/ai-system-layer/ai-system-layer_impl.md').includes('AI Operations History Scope Document ID Boundary'), 'AI System implementation docs must record AI operations history scope boundary');
assert(read('__docs__/ai-system-layer/ai-system-layer_firebase.md').includes('AI Operations History Scope Document ID Boundary'), 'AI System Firebase docs must record AI operations history scope boundary');
assert(read('__docs__/ai-system-layer/ai-system-layer_impl.md').includes('AI Operations Persisted Cursor Admission'), 'AI System implementation docs must record persisted cursor admission');
assert(read('__docs__/ai-system-layer/ai-system-layer_firebase.md').includes('AI Operations Persisted Cursor Admission is also Firebase-cost neutral'), 'AI System Firebase docs must record persisted cursor cost');
assert(read('__docs__/audits/menulist-production-readiness-audit.md').includes('AI Operations History Scope Document ID Boundary checkpoint'), 'Production audit must record AI operations history scope boundary');
assert(read('__docs__/audits/menulist-production-readiness-audit.md').includes('AI operation persisted-cursor admission checkpoint'), 'Production audit must record persisted cursor admission');
assert(read('__docs__/changelog.md').includes('AI Operations History Scope Document ID Boundary'), 'Changelog must record AI operations history scope boundary');
assert(read('__docs__/changelog.md').includes('AI Operation Persisted Cursor Admission'), 'Changelog must record persisted cursor admission');
assert(read('__docs__/changelog.md').includes('AI Operations History Scope Document ID Boundary'), 'Lowercase changelog must record AI operations history scope boundary');
const aiOperationsImplDoc = read('__docs__/ai-system-layer/ai-system-layer_impl.md');
const aiOperationsFirebaseDoc = read('__docs__/ai-system-layer/ai-system-layer_firebase.md');
const aiOperationsMobileDoc = read('__docs__/ai-system-layer/ai-system-layer_mobile-support.md');
const aiEnhancementHistoryImplDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md');
const aiEnhancementHistoryFirebaseDoc = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_firebase.md');
const aiOperationsProductionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const aiOperationsCurrentChangelog = read('__docs__/changelog.md');
[
  [aiOperationsImplDoc, 'requires `canAccessBilling` before cursor or page reads', 'AI System implementation history authorization'],
  [aiOperationsImplDoc, "`cache: 'no-store'`, same-origin credentials, and manual redirects", 'AI System implementation browser request policy'],
  [aiOperationsFirebaseDoc, 'adds one current `stores/{sId}` permission read', 'AI System Firebase permission-read cost'],
  [aiOperationsMobileDoc, 'server history route now independently rechecks that current persisted permission', 'AI System mobile server authorization'],
  [aiEnhancementHistoryImplDoc, 'requires current persisted `canAccessBilling` permission', 'AI enhancement implementation history authorization'],
  [aiEnhancementHistoryFirebaseDoc, 'current `canAccessBilling` authorization', 'AI enhancement Firebase history authorization'],
  [aiOperationsProductionReadinessAudit, 'AI Transaction-History Authorization And Browser-Isolation Checkpoint', 'production-readiness history authorization checkpoint'],
  [aiOperationsCurrentChangelog, 'AI Transaction History Authorization And Browser Isolation', 'changelog history authorization checkpoint'],
].forEach(([source, token, label]) => {
  assert(source.includes(token), `${label} includes ${token}`);
});
[
  'returns the full transaction payload',
  'returns full transaction payloads',
  'renders the full AI transaction object',
].forEach((staleClaim) => {
  assert(!aiEnhancementHistoryImplDoc.includes(staleClaim), `AI enhancement implementation doc must not claim browser access to ${staleClaim}`);
});
assert(!aiEnhancementHistoryFirebaseDoc.includes('reads (admin only)'), 'AI enhancement Firebase cost table must not classify protected owner history reads as admin-only');
const platformVisibleFieldsMatch = aiOperationsApi.match(/const PLATFORM_VISIBLE_FIELDS = new Set\(\[([\s\S]*?)\]\);/);
assert(Boolean(platformVisibleFieldsMatch), 'AI operations API declares platform-visible fields in one allowlist');
const platformVisibleFields = platformVisibleFieldsMatch ? platformVisibleFieldsMatch[1] : '';
['geminiResponse', 'generationConfig', 'rawBatchResponses', 'rawProviderResponse', 'tokenUsage', 'uId', 'tId', 'sId', 'storeId'].forEach((field) => {
  assert(!platformVisibleFields.includes(`'${field}'`), `AI operations platform allowlist must not include raw/internal field ${field}`);
});
assert(!aiOperationsApi.includes('storeId,\n                tenantId,\n                userId,'), 'AI operations API rate-limit diagnostics do not log raw tenant/store/user IDs');

const common = read('src/constants/common.ts');
const actionBlock = common.match(/export const AI_ACTIONS_TYPES(?:\s*:[^=]+)?\s*=\s*\{([\s\S]*?)\n\}/);
assert(Boolean(actionBlock), 'AI_ACTIONS_TYPES registry is present');
const actionKeys = actionBlock
  ? Array.from(actionBlock[1].matchAll(/\b([A-Z0-9_]+):\s*"[^"]+"/g)).map((match) => match[1]).sort()
  : [];

const unitCosts = read('src/constants/AI/unitCosts.ts');
const extractCostKeys = (registryName) => {
  const marker = `export const ${registryName}`;
  const start = unitCosts.indexOf(marker);
  if (start === -1) return [];

  const bodyStart = unitCosts.indexOf('{', start);
  const bodyEnd = unitCosts.indexOf('\n};', bodyStart);
  if (bodyStart === -1 || bodyEnd === -1) return [];

  const body = unitCosts.slice(bodyStart, bodyEnd);
  return Array.from(body.matchAll(/\[AI_ACTIONS_TYPES\.([A-Z0-9_]+)\]/g)).map((match) => match[1]).sort();
};

const unitCostKeys = extractCostKeys('AI_UNIT_COSTS');
const realCostKeys = extractCostKeys('GEMINI_COST_USD');
const missingUnitCostKeys = actionKeys.filter((key) => !unitCostKeys.includes(key));
const missingRealCostKeys = actionKeys.filter((key) => !realCostKeys.includes(key));

assert(missingUnitCostKeys.length === 0, `all AI actions have explicit unit costs${missingUnitCostKeys.length ? `: ${missingUnitCostKeys.join(', ')}` : ''}`);
assert(missingRealCostKeys.length === 0, `all AI actions have explicit real-cost entries${missingRealCostKeys.length ? `: ${missingRealCostKeys.join(', ')}` : ''}`);
assert(unitCosts.includes('assertKnownAiAction'), 'unit cost lookup fails closed for unknown AI actions');
assert(!/AI_UNIT_COSTS\[actionType\]\s*\?\?\s*0/.test(unitCosts), 'unit cost lookup does not silently default unknown actions to free');
assert(!/GEMINI_COST_USD\[actionType\]\s*\?\?\s*0/.test(unitCosts), 'real-cost lookup does not silently default unknown actions to zero cost');

const explicitlyFreeActions = [
  'IMAGE_PROCESSING',
  'ADD_DESCRIPTION',
  'NEW_ITEM_METADATA',
  'MENU_INTAKE_IDENTITY',
  'PUBLIC_MENU_EXTRACTION',
];
for (const actionKey of explicitlyFreeActions) {
  const freeEntry = new RegExp(`\\[AI_ACTIONS_TYPES\\.${actionKey}\\]:\\s*0\\b`);
  assert(freeEntry.test(unitCosts), `${actionKey} is explicitly zero-unit for initial/setup output`);
}

const capacityCheck = read('src/lib/ai/capacityCheck.ts');
const aiEnhancementPacksImpl = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_impl.md');
const aiEnhancementPacksFirebase = read('__docs__/ai-enhancement-packs/ai-enhancement-packs_firebase.md');
const productionReadinessAudit = read('__docs__/audits/menulist-production-readiness-audit.md');
const changelog = read('__docs__/changelog.md');
assert(
  capacityCheck.indexOf('if (isFreeTierAction(actionType))') !== -1
    && capacityCheck.indexOf('if (isFreeTierAction(actionType))') < capacityCheck.indexOf('if (!FEATURE_FLAGS.ENABLE_AI_ENHANCEMENTS)'),
  'free actions short-circuit before paid enhancement kill switch and subscription lookup'
);
[
  "import { normalizeBillingSubscriptionDocumentId } from \"@lib/billing/subscriptionDocumentIdBoundary\";",
  "import { getMenuListSubscriptionEntitlementScope } from \"@lib/billing/menuListSubscriptionEntitlementBoundary\";",
  'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription.id);',
  'const expectedScope = getMenuListSubscriptionEntitlementScope(subscription);',
  'const initialAllowance = getPositiveCreditInteger(subscription.monthlyCreditsAllowance);',
  'if (!normalizedSubscriptionId || !expectedScope || initialAllowance === null) {',
  'const normalizedSubscriptionId = normalizeBillingSubscriptionDocumentId(subscription?.id);',
  'throw new Error("Billing subscription is not available.");',
  'unitsToConsume > totalRemaining',
  "throw new Error('Not enough billing credits for this operation.');",
].forEach((token) => {
  assert(capacityCheck.includes(token), `AI capacity check includes subscription document ID boundary token ${token}`);
});
assert(capacityCheck.includes('const currentScope = getMenuListSubscriptionEntitlementScope(current);'), 'AI capacity transactions reproject exact current subscription scope');
assert(capacityCheck.includes('getExactAccountingScopeAlias'), 'AI capacity operation replay requires agreeing scope aliases');
assert(!capacityCheck.includes('current.tenantId ?? current.tId'), 'AI capacity transactions do not collapse conflicting current tenant aliases');
assert(!capacityCheck.includes('current.storeId ?? current.sId'), 'AI capacity transactions do not collapse conflicting current store aliases');
assert(!capacityCheck.includes('.doc(subscription.id)'), 'AI capacity check must not build raw subscription document refs');
[
  'Subscription document refs use `src/lib/billing/subscriptionDocumentIdBoundary.ts`',
  'paid consumption fails closed through the shared AI accounting finalizer',
].forEach((token) => {
  assert(aiEnhancementPacksImpl.includes(token), `AI enhancement packs implementation doc includes subscription document ID boundary token ${token}`);
});
[
  'MenuList Billing Subscription Document ID Boundary',
  'capacity-check lazy reset and consumption normalize subscription document IDs',
  'malformed or whitespace-mutated IDs return before reset refs or fail paid credit consumption before debit refs',
].forEach((token) => {
  assert(aiEnhancementPacksFirebase.includes(token), `AI enhancement packs Firebase doc includes subscription document ID boundary token ${token}`);
});
[
  'MenuList Billing Subscription Document ID Boundary checkpoint',
  'whitespace-mutated subscription IDs',
  '`npm run verify:ai-accounting`',
].forEach((token) => {
  assert(productionReadinessAudit.includes(token), `production readiness audit includes subscription document ID boundary token ${token}`);
});
[
  'Billing Strict Provider Document ID Boundaries',
  'MenuList Billing Subscription Document ID Boundary',
  'Paid AI credit consumption fails closed for malformed subscription IDs',
].forEach((token) => {
  assert(changelog.includes(token), `changelog includes subscription document ID boundary token ${token}`);
});
{
  const apiSchemas = read('src/lib/validation/apiSchemas.ts');
  const newItemMetadataRoute = read('src/app/api/new-item-metadata/route.ts');
  assert(apiSchemas.includes('price: z.union([z.string().trim().max(120), z.number().finite()]).optional()'), 'new item metadata schema bounds attribute price strings before prompt construction');
	  assert(newItemMetadataRoute.includes('const { item, targetLang, sourceLang, projectId, fileId, contentLength, businessType, tone } = validated;'), 'new item metadata route uses validated prompt payload fields');
	  assert(newItemMetadataRoute.includes("businessType: businessType || 'unspecified'"), 'new item metadata route uses a neutral business type fallback');
	  assert(!newItemMetadataRoute.includes("businessType || 'Restaurant'"), 'new item metadata route must not default unknown business types to Restaurant');
	  assert(!newItemMetadataRoute.includes('const item = rawData.item;'), 'new item metadata route must not pass raw item payload after validation');
  assert(!newItemMetadataRoute.includes('const targetLang = rawData.targetLang;'), 'new item metadata route must not pass raw target language payload after validation');
  assert(!newItemMetadataRoute.includes('const sourceLang = rawData.sourceLang;'), 'new item metadata route must not pass raw source language payload after validation');
}
[
  'logRuntimeFailure',
  'ai_capacity_credits_exhausted_lifecycle_message_failed',
  'ai_capacity_credits_exhausted_lifecycle_message_import_failed',
  "getBoundedRuntimeStringContext('subscriptionId', subscription.id)",
  "getBoundedRuntimeStringContext('tenantId', subscription.tenantId)",
  "getBoundedRuntimeStringContext('storeId', subscription.storeId)",
].forEach((token) => {
  assert(capacityCheck.includes(token), `AI capacity check includes bounded credits-exhausted lifecycle diagnostic token ${token}`);
});
assert(!capacityCheck.includes('}).catch(() => { /* non-blocking */ });'), 'AI capacity check must not silently swallow credits-exhausted lifecycle send failures');
assert(!capacityCheck.includes('} catch { /* non-blocking */ }'), 'AI capacity check must not silently swallow credits-exhausted lifecycle import failures');

const capacityError = read('src/services/ai/capacityError.ts');
assert(capacityError.includes("import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';"), 'AI capacity error parser uses bounded response reads');
assert(capacityError.includes('const AI_CAPACITY_RESPONSE_JSON_MAX_BYTES = 8 * 1024;'), 'AI capacity error response parser has a byte cap');
assert(capacityError.includes('readJsonResponseWithLimit<AiCapacityResponse>'), 'AI capacity error parses response JSON through the bounded parser');
assert(capacityError.includes('ai_capacity_response_parse_failed'), 'AI capacity error logs response parse failures with a stable code');
assert(capacityError.includes('"Additional AI enhancements needed for your menu."'), 'AI capacity error uses fixed owner-safe copy');
assert(capacityError.includes('data.code.slice(0, 64)'), 'AI capacity error bounds response code');
assert(!capacityError.includes('data.error ||'), 'AI capacity error must not surface raw response error text');
assert(!capacityError.includes('response.json().catch(() => ({}))'), 'AI capacity error must not silently swallow response parse failures');

const extractionFunction = read('functions/src/logic/processMenuImages.ts');
assert(extractionFunction.includes('unitsConsumed: 0'), 'Cloud Function extraction audit stamps owner units as 0');
[
  'buildOwnerExtractionActivity',
  'mirrorOwnerActivity?: boolean',
  '.collection(DB_COLLECTIONS.MENULIST_AI_OPERATIONS)',
  'batch.set(ownerActivityRef, ownerActivity)',
  'await batch.commit()',
  'addAiOperation(transactionObject, { mirrorOwnerActivity: true })',
  'transactionObject.destinationType === MENU_EXTRACTION_DESTINATION_TYPES.PROJECT',
  'transactionObject.jobSource === MENU_EXTRACTION_SOURCES.OWNER_UPLOAD',
  'transactionObject.jobSource === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT',
  'userId !== transactionObject.uId',
].forEach((token) => {
  assert(extractionFunction.includes(token), `successful owner extraction atomically mirrors bounded activity token ${token}`);
});
assert(!extractionFunction.includes('transactionObject.destinationType === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT\n        &&'), 'public-draft extraction is not admitted to owner transaction history');
assert(!extractionFunction.includes('transactionObject.destinationType === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING\n        &&'), 'messaging extraction is not admitted to owner transaction history');
assert(extractionFunction.includes("source: 'firebase-function-menu-extraction'"), 'owner extraction history records a stable bounded source');
assert(extractionFunction.includes("billingMode: 'free'"), 'owner extraction history explicitly identifies no-credit work');

const linkTextExtractionFunction = read('functions/src/logic/menuLinkTextExtraction.ts');
assert(linkTextExtractionFunction.includes('unitsConsumed: 0'), 'deterministic menu-link extraction stamps owner units as 0');

const extractionJobFunction = read('functions/src/logic/processMenuImagesJob.ts');
assert(extractionJobFunction.includes('unitsConsumed: result.transaction.unitsConsumed || 0'), 'extraction jobs persist zero owner units in transaction summary');

const extractionMonitor = read('src/components/templates/main-app/platform/extractionMonitor/JobInspector.tsx');
assert(extractionMonitor.includes('Owner Units'), 'extraction monitor labels owner units separately from token audit cost');
assert(extractionMonitor.includes('rawBatchResponses'), 'extraction monitor exposes stored raw provider responses for platform debugging');
assert(extractionMonitor.includes('Total Tokens'), 'extraction monitor shows token usage breakdown for platform cost audit');
assert(extractionMonitor.includes('formatInrPaise'), 'extraction monitor formats paise-denominated AI cost as INR');

const extractionCostMonitor = read('src/components/templates/main-app/platform/extractionMonitor/CostMonitor.tsx');
assert(extractionCostMonitor.includes('formatInrPaise'), 'desktop extraction cost monitor formats stored paise values as INR');
assert(extractionCostMonitor.includes('Stored as paise and shown as INR'), 'desktop extraction cost monitor documents paise storage in UI');

const mobileExtractionMonitor = read('src/components/mobile/screens/MobileExtractionMonitorScreen.tsx');
assert(mobileExtractionMonitor.includes('formatInrPaise'), 'mobile extraction monitor formats stored paise values as INR');
assert(!mobileExtractionMonitor.includes('formatInrAmount'), 'mobile extraction monitor does not treat paise as whole rupees');

const ownerTransactionsPage = read('src/components/templates/main-app/transactions/index.tsx');
assert(!ownerTransactionsPage.includes("title: 'Tokens'"), 'desktop owner transaction table does not expose token counts');
assert(!ownerTransactionsPage.includes("dataIndex: 'totalTokenCount'"), 'desktop owner transaction table has no token-count column');
assert(ownerTransactionsPage.includes('getAiOperationOwnerSummary'), 'desktop owner transaction table shows shared owner-facing result summaries');
assert(ownerTransactionsPage.includes('pagination={false}'), 'desktop owner transaction table uses custom cursor pagination instead of fake total pagination');
assert(ownerTransactionsPage.includes('pageCursorsRef'), 'desktop owner transaction pagination tracks page cursors');
assert(ownerTransactionsPage.includes('&& (!response.hasMore || !response.lastVisibleDoc)'), 'desktop owner transaction pagination keeps empty capped scan pages continuable');
assert(ownerTransactionsPage.includes('requiresManualContinuation: response.requiresManualContinuation'), 'desktop owner transaction state retains explicit empty filtered continuation');
assert(ownerTransactionsPage.includes("t('continueFilteredHistory')"), 'desktop owner transaction empty state explains filtered-history continuation');
assert(ownerTransactionsPage.includes('MENULIST_OWNER_AI_ACTIONS.map'), 'desktop owner transaction filter uses the MenuList-only action allowlist');
assert(!ownerTransactionsPage.includes('Object.values(AI_ACTIONS_TYPES)'), 'desktop owner transaction filter must not expose cross-product AI actions');
assert(ownerTransactionsPage.includes("t('noCreditActions')"), 'desktop owner transaction page distinguishes free setup actions from charged actions');
assert(ownerTransactionsPage.includes('getExistingProjectsListWithoutLoader'), 'desktop owner transaction page uses read-only project summary lookup');
assert(!ownerTransactionsPage.includes('getMetadataProjectsList'), 'desktop owner transaction page does not use project lookup that can create defaults');
assert(ownerTransactionsPage.includes("aria-label={t('filterByAction')}"), 'desktop owner transaction action filter has a localized accessible name');
assert(ownerTransactionsPage.includes('htmlFor="transaction-start-date"'), 'desktop owner transaction start date has an associated localized label');
assert(ownerTransactionsPage.includes('htmlFor="transaction-end-date"'), 'desktop owner transaction end date has an associated localized label');
assert(ownerTransactionsPage.includes("id={{ start: 'transaction-start-date', end: 'transaction-end-date' }}"), 'desktop owner transaction date inputs retain stable label targets');
assert(ownerTransactionsPage.includes("aria-label={`${t('details')}: ${formatAiOperationActionLabel(record.action, t)}`}"), 'desktop owner transaction detail actions have localized row-specific accessible names');
[
  'ai_transactions_page_load_failed',
  'ai_transactions_projects_load_failed',
  'getTransactionsPageLogContext',
  "getBoundedRuntimeStringContext('actionFilter'",
  "getBoundedRuntimeStringContext('cursorId'",
  'logRuntimeFailure(AI_TRANSACTIONS_PAGE_LOAD_FAILED',
  'logRuntimeFailure(AI_TRANSACTIONS_PROJECTS_LOAD_FAILED',
].forEach((token) => {
  assert(ownerTransactionsPage.includes(token), `desktop owner transaction page includes bounded diagnostic token ${token}`);
});
assert(!ownerTransactionsPage.includes("import { logger }"), 'desktop owner transaction page must not import raw logger diagnostics');
assert(!ownerTransactionsPage.includes("logger.error('Error fetching transactions', error"), 'desktop owner transaction page must not raw-log transaction fetch failures');
assert(!ownerTransactionsPage.includes("logger.error('Error fetching projects for transactions', error"), 'desktop owner transaction page must not raw-log project lookup failures');

const aiOperationsDalAfterHardening = read('src/database/aiOperations/index.tsx');
assert(aiOperationsDalAfterHardening.includes('/api/ai-operations'), 'AI operations DAL reads through the sanitized server API');
assert(!aiOperationsDalAfterHardening.includes('@firebase/firestore'), 'AI operations DAL does not import browser Firestore query helpers');
assert(!aiOperationsDalAfterHardening.includes('firebaseClient'), 'AI operations DAL does not read full AI operation docs from the browser');
assert(aiOperationsDalAfterHardening.includes('data: AiOperationHistoryRow[]'), 'MenuList AI operations DAL exposes normalized row types');
assert(!aiOperationsDalAfterHardening.includes('as PaginatedResponse'), 'MenuList AI operations DAL does not cast unvalidated response envelopes');

const ownerTransactionModal = read('src/components/templates/main-app/transactions/TransactionDetailsModal.tsx');
assert(ownerTransactionModal.includes("platformRole === 'PLATFORM'"), 'desktop transaction raw AI debug is platform-role gated');
assert(!ownerTransactionModal.includes('Descriptions.Item label="Total Charge"'), 'desktop owner transaction details do not show internal provider charge');
assert(!ownerTransactionModal.includes("t('fullAiTransactionObject')"), 'desktop platform transaction debug does not label or render full AI transaction objects');
assert(!ownerTransactionModal.includes('JSON.stringify(transaction'), 'desktop platform transaction debug must not render full AI transaction JSON');
assert(ownerTransactionModal.includes("t('actualProviderCost')"), 'desktop platform transaction debug shows actual AI provider cost when recorded');
assert(ownerTransactionModal.includes('getAiOperationOwnerSummary'), 'desktop transaction details show shared owner-facing result summary');

const imageProcessingDetailsView = read('src/components/templates/main-app/transactions/transaction-details/ImageProcessingDetailsView.tsx');
assert(imageProcessingDetailsView.includes('renderExtractedMenuItems(clientResponse, categories, currencySymbol, t)'), 'desktop image-processing transaction details render extracted rows instead of raw response payloads');
assert(!imageProcessingDetailsView.includes('JSON.stringify(clientResponse'), 'desktop image-processing transaction details must not render raw clientResponse JSON');
assert(!imageProcessingDetailsView.includes("businessEntityType === 'B2B'"), 'desktop image-processing transaction details must not use B2B raw JSON branch');

const mobileTransactionsPage = read('src/components/mobile/screens/MobileTransactionsScreen.tsx');
assert(mobileTransactionsPage.includes("platformRole === 'PLATFORM'"), 'mobile transaction raw AI debug is platform-role gated');
assert(!mobileTransactionsPage.includes('tx.totalTokenCount.toLocaleString()} tokens'), 'mobile owner transaction list does not expose token counts');
assert(mobileTransactionsPage.includes("t('platformDebug')"), 'mobile platform transaction debug can inspect internal AI accounting fields');
assert(!mobileTransactionsPage.includes('JSON.stringify(tx'), 'mobile platform transaction debug must not render full AI transaction JSON');
assert(mobileTransactionsPage.includes('getAiOperationOwnerSummary'), 'mobile owner transaction list shows shared owner-facing result summaries');
assert(mobileTransactionsPage.includes('formatInrPaise'), 'mobile platform transaction debug formats paise-denominated cost values as INR');
assert(mobileTransactionsPage.includes("t('noCreditActions')"), 'mobile owner transaction screen distinguishes free setup actions from charged actions');
assert(mobileTransactionsPage.includes('response.requiresManualContinuation'), 'mobile owner transaction screen recognizes explicit capped-scan continuation');
assert(mobileTransactionsPage.includes('setManualFilterContinuation(true)'), 'mobile owner transaction screen stops automatic scans and offers manual continuation');
assert(mobileTransactionsPage.includes("{t('next')}"), 'mobile owner transaction screen exposes a translated manual continuation action');
assert(mobileTransactionsPage.includes('MENULIST_OWNER_AI_ACTIONS.map'), 'mobile owner transaction filter uses the MenuList-only action allowlist');
assert(!mobileTransactionsPage.includes('Object.values(AI_ACTIONS_TYPES)'), 'mobile owner transaction filter must not expose cross-product AI actions');
assert(mobileTransactionsPage.includes('type TransactionItem = AiOperationHistoryRow;'), 'mobile transaction state uses the normalized row contract');
assert(!mobileTransactionsPage.includes('useRef<any>'), 'mobile transaction cursor state is not untyped');
assert(mobileTransactionsPage.includes('const sessionScopeKey = ['), 'mobile transaction history binds state to exact browser session scope');
assert(mobileTransactionsPage.includes('const requestId = requestGuard.begin();'), 'mobile transaction history claims each page request');
assert(mobileTransactionsPage.includes('if (!requestGuard.isCurrent(requestId)) return;'), 'mobile transaction history refuses stale page responses');
assert(mobileTransactionsPage.includes('const visibleTransactions = transactionScopeKey === sessionScopeKey ? transactions : [];'), 'mobile transaction history partitions rendered rows by exact session scope');
assert(mobileTransactionsPage.includes('const visibleSelectedTransaction = transactionScopeKey === sessionScopeKey ? selectedTransaction : null;'), 'mobile transaction detail refuses a prior-scope selection');
assert(mobileTransactionsPage.includes('requestGuardRef.current?.invalidate();'), 'mobile transaction effect cleanup invalidates in-flight page work');
assert(!mobileTransactionsPage.includes('{transactions.map((tx)'), 'mobile transaction list must not render unpartitioned rows');
assert(mobileTransactionsPage.includes("aria-label={t('startDate')}"), 'mobile transaction start date has a stable accessible name');
assert(mobileTransactionsPage.includes("aria-label={t('endDate')}"), 'mobile transaction end date has a stable accessible name');
assert(mobileTransactionsPage.includes("<Popup aria-label={t('filterTransactions')}"), 'mobile transaction filter sheet has the visible filter title as its accessible dialog name');
assert(mobileTransactionsPage.includes("<Popup aria-label={t('transactionDetails')}"), 'mobile transaction details sheet has the visible details title as its accessible dialog name');
assert(mobileTransactionsPage.includes('aria-pressed={!draftActionFilter}'), 'mobile transaction all-actions filter exposes selected state');
assert(mobileTransactionsPage.includes('aria-pressed={draftActionFilter === option.value}'), 'mobile transaction action filters expose selected state');

const operationPresentation = read('src/lib/ai/operationPresentation.ts');
assert(operationPresentation.includes('formatAiOperationActionLabel'), 'AI operation presentation helper centralizes owner action labels');
assert(operationPresentation.includes('getAiOperationOwnerSummary'), 'AI operation presentation helper centralizes owner result summaries');
assert(operationPresentation.includes('formatAiOperationCredits'), 'AI operation presentation helper centralizes owner credit wording');
assert(operationPresentation.includes('export const MENULIST_OWNER_AI_ACTIONS'), 'AI operation presentation defines the MenuList owner action allowlist once');
assert(operationPresentation.includes('AI_ACTIONS_TYPES.AI_MENU_MANAGER_PLANNER'), 'AI Menu Manager planning has a specific owner presentation contract');
assert(operationPresentation.includes('"summary.preparedMenuUpdatePlan"'), 'AI Menu Manager history uses a specific owner summary instead of generic AI copy');
assert(operationPresentation.includes('dataSummary?.itemsCount'), 'AI operation presentation helper summarizes compact image-processing item counts');
assert(operationPresentation.includes('dataSummary?.categoriesCount'), 'AI operation presentation helper summarizes compact image-processing category counts');
assert(operationPresentation.includes('clientResponse?: AiOperationHistoryJsonValue;'), 'AI operation presentation accepts only the runtime JSON contract');
assert(!operationPresentation.includes('clientResponse?: any'), 'AI operation presentation must not restore an untyped client response');

{
  const balanceSync = read('src/services/ai/balanceSync.ts');
  const sessionProvider = read('src/providers/sessionProvider.tsx');
  const packageJson = JSON.parse(read('package.json'));
  [
    'billingStoreId: number;',
    'getPositiveCreditInteger(balance.billingStoreId)',
    'getNonNegativeCreditInteger(balance.monthlyCredits)',
    'getNonNegativeCreditInteger(balance.promotionalCredits ?? 0)',
    'getNonNegativeCreditInteger(balance.topUpCredits)',
    '!Number.isSafeInteger(monthlyCredits + promotionalCredits + topUpCredits)',
    'return { billingStoreId, monthlyCredits, promotionalCredits, topUpCredits };',
  ].forEach((token) => assert(balanceSync.includes(token), `AI balance sync validates scoped response token ${token}`));
  assert(!balanceSync.includes('Number(balance.'), 'AI balance sync must not coerce server response credit scalars');
  assert(sessionProvider.includes('normalizeAiBalanceUpdate((e as CustomEvent<unknown>).detail)'), 'session provider revalidates direct custom-event payloads');
  assert(sessionProvider.includes('getMenuListSubscriptionEntitlementScope(prev)'), 'session provider requires exact MenuList subscription product/workspace scope');
  assert(!sessionProvider.includes('Number(prev.storeId ?? prev.sId) !== detail.billingStoreId'), 'session provider must not coerce active subscription scope');
  assert(packageJson.scripts?.['test:ai-balance-sync-boundary'], 'package exposes AI balance sync scalar regression suite');
  assert(packageJson.scripts?.['verify:ai-accounting']?.includes('test:ai-balance-sync-boundary'), 'AI accounting aggregate runs balance sync scalar regression');
  assert(packageJson.scripts?.['test:ai-operation-log-scalar-boundary'], 'package exposes AI operation-log scalar regression suite');
  assert(packageJson.scripts?.['test:ai-operation-log-scalar-boundary']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'), 'AI operation-log scalar regression clears inherited credentials');
  assert(packageJson.scripts?.['verify:ai-accounting']?.includes('test:ai-operation-log-scalar-boundary'), 'AI accounting aggregate runs operation-log scalar regression');
  assert(packageJson.scripts?.['test:ai-operation-log-scope-boundary'], 'package exposes AI operation-log scope regression suite');
  assert(packageJson.scripts?.['test:ai-operation-log-scope-boundary']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'), 'AI operation-log scope regression clears inherited credentials');
  assert(packageJson.scripts?.['verify:ai-accounting']?.includes('test:ai-operation-log-scope-boundary'), 'AI accounting aggregate runs operation-log scope regression');
  assert(packageJson.scripts?.['test:ai-operation-log-response-summary-boundary'], 'package exposes AI operation response-summary regression suite');
  assert(packageJson.scripts?.['test:ai-operation-log-response-summary-boundary']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'), 'AI operation response-summary regression clears inherited credentials');
  assert(packageJson.scripts?.['verify:ai-accounting']?.includes('test:ai-operation-log-response-summary-boundary'), 'AI accounting aggregate runs operation response-summary regression');
  assert(packageJson.scripts?.['test:ai-operation-log-document-boundary'], 'package exposes AI operation document regression suite');
  assert(packageJson.scripts?.['test:ai-operation-log-document-boundary']?.includes('env -u GOOGLE_APPLICATION_CREDENTIALS'), 'AI operation document regression clears inherited credentials');
  assert(packageJson.scripts?.['verify:ai-accounting']?.includes('test:ai-operation-log-document-boundary'), 'AI accounting aggregate runs operation document regression');
}

{
  const batchPreview = read('src/components/templates/main-app/projects/editorView/AiImageGenerator/batchImageGeneration/index.tsx');
  assert(batchPreview.includes("import { CONTENT_CREDIT_OPERATION_COSTS } from '@data/shared/contentCreditPolicy';"), 'batch image preview imports the shared public credit policy');
  assert(batchPreview.includes('selectedItemsForBatch.length * CONTENT_CREDIT_OPERATION_COSTS.GENERATED_MENU_IMAGE'), 'batch image preview uses the five-credit generated-menu-image rate');
  assert(!batchPreview.includes('selectedItemsForBatch.length * 3'), 'batch image preview must not restore the stale three-credit estimate');

  const extractionOwnerCopy = [
    read('src/components/templates/main-app/projects/validation.ts'),
    read('src/components/templates/main-app/projects/FileList.tsx'),
    read('src/components/templates/main-app/projects/index.tsx'),
    read('src/components/templates/main-app/projects/utils/pdfUtils.ts'),
  ].join('\n');
  [
    'may use significant AI credits',
    'credits have been used',
    'will use additional AI credits',
    'Prevent wasting AI credits',
  ].forEach((token) => assert(!extractionOwnerCopy.includes(token), `zero-unit extraction copy must not claim ${token}`));
}

{
  const desktopBilling = read('src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx');
  const mobileBilling = read('src/components/mobile/screens/MobileBillingScreen.tsx');
  const pricingPlans = read('src/components/templates/main-app/billing/PricingPlansModal.tsx');
  const carryForwardNote = read('src/components/templates/main-app/billing/RemainingCreditNote.tsx');
  assert(!desktopBilling.includes('keepsMonthlyCapacityPrivate'), 'desktop Billing must not hide the maintained MenuList credit contract');
  assert(desktopBilling.includes('<Text strong>{monthlyCredits} of {monthlyCreditsAllowance}</Text>'), 'desktop MenuList Billing shows recurring balance and cycle allowance');
  assert(desktopBilling.includes('<Text>{monthlyCreditsUsed}</Text>'), 'desktop MenuList Billing shows recurring credits used this cycle');
  assert(desktopBilling.includes('<Text>{topUpCredits}</Text>'), 'desktop MenuList Billing shows exact purchased Pack balance');
  assert(desktopBilling.includes('<Text>{promotionalCredits}</Text>'), 'desktop MenuList Billing shows valid promotional balance when present');
  assert(desktopBilling.includes('totalCredits <= Math.max(10, monthlyCreditsAllowance * 0.2)'), 'desktop low-balance warning uses the complete MenuList balance');
  assert(mobileBilling.includes('<Text strong>{monthlyCredits} credits</Text>'), 'mobile MenuList Billing shows recurring balance');
  assert(mobileBilling.includes('<Text strong>{promotionalCredits} credits</Text>'), 'mobile MenuList Billing shows valid promotional balance when present');
  assert(mobileBilling.includes('<Text strong>{topUpCredits} credits</Text>'), 'mobile MenuList Billing shows exact purchased Pack balance');
  assert(pricingPlans.includes('Content enhancements included'), 'MenuList plan cards use generic included-enhancement copy');
  assert(!pricingPlans.includes('Monthly Credits'), 'MenuList plan cards do not expose monthly credit allowance');
  assert(!carryForwardNote.includes('units will carry over'), 'plan-change carry-forward note does not expose internal unit totals');
}

{
  const ownerLocale = read('public/locales/menulist.ai/en-US.json');
  [
    '"ai_menu_manager_planner": "Menu update plan"',
    '"preparedMenuUpdatePlan": "Prepared a menu update plan."',
    '"continueFilteredHistory": "No matches in this scan. Continue to check older activity."',
  ].forEach((token) => assert(ownerLocale.includes(token), `owner AI history locale includes ${token}`));
}

const answerlatticeTransactionsPage = read('src/components/templates/answerlattice/billing/AnswerlatticeTransactions.tsx');
assert(answerlatticeTransactionsPage.includes('useState<AiOperationHistoryRow[]>([])'), 'Answerlattice transaction state uses normalized operation rows');
assert(!answerlatticeTransactionsPage.includes('useState<any[]>([])'), 'Answerlattice transaction state must not accept untyped rows');

const aiSystemFirebaseLaunchBoundaryDoc = read('__docs__/ai-system-layer/ai-system-layer_firebase.md');
[
  'Not current launch certification or deploy approval',
  'External Certification Runbook',
  '`npm run verify:production-readiness-local`',
  '`npm run verify:ai-accounting`',
  '`npm run verify:functions-deploy-preflight`',
  'scoped Firebase deploy evidence for affected MenuList Functions',
  'provider smoke',
  'authenticated browser/device QA for affected owner/platform surfaces',
  'production-host smoke',
].forEach((token) => {
  assert(aiSystemFirebaseLaunchBoundaryDoc.includes(token), `AI System Firebase doc includes top launch boundary token ${token}`);
});
[
  'AI billing and AI System Layer top-boundary checkpoint',
  'AI System Firebase cost guide',
  'source-gated ledger/provider-health/Firebase-cost evidence only',
].forEach((token) => {
  assert(productionReadinessAudit.includes(token), `production readiness audit includes AI System top-boundary token ${token}`);
});
[
  'AI Billing and System Layer Doc Boundary',
  'AI System Firebase guide is source-bounded',
].forEach((token) => {
  assert(changelog.includes(token), `changelog includes AI System top-boundary token ${token}`);
});

if (failures > 0) {
  console.error(`\nAI accounting hardening verification failed with ${failures} issue(s).`);
  process.exit(1);
}

console.log('\nAI accounting hardening verification passed.');
