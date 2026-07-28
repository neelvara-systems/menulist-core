import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";

type OutletSessionDocumentId = {
    value: string | number;
    documentId: string;
};

export type OutletSessionScope = {
    tenantId: string | number;
    storeId: string | number;
    tenantDocumentId: string;
    storeDocumentId: string;
};

export function normalizeOutletDocumentId(value: unknown): string | null {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

function normalizeOutletSessionDocumentId(value: unknown): OutletSessionDocumentId | null {
    const typedValue = typeof value === "string" || typeof value === "number" ? value : null;
    const documentId = normalizeOutletDocumentId(typedValue);
    return typedValue !== null && documentId ? { value: typedValue, documentId } : null;
}

function normalizeOutletSessionDocumentIdAliases(values: unknown[]): OutletSessionDocumentId | null {
    const supplied = values.filter((value) => value !== undefined && value !== null);
    if (supplied.length === 0) return null;
    const normalized = supplied.map(normalizeOutletSessionDocumentId);
    const [first] = normalized;
    return first && normalized.every((value) => value?.documentId === first.documentId)
        ? first
        : null;
}

export function getOutletSessionScope(session: unknown): OutletSessionScope | null {
    if (!session || typeof session !== "object" || Array.isArray(session)) return null;
    const source = session as {
        sId?: unknown;
        tId?: unknown;
        user?: { storeId?: unknown; tenantId?: unknown } | null;
    };
    const tenantId = normalizeOutletSessionDocumentIdAliases([
        source.tId,
        source.user?.tenantId,
    ]);
    const storeId = normalizeOutletSessionDocumentIdAliases([
        source.sId,
        source.user?.storeId,
    ]);
    return tenantId && storeId
        ? {
            tenantId: tenantId.value,
            storeId: storeId.value,
            tenantDocumentId: tenantId.documentId,
            storeDocumentId: storeId.documentId,
        }
        : null;
}
