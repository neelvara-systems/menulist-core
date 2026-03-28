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
import getActiveSession from '@lib/auth/getActiveSession';
import { Timestamp, addDoc, collection, doc, getDoc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore';
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
    /** Job mode for tracking extraction type */
    jobMode?: ExtractionJobMode;
    /** ID of the original failed job this retry was created from */
    retriedFromJobId?: string;
    /** Retry attempt number (0 = first attempt, 1 = first retry, etc.) */
    retryCount?: number;
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
    result?: {
        combinedData: any;
        qualityScore: number;
        qualityDetails: any;
        processingTime: number;
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
        jobMode = "SINGLE_STORE",
        retriedFromJobId,
        retryCount,
    } = params;

    // Get session for tenant context
    const session = await getActiveSession();
    if (!session) {
        throw new Error('User not authenticated');
    }

    const userId = session.uId;

    // Build job document
    const jobData = {
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
        jobMode,
        status: 'pending',
        progress: 0,
        currentStep: 'Queued',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        // Tenant context
        sId: String(session.sId),
        tId: String(session.tId),
        uId: userId,
        // Retry tracking (only present on retried jobs)
        ...(retriedFromJobId ? { retriedFromJobId } : {}),
        ...(retryCount != null ? { retryCount } : {}),
    };

    // Create job document
    const jobRef = await addDoc(collection(firebaseClient, COLLECTION), jobData);
    const jobId = jobRef.id;

    console.log(`[createMenuProcessingJob] Created job ${jobId}`, {
        projectId,
        filesCount: files.length,
        jobMode,
    });

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
            const { doc, getDoc } = await import('firebase/firestore');
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
                jobData: {
                    ...jobData,
                    id: jobId,
                },
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
export async function checkExistingActiveJob(projectId: string): Promise<string | null> {
    const session = await getActiveSession();
    if (!session) return null;

    const q = query(
        collection(firebaseClient, COLLECTION),
        where('projectId', '==', projectId),
        where('uId', '==', session.uId),
        where('status', 'in', ['pending', 'processing', 'preview_ready']),
        limit(1)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    }

    return null;
}
