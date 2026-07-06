import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const BILLING_TOPUP_DOCUMENT_ID_MAX_LENGTH = 180;

const RAZORPAY_ORDER_DOCUMENT_ID_PATTERN = /^order_[a-zA-Z0-9]+$/;

export type BillingTopupScopeDocumentId = {
    numericId: number;
    documentId: string;
};

export function normalizeBillingTopupDocumentId(value: unknown): string | null {
    const documentId = typeof value === 'string' ? value.trim() : '';
    if (
        !documentId
        || documentId.length > BILLING_TOPUP_DOCUMENT_ID_MAX_LENGTH
        || !RAZORPAY_ORDER_DOCUMENT_ID_PATTERN.test(documentId)
    ) {
        return null;
    }

    return isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export function normalizeBillingTopupScopeDocumentId(value: unknown): BillingTopupScopeDocumentId | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
}
