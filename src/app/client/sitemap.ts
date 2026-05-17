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
 *      (`/{outletSlug}/{projectSlug}`). Outlets without `outletSlug` are
 *      filtered out (G-12).
 *
 * @see __docs__/client-menu/PUBLIC-ROUTING-DOCTRINE.md §8, A-08
 * @see __docs__/discovery-infrastructure/deep-architecture-audit.md — freshness
 */

import { DB_COLLECTIONS } from '@constant/database';
import { PLATFORM_DOMAIN } from '@constant/urls';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { parseSummaryProjects } from '@lib/firestore/parseSummaryProjects';
import { parseSummaryStores } from '@lib/firestore/parseSummaryStores';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

type StoreSitemapSeed = {
    storeId: string;
    isMaster: boolean;
    tenantId: number | null;
    modifiedOn: Date;
};

type ProjectSitemapEntry = {
    slug: string;
    isDefault: boolean;
};

type OutletSitemapEntry = {
    outletSlug: string;
    storeId: string;
    modifiedOn: Date;
};

const getRequestHostname = (value: string | null): string => {
    if (!value) return '';
    return value
        .split(',')[0]
        .trim()
        .toLowerCase()
        .replace(/:\d+$/, '');
};

const isLocalHostname = (hostname: string): boolean =>
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');

const readModifiedOn = (raw: any): Date => {
    if (raw?.toDate) return raw.toDate();
    if (typeof raw === 'string') {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
};

const getMasterStoreSeed = unstable_cache(
    async (subdomain: string, customDomain: string | null): Promise<StoreSitemapSeed | null> => {
        try {
            const storesRef = firestoreAdmin.collection(DB_COLLECTIONS.STORES);
            const q = customDomain
                ? storesRef
                    .where('customDomain', '==', customDomain.toLowerCase())
                    .where('domainVerified', '==', true)
                    .where('active', '==', true)
                    .limit(1)
                : storesRef
                    .where('subdomain', '==', subdomain.toLowerCase())
                    .where('active', '==', true)
                    .limit(1);
            const snapshot = await q.get();
            if (snapshot.empty) return null;
            const storeDoc = snapshot.docs[0];
            const data = storeDoc.data() as Record<string, any>;
            return {
                storeId: storeDoc.id,
                isMaster: data?.isMaster !== false, // default true when missing (single-store)
                tenantId: typeof data?.tenantId === 'number' ? data.tenantId : null,
                modifiedOn: readModifiedOn(data?.modifiedOn),
            };
        } catch {
            return null;
        }
    },
    ['sitemap-master-store-seed'],
    { revalidate: 300, tags: ['client-stores'] },
);

const getProjectsForSitemap = unstable_cache(
    async (storeId: string): Promise<ProjectSitemapEntry[]> => {
        try {
            const snap = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY || 'platformSummary')
                .doc(`projects_${storeId}`)
                .get();
            if (!snap.exists) return [];
            const projects = parseSummaryProjects(snap.data());
            const entries: ProjectSitemapEntry[] = [];
            for (const project of Object.values(projects)) {
                const p = project as Record<string, any>;
                if (p?.active === false) continue;
                if (p?.deleted === true) continue;
                const slug = typeof p?.slug === 'string' ? p.slug.trim() : '';
                if (!slug) continue;
                entries.push({ slug, isDefault: p?.isDefault === true });
            }
            return entries;
        } catch {
            return [];
        }
    },
    ['sitemap-projects-for-store'],
    { revalidate: 300, tags: ['client-stores', 'projects-summary'] },
);

const getOutletsForSitemap = unstable_cache(
    async (tenantId: number, masterStoreId: string): Promise<OutletSitemapEntry[]> => {
        try {
            const summarySnap = await firestoreAdmin
                .collection(DB_COLLECTIONS.PLATFORM_SUMMARY || 'platformSummary')
                .doc('storesSummary')
                .get();
            if (summarySnap.exists) {
                const stores = parseSummaryStores(summarySnap.data());
                const summaryOutlets = Object.entries(stores)
                    .filter(([storeId, data]: [string, any]) => {
                        if (String(data?.storeId || storeId) === masterStoreId) return false;
                        if (data?.tId !== tenantId) return false;
                        if (data?.active === false) return false;
                        if (isPlatformEntityBlocked(data)) return false;
                        const outletSlug = typeof data?.outletSlug === 'string' ? data.outletSlug.trim() : '';
                        return Boolean(outletSlug);
                    })
                    .map(([storeId, data]: [string, any]) => ({
                        outletSlug: data.outletSlug.trim(),
                        storeId: String(data.storeId || storeId),
                        modifiedOn: readModifiedOn(data.modifiedOn),
                    }))
                    .sort((a, b) => a.outletSlug.localeCompare(b.outletSlug));

                if (summaryOutlets.length > 0) return summaryOutlets;
            }

            const snapshot = await firestoreAdmin
                .collection(DB_COLLECTIONS.STORES)
                .where('tenantId', '==', tenantId)
                .where('active', '==', true)
                .get();
            const outlets: OutletSitemapEntry[] = [];
            for (const d of snapshot.docs) {
                if (d.id === masterStoreId) continue;
                const data = d.data() as Record<string, any>;
                const outletSlug = typeof data?.outletSlug === 'string' ? data.outletSlug.trim() : '';
                // A-08 + G-12: outlets missing a slug are not routable; skip.
                if (!outletSlug) continue;
                outlets.push({ outletSlug, storeId: d.id, modifiedOn: readModifiedOn(data?.modifiedOn) });
            }
            return outlets;
        } catch {
            return [];
        }
    },
    ['sitemap-outlets-for-tenant'],
    { revalidate: 300, tags: ['client-stores'] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const headersList = headers();
    const subdomain = headersList.get('x-tenant-subdomain');
    const customDomain = headersList.get('x-tenant-custom-domain');
    const requestHostname = getRequestHostname(headersList.get('x-forwarded-host') || headersList.get('host'));

    let baseUrl: string;
    if (customDomain) {
        baseUrl = `https://${customDomain}`;
    } else if (subdomain && requestHostname && !isLocalHostname(requestHostname)) {
        baseUrl = `https://${requestHostname}`;
    } else if (subdomain) {
        baseUrl = `https://${subdomain}.${PLATFORM_DOMAIN}`;
    } else {
        // Fallback — shouldn't happen in production (middleware sets headers).
        return [];
    }

    const seed = await getMasterStoreSeed(subdomain || '', customDomain);
    if (!seed) return [];

    const entries: MetadataRoute.Sitemap = [];

    // Rule 1: OBP root — always included, highest priority.
    entries.push({
        url: `${baseUrl}/`,
        lastModified: seed.modifiedOn,
        changeFrequency: 'weekly',
        priority: 1.0,
    });

    // Rule 2 + 3: master-store projects at their canonical slug URLs.
    const masterProjects = await getProjectsForSitemap(seed.storeId);
    for (const project of masterProjects) {
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
        for (const outlet of outlets) {
            entries.push({
                url: `${baseUrl}/${outlet.outletSlug}`,
                lastModified: outlet.modifiedOn,
                changeFrequency: 'weekly',
                priority: 0.8,
            });
            const outletProjects = await getProjectsForSitemap(outlet.storeId);
            for (const project of outletProjects) {
                entries.push({
                    url: `${baseUrl}/${outlet.outletSlug}/${project.slug}`,
                    lastModified: outlet.modifiedOn,
                    changeFrequency: 'daily',
                    priority: project.isDefault ? 0.7 : 0.6,
                });
            }
        }
    }

    return entries;
}
