import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

const isUnknownRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeSessionUserDocumentId = (value: unknown): string | null => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
};

export const resolveCurrentSessionUserDocumentId = (session: unknown): string | null => {
    if (!isUnknownRecord(session)) return null;
    const sessionUser = isUnknownRecord(session.user) ? session.user : {};
    const supplied = [session.uId, sessionUser.id]
        .filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return null;

    const normalized = supplied.map(normalizeSessionUserDocumentId);
    const [first] = normalized;
    return first && normalized.every((documentId) => documentId === first)
        ? first
        : null;
};
