import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_ENTITY_CANDIDATE_ID_MAX_LENGTH = 180;

export function normalizeAnswerlatticeEntityCandidateId(value: unknown): string | null {
    const candidateId = typeof value === 'string' ? value.trim() : '';
    if (!candidateId || candidateId.length > ANSWERLATTICE_ENTITY_CANDIDATE_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(candidateId) ? candidateId : null;
}
