import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_KNOWLEDGE_INTAKE_JOB_ID_PATTERN = /^[A-Za-z0-9]{20}$/;
export const ANSWERLATTICE_KNOWLEDGE_INTAKE_SOURCE_ID_PATTERN = /^kis_[a-f0-9]{28}$/;
export const ANSWERLATTICE_KNOWLEDGE_INTAKE_REVIEW_ITEM_ID_PATTERN = /^kii_[a-f0-9]{28}$/;

function normalizePatternedFirestoreId(value: unknown, pattern: RegExp): string | null {
    if (typeof value !== 'string') return null;
    const documentId = value.trim();
    return pattern.test(documentId) && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export function normalizeAnswerlatticeKnowledgeIntakeJobId(value: unknown): string | null {
    return normalizePatternedFirestoreId(value, ANSWERLATTICE_KNOWLEDGE_INTAKE_JOB_ID_PATTERN);
}

export function normalizeAnswerlatticeKnowledgeIntakeSourceId(value: unknown): string | null {
    return normalizePatternedFirestoreId(value, ANSWERLATTICE_KNOWLEDGE_INTAKE_SOURCE_ID_PATTERN);
}

export function normalizeAnswerlatticeKnowledgeIntakeReviewItemId(value: unknown): string | null {
    return normalizePatternedFirestoreId(value, ANSWERLATTICE_KNOWLEDGE_INTAKE_REVIEW_ITEM_ID_PATTERN);
}
