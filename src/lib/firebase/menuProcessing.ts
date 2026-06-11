'use client';

/**
 * Menu Image Processing Job Queue - Client Integration
 * 
 * Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 6
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
import { Timestamp, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseClient } from './firebaseClient';

const COLLECTION = DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS;

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

    const response = await fetch('/api/menu-extraction/jobs', {
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

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(payload?.error || 'Could not start menu extraction.');
    }

    const jobId = payload?.jobId;
    if (!jobId) {
        throw new Error('Could not start menu extraction.');
    }

    console.log(`[createMenuProcessingJob] Created job ${jobId}`, {
        projectId,
        filesCount: files.length,
        jobMode,
        reusedCompletedJob: payload?.reusedCompletedJob === true,
        reusedExistingJob: payload?.reusedExistingJob === true,
    });

    if (payload?.reusedExistingJob === true || payload?.reusedCompletedJob === true) {
        return jobId;
    }

    // In development, manually trigger the function
    // (Firestore triggers don't work in emulator without manual intervention)
    if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
        try {
            // Check if we're already triggering this job
            if (activeTriggers.has(jobId)) {
                console.log(`[createMenuProcessingJob] Job ${jobId} already being triggered, skipping`);
                return jobId;
            }

            // Mark this job as being triggered
            activeTriggers.add(jobId);

            // Check if job is already being processed to avoid duplicate triggers
            const jobDocRef = doc(firebaseClient, COLLECTION, jobId);
            const jobDoc = await getDoc(jobDocRef);
            const jobStatus = jobDoc.data()?.status;

            console.log(`[createMenuProcessingJob] Job ${jobId} status check:`, { status: jobStatus, exists: jobDoc.exists() });

            if (jobStatus === 'processing') {
                console.log(`[createMenuProcessingJob] Job ${jobId} already processing, skipping trigger`);
                activeTriggers.delete(jobId); // Clean up tracking
                return jobId;
            }

            console.log(`[createMenuProcessingJob] Proceeding with trigger for job ${jobId} (status: ${jobStatus})`);

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
            console.log(`[createMenuProcessingJob] Dev trigger called for job ${jobId}`);

            // Clean up tracking after successful trigger
            activeTriggers.delete(jobId);
        } catch (error) {
            console.error(`[createMenuProcessingJob] Dev trigger failed for job ${jobId}`, error);
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
        throw new Error(`Job ${jobId} not found`);
    }

    const currentStatus = jobDoc.data()?.status;

    if (currentStatus === 'pending') {
        // Job not yet picked up by CF — cancel directly (no CF to notify)
        await updateDoc(jobRef, {
            status: 'cancelled',
            completedAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        console.log(`[cancelMenuProcessingJob] Cancelled pending job ${jobId}`);
        return;
    }

    if (currentStatus === 'processing') {
        // Job being processed by CF — set 'cancelling' so CF checks and stops gracefully
        await updateDoc(jobRef, {
            status: 'cancelling',
            updatedAt: Timestamp.now(),
        });
        console.log(`[cancelMenuProcessingJob] Requested cancellation for processing job ${jobId}`);
        return;
    }

    throw new Error(`Job ${jobId} cannot be cancelled (status: ${currentStatus})`);
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
        console.warn('[checkExistingActiveJob] Multiple active jobs detected for project. Reusing the latest one.', {
            projectId,
            jobIds: activeDocs.map((job) => `${job.id}:${job.status}`),
        });
    }

    return activeDocs[0]?.id || null;
}
