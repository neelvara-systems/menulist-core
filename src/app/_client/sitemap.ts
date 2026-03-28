/**
 * Client Menu Sitemap
 * 
 * Generates a sitemap for client menus accessed via subdomain or custom domain.
 * Each client gets their own sitemap with just their menu page.
 * Uses actual store.modifiedOn timestamp for accurate freshness signals to AI crawlers.
 * 
 * Example: joespizza.menulist.ai/sitemap.xml → Just Joe's Pizza menu
 * 
 * @see __docs__/discovery-infrastructure/deep-architecture-audit.md — Sitemap freshness fix
 */

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';

const getStoreModifiedDate = unstable_cache(
    async (subdomain: string, customDomain: string | null): Promise<Date> => {
        try {
            const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
            const q = customDomain
                ? query(storesRef, where('customDomain', '==', customDomain.toLowerCase()), where('active', '==', true), limit(1))
                : query(storesRef, where('subdomain', '==', subdomain.toLowerCase()), where('active', '==', true), limit(1));
            const snapshot = await getDocs(q);
            if (snapshot.empty) return new Date();
            const data = snapshot.docs[0].data();
            const modifiedOn = data?.modifiedOn;
            if (modifiedOn?.toDate) return modifiedOn.toDate();
            if (typeof modifiedOn === 'string') return new Date(modifiedOn);
            return new Date();
        } catch {
            return new Date();
        }
    },
    ['sitemap-store-modified'],
    { revalidate: 300, tags: ['client-stores'] }
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const headersList = headers();
    const subdomain = headersList.get('x-tenant-subdomain');
    const customDomain = headersList.get('x-tenant-custom-domain');

    // Build base URL based on domain type
    let baseUrl: string;
    if (customDomain) {
        baseUrl = `https://${customDomain}`;
    } else if (subdomain) {
        baseUrl = `https://${subdomain}.menulist.ai`;
    } else {
        // Fallback - shouldn't happen in production
        return [];
    }

    // Use actual store modification date for accurate freshness signals
    const lastModified = await getStoreModifiedDate(subdomain || '', customDomain);

    // Client sitemap includes OBP (root) and menu page
    // OBP is the canonical business identity page; /menu is the structured menu
    return [
        {
            url: baseUrl,
            lastModified,
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/menu`,
            lastModified,
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ];
}
