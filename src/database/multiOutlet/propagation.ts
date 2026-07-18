/**
 * Multi-Outlet Project Propagation
 *
 * Auto-creates linked outlet projects when a master store creates a new project.
 * Called from addProject() propagation hook (Feature #4C).
 *
 * @see __docs__/multi-outlet-consistency/store-onboarding/store-onboarding_impl.md §9
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { revalidatePublicClientCacheForProject } from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { buildSummaryProjectPayload } from "@lib/firestore/summaryProjectsWriter";
import { getBoundedMultiOutletStringContext, getMultiOutletProjectLogContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import { buildDeterministicOutletProjectId, normalizeProjectPropagationPlan } from "@lib/multiOutlet/projectPropagationBoundary";
import { normalizeMultiOutletProjectId } from "@lib/multiOutlet/projectIdBoundary";
import { slugify } from "@lib/utils/slugify";
import { doc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";

const resolveSummaryNameForSlug = (value: unknown, fallback: string): string => {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (value && typeof value === "object" && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        const preferred = record.en || record["en-US"] || Object.values(record).find((entry) => (
            typeof entry === "string" && entry.trim()
        ));
        if (typeof preferred === "string" && preferred.trim()) return preferred.trim();
    }
    return fallback;
};

const buildOutletProjectSummary = (
    masterProjectId: string,
    outletProjectId: string,
    masterSummary: Record<string, any> | undefined,
    projectName: string,
) => {
    const summaryName = masterSummary?.name || projectName || "Menu";
    const slug = typeof masterSummary?.slug === "string" && masterSummary.slug.trim()
        ? masterSummary.slug.trim()
        : slugify(resolveSummaryNameForSlug(summaryName, masterProjectId));

    return Object.fromEntries(
        Object.entries({
            ...(masterSummary || {}),
            projectId: outletProjectId,
            masterProjectId,
            name: summaryName,
            active: masterSummary?.active !== false,
            isDefault: masterSummary?.isDefault === true,
            slug: slug || undefined,
        }).filter(([, value]) => value !== undefined),
    );
};

/**
 * Propagate a newly created master project to all outlet stores.
 * Creates a linked outlet project (with masterProjectId) in each outlet.
 *
 * Non-blocking by design — caller records per-outlet failures. Each outlet's
 * project and summary commit atomically under a deterministic retry identity.
 */
