'use client';

/**
 * Menu Image Processing Job Hook
 * 
 * Spec Reference: menu-image-processing-job-queue-spec.md Section 6
 * 
 * Real-time subscription to a menu processing job's status.
 * Automatically updates when the job progresses.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getMenuProcessingJobLogContext, logMenuProcessingFailure } from '@lib/firebase/menuProcessingDiagnostics';
import { MenuProcessingJobStatus, cancelMenuProcessingJob } from '@lib/firebase/menuProcessing';
import { normalizeMenuExtractionJobId } from '@lib/menu-extraction/jobIdBoundary';
import { normalizeMenuProcessingJobStatus } from '@lib/menu-extraction/menuProcessingJobStatusBoundary';
import { doc, onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

const COLLECTION = DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS;

export interface UseMenuProcessingJobReturn {
    /** The job document data */
    job: MenuProcessingJobStatus | null;
    /** Whether the hook is loading the initial state */
    isLoading: boolean;
    /** Whether the job is pending */
    isPending: boolean;
    /** Whether the job is currently processing */
    isProcessing: boolean;
    /** Whether the job is being cancelled */
    isCancelling: boolean;
    /** Whether the job was cancelled */
    isCancelled: boolean;
    /** Whether the job completed successfully */
    isCompleted: boolean;
    /** Whether the job failed */
    isFailed: boolean;
    /** Whether the job is in a terminal state (completed, failed, cancelled) */
    isTerminal: boolean;
    /** Whether job has raw extracted data ready for client-side review (re-extraction) */
    isPreviewReady: boolean;
    /** Whether this was a first extraction (auto-saved) vs re-extraction (needs review) */
    isFirstExtraction: boolean | null;
    /** Progress percentage (0-100) */
    progress: number;
    /** Current step description */
    currentStep: string;
    /** Job result (if completed or preview_ready) */
    result: MenuProcessingJobStatus['result'] | null;
    /** Job error (if failed) */
    error: MenuProcessingJobStatus['error'] | null;
    /** Per-file results */
    fileResults: MenuProcessingJobStatus['fileResults'] | null;
    /** Cancel the job */
    cancel: () => Promise<void>;
}

/**
 * Hook to subscribe to a menu processing job's status
 * 
 * @param jobId - The job ID to subscribe to (null to skip)
 * @returns Job status and helper properties
 */
export function useMenuProcessingJob(jobId: string | null): UseMenuProcessingJobReturn {
    const [job, setJob] = useState<MenuProcessingJobStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!jobId) {
            setJob(null);
            setIsLoading(false);
            return;
        }

        // A job ID can change while the previous listener value is still in
        // React state. Clear it before subscribing so listener failures cannot
        // leave a prior project's extraction result visible.
        setJob(null);
        setIsLoading(true);

        const normalizedJobId = normalizeMenuExtractionJobId(jobId);
        if (!normalizedJobId) {
            const normalized = normalizeMenuProcessingJobStatus(jobId, null);
            logMenuProcessingFailure(
                'menu_processing_listener_job_id_invalid',
                new Error(normalized.issueCode || 'MENU_PROCESSING_JOB_ID_INVALID'),
                getMenuProcessingJobLogContext(jobId),
            );
            setJob(normalized.job);
            setIsLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            doc(firebaseClient, COLLECTION, normalizedJobId),
            (snapshot) => {
                if (snapshot.exists()) {
                    const normalized = normalizeMenuProcessingJobStatus(snapshot.id, snapshot.data());
                    if (normalized.issueCode) {
                        logMenuProcessingFailure(
                            'menu_processing_listener_data_invalid',
                            new Error(normalized.issueCode),
                            getMenuProcessingJobLogContext(snapshot.id),
                        );
                    }
                    setJob(normalized.job);
                } else {
                    const normalized = normalizeMenuProcessingJobStatus(normalizedJobId, null);
                    logMenuProcessingFailure(
                        'menu_processing_listener_job_not_found',
                        new Error(normalized.issueCode || 'MENU_PROCESSING_JOB_NOT_FOUND'),
                        getMenuProcessingJobLogContext(normalizedJobId),
                    );
                    setJob(normalized.job);
                }
                setIsLoading(false);
            },
            (error) => {
                logMenuProcessingFailure('menu_processing_listener_failed', error, getMenuProcessingJobLogContext(jobId));
                setJob(normalizeMenuProcessingJobStatus(jobId, null).job);
                setIsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [jobId]);

    const cancel = useCallback(async () => {
        if (!jobId) return;
        try {
            await cancelMenuProcessingJob(jobId);
        } catch (error) {
            logMenuProcessingFailure('menu_processing_cancel_failed', error, getMenuProcessingJobLogContext(jobId));
            throw error;
        }
    }, [jobId]);

    // Effects run after render. Fail closed during the render in which jobId
    // changes so consumers can never observe the previous job under a new ID.
    const currentJob = job?.id === jobId ? job : null;

    // Compute derived states
    const status = currentJob?.status;
    const isPending = status === 'pending';
    const isProcessing = status === 'processing';
    const isCancelling = status === 'cancelling';
    const isCancelled = status === 'cancelled';
    const isCompleted = status === 'completed';
    const isFailed = status === 'failed';
    const isPreviewReady = status === 'preview_ready';
    const isTerminal = isCompleted || isFailed || isCancelled;
    const isFirstExtraction = currentJob?.isFirstExtraction ?? null;

    return {
        job: currentJob,
        isLoading,
        isPending,
        isProcessing,
        isCancelling,
        isCancelled,
        isCompleted,
        isFailed,
        isTerminal,
        isPreviewReady,
        isFirstExtraction,
        progress: currentJob?.progress ?? 0,
        currentStep: currentJob?.currentStep ?? '',
        result: currentJob?.result ?? null,
        error: currentJob?.error ?? null,
        fileResults: currentJob?.fileResults ?? null,
        cancel,
    };
}

export default useMenuProcessingJob;
