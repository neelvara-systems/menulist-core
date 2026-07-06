import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_BILLING_DOCUMENT_ID_MAX_LENGTH = 180;

function normalizeAnswerlatticeBillingDocumentId(value: unknown): string | null {
    const documentId = typeof value === 'string' ? value.trim() : '';
    if (!documentId || documentId.length > ANSWERLATTICE_BILLING_DOCUMENT_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export function normalizeAnswerlatticeSubscriptionId(value: unknown): string | null {
    return normalizeAnswerlatticeBillingDocumentId(value);
}

export function normalizeAnswerlatticeIntakeUsageLedgerId(value: unknown): string | null {
    return normalizeAnswerlatticeBillingDocumentId(value);
}
