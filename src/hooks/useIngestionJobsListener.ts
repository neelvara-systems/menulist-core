'use client';

import { getIngestionJobCollectionRef } from '@database/kb-generation/jobs';
import { buildAnswerlatticeHookScopeKey } from '@lib/answerlattice/hookScopeBoundary';
import { getBoundedHookStringContext, logHookDiagnostic, logHookFailure } from '@hook/hookDiagnostics';
import { useAppDispatch } from '@hook/useAppDispatch';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { triggerFinalizePublish } from '@lib/firebase/functions';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { INGESTION_JOB_STATUS, IngestionJob } from '@type/knowledgeBase';
import { message } from 'antd';
import { onSnapshot } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

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
    const session = useClientAuthSession();
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const latestListenerRef = useRef(0);
    const requestedScopeKey = buildAnswerlatticeHookScopeKey(scope?.tId, scope?.sId);
    const sessionScopeKey = buildAnswerlatticeHookScopeKey(session?.tId, session?.sId);
    const hasExactScope = requestedScopeKey !== null && requestedScopeKey === sessionScopeKey;
    const tenantId = hasExactScope ? Number(scope?.tId) : 0;
    const storeId = hasExactScope ? Number(scope?.sId) : 0;

    useEffect(() => {
        const listenerId = latestListenerRef.current + 1;
        latestListenerRef.current = listenerId;
        if (!hasExactScope || tenantId <= 0 || storeId <= 0) {
            unsubscribeRef.current?.();
            unsubscribeRef.current = null;
            setActiveJob(null);
            return;
        }
        if (unsubscribeRef.current) unsubscribeRef.current();

        const loaderId = 'ingestion-jobs-listener';

        try {
            dispatch(startLoader(loaderId));

            const jobsCollectionRef = getIngestionJobCollectionRef({ tId: tenantId, sId: storeId });

            const unsubscribe = onSnapshot(jobsCollectionRef, async (querySnapshot) => {
                if (latestListenerRef.current !== listenerId) return;
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
                if (latestListenerRef.current !== listenerId) return;
                setActiveJob(currentActiveJob);
                dispatch(stopLoader(loaderId));
            },
                (error) => {
                    if (latestListenerRef.current !== listenerId) return;
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
            latestListenerRef.current += 1;
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            dispatch(stopLoader(loaderId));
        };
    }, [hasExactScope, storeId, tenantId, dispatch]);

    return { activeJob };
};
