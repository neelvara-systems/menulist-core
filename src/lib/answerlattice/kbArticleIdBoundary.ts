import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH = 180;

export function normalizeAnswerlatticeKbArticleId(value: unknown): string | null {
    const articleId = typeof value === 'string' ? value.trim() : '';
    if (!articleId || articleId.length > ANSWERLATTICE_KB_ARTICLE_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(articleId) ? articleId : null;
}
