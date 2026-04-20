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
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

export type ClientStoreLookupResult =
    | ({ id: string } & Record<string, any>)
    | null;

const buildStoreRef = () => collection(firebaseClient, DB_COLLECTIONS.STORES);

export const getStoreBySubdomain = cache(
    unstable_cache(
        async (subdomain: string): Promise<ClientStoreLookupResult> => {
            const normalized = subdomain.toLowerCase();
            // Primary: direct match on current subdomain.
            const directQuery = query(
                buildStoreRef(),
                where('subdomain', '==', normalized),
                where('active', '==', true),
                limit(1),
            );
            const directSnap = await getDocs(directQuery);
            if (!directSnap.empty) {
                return { id: directSnap.docs[0].id, ...directSnap.docs[0].data() };
            }
            // T1-N-05 / A-03 PUBLIC-ROUTING-DOCTRINE: admin-tier rename chain.
            // Check if any active store has this subdomain in its
            // `previousSubdomains[].subdomain` within the 12-month window.
            // Firestore can't index nested array fields, so we query on a
            // denormalized shadow key `previousSubdomainSlugs` (array of
            // strings) written alongside `previousSubdomains` by the admin
            // rename endpoint. Each entry is filtered here against its
            // expiresAt on the object to honor the 12-month ceiling.
            const chainQuery = query(
                buildStoreRef(),
                where('previousSubdomainSlugs', 'array-contains', normalized),
                where('active', '==', true),
                limit(1),
            );
            const chainSnap = await getDocs(chainQuery);
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
            return { id: doc.id, ...data };
        },
        ['client-store-subdomain'],
        { revalidate: 60, tags: ['client-stores'] },
    ),
);

export const getStoreByCustomDomain = cache(
    unstable_cache(
        async (domain: string): Promise<ClientStoreLookupResult> => {
            const q = query(
                buildStoreRef(),
                where('customDomain', '==', domain.toLowerCase()),
                where('domainVerified', '==', true),
                where('active', '==', true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
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
            const directQuery = query(
                buildStoreRef(),
                where('tenantId', '==', tenantId),
                where('outletSlug', '==', normalized),
                where('active', '==', true),
                limit(1),
            );
            const directSnap = await getDocs(directQuery);
            if (!directSnap.empty) {
                return { id: directSnap.docs[0].id, ...directSnap.docs[0].data() };
            }
            // Fallback: rename-chain lookup via previousOutletSlugs[]. Mirrors
            // the project-slug chain mechanism on outlet stores.
            const chainQuery = query(
                buildStoreRef(),
                where('tenantId', '==', tenantId),
                where('previousOutletSlugs', 'array-contains', normalized),
                where('active', '==', true),
                limit(1),
            );
            const chainSnap = await getDocs(chainQuery);
            if (chainSnap.empty) return null;
            return { id: chainSnap.docs[0].id, ...chainSnap.docs[0].data() };
        },
        ['client-store-outlet-slug'],
        { revalidate: 60, tags: ['client-stores'] },
    ),
);
