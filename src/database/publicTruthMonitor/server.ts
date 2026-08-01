import { DB_COLLECTIONS } from "@constant/database";
import { buildPublicTruthMonitorSummaryDocId } from "@constant/publicTruthMonitor";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { parseSummaryProjects, withAuthoritativeSummaryProjectId } from "@lib/firestore/parseSummaryProjects";
import type { OwnerPublicTruthProjectSummary } from "@lib/public-truth-tools/ownerPublicTruthReadiness";
import { isCurrentPublicTruthMonitorStoreScope } from "@lib/public-truth-tools/publicTruthMonitorServerScope";
import type { PublicTruthMonitorSummaryDocument } from "@type/publicTruthMonitor";

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

export class PublicTruthMonitorScopeChangedError extends Error {
    constructor() {
        super("public_truth_monitor_scope_changed");
        this.name = "PublicTruthMonitorScopeChangedError";
    }
}

function legacyProjectBelongsToSession(params: {
    projectData: any;
    projectId: string;
    sId: string | number;
    tId: string | number;
}): boolean {
    const expectedTenantId = String(params.tId);
    const expectedStoreId = String(params.sId);
    const tenantAliases = [params.projectData?.tId, params.projectData?.tenantId]
        .filter((value) => value !== undefined && value !== null);
    const storeAliases = [params.projectData?.sId, params.projectData?.storeId]
        .filter((value) => value !== undefined && value !== null);
    const projectTenantScope = normalizePublicTruthMonitorScopeAliases(tenantAliases);
    const projectStoreScope = normalizePublicTruthMonitorScopeAliases(storeAliases);

    if (tenantAliases.length > 0 && projectTenantScope !== expectedTenantId) return false;
    if (storeAliases.length > 0 && projectStoreScope !== expectedStoreId) return false;
    if (projectTenantScope && projectStoreScope) return true;

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

function normalizePublicTruthMonitorScopeAliases(values: readonly unknown[]): string | null {
    const present = values.filter((value) => value !== undefined && value !== null);
    if (present.length === 0) return null;
    const normalized = present.map(normalizePublicTruthMonitorScopeDocumentId);
    const expected = normalized[0];
    return expected && normalized.every((value) => value === expected)
        ? expected
        : null;
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

    return Object.entries(projectMap)
        .map(([projectId, data]) => withAuthoritativeSummaryProjectId(projectId, data)) as OwnerPublicTruthProjectSummary[];
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

export async function readAuthorizedPublicTruthMonitorSummaryServer(params: {
    authorizeStore: (storeData: FirebaseFirestore.DocumentData) => boolean | Promise<boolean>;
    storeId: string | number;
    tenantId: string | number;
}): Promise<{
    storeData: FirebaseFirestore.DocumentData;
    summary: PublicTruthMonitorSummaryDocument | null;
}> {
    const storeDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.storeId);
    const tenantDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.tenantId);
    if (!storeDocumentId || !tenantDocumentId) throw new PublicTruthMonitorScopeChangedError();

    const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);
    const tenantRef = firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(tenantDocumentId);
    const summaryRef = firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(buildPublicTruthMonitorSummaryDocId(storeDocumentId));

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [storeSnapshot, tenantSnapshot, summarySnapshot] = await Promise.all([
            transaction.get(storeRef),
            transaction.get(tenantRef),
            transaction.get(summaryRef),
        ]);
        const storeData = storeSnapshot.data();
        if (
            !isCurrentPublicTruthMonitorStoreScope({
                storeData,
                tenantData: tenantSnapshot.data(),
                tenantDocumentId,
            })
            || !await params.authorizeStore(storeData!)
        ) {
            throw new PublicTruthMonitorScopeChangedError();
        }
        return {
            storeData: storeData!,
            summary: summarySnapshot.exists
                ? summarySnapshot.data() as PublicTruthMonitorSummaryDocument
                : null,
        };
    });
}

export async function updatePublicTruthMonitorSummaryServer(params: {
    authorizeSubscription: (
        subscriptionData: FirebaseFirestore.DocumentData,
        storeData: FirebaseFirestore.DocumentData,
    ) => boolean;
    authorizeStore: (storeData: FirebaseFirestore.DocumentData) => boolean | Promise<boolean>;
    storeId: string | number;
    subscriptionId: string;
    tenantId: string | number;
    buildSummary: (
        current: PublicTruthMonitorSummaryDocument | null,
    ) => PublicTruthMonitorSummaryDocument;
}): Promise<PublicTruthMonitorSummaryDocument> {
    const storeDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.storeId);
    const subscriptionDocumentId = normalizePublicTruthMonitorDocumentId(params.subscriptionId);
    const tenantDocumentId = normalizePublicTruthMonitorScopeDocumentId(params.tenantId);
    if (!storeDocumentId || !subscriptionDocumentId || !tenantDocumentId) {
        throw new PublicTruthMonitorScopeChangedError();
    }

    const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId);
    const subscriptionRef = firestoreAdmin.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionDocumentId);
    const tenantRef = firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(tenantDocumentId);
    const summaryRef = firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(buildPublicTruthMonitorSummaryDocId(storeDocumentId));

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [storeSnapshot, subscriptionSnapshot, tenantSnapshot, summarySnapshot] = await Promise.all([
            transaction.get(storeRef),
            transaction.get(subscriptionRef),
            transaction.get(tenantRef),
            transaction.get(summaryRef),
        ]);
        const storeData = storeSnapshot.data();
        const subscriptionData = subscriptionSnapshot.data();
        if (
            !isCurrentPublicTruthMonitorStoreScope({
                storeData,
                tenantData: tenantSnapshot.data(),
                tenantDocumentId,
            })
            || !await params.authorizeStore(storeData!)
            || !subscriptionData
            || !params.authorizeSubscription(subscriptionData, storeData!)
        ) {
            throw new PublicTruthMonitorScopeChangedError();
        }
        const current = summarySnapshot.exists
            ? summarySnapshot.data() as PublicTruthMonitorSummaryDocument
            : null;
        const summary = params.buildSummary(current);

        transaction.set(summaryRef, sanitizeForAdminFirestore({
            ...summary,
            updatedAt: admin.firestore.Timestamp.now(),
        }), { merge: true });

        return summary;
    });
}
