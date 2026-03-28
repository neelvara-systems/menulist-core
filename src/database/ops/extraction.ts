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
    Timestamp,
    where,
} from 'firebase/firestore';

const JOBS_COLLECTION = DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS;

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
        const constraints: any[] = [orderBy('createdAt', 'desc')];

        if (filter?.status) {
            constraints.push(where('status', '==', filter.status));
        }

        if (filter?.days) {
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - filter.days);
            constraints.push(where('createdAt', '>=', Timestamp.fromDate(cutoff)));
        }

        constraints.push(limit(filter?.pageSize || 20));

        const jobsQuery = query(jobsRef, ...constraints);
        const snap = await getDocs(jobsQuery);

        return snap.docs.map(d => jobDocToSummary(d.id, d.data()));
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
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - 24);

        const jobsQuery = query(
            jobsRef,
            where('createdAt', '>=', Timestamp.fromDate(cutoff)),
            orderBy('createdAt', 'desc'),
            limit(100)
        );
        const snap = await getDocs(jobsQuery);

        const jobs = snap.docs.map(d => d.data());

        // Count active jobs
        const activeJobs = jobs.filter(j =>
            j.status === 'pending' || j.status === 'processing'
        ).length;

        // Count by status
        const failedJobs = jobs.filter(j => j.status === 'failed').length;
        const completedJobs = jobs.filter(j =>
            j.status === 'completed' || j.status === 'preview_ready'
        ).length;
        const totalJobs = jobs.length;

        // Failure rate
        const failureRate = totalJobs > 0
            ? Math.round((failedJobs / totalJobs) * 100)
            : 0;

        // Average processing time (completed jobs only)
        const completedWithTime = jobs.filter(j =>
            j.result?.processingTime && (j.status === 'completed' || j.status === 'preview_ready')
        );
        const avgProcessingTime = completedWithTime.length > 0
            ? Math.round(completedWithTime.reduce((sum, j) => sum + j.result.processingTime, 0) / completedWithTime.length / 1000)
            : 0;

        // Average quality score
        const completedWithScore = jobs.filter(j =>
            j.result?.qualityScore != null && (j.status === 'completed' || j.status === 'preview_ready')
        );
        const avgQualityScore = completedWithScore.length > 0
            ? Math.round(completedWithScore.reduce((sum, j) => sum + j.result.qualityScore, 0) / completedWithScore.length)
            : 0;

        // Determine health status
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
    } catch (error) {
        secureError('[ExtractionDAL] Failed to get health metrics', error);
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
        const jobsQuery = query(
            jobsRef,
            where('status', 'in', ['completed', 'preview_ready']),
            orderBy('createdAt', 'desc'),
            limit(count)
        );
        const snap = await getDocs(jobsQuery);
        const jobs = snap.docs.map(d => d.data());

        if (jobs.length === 0) {
            return { avgScore: 0, confidenceDistribution: { high: 0, medium: 0, low: 0 }, lowQualityRate: 0, totalJobsAnalyzed: 0 };
        }

        // Average quality score
        const scores = jobs.filter(j => j.result?.qualityScore != null).map(j => j.result.qualityScore);
        const avgScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;

        // Confidence distribution (aggregate from all jobs)
        let high = 0, medium = 0, low = 0;
        for (const job of jobs) {
            const cs = job.result?.confidenceSummary;
            if (cs) {
                high += cs.highConfidenceCount || 0;
                medium += cs.mediumConfidenceCount || 0;
                low += cs.lowConfidenceCount || 0;
            }
        }

        // Low quality rate
        const lowQualityCount = scores.filter(s => s < 40).length;
        const lowQualityRate = scores.length > 0
            ? Math.round((lowQualityCount / scores.length) * 100)
            : 0;

        return {
            avgScore,
            confidenceDistribution: { high, medium, low },
            lowQualityRate,
            totalJobsAnalyzed: jobs.length,
        };
    } catch (error) {
        secureError('[ExtractionDAL] Failed to get quality metrics', error);
        return { avgScore: 0, confidenceDistribution: { high: 0, medium: 0, low: 0 }, lowQualityRate: 0, totalJobsAnalyzed: 0 };
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
        // NOTE: The CF writes to 'MENULIST_AI_OPERATIONS' (uppercase, top-level, no tenant scope).
        // The frontend DAL (aiOperations/index.tsx) writes to 'menulistAiOperations/{tId}/{sId}' (camelCase, subcollection).
        // This monitor reads from the CF collection for extraction cost tracking.
        const opsRef = collection(firebaseClient, 'MENULIST_AI_OPERATIONS');
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const opsQuery = query(
            opsRef,
            where('action', '==', 'IMAGE_PROCESSING'),
            where('createdAt', '>=', Timestamp.fromDate(todayStart)),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const snap = await getDocs(opsQuery);
        const ops = snap.docs.map(d => d.data());

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
        jobMode: data.jobMode || 'SINGLE_STORE',
        retriedFromJobId: jobId,
        retryCount: retryCount + 1,
    });

    return newJobId;
}
