import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';

export const ANSWERLATTICE_GOVERNANCE_DOCUMENT_ID_MAX_LENGTH = 180;
export const ANSWERLATTICE_UNRESOLVED_ENTITY_ID = 'unresolved';

function normalizeAnswerlatticeGovernanceDocumentId(value: unknown): string | null {
    const documentId = typeof value === 'string' ? value.trim() : '';
    if (!documentId || documentId.length > ANSWERLATTICE_GOVERNANCE_DOCUMENT_ID_MAX_LENGTH) return null;
    return isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export function normalizeAnswerlatticeMutationProposalId(value: unknown): string | null {
    return normalizeAnswerlatticeGovernanceDocumentId(value);
}

export function normalizeAnswerlatticeEntityId(value: unknown): string | null {
    return normalizeAnswerlatticeGovernanceDocumentId(value);
}

export function normalizeAnswerlatticeEntityRelationId(value: unknown): string | null {
    return normalizeAnswerlatticeGovernanceDocumentId(value);
}

export function normalizeAnswerlatticeEntitySearchIndexId(value: unknown): string | null {
    return normalizeAnswerlatticeGovernanceDocumentId(value);
}

export function normalizeAnswerlatticeResolvedEntityId(value: unknown): string | null {
    const entityId = normalizeAnswerlatticeEntityId(value);
    return entityId && entityId !== ANSWERLATTICE_UNRESOLVED_ENTITY_ID ? entityId : null;
}

export function normalizeAnswerlatticeResolvedEntityIds(values: unknown, maxItems: number): string[] {
    const raw = typeof values === 'string'
        ? values.split(/[\n,]/)
        : Array.isArray(values) ? values : [];

    return Array.from(new Set(
        raw
            .map(value => normalizeAnswerlatticeResolvedEntityId(value))
            .filter((value): value is string => Boolean(value))
    )).slice(0, maxItems);
}

export function replaceAnswerlatticeResolvedEntityReference(
    values: unknown,
    mergedId: unknown,
    survivorId: unknown,
    maxItems: number,
): string[] | null {
    if (!Array.isArray(values) || !Number.isInteger(maxItems) || maxItems < 1) return null;
    const normalizedMergedId = normalizeAnswerlatticeResolvedEntityId(mergedId);
    const normalizedSurvivorId = normalizeAnswerlatticeResolvedEntityId(survivorId);
    if (!normalizedMergedId || !normalizedSurvivorId || normalizedMergedId === normalizedSurvivorId) return null;

    const normalizedValues = normalizeAnswerlatticeResolvedEntityIds(values, maxItems);
    if (normalizedValues.length !== values.length || !normalizedValues.includes(normalizedMergedId)) return null;

    return Array.from(new Set(
        normalizedValues.map(entityId => entityId === normalizedMergedId ? normalizedSurvivorId : entityId),
    ));
}

export function normalizeAnswerlatticeCanonicalAnswerId(value: unknown): string | null {
    return normalizeAnswerlatticeGovernanceDocumentId(value);
}
