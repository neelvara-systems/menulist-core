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
import { FUNCTION_RETENTION_CONFIG } from "../constants/features";
import { firestoreAdmin } from "../firebaseAdmin";
import { genAIClient } from "../genAiClient";
import { executeWithCircuitBreaker, geminiCircuitBreaker } from "../lib/circuitBreaker";
import { logger } from "../lib/logger";
import { checkExpensiveAIRateLimit } from "../lib/rateLimit";
import * as Sentry from "../lib/sentry";
import type {
    ExtractedBusinessProfile,
    ExtractedBusinessProfileConfidence,
    ExtractedBusinessProfileSuggestion,
} from "../sharedData/extractedBusinessProfile";
import {
    MENU_EXTRACTION_DESTINATION_TYPES,
    MENU_EXTRACTION_JOB_LIMITS,
    MENU_EXTRACTION_SOURCES,
} from "../sharedData/menuExtractionJob";
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
import {
    isResponseBodyTooLargeError,
    readResponseUint8ArrayWithLimit,
} from "../utils/boundedResponseBody";
import { validateNetworkTargetUrl } from "../utils/networkTarget";
import { buildSafeTempFilePath } from "../utils/safeTempFile";
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

const PROFILE_CONFIDENCE_RANK: Record<ExtractedBusinessProfileConfidence, number> = {
    high: 3,
    medium: 2,
    low: 1,
};
const DEFAULT_STORAGE_BUCKET = "menulist-qa.appspot.com";
const MENU_IMAGE_FILE_URL_MISSING_CODE = 'MENU_IMAGE_FILE_URL_MISSING';
const MENU_IMAGE_FILE_URL_REJECTED_CODE = 'MENU_IMAGE_FILE_URL_REJECTED';
const MENU_IMAGE_FILE_FETCH_FAILED_CODE = 'MENU_IMAGE_FILE_FETCH_FAILED';
const MENU_IMAGE_FILE_TOO_LARGE_CODE = 'MENU_IMAGE_FILE_TOO_LARGE';
const MENU_IMAGE_FILE_UPLOAD_FAILED_CODE = 'MENU_IMAGE_FILE_UPLOAD_FAILED';
const MENU_IMAGE_FILE_CLEANUP_FAILED_CODE = 'MENU_IMAGE_FILE_CLEANUP_FAILED';
const MENU_IMAGE_RETRY_CLIENT_ERROR_CODE = 'MENU_IMAGE_RETRY_CLIENT_ERROR';
const MENU_IMAGE_RETRY_RATE_LIMIT_CODE = 'MENU_IMAGE_RETRY_RATE_LIMIT';
const MENU_IMAGE_RETRY_EXHAUSTED_CODE = 'MENU_IMAGE_RETRY_EXHAUSTED';
const MENU_IMAGE_AI_EMPTY_RESPONSE_CODE = 'MENU_IMAGE_AI_EMPTY_RESPONSE';
const MENU_IMAGE_BATCH_FAILED_CODE = 'MENU_IMAGE_BATCH_FAILED';
const MENU_IMAGE_REQUEST_FAILED_CODE = 'MENU_IMAGE_REQUEST_FAILED';
const MENU_IMAGE_AI_OPERATION_WRITE_FAILED_CODE = 'MENU_IMAGE_AI_OPERATION_WRITE_FAILED';
const MENU_IMAGE_FAILURE_TRANSACTION_WRITE_FAILED_CODE = 'MENU_IMAGE_FAILURE_TRANSACTION_WRITE_FAILED';
const MENU_EXTRACTION_FAILED_MESSAGE = 'Menu extraction failed';

function getExtractionErrorName(error: unknown): string {
    if (error instanceof Error) return (error.name || 'Error').slice(0, 96);
    return typeof error;
}

function getExtractionErrorCode(error: unknown): string | number | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'number') return code;
    if (typeof code === 'string') return code.slice(0, 96);
    return undefined;
}

function getExtractionErrorStatus(error: unknown): number | undefined {
    if (!error || typeof error !== 'object') return undefined;
    const value = 'status' in error
        ? (error as { status?: unknown }).status
        : (error as { statusCode?: unknown }).statusCode;
    const status = Number(value);
    return Number.isFinite(status) ? status : undefined;
}

function getExtractionErrorContext(error: unknown): {
    sourceErrorName: string;
    sourceErrorCode?: string | number;
    sourceErrorStatus?: number;
} {
    return {
        sourceErrorName: getExtractionErrorName(error),
        sourceErrorCode: getExtractionErrorCode(error),
        sourceErrorStatus: getExtractionErrorStatus(error),
    };
}

