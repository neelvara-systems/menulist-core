export const dynamic = "force-dynamic";

import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { resolveNextSpecialMenuTransitionAt } from "@data/shared/specialMenuSchedule";
import { admin } from "@lib/firebase/firebaseAdmin";
import { runStorePublicTruthPostCommitEffects } from "@lib/cache/storePublicTruthPostCommit";
import {
    buildSummaryProjectDeletePayload,
    buildSummaryProjectPayload,
} from "@lib/firestore/summaryProjectsWriter";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { projectDocumentMatchesScope } from "@lib/menu/projectDocumentScope";
import { invalidateOwnerBusinessAssistantPacketCache } from "@lib/ownerBusinessAssistant/server/contextPacketCache";
import {
    normalizeMultiOutletNumericDocumentId,
    normalizeMultiOutletProjectId,
} from "@lib/multiOutlet/projectIdBoundary";
import { getOutletSessionScope } from "@lib/multiOutlet/outletSessionScope";
import { requireAnyStorePermissionForStoreData } from "@lib/permissions/server";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { secureError } from "@lib/security/secureLogger";
import { touchDigitalScreenContentVersionForStoreServer } from "@lib/screen/serverScreenInvalidation";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const MAX_DELETE_BODY_BYTES = 8 * 1024;
const MAX_TENANT_STORES = 200;

const schema = z.object({
    projectId: z.string().min(1).max(200),
}).strict();

type SummaryProject = Record<string, unknown>;

