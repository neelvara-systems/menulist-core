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
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
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
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const getAnswerlatticeDb = () => {
    const db = answerlatticeFirestoreAdmin as any;
    return db && typeof db.collection === 'function' ? answerlatticeFirestoreAdmin : null;
};
const HOSTED_HELP_SETTINGS_SAVE_MAX_BODY_BYTES = 32 * 1024;

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;

    const tenantId = Number(answerlatticeScope.tenantId);
    const storeId = Number(answerlatticeScope.storeId);
    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId) || tenantId <= 0 || storeId <= 0) return null;
    return { tenantId, storeId };
};

const registryScopeMatches = (registry: Record<string, any> | null | undefined, scope: { tenantId: number; storeId: number }) => (
    Number(registry?.tId) === Number(scope.tenantId)
    && Number(registry?.sId) === Number(scope.storeId)
);

const RESERVED_HOSTED_HELP_DOMAINS = new Set(ALL_PRODUCT_DOMAINS.map(domain => domain.toLowerCase()));

const getHostedHelpProviderErrorContext = (data: any): Record<string, boolean | number | string | null> => {
    const nestedError = data?.error && typeof data.error === 'object' ? data.error : null;
    const message = typeof nestedError?.message === 'string'
        ? nestedError.message
        : typeof data?.error === 'string'
            ? data.error
            : '';
    const code = typeof nestedError?.code === 'string' || typeof nestedError?.code === 'number'
        ? String(nestedError.code).slice(0, 80)
        : null;
    const status = Number(data?.status ?? nestedError?.status ?? nestedError?.statusCode);

    return {
        providerCode: code,
        providerStatus: Number.isFinite(status) ? status : null,
        providerMessagePresent: message.length > 0,
        providerMessageLength: message.length,
    };
};

const HOSTED_HELP_DOMAIN_ADD_FAILED_MESSAGE = 'Failed to add hosted help domain.';
const HOSTED_HELP_DOMAIN_STATUS_FAILED_MESSAGE = 'Could not check DNS status.';

const getHostedHelpClientErrorMessage = (fallback: string) => fallback;

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
                    error: getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_STATUS_FAILED_MESSAGE),
                    now,
                });
            } else {
                statusPatch = buildStatusPatch({
                    verified: isVercelDomainConfigured(configResult.data),
                    verification: configResult.data,
                    now,
                });
            }
        } catch {
            statusPatch = buildStatusPatch({
                verified: false,
                error: getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_STATUS_FAILED_MESSAGE),
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

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'hosted-help-settings');
    if (rateLimitResponse) return rateLimitResponse;

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
                key: buildAnswerlatticeRateLimitKey('answerlattice-hosted-help-domain-refresh', scope.storeId),
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
        logRuntimeFailure('answerlattice_hosted_help_settings_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
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
        key: buildAnswerlatticeRateLimitKey('answerlattice-hosted-help-settings', scope.storeId),
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

    const bodyResult = await readBoundedJsonBody(request, HOSTED_HELP_SETTINGS_SAVE_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid hosted help settings',
        tooLargeMessage: 'Request body too large',
    });
    if (bodyResult.ok === false) {
        return NextResponse.json(
            { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid hosted help settings' },
            { status: bodyResult.response.status },
        );
    }

    let config;
    try {
        const body = bodyResult.data as { config?: unknown } | null;
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
                if (!registryScopeMatches(registry, scope)) {
                    return NextResponse.json({ error: `Domain ${domain} is already assigned to another Answerlattice workspace.` }, { status: 409 });
                }
            }
        }

        const removedRegistryByDomain = new Map<string, Record<string, any>>();
        for (const domain of removedDomains) {
            const normalized = normalizeHostedHelpDomain(domain);
            if (!normalized) continue;
            const registrySnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(normalized).get();
            if (registrySnap.exists) {
                removedRegistryByDomain.set(normalized, registrySnap.data() || {});
            }
        }

        const provisionedStatuses = new Map<string, AnswerlatticeHostedHelpRegistryStatus>();
        for (const domain of domainsToProvision) {
            const addResult = await addDomainToVercelProject(domain);
            if (!addResult.ok && addResult.status !== 409) {
                logRuntimeFailure('answerlattice_hosted_help_domain_add_failed', new Error('Hosted help domain provider add failed'), {
                    ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                    domainPresent: domain.length > 0,
                    domainLength: domain.length,
                    status: addResult.status,
                    ...getHostedHelpProviderErrorContext(addResult.data),
                });
                return NextResponse.json(
                    { error: getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_ADD_FAILED_MESSAGE) },
                    { status: 502 },
                );
            }

            const now = new Date().toISOString();
            const configResult = await getVercelDomainConfig(domain);
            const verified = configResult.ok && isVercelDomainConfigured(configResult.data);
            provisionedStatuses.set(domain, {
                ...buildStatusPatch({
                    verified,
                    verification: configResult.data || null,
                    error: configResult.ok ? null : getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_STATUS_FAILED_MESSAGE),
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
            if (!normalized) return;
            const registry = removedRegistryByDomain.get(normalized);
            if (registry && registryScopeMatches(registry, scope)) {
                batch.delete(db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(normalized));
            } else if (registry) {
                logRuntimeFailure('answerlattice_hosted_help_registry_delete_scope_mismatch', new Error('Hosted help registry delete scope mismatch'), {
                    ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                    ...getBoundedRuntimeStringContext('domain', normalized),
                });
            }
        });

        await batch.commit();

        if (isVercelDomainManagementConfigured()) {
            await Promise.all(removedDomains.map(async (domain) => {
                try {
                    await removeDomainFromVercelProject(domain);
                } catch (error) {
                    logRuntimeFailure('answerlattice_hosted_help_domain_removal_failed', error, {
                        ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                        ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                        ...getBoundedRuntimeStringContext('domain', domain),
                    });
                }
            }));
        }

        Array.from(new Set([...previousDomains, ...nextDomains])).forEach(domain => {
            revalidateAnswerlatticeHostedHelpDomain(domain);
        });
        revalidateAnswerlatticeHostedHelpScope(scope.tenantId, scope.storeId);

        logRuntimeDiagnostic('answerlattice_hosted_help_settings_saved', {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            domainCount: nextDomains.length,
            enabled: config.enabled,
        });

        const domainStatuses = await getHostedHelpDomainStatuses(db, nextDomains);
        return NextResponse.json({ config, domainStatuses });
    } catch (error) {
        logRuntimeFailure('answerlattice_hosted_help_settings_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to save hosted help settings' }, { status: 500 });
    }
});
