/**
 * Menu Image Processing Logic (Firebase Cloud Function)
 * 
 * This module handles menu image processing using Gemini AI.
 * It uploads all files simultaneously and processes them in batches.
 * 
 * Features:
 * - Parallel file upload (Promise.all)
 * - Batch processing (max 10 images per AI call)
 * - Category continuation across batches
 * - Exponential backoff for rate limiting
 * - Safety settings for food menu content
 */

import { createPartFromUri, createUserContent, GenerateContentResponse } from "@google/genai";
import * as functions from 'firebase-functions';
import * as fs from 'fs';
import {
    AI_MODEL,
    AI_OPERATIONS_COLLECTION,
    BASE_DELAY_BETWEEN_BATCHES_MS,
    CHARGE_PER_CREDIT,
    EXTRACTION_PROMPT_VERSION,
    GENERATION_CONFIG,
    MAX_DELAY_BETWEEN_BATCHES_MS,
    MAX_IMAGES_PER_BATCH,
    SAFETY_SETTINGS,
    TOKENS_PER_CREDIT
} from "../constants/ai";
import { firestoreAdmin } from "../firebaseAdmin";
import { genAIClient } from "../genAiClient";
import { executeWithCircuitBreaker, geminiCircuitBreaker } from "../lib/circuitBreaker";
import { logger } from "../lib/logger";
import { checkExpensiveAIRateLimit } from "../lib/rateLimit";
import * as Sentry from "../lib/sentry";
import {
    ExtractedMenuData,
    MenuCategory,
    MenuFileToProcess,
    MenuItem,
    ProcessMenuImagesRequest,
    ProcessMenuImagesResponse,
    QualityDetails,
    QualityScore,
    TargetLanguage
} from "../types";
import { processAIResponseForFirebase } from "./aiResponseUtils";
import { ExistingCategoriesContext, getParallelProcessingPrompt } from "./parallelProcessingPrompt";

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT (Uses parallel processing prompt with sourceFileIndex)
// ═══════════════════════════════════════════════════════════════

// Note: getParallelProcessingPrompt is called directly in processSingleBatch
// with existingContext parameter for category continuation across batches

// ═══════════════════════════════════════════════════════════════
// FILE UPLOAD (PARALLEL)
// ═══════════════════════════════════════════════════════════════

interface UploadedFile {
    uri: string;
    mimeType: string;
    name: string;
}

/**
 * Upload a single file to Gemini
 */
