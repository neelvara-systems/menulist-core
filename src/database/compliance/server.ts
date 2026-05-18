import { DB_COLLECTIONS } from "@constant/database";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";

const COLLECTION = DB_COLLECTIONS.COMPLIANCE_PAGES;

export interface ComplianceOverrideDocServer {
    sId: number;
    tId: number;
    privacyOverride?: string;
    termsOverride?: string;
    refundOverride?: string;
    modifiedOn: admin.firestore.Timestamp;
}

const getComplianceDocRefServer = (sId: number) => (
    firestoreAdmin.collection(COLLECTION).doc(String(sId))
);

export async function getComplianceOverridesServer(
    sId: number,
): Promise<ComplianceOverrideDocServer | null> {
    const docSnap = await getComplianceDocRefServer(sId).get();
    if (!docSnap.exists) return null;
    return docSnap.data() as ComplianceOverrideDocServer;
}

export async function saveComplianceOverrideServer(
    sId: number,
    tId: number,
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
    sId: number,
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