function getExtractionIdLogContext(label: string, value: unknown): Record<string, boolean | number> {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
}

function getExtractionRequestLogContext(context: {
    fileId?: unknown;
    projectId?: unknown;
    requestId?: unknown;
    transactionId?: unknown;
}): Record<string, boolean | number> {
    return {
        ...getExtractionIdLogContext('requestId', context.requestId),
        ...getExtractionIdLogContext('projectId', context.projectId),
        ...getExtractionIdLogContext('fileId', context.fileId),
        ...getExtractionIdLogContext('transactionId', context.transactionId),
    };
}

function createProcessingError(code: string, context: Record<string, unknown> = {}): Error {
    const error = new Error(code);
    (error as any).code = code;
    Object.entries(context).forEach(([key, value]) => {
        (error as any)[key] = value;
    });
    return error;
}

function getAllowedStorageBucket(): string {
    return process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || DEFAULT_STORAGE_BUCKET;
}

function getStoragePathFromDownloadUrl(value: string): string | null {
    try {
        const url = new URL(value);
        if (process.env.FUNCTIONS_EMULATOR === "true" && ["localhost", "127.0.0.1"].includes(url.hostname)) {
            return "local-dev";
        }
        if (url.protocol !== "https:") return null;

        const allowedBucket = getAllowedStorageBucket();
        if (url.hostname === "firebasestorage.googleapis.com") {
            const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/([^?]+)$/);
            if (decodeURIComponent(match?.[1] || "") !== allowedBucket) return null;
            return match?.[2] ? decodeURIComponent(match[2]) : null;
        }

        if (url.hostname === "storage.googleapis.com") {
            const parts = url.pathname.split("/").filter(Boolean);
            const bucket = decodeURIComponent(parts[0] || "");
            if (bucket !== allowedBucket) return null;
            return parts.length >= 2 ? decodeURIComponent(parts.slice(1).join("/")) : null;
        }

        return null;
    } catch {
        return null;
    }
}

function isAllowedExtractionFileStoragePath(request: ProcessMenuImagesRequest, storagePath: string): boolean {
    if (storagePath === "local-dev") return process.env.FUNCTIONS_EMULATOR === "true";

    const context = request.auditContext;
    if (!context) return false;

    const tId = context.tId === undefined || context.tId === null ? "" : String(context.tId);
    const sId = context.sId === undefined || context.sId === null ? "" : String(context.sId);
    const projectId = request.projectId || "";
    const destinationId = context.destinationId || "";

    if (
        context.destinationType === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT &&
        destinationId
    ) {
        return storagePath.startsWith(`publicMenuDrafts/${destinationId}/`);
    }

    if (
        context.destinationType === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING &&
        destinationId
    ) {
        return storagePath.startsWith(`messagingOnboarding/${destinationId}/`);
    }

    if (
        context.source === MENU_EXTRACTION_SOURCES.MESSAGING_ONBOARDING &&
        projectId.startsWith("msg-onboarding-")
    ) {
        const sessionId = projectId.replace(/^msg-onboarding-/, "");
        return Boolean(sessionId) && storagePath.startsWith(`messagingOnboarding/${sessionId}/`);
    }

    if (context.source === MENU_EXTRACTION_SOURCES.MENU_LINK_IMPORT) {
        return Boolean(tId && sId && projectId) &&
            storagePath.startsWith(`menuLinkImports/${tId}/${sId}/${projectId}/`);
    }

    return Boolean(tId && sId) && storagePath.startsWith(`projects/files/${tId}/${sId}/`);
}

async function resolveValidatedFileFetchUrl(
    file: MenuFileToProcess,
    request: ProcessMenuImagesRequest,
): Promise<string> {
    const storagePath = getStoragePathFromDownloadUrl(file.url);
    if (!storagePath || !isAllowedExtractionFileStoragePath(request, storagePath)) {
        throw createProcessingError(MENU_IMAGE_FILE_URL_REJECTED_CODE);
    }

    const targetValidation = await validateNetworkTargetUrl(file.url, {
        allowLocalhostInEmulator: true,
        allowedProtocols: process.env.FUNCTIONS_EMULATOR === "true" ? ["https:", "http:"] : ["https:"],
    });
    if (!targetValidation.valid || !targetValidation.normalizedUrl) {
        throw createProcessingError(MENU_IMAGE_FILE_URL_REJECTED_CODE);
    }

    return targetValidation.normalizedUrl;
}

