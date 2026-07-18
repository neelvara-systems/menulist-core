/**
 * Client Menu Sitemap
 *
 * Generates a sitemap for client menus accessed via subdomain or custom domain.
 * Uses actual store.modifiedOn timestamp for accurate freshness signals to AI
 * crawlers.
 *
 * Example: joespizza.menulist.ai/sitemap.xml → Just Joe's Pizza OBP + menus.
 *
 * ─── T1-N-01 (A-08 + R5 PUBLIC-ROUTING-DOCTRINE) ───────────────────────
 * Sitemap rules (locked):
 *   1. Always include `/` (the OBP).
 *   2. For each ACTIVE project on the master store, include its CANONICAL
 *      slug URL (`/{projectSlug}`). The default project's canonical URL is
 *      its real slug, NOT the `/menu` alias (R5 §9).
 *   3. Include `/menu` ONLY when an owner has claimed slug `menu` (Layer 1
 *      match). The universal Layer 2 alias MUST NOT be indexed because
 *      every tenant would otherwise self-publish a duplicate of its default
 *      project under `/menu`, polluting the index.
 *   4. `previousSlugs[]` entries are NEVER indexed — they 301 to canonical.
 *   5. For multi-outlet tenants (isMaster === true with outlets), include
 *      each active outlet's root (`/{outletSlug}`) and its active projects
 *      (`/{outletSlug}/{projectSlug}`). Outlets without a safe `outletSlug`
 *      and projects without a safe `projectSlug` are filtered out (G-12).
 *
 * @see __docs__/client-menu/public-routing-doctrine.md §8, A-08
 * @see __docs__/discovery-infrastructure/deep-architecture-audit.md — freshness
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { getStoreByCustomDomain, getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { normalizeMultiOutletProjectId } from '@lib/multiOutlet/projectIdBoundary';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';
import { normalizePublicOutletSlug, normalizePublicProjectSlug } from '@lib/publicRouting/pathSegments';
import {
    isMenuListPublicEntityEligible,
    normalizeMenuListPublicEntityIdentityAliases,
} from '@lib/publicTruth/entityEligibility';
import { evaluatePublicTruthIndexability } from '@lib/seo/publicTruthIndexing';
import { secureError } from '@lib/security/secureLogger';
import { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';

type StoreSitemapSeed = {
    storeId: string;
    isMaster: boolean;
    tenantId: number;
    modifiedOn: Date;
    publicStore: Record<string, any>;
};

type ProjectSitemapEntry = {
    slug: string;
    isDefault: boolean;
    active?: boolean;
    deleted?: boolean;
    isSpecialMenu?: boolean;
    name?: unknown;
};

type OutletSitemapEntry = {
    outletSlug: string;
    storeId: string;
    modifiedOn: Date;
    publicStore: Record<string, any>;
};

type TenantSitemapFailureType =
    | 'master_store_lookup_failed'
    | 'outlets_lookup_failed'
    | 'projects_lookup_failed';

const MAX_TENANT_SITEMAP_DIAGNOSTICS = 25;
const MAX_TENANT_SITEMAP_STORES = FEATURE_FLAGS.MAX_OUTLETS_PER_TENANT + 1;
const reportedTenantSitemapFailures = new Set<string>();

const TENANT_SITEMAP_FAILURE_CODES: Record<TenantSitemapFailureType, string> = {
    master_store_lookup_failed: 'tenant_sitemap_master_store_lookup_failed',
    outlets_lookup_failed: 'tenant_sitemap_outlets_lookup_failed',
    projects_lookup_failed: 'tenant_sitemap_projects_lookup_failed',
};

const TENANT_SITEMAP_FALLBACK_POLICIES: Record<TenantSitemapFailureType, string> = {
    master_store_lookup_failed: 'return_empty_sitemap',
    outlets_lookup_failed: 'omit_outlet_sitemap_entries',
    projects_lookup_failed: 'omit_project_sitemap_entries',
};

const getBoundedSitemapStringContext = (
    label: string,
    value: unknown,
): Record<string, boolean | number> => {
    const normalized = value === undefined || value === null ? '' : String(value).trim();
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
};

const getTenantSitemapFailureContext = (
    context: {
        subdomain?: unknown;
        customDomain?: unknown;
        storeId?: unknown;
        masterStoreId?: unknown;
        tenantId?: unknown;
    },
): Record<string, boolean | number> => ({
    ...getBoundedSitemapStringContext('subdomain', context.subdomain),
    ...getBoundedSitemapStringContext('customDomain', context.customDomain),
    ...getBoundedSitemapStringContext('storeId', context.storeId),
    ...getBoundedSitemapStringContext('masterStoreId', context.masterStoreId),
    ...getBoundedSitemapStringContext('tenantId', context.tenantId),
});

const logTenantSitemapFailure = (
    failureType: TenantSitemapFailureType,
    error: unknown,
    context: {
        subdomain?: unknown;
        customDomain?: unknown;
        storeId?: unknown;
        masterStoreId?: unknown;
        tenantId?: unknown;
    } = {},
): void => {
    const failureCode = TENANT_SITEMAP_FAILURE_CODES[failureType];
    const boundedContext = getTenantSitemapFailureContext(context);
    const errorName = error instanceof Error ? error.name : typeof error;
    const failureKey = JSON.stringify({
        failureType,
        errorName,
        boundedContext,
    });

    if (reportedTenantSitemapFailures.has(failureKey)) return;
    if (reportedTenantSitemapFailures.size >= MAX_TENANT_SITEMAP_DIAGNOSTICS) return;
    reportedTenantSitemapFailures.add(failureKey);

    secureError('[Client Sitemap] Tenant sitemap generation degraded', new Error(failureCode), {
        failureCode,
        failureType,
        fallbackPolicy: TENANT_SITEMAP_FALLBACK_POLICIES[failureType],
        ...boundedContext,
        errorName,
    });
};

const readModifiedOn = (raw: any): Date => {
    if (raw?.toDate) return raw.toDate();
    if (typeof raw === 'string') {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
};

const serializeTimestampLike = (raw: any): string | null => {
    if (!raw) return null;
    let date: Date | null = null;
    if (raw?.toDate) {
        date = raw.toDate();
    } else if (raw instanceof Date) {
        date = raw;
    } else if (typeof raw === 'string' || typeof raw === 'number') {
        date = new Date(raw);
    } else if (typeof raw?._seconds === 'number') {
        date = new Date(raw._seconds * 1000);
    } else if (typeof raw?.seconds === 'number') {
        date = new Date(raw.seconds * 1000);
    }
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
};

const buildSitemapPublicStore = (storeId: string, data: Record<string, any>): Record<string, any> => ({
    storeId,
    active: data?.active ?? true,
    blocked: data?.blocked ?? false,
    tenantBlocked: data?.tenantBlocked ?? false,
    blockDetails: data?.blockDetails,
    deleted: data?.deleted ?? false,
    name: data?.name || data?.tenantName || '',
    tenantName: data?.tenantName || '',
    addressLine: data?.addressLine || '',
    area: data?.area || '',
    city: data?.city || '',
    state: data?.state || '',
    phoneNumber: data?.phoneNumber || '',
    alternatePhoneNumber: data?.alternatePhoneNumber || '',
    email: data?.email || '',
    url: data?.url || '',
    workingHours: data?.workingHours || {},
    socialMedia: data?.socialMedia || {},
    publicPresence: data?.publicPresence || {},
    geo: data?.geo,
    primaryProjectId: data?.primaryProjectId || '',
    lastPublishedAt: serializeTimestampLike(data?.lastPublishedAt),
    activePlanType: data?.activePlanType || '',
    onboardingSource: data?.onboardingSource || '',
    starterActivationStatus: data?.starterActivationStatus || '',
    activationDeadline: serializeTimestampLike(data?.activationDeadline),
});

const getMasterStoreSeed = unstable_cache(
    async (subdomain: string, customDomain: string | null): Promise<StoreSitemapSeed | null> => {
        try {
            const data = customDomain
                ? await getStoreByCustomDomain(customDomain)
                : await getStoreBySubdomain(subdomain);
            if (!data) return null;
            if (
                !customDomain
                && (
                    typeof data.subdomain !== 'string'
                    || data.subdomain.toLowerCase() !== subdomain.toLowerCase()
                )
            ) {
                // A previous-subdomain lookup exists only so page requests can
                // 301 to the current host. Never publish a sitemap containing
                // legacy-host URLs while that redirect window is active.
                return null;
            }
            const storeScope = normalizeMenuListPublicEntityIdentityAliases([
                data.id,
                data.storeId,
                data.sId,
            ]);
            const tenantScope = normalizeMenuListPublicEntityIdentityAliases([
                data.tenantId,
                data.tId,
            ]);
            if (!storeScope || !tenantScope) return null;
            return {
                storeId: storeScope.documentId,
                isMaster: data?.isMaster !== false, // default true when missing (single-store)
                tenantId: tenantScope.numericId,
                modifiedOn: readModifiedOn(data?.modifiedOn),
                publicStore: buildSitemapPublicStore(storeScope.documentId, data),
            };
        } catch (error) {
            logTenantSitemapFailure('master_store_lookup_failed', error, {
                subdomain,
                customDomain,
            });
            return null;
        }
    },
    ['sitemap-master-store-seed'],
    { revalidate: 300, tags: ['client-stores'] },
);

async function getProjectsForSitemap(tenantId: number, storeId: string): Promise<ProjectSitemapEntry[]> {
    const getCachedProjects = unstable_cache(
        async (): Promise<ProjectSitemapEntry[]> => {
        try {
            const snap = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
                .doc(`projects_${storeId}`)
                .get();
            if (!snap.exists) return [];
            const projects = parseSummaryProjects(snap.data());
            const entries: ProjectSitemapEntry[] = [];
            for (const [projectId, project] of Object.entries(projects)) {
                const projectScope = normalizeMultiOutletProjectId(projectId);
                if (
                    projectScope?.tenantDocumentId !== String(tenantId)
                    || projectScope.storeDocumentId !== storeId
                ) continue;
                const p = project as Record<string, any>;
                if (p?.active === false) continue;
                if (p?.deleted === true) continue;
                if (p?.isSpecialMenu === true) continue;
                const slug = normalizePublicProjectSlug(p?.slug);
                if (!slug) continue;
                entries.push({
                    slug,
                    isDefault: p?.isDefault === true,
                    active: p?.active,
                    deleted: p?.deleted,
                    isSpecialMenu: p?.isSpecialMenu,
                    name: p?.name,
                });
            }
            return entries;
        } catch (error) {
            logTenantSitemapFailure('projects_lookup_failed', error, {
                storeId,
            });
            return [];
        }
        },
        ['sitemap-projects-for-store', String(tenantId), storeId],
        {
            revalidate: 300,
            tags: ['client-stores', `menu-store-${storeId}`, `store-${storeId}`],
        },
    );
    return getCachedProjects();
}

const getOutletsForSitemap = unstable_cache(
    async (tenantId: number, masterStoreId: string): Promise<OutletSitemapEntry[]> => {
        try {
            // Public tenant discovery must derive tenant membership and store
            // identity from canonical store documents. storesSummary is a
            // client-writable optimization and is never an authorization or
            // public-routing source.
            const snapshot = await firestoreAdmin
                .collection(DB_COLLECTIONS.STORES)
                .where('tenantId', '==', tenantId)
                .where('active', '==', true)
                .limit(MAX_TENANT_SITEMAP_STORES + 1)
                .get();
            if (snapshot.size > MAX_TENANT_SITEMAP_STORES) {
                throw new Error('tenant_sitemap_store_limit_exceeded');
            }
            const outlets: OutletSitemapEntry[] = [];
            for (const d of snapshot.docs) {
                if (d.id === masterStoreId) continue;
                const data = d.data() as Record<string, any>;
                const documentScope = normalizeMenuListPublicEntityIdentityAliases([d.id]);
                const storedStoreScope = normalizeMenuListPublicEntityIdentityAliases([
                    data.storeId,
                    data.sId,
                ]);
                const storedTenantScope = normalizeMenuListPublicEntityIdentityAliases([
                    data.tenantId,
                    data.tId,
                ]);
                if (
                    !isMenuListPublicEntityEligible(data)
                    || !documentScope
                    || !storedStoreScope
                    || !storedTenantScope
                    || documentScope.documentId !== storedStoreScope.documentId
                    || storedTenantScope.numericId !== tenantId
                ) continue;
                const outletSlug = normalizePublicOutletSlug(data?.outletSlug);
                // A-08 + G-12: outlets missing a safe slug are not routable; skip.
                if (!outletSlug) continue;
                outlets.push({
                    outletSlug,
                    storeId: d.id,
                    modifiedOn: readModifiedOn(data?.modifiedOn),
                    publicStore: buildSitemapPublicStore(d.id, data),
                });
            }
            return outlets.sort((a, b) => a.outletSlug.localeCompare(b.outletSlug));
        } catch (error) {
            logTenantSitemapFailure('outlets_lookup_failed', error, {
                tenantId,
                masterStoreId,
            });
            return [];
        }
    },
    ['sitemap-outlets-for-tenant'],
    { revalidate: 300, tags: ['client-stores'] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const tenant = await getTenantFromHeaders('ClientSitemap');
    const { subdomain, customDomain } = tenant;
    const baseUrl = tenant.origin;
    if (!baseUrl || (!subdomain && !customDomain)) return [];

    const seed = await getMasterStoreSeed(subdomain || '', customDomain);
    if (!seed) return [];

    const entries: MetadataRoute.Sitemap = [];

    // Rule 1: OBP root — included only when it is a useful public business
    // truth page. Weak starter/incomplete records remain reachable but stay
    // out of sitemap until enough public facts exist.
    const rootIndexDecision = evaluatePublicTruthIndexability(seed.publicStore, {
        surface: 'obp',
        hasPublishedMenu: Boolean(seed.publicStore.lastPublishedAt || seed.publicStore.primaryProjectId),
    });
    if (rootIndexDecision.includeInSitemap) {
        entries.push({
            url: `${baseUrl}/`,
            lastModified: seed.modifiedOn,
            changeFrequency: 'weekly',
            priority: 1.0,
        });
    }

    // Rule 2 + 3: master-store projects at their canonical slug URLs.
    const masterProjects = await getProjectsForSitemap(seed.tenantId, seed.storeId);
    for (const project of masterProjects) {
        const indexDecision = evaluatePublicTruthIndexability(seed.publicStore, {
            surface: 'menu',
            projectSummary: project,
        });
        if (!indexDecision.includeInSitemap) continue;
        entries.push({
            url: `${baseUrl}/${project.slug}`,
            lastModified: seed.modifiedOn,
            changeFrequency: 'daily',
            priority: project.isDefault ? 0.9 : 0.7,
        });
    }

    // Rule 5: multi-outlet tenants enumerate each outlet root + its projects.
    // Non-master stores (themselves an outlet) never enumerate siblings.
    if (seed.isMaster && seed.tenantId != null) {
        const outlets = await getOutletsForSitemap(seed.tenantId, seed.storeId);
        const outletEntries = await Promise.all(outlets.map(async (outlet) => {
            const scopedEntries: MetadataRoute.Sitemap = [];
            const outletRootDecision = evaluatePublicTruthIndexability(outlet.publicStore, {
                surface: 'outlet_obp',
                hasPublishedMenu: Boolean(outlet.publicStore.lastPublishedAt || outlet.publicStore.primaryProjectId),
            });
            if (outletRootDecision.includeInSitemap) {
                scopedEntries.push({
                    url: `${baseUrl}/${outlet.outletSlug}`,
                    lastModified: outlet.modifiedOn,
                    changeFrequency: 'weekly',
                    priority: 0.8,
                });
            }
            const outletProjects = await getProjectsForSitemap(seed.tenantId, outlet.storeId);
            for (const project of outletProjects) {
                const outletProjectDecision = evaluatePublicTruthIndexability(outlet.publicStore, {
                    surface: 'menu',
                    projectSummary: project,
                });
                if (!outletProjectDecision.includeInSitemap) continue;
                scopedEntries.push({
                    url: `${baseUrl}/${outlet.outletSlug}/${project.slug}`,
                    lastModified: outlet.modifiedOn,
                    changeFrequency: 'daily',
                    priority: project.isDefault ? 0.7 : 0.6,
                });
            }
            return scopedEntries;
        }));
        entries.push(...outletEntries.flat());
    }

    return entries;
}
