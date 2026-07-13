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
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import {
    isMenuListPublicEntityEligible,
    normalizeMenuListPublicEntityIdentityAliases,
} from '@lib/publicTruth/entityEligibility';
import { unstable_cache } from 'next/cache';
import { cache } from 'react';

export type ClientStoreLookupResult =
    | ({ id: string } & Record<string, any>)
    | null;

const buildStoreCollection = () => firestoreAdmin.collection(DB_COLLECTIONS.STORES);
const buildTenantDocRef = (tenantId: string) => firestoreAdmin.collection(DB_COLLECTIONS.TENANTS).doc(tenantId);

type ClientStoreLookupScopeDocumentId = {
    numericId: number;
    documentId: string;
};

const normalizeClientStoreLookupScopeDocumentId = (value: unknown): ClientStoreLookupScopeDocumentId | null => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { numericId, documentId }
        : null;
};

async function isStoreOrTenantIneligible(store: Record<string, any>): Promise<boolean> {
    if (!isMenuListPublicEntityEligible(store)) return true;
    const storeDocumentScope = normalizeClientStoreLookupScopeDocumentId(store?.id);
    const storedStoreScope = normalizeMenuListPublicEntityIdentityAliases([store?.storeId, store?.sId]);
    if (!storeDocumentScope || !storedStoreScope || storeDocumentScope.documentId !== storedStoreScope.documentId) {
        return true;
    }
    const tenantScope = normalizeMenuListPublicEntityIdentityAliases([store?.tenantId, store?.tId]);
    if (!tenantScope) return true;

    const tenantSnap = await buildTenantDocRef(tenantScope.documentId).get();
    if (!tenantSnap.exists) return true;
    const tenantData = tenantSnap.data();
    if (!isMenuListPublicEntityEligible(tenantData)) return true;
    const tenantIdentityValues = [tenantData?.tenantId, tenantData?.tId]
        .filter((value) => value !== undefined && value !== null);
    if (tenantIdentityValues.length === 0) return false;
    const tenantIdentityScope = normalizeMenuListPublicEntityIdentityAliases(tenantIdentityValues);

    return tenantIdentityScope?.documentId !== tenantScope.documentId;
}

export const getStoreBySubdomain = cache(
    unstable_cache(
        async (subdomain: string): Promise<ClientStoreLookupResult> => {
            const normalized = subdomain.toLowerCase();
            // Primary: direct match on current subdomain.
            const directSnap = await buildStoreCollection()
                .where('subdomain', '==', normalized)
                .where('active', '==', true)
                .limit(2)
                .get();
            if (directSnap.size > 1) return null;
            if (directSnap.size === 1) {
                const data = { ...directSnap.docs[0].data(), id: directSnap.docs[0].id };
                return await isStoreOrTenantIneligible(data) ? null : data;
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
                .limit(20)
                .get();
            if (chainSnap.empty) return null;
            const nowMs = Date.now();
            const matchingDocs = chainSnap.docs.filter((doc) => {
                const data = doc.data() as Record<string, any>;
                const history: Array<{ subdomain?: string; expiresAt?: any }> = Array.isArray(
                    data?.previousSubdomains,
                )
                    ? data.previousSubdomains
                    : [];
                return history.some((entry) => {
                    if ((entry?.subdomain || '').toLowerCase() !== normalized) return false;
                    const expiresAtMs =
                        entry?.expiresAt?.toMillis?.() ??
                        (typeof entry?.expiresAt === 'string' ? Date.parse(entry.expiresAt) : NaN);
                    return Number.isFinite(expiresAtMs) && expiresAtMs > nowMs;
                });
            });
            if (matchingDocs.length !== 1 || chainSnap.size >= 20) return null;
            const doc = matchingDocs[0];
            const storeData = { ...doc.data(), id: doc.id };
            return await isStoreOrTenantIneligible(storeData) ? null : storeData;
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
                .limit(2)
                .get();
            if (snapshot.size !== 1) return null;
            const data = { ...snapshot.docs[0].data(), id: snapshot.docs[0].id };
            return await isStoreOrTenantIneligible(data) ? null : data;
        },
        ['client-store-custom-domain'],
        { revalidate: 60, tags: ['client-stores'] },
    ),
);

export const getPublicStoreById = cache(
    unstable_cache(
        async (storeId: string | number): Promise<ClientStoreLookupResult> => {
            const storeScope = normalizeClientStoreLookupScopeDocumentId(storeId);
            if (!storeScope) return null;

            const snap = await buildStoreCollection().doc(storeScope.documentId).get();
            if (!snap.exists) return null;

            const data: Record<string, any> & { id: string } = { ...(snap.data() || {}), id: snap.id };
            if (data.active === false || data.deleted === true) return null;

            return await isStoreOrTenantIneligible(data) ? null : data;
        },
        ['client-store-id'],
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
                .limit(2)
                .get();
            if (directSnap.size > 1) return null;
            if (directSnap.size === 1) {
                const data = { ...directSnap.docs[0].data(), id: directSnap.docs[0].id };
                return await isStoreOrTenantIneligible(data) ? null : data;
            }
            // Fallback: rename-chain lookup via previousOutletSlugs[]. Mirrors
            // the project-slug chain mechanism on outlet stores.
            const chainSnap = await buildStoreCollection()
                .where('tenantId', '==', tenantId)
                .where('previousOutletSlugs', 'array-contains', normalized)
                .where('active', '==', true)
                .limit(2)
                .get();
            if (chainSnap.size !== 1) return null;
            const data = { ...chainSnap.docs[0].data(), id: chainSnap.docs[0].id };
            return await isStoreOrTenantIneligible(data) ? null : data;
        },
        ['client-store-outlet-slug'],
        { revalidate: 60, tags: ['client-stores'] },
    ),
);
