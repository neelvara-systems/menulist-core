/**
 * Extraction Monitor — Data Access Layer
 * 
 * Read-only DAL for extraction monitoring dashboard.
 * Fetches job data from menuImageProcessingJobs collection.
 * 
 * Firebase cost: ~100-200 reads per dashboard load.
 * Used by founder only at /ops/extraction.
 * 
 * @see __docs__/ai-extraction-monitoring/
 */

import { DB_COLLECTIONS } from '@constant/database';
import { assertCurrentPlatformAccess } from '@lib/auth/currentPlatformAccessClient';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getBoundedOpsStringContext, logOpsFailure } from '@lib/ops/opsDiagnostics';
import { normalizeMenuExtractionJobId } from '@lib/menu-extraction/jobIdBoundary';
import type {
    ExtractionCostMetrics,
    ExtractionDashboardSnapshot,
    ExtractionHealthMetrics,
    ExtractionHealthStatus,
    ExtractionJobDetails,
    ExtractionJobFilter,
    ExtractionJobSummary,
    ExtractionQualityMetrics,
} from '@lib/ops/extractionTypes';
import { MENU_EXTRACTION_DESTINATION_TYPES } from '@data/shared/menuExtractionJob';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
} from 'firebase/firestore';

const JOBS_COLLECTION = DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS;

const DEFAULT_HEALTH_READ_LIMIT = 100;
const DEFAULT_QUALITY_COUNT = 50;
const DEFAULT_QUALITY_READ_LIMIT = 150;
const PLATFORM_RETRY_RESPONSE_MAX_BYTES = 4 * 1024;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function getRecord(value: unknown): UnknownRecord {
    return isRecord(value) ? value : {};
}

function getFiniteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getNonNegativeNumber(value: unknown): number | null {
    const numeric = getFiniteNumber(value);
    return numeric !== null && numeric >= 0 ? numeric : null;
}

function getNonNegativeInteger(value: unknown): number {
    const numeric = getNonNegativeNumber(value);
    return numeric !== null ? Math.floor(numeric) : 0;
}

function getBoundedQualityScore(value: unknown): number | null {
    const numeric = getFiniteNumber(value);
    return numeric !== null && numeric >= 0 && numeric <= 100 ? numeric : null;
}

function getString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function getDestinationType(value: unknown): ExtractionJobSummary['destinationType'] {
    return value === MENU_EXTRACTION_DESTINATION_TYPES.PROJECT
        || value === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT
        || value === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING
        ? value
        : undefined;
}

function getBoundedPositiveInteger(value: unknown, fallback: number, maximum: number): number {
    const numeric = getFiniteNumber(value);
    return numeric !== null && Number.isInteger(numeric) && numeric > 0
        ? Math.min(numeric, maximum)
        : fallback;
}

async function readPlatformRetryResponse(response: Response): Promise<UnknownRecord> {
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > PLATFORM_RETRY_RESPONSE_MAX_BYTES) return {};
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > PLATFORM_RETRY_RESPONSE_MAX_BYTES) return {};
    try {
        return getRecord(JSON.parse(body));
    } catch {
        return {};
    }
}

// ================================================================
// HELPER: Extract summary from raw job doc
// ================================================================

function getExtractionJobErrorSummary(error: unknown): string | null {
    if (!error || typeof error !== 'object') return null;
    const code = (error as { code?: unknown }).code;
    if (typeof code !== 'string' || code.trim().length === 0) {
        return 'extraction_failed';
    }
    return code.trim().slice(0, 64);
}

function getExtractionJobErrorDetails(error: unknown): ExtractionJobDetails['error'] {
    if (!error || typeof error !== 'object') return null;
    const errorValue = error as { code?: unknown; retryable?: unknown; retryAfterSeconds?: unknown };
    const retryAfterSeconds = getNonNegativeNumber(errorValue.retryAfterSeconds);
    return {
        code: getExtractionJobErrorSummary(error) || 'extraction_failed',
        message: 'Extraction failed',
        retryable: errorValue.retryable !== false,
        ...(retryAfterSeconds !== null ? { retryAfterSeconds: Math.min(Math.floor(retryAfterSeconds), 86_400) } : {}),
    };
}

