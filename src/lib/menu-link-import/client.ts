'use client';

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

export type CreateMenuLinkImportJobInput = {
    permissionConfirmed: boolean;
    projectId: string;
    url: string;
};

export type CreateMenuLinkImportJobResult = {
    jobId: string;
    projectId: string;
    reusedExistingJob?: boolean;
};

async function maybeTriggerDevProcessing(jobId: string) {
    if (process.env.NODE_ENV !== 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS !== 'true') {
        return;
    }

    try {
        const jobSnap = await getDoc(doc(firebaseClient, DB_COLLECTIONS.MENU_IMAGE_PROCESSING_JOBS, jobId));
        if (!jobSnap.exists()) return;
        const triggerFn = httpsCallable(getFunctions(), 'dev_triggerProcessMenuImages');
        await triggerFn({
            jobId,
            jobData: {
                ...jobSnap.data(),
                id: jobId,
            },
        });
    } catch (error) {
        console.warn('[MenuLinkImport] Dev trigger failed; job was created and may need manual processing.', error);
    }
}

export async function createMenuLinkImportJob(
    input: CreateMenuLinkImportJobInput,
): Promise<CreateMenuLinkImportJobResult> {
    const response = await fetch('/api/menu-link-imports', {
        body: JSON.stringify(input),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'We could not read this menu link. Upload a photo/PDF or add the menu manually.');
    }

    const result: CreateMenuLinkImportJobResult = {
        jobId: payload.jobId,
        projectId: payload.projectId || input.projectId,
        reusedExistingJob: Boolean(payload.reusedExistingJob),
    };

    if (!result.reusedExistingJob) {
        await maybeTriggerDevProcessing(result.jobId);
    }

    return result;
}

