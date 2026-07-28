import { normalizeStorePermissionScopeDocumentId } from "@lib/permissions/scopeDocumentId";

export type CreativeEditorTemplateScope = {
    sId: string;
    tId: string;
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => (
    Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

const resolveExactDocumentId = (values: unknown[]): string | null => {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return null;
    const normalized = supplied.map((value) => (
        normalizeStorePermissionScopeDocumentId(value)?.documentId || null
    ));
    const [first] = normalized;
    return first && normalized.every((documentId) => documentId === first)
        ? first
        : null;
};

const resolveScope = (source: UnknownRecord, nestedSource?: UnknownRecord): CreativeEditorTemplateScope | null => {
    const tId = resolveExactDocumentId([
        source.tId,
        source.tenantId,
        nestedSource?.tId,
        nestedSource?.tenantId,
    ]);
    const sId = resolveExactDocumentId([
        source.sId,
        source.storeId,
        nestedSource?.sId,
        nestedSource?.storeId,
    ]);
    return tId && sId ? { sId, tId } : null;
};

export const resolveCreativeEditorTemplateScopeBoundary = (input: {
    session?: unknown;
    storeDetails?: unknown;
}): CreativeEditorTemplateScope | null => {
    const storeDetails = isRecord(input.storeDetails) ? input.storeDetails : {};
    const hasSelectedStoreScope = [
        storeDetails.tId,
        storeDetails.tenantId,
        storeDetails.sId,
        storeDetails.storeId,
    ].some((value) => value !== undefined && value !== null);
    if (hasSelectedStoreScope) {
        return resolveScope(storeDetails);
    }

    const session = isRecord(input.session) ? input.session : {};
    const sessionUser = isRecord(session.user) ? session.user : {};
    return resolveScope(session, sessionUser);
};