function normalizeExtractionTimings(value: unknown): Record<string, unknown> | null {
    const timings = getRecord(value);
    const normalized = [
        'queueWaitMs',
        'aiProcessingMs',
        'saveMs',
        'workerTotalMs',
        'requestStartedAt',
        'uploadStartedAt',
        'uploadCompletedAt',
        'batchProcessingStartedAt',
        'batchProcessingCompletedAt',
        'operationLoggedAt',
        'uploadMs',
        'batchProcessingMs',
        'totalProcessingMs',
    ].reduce<Record<string, number>>((result, key) => {
        const numeric = getNonNegativeNumber(timings[key]);
        if (numeric !== null) result[key] = numeric;
        return result;
    }, {});
    return Object.keys(normalized).length ? normalized : null;
}

function normalizeExtractionFileResults(value: unknown): ExtractionJobDetails['fileResults'] {
    if (!isRecord(value)) return null;
    const entries = Object.entries(value).slice(0, 15).flatMap(([uid, rawResult]) => {
        const result = getRecord(rawResult);
        const normalizedUid = uid.trim().slice(0, 120);
        return normalizedUid
            ? [[normalizedUid, {
                categoriesCount: getNonNegativeInteger(result.categoriesCount),
                itemsCount: getNonNegativeInteger(result.itemsCount),
            }] as const]
            : [];
    });
    return entries.length ? Object.fromEntries(entries) : null;
}

function normalizeExtractionTransaction(value: unknown): ExtractionJobDetails['transaction'] {
    const transaction = getRecord(value);
    const transactionId = getString(transaction.transactionId).trim().slice(0, 160);
    const totalCredits = getNonNegativeNumber(transaction.totalCredits);
    const totalCharge = getNonNegativeNumber(transaction.totalCharge);
    if (!transactionId || totalCredits === null || totalCharge === null) return null;

    const tokenUsageRecord = getRecord(transaction.tokenUsage);
    const promptTokenCount = getNonNegativeNumber(tokenUsageRecord.promptTokenCount);
    const candidatesTokenCount = getNonNegativeNumber(tokenUsageRecord.candidatesTokenCount);
    const totalTokenCount = getNonNegativeNumber(tokenUsageRecord.totalTokenCount);
    const tokenUsage = promptTokenCount !== null && candidatesTokenCount !== null && totalTokenCount !== null
        ? { promptTokenCount, candidatesTokenCount, totalTokenCount }
        : undefined;
    const unitsConsumed = getNonNegativeNumber(transaction.unitsConsumed);

    return {
        transactionId,
        totalCredits,
        totalCharge,
        ...(unitsConsumed !== null ? { unitsConsumed } : {}),
        ...(tokenUsage ? { tokenUsage } : {}),
    };
}

