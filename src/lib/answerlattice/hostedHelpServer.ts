import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { normalizeHostedHelpDomain } from '@constant/answerlattice/hostedHelp';
import { PRODUCT_IDS } from '@constant/product';
import {
    normalizeAnswerlatticeScopeDocumentId,
    normalizeConsistentAnswerlatticeScopeDocumentIds,
} from '@lib/answerlattice/sessionScope';
import {
    type AnswerlatticeHostedHelpConfig,
    type AnswerlatticeHostedHelpDomainVerification,
    normalizeHostedHelpConfig,
} from '@lib/answerlattice/hostedHelpConfig';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { revalidateTag, unstable_cache } from 'next/cache';

const HOSTED_HELP_REGISTRY_CACHE_SECONDS = 60;

export type AnswerlatticeHostedHelpSite = {
    domain: string;
    tId: number;
    sId: number;
    pId: string;
    enabled: boolean;
    config: AnswerlatticeHostedHelpConfig;
    updatedAt?: string | null;
};

export type AnswerlatticeHostedHelpDomainStatusValue = 'pending' | 'verified' | 'error';

export type AnswerlatticeHostedHelpRegistryStatus = {
    domainStatus?: AnswerlatticeHostedHelpDomainStatusValue;
    domainVerified?: boolean;
    domainVerifiedAt?: string | null;
    domainLastCheckedAt?: string | null;
    domainVerification?: AnswerlatticeHostedHelpDomainVerification | null;
    domainProvisioningError?: string | null;
    domainVercelAddedAt?: string | null;
};

export function resolveAnswerlatticeHostedHelpRegistryScope(value: unknown): {
    tenantId: number;
    storeId: number;
} | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    const productIds = [record.pId, record.productId].filter(candidate => candidate !== undefined);
    if (
        productIds.length === 0
        || !productIds.every(candidate => candidate === PRODUCT_IDS.ANSWERLATTICE)
    ) return null;

    const tenantId = normalizeConsistentAnswerlatticeScopeDocumentIds([record.tId, record.tenantId]);
    const storeId = normalizeConsistentAnswerlatticeScopeDocumentIds([record.sId, record.storeId]);
    return tenantId && storeId ? { tenantId, storeId } : null;
}

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Answerlattice Firestore Admin is not configured');
    }
    return answerlatticeFirestoreAdmin;
};

export function getHostedHelpDomainCacheTag(domain: string) {
    return `answerlattice-hosted-help-domain-${domain}`;
}

export function revalidateAnswerlatticeHostedHelpDomain(domain: string) {
    const normalizedDomain = normalizeHostedHelpDomain(domain);
    if (!normalizedDomain) return [];
    const tags = [getHostedHelpDomainCacheTag(normalizedDomain)];
    tags.forEach(tag => revalidateTag(tag, { expire: 0 }));
    return tags;
}

export function shouldRemoveCompensatedHostedHelpProviderDomain(registryExists: unknown): boolean {
    return registryExists === false;
}

const fetchHostedHelpSiteByDomain = async (domain: string): Promise<AnswerlatticeHostedHelpSite | null> => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER) return null;

    const normalizedDomain = normalizeHostedHelpDomain(domain);
    if (!normalizedDomain) return null;

    const snapshot = await getAnswerlatticeDb()
        .collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES)
        .doc(normalizedDomain)
        .get();

    if (!snapshot.exists) return null;

    const data = snapshot.data() || {};
    const productIds = [data.pId, data.productId].filter(candidate => candidate !== undefined);
    if (
        productIds.length === 0
        || !productIds.every(candidate => candidate === PRODUCT_IDS.ANSWERLATTICE)
    ) {
        logRuntimeFailure('answerlattice_hosted_help_registry_product_invalid', new Error('Hosted help registry doc has invalid product scope'), {
            ...getBoundedRuntimeStringContext('domain', normalizedDomain),
        });
        return null;
    }

    const config = normalizeHostedHelpConfig(data.config);
    const scope = resolveAnswerlatticeHostedHelpRegistryScope(data);
    if (!scope || data.domain !== normalizedDomain) {
        logRuntimeFailure('answerlattice_hosted_help_registry_scope_invalid', new Error('Hosted help registry doc has invalid scope'), {
            ...getBoundedRuntimeStringContext('domain', normalizedDomain),
        });
        return null;
    }

    if (data.enabled !== true || !config.enabled || !config.domains.includes(normalizedDomain)) return null;

    return {
        domain: normalizedDomain,
        tId: scope.tenantId,
        sId: scope.storeId,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        enabled: true,
        config,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    };
};

export async function resolveHostedHelpSiteByDomain(domain?: string | null): Promise<AnswerlatticeHostedHelpSite | null> {
    const normalizedDomain = normalizeHostedHelpDomain(domain);
    if (!normalizedDomain) return null;

    const cached = unstable_cache(
        () => fetchHostedHelpSiteByDomain(normalizedDomain),
        ['answerlattice-hosted-help-site', normalizedDomain],
        {
            revalidate: HOSTED_HELP_REGISTRY_CACHE_SECONDS,
            tags: [getHostedHelpDomainCacheTag(normalizedDomain)],
        },
    );

    return cached();
}

export function buildHostedHelpRegistryDoc(params: {
    domain: string;
    tId: number;
    sId: number;
    config: AnswerlatticeHostedHelpConfig;
    status?: AnswerlatticeHostedHelpRegistryStatus;
}) {
    const domain = normalizeHostedHelpDomain(params.domain);
    const tId = normalizeAnswerlatticeScopeDocumentId(params.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(params.sId);
    const config = normalizeHostedHelpConfig(params.config);
    if (!domain || !tId || !sId || !config.domains.includes(domain)) return null;

    return {
        domain,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId,
        sId,
        enabled: Boolean(config.enabled),
        config,
        ...(params.status || {}),
        updatedAt: new Date().toISOString(),
    };
}
