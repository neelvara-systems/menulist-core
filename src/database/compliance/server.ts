import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { unstable_cache } from "next/cache";

const COLLECTION = DB_COLLECTIONS.COMPLIANCE_PAGES;

export interface ComplianceOverrideDocServer {
    sId: string | number;
    tId: string | number;
    privacyOverride?: string;
    termsOverride?: string;
    refundOverride?: string;
    modifiedOn: admin.firestore.Timestamp;
}

function normalizeComplianceStoreDocumentId(value: unknown): string | null {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

const getComplianceDocRefServer = (sId: string | number) => {
    const documentId = normalizeComplianceStoreDocumentId(sId);
    if (!documentId) {
        throw new Error("invalid_compliance_store_id");
    }
    return firestoreAdmin.collection(COLLECTION).doc(documentId);
};

export const getComplianceCacheTag = (sId: string | number): string => {
    const documentId = normalizeComplianceStoreDocumentId(sId);
    if (!documentId) throw new Error("invalid_compliance_store_id");
    return `compliance-store-${documentId}`;
};

export async function getComplianceOverridesServer(
    sId: string | number,
): Promise<ComplianceOverrideDocServer | null> {
    const docSnap = await getComplianceDocRefServer(sId).get();
    if (!docSnap.exists) return null;
    return docSnap.data() as ComplianceOverrideDocServer;
}

export async function getCachedComplianceOverridesServer(
    sId: string | number,
): Promise<ComplianceOverrideDocServer | null> {
    const documentId = normalizeComplianceStoreDocumentId(sId);
    if (!documentId) throw new Error("invalid_compliance_store_id");
    const readCachedOverrides = unstable_cache(
        () => getComplianceOverridesServer(documentId),
        ['public-compliance-overrides', documentId],
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
    const fieldMap: Record<string, string> = {
        privacy: "privacyOverride",
        terms: "termsOverride",
        refund: "refundOverride",
    };

    await getComplianceDocRefServer(sId).set({
        sId,
        tId,
        [fieldMap[type]]: content,
        modifiedOn: admin.firestore.Timestamp.now(),
    }, { merge: true });
}

export async function deleteComplianceOverrideServer(
    sId: string | number,
    type: "privacy" | "terms" | "refund",
): Promise<void> {
    const fieldMap: Record<string, string> = {
        privacy: "privacyOverride",
        terms: "termsOverride",
        refund: "refundOverride",
    };

    await getComplianceDocRefServer(sId).set({
        [fieldMap[type]]: admin.firestore.FieldValue.delete(),
        modifiedOn: admin.firestore.Timestamp.now(),
    }, { merge: true });
}
