import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const SIGNALDESK_DOCUMENT_ID_MAX_LENGTH = 180;

export function normalizeSignalDeskDocumentId(
    value: unknown,
    maxLength = SIGNALDESK_DOCUMENT_ID_MAX_LENGTH,
): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (
        !normalized
        || normalized !== value
        || normalized.length > maxLength
        || !isValidFirestoreDocumentId(normalized)
    ) return null;
    return normalized;
}
