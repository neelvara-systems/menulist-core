type CreativeEditorDraftStorageScope = {
    documentId: unknown;
    productId: unknown;
    sourceLabel: unknown;
    workspaceId?: unknown;
};

const normalizeDraftKeySegment = (
    value: unknown,
    maxLength: number,
): string | null => {
    if (typeof value !== 'string') return null;
    if (
        value.length < 1
        || value.length > maxLength
        || value !== value.trim()
        || /[\u0000-\u001f\u007f]/.test(value)
    ) {
        return null;
    }
    return value;
};

export const getCreativeEditorDraftStorageKey = (
    scope: CreativeEditorDraftStorageScope,
): string | null => {
    const documentId = normalizeDraftKeySegment(scope.documentId, 160);
    const productId = normalizeDraftKeySegment(scope.productId, 80);
    const sourceLabel = normalizeDraftKeySegment(scope.sourceLabel, 160);
    const workspaceId = scope.workspaceId === undefined || scope.workspaceId === null
        ? '_'
        : normalizeDraftKeySegment(scope.workspaceId, 160);

    if (!documentId || !productId || !sourceLabel || !workspaceId) return null;

    return `creative-editor-draft:v2:${[
        productId,
        workspaceId,
        sourceLabel,
        documentId,
    ].map(encodeURIComponent).join(':')}`;
};