function normalizeExtractionJobResult(value: unknown): ExtractionJobDetails['result'] {
    const result = getRecord(value);
    if (!Object.keys(result).length) return null;
    const qualityScore = getBoundedQualityScore(result.qualityScore);
    const processingTime = getNonNegativeNumber(result.processingTime);
    const qualityDetails = getRecord(result.qualityDetails);
    const categoryQuality = getBoundedQualityScore(qualityDetails.categoryQuality);
    const itemQuality = getBoundedQualityScore(qualityDetails.itemQuality);
    const priceQuality = getBoundedQualityScore(qualityDetails.priceQuality);
    const descriptionQuality = getBoundedQualityScore(qualityDetails.descriptionQuality);
    if (
        qualityScore === null
        || processingTime === null
        || categoryQuality === null
        || itemQuality === null
        || priceQuality === null
        || descriptionQuality === null
    ) return null;

    const confidence = getRecord(result.confidenceSummary);
    const averageConfidenceScore = getFiniteNumber(confidence.averageConfidenceScore);
    const confidenceSummary = averageConfidenceScore !== null && averageConfidenceScore >= 0 && averageConfidenceScore <= 1
        ? {
            highConfidenceCount: getNonNegativeInteger(confidence.highConfidenceCount),
            mediumConfidenceCount: getNonNegativeInteger(confidence.mediumConfidenceCount),
            lowConfidenceCount: getNonNegativeInteger(confidence.lowConfidenceCount),
            averageConfidenceScore,
        }
        : undefined;
    const batchResults = Array.isArray(result.batchResults)
        ? result.batchResults.slice(0, 50).flatMap((entry) => {
            const batch = getRecord(entry);
            const batchIndex = getNonNegativeNumber(batch.batchIndex);
            const filesProcessed = getNonNegativeNumber(batch.filesProcessed);
            return batchIndex !== null && Number.isInteger(batchIndex) && filesProcessed !== null && Number.isInteger(filesProcessed) && typeof batch.success === 'boolean'
                ? [{ batchIndex, filesProcessed, success: batch.success }]
                : [];
        })
        : undefined;
    const rawBatchResponses = Array.isArray(result.rawBatchResponses)
        ? result.rawBatchResponses.slice(0, 50).flatMap((entry) => {
            const batch = getRecord(entry);
            const batchIndex = getNonNegativeNumber(batch.batchIndex);
            return batchIndex !== null && Number.isInteger(batchIndex) && typeof batch.rawText === 'string' && typeof batch.truncated === 'boolean'
                ? [{ batchIndex, rawText: batch.rawText.slice(0, 250_000), truncated: batch.truncated || batch.rawText.length > 250_000 }]
                : [];
        })
        : undefined;
    const summary = isRecord(result.summary) ? result.summary : undefined;
    const model = getString(result.model).trim().slice(0, 120) || undefined;
    const promptVersion = getString(result.promptVersion).trim().slice(0, 120) || undefined;
    const dataPrunedReason = getString(result.dataPrunedReason).trim().slice(0, 160) || undefined;

    return {
        ...(result.combinedData !== undefined ? { combinedData: result.combinedData } : {}),
        ...(summary ? { summary } : {}),
        ...(result.dataPrunedAt !== undefined ? { dataPrunedAt: result.dataPrunedAt } : {}),
        ...(dataPrunedReason ? { dataPrunedReason } : {}),
        qualityScore,
        qualityDetails: { categoryQuality, itemQuality, priceQuality, descriptionQuality },
        processingTime,
        ...(confidenceSummary ? { confidenceSummary } : {}),
        ...(batchResults?.length ? { batchResults } : {}),
        ...(rawBatchResponses?.length ? { rawBatchResponses } : {}),
        ...(promptVersion ? { promptVersion } : {}),
        ...(model ? { model } : {}),
        ...(isRecord(result.redistributedFiles) ? { redistributedFiles: result.redistributedFiles } : {}),
    };
}

function jobDocToSummary(id: string, rawData: unknown): ExtractionJobSummary {
    const data = getRecord(rawData);
    const result = getRecord(data.result);
    const summary = getRecord(result.summary);
    const combinedData = getRecord(result.combinedData);
    return {
        id,
        projectId: getString(data.projectId),
        status: getString(data.status, 'unknown'),
        filesCount: Array.isArray(data.files) ? data.files.length : 0,
        itemsExtracted: Array.isArray(combinedData.items)
            ? combinedData.items.length
            : getNonNegativeInteger(summary.itemsCount),
        categoriesExtracted: Array.isArray(combinedData.categories)
            ? combinedData.categories.length
            : getNonNegativeInteger(summary.categoriesCount),
        qualityScore: getBoundedQualityScore(result.qualityScore),
        processingTime: getNonNegativeNumber(result.processingTime),
        createdAt: data.createdAt,
        completedAt: data.completedAt ?? null,
        isFirstExtraction: typeof data.isFirstExtraction === 'boolean' ? data.isFirstExtraction : null,
        destinationType: getDestinationType(data.destinationType ?? getRecord(data.destination).type),
        source: getString(data.source) || null,
        hasError: isRecord(data.error),
        errorMessage: getExtractionJobErrorSummary(data.error),
    };
}

export function getExtractionDateMs(value: unknown): number {
    try {
        if (value instanceof Date) {
            const dateMs = value.getTime();
            return Number.isFinite(dateMs) ? dateMs : 0;
        }
        if (isRecord(value)) {
            if (typeof value.toDate === 'function') {
                const converted = value.toDate();
                return converted instanceof Date && Number.isFinite(converted.getTime())
                    ? converted.getTime()
                    : 0;
            }
            const seconds = getFiniteNumber(value.seconds);
            return seconds !== null ? seconds * 1000 : 0;
        }
        if (typeof value !== 'string' && typeof value !== 'number') return 0;
        const dateMs = new Date(value).getTime();
        return Number.isFinite(dateMs) ? dateMs : 0;
    } catch {
        return 0;
    }
}

function getEmptyHealthMetrics(): ExtractionHealthMetrics {
    return {
        activeJobs: 0,
        failedJobs24h: 0,
        completedJobs24h: 0,
        totalJobs24h: 0,
        failureRate: 0,
        avgProcessingTime: 0,
        avgQualityScore: 0,
        healthStatus: 'unknown',
    };
}

