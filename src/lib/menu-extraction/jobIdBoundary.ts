import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const MENU_EXTRACTION_JOB_ID_PATTERN = /^[A-Za-z0-9]{20}$/;

export function normalizeMenuExtractionJobId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const documentId = value.trim();
    return documentId === value
        && MENU_EXTRACTION_JOB_ID_PATTERN.test(documentId)
        && isValidFirestoreDocumentId(documentId)
        ? documentId
        : null;
}
