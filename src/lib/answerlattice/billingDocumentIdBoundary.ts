import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_BILLING_DOCUMENT_ID_MAX_LENGTH = 180;

function normalizeAnswerlatticeBillingDocumentId(value: unknown): string | null {
    const rawDocumentId = typeof value === 'string' ? value : '';
    const documentId = rawDocumentId.trim();
    if (
        documentId !== rawDocumentId
        || !documentId
        || documentId.length > ANSWERLATTICE_BILLING_DOCUMENT_ID_MAX_LENGTH
    ) return null;
    return isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export type AnswerlatticeBillingScopeDocumentId = {
    numericId: number;
    documentId: string;
};

export function normalizeAnswerlatticeBillingScopeDocumentId(value: unknown): AnswerlatticeBillingScopeDocumentId | null {
    const rawDocumentId = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = rawDocumentId.trim();
    if (documentId !== rawDocumentId || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}

export function normalizeAnswerlatticeSubscriptionId(value: unknown): string | null {
    return normalizeAnswerlatticeBillingDocumentId(value);
}

export function normalizeAnswerlatticeIntakeUsageLedgerId(value: unknown): string | null {
    return normalizeAnswerlatticeBillingDocumentId(value);
}
