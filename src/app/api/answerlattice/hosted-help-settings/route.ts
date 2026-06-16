export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import { normalizeHostedHelpDomain } from '@constant/answerlattice/hostedHelp';
import { ALL_PRODUCT_DOMAINS } from '@constant/productDomains';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    buildHostedHelpRegistryDoc,
    type AnswerlatticeHostedHelpRegistryStatus,
    revalidateAnswerlatticeHostedHelpDomain,
    revalidateAnswerlatticeHostedHelpScope,
} from '@lib/answerlattice/hostedHelpServer';
import { normalizeHostedHelpConfig, parseHostedHelpConfigSaveInput } from '@lib/answerlattice/hostedHelpConfig';
import {
    addDomainToVercelProject,
    getVercelDomainConfig,
    isVercelDomainConfigured,
    isVercelDomainManagementConfigured,
    removeDomainFromVercelProject,
} from '@lib/domains/vercelDomains';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError, secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;

    const tenantId = Number(answerlatticeScope.tenantId);
    const storeId = Number(answerlatticeScope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

const RESERVED_HOSTED_HELP_DOMAINS = new Set(ALL_PRODUCT_DOMAINS.map(domain => domain.toLowerCase()));

const getClientErrorMessage = (data: any, fallback: string) => (
    typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.error === 'string'
            ? data.error
            : fallback
);

const getRegistryStatus = (domain: string, data?: Record<string, any> | null) => ({
    domain,
    status: data?.domainStatus || (data?.domainVerified ? 'verified' : 'pending'),
    verified: Boolean(data?.domainVerified),
    verifiedAt: data?.domainVerifiedAt || null,
    lastCheckedAt: data?.domainLastCheckedAt || null,
    verification: data?.domainVerification || null,
    error: data?.domainProvisioningError || null,
});

const getHostedHelpDomainStatuses = async (db: any, domains: string[]) => {
    const snapshots = await Promise.all(
        domains.map(domain => db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(domain).get()),
    );

    return domains.map((domain, index) => getRegistryStatus(
        domain,
        snapshots[index]?.exists ? snapshots[index].data() || {} : null,
    ));
};

const isRateLimitUnavailable = (rateLimitResult: { allowed: boolean; current: number; remaining: number }, limit: number) => (
    rateLimitResult.allowed
    && FEATURE_FLAGS.ENABLE_RATE_LIMITING
    && rateLimitResult.current === 0
    && rateLimitResult.remaining === limit
);

const buildStatusPatch = (params: {
    verified: boolean;
    verification?: Record<string, any> | null;
    error?: string | null;
    now: string;
}): AnswerlatticeHostedHelpRegistryStatus => ({
    domainStatus: params.error ? 'error' : params.verified ? 'verified' : 'pending',
    domainVerified: params.verified,
    domainVerifiedAt: params.verified ? params.now : null,
    domainLastCheckedAt: params.now,
    domainVerification: params.verification || null,
    domainProvisioningError: params.error || null,
});

const refreshHostedHelpDomainStatuses = async (params: {
    db: any;
    scope: { tenantId: number; storeId: number };
    config: ReturnType<typeof normalizeHostedHelpConfig>;
}) => {
    if (!params.config.domains.length) return [];
    if (!isVercelDomainManagementConfigured()) {
        throw new Error('Domain provisioning is not configured.');
    }

    const now = new Date().toISOString();
    const batch = params.db.batch();
    const statuses = [];

    for (const domain of params.config.domains) {
        let statusPatch: AnswerlatticeHostedHelpRegistryStatus;
        try {
            const configResult = await getVercelDomainConfig(domain);
            if (!configResult.ok) {
                statusPatch = buildStatusPatch({
                    verified: false,
                    verification: configResult.data,
                    error: getClientErrorMessage(configResult.data, 'Could not check DNS status.'),
                    now,
                });
            } else {
                statusPatch = buildStatusPatch({
                    verified: isVercelDomainConfigured(configResult.data),
                    verification: configResult.data,
                    now,
                });
            }
        } catch (error: any) {
            statusPatch = buildStatusPatch({
                verified: false,
                error: error?.message || 'Could not check DNS status.',
                now,
            });
        }

        const registryDoc = buildHostedHelpRegistryDoc({
            domain,
            tId: params.scope.tenantId,
            sId: params.scope.storeId,
            config: params.config,
            status: statusPatch,
        });
        if (registryDoc) {
            batch.set(
                params.db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(domain),
                registryDoc,
                { merge: true },
            );
        }
        statuses.push(getRegistryStatus(domain, statusPatch));
    }

    await batch.commit();
    params.config.domains.forEach(domain => revalidateAnswerlatticeHostedHelpDomain(domain));
    revalidateAnswerlatticeHostedHelpScope(params.scope.tenantId, params.scope.storeId);
    return statuses;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER) {
        return NextResponse.json({ error: 'Hosted Help Center is not enabled.' }, { status: 403 });
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
    }

    try {
        const storeSnap = await db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId)).get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        const config = normalizeHostedHelpConfig((storeSnap.data() || {}).hostedHelpConfig);
        const refreshDomains = request.nextUrl.searchParams.get('refreshDomains') === '1';
        let domainStatuses;

        if (refreshDomains) {
            const rateLimitConfig = { limit: 10, window: 60 };
            const rateLimitResult = await checkRateLimit({
                key: `answerlattice-hosted-help-domain-refresh:${scope.storeId}`,
                limit: rateLimitConfig.limit,
                window: rateLimitConfig.window,
            });
            if (isRateLimitUnavailable(rateLimitResult, rateLimitConfig.limit)) {
                return NextResponse.json(
                    { error: 'Hosted help domain checks are temporarily unavailable' },
                    { status: 503, headers: { 'Cache-Control': 'no-store' } },
                );
            }
            if (!rateLimitResult.allowed) {
                return NextResponse.json(
                    { error: 'Too many requests' },
                    { status: 429, headers: { 'Cache-Control': 'no-store' } },
                );
            }
            domainStatuses = await refreshHostedHelpDomainStatuses({ db, scope, config });
        } else {
            domainStatuses = await getHostedHelpDomainStatuses(db, config.domains);
        }

        return NextResponse.json({ config, domainStatuses });
    } catch (error) {
        secureError('[Answerlattice Hosted Help] Failed to load settings', error as Error, {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        });
        return NextResponse.json({ error: 'Failed to load hosted help settings' }, { status: 500 });
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_HOSTED_HELP_CENTER) {
        return NextResponse.json({ error: 'Hosted Help Center is not enabled.' }, { status: 403 });
    }

    const permission = await requireAnswerlatticePermission(request, session, ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET);
    if (permission.response) return permission.response;

    const scope = resolveSessionScope(session);
    if (!scope) {
        return NextResponse.json({ error: 'Not onboarded' }, { status: 400 });
    }

    const db = getAnswerlatticeDb();
    if (!db) {
        return NextResponse.json({ error: 'Answerlattice Firebase is not configured' }, { status: 503 });
    }

    const rateLimitConfig = { limit: 20, window: 60 };
    const rateLimitResult = await checkRateLimit({
        key: `answerlattice-hosted-help-settings:${scope.storeId}`,
        limit: rateLimitConfig.limit,
        window: rateLimitConfig.window,
    });
    if (isRateLimitUnavailable(rateLimitResult, rateLimitConfig.limit)) {
        return NextResponse.json(
            { error: 'Hosted help settings are temporarily unavailable' },
            { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
    }
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: { 'Cache-Control': 'no-store' } },
        );
    }

    const body = await request.json().catch(() => null);
    let config;
    try {
        config = parseHostedHelpConfigSaveInput(body?.config || body);
    } catch {
        return NextResponse.json({ error: 'Invalid hosted help settings' }, { status: 400 });
    }

    try {
        const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(String(scope.storeId));
        const storeSnap = await storeRef.get();
        if (!storeSnap.exists) {
            return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
        }

        const storeData = storeSnap.data() || {};
        const storeTenantId = Number(storeData.tenantId || storeData.tId);
        if (Number.isFinite(storeTenantId) && storeTenantId !== Number(scope.tenantId)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const previousConfig = normalizeHostedHelpConfig(storeData.hostedHelpConfig);
        const previousDomains = previousConfig.domains;
        const nextDomains = config.domains;
        const domainsToProvision = nextDomains.filter(domain => !previousDomains.includes(domain));
        const removedDomains = previousDomains.filter(domain => !nextDomains.includes(domain));

        if (config.enabled && nextDomains.length === 0) {
            return NextResponse.json({ error: 'Add at least one help domain before enabling hosted help.' }, { status: 400 });
        }

        const reservedDomain = nextDomains.find(domain => RESERVED_HOSTED_HELP_DOMAINS.has(domain));
        if (reservedDomain) {
            return NextResponse.json({ error: `${reservedDomain} is a product domain and cannot be used as a hosted help domain.` }, { status: 409 });
        }

        if (domainsToProvision.length > 0 && !isVercelDomainManagementConfigured()) {
            return NextResponse.json({ error: 'Domain provisioning is not configured. Set VERCEL_TOKEN and VERCEL_PROJECT_ID.' }, { status: 503 });
        }

        const registryByDomain = new Map<string, Record<string, any>>();
        for (const domain of nextDomains) {
            const registrySnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(domain).get();
            if (registrySnap.exists) {
                const registry = registrySnap.data() || {};
                registryByDomain.set(domain, registry);
                const existingTId = Number(registry.tId);
                const existingSId = Number(registry.sId);
                if (existingTId !== Number(scope.tenantId) || existingSId !== Number(scope.storeId)) {
                    return NextResponse.json({ error: `Domain ${domain} is already assigned to another Answerlattice workspace.` }, { status: 409 });
                }
            }
        }

        const provisionedStatuses = new Map<string, AnswerlatticeHostedHelpRegistryStatus>();
        for (const domain of domainsToProvision) {
            const addResult = await addDomainToVercelProject(domain);
            if (!addResult.ok && addResult.status !== 409) {
                secureError('[Answerlattice Hosted Help] Vercel domain add failed', new Error(getClientErrorMessage(addResult.data, 'Failed to add domain to Vercel')), {
                    storeId: scope.storeId,
                    tenantId: scope.tenantId,
                    domain,
                    status: addResult.status,
                });
                return NextResponse.json(
                    { error: getClientErrorMessage(addResult.data, 'Failed to add domain to Vercel') },
                    { status: addResult.status || 502 },
                );
            }

            const now = new Date().toISOString();
            const configResult = await getVercelDomainConfig(domain);
            const verified = configResult.ok && isVercelDomainConfigured(configResult.data);
            provisionedStatuses.set(domain, {
                ...buildStatusPatch({
                    verified,
                    verification: configResult.data || null,
                    error: configResult.ok ? null : getClientErrorMessage(configResult.data, 'Domain was added, but DNS status could not be checked.'),
                    now,
                }),
                domainVercelAddedAt: now,
            });
        }

        const batch = db.batch();
        batch.set(storeRef, {
            hostedHelpConfig: config,
            hostedHelpConfigVersion: Number(storeData.hostedHelpConfigVersion || 0) + 1,
            hostedHelpUpdatedAt: new Date().toISOString(),
        }, { merge: true });

        nextDomains.forEach(domain => {
            const existingRegistry = registryByDomain.get(domain) || {};
            const status = provisionedStatuses.get(domain) || {
                domainStatus: existingRegistry.domainStatus || (existingRegistry.domainVerified ? 'verified' : 'pending'),
                domainVerified: Boolean(existingRegistry.domainVerified),
                domainVerifiedAt: existingRegistry.domainVerifiedAt || null,
                domainLastCheckedAt: existingRegistry.domainLastCheckedAt || null,
                domainVerification: existingRegistry.domainVerification || null,
                domainProvisioningError: existingRegistry.domainProvisioningError || null,
                domainVercelAddedAt: existingRegistry.domainVercelAddedAt || null,
            };
            const registryDoc = buildHostedHelpRegistryDoc({
                domain,
                tId: scope.tenantId,
                sId: scope.storeId,
                config,
                status,
            });
            if (!registryDoc) return;
            batch.set(
                db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(domain),
                registryDoc,
                { merge: true },
            );
        });

        removedDomains.forEach(domain => {
            const normalized = normalizeHostedHelpDomain(domain);
            if (normalized) {
                batch.delete(db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(normalized));
            }
        });

        await batch.commit();

        if (isVercelDomainManagementConfigured()) {
            await Promise.all(removedDomains.map(async (domain) => {
                try {
                    await removeDomainFromVercelProject(domain);
                } catch (error) {
                    secureError('[Answerlattice Hosted Help] Vercel domain removal failed', error as Error, {
                        storeId: scope.storeId,
                        tenantId: scope.tenantId,
                        domain,
                    });
                }
            }));
        }

        Array.from(new Set([...previousDomains, ...nextDomains])).forEach(domain => {
            revalidateAnswerlatticeHostedHelpDomain(domain);
        });
        revalidateAnswerlatticeHostedHelpScope(scope.tenantId, scope.storeId);

        secureLog('[Answerlattice Hosted Help] Settings saved', {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
            domainCount: nextDomains.length,
            enabled: config.enabled,
        });

        const domainStatuses = await getHostedHelpDomainStatuses(db, nextDomains);
        return NextResponse.json({ config, domainStatuses });
    } catch (error) {
        secureError('[Answerlattice Hosted Help] Failed to save settings', error as Error, {
            storeId: scope.storeId,
            tenantId: scope.tenantId,
        });
        return NextResponse.json({ error: 'Failed to save hosted help settings' }, { status: 500 });
    }
});
