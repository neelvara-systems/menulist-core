import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES = 2 * 1024 * 1024;
export const LINKED_OUTLET_SAVE_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

export type LinkedOutletSaveResponse = {
    project: Record<string, any>;
    success: true;
};

const isRecord = (value: unknown): value is Record<string, any> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

export const isLinkedOutletSaveResponse = (
    data: unknown,
    expectedProjectId: unknown,
    expectedMasterProjectId: unknown,
): data is LinkedOutletSaveResponse => (
    isRecord(data)
    && data.success === true
    && isRecord(data.project)
    && data.project.projectId === expectedProjectId
    && data.project.masterProjectId === expectedMasterProjectId
);

export const readLinkedOutletSaveResponseJson = async (response: Response): Promise<unknown> => (
    readJsonResponseWithLimit<unknown>(
        response,
        LINKED_OUTLET_SAVE_RESPONSE_JSON_MAX_BYTES,
    )
);
