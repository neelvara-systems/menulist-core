export const ANSWERLATTICE_FUNCTION_ENTITY_ID_MAX_LENGTH = 180;
export const ANSWERLATTICE_UNRESOLVED_ENTITY_ID = 'unresolved';

export function normalizeAnswerlatticeFunctionEntityId(value: unknown): string | null {
    const entityId = typeof value === 'string' ? value.trim() : '';
    if (
        !entityId
        || entityId.length > ANSWERLATTICE_FUNCTION_ENTITY_ID_MAX_LENGTH
        || entityId === '.'
        || entityId === '..'
        || entityId.includes('/')
        || /^__.*__$/.test(entityId)
    ) {
        return null;
    }

    return entityId;
}

export function normalizeAnswerlatticeResolvedFunctionEntityId(value: unknown): string | null {
    const entityId = normalizeAnswerlatticeFunctionEntityId(value);
    return entityId && entityId !== ANSWERLATTICE_UNRESOLVED_ENTITY_ID ? entityId : null;
}
