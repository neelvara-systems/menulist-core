/**
 * Domain Lookup Service
 * 
 * Looks up store/project information from subdomain or custom domain.
 * Used by middleware and server components.
 */

import { DB_COLLECTIONS } from '@constant/database';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import {
    isMenuListPublicEntityEligible,
    normalizeMenuListPublicEntityIdentityAliases,
} from '@lib/publicTruth/entityEligibility';
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

const normalizeTenantLookupNumericId = (value: unknown): { documentId: string; numericId: number } | null => {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    if (documentId !== raw || !isValidFirestoreDocumentId(documentId)) return null;
    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? { documentId, numericId }
        : null;
};

async function buildTenantInfo(storeDoc: FirebaseFirestore.QueryDocumentSnapshot): Promise<TenantInfo | null> {
    const storeData = storeDoc.data();
    if (!isMenuListPublicEntityEligible(storeData)) return null;
    const documentStoreScope = normalizeTenantLookupNumericId(storeDoc.id);
    const storedStoreScope = normalizeMenuListPublicEntityIdentityAliases([storeData.storeId, storeData.sId]);
    const tenantScope = normalizeMenuListPublicEntityIdentityAliases([storeData.tenantId, storeData.tId]);
    if (
        !documentStoreScope
        || !storedStoreScope
        || !tenantScope
        || documentStoreScope.documentId !== storedStoreScope.documentId
    ) {
        return null;
    }
    const tenantSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.TENANTS)
        .doc(tenantScope.documentId)
        .get();
    const tenantData = tenantSnapshot.data();
    if (!tenantSnapshot.exists || !isMenuListPublicEntityEligible(tenantData)) return null;
    const tenantIdentityValues = [tenantData?.tenantId, tenantData?.tId]
        .filter((value) => value !== undefined && value !== null);
    if (tenantIdentityValues.length > 0
        && normalizeMenuListPublicEntityIdentityAliases(tenantIdentityValues)?.documentId !== tenantScope.documentId) {
        return null;
    }
    return {
        storeId: documentStoreScope.numericId,
        storeKey: storeData.storeKey,
        tenantId: tenantScope.numericId,
        projectId: storeData.primaryProjectId,
        storeName: getStoreContextName(storeData, storeData.name || 'Store'),
        subdomain: storeData.subdomain,
        customDomain: storeData.customDomain,
    };
}

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
            .limit(2)
            .get();

        if (snapshot.size !== 1) {
            return null;
        }
        return await buildTenantInfo(snapshot.docs[0]);
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
            .limit(2)
            .get();

        if (snapshot.size !== 1) {
            return null;
        }
        return await buildTenantInfo(snapshot.docs[0]);
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
