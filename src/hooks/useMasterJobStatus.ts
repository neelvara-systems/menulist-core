'use client';

/**
 * Master Job Status Hook
 * 
 * For outlet projects: Listens to the master project's active extraction job.
 * When master job is running, outlet UI should be blocked.
 * 
 * This replaces the extractionLock approach with a bounded server status check.
 * Benefits:
 * - No extra Firestore fields on project documents
 * - No direct outlet client listener against master-side job documents
 * - Capped polling through an authenticated route
 */

import { logger } from '@lib/monitoring/logger';
import { useEffect, useState } from 'react';

export interface MasterJobStatus {
    /** Whether master has an active job */
    isMasterJobActive: boolean;
    /** Master job status */
    masterJobStatus?: 'pending' | 'processing' | 'preview_ready';
    /** Master job ID */
    masterJobId?: string;
    /** Message to show on outlet UI */
    blockingMessage?: string;
    /** Whether loading */
    isLoading: boolean;
}

/**
 * Hook to monitor master project's extraction job status
 * 
 * Usage: Call this hook on outlet projects (those with masterProjectId).
 * If master has an active job, the outlet UI should show a blocking message.
 * 
 * @param masterProjectId - The master project ID (null if not an outlet)
 * @param outletProjectId - The linked outlet project ID, used for server-side access validation
 * @returns Master job status for UI blocking
 */
export function useMasterJobStatus(
    masterProjectId: string | null,
    outletProjectId?: string | null,
): MasterJobStatus {
    const [status, setStatus] = useState<MasterJobStatus>({
        isMasterJobActive: false,
        isLoading: true,
    });

    useEffect(() => {
        // Not an outlet - skip
        if (!masterProjectId) {
            setStatus({ isMasterJobActive: false, isLoading: false });
            return;
        }

        let cancelled = false;
        let hasLoaded = false;
        let abortController: AbortController | null = null;

        const fetchStatus = async () => {
            abortController?.abort();
            abortController = new AbortController();

            try {
                const params = new URLSearchParams({ masterProjectId });
                if (outletProjectId) params.set('outletProjectId', outletProjectId);

                const response = await fetch(`/api/projects/master-job-status?${params.toString()}`, {
                    cache: 'no-store',
                    signal: abortController.signal,
                });

                if (!response.ok) {
                    throw new Error(`Status request failed with ${response.status}`);
                }

                const data = await response.json();
                if (cancelled) return;

                const jobStatus = data.masterJobStatus as 'pending' | 'processing' | 'preview_ready' | undefined;
                let blockingMessage = 'Master menu is being updated. Please wait.';
                if (jobStatus === 'preview_ready') {
                    blockingMessage = 'Master menu changes are pending review. Please wait or contact the master outlet.';
                }

                setStatus({
                    isMasterJobActive: data.isMasterJobActive === true,
                    masterJobStatus: jobStatus,
                    masterJobId: data.masterJobId,
                    blockingMessage: data.isMasterJobActive === true ? blockingMessage : undefined,
                    isLoading: false,
                });
                hasLoaded = true;
            } catch (error: any) {
                if (cancelled || error?.name === 'AbortError') return;

                logger.warn('[useMasterJobStatus] Status check failed', {
                    masterProjectId,
                    outletProjectId,
                    error: error?.message || String(error),
                });
                // On error, don't block - fail open
                setStatus({ isMasterJobActive: false, isLoading: false });
                hasLoaded = true;
            }
        };

        if (!hasLoaded) {
            setStatus((current) => ({ ...current, isLoading: true }));
        }
        void fetchStatus();

        const intervalId = window.setInterval(fetchStatus, 15 * 1000);

        return () => {
            cancelled = true;
            abortController?.abort();
            window.clearInterval(intervalId);
        };
    }, [masterProjectId, outletProjectId]);

    return status;
}

export default useMasterJobStatus;
