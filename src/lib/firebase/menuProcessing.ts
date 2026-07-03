'use client';

/**
 * Menu Image Processing Job Queue - Client Integration
 * 
 * Spec Reference: menu-image-processing-job-queue-spec.md Section 6
 * 
 * This module provides:
 * 1. createMenuProcessingJob() - Creates a job document
 * 2. cancelMenuProcessingJob() - Cancels a running job
 * 3. Helper functions for job management
 */

import { DB_COLLECTIONS } from '@constant/database';
import type {
    MenuExtractionDestinationType,
    MenuExtractionJobDestination,
} from '@data/shared/menuExtractionJob';
import type { ExtractedBusinessProfile } from '@data/shared/extractedBusinessProfile';
import getActiveSession from '@lib/auth/getActiveSession';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { Timestamp, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseClient } from './firebaseClient';
import {
    getBoundedMenuProcessingStringContext,
    getMenuProcessingJobLogContext,
    getMenuProcessingProjectLogContext,
    logMenuProcessingFailure,
} from './menuProcessingDiagnostics';

const COLLECTION = DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS;
const MENU_PROCESSING_JOB_START_RESPONSE_JSON_MAX_BYTES = 32 * 1024;
const MENU_PROCESSING_JOB_START_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

// Track active triggers to prevent duplicates
const activeTriggers = new Set<string>();

/** Job mode for tracking extraction type */
export type ExtractionJobMode = 'SINGLE_STORE' | 'MASTER_PROJECT' | 'OUTLET_LINKED';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MenuFileToProcess {
    uid: string;
    name: string;
    size: number;
    type: string;
    url: string;
}

export interface TargetLanguage {
    code: string;
    name: string;
}

export interface CreateJobParams {
    projectId: string;
    files: MenuFileToProcess[];
    targetLanguages: TargetLanguage[];
    action?: string;
    businessCategory?: string;
    businessType?: string;
    /** Job mode for tracking extraction type */
    jobMode?: ExtractionJobMode;
    /** ID of the original failed job this retry was created from */
    retriedFromJobId?: string;
    /** Retry attempt number (0 = first attempt, 1 = first retry, etc.) */
    retryCount?: number;
    /** Force review even if project has no existing menu items. */
    forceReview?: boolean;
    /** Owner confirmed the menu-intake identity warning before extraction. */
    identityOverrideConfirmed?: boolean;
}

type MenuProcessingJobStartResponse = {
    success?: boolean;
    jobId?: unknown;
    reusedExistingJob?: unknown;
    reusedCompletedJob?: unknown;
};