function getEmptyQualityMetrics(): ExtractionQualityMetrics {
    return {
        avgScore: 0,
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
        lowQualityRate: 0,
        totalJobsAnalyzed: 0,
    };
}

export function buildHealthMetricsFromJobs(jobs: unknown[]): ExtractionHealthMetrics {
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    const recentJobs = jobs.map(getRecord).filter((job) => getExtractionDateMs(job.createdAt) >= cutoffMs);

    const activeJobs = recentJobs.filter((job) => job.status === 'pending' || job.status === 'processing').length;
    const failedJobs = recentJobs.filter((job) => job.status === 'failed').length;
    const completedJobs = recentJobs.filter((job) => job.status === 'completed' || job.status === 'preview_ready').length;
    const totalJobs = recentJobs.length;
    const failureRate = totalJobs > 0 ? Math.round((failedJobs / totalJobs) * 100) : 0;

    const processingTimes = recentJobs
        .filter((job) => job.status === 'completed' || job.status === 'preview_ready')
        .map((job) => getNonNegativeNumber(getRecord(job.result).processingTime))
        .filter((value): value is number => value !== null);
    const avgProcessingTime = processingTimes.length > 0
        ? Math.round(processingTimes.reduce((sum, value) => sum + value, 0) / processingTimes.length / 1000)
        : 0;

    const qualityScores = recentJobs
        .filter((job) => job.status === 'completed' || job.status === 'preview_ready')
        .map((job) => getBoundedQualityScore(getRecord(job.result).qualityScore))
        .filter((value): value is number => value !== null);
    const avgQualityScore = qualityScores.length > 0
        ? Math.round(qualityScores.reduce((sum, value) => sum + value, 0) / qualityScores.length)
        : 0;

    let healthStatus: ExtractionHealthStatus = 'unknown';
    if (totalJobs === 0) {
        healthStatus = 'unknown';
    } else if (failureRate > 5 || avgProcessingTime > 60) {
        healthStatus = 'critical';
    } else if (failureRate > 2 || avgProcessingTime > 30) {
        healthStatus = 'warning';
    } else {
        healthStatus = 'healthy';
    }

    return {
        activeJobs,
        failedJobs24h: failedJobs,
        completedJobs24h: completedJobs,
        totalJobs24h: totalJobs,
        failureRate,
        avgProcessingTime,
        avgQualityScore,
        healthStatus,
    };
}

export function buildQualityMetricsFromJobs(jobs: unknown[], count: number = DEFAULT_QUALITY_COUNT): ExtractionQualityMetrics {
    const normalizedCount = getBoundedPositiveInteger(count, DEFAULT_QUALITY_COUNT, DEFAULT_QUALITY_READ_LIMIT);
    const completedJobs = jobs
        .map(getRecord)
        .filter((job) => job.status === 'completed' || job.status === 'preview_ready')
        .slice(0, normalizedCount);

    if (completedJobs.length === 0) return getEmptyQualityMetrics();

    const scores = completedJobs
        .map((job) => getBoundedQualityScore(getRecord(job.result).qualityScore))
        .filter((value): value is number => value !== null);
    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    let high = 0;
    let medium = 0;
    let low = 0;
    for (const job of completedJobs) {
        const confidenceSummary = getRecord(getRecord(job.result).confidenceSummary);
        high += getNonNegativeInteger(confidenceSummary.highConfidenceCount);
        medium += getNonNegativeInteger(confidenceSummary.mediumConfidenceCount);
        low += getNonNegativeInteger(confidenceSummary.lowConfidenceCount);
    }

    const lowQualityCount = scores.filter((score) => score < 40).length;
    const lowQualityRate = scores.length > 0
        ? Math.round((lowQualityCount / scores.length) * 100)
        : 0;

    return {
        avgScore,
        confidenceDistribution: { high, medium, low },
        lowQualityRate,
        totalJobsAnalyzed: completedJobs.length,
    };
}

