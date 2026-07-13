import { DB_COLLECTIONS } from "@constant/database";
import { GROWTHOS_SUMMARY_DOC_PREFIX } from "@constant/growthos";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import type {
    GrowthOSExportMethod,
    GrowthOSKit,
    GrowthOSKitStatus,
    GrowthOSOutput,
    GrowthOSSummaryDocument,
} from "@type/growthos";

const summaryDocId = (storeDocumentId: string) => `${GROWTHOS_SUMMARY_DOC_PREFIX}_${storeDocumentId}`;

function normalizeGrowthOSDocumentId(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const documentId = value.trim();
    return isValidFirestoreDocumentId(documentId) ? documentId : null;
}

function normalizeGrowthOSScopeDocumentId(value: unknown): string | null {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

function requireGrowthOSDocumentId(value: unknown, label: string): string {
    const documentId = normalizeGrowthOSDocumentId(value);
    if (!documentId) throw new Error(`Invalid GrowthOS ${label} ID`);
    return documentId;
}

function requireGrowthOSScopeDocumentId(value: unknown, label: string): string {
    const documentId = normalizeGrowthOSScopeDocumentId(value);
    if (!documentId) throw new Error(`Invalid GrowthOS ${label} ID`);
    return documentId;
}

const sanitizeForAdminFirestore = (value: any): any => {
    return sanitizeForFirestore(value, {
        dateTransform: (date) => admin.firestore.Timestamp.fromDate(date),
        atomicTransform: (atomicValue) => (
            typeof (atomicValue as { toDate?: unknown }).toDate === "function"
            && typeof (atomicValue as { seconds?: unknown }).seconds === "number"
        ) ? {
            handled: true,
            value: admin.firestore.Timestamp.fromDate((atomicValue as { toDate: () => Date }).toDate()),
        } : { handled: false },
    });
};

export const toGrowthOSAdminTimestamp = (date: Date) => admin.firestore.Timestamp.fromDate(date);

export async function readGrowthOSStoreDataServer(storeId: string | number): Promise<any | null> {
    const storeDocumentId = normalizeGrowthOSScopeDocumentId(storeId);
    if (!storeDocumentId) return null;

    const snap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId).get();
    if (!snap.exists) return null;
    return snap.data();
}

function legacyProjectBelongsToSession(params: {
    projectData: any;
    projectId: string;
    sId: string | number;
    tId: string | number;
}): boolean {
    const expectedTenantId = String(params.tId);
    const expectedStoreId = String(params.sId);
    const projectTenantId = params.projectData?.tId ?? params.projectData?.tenantId;
    const projectStoreId = params.projectData?.sId ?? params.projectData?.storeId;

    if (projectTenantId != null && String(projectTenantId) !== expectedTenantId) return false;
    if (projectStoreId != null && String(projectStoreId) !== expectedStoreId) return false;
    if (projectTenantId != null && projectStoreId != null) return true;

    const projectId = String(params.projectData?.projectId || params.projectId);
    return projectId === `${expectedTenantId}-default-${expectedStoreId}`
        || (projectId.startsWith(`${expectedTenantId}-`) && projectId.endsWith(`-${expectedStoreId}`));
}

