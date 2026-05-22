import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { normalizeHostedHelpDomain } from '@constant/canonica/hostedHelp';
import { PRODUCT_IDS } from '@constant/product';
import {
    type CanonicaHostedHelpConfig,
    normalizeHostedHelpConfig,
} from '@lib/canonica/hostedHelpConfig';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { secureError } from '@lib/security/secureLogger';
import { revalidateTag, unstable_cache } from 'next/cache';

const HOSTED_HELP_REGISTRY_CACHE_SECONDS = 60;

export type CanonicaHostedHelpSite = {
    domain: string;
    tId: number;
    sId: number;
    pId: string;
    enabled: boolean;
    config: CanonicaHostedHelpConfig;
    updatedAt?: string | null;
};

export type CanonicaHostedHelpDomainStatusValue = 'pending' | 'verified' | 'error';

export type CanonicaHostedHelpRegistryStatus = {
    domainStatus?: CanonicaHostedHelpDomainStatusValue;
    domainVerified?: boolean;
    domainVerifiedAt?: string | null;
    domainLastCheckedAt?: string | null;
    domainVerification?: Record<string, any> | null;
    domainProvisioningError?: string | null;
    domainVercelAddedAt?: string | null;
};

const getCanonicaDb = () => {
    const db = canonicaFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        throw new Error('Canonica Firestore Admin is not configured');
    }
    return canonicaFirestoreAdmin;
};

export function getHostedHelpDomainCacheTag(domain: string) {
    return `canonica-hosted-help-domain-${domain}`;
}

export function getHostedHelpScopeCacheTag(tId: string | number, sId: string | number) {
    return `canonica-hosted-help-scope-${String(tId)}-${String(sId)}`;
}

export function revalidateCanonicaHostedHelpDomain(domain: string) {
    const normalizedDomain = normalizeHostedHelpDomain(domain);
    if (!normalizedDomain) return [];
    const tags = [getHostedHelpDomainCacheTag(normalizedDomain)];
    tags.forEach(tag => revalidateTag(tag));
    return tags;
}

export function revalidateCanonicaHostedHelpScope(tId: string | number, sId: string | number) {
    const tags = [getHostedHelpScopeCacheTag(tId, sId)];
    tags.forEach(tag => revalidateTag(tag));
    return tags;
}

const fetchHostedHelpSiteByDomain = async (domain: string): Promise<CanonicaHostedHelpSite | null> => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_HOSTED_HELP_CENTER) return null;

    const normalizedDomain = normalizeHostedHelpDomain(domain);
    if (!normalizedDomain) return null;

    const snapshot = await getCanonicaDb()
        .collection(DB_COLLECTIONS.CANONICA_PUBLIC_HELP_SITES)
        .doc(normalizedDomain)
        .get();

    if (!snapshot.exists) return null;

    const data = snapshot.data() || {};
    const config = normalizeHostedHelpConfig(data.config);
    const tId = Number(data.tId);
    const sId = Number(data.sId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        secureError('[Canonica Hosted Help] Invalid registry scope', new Error('Hosted help registry doc has invalid scope'), {
            domain: normalizedDomain,
        });
        return null;
    }

    if (data.enabled === false || !config.enabled) return null;

    return {
        domain: normalizedDomain,
        tId,
        sId,
        pId: String(data.pId || PRODUCT_IDS.CANONICA),
        enabled: true,
        config,
        updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : null,
    };
};

export async function resolveHostedHelpSiteByDomain(domain?: string | null): Promise<CanonicaHostedHelpSite | null> {
    const normalizedDomain = normalizeHostedHelpDomain(domain);
    if (!normalizedDomain) return null;

    const cached = unstable_cache(
        () => fetchHostedHelpSiteByDomain(normalizedDomain),
        ['canonica-hosted-help-site', normalizedDomain],
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
    config: CanonicaHostedHelpConfig;
    status?: CanonicaHostedHelpRegistryStatus;
}) {
    const domain = normalizeHostedHelpDomain(params.domain);
    if (!domain) return null;

    return {
        domain,
        pId: PRODUCT_IDS.CANONICA,
        tId: params.tId,
        sId: params.sId,
        enabled: Boolean(params.config.enabled),
        config: params.config,
        ...(params.status || {}),
        updatedAt: new Date().toISOString(),
    };
}
