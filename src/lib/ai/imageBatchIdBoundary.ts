import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const IMAGE_BATCH_JOB_ID_PATTERN = /^[A-Za-z0-9]{20}$/;
export const IMAGE_BATCH_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/;
const IMAGE_BATCH_PROJECT_JOB_KEY_SEPARATOR = '::';

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
    const storeScope = normalizeImageBatchScopeDocumentId(parts[parts.length - 1]);
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

export function getImageBatchProjectJobKeyPrefix(projectId: unknown): string | null {
    const projectScope = normalizeImageBatchProjectId(projectId);
    return projectScope
        ? `${projectScope.projectId}${IMAGE_BATCH_PROJECT_JOB_KEY_SEPARATOR}`
        : null;
}

export function buildImageBatchProjectJobKey(
    projectId: unknown,
    createdAtIso: unknown,
    jobId: unknown,
): string | null {
    const prefix = getImageBatchProjectJobKeyPrefix(projectId);
    const normalizedJobId = normalizeImageBatchJobId(jobId);
    if (!prefix || !normalizedJobId || typeof createdAtIso !== 'string') return null;

    const createdAt = new Date(createdAtIso);
    if (!Number.isFinite(createdAt.getTime()) || createdAt.toISOString() !== createdAtIso) return null;

    return `${prefix}${createdAtIso}${IMAGE_BATCH_PROJECT_JOB_KEY_SEPARATOR}${normalizedJobId}`;
}

export function normalizeImageBatchProjectJobKey(
    value: unknown,
    projectId: unknown,
    jobId: unknown,
): string | null {
    const prefix = getImageBatchProjectJobKeyPrefix(projectId);
    const normalizedJobId = normalizeImageBatchJobId(jobId);
    if (!prefix || !normalizedJobId || typeof value !== 'string') return null;

    const suffix = `${IMAGE_BATCH_PROJECT_JOB_KEY_SEPARATOR}${normalizedJobId}`;
    if (!value.startsWith(prefix) || !value.endsWith(suffix)) return null;
    const createdAtIso = value.slice(prefix.length, -suffix.length);
    const expected = buildImageBatchProjectJobKey(projectId, createdAtIso, normalizedJobId);
    return expected === value ? value : null;
}
