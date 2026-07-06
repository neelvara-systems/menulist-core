import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_FAQ_ID_MAX_LENGTH = 180;

export function normalizeAnswerlatticeFaqId(value: unknown): string | null {
    const faqId = typeof value === 'string' ? value.trim() : '';
    if (!faqId || faqId.length > ANSWERLATTICE_FAQ_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(faqId) ? faqId : null;
}