class ProjectDeleteRejection extends Error {
    constructor(
        readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === "object" && !Array.isArray(value)
);

const normalizeTenantStoreIds = (
    storesList: unknown,
    tenantId: number,
    currentStoreId: number,
): string[] | null => {
    if (!Array.isArray(storesList) || storesList.length > MAX_TENANT_STORES) return null;
    const ids = new Set<string>();
    for (const entry of storesList) {
        if (!isRecord(entry)) return null;
        const scope = normalizeMultiOutletNumericDocumentId(entry.storeId);
        if (!scope || ids.has(scope.documentId)) return null;
        if (entry.active !== false && entry.deleted !== true && entry.blocked !== true) {
            ids.add(scope.documentId);
        }
    }
    if (!ids.has(String(currentStoreId)) || !Number.isSafeInteger(tenantId) || tenantId <= 0) {
        return null;
    }
    return Array.from(ids);
};

const isProtectedSpecialMenu = (summary: SummaryProject | undefined): boolean => (
    summary?.isSpecialMenu === true
    && (summary.specialMenuStatus === "active" || summary.specialMenuStatus === "scheduled")
);

const isLiveSpecialMenuReference = (
    summary: SummaryProject,
    projectId: string,
): boolean => (
    summary.isSpecialMenu === true
    && summary.specialMenuBaseProjectId === projectId
    && summary.specialMenuStatus !== "expired"
    && summary.specialMenuStatus !== "cancelled"
);

export const POST = withAuth(async (request: NextRequest, session) => {
    try {
        const bodyResult = await readBoundedJsonBody(request, MAX_DELETE_BODY_BYTES, {
            invalidJsonMessage: "Invalid input",
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const validation = validateAPIInput(schema, bodyResult.data);
        if (validation.success !== true) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        const outletSessionScope = getOutletSessionScope(session);
        const tenantScope = normalizeMultiOutletNumericDocumentId(outletSessionScope?.tenantDocumentId);
        const storeScope = normalizeMultiOutletNumericDocumentId(outletSessionScope?.storeDocumentId);
        const projectScope = normalizeMultiOutletProjectId(validation.data.projectId);
        if (
            !tenantScope
            || !storeScope
            || !projectScope
            || projectScope.tId !== tenantScope.numericId
            || projectScope.sId !== storeScope.numericId
            || !verifyTenantAccess(session, tenantScope.numericId, storeScope.numericId, request)
        ) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const rateLimit = await checkRateLimit({
            key: `project-delete:${hashPublicRateLimitValue(session.uId || session.user?.id || "unknown")}:${hashPublicRateLimitValue(projectScope.projectId)}`,
            limit: 20,
            window: 60,
        });
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const db = admin.firestore();
        const projectRef = db.doc(
            `${DB_COLLECTIONS.PROJECTS}/${tenantScope.documentId}/${storeScope.documentId}/${projectScope.projectId}`,
        );
        const summaryRef = db.doc(`${DB_COLLECTIONS.PLATFORM_SUMMARY}/projects_${storeScope.documentId}`);
        const storeRef = db.doc(`${DB_COLLECTIONS.STORES}/${storeScope.documentId}`);
        const tenantRef = db.doc(`${DB_COLLECTIONS.TENANTS}/${tenantScope.documentId}`);
        const deletedAt = admin.firestore.Timestamp.now();

        const result = await db.runTransaction(async (transaction) => {
            const [projectSnap, summarySnap, storeSnap, tenantSnap] = await Promise.all([
                transaction.get(projectRef),
                transaction.get(summaryRef),
                transaction.get(storeRef),
                transaction.get(tenantRef),
            ]);
            const storeData = storeSnap.data();
            const permissionError = requireAnyStorePermissionForStoreData(
                request,
                session,
                storeData,
                [PERMISSIONS.MANAGE_MENU],
                "Delete project",
                storeScope.numericId,
                tenantScope.numericId,
            );
            if (permissionError) {
                throw new ProjectDeleteRejection(permissionError.status || 403, "Forbidden");
            }
            if (
                !storeSnap.exists
                || storeData?.active === false
                || storeData?.deleted === true
            ) {
                throw new ProjectDeleteRejection(409, "Store state changed");
            }

            const tenantData = tenantSnap.data();
            if (
                !tenantSnap.exists
                || tenantData?.active === false
                || tenantData?.deleted === true
            ) {
                throw new ProjectDeleteRejection(409, "Tenant state changed");
            }
            const tenantStoreIds = normalizeTenantStoreIds(
                tenantData?.storesList,
                tenantScope.numericId,
                storeScope.numericId,
            );
            if (!tenantStoreIds) {
                throw new ProjectDeleteRejection(409, "Store membership changed");
            }

            const projectData = projectSnap.data();
            if (
                !projectSnap.exists
                || !projectDocumentMatchesScope(projectData, {
                    projectId: projectScope.projectId,
                    sId: storeScope.documentId,
                    tId: tenantScope.documentId,
                })
            ) {
                throw new ProjectDeleteRejection(404, "Project not found");
            }
            if (projectData?.deleted === true) {
                throw new ProjectDeleteRejection(409, "Project is already deleted");
            }
            if (projectData?.masterProjectId) {
                throw new ProjectDeleteRejection(409, "Inherited outlet projects cannot be deleted");
            }

            // Query every active tenant store inside the same transaction that
            // writes the tombstone. A concurrent link either commits first and
            // is observed here, or retries against the tombstoned master and is
            // rejected by the master-reference rule.
            const linkedOutletQueries = tenantStoreIds
                .filter((candidateStoreId) => candidateStoreId !== storeScope.documentId)
                .map((candidateStoreId) => (
                    db.collection(
                        `${DB_COLLECTIONS.PROJECTS}/${tenantScope.documentId}/${candidateStoreId}`,
                    )
                        .where("masterProjectId", "==", projectScope.projectId)
                        .limit(1)
                ));
            const linkedOutletSnapshots = await Promise.all(
                linkedOutletQueries.map((linkedQuery) => transaction.get(linkedQuery)),
            );
            if (linkedOutletSnapshots.some((snapshot) => !snapshot.empty)) {
                throw new ProjectDeleteRejection(
                    409,
                    "This project is linked to one or more outlet menus",
                );
            }

            const summaryProjects = parseSummaryProjects(summarySnap.data());
            const currentSummary = summaryProjects[projectScope.projectId];
            if (isProtectedSpecialMenu(currentSummary)) {
                throw new ProjectDeleteRejection(409, "End or cancel this special menu before deleting it");
            }
            if (
                Object.values(summaryProjects)
                    .some((summary) => isLiveSpecialMenuReference(summary, projectScope.projectId))
            ) {
                throw new ProjectDeleteRejection(409, "A live special menu references this project");
            }

            const fallbackDefaultEntry = currentSummary?.isDefault === true
                ? Object.entries(summaryProjects).find(([candidateProjectId, candidateSummary]) => (
                    candidateProjectId !== projectScope.projectId
                    && candidateSummary.isSpecialMenu !== true
                    && candidateSummary.active !== false
                )) || Object.entries(summaryProjects).find(([candidateProjectId, candidateSummary]) => (
                    candidateProjectId !== projectScope.projectId
                    && candidateSummary.isSpecialMenu !== true
                )) || null
                : null;
            const deletedSummary = currentSummary && isRecord(currentSummary)
                ? currentSummary
                : null;
            const projectUpdate: Record<string, unknown> = {
                active: false,
                deleted: true,
                deletedAt,
                ...(deletedSummary ? { deletedSummary } : {}),
            };
            const remainingSummaryProjects = { ...summaryProjects };
            delete remainingSummaryProjects[projectScope.projectId];
            const summaryUpdate: Record<string, unknown> = {
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                specialMenuNextTransitionAt: resolveNextSpecialMenuTransitionAt(remainingSummaryProjects)
                    || admin.firestore.FieldValue.delete(),
                ...buildSummaryProjectDeletePayload(
                    projectScope.projectId,
                    admin.firestore.FieldValue.delete(),
                ),
            };
            if (fallbackDefaultEntry) {
                const [fallbackProjectId, fallbackSummary] = fallbackDefaultEntry;
                Object.assign(summaryUpdate, buildSummaryProjectPayload(fallbackProjectId, {
                    ...fallbackSummary,
                    active: fallbackSummary.active ?? true,
                    isDefault: true,
                    name: fallbackSummary.name || "Untitled",
                }));
            }

            transaction.set(projectRef, projectUpdate, { merge: true });
            transaction.set(summaryRef, summaryUpdate, { merge: true });
            return {
                fallbackProjectId: fallbackDefaultEntry?.[0],
                projectId: projectScope.projectId,
            };
        });

        const postCommitEffects = await runStorePublicTruthPostCommitEffects({
            chunkSize: 1,
            storeIds: [storeScope.documentId],
            tenantId: tenantScope.documentId,
            deps: {
                invalidateAssistant: (storeId, tenantId) => (
                    invalidateOwnerBusinessAssistantPacketCache({
                        projectId: projectScope.projectId,
                        sId: storeId,
                        tId: tenantId,
                    })
                ),
                revalidate: (tag) => revalidateTag(tag, { expire: 0 }),
                touchScreen: (storeId) => (
                    touchDigitalScreenContentVersionForStoreServer(storeId, "deleteProject")
                ),
            },
        });
        if (postCommitEffects.effectsPending) {
            secureError(
                "[ProjectDelete] Post-commit effects pending",
                postCommitEffects.firstError instanceof Error
                    ? postCommitEffects.firstError
                    : new Error("project_delete_post_commit_effect_failed"),
                {
                    failedEffectCount: postCommitEffects.failedEffectCount,
                    projectId: projectScope.projectId,
                    storeId: storeScope.documentId,
                    tenantId: tenantScope.documentId,
                },
            );
        }

        return NextResponse.json({
            deleted: true,
            fallbackProjectId: result.fallbackProjectId,
            projectId: result.projectId,
        });
    } catch (error) {
        if (error instanceof ProjectDeleteRejection) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        secureError("[ProjectDelete] Failed", error instanceof Error
            ? error
            : new Error("project_delete_failed"), {
            endpoint: "/api/projects/delete",
        });
        return NextResponse.json({ error: "Project deletion failed" }, { status: 500 });
    }
});
