import { getBatchImageJobCollectionRef, getLegacyBatchImageJobCollectionRef } from '@database/imageBatchProcessing';
import { getBoundedHookStringContext, logHookDiagnostic, logHookFailure } from '@hook/hookDiagnostics';
import { useAppDispatch } from '@hook/useAppDispatch';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import {
    isImageBatchOwnerVisibleStatus,
    normalizeImageBatchJobForClient,
    shouldApplyImageBatchListenerSnapshot,
} from '@lib/ai/imageBatchClientBoundary';
import { message } from 'antd';
import { onSnapshot, type DocumentData, type QuerySnapshot } from "firebase/firestore";
import { useContext, useEffect, useRef } from "react";
import { BatchImageGenerationJobType, Project } from '../components/templates/main-app/projects/types';
import { toDate, type DateLike } from '@util/dateTime';

function timestampValue(value: unknown): number {
    const date = toDate(value as DateLike);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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
    setActiveBatchImageJob: (job: BatchImageGenerationJobType | null) => void;
}

export const useImageBatchJobListener = ({ project, setActiveBatchImageJob }: UseImageBatchJobListenerProps) => {
    const dispatch = useAppDispatch();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const legacyUnsubscribeRef = useRef<(() => void) | null>(null);
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
            if (legacyUnsubscribeRef.current) {
                legacyUnsubscribeRef.current();
                legacyUnsubscribeRef.current = null;
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
        if (legacyUnsubscribeRef.current) {
            legacyUnsubscribeRef.current();
            legacyUnsubscribeRef.current = null;
        }

        try {
            logHookDiagnostic('image_batch_job_listener_setup_started', getImageBatchJobListenerLogContext(projectId, tenantId, storeId), { developmentOnly: true });
            dispatch(startLoader("Listening to batch jobs for project: " + projectId));

            const sessionScope = { tId: tenantId, sId: storeId };
            let listenerActive = true;
            let primaryHasJob = false;
            const applySnapshot = (
                querySnapshot: QuerySnapshot<DocumentData>,
                source: 'legacy' | 'primary',
            ) => {
                    if (!listenerActive || !shouldApplyImageBatchListenerSnapshot(source, primaryHasJob)) return;
                    logHookDiagnostic('image_batch_job_listener_snapshot_received', {
                        ...getBoundedHookStringContext('projectId', projectId),
                        snapshotSize: querySnapshot.size,
                        source,
                    }, { developmentOnly: true });

                    const jobsList: BatchImageGenerationJobType[] = [];
                    let rejectedJobCount = 0;
                    querySnapshot.forEach((snapshotDoc) => {
                        const job = normalizeImageBatchJobForClient(snapshotDoc.data(), snapshotDoc.id, {
                            projectId,
                            storeId,
                            tenantId,
                        });
                        if (job) jobsList.push(job);
                        else rejectedJobCount += 1;
                    });
                    if (rejectedJobCount > 0) {
                        logHookFailure(
                            'image_batch_job_listener_payload_rejected',
                            new Error('Stored image batch job failed runtime validation.'),
                            {
                                ...getImageBatchJobListenerLogContext(projectId, tenantId, storeId),
                                rejectedJobCount,
                                source,
                            },
                        );
                    }

                    if (jobsList.length > 0) {
                        const latestJob = jobsList.sort((a, b) => getJobSortTime(b) - getJobSortTime(a))[0];
                        if (isImageBatchOwnerVisibleStatus(latestJob.status)) {
                            const updatedJob = withSelectedGeneratedImages(latestJob);
                            logHookDiagnostic('image_batch_job_listener_active_job_updated', {
                                ...getBoundedHookStringContext('jobId', updatedJob.id),
                                itemsCount: updatedJob.itemsList.length,
                                source,
                            }, { developmentOnly: true });
                            setActiveBatchImageJob(updatedJob);
                        } else {
                            setActiveBatchImageJob(null);
                        }
                    } else {
                        logHookDiagnostic('image_batch_job_listener_empty_snapshot', getBoundedHookStringContext('projectId', projectId), { developmentOnly: true });
                        setActiveBatchImageJob(null);
                    }
            };

            const subscribeLegacy = () => {
                if (legacyUnsubscribeRef.current) return;
                const legacyQuery = getLegacyBatchImageJobCollectionRef(sessionScope, projectId);
                legacyUnsubscribeRef.current = onSnapshot(
                    legacyQuery,
                    (querySnapshot) => {
                        if (listenerActive && !primaryHasJob) applySnapshot(querySnapshot, 'legacy');
                        dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
                    },
                    (error) => {
                        logHookFailure('image_batch_job_legacy_listener_snapshot_failed', error, getImageBatchJobListenerLogContext(projectId, tenantId, storeId));
                    },
                );
            };

            const jobsCollectionRef = getBatchImageJobCollectionRef(sessionScope, projectId);
            const unsubscribe = onSnapshot(
                jobsCollectionRef,
                (querySnapshot) => {
                    if (!listenerActive) return;
                    if (querySnapshot.empty) {
                        primaryHasJob = false;
                        subscribeLegacy();
                    } else {
                        primaryHasJob = true;
                        if (legacyUnsubscribeRef.current) {
                            legacyUnsubscribeRef.current();
                            legacyUnsubscribeRef.current = null;
                        }
                        applySnapshot(querySnapshot, 'primary');
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
                listenerActive = false;
                logHookDiagnostic('image_batch_job_listener_cleanup', getBoundedHookStringContext('projectId', projectId), { developmentOnly: true });
                if (unsubscribeRef.current) {
                    unsubscribeRef.current();
                    unsubscribeRef.current = null;
                }
                if (legacyUnsubscribeRef.current) {
                    legacyUnsubscribeRef.current();
                    legacyUnsubscribeRef.current = null;
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