export async function readGrowthOSProjectDataServer(params: {
    projectId: string;
    tId: string | number;
    sId: string | number;
}): Promise<any | null> {
    const projectId = normalizeGrowthOSDocumentId(params.projectId);
    if (!projectId) return null;
    const tenantDocumentId = normalizeGrowthOSScopeDocumentId(params.tId);
    const storeDocumentId = normalizeGrowthOSScopeDocumentId(params.sId);
    if (!tenantDocumentId || !storeDocumentId) return null;

    const scopedSnap = await firestoreAdmin
        .collection(`${DB_COLLECTIONS.PROJECTS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc(projectId)
        .get();
    if (scopedSnap.exists) return scopedSnap.data();

    const legacySnap = await firestoreAdmin.collection(DB_COLLECTIONS.PROJECTS).doc(projectId).get();
    if (!legacySnap.exists) return null;
    const projectData = legacySnap.data();
    return legacyProjectBelongsToSession({
        projectData,
        projectId,
        sId: storeDocumentId,
        tId: tenantDocumentId,
    }) ? projectData : null;
}

export async function readGrowthOSSummaryServer(storeId: string | number): Promise<GrowthOSSummaryDocument | null> {
    const storeDocumentId = normalizeGrowthOSScopeDocumentId(storeId);
    if (!storeDocumentId) return null;

    const snap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(summaryDocId(storeDocumentId))
        .get();
    return snap.exists ? snap.data() as GrowthOSSummaryDocument : null;
}

export async function writeGrowthOSSummaryServer(
    storeId: string | number,
    summary: GrowthOSSummaryDocument,
): Promise<void> {
    const storeDocumentId = requireGrowthOSScopeDocumentId(storeId, "store");

    await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(summaryDocId(storeDocumentId))
        .set(sanitizeForAdminFirestore({
            ...summary,
            lastUpdated: admin.firestore.Timestamp.now(),
        }), { merge: true });
}

export async function writeGrowthOSKitServer(kit: GrowthOSKit): Promise<void> {
    const kitId = requireGrowthOSDocumentId(kit.id, "kit");
    const tenantDocumentId = requireGrowthOSScopeDocumentId(kit.tId, "tenant");
    const storeDocumentId = requireGrowthOSScopeDocumentId(kit.sId, "store");
    await firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc(kitId)
        .set(sanitizeForAdminFirestore({ ...kit, id: kitId }));
}

export async function readGrowthOSKitServer(params: {
    kitId: string;
    tId: string | number;
    sId: string | number;
}): Promise<GrowthOSKit | null> {
    const kitId = normalizeGrowthOSDocumentId(params.kitId);
    if (!kitId) return null;
    const tenantDocumentId = normalizeGrowthOSScopeDocumentId(params.tId);
    const storeDocumentId = normalizeGrowthOSScopeDocumentId(params.sId);
    if (!tenantDocumentId || !storeDocumentId) return null;

    const snap = await firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc(kitId)
        .get();
    return snap.exists ? snap.data() as GrowthOSKit : null;
}

function statusForExportMethod(method: GrowthOSExportMethod): GrowthOSKitStatus | null {
    if (method === "copy") return "copied";
    if (method === "share") return "shared";
    if (method === "download") return "downloaded";
    if (method === "print") return "printed";
    if (method === "mark_used") return "used";
    return null;
}

export async function recordGrowthOSExportServer(params: {
    destination: string;
    kit: GrowthOSKit;
    method: GrowthOSExportMethod;
    outputId?: string;
    session: any;
}): Promise<{ exportId: string; status?: GrowthOSKitStatus | null }> {
    const kitId = requireGrowthOSDocumentId(params.kit.id, "kit");
    const tenantDocumentId = requireGrowthOSScopeDocumentId(params.kit.tId, "tenant");
    const storeDocumentId = requireGrowthOSScopeDocumentId(params.kit.sId, "store");
    const exportRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_EXPORTS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc();
    const exportedAt = admin.firestore.Timestamp.now();
    const exportData = sanitizeForAdminFirestore({
        id: exportRef.id,
        tId: params.kit.tId,
        sId: params.kit.sId,
        kitId,
        destination: params.destination,
        method: params.method,
        outputId: params.outputId,
        exportedAt,
        uId: params.session?.uId || params.session?.user?.id,
    });
    const nextStatus = statusForExportMethod(params.method);
    const kitRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc(kitId);

    const batch = firestoreAdmin.batch();
    batch.set(exportRef, exportData);
    if (nextStatus) {
        batch.set(kitRef, sanitizeForAdminFirestore({
            status: nextStatus,
            updatedAt: exportedAt,
        }), { merge: true });
    }
    await batch.commit();

    return { exportId: exportRef.id, status: nextStatus };
}

export function findGrowthOSKitOutput(params: {
    destination: string;
    kit: GrowthOSKit;
    outputId?: string;
}): GrowthOSOutput | null {
    return params.kit.outputs.find((output) => (
        output.destination === params.destination
        && (!params.outputId || output.id === params.outputId)
    )) || null;
}

export function buildGrowthOSKitId(tId: string | number, sId: string | number): string {
    return `growthos_${tId}_${sId}_${Date.now().toString(36)}`;
}

export function buildGrowthOSSummaryDocId(storeId: string | number): string {
    return summaryDocId(requireGrowthOSScopeDocumentId(storeId, "store"));
}
