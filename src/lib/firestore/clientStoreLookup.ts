/**
 * Shared client-menu store lookup helpers.
 *
 * Previously each public client page (OBP, menu, compliance) defined its own
 * copy of `getStoreBySubdomain` / `getStoreByCustomDomain` with DIFFERENT
 * `unstable_cache` keys. That meant the same Firestore query ran up to three
 * times per user journey (once per page type) because the caches did not share.
 *
 * This module consolidates them under a SINGLE cache key per function so
 * navigating OBP → menu → /privacy hits the cache on the 2nd/3rd page.
 *
 * Usage:
 *   import { getStoreBySubdomain } from '@lib/firestore/clientStoreLookup';
 *   const store = await getStoreBySubdomain(subdomain);
 *
 * Caching layers:
 *   - React `cache()` — request-scoped dedup (within a single SSR request)
 *   - `unstable_cache()` — cross-request Vercel Data Cache (60s revalidate)
 *   - Tag `client-stores` — invalidated by owner publish / store update
 *
 * @see __docs__/url-routing-architecture/README.md
 */

import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isPlatformEntityBlocked } from '@lib/platform/entityBlock';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

export type ClientStoreLookupResult =
    | ({ id: string } & Record<string, any>)
    | null;

const buildStoreCollection = () => firestoreAdmin.collection(DB_COLLECTIONS.STORES);
const buildTenantDocRef = (tenantId: string | number) => firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(String(tenantId));

async function isStoreOrTenantBlocked(store: Record<string, any>): Promise<boolean> {
    if (isPlatformEntityBlocked(store)) return true;

    const tenantId = store?.tenantId ?? store?.tId;
    if (tenantId == null || tenantId === '') return false;

    const tenantSnap = await buildTenantDocRef(tenantId).get();
    if (!tenantSnap.exists) return false;

    return isPlatformEntityBlocked(tenantSnap.data());
}

export const getStoreBySubdomain = cache(
    unstable_cache(
        async (subdomain: string): Promise<ClientStoreLookupResult> => {
            const normalized = subdomain.toLowerCase();
            // Primary: direct match on current subdomain.
            const directSnap = await buildStoreCollection()
                .where('subdomain', '==', normalized)
                .where('active', '==', true)
                .limit(1)
                .get();
            if (!directSnap.empty) {
                const data = { id: directSnap.docs[0].id, ...directSnap.docs[0].data() };
                return await isStoreOrTenantBlocked(data) ? null : data;
            }
            // T1-N-05 / A-03 PUBLIC-ROUTING-DOCTRINE: admin-tier rename chain.
            // Check if any active store has this subdomain in its
            // `previousSubdomains[].subdomain` within the 12-month window.
            // Firestore can't index nested array fields, so we query on a
            // denormalized shadow key `previousSubdomainSlugs` (array of
            // strings) written alongside `previousSubdomains` by the admin
            // rename endpoint. Each entry is filtered here against its
            // expiresAt on the object to honor the 12-month ceiling.
            const chainSnap = await buildStoreCollection()
                .where('previousSubdomainSlugs', 'array-contains', normalized)
                .where('active', '==', true)
                .limit(1)
                .get();
            if (chainSnap.empty) return null;
            const doc = chainSnap.docs[0];
            const data = doc.data() as Record<string, any>;
            const history: Array<{ subdomain?: string; expiresAt?: any }> = Array.isArray(
                data?.previousSubdomains,
            )
                ? data.previousSubdomains
                : [];
            const nowMs = Date.now();
            const match = history.find((entry) => {
                if ((entry?.subdomain || '').toLowerCase() !== normalized) return false;
                const expiresAtMs =
                    entry?.expiresAt?.toMillis?.() ??
                    (typeof entry?.expiresAt === 'string' ? Date.parse(entry.expiresAt) : NaN);
                return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
            });
            if (!match) return null;
            const storeData = { id: doc.id, ...data };
            return await isStoreOrTenantBlocked(storeData) ? null : storeData;
        },
        ['client-store-subdomain'],
        { revalidate: 60, tags: ['client-stores'] },
    ),
);

export const getStoreByCustomDomain = cache(
    unstable_cache(
        async (domain: string): Promise<ClientStoreLookupResult> => {
            const snapshot = await buildStoreCollection()
                .where('customDomain', '==', domain.toLowerCase())
                .where('domainVerified', '==', true)
                .where('active', '==', true)
                .limit(1)
                .get();
            if (snapshot.empty) return null;
            const data = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
            return await isStoreOrTenantBlocked(data) ? null : data;
        },
        ['client-store-custom-domain'],
        { revalidate: 60, tags: ['client-stores'] },
    ),
);

/**
 * Lookup outlet store by outletSlug within a tenant (URL Routing Architecture — Gap 2).
 * Used when the first path segment matches an outlet slug instead of a project slug.
 *
 * G-07 (§11 + §7 PUBLIC-ROUTING-DOCTRINE): outlet slug rename chain. When
 * the direct `outletSlug == slug` query misses, we fall back to querying
 * `previousOutletSlugs array-contains slug`. That second query matches
 * outlets whose old slug was renamed, so physical QRs / printed signage
 * keep resolving. The caller inspects the returned store's current
 * `outletSlug` to detect a chain hit and emit a 301 to the canonical URL.
 */
export const getStoreByOutletSlug = cache(
    unstable_cache(
        async (tenantId: number, outletSlug: string): Promise<ClientStoreLookupResult> => {
            const normalized = outletSlug.toLowerCase();
            // Primary: direct match on current slug.
            const directSnap = await buildStoreCollection()
                .where('tenantId', '==', tenantId)
                .where('outletSlug', '==', normalized)
                .where('active', '==', true)
                .limit(1)
                .get();
            if (!directSnap.empty) {
                const data = { id: directSnap.docs[0].id, ...directSnap.docs[0].data() };
                return await isStoreOrTenantBlocked(data) ? null : data;
            }
            // Fallback: rename-chain lookup via previousOutletSlugs[]. Mirrors
            // the project-slug chain mechanism on outlet stores.
            const chainSnap = await buildStoreCollection()
                .where('tenantId', '==', tenantId)
                .where('previousOutletSlugs', 'array-contains', normalized)
                .where('active', '==', true)
                .limit(1)
                .get();
            if (chainSnap.empty) return null;
            const data = { id: chainSnap.docs[0].id, ...chainSnap.docs[0].data() };
            return await isStoreOrTenantBlocked(data) ? null : data;
        },
        ['client-store-outlet-slug'],
        { revalidate: 60, tags: ['client-stores'] },
    ),
);
