import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { normalizeHostedHelpDomain } from '@constant/answerlattice/hostedHelp';
import { PRODUCT_IDS } from '@constant/product';
import {
    type AnswerlatticeHostedHelpConfig,
    normalizeHostedHelpConfig,
} from '@lib/answerlattice/hostedHelpConfig';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { secureError } from '@lib/security/secureLogger';
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
    domainVerification?: Record<string, any> | null;
    domainProvisioningError?: string | null;
    domainVercelAddedAt?: string | null;
};

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

export function getHostedHelpScopeCacheTag(tId: string | number, sId: string | number) {
    return `answerlattice-hosted-help-scope-${String(tId)}-${String(sId)}`;
}

export function revalidateAnswerlatticeHostedHelpDomain(domain: string) {
    const normalizedDomain = normalizeHostedHelpDomain(domain);
    if (!normalizedDomain) return [];
    const tags = [getHostedHelpDomainCacheTag(normalizedDomain)];
    tags.forEach(tag => revalidateTag(tag));
    return tags;
}

export function revalidateAnswerlatticeHostedHelpScope(tId: string | number, sId: string | number) {
    const tags = [getHostedHelpScopeCacheTag(tId, sId)];
    tags.forEach(tag => revalidateTag(tag));
    return tags;
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
    const config = normalizeHostedHelpConfig(data.config);
    const tId = Number(data.tId);
    const sId = Number(data.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        secureError('[Answerlattice Hosted Help] Invalid registry scope', new Error('Hosted help registry doc has invalid scope'), {
            domain: normalizedDomain,
        });
        return null;
    }

    if (data.enabled === false || !config.enabled) return null;

    return {
        domain: normalizedDomain,
        tId,
        sId,
        pId: String(data.pId || PRODUCT_IDS.ANSWERLATTICE),
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
    if (!domain) return null;

    return {
        domain,
        pId: PRODUCT_IDS.ANSWERLATTICE,
        tId: params.tId,
        sId: params.sId,
        enabled: Boolean(params.config.enabled),
        config: params.config,
        ...(params.status || {}),
        updatedAt: new Date().toISOString(),
    };
}
