import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_SEARCH_HISTORY_ID_MAX_LENGTH = 180;

export function normalizeAnswerlatticeSearchHistoryId(value: unknown): string | null {
    const searchHistoryId = typeof value === 'string' ? value.trim() : '';
    if (!searchHistoryId || searchHistoryId.length > ANSWERLATTICE_SEARCH_HISTORY_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(searchHistoryId) ? searchHistoryId : null;
}
