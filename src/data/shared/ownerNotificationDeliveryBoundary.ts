export const MAX_OWNER_NOTIFICATION_REFERENCE_ID_LENGTH = 240;
export const MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS = 2;

export type OwnerNotificationNumericScopeDocumentId = {
    numericId: number;
    documentId: string;
};

const RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN = /^__.*__$/;

export function normalizeOwnerNotificationDocumentId(value: unknown): string | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    if (
        !raw
        || raw !== raw.trim()
        || raw === '.'
        || raw === '..'
        || raw.includes('/')
        || raw.includes('\0')
        || RESERVED_FIRESTORE_DOCUMENT_ID_PATTERN.test(raw)
    ) return null;
    return raw;
}

export function normalizeOwnerNotificationNumericScopeDocumentId(
    value: unknown,
): OwnerNotificationNumericScopeDocumentId | null {
    const documentId = normalizeOwnerNotificationDocumentId(value);
    if (!documentId || !/^[1-9]\d*$/.test(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

export function normalizeOwnerNotificationReferenceId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    if (
        !value
        || value !== value.trim()
        || value.length > MAX_OWNER_NOTIFICATION_REFERENCE_ID_LENGTH
        || /[\u0000-\u001f\u007f]/.test(value)
    ) return null;
    return value;
}

export function getNextOwnerNotificationProcessingAttempt(
    status: unknown,
    currentAttempt: unknown,
): number | null {
    if (status !== 'pending' && status !== 'failed') return null;
    const normalizedAttempt = currentAttempt === undefined
        ? 0
        : typeof currentAttempt === 'number'
            && Number.isSafeInteger(currentAttempt)
            && currentAttempt >= 0
            ? currentAttempt
            : null;
    if (
        normalizedAttempt === null
        || normalizedAttempt >= MAX_OWNER_NOTIFICATION_PROCESSING_ATTEMPTS
    ) return null;
    return normalizedAttempt + 1;
}
