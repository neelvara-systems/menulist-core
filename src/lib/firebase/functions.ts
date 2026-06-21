'use client';

import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from './firebaseClient';

// MenuList Cloud Functions (menulist-qa locally/preview; menulist in production)
const functions = getFunctions(firebaseApp);

// Answerlattice Cloud Functions — answerlattice-qa locally/preview; answerlattice in production
export const regenerateEmbedding = async (articleId: string) => {
    const { answerlatticeFunctions } = await import('./answerlatticeFirebaseClient');
    const regenerateEmbeddingFn = httpsCallable(answerlatticeFunctions, 'regenerateEmbedding');
    try {
        const result = await regenerateEmbeddingFn({ articleId });
        return result.data;
    } catch (error) {
        console.error('Error calling regenerateEmbedding function:', error);
        throw new Error('Failed to trigger embedding regeneration.');
    }
};

export type PublishApprovedJobPayload = { jobId: string; finalCategories: any; }

export const publishApprovedJob = async (payload: PublishApprovedJobPayload) => {
    const { answerlatticeFunctions } = await import('./answerlatticeFirebaseClient');
    const publishApprovedJobFn = httpsCallable(answerlatticeFunctions, 'publishApprovedJobFn');
    try {
        const result = await publishApprovedJobFn(payload);
        return result.data;
    } catch (error) {
        console.error('Error calling publishApprovedJobFn function:', error);
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
}): Promise<any> => {
    try {
        const { FEATURE_FLAGS } = await import('@config/features');
        if (!FEATURE_FLAGS.ENABLE_MENU_HEALTH_MONITOR) return null;

        const verifyFn = httpsCallable(functions, 'verifyMenuPublish');
        const result = await verifyFn(payload);
        return result.data;
    } catch (error) {
        // Fire-and-forget — don't break publish flow
        console.warn('[verifyMenuPublish] Verification failed (non-blocking):', error);
        return null;
    }
};

export const triggerStartGeneration = async (jobId: string, jobData: any) => {
    const functions = getFunctions();
    // Make sure your client is connected to the emulator!
    const trigger = httpsCallable(functions, 'dev_triggerStartGeneration');
    await trigger({ jobId, jobData });
};

export const triggerFinalizePublish = async (jobId: string, jobData: any) => {
    const functions = getFunctions();
    // Make sure your client is connected to the emulator!
    const trigger = httpsCallable(functions, 'dev_triggerFinalizePublish');
    await trigger({ jobId, jobData });
};
