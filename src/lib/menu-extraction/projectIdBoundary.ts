import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const MENU_EXTRACTION_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/;

export function normalizeMenuExtractionProjectId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const documentId = value.trim();
    return documentId === value
        && MENU_EXTRACTION_PROJECT_ID_PATTERN.test(documentId)
        && isValidFirestoreDocumentId(documentId)
        ? documentId
        : null;
}

export function isMenuExtractionProjectIdInScope(
    value: unknown,
    tenantId: unknown,
    storeId: unknown,
): boolean {
    const projectId = normalizeMenuExtractionProjectId(value);
    const normalizedTenantId = typeof tenantId === 'string' ? tenantId.trim() : '';
    const normalizedStoreId = typeof storeId === 'string' ? storeId.trim() : '';
    if (
        !projectId
        || !normalizedTenantId
        || !normalizedStoreId
        || normalizedTenantId !== tenantId
        || normalizedStoreId !== storeId
    ) return false;

    const prefix = `${normalizedTenantId}-`;
    const suffix = `-${normalizedStoreId}`;
    return projectId.startsWith(prefix)
        && projectId.endsWith(suffix)
        && projectId.length > prefix.length + suffix.length;
}
