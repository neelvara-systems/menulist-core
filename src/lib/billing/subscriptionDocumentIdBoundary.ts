import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const BILLING_SUBSCRIPTION_DOCUMENT_ID_MAX_LENGTH = 180;

export function normalizeBillingSubscriptionDocumentId(value: unknown): string | null {
    const rawDocumentId = typeof value === 'string' ? value : '';
    const documentId = rawDocumentId.trim();
    if (!documentId || documentId.length > BILLING_SUBSCRIPTION_DOCUMENT_ID_MAX_LENGTH) return null;
    return documentId === rawDocumentId && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export type BillingSubscriptionScopeDocumentId = {
    numericId: number;
    documentId: string;
};

export function normalizeBillingSubscriptionScopeDocumentId(value: unknown): BillingSubscriptionScopeDocumentId | null {
    const rawDocumentId = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = rawDocumentId.trim();
    if (documentId !== rawDocumentId || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}
