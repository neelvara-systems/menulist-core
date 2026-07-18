import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export type StorePermissionScopeDocumentId = {
    numericId: number;
    documentId: string;
};

export function normalizeStorePermissionScopeDocumentId(
    value: unknown,
): StorePermissionScopeDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}