/**
 * Upload a single file to Gemini
 */
async function uploadFileToGemini(
    file: MenuFileToProcess,
    request: ProcessMenuImagesRequest,
): Promise<UploadedFile | null> {
    const logger = functions.logger;
    const tempFilePath = buildSafeTempFilePath(file.name, "menu-source-file");

    try {
        // Validate file URL
        if (!file.url) {
            throw createProcessingError(MENU_IMAGE_FILE_URL_MISSING_CODE);
        }

        // Fetch file from URL
        const fileFetchUrl = await resolveValidatedFileFetchUrl(file, request);
        const response = await fetch(fileFetchUrl);
        if (!response.ok) {
            throw createProcessingError(MENU_IMAGE_FILE_FETCH_FAILED_CODE, {
                status: response.status,
            });
        }

        let uint8Array: Uint8Array;
        try {
            uint8Array = await readResponseUint8ArrayWithLimit(response, MENU_EXTRACTION_JOB_LIMITS.MAX_FILE_SIZE_BYTES);
        } catch (error) {
            if (isResponseBodyTooLargeError(error)) {
                throw createProcessingError(MENU_IMAGE_FILE_TOO_LARGE_CODE);
            }
            throw error;
        }

        // Write to temp file
        fs.writeFileSync(tempFilePath, uint8Array);

        // Upload to Gemini
        const document = await genAIClient.files.upload({
            file: tempFilePath,
            config: { mimeType: file.type },
        });

        logger.info('[uploadFileToGemini] Upload successful', {
            fileNameLength: file.name.length,
            ...getExtractionIdLogContext('documentName', document?.name),
        });

        return {
            uri: document.uri!,
            mimeType: document.mimeType!,
            name: file.name,
        };
    } catch (error) {
        logger.error('[uploadFileToGemini] Failed to upload', undefined, {
            failureCode: MENU_IMAGE_FILE_UPLOAD_FAILED_CODE,
            fileNameLength: file.name.length,
            ...getExtractionErrorContext(error),
        });
        return null;
    } finally {
        // Cleanup temp file
        try {
            if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
        } catch (cleanupError) {
            logger.warn('[uploadFileToGemini] Cleanup warning', {
                failureCode: MENU_IMAGE_FILE_CLEANUP_FAILED_CODE,
                tempFilePathLength: tempFilePath.length,
                ...getExtractionErrorContext(cleanupError),
            });
        }
    }
}

/**
 * Upload all files in parallel using Promise.all
 */
async function uploadFilesInParallel(
    files: MenuFileToProcess[],
    request: ProcessMenuImagesRequest,
): Promise<UploadedFile[]> {
    const logger = functions.logger;
    logger.info(`[uploadFilesInParallel] Starting parallel upload of ${files.length} files`);

    const uploadPromises = files.map(file => uploadFileToGemini(file, request));
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
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            const status = getExtractionErrorStatus(error);
            const processingCode = getProcessingErrorCode(error);

            // Don't retry on client errors
            if (status && status >= 400 && status < 500) {
                logger.warn('[Retry] Client error - not retrying', {
                    failureCode: MENU_IMAGE_RETRY_CLIENT_ERROR_CODE,
                    sourceErrorStatus: status,
                    sourceErrorCode: getExtractionErrorCode(error),
                });
                throw error;
            }

            // Don't retry on quota errors
            if (processingCode === 'RATE_LIMIT') {
                logger.warn('[Retry] Quota error - not retrying', {
                    failureCode: MENU_IMAGE_RETRY_RATE_LIMIT_CODE,
                    ...getExtractionErrorContext(error),
                });
                throw error;
            }

            if (attempt === maxAttempts) {
                logger.error('[Retry] Max attempts reached', {
                    failureCode: MENU_IMAGE_RETRY_EXHAUSTED_CODE,
                    attempts: maxAttempts + 1,
                    ...getExtractionErrorContext(error),
                });
                throw lastError;
            }

            const delay = baseDelay * Math.pow(2, attempt);
            logger.info('[Retry] Attempt failed - retrying', {
                attempt: attempt + 1,
                attempts: maxAttempts + 1,
                delayMs: delay,
                processingCode,
                ...getExtractionErrorContext(error),
            });
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError || createProcessingError(MENU_IMAGE_RETRY_EXHAUSTED_CODE);
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
    unitsConsumed: number;
    jobId?: string;
    tId?: string | number;
    sId?: string | number;
    uId?: string;
    tenantId?: string | number;
    storeId?: string | number;
    userId?: string;
    jobSource?: string;
    destinationType?: string;
    destinationId?: string;
    jobMode?: string;
    skipProjectSave?: boolean;
    status?: 'completed' | 'failed';
    success?: boolean;
    billingMode?: 'free' | 'billable' | 'internal' | 'public';
    errorCode?: string;
    errorMessage?: string;
    retryable?: boolean;
    retryAfterSeconds?: number | null;
    promptVersion?: string;
    businessType?: string;
    businessCategory?: string;
}

