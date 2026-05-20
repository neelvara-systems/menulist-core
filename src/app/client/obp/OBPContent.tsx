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
import { firestoreAdmin } from "@lib/firebase/firebaseAdmin";
import {
    getStoreByCustomDomain,
    getStoreBySubdomain,
} from "@lib/firestore/clientStoreLookup";
import { parseSummaryProjects } from "@lib/firestore/parseSummaryProjects";
import { resolveStorePublicLanguage } from "@lib/localization/publicRenderLanguage";
import { getTenantFromHeaders as sharedGetTenantFromHeaders } from "@lib/multiTenant/getTenantFromHeaders";
import { isStarterPublicSurfaceExpired } from "@lib/onboarding/starterActivation";
import { isPlatformEntityBlocked } from "@lib/platform/entityBlock";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import BrandOBPContent from "./BrandOBPContent";
import OBPResolvedSurface, { type ObpMenuInfo } from "./OBPResolvedSurface";
import StarterActivationHoldingPage from "@/components/customer/StarterActivationHoldingPage";

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
    async (storeId: number, activeSpecialMenuId?: string): Promise<ObpMenuInfo> => {
        const empty: ObpMenuInfo = { hasMenu: false, defaultSlug: undefined, projects: [] };
        try {
            const summarySnap = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .doc(`projects_${storeId}`)
                .get();
            if (!summarySnap.exists) return empty;
            const raw = parseSummaryProjects(summarySnap.data());
            const entries = Object.entries(raw).map(([projectId, data]: [string, any]) => ({ projectId, ...data }));
            const activeRegular = entries.filter(
                (project: any) => project.active !== false && project.deleted !== true && !project.isSpecialMenu,
            );
            if (activeRegular.length === 0) return empty;

            const defaultProj: any = activeRegular.find((project: any) => project.isDefault === true) || activeRegular[0];
            const activeSpecial = activeSpecialMenuId
                ? entries.find((project: any) => {
                    if (project.projectId !== activeSpecialMenuId) return false;
                    if (project.active === false || project.deleted === true || project.isSpecialMenu !== true) return false;
                    if (project.specialMenuStatus !== 'active') return false;
                    const endsAtMs = project.specialMenuEndsAt ? new Date(project.specialMenuEndsAt).getTime() : null;
                    return !endsAtMs || endsAtMs > Date.now();
                })
                : null;
            const others = activeRegular.filter((project: any) => project !== defaultProj);
            const ordered = [
                ...(activeSpecial ? [activeSpecial] : []),
                defaultProj,
                ...others,
            ];

            const projects = ordered
                .map((project: any) => ({
                    projectId: project.projectId,
                    slug: (project.slug as string) || '',
                    name: project.isSpecialMenu ? (project.specialMenuDisplayName || project.name) : project.name,
                    isDefault: !project.isSpecialMenu && project === defaultProj,
                    projectImage: (project.projectImage as string) || null,
                    isSpecialMenu: project.isSpecialMenu === true,
                    specialMenuBaseProjectId: project.specialMenuBaseProjectId,
                    specialMenuDisplayName: project.specialMenuDisplayName,
                }))
                .map((project) => {
                    if (!project.isSpecialMenu) return project;
                    const baseProject = activeRegular.find((candidate: any) => candidate.projectId === project.specialMenuBaseProjectId) || defaultProj;
                    return {
                        ...project,
                        slug: (baseProject?.slug as string) || project.slug,
                    };
                })
                .filter((project) => project.slug && project.name);

            return {
                hasMenu: true,
                defaultSlug: (defaultProj?.slug as string) || undefined,
                projects,
            };
        } catch {
            return empty;
        }
    },
    ['obp-menu-info'],
    { revalidate: 60, tags: ['client-stores'] },
);

const countActiveStoresForTenant = unstable_cache(
    async (tenantId: number): Promise<number> => {
        try {
            const summarySnap = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .doc("storesSummary")
                .get();
            if (!summarySnap.exists) return 1;
            const stores = summarySnap.data()?.stores || {};
            return Object.values(stores).filter(
                (store: any) => store.tId === tenantId && store.active !== false && !isPlatformEntityBlocked(store),
            ).length;
        } catch {
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
                storeName={storeData?.name || storeData?.businessName || null}
            />
        );
    }

    if (!storeOverride && storeData.isMaster) {
        const outletCount = await withTimeout(countActiveStoresForTenant(storeData.tenantId));
        if (outletCount > 1) {
            const baseUrl = customDomain
                ? `https://${customDomain}`
                : `https://${subdomain}.menulist.ai`;
            return (
                <BrandOBPContent
                    store={storeData}
                    baseUrl={baseUrl}
                    requestedLanguage={contentLanguage}
                />
            );
        }
    }

    const menuInfo = await withTimeout(getObpMenuInfo(storeData.storeId, storeData.activeSpecialMenuId))
        .catch(() => ({ hasMenu: false, defaultSlug: undefined, projects: [] } as ObpMenuInfo));

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