export async function propagateNewProjectToOutlets(
    tenantId: number,
    masterStoreId: number,
    masterProjectId: string,
    projectName: string,
): Promise<{ propagated: number; failed: number }> {
    if (!FEATURE_FLAGS.ENABLE_PROJECT_PROPAGATION) {
        return { propagated: 0, failed: 0 };
    }

    // Get tenant to find all outlet stores
    const [tenantSnap, sourceStoreSnap] = await Promise.all([
        getDoc(doc(firebaseClient, DB_COLLECTIONS.TENANTS, String(tenantId))),
        getDoc(doc(firebaseClient, DB_COLLECTIONS.STORES, String(masterStoreId))),
    ]);
    if (!tenantSnap.exists()) {
        logMultiOutletFailure("multi_outlet_project_propagation_tenant_missing", new Error("PROJECT_PROPAGATION_TENANT_MISSING"), {
            ...getMultiOutletProjectLogContext(masterProjectId),
            ...getBoundedMultiOutletStringContext("tenantId", tenantId),
        });
        return { propagated: 0, failed: 1 };
    }

    const plan = normalizeProjectPropagationPlan(
        tenantSnap.data()?.storesList,
        masterStoreId,
        sourceStoreSnap.exists() ? sourceStoreSnap.data() : null,
        tenantId,
    );
    if (!plan) {
        logMultiOutletFailure("multi_outlet_project_propagation_scope_invalid", new Error("PROJECT_PROPAGATION_SCOPE_INVALID"), {
            ...getMultiOutletProjectLogContext(masterProjectId),
            ...getBoundedMultiOutletStringContext("tenantId", tenantId),
            ...getBoundedMultiOutletStringContext("masterStoreId", masterStoreId),
        });
        return { propagated: 0, failed: 1 };
    }
    if (plan.outletStoreIds.length === 0) return { propagated: 0, failed: 0 };

    let propagated = 0;
    let failed = 0;
    const masterProjectScope = normalizeMultiOutletProjectId(masterProjectId);
    if (
        !masterProjectScope
        || masterProjectScope.tenantDocumentId !== String(tenantId)
        || masterProjectScope.storeDocumentId !== plan.sourceStoreId
    ) {
        logMultiOutletFailure("multi_outlet_project_propagation_source_project_invalid", new Error("PROJECT_PROPAGATION_SOURCE_PROJECT_INVALID"), {
            ...getMultiOutletProjectLogContext(masterProjectId),
            ...getBoundedMultiOutletStringContext("tenantId", tenantId),
            ...getBoundedMultiOutletStringContext("masterStoreId", masterStoreId),
        });
        return { propagated: 0, failed: 1 };
    }
    const [masterProjectSnap, masterSummarySnap] = await Promise.all([
        getDoc(doc(firebaseClient, `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${masterStoreId}`, masterProjectId)),
        getDoc(doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `projects_${masterStoreId}`)),
    ]);
    const masterProject = masterProjectSnap.exists() ? masterProjectSnap.data() : null;
    const masterSummary = masterSummarySnap.exists()
        ? parseSummaryProjects(masterSummarySnap.data())[masterProjectId]
        : undefined;
    if (
        !masterProject
        || masterProject.projectId !== masterProjectId
        || String(masterProject.tId) !== String(tenantId)
        || String(masterProject.sId) !== plan.sourceStoreId
        || masterProject.deleted === true
        || masterProject.masterProjectId
        || masterProject.projectType === "localOnly"
        || !masterSummary
    ) {
        logMultiOutletFailure("multi_outlet_project_propagation_source_project_invalid", new Error("PROJECT_PROPAGATION_SOURCE_PROJECT_INVALID"), {
            ...getMultiOutletProjectLogContext(masterProjectId),
            ...getBoundedMultiOutletStringContext("tenantId", tenantId),
            ...getBoundedMultiOutletStringContext("masterStoreId", masterStoreId),
        });
        return { propagated: 0, failed: 1 };
    }

    for (const outletStoreId of plan.outletStoreIds) {
        let outletProjectId = buildDeterministicOutletProjectId({
            masterProjectId,
            outletStoreId,
            tenantId: String(tenantId),
        });
        if (!outletProjectId) {
            logMultiOutletFailure("multi_outlet_project_propagation_target_identity_invalid", new Error("PROJECT_PROPAGATION_TARGET_IDENTITY_INVALID"), {
                ...getMultiOutletProjectLogContext(masterProjectId),
                ...getBoundedMultiOutletStringContext("outletStoreId", outletStoreId),
            });
            failed++;
            continue;
        }
        try {
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY,
                `projects_${outletStoreId}`,
            );
            outletProjectId = await runTransaction(firebaseClient, async (transaction) => {
                const targetStoreRef = doc(firebaseClient, DB_COLLECTIONS.STORES, outletStoreId);
                const [targetStoreSnapshot, summarySnapshot] = await Promise.all([
                    transaction.get(targetStoreRef),
                    transaction.get(summaryRef),
                ]);
                const targetStore = targetStoreSnapshot.exists() ? targetStoreSnapshot.data() : null;
                if (
                    !targetStore
                    || String(targetStore.storeId) !== outletStoreId
                    || String(targetStore.tenantId) !== String(tenantId)
                    || targetStore.isMaster === true
                    || targetStore.active === false
                    || targetStore.blocked === true
                    || targetStore.deleted === true
                ) {
                    throw new Error("project_propagation_target_scope_changed");
                }
                const existingLinkedIds = summarySnapshot.exists()
                    ? Object.entries(parseSummaryProjects(summarySnapshot.data()))
                        .filter(([, summary]) => summary.masterProjectId === masterProjectId)
                        .map(([projectId]) => projectId)
                    : [];
                if (existingLinkedIds.length > 1) throw new Error("project_propagation_duplicate_summary_links");
                const effectiveProjectId = existingLinkedIds[0] || outletProjectId;
                const effectiveScope = normalizeMultiOutletProjectId(effectiveProjectId);
                if (
                    !effectiveScope
                    || effectiveScope.tenantDocumentId !== String(tenantId)
                    || effectiveScope.storeDocumentId !== outletStoreId
                ) {
                    throw new Error("project_propagation_existing_identity_invalid");
                }

                const outletProjectRef = doc(
                    firebaseClient,
                    `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${outletStoreId}`,
                    effectiveProjectId,
                );
                const outletProjectSnapshot = await transaction.get(outletProjectRef);
                if (outletProjectSnapshot.exists()) {
                    const existingProject = outletProjectSnapshot.data();
                    if (
                        existingProject.projectId !== effectiveProjectId
                        || existingProject.masterProjectId !== masterProjectId
                        || existingProject.deleted === true
                    ) {
                        throw new Error("project_propagation_existing_project_conflict");
                    }
                } else {
                    transaction.set(outletProjectRef, {
                        projectId: effectiveProjectId,
                        masterProjectId,
                        projectType: "inherited",
                        outletStatus: "active",
                        files: [],
                        active: true,
                        deleted: false,
                        overrides: { items: {}, categories: {}, attributes: {} },
                    });
                }

                const outletSummaryData = buildOutletProjectSummary(
                    masterProjectId,
                    effectiveProjectId,
                    masterSummary,
                    projectName,
                );
                transaction.set(summaryRef, {
                    lastUpdated: serverTimestamp(),
                    ...buildSummaryProjectPayload(effectiveProjectId, outletSummaryData),
                }, { merge: true });
                return effectiveProjectId;
            });
            await revalidatePublicClientCacheForProject(outletProjectId, "propagateNewProjectToOutlets");

            propagated++;
        } catch (e) {
            logMultiOutletFailure('multi_outlet_project_propagation_failed', e, {
                ...getMultiOutletProjectLogContext(outletProjectId, masterProjectId),
                ...getBoundedMultiOutletStringContext('outletStoreId', outletStoreId),
            });
            failed++;
        }
    }

    return { propagated, failed };
}
