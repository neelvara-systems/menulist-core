/**
 * Domain Lookup Service
 * 
 * Looks up store/project information from subdomain or custom domain.
 * Used by middleware and server components.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { firebaseClient } from '@lib/firebase/firebaseClient';
import { collection, getDocs, limit, query, where } from 'firebase/firestore';

export interface TenantInfo {
    storeId: number;
    storeKey: string;
    tenantId: number;
    projectId?: string;
    storeName: string;
    subdomain?: string;
    customDomain?: string;
}

/**
 * Lookup tenant by subdomain
 * e.g., "joespizza" from joespizza.menulist.ai
 */
export async function lookupBySubdomain(subdomain: string): Promise<TenantInfo | null> {
    try {
        const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
        const q = query(
            storesRef,
            where('subdomain', '==', subdomain.toLowerCase()),
            where('active', '==', true),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const storeDoc = snapshot.docs[0];
        const storeData = storeDoc.data();

        return {
            storeId: storeData.storeId,
            storeKey: storeData.storeKey,
            tenantId: storeData.tenantId,
            projectId: storeData.primaryProjectId,
            storeName: storeData.name,
            subdomain: storeData.subdomain,
            customDomain: storeData.customDomain,
        };
    } catch (error) {
        console.error('Error looking up subdomain:', subdomain, error);
        return null;
    }
}

/**
 * Lookup tenant by custom domain
 * e.g., "joespizza.com"
 */
export async function lookupByCustomDomain(domain: string): Promise<TenantInfo | null> {
    try {
        const storesRef = collection(firebaseClient, DB_COLLECTIONS.STORES);
        const q = query(
            storesRef,
            where('customDomain', '==', domain.toLowerCase()),
            where('domainVerified', '==', true),
            where('active', '==', true),
            limit(1)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            return null;
        }

        const storeDoc = snapshot.docs[0];
        const storeData = storeDoc.data();

        return {
            storeId: storeData.storeId,
            storeKey: storeData.storeKey,
            tenantId: storeData.tenantId,
            projectId: storeData.primaryProjectId,
            storeName: storeData.name,
            subdomain: storeData.subdomain,
            customDomain: storeData.customDomain,
        };
    } catch (error) {
        console.error('Error looking up custom domain:', domain, error);
        return null;
    }
}

/**
 * Combined lookup - tries subdomain first, then custom domain
 */
export async function lookupTenant(
    subdomain?: string,
    customDomain?: string
): Promise<TenantInfo | null> {
    if (subdomain) {
        const result = await lookupBySubdomain(subdomain);
        if (result) return result;
    }

    if (customDomain) {
        const result = await lookupByCustomDomain(customDomain);
        if (result) return result;
    }

    return null;
}
