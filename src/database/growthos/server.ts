import { DB_COLLECTIONS } from "@constant/database";
import { GROWTHOS_SUMMARY_DOC_PREFIX } from "@constant/growthos";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import type {
    GrowthOSExportMethod,
    GrowthOSKit,
    GrowthOSKitStatus,
    GrowthOSOutput,
    GrowthOSSummaryDocument,
} from "@type/growthos";

const summaryDocId = (storeId: string | number) => `${GROWTHOS_SUMMARY_DOC_PREFIX}_${storeId}`;

const sanitizeForAdminFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (typeof value !== "object") return value;
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
    if (typeof value?.toDate === "function" && typeof value?.seconds === "number") {
        return admin.firestore.Timestamp.fromDate(value.toDate());
    }
    if (Array.isArray(value)) return value.map(sanitizeForAdminFirestore);
    return Object.fromEntries(
        Object.entries(value).map(([key, nested]) => [key, sanitizeForAdminFirestore(nested)]),
    );
};

export const toGrowthOSAdminTimestamp = (date: Date) => admin.firestore.Timestamp.fromDate(date);

export async function readGrowthOSStoreDataServer(storeId: string | number): Promise<any | null> {
    const snap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
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
    const scopedSnap = await firestoreAdmin
        .collection(`${DB_COLLECTIONS.PROJECTS}/${params.tId}/${params.sId}`)
        .doc(params.projectId)
        .get();
    if (scopedSnap.exists) return scopedSnap.data();

    const legacySnap = await firestoreAdmin.collection(DB_COLLECTIONS.PROJECTS).doc(params.projectId).get();
    if (!legacySnap.exists) return null;
    const projectData = legacySnap.data();
    return legacyProjectBelongsToSession({
        projectData,
        projectId: params.projectId,
        sId: params.sId,
        tId: params.tId,
    }) ? projectData : null;
}

export async function readGrowthOSSummaryServer(storeId: string | number): Promise<GrowthOSSummaryDocument | null> {
    const snap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(summaryDocId(storeId))
        .get();
    return snap.exists ? snap.data() as GrowthOSSummaryDocument : null;
}

export async function writeGrowthOSSummaryServer(
    storeId: string | number,
    summary: GrowthOSSummaryDocument,
): Promise<void> {
    await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(summaryDocId(storeId))
        .set(sanitizeForAdminFirestore({
            ...summary,
            lastUpdated: admin.firestore.Timestamp.now(),
        }), { merge: true });
}

export async function writeGrowthOSKitServer(kit: GrowthOSKit): Promise<void> {
    await firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${kit.tId}/${kit.sId}`)
        .doc(kit.id)
        .set(sanitizeForAdminFirestore(kit));
}

export async function readGrowthOSKitServer(params: {
    kitId: string;
    tId: string | number;
    sId: string | number;
}): Promise<GrowthOSKit | null> {
    const snap = await firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${params.tId}/${params.sId}`)
        .doc(params.kitId)
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
    const exportRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_EXPORTS}/${params.kit.tId}/${params.kit.sId}`)
        .doc();
    const exportedAt = admin.firestore.Timestamp.now();
    const exportData = sanitizeForAdminFirestore({
        id: exportRef.id,
        tId: params.kit.tId,
        sId: params.kit.sId,
        kitId: params.kit.id,
        destination: params.destination,
        method: params.method,
        outputId: params.outputId,
        exportedAt,
        uId: params.session?.uId || params.session?.user?.id,
    });
    const nextStatus = statusForExportMethod(params.method);
    const kitRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${params.kit.tId}/${params.kit.sId}`)
        .doc(params.kit.id);

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
    return summaryDocId(storeId);
}
