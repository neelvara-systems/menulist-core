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

import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';
import {
    isMasterJobStatusResponse,
    MASTER_JOB_STATUS_RESPONSE_JSON_MAX_BYTES,
    type MasterJobStatusResponse,
} from '@lib/multiOutlet/masterJobStatusResponse';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';
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

type MasterJobStatusHookLogContext = Record<string, boolean | number | string | null | undefined>;

const MASTER_JOB_STATUS_REQUEST_POLICY: RequestInit = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

const unavailableMasterJobStatus = (): MasterJobStatus => ({
    isMasterJobActive: true,
    blockingMessage: 'Could not verify the master menu status. Try again before editing.',
    isLoading: false,
});

const getMasterJobStatusHookLogContext = (
    masterProjectId: string | null,
    outletProjectId?: string | null,
): MasterJobStatusHookLogContext => ({
    ...getBoundedHookStringContext('masterProjectId', masterProjectId),
    ...getBoundedHookStringContext('outletProjectId', outletProjectId),
});

const readMasterJobStatusResponse = async (
    response: Response,
    logContext: MasterJobStatusHookLogContext,
): Promise<MasterJobStatusResponse | null> => {
    const responseContext = {
        ...logContext,
        responseOk: response.ok,
        responseStatus: response.status,
        maxBytes: MASTER_JOB_STATUS_RESPONSE_JSON_MAX_BYTES,
    };

    if (!response.ok) {
        logHookFailure('master_job_status_response_rejected', new Error('master_job_status_response_rejected'), responseContext);
        return null;
    }

    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            MASTER_JOB_STATUS_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logHookFailure('master_job_status_response_parse_failed', error, responseContext);
        return null;
    }

    if (!isMasterJobStatusResponse(payload)) {
        logHookFailure('master_job_status_response_invalid', new Error('master_job_status_response_invalid'), responseContext);
        return null;
    }

    return payload;
};

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
            const logContext = getMasterJobStatusHookLogContext(masterProjectId, outletProjectId);

            try {
                const params = new URLSearchParams({ masterProjectId });
                if (outletProjectId) params.set('outletProjectId', outletProjectId);

                const response = await fetch(`/api/projects/master-job-status?${params.toString()}`, {
                    ...MASTER_JOB_STATUS_REQUEST_POLICY,
                    signal: abortController.signal,
                });

                const data = await readMasterJobStatusResponse(response, logContext);
                if (cancelled) return;
                if (!data) {
                    setStatus(unavailableMasterJobStatus());
                    hasLoaded = true;
                    return;
                }

                const jobStatus = data.masterJobStatus;
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
            } catch (error: unknown) {
                if (cancelled || getBoundedErrorName(error) === 'AbortError') return;

                logHookFailure('master_job_status_check_failed', error, logContext);
                setStatus(unavailableMasterJobStatus());
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