/**
 * Remove undefined values from object (Firestore doesn't accept undefined)
 */
function removeUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
        return null;
    }
    if (obj instanceof Date || typeof obj?.toDate === 'function') {
        return obj;
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

function summarizeFilesForOperation(files: MenuFileToProcess[]) {
    return files.map((file) => ({
        name: file.name,
        type: file.type,
        size: (file as any).size ?? null,
    }));
}

function summarizeClientResponseForOperation(response: any) {
    const data = response?.data || {};
    const message = typeof response?.message === 'string' ? response.message : '';
    return {
        messagePresent: message.length > 0,
        messageLength: message.length,
        qualityScore: response?.qualityScore ?? null,
        qualityDetails: response?.qualityDetails ?? null,
        dataSummary: {
            languagesCount: Array.isArray(data.languages) ? data.languages.length : 0,
            categoriesCount: Array.isArray(data.categories) ? data.categories.length : 0,
            itemsCount: Array.isArray(data.items) ? data.items.length : 0,
        },
    };
}

function compactAiOperationForStorage(transactionObject: TransactionObject): Record<string, unknown> {
    const detailed = FUNCTION_RETENTION_CONFIG.AI_OPERATION_LOG_MODE === 'detailed';
    const detailRetentionDays = FUNCTION_RETENTION_CONFIG.AI_OPERATION_DETAIL_RETENTION_DAYS;

    return removeUndefined({
        ...transactionObject,
        aiLogMode: detailed ? 'detailed' : 'accounting_only',
        clientResponse: detailed
            ? transactionObject.clientResponse
            : summarizeClientResponseForOperation(transactionObject.clientResponse),
        ...(detailed ? {
            detailExpiresAt: new Date(Date.now() + detailRetentionDays * 24 * 60 * 60 * 1000),
        } : {}),
        detailRetentionDays: detailed ? detailRetentionDays : 0,
        files: detailed ? transactionObject.files : summarizeFilesForOperation(transactionObject.files),
        geminiResponse: detailed ? transactionObject.geminiResponse : null,
        generationConfig: detailed
            ? transactionObject.generationConfig
            : { responseMimeType: transactionObject.generationConfig?.responseMimeType || null },
        source: 'firebase-function',
    });
}

/**
 * Add AI operation to Firestore (matches addAiOperation from @database/aiOperations)
 */
async function addAiOperation(transactionObject: TransactionObject): Promise<string> {
    const logger = functions.logger;
    try {
        // Clean undefined values before saving to Firestore
        const cleanedTransaction = removeUndefined({
            ...compactAiOperationForStorage(transactionObject),
            createdAt: new Date(),
        });

        const docRef = await firestoreAdmin.collection(AI_OPERATIONS_COLLECTION).add(cleanedTransaction);
        logger.info('[addAiOperation] Transaction recorded', getExtractionRequestLogContext({ transactionId: docRef.id }));
        return docRef.id;
    } catch (error) {
        logger.error('[addAiOperation] Failed to record transaction', undefined, {
            failureCode: MENU_IMAGE_AI_OPERATION_WRITE_FAILED_CODE,
            ...getExtractionErrorContext(error),
        });
        throw error;
    }
}

function getProcessingErrorCode(error: unknown): string {
    const sourceCode = String(getExtractionErrorCode(error) || '').toUpperCase();
    const sourceName = getExtractionErrorName(error).toUpperCase();
    const sourceStatus = getExtractionErrorStatus(error);

    if (
        sourceStatus === 429 ||
        sourceCode.includes('RATE_LIMIT') ||
        sourceCode.includes('QUOTA') ||
        sourceCode.includes('RESOURCE_EXHAUSTED')
    ) return 'RATE_LIMIT';
    if (
        sourceStatus === 408 ||
        sourceStatus === 504 ||
        sourceCode.includes('TIMEOUT') ||
        sourceName.includes('TIMEOUT') ||
        sourceName.includes('ABORT')
    ) return 'TIMEOUT';
    if (sourceCode.includes('CIRCUIT') || sourceName.includes('CIRCUIT') || sourceName.includes('BREAKER')) {
        return 'CIRCUIT_BREAKER';
    }
    if (sourceCode.includes('UPLOAD') || sourceCode.includes('FILE') || sourceCode.includes('FETCH')) return 'FILE_ERROR';
    if (sourceStatus && sourceStatus >= 500) return 'AI_ERROR';
    if (sourceCode.includes('GEMINI') || sourceCode.includes('AI') || sourceName.includes('GOOGLE')) return 'AI_ERROR';
    return 'INTERNAL_ERROR';
}

function isRetryableProcessingError(error: unknown): boolean {
    const code = getProcessingErrorCode(error);
    return code === 'RATE_LIMIT' || code === 'TIMEOUT' || code === 'CIRCUIT_BREAKER' || code === 'AI_ERROR';
}

function extractRetryAfterSeconds(error: unknown): number | null {
    if (!error || typeof error !== 'object') return null;
    const source = error as { retryAfterSeconds?: unknown; retryAfter?: unknown; retryDelaySeconds?: unknown };
    const value = source.retryAfterSeconds ?? source.retryAfter ?? source.retryDelaySeconds;
    if (value === undefined || value === null) return null;
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : null;
}

async function recordFailedAiOperation(params: {
    requestId: string;
    files: MenuFileToProcess[];
    targetLanguages: TargetLanguage[];
    projectId: string;
    fileId: string;
    action: string;
    processingTime: number;
    error: any;
    businessType?: string;
    businessCategory?: string;
    auditContext?: ProcessMenuImagesRequest['auditContext'];
}): Promise<string | null> {
    const errorCode = getProcessingErrorCode(params.error);
    const errorMessage = MENU_EXTRACTION_FAILED_MESSAGE;
    const retryAfterSeconds = extractRetryAfterSeconds(params.error);
    const transactionObject: TransactionObject = {
        transactionId: null,
        files: params.files,
        targetLanguages: params.targetLanguages,
        projectId: params.projectId,
        fileId: params.fileId,
        action: params.action,
        clientResponse: {
            message: 'Menu extraction failed before data could be saved.',
            data: { languages: [], categories: [], items: [] },
            qualityScore: 0,
            qualityDetails: {
                categoryQuality: 0,
                itemQuality: 0,
                priceQuality: 0,
                descriptionQuality: 0,
            },
        },
        geminiResponse: JSON.stringify({
            errorCode,
            failureCode: MENU_IMAGE_REQUEST_FAILED_CODE,
            retryAfterSeconds,
        }),
        generationConfig: GENERATION_CONFIG,
        model: AI_MODEL,
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
        processingTime: params.processingTime,
        tokenPerCredit: TOKENS_PER_CREDIT,
        chargePerCredit: CHARGE_PER_CREDIT,
        totalCredits: 0,
        totalCharge: 0,
        unitsConsumed: 0,
        status: 'failed',
        success: false,
        billingMode: 'free',
        errorCode,
        errorMessage,
        retryable: isRetryableProcessingError(params.error),
        retryAfterSeconds,
        promptVersion: EXTRACTION_PROMPT_VERSION,
        businessType: params.businessType,
        businessCategory: params.businessCategory,
        ...(params.auditContext ? {
            jobId: params.auditContext.jobId,
            tId: params.auditContext.tId,
            sId: params.auditContext.sId,
            uId: params.auditContext.uId,
            tenantId: params.auditContext.tId,
            storeId: params.auditContext.sId,
            userId: params.auditContext.uId,
            jobSource: params.auditContext.source,
            destinationType: params.auditContext.destinationType,
            destinationId: params.auditContext.destinationId,
            jobMode: params.auditContext.jobMode,
            skipProjectSave: params.auditContext.skipProjectSave,
        } : {}),
    };

    transactionObject.transactionId = await addAiOperation(transactionObject);
    logger.info('[processMenuImages] Failure transaction recorded', {
        ...getExtractionRequestLogContext({
            requestId: params.requestId,
            projectId: params.projectId,
            fileId: params.fileId,
            transactionId: transactionObject.transactionId,
        }),
        errorCode,
        retryAfterSeconds,
    });
    return transactionObject.transactionId;
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

function adjustProfileSuggestionSource<T>(
    suggestion: ExtractedBusinessProfileSuggestion<T> | undefined,
    sourceFileOffset: number,
): ExtractedBusinessProfileSuggestion<T> | undefined {
    if (!suggestion) return undefined;
    return {
        ...suggestion,
        sourceFileIndex: suggestion.sourceFileIndex !== undefined
            ? suggestion.sourceFileIndex + sourceFileOffset
            : sourceFileOffset,
    };
}

function adjustProfileSourceFileIndexes(
    profile: ExtractedBusinessProfile | undefined,
    sourceFileOffset: number,
): ExtractedBusinessProfile | undefined {
    if (!profile) return undefined;
    return {
        ...(profile.identity ? {
            identity: {
                businessName: adjustProfileSuggestionSource(profile.identity.businessName, sourceFileOffset),
                phoneNumber: adjustProfileSuggestionSource(profile.identity.phoneNumber, sourceFileOffset),
                addressLine: adjustProfileSuggestionSource(profile.identity.addressLine, sourceFileOffset),
                businessType: adjustProfileSuggestionSource(profile.identity.businessType, sourceFileOffset),
                businessCategory: adjustProfileSuggestionSource(profile.identity.businessCategory, sourceFileOffset),
                currencyCode: adjustProfileSuggestionSource(profile.identity.currencyCode, sourceFileOffset),
                defaultLanguage: adjustProfileSuggestionSource(profile.identity.defaultLanguage, sourceFileOffset),
                activeLanguages: adjustProfileSuggestionSource(profile.identity.activeLanguages, sourceFileOffset),
            },
        } : {}),
        ...(profile.visualBrand ? {
            visualBrand: {
                brandAccentColor: adjustProfileSuggestionSource(profile.visualBrand.brandAccentColor, sourceFileOffset),
                imageBackgroundColor: adjustProfileSuggestionSource(profile.visualBrand.imageBackgroundColor, sourceFileOffset),
            },
        } : {}),
        ...(profile.project ? {
            project: {
                projectName: adjustProfileSuggestionSource(profile.project.projectName, sourceFileOffset),
            },
        } : {}),
    };
}

function chooseProfileSuggestion<T>(
    existing?: ExtractedBusinessProfileSuggestion<T>,
    incoming?: ExtractedBusinessProfileSuggestion<T>,
): ExtractedBusinessProfileSuggestion<T> | undefined {
    if (!existing) return incoming;
    if (!incoming) return existing;
    return PROFILE_CONFIDENCE_RANK[incoming.confidence] > PROFILE_CONFIDENCE_RANK[existing.confidence]
        ? incoming
        : existing;
}

function hasProfileSection(value: unknown): boolean {
    return Boolean(value && typeof value === 'object' && Object.values(value).some(Boolean));
}

function mergeExtractedBusinessProfiles(
    existing?: ExtractedBusinessProfile,
    incoming?: ExtractedBusinessProfile,
): ExtractedBusinessProfile | undefined {
    const merged: ExtractedBusinessProfile = {
        identity: {
            businessName: chooseProfileSuggestion(existing?.identity?.businessName, incoming?.identity?.businessName),
            phoneNumber: chooseProfileSuggestion(existing?.identity?.phoneNumber, incoming?.identity?.phoneNumber),
            addressLine: chooseProfileSuggestion(existing?.identity?.addressLine, incoming?.identity?.addressLine),
            businessType: chooseProfileSuggestion(existing?.identity?.businessType, incoming?.identity?.businessType),
            businessCategory: chooseProfileSuggestion(existing?.identity?.businessCategory, incoming?.identity?.businessCategory),
            currencyCode: chooseProfileSuggestion(existing?.identity?.currencyCode, incoming?.identity?.currencyCode),
            defaultLanguage: chooseProfileSuggestion(existing?.identity?.defaultLanguage, incoming?.identity?.defaultLanguage),
            activeLanguages: chooseProfileSuggestion(existing?.identity?.activeLanguages, incoming?.identity?.activeLanguages),
        },
        visualBrand: {
            brandAccentColor: chooseProfileSuggestion(existing?.visualBrand?.brandAccentColor, incoming?.visualBrand?.brandAccentColor),
            imageBackgroundColor: chooseProfileSuggestion(existing?.visualBrand?.imageBackgroundColor, incoming?.visualBrand?.imageBackgroundColor),
        },
        project: {
            projectName: chooseProfileSuggestion(existing?.project?.projectName, incoming?.project?.projectName),
        },
    };

    if (!hasProfileSection(merged.identity)) delete merged.identity;
    if (!hasProfileSection(merged.visualBrand)) delete merged.visualBrand;
    if (!hasProfileSection(merged.project)) delete merged.project;

    return hasProfileSection(merged) ? merged : undefined;
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
    const adjustedBusinessProfile = adjustProfileSourceFileIndexes(
        newData.extractedBusinessProfile,
        sourceFileOffset,
    );

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
    const mergedBusinessProfile = mergeExtractedBusinessProfiles(
        accumulated.extractedBusinessProfile,
        adjustedBusinessProfile,
    );

    return {
        languages: accumulated.languages.length > 0 ? accumulated.languages : newData.languages,
        categories: [...accumulated.categories, ...uniqueNewCategories],
        items: [...accumulated.items, ...adjustedItems],
        ...(mergedBusinessProfile ? { extractedBusinessProfile: mergedBusinessProfile } : {}),
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
            ...getExtractionRequestLogContext({ requestId }),
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
            throw createProcessingError(MENU_IMAGE_AI_EMPTY_RESPONSE_CODE, {
                finishReason: typeof finishReason === 'string' ? finishReason.slice(0, 64) : 'unknown',
            });
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
            ...getExtractionRequestLogContext({ requestId }),
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
        const errorCode = getProcessingErrorCode(error);

        // Track AI call failure
        logger.aiCall('Gemini Extract', 'error', {
            model: AI_MODEL,
            batchIndex,
            totalBatches,
            duration,
            error: errorCode,
        });

        logger.error(`[processSingleBatch] Batch ${batchIndex + 1} failed`, undefined, {
            ...getExtractionRequestLogContext({ requestId }),
            batchIndex,
            failureCode: MENU_IMAGE_BATCH_FAILED_CODE,
            processingErrorCode: errorCode,
            ...getExtractionErrorContext(error),
        });

        return {
            success: false,
            data: null,
            message: `Batch ${batchIndex + 1} failed.`,
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

    const { files, targetLanguages, projectId = 'N/A', fileId = 'N/A', action = 'IMAGE_PROCESSING', businessType, businessCategory, auditContext } = request;

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

    logger.info(`[processMenuImages] Starting request`, {
        ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
        filesCount: files.length,
        targetLanguageCount: targetLanguages.length,
        maxImagesPerBatch: MAX_IMAGES_PER_BATCH,
    });

    logger.milestone('Request started', {
        ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
        filesCount: files.length,
    });

    try {
        // Step 0: Check rate limit using Upstash (matches route.ts checkExpensiveAILimit)
        const rateLimit = await checkExpensiveAIRateLimit(projectId);
        if (!rateLimit.allowed) {
            const waitSeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
            logger.warn(`[processMenuImages] Rate limit exceeded`, {
                ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
                waitSeconds,
            });
            throw createProcessingError('RATE_LIMIT', {
                retryAfterSeconds: waitSeconds,
                status: 429,
            });
        }

        // Step 1: Upload all files in parallel
        const uploadStartedAt = Date.now();
        const uploadedFiles = await uploadFilesInParallel(files, request);
        const uploadCompletedAt = Date.now();

        if (uploadedFiles.length === 0) {
            throw new Error('No files were uploaded successfully');
        }

        logger.info(`[processMenuImages] ${uploadedFiles.length} files uploaded successfully`);

        // Step 2: Chunk files into batches
        const fileBatches = chunkArray(uploadedFiles, MAX_IMAGES_PER_BATCH);
        const totalBatches = fileBatches.length;

        logger.info(`[processMenuImages] Processing ${totalBatches} batch(es)`, {
            ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
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

        const batchProcessingStartedAt = Date.now();
        for (let batchIndex = 0; batchIndex < fileBatches.length; batchIndex++) {
            const batch = fileBatches[batchIndex];

            // Exponential backoff delay between batches (skip first batch)
            // This prevents rate limiting when processing many images
            // Delay pattern: 0s (first), 1s, 2s, 4s, 8s (capped)
            if (batchIndex > 0) {
                const delayMs = calculateBatchDelay(batchIndex - 1);
                logger.info(`[processMenuImages] Throttling: waiting ${delayMs}ms before batch ${batchIndex + 1}`, {
                    ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
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
                    ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
                    batchIndex,
                    failedIndices: batchResult.failedFileIndices,
                });
            }

            sourceFileOffset += batch.length;
        }
        const batchProcessingCompletedAt = Date.now();

        const processingTime = Date.now() - startTime;

        // Log batch processing summary
        const successfulBatches = batchResults.filter(b => b.success).length;
        logger.info(`[processMenuImages] Batch processing completed`, {
            ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
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
            throw createProcessingError(MENU_IMAGE_BATCH_FAILED_CODE, {
                totalBatches,
            });
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
            unitsConsumed: 0,
            status: 'completed',
            success: true,
            billingMode: 'free',
            promptVersion: EXTRACTION_PROMPT_VERSION,
            businessType,
            businessCategory,
            ...(auditContext ? {
                jobId: auditContext.jobId,
                tId: auditContext.tId,
                sId: auditContext.sId,
                uId: auditContext.uId,
                tenantId: auditContext.tId,
                storeId: auditContext.sId,
                userId: auditContext.uId,
                jobSource: auditContext.source,
                destinationType: auditContext.destinationType,
                destinationId: auditContext.destinationId,
                jobMode: auditContext.jobMode,
                skipProjectSave: auditContext.skipProjectSave,
            } : {}),
        };

        // Step 7: Add operation to database
        let transactionRecorded = true;
        try {
            transactionObject.transactionId = await addAiOperation(transactionObject);
            logger.info('[processMenuImages] Transaction recorded', {
                ...getExtractionRequestLogContext({
                    requestId,
                    projectId,
                    fileId,
                    transactionId: transactionObject.transactionId,
                }),
            });
        } catch (transactionError) {
            transactionRecorded = false;
            logger.error('[processMenuImages] Failed to record transaction', undefined, {
                ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
                totalCharge: transactionObject.totalCharge,
                failureCode: MENU_IMAGE_AI_OPERATION_WRITE_FAILED_CODE,
                ...getExtractionErrorContext(transactionError),
            });
        }

        const operationLoggedAt = Date.now();

        // Step 8: Log success
        logger.info(`[processMenuImages] Request completed`, {
            ...getExtractionRequestLogContext({
                requestId,
                projectId,
                fileId,
                transactionId: transactionObject.transactionId,
            }),
            processingTime,
            qualityScore: quality.score,
            categoriesCount: accumulatedData.categories.length,
            itemsCount: accumulatedData.items.length,
            transactionRecorded,
            totalBatches,
            successfulBatches,
        });

        // Step 9: Return response
        logger.milestone('Request completed', {
            ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
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
                unitsConsumed: transactionObject.unitsConsumed,
                processingTime: transactionObject.processingTime,
                transactionId: transactionObject.transactionId,
                recorded: transactionRecorded,
                promptTokenCount: transactionObject.promptTokenCount,
                candidatesTokenCount: transactionObject.candidatesTokenCount,
                totalTokenCount: transactionObject.totalTokenCount,
            },
            timings: {
                requestStartedAt: startTime,
                uploadStartedAt,
                uploadCompletedAt,
                batchProcessingStartedAt,
                batchProcessingCompletedAt,
                operationLoggedAt,
                uploadMs: uploadCompletedAt - uploadStartedAt,
                batchProcessingMs: batchProcessingCompletedAt - batchProcessingStartedAt,
                totalProcessingMs: processingTime,
            },
            // Extraction provenance (P0 hardening)
            provenance: {
                rawBatchResponses,
                promptVersion: EXTRACTION_PROMPT_VERSION,
                model: AI_MODEL,
            },
        };

    } catch (error: any) {
        const processingTime = Date.now() - startTime;
        try {
            await recordFailedAiOperation({
                requestId,
                files,
                targetLanguages,
                projectId,
                fileId,
                action,
                processingTime,
                error,
                businessType,
                businessCategory,
                auditContext,
            });
        } catch (transactionError: any) {
            logger.error('[processMenuImages] Failed to record failure transaction', undefined, {
                ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
                failureCode: MENU_IMAGE_FAILURE_TRANSACTION_WRITE_FAILED_CODE,
                ...getExtractionErrorContext(transactionError),
            });
        }

        logger.error(`[processMenuImages] Request failed`, undefined, {
            ...getExtractionRequestLogContext({ requestId, projectId, fileId }),
            processingTime,
            failureCode: MENU_IMAGE_REQUEST_FAILED_CODE,
            processingErrorCode: getProcessingErrorCode(error),
            ...getExtractionErrorContext(error),
        });

        transaction.finish('error');
        await Sentry.flush();

        throw error;
    }
}
