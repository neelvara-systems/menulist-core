/**
 * OBP Content — Async Server Component
 *
 * Fetches store/menu data, handles tenant/outlet routing, and renders the
 * shared production OBP surface. The visual surface itself is shared with
 * desktop and mobile editor previews so previews do not drift from prod.
 *
 * @see __docs__/official-business-page/official-business-page_impl.md §7
 */

import { DB_COLLECTIONS } from "@constant/database";
import { FEATURE_FLAGS } from "@config/features";
import { PLATFORM_DOMAIN } from "@constant/urls";
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import {
    getStoreByCustomDomain,
    getStoreBySubdomain,
} from "@lib/firestore/clientStoreLookup";
import {
    isActiveRegularSummaryProject,
    isCurrentActiveSpecialSummaryProject,
    isDefaultSummaryProject,
    normalizeSummaryProjectLocalizedText,
    parseSummaryProjects,
    withAuthoritativeSummaryProjectId,
} from "@lib/firestore/parseSummaryProjects";
import { resolveStorePublicLanguage } from "@lib/localization/publicRenderLanguage";
import { normalizeMultiOutletProjectId } from "@lib/multiOutlet/projectIdBoundary";
import { getTenantFromHeaders as sharedGetTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import { isStarterPublicSurfaceExpired } from "@lib/onboarding/starterActivation";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { normalizePublicProjectSlug } from "@lib/publicRouting/pathSegments";
import { getBoundedRuntimeStringContext, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import BrandOBPContent from "./BrandOBPContent";
import OBPResolvedSurface, { type ObpMenuInfo } from "./OBPResolvedSurface";
import StarterActivationHoldingPage from "@/components/customer/StarterActivationHoldingPage";

type ObpServerFailureContext = {
    storeId?: unknown;
    tenantId?: unknown;
    tenantType?: unknown;
    activeSpecialMenuId?: unknown;
    operation: string;
};

function logObpServerResolutionFailure(
    failureCode: string,
    error: unknown,
    context: ObpServerFailureContext,
): void {
    logRuntimeFailure(failureCode, error, {
        ...getBoundedRuntimeStringContext('storeId', context.storeId),
        ...getBoundedRuntimeStringContext('tenantId', context.tenantId),
        ...getBoundedRuntimeStringContext('tenantType', context.tenantType),
        ...getBoundedRuntimeStringContext('activeSpecialMenuId', context.activeSpecialMenuId),
        ...getBoundedRuntimeStringContext('operation', context.operation),
    });
}

async function withTimeout<T>(promise: Promise<T>, ms: number = 5000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`OBP: Firestore read timed out after ${ms}ms`)), ms)
        ),
    ]);
}

async function withRetry<T>(
    fn: () => Promise<T>,
    retries: number = 1,
    delayMs: number = 1000,
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            return withRetry(fn, retries - 1, delayMs);
        }
        throw error;
    }
}

/**
 * OBP menu info — consolidated (G-05 + G-06 PUBLIC-ROUTING-DOCTRINE).
 *
 * Single cached read of `platformSummary/projects_{storeId}` that returns
 * everything OBP's render needs: the hasMenu boolean, the default-project
 * slug, and the full active-projects list for per-project CTA rendering.
 */
const getObpMenuInfo = unstable_cache(
    async (tenantId: number, storeId: number, activeSpecialMenuId?: string): Promise<ObpMenuInfo> => {
        const empty: ObpMenuInfo = { hasMenu: false, defaultSlug: undefined, projects: [] };
        try {
            const summarySnap = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .doc(`projects_${storeId}`)
                .get();
            if (!summarySnap.exists) return empty;
            const raw = parseSummaryProjects(summarySnap.data());
            const entries = Object.entries(raw)
                .flatMap(([projectId, data]) => {
                    const projectScope = normalizeMultiOutletProjectId(projectId);
                    return projectScope?.tenantDocumentId === String(tenantId)
                        && projectScope.storeDocumentId === String(storeId)
                        ? [withAuthoritativeSummaryProjectId(projectId, data)]
                        : [];
                });
            const activeRegular = entries.filter(isActiveRegularSummaryProject);
            if (activeRegular.length === 0) return empty;

            const defaultProj = activeRegular.find(isDefaultSummaryProject) || activeRegular[0];
            const activeSpecial = activeSpecialMenuId
                ? entries.find((project) => isCurrentActiveSpecialSummaryProject(project, activeSpecialMenuId, Date.now()))
                : null;
            const others = activeRegular.filter((project) => project !== defaultProj);
            const ordered = [
                ...(activeSpecial ? [activeSpecial] : []),
                defaultProj,
                ...others,
            ];

            const projects = ordered
                .flatMap((project) => {
                    const projectSlug = normalizePublicProjectSlug(project.slug);
                    const name = normalizeSummaryProjectLocalizedText(
                        project.isSpecialMenu ? (project.specialMenuDisplayName || project.name) : project.name,
                    );
                    if (!name) return [];
                    return [{
                        projectId: project.projectId,
                        slug: projectSlug || '',
                        name,
                        isDefault: !project.isSpecialMenu && project === defaultProj,
                        projectImage: typeof project.projectImage === 'string' && project.projectImage.trim()
                            ? project.projectImage
                            : null,
                        isSpecialMenu: project.isSpecialMenu === true,
                        specialMenuBaseProjectId: typeof project.specialMenuBaseProjectId === 'string'
                            ? project.specialMenuBaseProjectId
                            : undefined,
                        specialMenuDisplayName: normalizeSummaryProjectLocalizedText(project.specialMenuDisplayName) || undefined,
                    }];
                })
                .map((project) => {
                    if (!project.isSpecialMenu) return project;
                    const baseProject = activeRegular.find((candidate) => candidate.projectId === project.specialMenuBaseProjectId) || defaultProj;
                    const baseProjectSlug = normalizePublicProjectSlug(baseProject?.slug);
                    return {
                        ...project,
                        slug: baseProjectSlug || project.slug,
                    };
                })
                .filter((project) => project.slug && project.name);

            return {
                hasMenu: true,
                defaultSlug: normalizePublicProjectSlug(defaultProj?.slug) || undefined,
                projects,
            };
        } catch (error) {
            logObpServerResolutionFailure('public_obp_menu_info_lookup_failed', error, {
                storeId,
                tenantId,
                activeSpecialMenuId,
                operation: 'menu_info_lookup',
            });
            return empty;
        }
    },
    ['obp-menu-info'],
    { revalidate: 60, tags: ['client-stores'] },
);

