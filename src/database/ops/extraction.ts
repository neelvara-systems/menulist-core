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
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { createMenuProcessingJob } from '@lib/firebase/menuProcessing';
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
import { secureError } from '@lib/security/secureLogger';
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

// ================================================================
// HELPER: Extract summary from raw job doc
// ================================================================

function jobDocToSummary(id: string, data: any): ExtractionJobSummary {
    const result = data.result;
    return {
        id,
        projectId: data.projectId || '',
        status: data.status || 'unknown',
        filesCount: data.files?.length || 0,
        itemsExtracted: result?.combinedData?.items?.length || 0,
        categoriesExtracted: result?.combinedData?.categories?.length || 0,
        qualityScore: result?.qualityScore ?? null,
        processingTime: result?.processingTime ?? null,
        createdAt: data.createdAt,
        completedAt: data.completedAt || null,
        isFirstExtraction: data.isFirstExtraction ?? null,
        hasError: !!data.error,
        errorMessage: data.error?.message || null,
    };
}

function getDateMs(value: any): number {
    const dateMs = value?.toDate
        ? value.toDate().getTime()
        : value?.seconds
            ? value.seconds * 1000
            : new Date(value).getTime();
    return Number.isFinite(dateMs) ? dateMs : 0;
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

function buildHealthMetricsFromJobs(jobs: any[]): ExtractionHealthMetrics {
    const cutoffMs = Date.now() - 24 * 60 * 60 * 1000;
    const recentJobs = jobs.filter((job) => getDateMs(job.createdAt) >= cutoffMs);

    const activeJobs = recentJobs.filter((job) => job.status === 'pending' || job.status === 'processing').length;
    const failedJobs = recentJobs.filter((job) => job.status === 'failed').length;
    const completedJobs = recentJobs.filter((job) => job.status === 'completed' || job.status === 'preview_ready').length;
    const totalJobs = recentJobs.length;
    const failureRate = totalJobs > 0 ? Math.round((failedJobs / totalJobs) * 100) : 0;

    const completedWithTime = recentJobs.filter((job) =>
        job.result?.processingTime && (job.status === 'completed' || job.status === 'preview_ready')
    );
    const avgProcessingTime = completedWithTime.length > 0
        ? Math.round(completedWithTime.reduce((sum, job) => sum + job.result.processingTime, 0) / completedWithTime.length / 1000)
        : 0;

    const completedWithScore = recentJobs.filter((job) =>
        job.result?.qualityScore != null && (job.status === 'completed' || job.status === 'preview_ready')
    );
    const avgQualityScore = completedWithScore.length > 0
        ? Math.round(completedWithScore.reduce((sum, job) => sum + job.result.qualityScore, 0) / completedWithScore.length)
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

function buildQualityMetricsFromJobs(jobs: any[], count: number = DEFAULT_QUALITY_COUNT): ExtractionQualityMetrics {
    const completedJobs = jobs
        .filter((job) => job.status === 'completed' || job.status === 'preview_ready')
        .slice(0, count);

    if (completedJobs.length === 0) return getEmptyQualityMetrics();

    const scores = completedJobs
        .filter((job) => job.result?.qualityScore != null)
        .map((job) => job.result.qualityScore);
    const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    let high = 0;
    let medium = 0;
    let low = 0;
    for (const job of completedJobs) {
        const confidenceSummary = job.result?.confidenceSummary;
        if (confidenceSummary) {
            high += confidenceSummary.highConfidenceCount || 0;
            medium += confidenceSummary.mediumConfidenceCount || 0;
            low += confidenceSummary.lowConfidenceCount || 0;
        }
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
    const pageSize = filter?.pageSize || 20;
    const cutoffMs = filter?.days
        ? Date.now() - filter.days * 24 * 60 * 60 * 1000
        : null;

    return summaries
        .filter((job) => !filter?.status || job.status === filter.status)
        .filter((job) => {
            if (!cutoffMs) return true;
            return getDateMs(job.createdAt) >= cutoffMs;
        })
        .filter((job) => filter?.minQuality == null || (job.qualityScore ?? -Infinity) >= filter.minQuality)
        .filter((job) => filter?.maxQuality == null || (job.qualityScore ?? Infinity) <= filter.maxQuality)
        .slice(0, pageSize);
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
    try {
        const jobsRef = collection(firebaseClient, JOBS_COLLECTION);
        const pageSize = filter?.pageSize || 20;
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
        secureError('[ExtractionDAL] Failed to get recent jobs', error);
        return [];
    }
}

// ================================================================
// GET JOB DETAILS (for inspector drawer)
// ================================================================

/**
 * Get full extraction job details by ID.
 * Firestore reads: 1
 */
export async function getExtractionJobDetails(
    jobId: string
): Promise<ExtractionJobDetails | null> {
    try {
        const jobRef = doc(firebaseClient, JOBS_COLLECTION, jobId);
        const jobDoc = await getDoc(jobRef);

        if (!jobDoc.exists()) return null;

        const data = jobDoc.data();
        const summary = jobDocToSummary(jobDoc.id, data);

        return {
            ...summary,
            tId: data.tId || '',
            sId: data.sId || '',
            uId: data.uId || '',
            files: data.files || [],
            targetLanguages: data.targetLanguages || [],
            result: data.result || null,
            error: data.error || null,
            fileResults: data.fileResults || null,
            transaction: data.transaction || null,
        };
    } catch (error) {
        secureError('[ExtractionDAL] Failed to get job details', error);
        return null;
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
        secureError('[ExtractionDAL] Failed to get health metrics', error);
        return getEmptyHealthMetrics();
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
    try {
        const jobsRef = collection(firebaseClient, JOBS_COLLECTION);
        const readLimit = Math.min(Math.max(count * 3, count), 150);
        const jobsQuery = query(
            jobsRef,
            orderBy('createdAt', 'desc'),
            limit(readLimit)
        );
        const snap = await getDocs(jobsQuery);
        return buildQualityMetricsFromJobs(snap.docs.map(d => d.data()), count);
    } catch (error) {
        secureError('[ExtractionDAL] Failed to get quality metrics', error);
        return getEmptyQualityMetrics();
    }
}

// ================================================================
// GET COST METRICS (from AI operations collection)
// ================================================================

/**
 * Compute cost metrics from today's AI operations.
 * Firestore reads: up to 50
 */
export async function getExtractionCostMetrics(): Promise<ExtractionCostMetrics> {
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
        const todayStartMs = todayStart.getTime();
        const ops = snap.docs
            .map(d => d.data())
            .filter((op) => {
                const createdAt = op.createdAt;
                const createdAtMs = createdAt?.toDate
                    ? createdAt.toDate().getTime()
                    : createdAt?.seconds
                        ? createdAt.seconds * 1000
                        : new Date(createdAt).getTime();
                return op.action === 'IMAGE_PROCESSING'
                    && Number.isFinite(createdAtMs)
                    && createdAtMs >= todayStartMs;
            })
            .slice(0, 50);

        const callsToday = ops.length;
        const totalCharge = ops.reduce((sum, op) => sum + (op.totalCharge || 0), 0);
        const avgCost = callsToday > 0 ? Math.round(totalCharge / callsToday) : 0;
        const maxCharge = ops.length > 0 ? Math.max(...ops.map(op => op.totalCharge || 0)) : 0;

        return {
            callsToday,
            avgCostPerExtraction: avgCost,
            dailySpend: totalCharge,
            mostExpensiveJobCost: maxCharge,
        };
    } catch (error) {
        secureError('[ExtractionDAL] Failed to get cost metrics', error);
        return { callsToday: 0, avgCostPerExtraction: 0, dailySpend: 0, mostExpensiveJobCost: 0 };
    }
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
    try {
        const jobsRef = collection(firebaseClient, JOBS_COLLECTION);
        const pageSize = filter?.pageSize || 20;
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
            getExtractionCostMetrics(),
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
        secureError('[ExtractionDAL] Failed to get dashboard snapshot', error);
        return {
            health: getEmptyHealthMetrics(),
            quality: getEmptyQualityMetrics(),
            cost: { callsToday: 0, avgCostPerExtraction: 0, dailySpend: 0, mostExpensiveJobCost: 0 },
            jobs: [],
        };
    }
}

// ================================================================
// RETRY FAILED JOB
// ================================================================

const MAX_RETRIES = 3;

/**
 * Retry a failed extraction job by creating a new job with the same files.
 * Reuses existing createMenuProcessingJob() infrastructure.
 * Firestore reads: 1 (original job), Writes: 1 (new job via createMenuProcessingJob)
 * 
 * @returns New job ID
 */
export async function retryExtractionJob(jobId: string): Promise<string> {
    const jobRef = doc(firebaseClient, JOBS_COLLECTION, jobId);
    const jobDoc = await getDoc(jobRef);

    if (!jobDoc.exists()) {
        throw new Error('Job not found');
    }

    const data = jobDoc.data();

    if (data.status !== 'failed') {
        throw new Error(`Cannot retry job with status "${data.status}". Only failed jobs can be retried.`);
    }

    if (data.error && !data.error.retryable) {
        throw new Error('This job is not retryable (non-retryable error).');
    }

    const retryCount = data.retryCount || 0;
    if (retryCount >= MAX_RETRIES) {
        throw new Error(`Maximum retry limit (${MAX_RETRIES}) reached for this job.`);
    }

    // Validate files still have URLs
    const files = data.files || [];
    if (files.length === 0) {
        throw new Error('No files found in original job.');
    }

    const validFiles = files.filter((f: any) => f.url && f.uid);
    if (validFiles.length === 0) {
        throw new Error('Original files no longer available (missing URLs).');
    }

    // Create new job using existing infrastructure
    const newJobId = await createMenuProcessingJob({
        projectId: data.projectId,
        files: validFiles.map((f: any) => ({
            uid: f.uid,
            name: f.name || 'file',
            size: f.size || 0,
            type: f.type || 'image/jpeg',
            url: f.url,
        })),
        targetLanguages: data.targetLanguages || [{ code: 'en', name: 'English' }],
        action: data.action || 'IMAGE_PROCESSING',
        businessCategory: data.businessCategory,
        businessType: data.businessType,
        jobMode: data.jobMode || 'SINGLE_STORE',
        retriedFromJobId: jobId,
        retryCount: retryCount + 1,
    });

    return newJobId;
}
