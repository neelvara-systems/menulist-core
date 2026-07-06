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
