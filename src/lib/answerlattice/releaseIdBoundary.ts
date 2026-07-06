import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export function normalizeAnswerlatticeReleaseId(value: unknown): string | null {
    const releaseId = typeof value === 'string' ? value.trim() : '';
    return isValidFirestoreDocumentId(releaseId) ? releaseId : null;
}