const countActiveStoresForTenant = unstable_cache(
    async (tenantId: number): Promise<number> => {
        try {
            const storesSnap = await firestoreAdmin
                .collection(DB_COLLECTIONS.STORES)
                .where("tenantId", "==", tenantId)
                .where("active", "==", true)
                .limit(FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT + 1)
                .get();
            return storesSnap.docs.filter((storeDoc) => !isPlatformEntityBlocked(storeDoc.data())).length;
        } catch (error) {
            logObpServerResolutionFailure('public_obp_store_count_lookup_failed', error, {
                tenantId,
                operation: 'store_count_lookup',
            });
            return 1;
        }
    },
    ['obp-tenant-store-count'],
    { revalidate: 60, tags: ['client-stores'] },
);

async function getTenantFromHeaders() {
    return sharedGetTenantFromHeaders('OBPContent');
}

interface OBPContentProps {
    /**
     * When set, render the given outlet's OBP instead of resolving store from
     * host headers. MenuContent uses this for `/{outletSlug}`.
     */
    storeOverride?: any;
    /** Origin context for outlet renders; outlets inherit master origin. */
    masterSubdomain?: string;
    masterCustomDomain?: string;
    /** Master brand display name for outlet breadcrumb. */
    masterBrandName?: string;
    requestedLanguage?: string | string[] | null;
}

export default async function OBPContent({
    storeOverride,
    masterSubdomain,
    masterCustomDomain,
    masterBrandName,
    requestedLanguage,
}: OBPContentProps = {}) {
    const { subdomain, customDomain, tenantType } = await getTenantFromHeaders();

    let storeData: any = storeOverride ?? null;
    if (!storeData) {
        if (tenantType === "subdomain" && subdomain) {
            storeData = await withRetry(() => withTimeout(getStoreBySubdomain(subdomain)));
        } else if (tenantType === "custom" && customDomain) {
            storeData = await withRetry(() => withTimeout(getStoreByCustomDomain(customDomain)));
        }
    }

    if (!storeData) {
        notFound();
    }

    const contentLanguage = resolveStorePublicLanguage(storeData, requestedLanguage);
    if (isStarterPublicSurfaceExpired(storeData)) {
        return (
            <StarterActivationHoldingPage
                activePlanType={storeData?.activePlanType || null}
                storeName={storeData?.name || storeData?.businessName || null}
            />
        );
    }

    if (!storeOverride && storeData.isMaster) {
        const outletCount = await withTimeout(countActiveStoresForTenant(storeData.tenantId));
        if (outletCount > 1) {
            const baseUrl = customDomain
                ? `https://${customDomain}`
                : `https://${subdomain}.${PLATFORM_DOMAIN}`;
            return (
                <BrandOBPContent
                    store={storeData}
                    baseUrl={baseUrl}
                    requestedLanguage={contentLanguage}
                />
            );
        }
    }

    const menuInfo = await withTimeout(getObpMenuInfo(
        storeData.tenantId,
        storeData.storeId,
        storeData.activeSpecialMenuId,
    ))
        .catch((error) => {
            logObpServerResolutionFailure('public_obp_menu_info_resolution_failed', error, {
                storeId: storeData.storeId,
                tenantId: storeData.tenantId,
                tenantType,
                activeSpecialMenuId: storeData.activeSpecialMenuId,
                operation: 'menu_info_resolution',
            });
            return { hasMenu: false, defaultSlug: undefined, projects: [] } as ObpMenuInfo;
        });

    return (
        <OBPResolvedSurface
            includeRuntime
            isOutletSurface={Boolean(storeOverride)}
            masterBrandName={masterBrandName}
            masterCustomDomain={masterCustomDomain}
            masterSubdomain={masterSubdomain}
            menuInfo={menuInfo}
            requestedLanguage={requestedLanguage}
            store={storeData}
        />
    );
}
