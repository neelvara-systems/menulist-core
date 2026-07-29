import { DB_COLLECTIONS } from "@constant/database";
import { GROWTHOS_SUMMARY_DOC_PREFIX } from "@constant/growthos";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { isGrowthOSKitExpired } from "@lib/growthos/readiness";
import { buildGrowthOSSourceFacts, hashGrowthOSSourceFacts } from "@lib/growthos/sourceFacts";
import {
    getGrowthOSClientScope,
    projectGrowthOSSummaryForScope,
} from "@lib/growthos/clientContracts";
import type {
    GrowthOSExport,
    GrowthOSDestination,
    GrowthOSExportMethod,
    GrowthOSKit,
    GrowthOSKitStatus,
    GrowthOSOutput,
    GrowthOSSummaryDocument,
} from "@type/growthos";

const summaryDocId = (storeDocumentId: string) => `${GROWTHOS_SUMMARY_DOC_PREFIX}_${storeDocumentId}`;

export const GROWTHOS_SOURCE_FACTS_CHANGED = "GROWTHOS_SOURCE_FACTS_CHANGED";
export const GROWTHOS_KIT_BECAME_STALE = "GROWTHOS_KIT_BECAME_STALE";

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

function normalizeGrowthOSScopeAliases(values: readonly unknown[]): string | null {
    const present = values.filter((value) => value !== undefined && value !== null);
    if (present.length === 0) return null;
    const normalized = present.map(normalizeGrowthOSScopeDocumentId);
    const expected = normalized[0];
    return expected && normalized.every((value) => value === expected)
        ? expected
        : null;
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
    const tenantAliases = [params.projectData?.tId, params.projectData?.tenantId]
        .filter((value) => value !== undefined && value !== null);
    const storeAliases = [params.projectData?.sId, params.projectData?.storeId]
        .filter((value) => value !== undefined && value !== null);
    const projectTenantScope = normalizeGrowthOSScopeAliases(tenantAliases);
    const projectStoreScope = normalizeGrowthOSScopeAliases(storeAliases);

    if (tenantAliases.length > 0 && projectTenantScope !== expectedTenantId) return false;
    if (storeAliases.length > 0 && projectStoreScope !== expectedStoreId) return false;
    if (projectTenantScope && projectStoreScope) return true;

    const projectId = String(params.projectData?.projectId || params.projectId);
    return projectId === `${expectedTenantId}-default-${expectedStoreId}`
        || (projectId.startsWith(`${expectedTenantId}-`) && projectId.endsWith(`-${expectedStoreId}`));
}

