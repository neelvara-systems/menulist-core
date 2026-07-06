import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const BILLING_SUBSCRIPTION_DOCUMENT_ID_MAX_LENGTH = 180;

export function normalizeBillingSubscriptionDocumentId(value: unknown): string | null {
    const rawDocumentId = typeof value === 'string' ? value : '';
    const documentId = rawDocumentId.trim();
    if (!documentId || documentId.length > BILLING_SUBSCRIPTION_DOCUMENT_ID_MAX_LENGTH) return null;
    return documentId === rawDocumentId && isValidFirestoreDocumentId(documentId) ? documentId : null;
}
