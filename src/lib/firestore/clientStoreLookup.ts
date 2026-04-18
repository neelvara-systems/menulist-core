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
            const q = query(
                buildStoreRef(),
                where('subdomain', '==', subdomain.toLowerCase()),
                where('active', '==', true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
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
 */
export const getStoreByOutletSlug = cache(
    unstable_cache(
        async (tenantId: number, outletSlug: string): Promise<ClientStoreLookupResult> => {
            const q = query(
                buildStoreRef(),
                where('tenantId', '==', tenantId),
                where('outletSlug', '==', outletSlug.toLowerCase()),
                where('active', '==', true),
                limit(1),
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        },
        ['client-store-outlet-slug'],
        { revalidate: 60, tags: ['client-stores'] },
    ),
);
