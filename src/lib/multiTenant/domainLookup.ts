/**
 * Domain Lookup Service
 * 
 * Looks up store/project information from subdomain or custom domain.
 * Used by middleware and server components.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { secureError } from '@lib/security/secureLogger';

export interface TenantInfo {
    storeId: number;
    storeKey: string;
    tenantId: number;
    projectId?: string;
    storeName: string;
    subdomain?: string;
    customDomain?: string;
}

const normalizeDomainLookupFailure = (error: unknown, message: string): Error => {
    const normalized = new Error(message);
    if (error instanceof Error && error.name) {
        normalized.name = error.name;
    }
    return normalized;
};

const buildLookupLogContext = (lookupType: 'subdomain' | 'customDomain', lookupValue: string) => ({
    lookupType,
    hasLookupValue: Boolean(lookupValue),
    lookupValueLength: lookupValue.length,
});

/**
 * Lookup tenant by subdomain
 * e.g., "joespizza" from joespizza.menulist.ai
 */
export async function lookupBySubdomain(subdomain: string): Promise<TenantInfo | null> {
    try {
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .where('subdomain', '==', subdomain.toLowerCase())
            .where('active', '==', true)
            .limit(1)
            .get();

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
            storeName: getStoreContextName(storeData, storeData.name || 'Store'),
            subdomain: storeData.subdomain,
            customDomain: storeData.customDomain,
        };
    } catch (error) {
        secureError(
            '[Tenant Domain Lookup] Subdomain lookup failed',
            normalizeDomainLookupFailure(error, 'Tenant subdomain lookup failed'),
            buildLookupLogContext('subdomain', subdomain),
        );
        return null;
    }
}

/**
 * Lookup tenant by custom domain
 * e.g., "joespizza.com"
 */
export async function lookupByCustomDomain(domain: string): Promise<TenantInfo | null> {
    try {
        const snapshot = await firestoreAdmin
            .collection(DB_COLLECTIONS.STORES)
            .where('customDomain', '==', domain.toLowerCase())
            .where('domainVerified', '==', true)
            .where('active', '==', true)
            .limit(1)
            .get();

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
            storeName: getStoreContextName(storeData, storeData.name || 'Store'),
            subdomain: storeData.subdomain,
            customDomain: storeData.customDomain,
        };
    } catch (error) {
        secureError(
            '[Tenant Domain Lookup] Custom domain lookup failed',
            normalizeDomainLookupFailure(error, 'Tenant custom domain lookup failed'),
            buildLookupLogContext('customDomain', domain),
        );
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
