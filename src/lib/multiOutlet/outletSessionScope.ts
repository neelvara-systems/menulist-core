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

export function getOutletSessionScope(session: any): OutletSessionScope | null {
    const tenantId = normalizeOutletSessionDocumentId(session?.tId);
    const storeId = normalizeOutletSessionDocumentId(session?.sId);
    return tenantId && storeId
        ? {
            tenantId: tenantId.value,
            storeId: storeId.value,
            tenantDocumentId: tenantId.documentId,
            storeDocumentId: storeId.documentId,
        }
        : null;
}
