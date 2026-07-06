import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export function normalizeAnswerlatticeSupportBoardCardId(value: unknown): string | null {
    const cardId = typeof value === 'string' ? value.trim() : '';
    return isValidFirestoreDocumentId(cardId) ? cardId : null;
}
