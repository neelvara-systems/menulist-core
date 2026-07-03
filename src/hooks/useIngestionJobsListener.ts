'use client';

import { getIngestionJobCollectionRef } from '@database/kb-generation/jobs';
import { getBoundedHookStringContext, logHookDiagnostic, logHookFailure } from '@hook/hookDiagnostics';
import { useAppDispatch } from '@hook/useAppDispatch';
import { triggerFinalizePublish } from '@lib/firebase/functions';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { INGESTION_JOB_STATUS, IngestionJob } from '@type/knowledgeBase';
import { message } from 'antd';
import { onSnapshot } from 'firebase/firestore';
import { useContext, useEffect, useRef, useState } from 'react';

export type IngestionJobsScope = {
    tId?: number | string | null;
    sId?: number | string | null;
};

const getIngestionJobsListenerLogContext = (
    tenantId: number,
    storeId: number,
) => ({
    ...getBoundedHookStringContext('tenantId', tenantId),
    ...getBoundedHookStringContext('storeId', storeId),
});

export const useIngestionJobsListener = (scope?: IngestionJobsScope) => {
    const [activeJob, setActiveJob] = useState<IngestionJob | null>(null);
    const dispatch = useAppDispatch();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const tenantId = Number(scope?.tId ?? storeDetails?.tenantId);
    const storeId = Number(scope?.sId ?? storeDetails?.storeId);

    useEffect(() => {
        if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return;
        if (unsubscribeRef.current) unsubscribeRef.current();

        const loaderId = 'ingestion-jobs-listener';

        try {
            dispatch(startLoader(loaderId));

            const jobsCollectionRef = getIngestionJobCollectionRef({ tId: tenantId, sId: storeId });

            const unsubscribe = onSnapshot(jobsCollectionRef, async (querySnapshot) => {
                const jobsData = querySnapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id } as IngestionJob));
                const currentActiveJob = jobsData.length > 0 ? jobsData[0] : null;
                if (currentActiveJob) {
                    if (process.env.NODE_ENV !== 'production' && currentActiveJob.status === INGESTION_JOB_STATUS.PUBLISHING) {
                        await triggerFinalizePublish(currentActiveJob.id, currentActiveJob);
                    }
                    logHookDiagnostic('ingestion_jobs_listener_active_job_found', {
                        ...getBoundedHookStringContext('jobId', currentActiveJob.id),
                        ...getBoundedHookStringContext('jobStatus', currentActiveJob.status),
                    }, { developmentOnly: true });
                }
                setActiveJob(currentActiveJob);
                dispatch(stopLoader(loaderId));
            },
                (error) => {
                    logHookFailure('ingestion_jobs_listener_snapshot_failed', error, getIngestionJobsListenerLogContext(tenantId, storeId));
                    message.error('Failed to fetch real-time job updates.');
                    dispatch(stopLoader(loaderId));
                }
            );

            unsubscribeRef.current = unsubscribe;
        } catch (error) {
            logHookFailure('ingestion_jobs_listener_setup_failed', error, getIngestionJobsListenerLogContext(tenantId, storeId));
            message.error('Failed to set up real-time job updates.');
            dispatch(stopLoader(loaderId));
        }

        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
            dispatch(stopLoader(loaderId));
        };
    }, [storeId, tenantId, dispatch]);

    return { activeJob };
};
