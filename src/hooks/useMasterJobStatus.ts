'use client';

/**
 * Master Job Status Hook
 * 
 * For outlet projects: Listens to the master project's active extraction job.
 * When master job is running, outlet UI should be blocked.
 * 
 * This replaces the extractionLock approach with a simpler real-time listener.
 * Benefits:
 * - No extra Firestore fields on project documents
 * - Real-time updates (no refresh needed)
 * - Zero extra reads for "lock checking"
 */

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { collection, limit, onSnapshot, query, where } from 'firebase/firestore';
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
 * @returns Master job status for UI blocking
 */
export function useMasterJobStatus(masterProjectId: string | null): MasterJobStatus {
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

        // Query for active jobs on master project
        // Active = pending, processing, or preview_ready
        const q = query(
            collection(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS),
            where('projectId', '==', masterProjectId),
            where('status', 'in', ['pending', 'processing', 'preview_ready']),
            limit(1)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                if (!snapshot.empty) {
                    const jobDoc = snapshot.docs[0];
                    const jobData = jobDoc.data();
                    const jobStatus = jobData.status as 'pending' | 'processing' | 'preview_ready';

                    let blockingMessage = 'Master menu is being updated. Please wait.';
                    if (jobStatus === 'preview_ready') {
                        blockingMessage = 'Master menu changes are pending review. Please wait or contact the master outlet.';
                    }

                    setStatus({
                        isMasterJobActive: true,
                        masterJobStatus: jobStatus,
                        masterJobId: jobDoc.id,
                        blockingMessage,
                        isLoading: false,
                    });
                } else {
                    setStatus({
                        isMasterJobActive: false,
                        isLoading: false,
                    });
                }
            },
            (error) => {
                console.error('[useMasterJobStatus] Listener error:', error);
                // On error, don't block - fail open
                setStatus({ isMasterJobActive: false, isLoading: false });
            }
        );

        return () => unsubscribe();
    }, [masterProjectId]);

    return status;
}

export default useMasterJobStatus;
