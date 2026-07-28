import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { unstable_cache } from "next/cache";
import {
    type ComplianceOverrideField,
    type ProjectedComplianceOverride,
    projectComplianceOverride,
} from "./complianceOverrideBoundary";

const COLLECTION = DB_COLLECTIONS.COMPLIANCE_PAGES;

export type ComplianceOverrideDocServer = ProjectedComplianceOverride;

function normalizeComplianceStoreDocumentId(value: unknown): string | null {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

function requireComplianceDocumentId(value: unknown): string {
    const documentId = normalizeComplianceStoreDocumentId(value);
    if (!documentId) throw new Error("invalid_compliance_store_id");
    return documentId;
}

const getComplianceDocRefServer = (sId: string | number) => {
    const documentId = requireComplianceDocumentId(sId);
    return firestoreAdmin.collection(COLLECTION).doc(documentId);
};

export const getComplianceCacheTag = (sId: string | number): string => {
    const documentId = normalizeComplianceStoreDocumentId(sId);
    if (!documentId) throw new Error("invalid_compliance_store_id");
    return `compliance-store-${documentId}`;
};

export async function getComplianceOverridesServer(
    sId: string | number,
    tId: string | number,
): Promise<ComplianceOverrideDocServer | null> {
    const documentId = requireComplianceDocumentId(sId);
    const tenantId = requireComplianceDocumentId(tId);
    const docSnap = await getComplianceDocRefServer(documentId).get();
    if (!docSnap.exists) return null;
    const projected = projectComplianceOverride(docSnap.data(), documentId, tenantId);
    if (!projected) throw new Error("invalid_compliance_override_document");
    return projected;
}

export async function getCachedComplianceOverridesServer(
    sId: string | number,
    tId: string | number,
): Promise<ComplianceOverrideDocServer | null> {
    const documentId = requireComplianceDocumentId(sId);
    const tenantId = requireComplianceDocumentId(tId);
    const readCachedOverrides = unstable_cache(
        () => getComplianceOverridesServer(documentId, tenantId),
        ['public-compliance-overrides', tenantId, documentId],
        { revalidate: 60, tags: [getComplianceCacheTag(documentId)] },
    );
    return readCachedOverrides();
}

export async function saveComplianceOverrideServer(
    sId: string | number,
    tId: string | number,
    type: "privacy" | "terms" | "refund",
    content: string,
): Promise<void> {
    const fieldMap: Record<typeof type, ComplianceOverrideField> = {
        privacy: "privacyOverride",
        terms: "termsOverride",
        refund: "refundOverride",
    };

    const documentId = requireComplianceDocumentId(sId);
    const tenantId = requireComplianceDocumentId(tId);
    const ref = getComplianceDocRefServer(documentId);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        if (
            current.exists
            && !projectComplianceOverride(current.data(), documentId, tenantId)
        ) {
            throw new Error("invalid_compliance_override_document");
        }
        transaction.set(ref, {
            sId: documentId,
            tId: tenantId,
            [fieldMap[type]]: content,
            modifiedOn: admin.firestore.Timestamp.now(),
        }, { merge: true });
    });
}

export async function deleteComplianceOverrideServer(
    sId: string | number,
    tId: string | number,
    type: "privacy" | "terms" | "refund",
): Promise<void> {
    const fieldMap: Record<typeof type, ComplianceOverrideField> = {
        privacy: "privacyOverride",
        terms: "termsOverride",
        refund: "refundOverride",
    };

    const documentId = requireComplianceDocumentId(sId);
    const tenantId = requireComplianceDocumentId(tId);
    const ref = getComplianceDocRefServer(documentId);
    await firestoreAdmin.runTransaction(async (transaction) => {
        const current = await transaction.get(ref);
        if (!current.exists) return;
        if (!projectComplianceOverride(current.data(), documentId, tenantId)) {
            throw new Error("invalid_compliance_override_document");
        }
        transaction.update(ref, {
            [fieldMap[type]]: admin.firestore.FieldValue.delete(),
            modifiedOn: admin.firestore.Timestamp.now(),
        });
    });
}