async function getGrowthOSSourceFactsHashInTransaction(params: {
    projectId: string;
    storeDocumentId: string;
    tenantDocumentId: string;
    transaction: FirebaseFirestore.Transaction;
}): Promise<string | null> {
    const projectId = requireGrowthOSDocumentId(params.projectId, "project");
    const storeRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(params.storeDocumentId);
    const scopedProjectRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.PROJECTS}/${params.tenantDocumentId}/${params.storeDocumentId}`)
        .doc(projectId);
    const legacyProjectRef = firestoreAdmin.collection(DB_COLLECTIONS.PROJECTS).doc(projectId);
    const [storeSnap, scopedProjectSnap, legacyProjectSnap] = await Promise.all([
        params.transaction.get(storeRef),
        params.transaction.get(scopedProjectRef),
        params.transaction.get(legacyProjectRef),
    ]);
    const projectData = scopedProjectSnap.exists
        ? scopedProjectSnap.data()
        : legacyProjectSnap.exists && legacyProjectBelongsToSession({
            projectData: legacyProjectSnap.data(),
            projectId,
            sId: params.storeDocumentId,
            tId: params.tenantDocumentId,
        })
            ? legacyProjectSnap.data()
            : null;
    if (!projectData) return null;
    const facts = buildGrowthOSSourceFacts({
        projectData,
        projectId,
        storeData: storeSnap.exists ? storeSnap.data() : null,
        tId: params.tenantDocumentId,
        sId: params.storeDocumentId,
    });
    return hashGrowthOSSourceFacts(facts);
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

export async function readGrowthOSSummaryServer(params: {
    storeId: string | number;
    tenantId: string | number;
}): Promise<GrowthOSSummaryDocument | null> {
    const scope = getGrowthOSClientScope(params);
    if (!scope) return null;

    const snap = await firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(summaryDocId(scope.sId))
        .get();
    return snap.exists ? projectGrowthOSSummaryForScope(snap.data(), scope) : null;
}

function normalizeGrowthOSSummaryForCompare(summary: GrowthOSSummaryDocument) {
    return {
        tId: summary.tId,
        sId: summary.sId,
        date: summary.date,
        sourceFactsHash: summary.sourceFactsHash || null,
        eligible: summary.eligible,
        reason: summary.reason || null,
        readiness: summary.readiness || null,
        primaryAction: summary.primaryAction || null,
        secondaryActions: summary.secondaryActions || [],
        latestKit: summary.latestKit || null,
    };
}

export async function writeGrowthOSRefreshedSummaryServer(
    storeId: string | number,
    proposed: GrowthOSSummaryDocument,
    projectId: string,
): Promise<GrowthOSSummaryDocument> {
    const storeDocumentId = requireGrowthOSScopeDocumentId(storeId, "store");
    const tenantDocumentId = requireGrowthOSScopeDocumentId(proposed.tId, "tenant");
    if (proposed.sId !== storeDocumentId) {
        throw new Error("GrowthOS refreshed summary scope mismatch");
    }
    const summaryRef = firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(summaryDocId(storeDocumentId));

    return firestoreAdmin.runTransaction(async (transaction) => {
        const snap = await transaction.get(summaryRef);
        const currentSourceFactsHash = await getGrowthOSSourceFactsHashInTransaction({
            projectId,
            storeDocumentId,
            tenantDocumentId,
            transaction,
        });
        if ((proposed.sourceFactsHash || null) !== currentSourceFactsHash) {
            throw new Error(GROWTHOS_SOURCE_FACTS_CHANGED);
        }
        const current = snap.exists ? snap.data() as GrowthOSSummaryDocument : null;
        if (
            current
            && (current.tId !== tenantDocumentId || current.sId !== storeDocumentId)
        ) {
            throw new Error("GrowthOS current summary scope mismatch");
        }

        const currentLatestKit = current?.latestKit;
        const nextLatestKit = currentLatestKit && typeof currentLatestKit.id === "string"
            ? {
                ...currentLatestKit,
                isStale: !proposed.sourceFactsHash
                    || currentLatestKit.sourceFactsHash !== proposed.sourceFactsHash,
            }
            : proposed.latestKit || null;
        const next: GrowthOSSummaryDocument = {
            ...proposed,
            latestKit: nextLatestKit,
        };
        if (
            current
            && JSON.stringify(normalizeGrowthOSSummaryForCompare(current))
                === JSON.stringify(normalizeGrowthOSSummaryForCompare(next))
        ) {
            return current;
        }

        const committed = {
            ...next,
            lastUpdated: admin.firestore.Timestamp.now(),
        };
        transaction.set(summaryRef, sanitizeForAdminFirestore(committed), { merge: true });
        return committed;
    });
}

export async function writeGrowthOSKitAndSummaryServer(
    kit: GrowthOSKit,
    summary: GrowthOSSummaryDocument,
): Promise<{ kit: GrowthOSKit; replayed: boolean; summary: GrowthOSSummaryDocument }> {
    const kitId = requireGrowthOSDocumentId(kit.id, "kit");
    const tenantDocumentId = requireGrowthOSScopeDocumentId(kit.tId, "tenant");
    const storeDocumentId = requireGrowthOSScopeDocumentId(kit.sId, "store");
    const summaryTenantDocumentId = requireGrowthOSScopeDocumentId(summary.tId, "summary tenant");
    const summaryStoreDocumentId = requireGrowthOSScopeDocumentId(summary.sId, "summary store");
    const summaryKitId = requireGrowthOSDocumentId(summary.latestKit?.id, "summary kit");
    if (
        summaryTenantDocumentId !== tenantDocumentId
        || summaryStoreDocumentId !== storeDocumentId
        || summaryKitId !== kitId
    ) {
        throw new Error("GrowthOS kit and summary scope mismatch");
    }
    const kitRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc(kitId);
    const summaryRef = firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(summaryDocId(summaryStoreDocumentId));
    const operationId = requireGrowthOSDocumentId(kit.operationId, "operation");
    return firestoreAdmin.runTransaction(async (transaction) => {
        const [existingKitSnap, existingSummarySnap] = await Promise.all([
            transaction.get(kitRef),
            transaction.get(summaryRef),
        ]);
        if (existingKitSnap.exists) {
            const existingKit = existingKitSnap.data() as GrowthOSKit;
            if (
                existingKit.id !== kitId
                || existingKit.tId !== tenantDocumentId
                || existingKit.sId !== storeDocumentId
                || existingKit.operationId !== operationId
                || existingKit.projectId !== kit.projectId
                || existingKit.actionId !== kit.actionId
            ) {
                throw new Error("GrowthOS generation operation conflict");
            }
            const existingSummary = existingSummarySnap.exists
                ? existingSummarySnap.data() as GrowthOSSummaryDocument
                : null;
            if (
                !existingSummary
                || existingSummary.tId !== tenantDocumentId
                || existingSummary.sId !== storeDocumentId
            ) {
                throw new Error("GrowthOS generation summary unavailable");
            }
            return { kit: existingKit, replayed: true, summary: existingSummary };
        }

        const currentSourceFactsHash = await getGrowthOSSourceFactsHashInTransaction({
            projectId: requireGrowthOSDocumentId(kit.projectId, "project"),
            storeDocumentId,
            tenantDocumentId,
            transaction,
        });
        if (currentSourceFactsHash !== kit.sourceFactsHash) {
            throw new Error(GROWTHOS_SOURCE_FACTS_CHANGED);
        }

        const committedSummary = {
            ...summary,
            lastUpdated: admin.firestore.Timestamp.now(),
        };
        transaction.create(kitRef, sanitizeForAdminFirestore({
            ...kit,
            id: kitId,
            operationId,
        }));
        transaction.set(summaryRef, sanitizeForAdminFirestore(committedSummary), { merge: true });
        return { kit: { ...kit, id: kitId, operationId }, replayed: false, summary: committedSummary };
    });
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
    actorId: string;
    destination: GrowthOSDestination;
    isStale: boolean;
    kit: GrowthOSKit;
    method: GrowthOSExportMethod;
    operationId: string;
    outputId?: string;
}): Promise<{ exportId: string; isStale: boolean; status?: GrowthOSKitStatus | null }> {
    const kitId = requireGrowthOSDocumentId(params.kit.id, "kit");
    const tenantDocumentId = requireGrowthOSScopeDocumentId(params.kit.tId, "tenant");
    const storeDocumentId = requireGrowthOSScopeDocumentId(params.kit.sId, "store");
    const actorId = requireGrowthOSDocumentId(params.actorId, "actor");
    const operationId = requireGrowthOSDocumentId(params.operationId, "operation");
    const exportRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_EXPORTS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc(`growthos_export_${operationId}`);
    const exportedAt = admin.firestore.Timestamp.now();
    const nextStatus = statusForExportMethod(params.method);
    const exportData: GrowthOSExport = {
        id: exportRef.id,
        tId: params.kit.tId,
        sId: params.kit.sId,
        kitId,
        destination: params.destination,
        method: params.method,
        operationId,
        outputId: params.outputId,
        status: nextStatus,
        isStale: params.isStale,
        exportedAt,
        uId: actorId,
    };
    const kitRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_KITS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc(kitId);
    const summaryRef = firestoreAdmin
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(summaryDocId(storeDocumentId));

    return firestoreAdmin.runTransaction(async (transaction) => {
        const [existingExportSnap, currentKitSnap, summarySnap] = await Promise.all([
            transaction.get(exportRef),
            transaction.get(kitRef),
            transaction.get(summaryRef),
        ]);
        if (existingExportSnap.exists) {
            const existing = existingExportSnap.data() as Partial<GrowthOSExport>;
            if (
                existing.operationId !== operationId
                || existing.tId !== params.kit.tId
                || existing.sId !== params.kit.sId
                || existing.kitId !== kitId
                || existing.destination !== params.destination
                || existing.method !== params.method
                || existing.outputId !== params.outputId
                || existing.uId !== actorId
            ) {
                throw new Error("GrowthOS export operation conflict");
            }
            return {
                exportId: exportRef.id,
                isStale: existing.isStale === true,
                status: existing.status ?? null,
            };
        }
        if (!currentKitSnap.exists) throw new Error("GrowthOS kit no longer exists");
        const currentKit = currentKitSnap.data() as Partial<GrowthOSKit>;
        if (
            currentKit.id !== kitId
            || currentKit.tId !== params.kit.tId
            || currentKit.sId !== params.kit.sId
            || !Array.isArray(currentKit.outputs)
            || !findGrowthOSKitOutput({
                destination: params.destination,
                kit: currentKit as GrowthOSKit,
                outputId: params.outputId,
            })
        ) {
            throw new Error("GrowthOS kit authority changed");
        }
        const currentSourceFactsHash = currentKit.projectId
            ? await getGrowthOSSourceFactsHashInTransaction({
                projectId: currentKit.projectId,
                storeDocumentId,
                tenantDocumentId,
                transaction,
            })
            : null;
        const transactionStale = !currentSourceFactsHash
            || currentSourceFactsHash !== currentKit.sourceFactsHash
            || isGrowthOSKitExpired(currentKit.expiresAt);
        if (
            transactionStale
            && params.method !== "mark_used"
            && params.method !== "stale"
        ) {
            throw new Error(GROWTHOS_KIT_BECAME_STALE);
        }

        const committedExportData = {
            ...exportData,
            isStale: transactionStale,
        };
        transaction.create(exportRef, sanitizeForAdminFirestore(committedExportData));
        if (nextStatus) {
            transaction.set(kitRef, sanitizeForAdminFirestore({
                status: nextStatus,
                updatedAt: exportedAt,
            }), { merge: true });
        }
        if (summarySnap.exists) {
            const summary = summarySnap.data() as Partial<GrowthOSSummaryDocument>;
            if (
                summary.tId === params.kit.tId
                && summary.sId === params.kit.sId
                && summary.latestKit?.id === kitId
            ) {
                transaction.set(summaryRef, sanitizeForAdminFirestore({
                    latestKit: {
                        ...summary.latestKit,
                        status: nextStatus || summary.latestKit.status,
                        isStale: transactionStale,
                    },
                    lastUpdated: exportedAt,
                }), { merge: true });
            }
        }
        return { exportId: exportRef.id, isStale: transactionStale, status: nextStatus };
    });
}

export async function readGrowthOSExportReplayServer(params: {
    actorId: string;
    destination: string;
    kitId: string;
    method: GrowthOSExportMethod;
    operationId: string;
    outputId?: string;
    sId: string | number;
    tId: string | number;
}): Promise<{ exportId: string; isStale: boolean; status?: GrowthOSKitStatus | null } | null> {
    const tenantDocumentId = requireGrowthOSScopeDocumentId(params.tId, "tenant");
    const storeDocumentId = requireGrowthOSScopeDocumentId(params.sId, "store");
    const actorId = requireGrowthOSDocumentId(params.actorId, "actor");
    const operationId = requireGrowthOSDocumentId(params.operationId, "operation");
    const kitId = requireGrowthOSDocumentId(params.kitId, "kit");
    const exportRef = firestoreAdmin
        .collection(`${DB_COLLECTIONS.GROWTHOS_EXPORTS}/${tenantDocumentId}/${storeDocumentId}`)
        .doc(`growthos_export_${operationId}`);
    const snap = await exportRef.get();
    if (!snap.exists) return null;
    const existing = snap.data() as Partial<GrowthOSExport>;
    if (
        existing.operationId !== operationId
        || existing.tId !== tenantDocumentId
        || existing.sId !== storeDocumentId
        || existing.kitId !== kitId
        || existing.destination !== params.destination
        || existing.method !== params.method
        || existing.outputId !== params.outputId
        || existing.uId !== actorId
        || typeof existing.isStale !== "boolean"
    ) {
        throw new Error("GrowthOS export operation conflict");
    }
    return {
        exportId: exportRef.id,
        isStale: existing.isStale,
        status: existing.status ?? null,
    };
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

export function buildGrowthOSKitId(
    tId: string | number,
    sId: string | number,
    operationId: string,
): string {
    return `growthos_${tId}_${sId}_${requireGrowthOSDocumentId(operationId, "operation")}`;
}

export function buildGrowthOSSummaryDocId(storeId: string | number): string {
    return summaryDocId(requireGrowthOSScopeDocumentId(storeId, "store"));
}