async function uploadFileToGemini(file: MenuFileToProcess): Promise<UploadedFile | null> {
    const logger = functions.logger;
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const tempFilePath = `/tmp/${uniqueId}-${file.name}`;

    try {
        // Validate file URL
        if (!file.url) {
            throw new Error('File URL is required');
        }

        // Fetch file from URL
        const response = await fetch(file.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Write to temp file
        fs.writeFileSync(tempFilePath, uint8Array);

        // Upload to Gemini
        const document = await genAIClient.files.upload({
            file: tempFilePath,
            config: { mimeType: file.type },
        });

        logger.info(`[uploadFileToGemini] Upload successful: ${file.name}`, { documentName: document?.name });

        return {
            uri: document.uri!,
            mimeType: document.mimeType!,
            name: file.name,
        };
    } catch (error) {
        logger.error(`[uploadFileToGemini] Failed to upload: ${file.name}`, error);
        return null;
    } finally {
        // Cleanup temp file
        try {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        } catch (cleanupError) {
            logger.warn(`[uploadFileToGemini] Cleanup warning: ${tempFilePath}`);
        }
    }
}

/**
 * Upload all files in parallel using Promise.all
 */
async function uploadFilesInParallel(files: MenuFileToProcess[]): Promise<UploadedFile[]> {
    const logger = functions.logger;
    logger.info(`[uploadFilesInParallel] Starting parallel upload of ${files.length} files`);

    const uploadPromises = files.map(file => uploadFileToGemini(file));
    const results = await Promise.all(uploadPromises);

    // Filter out failed uploads
    const validUploads = results.filter((f): f is UploadedFile => f !== null);
    logger.info(`[uploadFilesInParallel] Successfully uploaded ${validUploads.length}/${files.length} files`);

    return validUploads;
}

// ═══════════════════════════════════════════════════════════════
// QUALITY SCORING
// ═══════════════════════════════════════════════════════════════

function scoreExtractionQuality(data: ExtractedMenuData | null): QualityScore {
    const emptyDetails: QualityDetails = {
        categoryQuality: 0,
        itemQuality: 0,
        priceQuality: 0,
        descriptionQuality: 0
    };

    if (!data || !data.categories || !data.items) {
        return {
            score: 0,
            isLowQuality: true,
            warning: 'No data was extracted. Please upload a clearer image.',
            details: emptyDetails
        };
    }

    let categoryScore = 0;
    let itemScore = 0;
    let priceScore = 0;
    let descriptionScore = 0;

    // Category Quality (25 points)
    if (data.categories.length > 0) {
        const avgCategoryLength = data.categories.reduce((sum, cat) => {
            const firstLang = Object.values(cat.name || {})[0] || '';
            return sum + firstLang.length;
        }, 0) / data.categories.length;

        categoryScore = avgCategoryLength >= 3 ? 25 : avgCategoryLength >= 2 ? 15 : 5;
    }

    // Item Quality (10 points)
    if (data.items.length > 0) {
        itemScore = 10;
    }

    // Price Quality (50 points)
    if (data.items.length > 0) {
        const itemsWithPrices = data.items.filter(item => {
            if (item.price != null && item.price !== '') return true;
            if (item.attributes && item.attributes.length > 0) {
                return item.attributes.some(attr => attr.price != null && attr.price !== '');
            }
            return false;
        });
        const pricePercentage = (itemsWithPrices.length / data.items.length) * 100;
        priceScore = Math.round((pricePercentage / 100) * 50);
    }

    // Description Quality (25 points)
    if (data.items.length > 0) {
        const itemsWithDescriptions = data.items.filter(item => {
            if (!item.description) return false;
            const firstDesc = Object.values(item.description)[0] || '';
            return firstDesc.length > 10;
        });
        const descPercentage = (itemsWithDescriptions.length / data.items.length) * 100;
        descriptionScore = Math.round((descPercentage / 100) * 25);
    }

    const totalScore = Math.min(100, categoryScore + itemScore + priceScore + descriptionScore);
    const isLowQuality = totalScore < 40;

    return {
        score: totalScore,
        isLowQuality,
        warning: isLowQuality
            ? 'The extracted data quality is low. Please review carefully or try uploading a clearer image.'
            : undefined,
        details: {
            categoryQuality: categoryScore,
            itemQuality: itemScore,
            priceQuality: priceScore,
            descriptionQuality: descriptionScore
        }
    };
}

// ═══════════════════════════════════════════════════════════════
// RETRY LOGIC
// ═══════════════════════════════════════════════════════════════

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 2,
    baseDelay: number = 2000
): Promise<T> {
    const logger = functions.logger;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Don't retry on client errors
            if (error.status >= 400 && error.status < 500) {
                logger.warn(`[Retry] Client error (${error.status}) - not retrying`);
                throw error;
            }

            // Don't retry on quota errors
            if (error.message?.toLowerCase().includes('quota') ||
                error.message?.toLowerCase().includes('limit exceeded')) {
                logger.warn('[Retry] Quota error - not retrying');
                throw error;
            }

            if (attempt === maxAttempts) {
                logger.error(`[Retry] Max attempts (${maxAttempts + 1}) reached`);
                throw lastError;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            logger.info(`[Retry] Attempt ${attempt + 1}/${maxAttempts + 1} failed - retrying in ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError || new Error('Retry failed');
}

// ═══════════════════════════════════════════════════════════════
// DATABASE OPERATIONS (Match route.ts addAiOperation)
// ═══════════════════════════════════════════════════════════════

interface TransactionObject {
    transactionId: string | null;
    files: MenuFileToProcess[];
    targetLanguages: TargetLanguage[];
    projectId: string;
    fileId: string;
    action: string;
    clientResponse: any;
    geminiResponse: string;
    generationConfig: typeof GENERATION_CONFIG;
    model: string;
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
    processingTime: number;
    tokenPerCredit: number;
    chargePerCredit: number;
    totalCredits: number;
    totalCharge: number;
}

/**
 * Remove undefined values from object (Firestore doesn't accept undefined)
 */
function removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
        return null;
    }
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
    }
    if (typeof obj === 'object') {
        const cleaned: any = {};
        for (const [key, value] of Object.entries(obj)) {
            if (value !== undefined) {
                cleaned[key] = removeUndefined(value);
            }
        }
        return cleaned;
    }
    return obj;
}

/**
 * Add AI operation to Firestore (matches addAiOperation from @database/aiOperations)
 */
async function addAiOperation(transactionObject: TransactionObject): Promise<string> {
    const logger = functions.logger;
    try {
        // Clean undefined values before saving to Firestore
        const cleanedTransaction = removeUndefined({
            ...transactionObject,
            createdAt: new Date(),
            source: 'firebase-function', // Mark as from Firebase function
        });

        const docRef = await firestoreAdmin.collection(AI_OPERATIONS_COLLECTION).add(cleanedTransaction);
        logger.info(`[addAiOperation] Transaction recorded: ${docRef.id}`);
        return docRef.id;
    } catch (error) {
        logger.error('[addAiOperation] Failed to record transaction', error);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════════
// BATCH PROCESSING HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Split an array into chunks of specified size
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Build existing categories context for batch continuation
 */
function buildExistingCategoriesContext(
    categories: MenuCategory[],
    items: MenuItem[]
): ExistingCategoriesContext {
    const lastCategoryId = categories.length > 0
        ? Math.max(...categories.map(c => parseInt(String(c.id)) || 0))
        : 0;
    const lastItemId = items.length > 0
        ? Math.max(...items.map(i => parseInt(String(i.id)) || 0))
        : 0;

    return {
        categories,
        lastCategoryId,
        lastItemId,
    };
}

/**
 * Merge extracted data from multiple batches
 * - Combines categories (deduplicates by ID)
 * - Combines items
 * - Combines fileMessages with offset adjustment (Section 8.14)
 * - Preserves languages from first batch
 */
function mergeExtractedData(
    accumulated: ExtractedMenuData,
    newData: ExtractedMenuData,
    sourceFileOffset: number
): ExtractedMenuData {
    // Adjust sourceFileIndex for items and categories from subsequent batches
    const adjustedCategories = newData.categories.map(cat => ({
        ...cat,
        sourceFileIndex: (cat as any).sourceFileIndex !== undefined
            ? (cat as any).sourceFileIndex + sourceFileOffset
            : sourceFileOffset,
    }));

    const adjustedItems = newData.items.map(item => ({
        ...item,
        sourceFileIndex: (item as any).sourceFileIndex !== undefined
            ? (item as any).sourceFileIndex + sourceFileOffset
            : sourceFileOffset,
    }));

    // Adjust sourceFileIndex for fileMessages from subsequent batches
    const adjustedFileMessages = (newData.fileMessages || []).map(msg => ({
        ...msg,
        sourceFileIndex: msg.sourceFileIndex + sourceFileOffset,
        // Adjust itemIds in details if present
        details: msg.details ? {
            ...msg.details,
            affectedFields: msg.details.affectedFields?.map(field => ({
                ...field,
                // itemId references would need adjustment too if they exist
                itemId: field.itemId !== undefined ? field.itemId : undefined,
            })),
        } : undefined,
    }));
    const adjustedBusinessAttributeSuggestions = (newData.businessAttributeSuggestions || []).map(suggestion => ({
        ...suggestion,
        sourceFileIndex: suggestion.sourceFileIndex !== undefined
            ? suggestion.sourceFileIndex + sourceFileOffset
            : sourceFileOffset,
    }));

    // Merge categories (avoid duplicates by ID)
    const existingCategoryIds = new Set(accumulated.categories.map(c => String(c.id)));
    const uniqueNewCategories = adjustedCategories.filter(
        c => !existingCategoryIds.has(String(c.id))
    );

    // Merge fileMessages
    const mergedFileMessages = [
        ...(accumulated.fileMessages || []),
        ...adjustedFileMessages,
    ];
    const mergedBusinessAttributeSuggestions = [
        ...(accumulated.businessAttributeSuggestions || []),
        ...adjustedBusinessAttributeSuggestions,
    ];

    return {
        languages: accumulated.languages.length > 0 ? accumulated.languages : newData.languages,
        categories: [...accumulated.categories, ...uniqueNewCategories],
        items: [...accumulated.items, ...adjustedItems],
        ...(mergedBusinessAttributeSuggestions.length > 0 ? { businessAttributeSuggestions: mergedBusinessAttributeSuggestions } : {}),
        // Only include fileMessages if there are any
        ...(mergedFileMessages.length > 0 ? { fileMessages: mergedFileMessages } : {}),
    };
}

interface BatchResult {
    success: boolean;
    data: ExtractedMenuData | null;
    message: string;
    batchIndex: number;
    filesProcessed: number;
    tokenUsage: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
    };
    failedFileIndices: number[];
    /** Raw AI response text for extraction provenance (truncated to 10KB) */
    rawResponseText?: string;
}

/**
 * Process a single batch of images
 */
async function processSingleBatch(
    uploadedFiles: UploadedFile[],
    targetLanguages: TargetLanguage[],
    existingContext: ExistingCategoriesContext | undefined,
    batchIndex: number,
    requestId: string,
    totalBatches: number,
    businessType?: string,
    businessCategory?: string
): Promise<BatchResult> {
    const startTime = Date.now();

    try {
        const languageString = targetLanguages.map((lang: TargetLanguage) => `${lang.name} (${lang.code})`).join(', ');

        const contentParts = [
            ...uploadedFiles.map(file => createPartFromUri(file.uri, file.mimeType)),
            `Extract menu data. Preserve the detected source language in the output and include translated values for: ${languageString}. Always include English in multilingual fields.`
        ];

        logger.info(`[processSingleBatch] Processing batch ${batchIndex + 1}`, {
            requestId,
            batchIndex,
            filesCount: uploadedFiles.length,
            hasExistingContext: !!existingContext,
            existingCategoriesCount: existingContext?.categories.length || 0,
        });

        // Track AI call start
        logger.aiCall('Gemini Extract', 'started', {
            model: AI_MODEL,
            batchIndex,
            totalBatches,
        });

        // Execute AI call with circuit breaker + retry protection
        const response = await executeWithCircuitBreaker(
            () => retryWithBackoff<GenerateContentResponse>(async () => {
                return await genAIClient.models.generateContent({
                    model: AI_MODEL,
                    contents: [createUserContent(contentParts)],
                    config: {
                        ...GENERATION_CONFIG,
                        systemInstruction: getParallelProcessingPrompt(existingContext, businessType, businessCategory),
                        safetySettings: SAFETY_SETTINGS,
                    },
                });
            }, 2, 2000),
            geminiCircuitBreaker
        );

        const responseText = response.text;
        if (!responseText) {
            const candidates = (response as any).candidates;
            const finishReason = candidates?.[0]?.finishReason;
            throw new Error(`Empty response from AI (finishReason: ${finishReason || 'unknown'})`);
        }

        // Preserve raw AI response for extraction provenance (P0 hardening)
        const MAX_RAW_TEXT_LENGTH = 10000;
        const rawTextForProvenance = responseText.length > MAX_RAW_TEXT_LENGTH
            ? responseText.substring(0, MAX_RAW_TEXT_LENGTH)
            : responseText;

        const parsedData = processAIResponseForFirebase(responseText);

        const duration = Date.now() - startTime;
        const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

        // Track AI call success
        logger.aiCall('Gemini Extract', 'success', {
            model: AI_MODEL,
            batchIndex,
            totalBatches,
            duration,
            tokensUsed,
        });

        logger.info(`[processSingleBatch] Batch ${batchIndex + 1} completed`, {
            requestId,
            batchIndex,
            categoriesCount: parsedData.data?.categories?.length || 0,
            itemsCount: parsedData.data?.items?.length || 0,
            duration,
        });

        return {
            success: true,
            data: parsedData.data,
            message: parsedData.message || '',
            batchIndex,
            filesProcessed: uploadedFiles.length,
            tokenUsage: {
                promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
                candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
                totalTokenCount: tokensUsed,
            },
            failedFileIndices: [],
            rawResponseText: rawTextForProvenance,
        };
    } catch (error: any) {
        const duration = Date.now() - startTime;

        // Track AI call failure
        logger.aiCall('Gemini Extract', 'error', {
            model: AI_MODEL,
            batchIndex,
            totalBatches,
            duration,
            error: error.message,
        });

        logger.error(`[processSingleBatch] Batch ${batchIndex + 1} failed`, error, {
            requestId,
            batchIndex,
        });

        return {
            success: false,
            data: null,
            message: `Batch ${batchIndex + 1} failed: ${error.message}`,
            batchIndex,
            filesProcessed: 0,
            tokenUsage: {
                promptTokenCount: 0,
                candidatesTokenCount: 0,
                totalTokenCount: 0,
            },
            failedFileIndices: uploadedFiles.map((_, i) => batchIndex * MAX_IMAGES_PER_BATCH + i),
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// MAIN PROCESSING LOGIC
// ═══════════════════════════════════════════════════════════════

function generateRequestId(): string {
    return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Calculate exponential backoff delay for rate limit protection
 * Delay increases with each batch: 1s, 2s, 4s, 8s (capped)
 */
function calculateBatchDelay(batchIndex: number): number {
    const exponentialDelay = BASE_DELAY_BETWEEN_BATCHES_MS * Math.pow(2, batchIndex);
    return Math.min(exponentialDelay, MAX_DELAY_BETWEEN_BATCHES_MS);
}

/**
 * Sleep helper for batch throttling
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process menu images with batch support
 * 
 * WORKFLOW:
 * 1. Upload all files to Gemini simultaneously (Promise.all)
 * 2. Chunk files into batches of MAX_IMAGES_PER_BATCH (10)
 * 3. Process batches sequentially with category continuation
 * 4. Merge results from all batches
 * 5. Build transactionObject with ALL fields
 * 6. Save to database via addAiOperation
 * 7. Return structured data with quality score and transaction info
 * 
 * ERROR HANDLING:
 * - If a batch fails, only that batch's data is lost
 * - Successfully processed batches are returned
 * - Failed file indices are tracked for client notification
 */
export async function processMenuImagesLogic(
    request: ProcessMenuImagesRequest
): Promise<ProcessMenuImagesResponse> {
    // Initialize Sentry for this function invocation
    Sentry.initSentry();

    const requestId = generateRequestId();
    const startTime = Date.now();

    const { files, targetLanguages, projectId = 'N/A', fileId = 'N/A', action = 'IMAGE_PROCESSING', businessType, businessCategory } = request;

    // Set Sentry context for this processing request
    Sentry.setProcessingContext({
        action,
        filesCount: files.length,
        targetLanguages: targetLanguages.map(l => l.code),
        projectId,
        fileId,
    });

    // Start performance transaction
    const transaction = Sentry.startTransaction('processMenuImages', 'ai.image-processing');

    logger.info(`[processMenuImages] Starting request ${requestId}`, {
        filesCount: files.length,
        targetLanguages: targetLanguages.map(l => l.code),
        projectId,
        fileId,
        maxImagesPerBatch: MAX_IMAGES_PER_BATCH,
    });

    logger.milestone('Request started', { requestId, filesCount: files.length });

    try {
        // Step 0: Check rate limit using Upstash (matches route.ts checkExpensiveAILimit)
        const rateLimit = await checkExpensiveAIRateLimit(projectId);
        if (!rateLimit.allowed) {
            const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
            logger.warn(`[processMenuImages] Rate limit exceeded`, { projectId, waitSeconds });
            throw new Error(`Rate limit exceeded. Please wait ${waitSeconds} seconds and try again.`);
        }

        // Step 1: Upload all files in parallel
        const uploadedFiles = await uploadFilesInParallel(files);

        if (uploadedFiles.length === 0) {
            throw new Error('No files were uploaded successfully');
        }

        logger.info(`[processMenuImages] ${uploadedFiles.length} files uploaded successfully`);

        // Step 2: Chunk files into batches
        const fileBatches = chunkArray(uploadedFiles, MAX_IMAGES_PER_BATCH);
        const totalBatches = fileBatches.length;

        logger.info(`[processMenuImages] Processing ${totalBatches} batch(es)`, {
            requestId,
            totalFiles: uploadedFiles.length,
            totalBatches,
            batchSizes: fileBatches.map(b => b.length),
        });

        // Step 3: Process batches sequentially with category continuation
        let accumulatedData: ExtractedMenuData = {
            languages: [],
            categories: [],
            items: [],
        };
        let totalTokenUsage = {
            promptTokenCount: 0,
            candidatesTokenCount: 0,
            totalTokenCount: 0,
        };
        const batchResults: BatchResult[] = [];
        const allFailedFileIndices: number[] = [];
        const batchMessages: string[] = [];
        let sourceFileOffset = 0;

        for (let batchIndex = 0; batchIndex < fileBatches.length; batchIndex++) {
            const batch = fileBatches[batchIndex];

            // Exponential backoff delay between batches (skip first batch)
            // This prevents rate limiting when processing many images
            // Delay pattern: 0s (first), 1s, 2s, 4s, 8s (capped)
            if (batchIndex > 0) {
                const delayMs = calculateBatchDelay(batchIndex - 1);
                logger.info(`[processMenuImages] Throttling: waiting ${delayMs}ms before batch ${batchIndex + 1}`, {
                    requestId,
                    batchIndex,
                    delayMs,
                });
                await sleep(delayMs);
            }

            // Build context from previous batches (for category continuation)
            const existingContext = batchIndex > 0 && accumulatedData.categories.length > 0
                ? buildExistingCategoriesContext(accumulatedData.categories, accumulatedData.items)
                : undefined;

            const batchResult = await processSingleBatch(
                batch,
                targetLanguages,
                existingContext,
                batchIndex,
                requestId,
                totalBatches,
                businessType,
                businessCategory
            );

            batchResults.push(batchResult);

            // Accumulate token usage regardless of success
            totalTokenUsage.promptTokenCount += batchResult.tokenUsage.promptTokenCount;
            totalTokenUsage.candidatesTokenCount += batchResult.tokenUsage.candidatesTokenCount;
            totalTokenUsage.totalTokenCount += batchResult.tokenUsage.totalTokenCount;

            if (batchResult.success && batchResult.data) {
                // Merge successful batch data
                accumulatedData = mergeExtractedData(accumulatedData, batchResult.data, sourceFileOffset);

                if (batchResult.message) {
                    batchMessages.push(`Batch ${batchIndex + 1}: ${batchResult.message}`);
                }
            } else {
                // Track failed batch
                allFailedFileIndices.push(...batchResult.failedFileIndices);
                batchMessages.push(batchResult.message);
                logger.warn(`[processMenuImages] Batch ${batchIndex + 1} failed, continuing with remaining batches`, {
                    requestId,
                    batchIndex,
                    failedIndices: batchResult.failedFileIndices,
                });
            }

            sourceFileOffset += batch.length;
        }

        const processingTime = Date.now() - startTime;

        // Log batch processing summary
        const successfulBatches = batchResults.filter(b => b.success).length;
        logger.info(`[processMenuImages] Batch processing completed`, {
            requestId,
            totalBatches,
            successfulBatches,
            failedBatches: totalBatches - successfulBatches,
            totalCategories: accumulatedData.categories.length,
            totalItems: accumulatedData.items.length,
            failedFileIndices: allFailedFileIndices,
            totalTokens: totalTokenUsage.totalTokenCount,
        });

        // Step 3b: Fail if ALL batches failed (no data extracted)
        // Without this check, empty data would be saved to the project as COMPLETED
        if (successfulBatches === 0) {
            const failureMessages = batchResults.map(b => b.message).filter(Boolean).join('; ');
            throw new Error(
                `All ${totalBatches} extraction batch(es) failed — no data extracted. ` +
                `Details: ${failureMessages || 'Unknown error'}`
            );
        }

        // Step 4: Score quality
        const quality = scoreExtractionQuality(accumulatedData);

        // Build combined message
        let combinedMessage = '';
        if (allFailedFileIndices.length > 0) {
            combinedMessage = `Some images failed to process (indices: ${allFailedFileIndices.join(', ')}). `;
        }
        if (batchMessages.length > 0) {
            combinedMessage += batchMessages.filter(m => m).join(' | ');
        }
        if (quality.warning) {
            combinedMessage += (combinedMessage ? ' ' : '') + quality.warning;
        }

        // Step 4b: Build raw batch responses for provenance
        const rawBatchResponses = batchResults
            .filter(b => b.rawResponseText)
            .map(b => ({
                batchIndex: b.batchIndex,
                rawText: b.rawResponseText!,
                truncated: b.rawResponseText!.length >= 10000,
            }));

        // Step 5: Build client response
        const clientResponse = {
            message: combinedMessage,
            data: accumulatedData,
            qualityScore: quality.score,
            qualityDetails: quality.details,
        };

        // Step 6: Build FULL transactionObject
        const transactionObject: TransactionObject = {
            transactionId: null,
            files,
            targetLanguages,
            projectId,
            fileId,
            action,
            clientResponse,
            geminiResponse: JSON.stringify({ batchResults: batchResults.map(b => ({ batchIndex: b.batchIndex, success: b.success, filesProcessed: b.filesProcessed })) }),
            generationConfig: GENERATION_CONFIG,
            model: AI_MODEL,
            promptTokenCount: totalTokenUsage.promptTokenCount,
            candidatesTokenCount: totalTokenUsage.candidatesTokenCount,
            totalTokenCount: totalTokenUsage.totalTokenCount,
            processingTime,
            tokenPerCredit: TOKENS_PER_CREDIT,
            chargePerCredit: CHARGE_PER_CREDIT,
            totalCredits: totalTokenUsage.totalTokenCount / TOKENS_PER_CREDIT,
            totalCharge: CHARGE_PER_CREDIT * (totalTokenUsage.totalTokenCount / TOKENS_PER_CREDIT),
        };

        // Step 7: Add operation to database
        let transactionRecorded = true;
        try {
            transactionObject.transactionId = await addAiOperation(transactionObject);
            logger.info('[processMenuImages] Transaction recorded', {
                requestId,
                transactionId: transactionObject.transactionId
            });
        } catch (transactionError) {
            transactionRecorded = false;
            logger.error('[processMenuImages] Failed to record transaction', {
                requestId,
                projectId,
                fileId,
                totalCharge: transactionObject.totalCharge,
                error: (transactionError as Error).message,
            });
        }

        // Step 8: Log success
        logger.info(`[processMenuImages] Request completed`, {
            requestId,
            processingTime,
            qualityScore: quality.score,
            categoriesCount: accumulatedData.categories.length,
            itemsCount: accumulatedData.items.length,
            transactionRecorded,
            transactionId: transactionObject.transactionId,
            totalBatches,
            successfulBatches,
        });

        // Step 9: Return response
        logger.milestone('Request completed', {
            requestId,
            processingTime,
            qualityScore: quality.score,
            totalItems: accumulatedData.items.length,
        });

        transaction.finish('ok');
        await Sentry.flush();

        return {
            data: {
                message: clientResponse.message,
                data: accumulatedData,
                qualityScore: quality.score,
                qualityDetails: quality.details,
            },
            transaction: {
                requestId,
                totalCharge: transactionObject.totalCharge,
                totalCredits: transactionObject.totalCredits,
                processingTime: transactionObject.processingTime,
                transactionId: transactionObject.transactionId,
                recorded: transactionRecorded,
            },
            // Extraction provenance (P0 hardening)
            provenance: {
                rawBatchResponses,
                promptVersion: EXTRACTION_PROMPT_VERSION,
                model: AI_MODEL,
            },
        };

    } catch (error: any) {
        logger.error(`[processMenuImages] Request failed`, error, {
            requestId,
            projectId,
            fileId,
            processingTime: Date.now() - startTime,
        });

        transaction.finish('error');
        await Sentry.flush();

        throw error;
    }
}