function filterJobSummaries(
    summaries: ExtractionJobSummary[],
    filter?: ExtractionJobFilter,
): ExtractionJobSummary[] {
    const pageSize = getBoundedPositiveInteger(filter?.pageSize, 20, 100);
    const days = getBoundedPositiveInteger(filter?.days, 0, 3650);
    const minQuality = getBoundedQualityScore(filter?.minQuality);
    const maxQuality = getBoundedQualityScore(filter?.maxQuality);
    const cutoffMs = days
        ? Date.now() - days * 24 * 60 * 60 * 1000
        : null;

    return summaries
        .filter((job) => !filter?.status || job.status === filter.status)
        .filter((job) => {
            if (!cutoffMs) return true;
            return getExtractionDateMs(job.createdAt) >= cutoffMs;
        })
        .filter((job) => minQuality === null || (job.qualityScore ?? -Infinity) >= minQuality)
        .filter((job) => maxQuality === null || (job.qualityScore ?? Infinity) <= maxQuality)
        .slice(0, pageSize);
}

export function buildExtractionCostMetricsFromOperations(
    operations: unknown[],
    todayStartMs: number,
): ExtractionCostMetrics {
    const ops = operations
        .map(getRecord)
        .filter((op) => op.action === 'IMAGE_PROCESSING' && getExtractionDateMs(op.createdAt) >= todayStartMs);
    const charges = ops.map((op) => getNonNegativeNumber(op.totalCharge) ?? 0);
    const callsToday = ops.length;
    const totalCharge = charges.reduce((sum, charge) => sum + charge, 0);

    return {
        callsToday,
        avgCostPerExtraction: callsToday > 0 ? Math.round(totalCharge / callsToday) : 0,
        dailySpend: totalCharge,
        mostExpensiveJobCost: charges.length > 0 ? Math.max(...charges) : 0,
    };
}

// ================================================================
// GET RECENT JOBS (for job feed table)
// ================================================================

/**
 * Get recent extraction jobs with optional filters.
 * Firestore reads: pageSize (default 20)
 */
export async function getRecentExtractionJobs(
    filter?: ExtractionJobFilter
): Promise<ExtractionJobSummary[]> {
    await assertCurrentPlatformAccess();
    try {
        const jobsRef = collection(firebaseClient, JOBS_COLLECTION);
        const pageSize = getBoundedPositiveInteger(filter?.pageSize, 20, 100);
        const readLimit = filter?.status || filter?.days ? Math.min(Math.max(pageSize * 4, pageSize), 100) : pageSize;

        const jobsQuery = query(
            jobsRef,
            orderBy('createdAt', 'desc'),
            limit(readLimit)
        );
        const snap = await getDocs(jobsQuery);

        return filterJobSummaries(
            snap.docs.map(d => jobDocToSummary(d.id, d.data())),
            { ...filter, pageSize },
        );
    } catch (error) {
        logOpsFailure('extraction_dal_recent_jobs_failed', error, {
            pageSize: filter?.pageSize,
            ...getBoundedOpsStringContext('status', filter?.status),
        });
        throw new Error('extraction_recent_jobs_unavailable');
    }
}

// ================================================================
// GET JOB DETAILS (for inspector drawer)
// ================================================================

export function normalizeExtractionJobDetails(id: string, rawData: unknown): ExtractionJobDetails {
    const data = getRecord(rawData);
    const summary = jobDocToSummary(id, data);
    const destination = getRecord(data.destination);
    const destinationType = getDestinationType(data.destinationType ?? destination.type) ?? null;
    const normalizedDestination = destinationType === MENU_EXTRACTION_DESTINATION_TYPES.PROJECT
        && getString(destination.projectId)
        ? { type: destinationType, projectId: getString(destination.projectId), ...(destination.saveMode === 'review' ? { saveMode: 'review' as const } : {}) }
        : destinationType === MENU_EXTRACTION_DESTINATION_TYPES.PUBLIC_MENU_DRAFT
            && getString(destination.draftId)
            ? { type: destinationType, draftId: getString(destination.draftId), ...(destination.sourceType === 'menu_link_import' ? { sourceType: 'menu_link_import' as const } : destination.sourceType === 'image_upload' ? { sourceType: 'image_upload' as const } : {}) }
            : destinationType === MENU_EXTRACTION_DESTINATION_TYPES.MESSAGING_ONBOARDING
                && getString(destination.sessionId)
                ? { type: destinationType, sessionId: getString(destination.sessionId) }
                : null;
    const files = Array.isArray(data.files)
        ? data.files.slice(0, 15).flatMap((entry) => {
            const file = getRecord(entry);
            const uid = getString(file.uid).trim().slice(0, 120);
            const name = getString(file.name).trim().slice(0, 240);
            const type = getString(file.type).trim().slice(0, 120);
            const size = getNonNegativeNumber(file.size);
            return uid && name && type && size !== null ? [{ uid, name, type, size }] : [];
        })
        : [];
    const targetLanguages = Array.isArray(data.targetLanguages)
        ? data.targetLanguages.slice(0, 12).flatMap((entry) => {
            const language = getRecord(entry);
            const code = getString(language.code).trim().slice(0, 16);
            const name = getString(language.name).trim().slice(0, 80);
            return code && name ? [{ code, name }] : [];
        })
        : [];

    return {
        ...summary,
        tId: getString(data.tId),
        sId: getString(data.sId),
        uId: getString(data.uId),
        destination: normalizedDestination,
        destinationType,
        files,
        targetLanguages,
        skipProjectSave: data.skipProjectSave === true,
        source: getString(data.source) || null,
        sourceFingerprint: getString(data.sourceFingerprint) || null,
        sourceFingerprintVersion: getNonNegativeNumber(data.sourceFingerprintVersion),
        sourceMetadata: isRecord(data.sourceMetadata) ? data.sourceMetadata : null,
        timings: normalizeExtractionTimings(data.timings),
        result: normalizeExtractionJobResult(data.result),
        error: getExtractionJobErrorDetails(data.error),
        fileResults: normalizeExtractionFileResults(data.fileResults),
        transaction: normalizeExtractionTransaction(data.transaction),
    };
}

