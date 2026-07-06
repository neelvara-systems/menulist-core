import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";

export type PosSyncNumericDocumentId = {
    numericId: number;
    documentId: string;
};

export function normalizePosSyncNumericDocumentId(value: unknown): PosSyncNumericDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}
