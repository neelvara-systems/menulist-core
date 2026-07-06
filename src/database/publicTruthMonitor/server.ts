import { DB_COLLECTIONS } from "@constant/database";
import { buildPublicTruthMonitorSummaryDocId } from "@constant/publicTruthMonitor";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
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

function normalizePublicTruthMonitorDocumentId(value: unknown): string | null {
    const raw = typeof value === "string" ? value : "";
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

function normalizePublicTruthMonitorScopeDocumentId(value: unknown): string | null {
    const raw = typeof value === "string" || typeof value === "number" ? String(value) : "";
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

function normalizeSelectableProject(
    project?: OwnerPublicTruthProjectSummary | null,
): OwnerPublicTruthProjectSummary | null {
    if (!project) return null;

    const projectId = normalizePublicTruthMonitorDocumentId(project.projectId);
    if (!projectId) return null;

    return { ...project, projectId };
}

function isSelectableProject(project?: OwnerPublicTruthProjectSummary | null): boolean {
    if (!project) return false;

    return project.active !== false
        && project.deleted !== true
        && project.isSpecialMenu !== true;
}

export function pickPublicTruthMonitorProjectId(
    projectSummaries: OwnerPublicTruthProjectSummary[],
    selectedProjectId?: string | null,
): string | null {
    const selectedProjectIdDocumentId = normalizePublicTruthMonitorDocumentId(selectedProjectId);
    const selectable = projectSummaries
        .map(normalizeSelectableProject)
        .filter((project): project is OwnerPublicTruthProjectSummary => Boolean(project) && isSelectableProject(project));

    if (selectedProjectIdDocumentId && selectable.some((project) => project.projectId === selectedProjectIdDocumentId)) {
        return selectedProjectIdDocumentId;
    }
    return selectable.find((project) => project.isDefault)?.projectId || selectable[0]?.projectId || null;
}

export async function readPublicTruthMonitorStoreDataServer(storeId: string | number): Promise<any | null> {
    const storeDocumentId = normalizePublicTruthMonitorScopeDocumentId(storeId);
    if (!storeDocumentId) return null;

    const snap = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId).get();
    return snap.exists ? snap.data() : null;
}

export async function readPublicTruthMonitorProjectSummariesServer(
    storeId: string | number,
): Promise<OwnerPublicTruthProjectSummary[]> {
    const storeDocumentId = normalizePublicTruthMonitorScopeDocumentId(storeId);
    if (!storeDocumentId) return [];

    const snap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`projects_${storeDocumentId}`)
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
    const projectId = normalizePublicTruthMonitorDocumentId(params.projectId);
    if (!projectId) return null;
    const tenantDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.tId);
    const storeDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.sId);
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

export async function readPublicTruthMonitorSummaryServer(
    storeId: string | number,
): Promise<PublicTruthMonitorSummaryDocument | null> {
    const storeDocumentId = normalizePublicTruthMonitorScopeDocumentId(storeId);
    if (!storeDocumentId) return null;

    const snap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(buildPublicTruthMonitorSummaryDocId(storeDocumentId))
        .get();
    return snap.exists ? snap.data() as PublicTruthMonitorSummaryDocument : null;
}

export async function writePublicTruthMonitorSummaryServer(params: {
    storeId: string | number;
    summary: PublicTruthMonitorSummaryDocument;
}): Promise<void> {
    const storeDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.storeId);
    if (!storeDocumentId) throw new Error("Invalid Public Truth Monitor store ID");

    await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(buildPublicTruthMonitorSummaryDocId(storeDocumentId))
        .set(sanitizeForAdminFirestore({
            ...params.summary,
            updatedAt: admin.firestore.Timestamp.now(),
        }), { merge: true });
}
