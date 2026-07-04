import { DB_COLLECTIONS } from "@constant/database";
import { buildPublicTruthMonitorSummaryDocId } from "@constant/publicTruthMonitor";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import type { OwnerPublicTruthProjectSummary } from "@lib/public-truth-tools/ownerPublicTruthReadiness";
import type { PublicTruthMonitorSummaryDocument } from "@type/publicTruthMonitor";

const sanitizeForAdminFirestore = (value: any): any => {
    if (value === undefined) return null;
    if (value === null) return null;
    if (value instanceof Date) return admin.firestore.Timestamp.fromDate(value);
    if (typeof value?.toDate === "function" && typeof value?.seconds === "number") {
        return admin.firestore.Timestamp.fromDate(value.toDate());
    }
    if (Array.isArray(value)) return value.map(sanitizeForAdminFirestore);
    if (typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nested]) => [key, sanitizeForAdminFirestore(nested)]),
        );
    }
    return value;
};

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

function isSelectableProject(project?: OwnerPublicTruthProjectSummary | null): boolean {
    return Boolean(project?.projectId)
        && project?.active !== false
        && project?.deleted !== true
        && project?.isSpecialMenu !== true;
}

export function pickPublicTruthMonitorProjectId(
    projectSummaries: OwnerPublicTruthProjectSummary[],
    selectedProjectId?: string | null,
): string | null {
    const selectable = projectSummaries.filter(isSelectableProject);
    if (selectedProjectId && selectable.some((project) => project.projectId === selectedProjectId)) {
        return selectedProjectId;
    }
    return selectable.find((project) => project.isDefault)?.projectId || selectable[0]?.projectId || null;
}

export async function readPublicTruthMonitorStoreDataServer(storeId: string | number): Promise<any | null> {
    const snap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).get();
    return snap.exists ? snap.data() : null;
}

export async function readPublicTruthMonitorProjectSummariesServer(
    storeId: string | number,
): Promise<OwnerPublicTruthProjectSummary[]> {
    const snap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`projects_${storeId}`)
        .get();
    const projectMap = snap.exists ? parseSummaryProjects(snap.data()) : {};

    return Object.entries(projectMap).map(([projectId, data]) => ({
        projectId,
        ...((data || {}) as Record<string, any>),
    }));
}

export async function readPublicTruthMonitorProjectDataServer(params: {
    projectId: string;
    sId: string | number;
    tId: string | number;
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

export async function readPublicTruthMonitorSummaryServer(
    storeId: string | number,
): Promise<PublicTruthMonitorSummaryDocument | null> {
    const snap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(buildPublicTruthMonitorSummaryDocId(storeId))
        .get();
    return snap.exists ? snap.data() as PublicTruthMonitorSummaryDocument : null;
}

export async function writePublicTruthMonitorSummaryServer(params: {
    storeId: string | number;
    summary: PublicTruthMonitorSummaryDocument;
}): Promise<void> {
    await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(buildPublicTruthMonitorSummaryDocId(params.storeId))
        .set(sanitizeForAdminFirestore({
            ...params.summary,
            updatedAt: admin.firestore.Timestamp.now(),
        }), { merge: true });
}
