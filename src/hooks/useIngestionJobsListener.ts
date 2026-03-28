'use client';

import { getIngestionJobCollectionRef } from '@database/kb-generation/jobs';
import { useAppDispatch } from '@hook/useAppDispatch';
import { triggerFinalizePublish } from '@lib/firebase/functions';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { INGESTION_JOB_STATUS, IngestionJob } from '@type/knowledgeBase';
import { logger } from '@lib/monitoring/logger';
import { message } from 'antd';
import { onSnapshot } from 'firebase/firestore';
import { useContext, useEffect, useRef, useState } from 'react';

export const useIngestionJobsListener = () => {
    const [activeJob, setActiveJob] = useState<IngestionJob | null>(null);
    const dispatch = useAppDispatch();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (!storeDetails?.storeId) return;
        if (unsubscribeRef.current) unsubscribeRef.current();

        const loaderId = 'ingestion-jobs-listener';

        try {
            dispatch(startLoader(loaderId));

            const jobsCollectionRef = getIngestionJobCollectionRef({ tId: storeDetails.tenantId, sId: storeDetails.storeId });

            const unsubscribe = onSnapshot(jobsCollectionRef, async (querySnapshot) => {
                const jobsData = querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as IngestionJob));
                const currentActiveJob = jobsData.length > 0 ? jobsData[0] : null;
                if (currentActiveJob) {
                    if (process.env.NODE_ENV !== 'production' && currentActiveJob.status === INGESTION_JOB_STATUS.PUBLISHING) {
                        await triggerFinalizePublish(currentActiveJob.id, currentActiveJob);
                    }
                    logger.debug('Active ingestion job found', { jobId: currentActiveJob.id, status: currentActiveJob.status });
                }
                setActiveJob(currentActiveJob);
                dispatch(stopLoader(loaderId));
            },
                (error) => {
                    logger.error('Ingestion jobs listener error', error, { tenantId: storeDetails.tenantId, storeId: storeDetails.storeId });
                    message.error('Failed to fetch real-time job updates.');
                    dispatch(stopLoader(loaderId));
                }
            );

            unsubscribeRef.current = unsubscribe;
        } catch (error) {
            logger.error('Failed to setup ingestion jobs listener', error, { tenantId: storeDetails.tenantId, storeId: storeDetails.storeId });
            message.error('Failed to set up real-time job updates.');
            dispatch(stopLoader(loaderId));
        }

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            dispatch(stopLoader(loaderId));
        };
    }, [storeDetails?.storeId, storeDetails?.tenantId, dispatch]);

    return { activeJob };
};
