/**
 * Multi-Outlet Project Propagation
 *
 * Auto-creates linked outlet projects when a master store creates a new project.
 * Called from addProject() propagation hook (Feature #4C).
 *
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §9
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { revalidatePublicClientCacheForProject } from "@lib/cache/publicClientCache";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { buildSummaryProjectPayload } from "@lib/firestore/summaryProjectsWriter";
import { getBoundedMultiOutletStringContext, getMultiOutletProjectLogContext, logMultiOutletFailure } from "@lib/multiOutlet/diagnostics";
import { slugify } from "@lib/utils/slugify";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

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
 * Non-blocking by design — caller catches errors.
 * Safety job verifyAllOutletsHaveAllMasterProjects() catches any misses.
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
    const tenantRef = doc(firebaseClient, DB_COLLECTIONS.TENANTS, String(tenantId));
    const tenantSnap = await getDoc(tenantRef);
    if (!tenantSnap.exists()) return { propagated: 0, failed: 0 };

    const storesList = tenantSnap.data()?.storesList || [];
    // Filter to non-master stores only
    const outletStores = storesList.filter(
        (s: any) => s.storeId !== masterStoreId && s.isMaster !== true && s.active !== false,
    );

    if (outletStores.length === 0) return { propagated: 0, failed: 0 };

    let propagated = 0;
    let failed = 0;
    const masterSummarySnap = await getDoc(doc(firebaseClient, DB_COLLECTIONS.PLATFORM_SUMMARY, `projects_${masterStoreId}`));
    const masterSummary = masterSummarySnap.exists()
        ? parseSummaryProjects(masterSummarySnap.data())[masterProjectId]
        : undefined;

    for (let i = 0; i < outletStores.length; i++) {
        const outlet = outletStores[i];
        const timestamp = Date.now().toString(36);
        const outletProjectId = `${tenantId}-${timestamp}${i > 0 ? i : ''}-${outlet.storeId}`;
        try {
            const outletSummaryData = buildOutletProjectSummary(masterProjectId, outletProjectId, masterSummary, projectName);

            const outletProjectRef = doc(
                firebaseClient,
                `${DB_COLLECTIONS.PROJECTS}/${tenantId}/${outlet.storeId}`,
                outletProjectId,
            );

            await setDoc(outletProjectRef, {
                projectId: outletProjectId,
                masterProjectId,
                projectType: 'inherited',
                outletStatus: 'active',
                files: [],
                active: true,
                deleted: false,
                overrides: { items: {}, categories: {}, attributes: {} },
            });

            // Sync to outlet's projectsSummary
            const summaryRef = doc(
                firebaseClient,
                DB_COLLECTIONS.PLATFORM_SUMMARY,
                `projects_${outlet.storeId}`,
            );
            await setDoc(summaryRef, {
                lastUpdated: serverTimestamp(),
                ...buildSummaryProjectPayload(outletProjectId, outletSummaryData),
            }, { merge: true });
            await revalidatePublicClientCacheForProject(outletProjectId, "propagateNewProjectToOutlets");

            propagated++;
        } catch (e) {
            logMultiOutletFailure('multi_outlet_project_propagation_failed', e, {
                ...getMultiOutletProjectLogContext(outletProjectId, masterProjectId),
                ...getBoundedMultiOutletStringContext('outletStoreId', outlet.storeId),
            });
            failed++;
        }
    }

    return { propagated, failed };
}
