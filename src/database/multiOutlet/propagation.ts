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
import { firebaseClient } from "@lib/firebase/firebaseClient";
import { secureError } from "@lib/security/secureLogger";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

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
        (s: any) => s.storeId !== masterStoreId && s.isMaster !== true,
    );

    if (outletStores.length === 0) return { propagated: 0, failed: 0 };

    let propagated = 0;
    let failed = 0;

    for (let i = 0; i < outletStores.length; i++) {
        const outlet = outletStores[i];
        try {
            const timestamp = Date.now().toString(36);
            const outletProjectId = `${tenantId}-${timestamp}${i > 0 ? i : ''}-${outlet.storeId}`;

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
                [`projects.${outletProjectId}`]: {
                    name: projectName,
                    active: true,
                },
            }, { merge: true });

            propagated++;
        } catch (e) {
            secureError(`[Propagation] Failed for outlet ${outlet.storeId}`, e as Error);
            failed++;
        }
    }

    return { propagated, failed };
}
