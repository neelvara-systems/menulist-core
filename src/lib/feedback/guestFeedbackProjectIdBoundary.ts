import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const GUEST_FEEDBACK_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;

export type GuestFeedbackNumericDocumentId = {
    numericId: number;
    documentId: string;
};

export function normalizeGuestFeedbackProjectId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const documentId = value.trim();
    return documentId === value
        && GUEST_FEEDBACK_PROJECT_ID_PATTERN.test(documentId)
        && isValidFirestoreDocumentId(documentId)
        ? documentId
        : null;
}

export function normalizeGuestFeedbackNumericDocumentId(value: unknown): GuestFeedbackNumericDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}
