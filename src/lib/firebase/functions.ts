'use client';

import {
    getBoundedLogValueContext,
    getBoundedErrorCode,
    getBoundedErrorStatus,
    getBoundedErrorName,
} from '@lib/monitoring/boundedLogContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { secureError } from '@lib/security/secureLogger';
import type { IngestionJobCategoriesMap } from '@type/knowledgeBase';
import { firebaseApp } from './firebaseClient';

// MenuList Cloud Functions (menulist-qa locally/preview; menulist in production)
const functions = getFunctions(firebaseApp);

type FirebaseCallableLogContext = Record<string, boolean | number | string | undefined>;

const getBoundedFirebaseCallableStringContext = (
    label: string,
    value: unknown,
): FirebaseCallableLogContext => {
    return getBoundedLogValueContext(label, value);
};

const getFirebaseCallableErrorName = (error: unknown): string | undefined => {
    return getBoundedErrorName(error);
};

const getFirebaseCallableErrorCode = (error: unknown): string | undefined => {
    const normalized = getBoundedErrorCode(error);
    if (normalized === undefined) return undefined;
    return /^[a-zA-Z0-9._:/-]+$/.test(normalized) ? normalized : 'non_standard_code';
};

const getFirebaseCallableErrorStatus = (error: unknown): number | undefined => {
    return getBoundedErrorStatus(error);
};

const logVerifyMenuPublishFailure = (
    error: unknown,
    payload: {
        storeId: string;
        tenantId: string;
        publicMenuUrl: string;
    },
): void => {
    secureError('[Menu Health Monitor] Publish verification failed', new Error('verify_menu_publish_failed'), {
        ...getBoundedFirebaseCallableStringContext('storeId', payload.storeId),
        ...getBoundedFirebaseCallableStringContext('tenantId', payload.tenantId),
        ...getBoundedFirebaseCallableStringContext('publicMenuUrl', payload.publicMenuUrl),
        sourceErrorName: getFirebaseCallableErrorName(error),
        sourceErrorCode: getFirebaseCallableErrorCode(error),
        sourceStatusCode: getFirebaseCallableErrorStatus(error),
    });
};

type AnswerlatticeCallableName = 'regenerateEmbedding' | 'publishApprovedJobFn';

const ANSWERLATTICE_CALLABLE_FAILURE_CODES: Record<AnswerlatticeCallableName, string> = {
    regenerateEmbedding: 'answerlattice_regenerate_embedding_callable_failed',
    publishApprovedJobFn: 'answerlattice_publish_approved_job_callable_failed',
};

const logAnswerlatticeCallableFailure = (
    error: unknown,
    payload: {
        callableName: AnswerlatticeCallableName;
        articleId?: string;
        jobId?: string;
    },
): void => {
    secureError('[Answerlattice Callable] Operation failed', new Error(ANSWERLATTICE_CALLABLE_FAILURE_CODES[payload.callableName]), {
        callableName: payload.callableName,
        ...getBoundedFirebaseCallableStringContext('articleId', payload.articleId),
        ...getBoundedFirebaseCallableStringContext('jobId', payload.jobId),
        sourceErrorName: getFirebaseCallableErrorName(error),
        sourceErrorCode: getFirebaseCallableErrorCode(error),
        sourceStatusCode: getFirebaseCallableErrorStatus(error),
    });
};

// Answerlattice Cloud Functions — answerlattice-qa locally/preview; answerlattice in production
export const regenerateEmbedding = async (articleId: string) => {
    const { answerlatticeFunctions } = await import('./answerlatticeFirebaseClient');
    const regenerateEmbeddingFn = httpsCallable(answerlatticeFunctions, 'regenerateEmbedding');
    try {
        const result = await regenerateEmbeddingFn({ articleId });
        return result.data;
    } catch (error) {
        logAnswerlatticeCallableFailure(error, {
            callableName: 'regenerateEmbedding',
            articleId,
        });
        throw new Error('Failed to trigger embedding regeneration.');
    }
};

export type PublishApprovedJobPayload = {
    jobId: string;
    finalCategories: IngestionJobCategoriesMap;
};

export type PublishApprovedJobResult = {
    success: true;
    alreadyStarted: boolean;
    status: 'already_started' | 'publishing';
};

export const publishApprovedJob = async (payload: PublishApprovedJobPayload): Promise<PublishApprovedJobResult> => {
    const { answerlatticeFunctions } = await import('./answerlatticeFirebaseClient');
    const publishApprovedJobFn = httpsCallable<PublishApprovedJobPayload, PublishApprovedJobResult>(
        answerlatticeFunctions,
        'publishApprovedJobFn',
    );
    try {
        const result = await publishApprovedJobFn(payload);
        return result.data;
    } catch (error) {
        logAnswerlatticeCallableFailure(error, {
            callableName: 'publishApprovedJobFn',
            jobId: payload.jobId,
        });
        throw new Error('Failed to trigger job publishing.');
    }
};

/**
 * Verify a published menu is accessible and has content.
 * Called automatically after publish completes.
 * Fire-and-forget — failure does NOT affect publish success.
 * 
 * @see __docs__/menu-health-monitor/menu-health-monitor_impl.md
 */
export const verifyMenuPublish = async (payload: {
    storeId: string;
    tenantId: string;
    publicMenuUrl: string;
}): Promise<unknown> => {
    try {
        const { FEATURE_FLAGS } = await import('@config/features');
        if (!FEATURE_FLAGS.ENABLE_MENU_HEALTH_MONITOR) return null;

        const verifyFn = httpsCallable<typeof payload, unknown>(functions, 'verifyMenuPublish');
        const result = await verifyFn(payload);
        return result.data;
    } catch (error) {
        // Fire-and-forget — don't break publish flow
        logVerifyMenuPublishFailure(error, payload);
        return null;
    }
};

export const triggerStartGeneration = async (jobId: string, jobData: any) => {
    const { answerlatticeFunctions } = await import('./answerlatticeFirebaseClient');
    const trigger = httpsCallable(answerlatticeFunctions, 'dev_triggerStartGeneration');
    await trigger({ jobId, jobData });
};

export const triggerFinalizePublish = async (jobId: string, jobData: any) => {
    const { answerlatticeFunctions } = await import('./answerlatticeFirebaseClient');
    const trigger = httpsCallable(answerlatticeFunctions, 'dev_triggerFinalizePublish');
    await trigger({ jobId, jobData });
};
