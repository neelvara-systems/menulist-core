import { getBatchImageJobCollectionRef } from '@database/imageBatchProcessing';
import { getBoundedHookStringContext, logHookDiagnostic, logHookFailure } from '@hook/hookDiagnostics';
import { useAppDispatch } from '@hook/useAppDispatch';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { message } from 'antd';
import { onSnapshot } from "firebase/firestore";
import { useContext, useEffect, useRef } from "react";
import { BatchImageGenerationJobType, Project } from '../components/templates/main-app/projects/types';

function timestampValue(value: unknown): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Date.parse(value) || 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
        return ((value as { toMillis: () => number }).toMillis());
    }
    if (typeof value === 'object' && 'seconds' in value && typeof (value as { seconds?: unknown }).seconds === 'number') {
        return (value as { seconds: number }).seconds * 1000;
    }
    return 0;
}

function getJobSortTime(job: BatchImageGenerationJobType): number {
    return Math.max(
        timestampValue((job as Record<string, unknown>).modifiedOn),
        timestampValue((job as Record<string, unknown>).createdOn),
        ...((job.statusHistory || []).map((entry) => timestampValue(entry.createdOn))),
    );
}

function withSelectedGeneratedImages(job: BatchImageGenerationJobType): BatchImageGenerationJobType {
    return {
        ...job,
        itemsList: (job.itemsList || []).map((item) => ({
            ...item,
            images: (item.images || []).map((img) => ({
                ...img,
                isSelected: true,
            })),
        })),
    };
}

const getImageBatchJobListenerLogContext = (
    projectId: string | undefined,
    tenantId: number,
    storeId: number,
) => ({
    ...getBoundedHookStringContext('projectId', projectId),
    ...getBoundedHookStringContext('tenantId', tenantId),
    ...getBoundedHookStringContext('storeId', storeId),
});

interface UseImageBatchJobListenerProps {
    project?: Project | null;
    setActiveBatchImageJob: any;
}

export const useImageBatchJobListener = ({ project, setActiveBatchImageJob }: UseImageBatchJobListenerProps) => {
    const dispatch = useAppDispatch();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const projectId = project?.projectId;
    const tenantId = Number(storeDetails?.tenantId);
    const storeId = Number(storeDetails?.storeId);

    useEffect(() => {
        if (!projectId || !Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) {
            if (unsubscribeRef.current) {
                logHookDiagnostic('image_batch_job_listener_scope_cleanup', {}, { developmentOnly: true });
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            setActiveBatchImageJob(null);
            return;
        }

        logHookDiagnostic('image_batch_job_listener_initializing', getImageBatchJobListenerLogContext(projectId, tenantId, storeId), { developmentOnly: true });

        // Clean up previous listener if it exists
        if (unsubscribeRef.current) {
            logHookDiagnostic('image_batch_job_listener_previous_cleanup', getImageBatchJobListenerLogContext(projectId, tenantId, storeId), { developmentOnly: true });
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        try {
            logHookDiagnostic('image_batch_job_listener_setup_started', getImageBatchJobListenerLogContext(projectId, tenantId, storeId), { developmentOnly: true });
            dispatch(startLoader("Listening to batch jobs for project: " + projectId));

            // Get the collection reference
            const jobsCollectionRef = getBatchImageJobCollectionRef({ tId: tenantId, sId: storeId }, projectId);

            // Set up the snapshot listener
            const unsubscribe = onSnapshot(
                jobsCollectionRef,
                (querySnapshot) => {
                    logHookDiagnostic('image_batch_job_listener_snapshot_received', {
                        ...getBoundedHookStringContext('projectId', projectId),
                        snapshotSize: querySnapshot.size,
                    }, { developmentOnly: true });

                    const jobsList: BatchImageGenerationJobType[] = [];
                    querySnapshot.forEach((doc) => {
                        jobsList.push({ id: doc.id, ...doc.data() } as BatchImageGenerationJobType);
                    });

                    if (jobsList.length > 0) {
                        const updatedJob = withSelectedGeneratedImages(
                            jobsList.sort((a, b) => getJobSortTime(b) - getJobSortTime(a))[0]
                        );
                        logHookDiagnostic('image_batch_job_listener_active_job_updated', {
                            ...getBoundedHookStringContext('jobId', updatedJob.id),
                            itemsCount: updatedJob.itemsList.length,
                        }, { developmentOnly: true });
                        setActiveBatchImageJob(updatedJob);
                    } else {
                        logHookDiagnostic('image_batch_job_listener_empty_snapshot', getBoundedHookStringContext('projectId', projectId), { developmentOnly: true });
                        setActiveBatchImageJob(null);
                    }

                    dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
                },
                (error) => {
                    logHookFailure('image_batch_job_listener_snapshot_failed', error, getImageBatchJobListenerLogContext(projectId, tenantId, storeId));
                    message.error("Failed to listen to batch job updates.");
                    dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
                }
            );

            // Store the unsubscribe function for cleanup
            unsubscribeRef.current = unsubscribe;

            return () => {
                logHookDiagnostic('image_batch_job_listener_cleanup', getBoundedHookStringContext('projectId', projectId), { developmentOnly: true });
                if (unsubscribeRef.current) {
                    unsubscribeRef.current();
                    unsubscribeRef.current = null;
                }
                dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
            };
        } catch (error) {
            logHookFailure('image_batch_job_listener_setup_failed', error, getImageBatchJobListenerLogContext(projectId, tenantId, storeId));
            message.error("Failed to set up batch job listener.");
            dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
        }
    }, [dispatch, projectId, setActiveBatchImageJob, storeId, tenantId]);
};