export interface MenuProcessingJobStatus {
    id: string;
    projectId: string;
    status: 'pending' | 'processing' | 'preview_ready' | 'cancelling' | 'cancelled' | 'completed' | 'failed';
    progress: number;
    currentStep: string;
    createdAt: any;
    updatedAt: any;
    /** Whether this was first extraction (auto-save) vs re-extraction (needs review) */
    isFirstExtraction?: boolean;
    /** TTL for unapproved preview_ready jobs */
    expiresAt?: any;
    forceReview?: boolean;
    source?: string;
    sourceFingerprint?: string;
    sourceFingerprintVersion?: number;
    destination?: MenuExtractionJobDestination;
    destinationType?: MenuExtractionDestinationType;
    skipProjectSave?: boolean;
    sourceMetadata?: Record<string, unknown>;
    timings?: Record<string, unknown>;
    result?: {
        combinedData?: any;
        summary?: Record<string, unknown>;
        dataPrunedAt?: any;
        dataPrunedReason?: string;
        qualityScore: number;
        qualityDetails: any;
        processingTime: number;
        batchResults?: Array<{ batchIndex: number; success: boolean; filesProcessed: number }>;
        confidenceSummary?: {
            highConfidenceCount: number;
            mediumConfidenceCount: number;
            lowConfidenceCount: number;
            averageConfidenceScore: number;
        };
        model?: string;
        promptVersion?: string;
        rawBatchResponses?: Array<{ batchIndex: number; rawText: string; truncated: boolean }>;
        redistributedFiles?: Record<string, unknown>;
        extractedBusinessProfile?: ExtractedBusinessProfile;
    };
    error?: {
        code: string;
        message: string;
        retryable: boolean;
    };
    fileResults?: {
        [fileUid: string]: {
            categoriesCount: number;
            itemsCount: number;
            processingMessages?: Array<{
                sourceFileIndex: number;
                status: "error" | "warning";
                type: string;
                message: string;
                details?: {
                    omittedItems?: Array<{ position?: string; partialName?: string; reason: string }>;
                    affectedFields?: Array<{ itemId?: number; itemName?: string; field: string; reason: string }>;
                    omittedCount?: number;
                    extractedCount?: number;
                };
            }>;
        };
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const createMenuProcessingJobStartError = (code: string, status: number) => {
    const error = new Error('Could not start menu extraction.') as Error & { code?: string; status?: number };
    error.code = code;
    error.status = status;
    return error;
};

const getMenuProcessingJobStartLogContext = (params: {
    action: string;
    filesCount: number;
    forceReview?: boolean;
    identityOverrideConfirmed?: boolean;
    jobMode: ExtractionJobMode;
    projectId: string;
    retriedFromJobId?: string;
    retryCount?: number;
    targetLanguagesCount: number;
}) => ({
    ...getMenuProcessingProjectLogContext(params.projectId),
    ...getBoundedMenuProcessingStringContext('action', params.action),
    filesCount: params.filesCount,
    forceReview: params.forceReview === true,
    hasRetrySource: Boolean(params.retriedFromJobId),
    identityOverrideConfirmed: params.identityOverrideConfirmed === true,
    jobMode: params.jobMode,
    retryCount: typeof params.retryCount === 'number' ? params.retryCount : 0,
    targetLanguagesCount: params.targetLanguagesCount,
});

async function readMenuProcessingJobStartResponseJson(
    response: Response,
    context: ReturnType<typeof getMenuProcessingJobStartLogContext>,
): Promise<{ payload: MenuProcessingJobStartResponse | null; parseFailed: boolean }> {
    try {
        return {
            payload: await readJsonResponseWithLimit<MenuProcessingJobStartResponse>(
                response,
                MENU_PROCESSING_JOB_START_RESPONSE_JSON_MAX_BYTES,
            ),
            parseFailed: false,
        };
    } catch (error) {
        logMenuProcessingFailure('menu_processing_job_start_response_parse_failed', error, {
            ...context,
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: MENU_PROCESSING_JOB_START_RESPONSE_JSON_MAX_BYTES,
        });
        return { payload: null, parseFailed: true };
    }
}

/**
 * Create a menu image processing job
 * 
 * In production: Firestore onCreate trigger fires automatically
 * In development: Manually calls dev_triggerProcessMenuImages
 * 
 * @param params - Job parameters
 * @returns The created job ID
 */
export async function createMenuProcessingJob(params: CreateJobParams): Promise<string> {
    const {
        projectId,
        files,
        targetLanguages,
        action = "IMAGE_PROCESSING",
        businessCategory,
        businessType,
        jobMode = "SINGLE_STORE",
        retriedFromJobId,
        retryCount,
        forceReview,
        identityOverrideConfirmed,
    } = params;

    // Get session for tenant context
    const session = await getActiveSession();
    if (!session) {
        throw new Error('User not authenticated');
    }

    const jobStartLogContext = getMenuProcessingJobStartLogContext({
        action,
        filesCount: files.length,
        forceReview,
        identityOverrideConfirmed,
        jobMode,
        projectId,
        retriedFromJobId,
        retryCount,
        targetLanguagesCount: targetLanguages.length,
    });

    const response = await fetch('/api/menu-extraction/jobs', {
        ...MENU_PROCESSING_JOB_START_REQUEST_POLICY,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            projectId,
            files: files.map(f => ({
                uid: f.uid,
                name: f.name,
                size: f.size,
                type: f.type,
                url: f.url,
            })),
            targetLanguages: targetLanguages.map(l => ({
                code: l.code,
                name: l.name,
            })),
            action,
            ...(businessCategory ? { businessCategory } : {}),
            ...(businessType ? { businessType } : {}),
            jobMode,
            ...(forceReview ? { forceReview: true } : {}),
            ...(identityOverrideConfirmed ? { identityOverrideConfirmed: true } : {}),
            ...(retriedFromJobId ? { retriedFromJobId } : {}),
            ...(retryCount != null ? { retryCount } : {}),
        }),
    });

    const { payload, parseFailed } = await readMenuProcessingJobStartResponseJson(
        response,
        jobStartLogContext,
    );
    if (!response.ok) {
        throw createMenuProcessingJobStartError('menu_processing_job_start_rejected', response.status);
    }

    if (parseFailed) {
        throw createMenuProcessingJobStartError('menu_processing_job_start_response_parse_failed', response.status);
    }

    if (payload?.success !== true || !isNonEmptyString(payload.jobId)) {
        const invalid = createMenuProcessingJobStartError('menu_processing_job_start_response_invalid', response.status);
        logMenuProcessingFailure('menu_processing_job_start_response_invalid', invalid, {
            ...jobStartLogContext,
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: MENU_PROCESSING_JOB_START_RESPONSE_JSON_MAX_BYTES,
            success: payload?.success === true,
            hasJobId: isNonEmptyString(payload?.jobId),
        });
        throw invalid;
    }

    const jobId = payload.jobId;
    if (payload?.reusedExistingJob === true || payload?.reusedCompletedJob === true) {
        return jobId;
    }