/**
 * Get full extraction job details by ID.
 * Firestore reads: 1
 */
export async function getExtractionJobDetails(
    jobId: string
): Promise<ExtractionJobDetails | null> {
    await assertCurrentPlatformAccess();
    const normalizedJobId = normalizeMenuExtractionJobId(jobId);
    if (!normalizedJobId) return null;
    try {
        const jobRef = doc(firebaseClient, JOBS_COLLECTION, normalizedJobId);
        const jobDoc = await getDoc(jobRef);

        if (!jobDoc.exists()) return null;

        return normalizeExtractionJobDetails(jobDoc.id, jobDoc.data());
    } catch (error) {
        logOpsFailure('extraction_dal_job_details_failed', error, {
            ...getBoundedOpsStringContext('jobId', jobId),
        });
        throw new Error('extraction_job_details_unavailable');
    }
}

// ================================================================
// GET HEALTH METRICS (aggregated from recent jobs)
// ================================================================

/**
 * Compute extraction health metrics from last 24 hours.
 * Firestore reads: up to 100 (capped)
 */
export async function getExtractionHealthMetrics(): Promise<ExtractionHealthMetrics> {
    await assertCurrentPlatformAccess();
    try {
        const jobsRef = collection(firebaseClient, JOBS_COLLECTION);
        const jobsQuery = query(
            jobsRef,
            orderBy('createdAt', 'desc'),
            limit(DEFAULT_HEALTH_READ_LIMIT)
        );
        const snap = await getDocs(jobsQuery);
        return buildHealthMetricsFromJobs(snap.docs.map(d => d.data()));
    } catch (error) {
        logOpsFailure('extraction_dal_health_metrics_failed', error, {
            readLimit: DEFAULT_HEALTH_READ_LIMIT,
        });
        throw new Error('extraction_health_metrics_unavailable');
    }
}

// ================================================================
// GET QUALITY METRICS (from last N completed jobs)
// ================================================================

/**
 * Compute quality metrics from last N completed jobs.
 * Firestore reads: count (default 50)
 */
export async function getExtractionQualityMetrics(
    count: number = 50
): Promise<ExtractionQualityMetrics> {
    await assertCurrentPlatformAccess();
    try {
        const jobsRef = collection(firebaseClient, JOBS_COLLECTION);
        const normalizedCount = getBoundedPositiveInteger(count, DEFAULT_QUALITY_COUNT, DEFAULT_QUALITY_COUNT);
        const readLimit = Math.min(Math.max(normalizedCount * 3, normalizedCount), DEFAULT_QUALITY_READ_LIMIT);
        const jobsQuery = query(
            jobsRef,
            orderBy('createdAt', 'desc'),
            limit(readLimit)
        );
        const snap = await getDocs(jobsQuery);
        return buildQualityMetricsFromJobs(snap.docs.map(d => d.data()), normalizedCount);
    } catch (error) {
        logOpsFailure('extraction_dal_quality_metrics_failed', error, {
            count,
        });
        throw new Error('extraction_quality_metrics_unavailable');
    }
}

