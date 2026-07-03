'use client';

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { getBoundedMenuProcessingStringContext, getMenuProcessingJobLogContext, logMenuProcessingFailure } from '@lib/firebase/menuProcessingDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
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

const MENU_LINK_IMPORT_FAILED_MESSAGE = 'We could not read this menu link. Upload a photo/PDF or add the menu manually.';
const MENU_LINK_IMPORT_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const MENU_LINK_IMPORT_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type MenuLinkImportResponse = {
    success?: boolean;
    jobId?: unknown;
    projectId?: unknown;
    reusedExistingJob?: unknown;
};

class MenuLinkImportOwnerError extends Error {
    constructor() {
        super(MENU_LINK_IMPORT_FAILED_MESSAGE);
        this.name = 'MenuLinkImportOwnerError';
    }
}

const isNonEmptyString = (value: unknown): value is string => (
    typeof value === 'string' && value.trim().length > 0
);

const getMenuLinkImportClientLogContext = (input: CreateMenuLinkImportJobInput) => ({
    ...getBoundedMenuProcessingStringContext('projectId', input.projectId),
    ...getBoundedMenuProcessingStringContext('url', input.url),
    permissionConfirmed: Boolean(input.permissionConfirmed),
});

const createMenuLinkImportStatusError = (code: string, status: number) => {
    const error = new Error(code) as Error & { code?: string; status?: number };
    error.code = code;
    error.status = status;
    return error;
};

async function readMenuLinkImportResponseJson(
    response: Response,
    input: CreateMenuLinkImportJobInput,
): Promise<{ payload: MenuLinkImportResponse | null; parseFailed: boolean }> {
    try {
        return {
            payload: await readJsonResponseWithLimit<MenuLinkImportResponse>(
                response,
                MENU_LINK_IMPORT_RESPONSE_JSON_MAX_BYTES,
            ),
            parseFailed: false,
        };
    } catch (error) {
        logMenuProcessingFailure('menu_link_import_response_parse_failed', error, {
            ...getMenuLinkImportClientLogContext(input),
            responseOk: response.ok,
            responseStatus: response.status,
            maxBytes: MENU_LINK_IMPORT_RESPONSE_JSON_MAX_BYTES,
        });
        return { payload: null, parseFailed: true };
    }
}

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
        logMenuProcessingFailure('menu_link_import_dev_trigger_failed', error, {
            ...getMenuProcessingJobLogContext(jobId),
            ...getBoundedMenuProcessingStringContext('nodeEnv', process.env.NODE_ENV),
            useEmulators: process.env.NEXT_PUBLIC_USE_EMULATORS === 'true',
        });
    }
}

export async function createMenuLinkImportJob(
    input: CreateMenuLinkImportJobInput,
): Promise<CreateMenuLinkImportJobResult> {
    try {
        const response = await fetch('/api/menu-link-imports', {
            ...MENU_LINK_IMPORT_REQUEST_POLICY,
            body: JSON.stringify(input),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
        });

        const { payload, parseFailed } = await readMenuLinkImportResponseJson(response, input);
        if (!response.ok) {
            const rejected = createMenuLinkImportStatusError('menu_link_import_request_rejected', response.status);
            logMenuProcessingFailure('menu_link_import_request_failed', rejected, {
                ...getMenuLinkImportClientLogContext(input),
            });
            throw new MenuLinkImportOwnerError();
        }

        if (parseFailed) {
            throw new MenuLinkImportOwnerError();
        }

        if (payload?.success !== true || !isNonEmptyString(payload.jobId)) {
            const invalid = createMenuLinkImportStatusError(
                'menu_link_import_response_invalid',
                response.status,
            );
            logMenuProcessingFailure('menu_link_import_response_invalid', invalid, {
                ...getMenuLinkImportClientLogContext(input),
                responseOk: response.ok,
                responseStatus: response.status,
                maxBytes: MENU_LINK_IMPORT_RESPONSE_JSON_MAX_BYTES,
                success: payload?.success === true,
                hasJobId: isNonEmptyString(payload?.jobId),
            });
            throw new MenuLinkImportOwnerError();
        }

        const result: CreateMenuLinkImportJobResult = {
            jobId: payload.jobId,
            projectId: isNonEmptyString(payload.projectId) ? payload.projectId : input.projectId,
            reusedExistingJob: Boolean(payload.reusedExistingJob),
        };

        if (!result.reusedExistingJob) {
            await maybeTriggerDevProcessing(result.jobId);
        }

        return result;
    } catch (error) {
        if (error instanceof MenuLinkImportOwnerError) {
            throw error;
        }
        logMenuProcessingFailure('menu_link_import_request_failed', error, {
            ...getMenuLinkImportClientLogContext(input),
        });
        throw new MenuLinkImportOwnerError();
    }
}