    // In development, manually trigger the function
    // (Firestore triggers don't work in emulator without manual intervention)
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
        try {
            // Check if we're already triggering this job
            if (activeTriggers.has(jobId)) {
                return jobId;
            }

            // Mark this job as being triggered
            activeTriggers.add(jobId);

            // Check if job is already being processed to avoid duplicate triggers
            const jobDocRef = doc(firebaseClient, COLLECTION, jobId);
            const jobDoc = await getDoc(jobDocRef);
            const jobStatus = jobDoc.data()?.status;

            if (jobStatus === 'processing') {
                activeTriggers.delete(jobId); // Clean up tracking
                return jobId;
            }

            // Add a small delay to avoid Firebase Functions double execution issue
            await new Promise(resolve => setTimeout(resolve, 100));

            const functions = getFunctions();
            const triggerFn = httpsCallable(functions, 'dev_triggerProcessMenuImages');
            await triggerFn({
                jobId,
                jobData: jobDoc.exists()
                    ? { ...jobDoc.data(), id: jobId }
                    : { id: jobId },
            });

            // Clean up tracking after successful trigger
            activeTriggers.delete(jobId);
        } catch (error) {
            logMenuProcessingFailure('menu_processing_dev_trigger_failed', error, {
                ...getMenuProcessingJobLogContext(jobId),
                ...getMenuProcessingProjectLogContext(projectId),
                filesCount: files.length,
                targetLanguagesCount: targetLanguages.length,
                jobMode,
                hasRetrySource: Boolean(retriedFromJobId),
                retryCount: typeof retryCount === 'number' ? retryCount : 0,
            });
            // Clean up tracking on error
            activeTriggers.delete(jobId);
            // Don't throw - the job was created, just trigger failed
        }
    }

    return jobId;
}

/**
 * Cancel a running job
 * 
 * Sets job status to 'cancelling'. The server will check this
 * and gracefully stop processing.
 * 
 * @param jobId - The job ID to cancel
 */
export async function cancelMenuProcessingJob(jobId: string): Promise<void> {
    const jobRef = doc(firebaseClient, COLLECTION, jobId);

    // Check current status
    const jobDoc = await getDoc(jobRef);
    if (!jobDoc.exists()) {
        logMenuProcessingFailure('menu_processing_cancel_job_missing', undefined, getMenuProcessingJobLogContext(jobId));
        throw new Error('Menu extraction job not found.');
    }

    const currentStatus = jobDoc.data()?.status;

    if (currentStatus === 'pending') {
        // Job not yet picked up by CF — cancel directly (no CF to notify)
        await updateDoc(jobRef, {
            status: 'cancelled',
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        return;
    }

    if (currentStatus === 'processing') {
        // Job being processed by CF — set 'cancelling' so CF checks and stops gracefully
        await updateDoc(jobRef, {
            status: 'cancelling',
            updatedAt: Timestamp.now(),
        });
        return;
    }

    logMenuProcessingFailure('menu_processing_cancel_invalid_status', undefined, {
        ...getMenuProcessingJobLogContext(jobId),
        ...getBoundedMenuProcessingStringContext('status', currentStatus),
    });
    throw new Error('Menu extraction job cannot be cancelled.');
}

/**
 * Check if there's already an active job for a project
 * 
 * Firestore security rules require uId == auth.uid on reads,
 * so we must include the uId filter in list queries.
 * 
 * @param projectId - The project ID to check
 * @returns The active job ID if found, null otherwise
 */
export async function checkExistingActiveJob(projectId: string, ignoreJobIds: string[] = []): Promise<string | null> {
    const session = await getActiveSession();
    if (!session) return null;

    const ignoreSet = new Set(ignoreJobIds.filter(Boolean));

    const q = query(
        collection(firebaseClient, COLLECTION),
        where('projectId', '==', projectId),
        where('uId', '==', session.uId),
        where('status', 'in', ['pending', 'processing', 'preview_ready'])
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        return null;
    }

    const activeDocs = snapshot.docs
        .map((docSnap) => ({
            id: docSnap.id,
            createdAt: docSnap.data()?.createdAt,
            status: docSnap.data()?.status,
        }))
        .filter((docData) => !ignoreSet.has(docData.id))
        .sort((left, right) => {
            const leftTime = typeof left.createdAt?.toMillis === 'function' ? left.createdAt.toMillis() : 0;
            const rightTime = typeof right.createdAt?.toMillis === 'function' ? right.createdAt.toMillis() : 0;
            return rightTime - leftTime;
        });

    if (activeDocs.length > 1) {
        logMenuProcessingFailure('menu_processing_multiple_active_jobs', undefined, {
            ...getMenuProcessingProjectLogContext(projectId),
            activeJobsCount: activeDocs.length,
            ignoredJobIdsCount: ignoreSet.size,
        });
    }

    return activeDocs[0]?.id || null;
}
