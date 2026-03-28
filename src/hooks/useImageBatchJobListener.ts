import { getBatchImageJobCollectionRef } from '@database/imageBatchProcessing';
import { useAppDispatch } from '@hook/useAppDispatch';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { message } from 'antd';
import { logger } from "@lib/monitoring/logger";
import { onSnapshot } from "firebase/firestore";
import { useContext, useEffect, useRef } from "react";
import { BatchImageGenerationJobType, Project } from '../components/templates/main-app/projects/types';

interface UseImageBatchJobListenerProps {
    project: Project;
    setActiveBatchImageJob: any;
}

export const useImageBatchJobListener = ({ project, setActiveBatchImageJob }: UseImageBatchJobListenerProps) => {
    const dispatch = useAppDispatch();
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const projectId = project?.projectId;

    useEffect(() => {
        if (!projectId) return;
        logger.debug('Initializing batch job listener', {
            projectId,
            tenantId: storeDetails?.tenantId,
            storeId: storeDetails?.storeId
        });

        if (!storeDetails || !projectId) return;
        // Clean up previous listener if it exists
        if (unsubscribeRef.current) {
            logger.debug('Cleaning up previous batch job listener');
            unsubscribeRef.current();
        }

        try {
            logger.debug('Setting up batch jobs listener', { projectId });
            dispatch(startLoader("Listening to batch jobs for project: " + projectId));

            // Get the collection reference
            const jobsCollectionRef = getBatchImageJobCollectionRef({ tId: storeDetails.tenantId, sId: storeDetails.storeId }, projectId);

            // Set up the snapshot listener
            const unsubscribe = onSnapshot(
                jobsCollectionRef,
                (querySnapshot) => {
                    logger.debug('Batch job snapshot received', { projectId, snapshotSize: querySnapshot.size });

                    const jobsList: BatchImageGenerationJobType[] = [];
                    querySnapshot.forEach((doc) => {
                        jobsList.push({ id: doc.id, ...doc.data() } as BatchImageGenerationJobType);
                    });

                    if (jobsList.length > 0) {
                        const updatedJob = jobsList[0];
                        updatedJob.itemsList.forEach(item => {
                            item.images.forEach(img => {
                                img.isSelected = true;
                            })
                        })
                        logger.debug('Active batch job updated', { jobId: updatedJob.id, itemsCount: updatedJob.itemsList.length });
                        setActiveBatchImageJob(updatedJob);
                    } else {
                        logger.debug('No batch jobs found', { projectId });
                        setActiveBatchImageJob(null);
                    }

                    dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
                },
                (error) => {
                    logger.error('Batch job listener error', error, { projectId });
                    message.error("Failed to listen to batch job updates.");
                    dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
                }
            );

            // Store the unsubscribe function for cleanup
            unsubscribeRef.current = unsubscribe;

            return () => {
                logger.debug('Cleaning up batch job listener', { projectId });
                if (unsubscribeRef.current) {
                    unsubscribeRef.current();
                }
                dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
            };
        } catch (error) {
            logger.error('Failed to setup batch job listener', error, { projectId });
            message.error("Failed to set up batch job listener.");
            dispatch(stopLoader("Listening to batch jobs for project: " + projectId));
        }
    }, [projectId]);
};