// ================================================================
// GET COST METRICS (from AI operations collection)
// ================================================================

/**
 * Compute cost metrics from today's AI operations.
 * Firestore reads: up to 100
 */
async function readExtractionCostMetrics(): Promise<ExtractionCostMetrics> {
    try {
        // NOTE: The CF writes to DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS (uppercase, top-level, no tenant scope).
        // The frontend DAL (aiOperations/index.tsx) writes to 'menulistAiOperations/{tId}/{sId}' (camelCase, subcollection).
        // This monitor reads from the CF collection for extraction cost tracking.
        const opsRef = collection(firebaseClient, DB_COLLECTIONS.MENULIST_AI_EXTRACTION_OPERATIONS);
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const opsQuery = query(
            opsRef,
            orderBy('createdAt', 'desc'),
            limit(100)
        );
        const snap = await getDocs(opsQuery);
        return buildExtractionCostMetricsFromOperations(
            snap.docs.map((document) => document.data()),
            todayStart.getTime(),
        );
    } catch (error) {
        logOpsFailure('extraction_dal_cost_metrics_failed', error);
        throw new Error('extraction_cost_metrics_unavailable');
    }
}

export async function getExtractionCostMetrics(): Promise<ExtractionCostMetrics> {
    await assertCurrentPlatformAccess();
    return readExtractionCostMetrics();
}

// ================================================================
// GET DASHBOARD SNAPSHOT
// ================================================================

/**
 * Fetch extraction dashboard data with one recent-job query.
 * Firestore reads: up to 150 job docs + up to 100 cost docs.
 *
 * This replaces the previous desktop/mobile pattern that queried recent jobs,
 * health metrics, and quality metrics separately against the same collection.
 */
export async function getExtractionDashboardSnapshot(
    filter?: ExtractionJobFilter,
): Promise<ExtractionDashboardSnapshot> {
    await assertCurrentPlatformAccess();
    try {
        const jobsRef = collection(firebaseClient, JOBS_COLLECTION);
        const pageSize = getBoundedPositiveInteger(filter?.pageSize, 20, 100);
        const readLimit = Math.max(
            DEFAULT_HEALTH_READ_LIMIT,
            DEFAULT_QUALITY_READ_LIMIT,
            filter?.status || filter?.days ? Math.min(Math.max(pageSize * 4, pageSize), DEFAULT_HEALTH_READ_LIMIT) : pageSize,
        );
        const jobsQuery = query(
            jobsRef,
            orderBy('createdAt', 'desc'),
            limit(readLimit),
        );
        const [jobsSnap, cost] = await Promise.all([
            getDocs(jobsQuery),
            readExtractionCostMetrics(),
        ]);
        const rawJobs = jobsSnap.docs.map((d) => d.data());
        const summaries = jobsSnap.docs.map((d) => jobDocToSummary(d.id, d.data()));

        return {
            health: buildHealthMetricsFromJobs(rawJobs),
            quality: buildQualityMetricsFromJobs(rawJobs, DEFAULT_QUALITY_COUNT),
            cost,
            jobs: filterJobSummaries(summaries, filter),
        };
    } catch (error) {
        logOpsFailure('extraction_dal_dashboard_snapshot_failed', error, {
            pageSize: filter?.pageSize,
            ...getBoundedOpsStringContext('status', filter?.status),
        });
        throw new Error('extraction_dashboard_snapshot_unavailable');
    }
}

// ================================================================
// RETRY FAILED JOB
// ================================================================

/**
 * Retry a failed extraction job through the platform-only recovery route.
 * The route revalidates the current platform user, original job scope, project,
 * source file ownership, retry limit, and active-job concurrency boundary.
 * 
 * @returns New job ID
 */
export async function retryExtractionJob(jobId: string): Promise<string> {
    const response = await fetch(`/api/ops/extraction/jobs/${encodeURIComponent(jobId)}/retry`, {
        cache: 'no-store',
        credentials: 'same-origin',
        method: 'POST',
        redirect: 'error',
    });
    const result = await readPlatformRetryResponse(response);
    const newJobId = normalizeMenuExtractionJobId(result.jobId);
    if (!response.ok || result.success !== true || !newJobId) {
        throw new Error('Extraction retry failed');
    }
    return newJobId;
}
