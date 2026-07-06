import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export function normalizeAnswerlatticePredictiveTriggerId(value: unknown): string | null {
    const triggerId = typeof value === 'string' ? value.trim() : '';
    return isValidFirestoreDocumentId(triggerId) ? triggerId : null;
}
