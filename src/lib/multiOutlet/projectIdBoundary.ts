import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";

export const MULTI_OUTLET_PROJECT_ID_PATTERN = /^[A-Za-z0-9_-]{3,160}$/;
const MULTI_OUTLET_NUMERIC_DOCUMENT_ID_PATTERN = /^[1-9]\d*$/;

export type MultiOutletNumericDocumentId = {
    documentId: string;
    numericId: number;
};

export type MultiOutletProjectIdScope = {
    projectId: string;
    tenantDocumentId: string;
    storeDocumentId: string;
    tId: number;
    sId: number;
};

export function normalizeMultiOutletNumericDocumentId(value: unknown): MultiOutletNumericDocumentId | null {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    if (
        documentId !== raw
        || !MULTI_OUTLET_NUMERIC_DOCUMENT_ID_PATTERN.test(documentId)
        || !isValidFirestoreDocumentId(documentId)
    ) {
        return null;
    }

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { documentId, numericId }
        : null;
}

export function normalizeMultiOutletProjectId(value: unknown): MultiOutletProjectIdScope | null {
    if (typeof value !== "string") return null;
    const projectId = value.trim();
    if (
        projectId !== value
        || !MULTI_OUTLET_PROJECT_ID_PATTERN.test(projectId)
        || !isValidFirestoreDocumentId(projectId)
    ) {
        return null;
    }

    const parts = projectId.split("-");
    if (parts.length < 3) return null;

    const tenantScope = normalizeMultiOutletNumericDocumentId(parts[0]);
    const storeScope = normalizeMultiOutletNumericDocumentId(parts[parts.length - 1]);
    if (!tenantScope || !storeScope) return null;

    return {
        projectId,
        tenantDocumentId: tenantScope.documentId,
        storeDocumentId: storeScope.documentId,
        tId: tenantScope.numericId,
        sId: storeScope.numericId,
    };
}
