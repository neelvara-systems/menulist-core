import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const IMAGE_BATCH_JOB_ID_PATTERN = /^[A-Za-z0-9]{20}$/;
export const IMAGE_BATCH_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/;

export type ImageBatchProjectScope = {
    projectId: string;
    sId: string;
    storeId: number;
    tId: string;
    tenantId: number;
};

export function normalizeImageBatchScopeDocumentId(value: unknown): { documentId: string; numericId: number } | null {
    if (typeof value !== 'string') return null;
    const documentId = value.trim();
    if (documentId !== value || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    if (!Number.isSafeInteger(numericId) || numericId <= 0 || String(numericId) !== documentId) {
        return null;
    }

    return { documentId, numericId };
}

export function normalizeImageBatchProjectId(value: unknown): ImageBatchProjectScope | null {
    if (typeof value !== 'string') return null;
    const projectId = value.trim();
    if (
        projectId !== value
        || !IMAGE_BATCH_PROJECT_ID_PATTERN.test(projectId)
        || !isValidFirestoreDocumentId(projectId)
    ) {
        return null;
    }

    const parts = projectId.split('-');
    if (parts.length < 3) return null;

    const tenantScope = normalizeImageBatchScopeDocumentId(parts[0]);
    const storeScope = normalizeImageBatchScopeDocumentId(parts[2]);
    if (!tenantScope || !storeScope) return null;

    return {
        projectId,
        sId: storeScope.documentId,
        storeId: storeScope.numericId,
        tId: tenantScope.documentId,
        tenantId: tenantScope.numericId,
    };
}

export function normalizeImageBatchJobId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const documentId = value.trim();
    return documentId === value
        && IMAGE_BATCH_JOB_ID_PATTERN.test(documentId)
        && isValidFirestoreDocumentId(documentId)
        ? documentId
        : null;
}
