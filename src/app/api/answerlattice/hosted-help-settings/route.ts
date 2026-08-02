export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { DB_COLLECTIONS } from '@constant/database';
import {
    isAnswerlatticeHostedHelpCandidateHostname,
    normalizeHostedHelpDomain,
} from '@constant/answerlattice/hostedHelp';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    buildHostedHelpRegistryDoc,
    resolveAnswerlatticeHostedHelpRegistryScope,
    shouldRemoveCompensatedHostedHelpProviderDomain,
    type AnswerlatticeHostedHelpRegistryStatus,
    revalidateAnswerlatticeHostedHelpDomain,
} from '@lib/answerlattice/hostedHelpServer';
import {
    normalizeHostedHelpConfig,
    normalizeHostedHelpDomainVerification,
    parseHostedHelpConfigSaveInput,
} from '@lib/answerlattice/hostedHelpConfig';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    addDomainToVercelProject,
    getVercelDomainConfig,
    isVercelDomainConfigured,
    isVercelDomainManagementConfigured,
    removeDomainFromVercelProject,
} from '@lib/domains/vercelDomains';
import { isAnswerlatticeStoreInScope, resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import {
    getBoundedErrorCodeAtPath,
    getBoundedErrorNumberAtPath,
    getUnknownObjectValueAtPath,
} from '@lib/monitoring/boundedLogContext';
import { checkRateLimit } from '@lib/rateLimit';
import { isReservedCustomDomainClaimCandidate } from '@lib/routing/customDomainClaim';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const getAnswerlatticeDb = () => {
    return answerlatticeFirestoreAdmin;
};
const HOSTED_HELP_SETTINGS_SAVE_MAX_BODY_BYTES = 32 * 1024;

const resolveSessionScope = (session: any): { tenantId: number; storeId: number } | null => {
    const answerlatticeScope = resolveAnswerlatticeSessionScope(session);
    if (!answerlatticeScope) return null;
    return { tenantId: answerlatticeScope.tenantId, storeId: answerlatticeScope.storeId };
};

const registryScopeMatches = (registry: Record<string, any> | null | undefined, scope: { tenantId: number; storeId: number }) => {
    const registryScope = resolveAnswerlatticeHostedHelpRegistryScope(registry);
    return registryScope?.tenantId === scope.tenantId && registryScope.storeId === scope.storeId;
};

const getHostedHelpProviderErrorContext = (data: unknown): Record<string, boolean | number | string | null> => {
    const nestedMessage = getUnknownObjectValueAtPath(data, ['error', 'message']);
    const directError = getUnknownObjectValueAtPath(data, ['error']);
    const message = typeof nestedMessage === 'string'
        ? nestedMessage
        : typeof directError === 'string'
            ? directError
            : '';
    const code = getBoundedErrorCodeAtPath(data, ['error', 'code']) ?? null;
    const status = getBoundedErrorNumberAtPath(data, ['status'])
        ?? getBoundedErrorNumberAtPath(data, ['error', 'status'])
        ?? getBoundedErrorNumberAtPath(data, ['error', 'statusCode']);

    return {
        providerCode: code,
        providerStatus: status ?? null,
        providerMessagePresent: message.length > 0,
        providerMessageLength: message.length,
    };
};

const HOSTED_HELP_DOMAIN_ADD_FAILED_MESSAGE = 'Failed to add hosted help domain.';
const HOSTED_HELP_DOMAIN_STATUS_FAILED_MESSAGE = 'Could not check DNS status.';

const getHostedHelpClientErrorMessage = (fallback: string) => fallback;

const HOSTED_HELP_DOMAIN_OWNERSHIP_REVIEW_MESSAGE = 'Domain ownership needs support review.';

class HostedHelpRegistryOwnershipError extends Error {
    constructor() {
        super('answerlattice_hosted_help_registry_ownership_invalid');
        this.name = 'HostedHelpRegistryOwnershipError';
    }
}

class HostedHelpConcurrentUpdateError extends Error {
    constructor() {
        super('answerlattice_hosted_help_concurrent_update');
        this.name = 'HostedHelpConcurrentUpdateError';
    }
}

const normalizeHostedHelpConfigVersion = (value: unknown): number => (
    typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value < Number.MAX_SAFE_INTEGER
        ? value
        : 0
);

const removeHostedHelpProviderDomain = async (params: {
    domain: string;
    scope: { tenantId: number; storeId: number };
    failureCode: string;
}): Promise<boolean> => {
    try {
        const removeResult = await removeDomainFromVercelProject(params.domain);
        const removed = removeResult.ok || removeResult.status === 404;
        if (!removed) {
            logRuntimeFailure(params.failureCode, new Error('Hosted help provider domain removal failed'), {
                ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
                ...getBoundedRuntimeStringContext('domain', params.domain),
                providerStatus: removeResult.status,
            });
        }
        return removed;
    } catch (error) {
        logRuntimeFailure(params.failureCode, error, {
            ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
            ...getBoundedRuntimeStringContext('domain', params.domain),
        });
        return false;
    }
};

const compensateHostedHelpProviderChanges = async (params: {
    db: any;
    addedDomains: string[];
    removedDomains: string[];
    scope: { tenantId: number; storeId: number };
}): Promise<void> => {
    await Promise.all([
        ...params.addedDomains.map(async domain => {
            try {
                const registrySnapshot = await params.db
                    .collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES)
                    .doc(domain)
                    .get();
                if (!shouldRemoveCompensatedHostedHelpProviderDomain(registrySnapshot.exists)) {
                    logRuntimeDiagnostic('answerlattice_hosted_help_provider_compensation_preserved_claim', {
                        ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
                        ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
                        ...getBoundedRuntimeStringContext('domain', domain),
                    });
                    return true;
                }
            } catch (error) {
                logRuntimeFailure('answerlattice_hosted_help_provider_compensation_registry_read_failed', error, {
                    ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
                    ...getBoundedRuntimeStringContext('domain', domain),
                });
                return false;
            }
            return removeHostedHelpProviderDomain({
                domain,
                scope: params.scope,
                failureCode: 'answerlattice_hosted_help_provider_compensation_failed',
            });
        }),
        ...params.removedDomains.map(async domain => {
            try {
                const addResult = await addDomainToVercelProject(domain);
                const restored = addResult.ok || addResult.status === 409;
                if (!restored) {
                    logRuntimeFailure('answerlattice_hosted_help_provider_compensation_failed', new Error('Hosted help provider domain restore failed'), {
                        ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
                        ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
                        ...getBoundedRuntimeStringContext('domain', domain),
                        providerStatus: addResult.status,
                    });
                }
            } catch (error) {
                logRuntimeFailure('answerlattice_hosted_help_provider_compensation_failed', error, {
                    ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
                    ...getBoundedRuntimeStringContext('domain', domain),
                });
            }
        }),
    ]);
};

const getRegistryStatus = (domain: string, data?: Record<string, any> | null) => {
    const status = data?.domainStatus === 'verified' || data?.domainStatus === 'error'
        ? data.domainStatus
        : data?.domainVerified === true
            ? 'verified'
            : 'pending';
    const normalizeTimestamp = (value: unknown) => (
        typeof value === 'string' && value.length <= 80 ? value : null
    );

    return {
        domain,
        status,
        verified: Boolean(data?.domainVerified && status === 'verified'),
        verifiedAt: normalizeTimestamp(data?.domainVerifiedAt),
        lastCheckedAt: normalizeTimestamp(data?.domainLastCheckedAt),
        verification: normalizeHostedHelpDomainVerification(data?.domainVerification),
        error: data?.domainProvisioningError
            ? getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_STATUS_FAILED_MESSAGE)
            : null,
    };
};

const getHostedHelpDomainStatuses = async (
    db: any,
    domains: string[],
    scope: { tenantId: number; storeId: number },
) => {
    const snapshots = await Promise.all(
        domains.map(domain => db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(domain).get()),
    );

    return domains.map((domain, index) => {
        const snapshot = snapshots[index];
        const registry = snapshot?.exists ? snapshot.data() || {} : null;
        if (registry && !registryScopeMatches(registry, scope)) {
            logRuntimeFailure('answerlattice_hosted_help_registry_read_scope_mismatch', new Error('Hosted help registry read scope mismatch'), {
                ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                ...getBoundedRuntimeStringContext('domain', domain),
            });
            return {
                ...getRegistryStatus(domain, {
                domainStatus: 'error',
                domainVerified: false,
                domainVerification: null,
                }),
                error: HOSTED_HELP_DOMAIN_OWNERSHIP_REVIEW_MESSAGE,
            };
        }
        return getRegistryStatus(domain, registry);
    });
};

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
    domainVerification: params.verification
        ? normalizeHostedHelpDomainVerification(params.verification)
        : null,
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

    const registrySnapshots = await Promise.all(
        params.config.domains.map(domain => params.db
            .collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES)
            .doc(domain)
            .get()),
    );
    const invalidRegistryIndex = registrySnapshots.findIndex((snapshot, index) => (
        !snapshot.exists
        || !registryScopeMatches(snapshot.data() || {}, params.scope)
    ));
    if (invalidRegistryIndex >= 0) {
        const domain = params.config.domains[invalidRegistryIndex];
        logRuntimeFailure('answerlattice_hosted_help_domain_refresh_ownership_invalid', new Error('Hosted help domain refresh ownership invalid'), {
            ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
            ...getBoundedRuntimeStringContext('domain', domain),
            registryExists: Boolean(registrySnapshots[invalidRegistryIndex]?.exists),
        });
        throw new HostedHelpRegistryOwnershipError();
    }

    const now = new Date().toISOString();
    const statuses = [];
    const registryDocs = new Map<string, ReturnType<typeof buildHostedHelpRegistryDoc>>();

    for (const domain of params.config.domains) {
        let statusPatch: AnswerlatticeHostedHelpRegistryStatus;
        try {
            const configResult = await getVercelDomainConfig(domain);
            if (!configResult.ok) {
                logRuntimeFailure('answerlattice_hosted_help_domain_status_failed', new Error('Hosted help domain status failed'), {
                    ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
                    domainPresent: domain.length > 0,
                    domainLength: domain.length,
                    ...getHostedHelpProviderErrorContext(configResult.data),
                    providerStatus: configResult.status,
                });
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
        } catch (error) {
            logRuntimeFailure('answerlattice_hosted_help_domain_status_failed', error, {
                ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
                domainPresent: domain.length > 0,
                domainLength: domain.length,
            });
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
        if (!registryDoc) throw new Error('Invalid hosted help registry document');
        registryDocs.set(domain, registryDoc);
        statuses.push(getRegistryStatus(domain, statusPatch));
    }

    const registryRefs: FirebaseFirestore.DocumentReference[] = params.config.domains.map(domain => (
        params.db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(domain)
    ));
    await params.db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
        const currentSnapshots = await Promise.all(registryRefs.map(ref => transaction.get(ref)));
        const invalidCurrentIndex = currentSnapshots.findIndex(snapshot => (
            !snapshot.exists || !registryScopeMatches(snapshot.data() || {}, params.scope)
        ));
        if (invalidCurrentIndex >= 0) {
            const domain = params.config.domains[invalidCurrentIndex];
            logRuntimeFailure('answerlattice_hosted_help_domain_refresh_ownership_invalid', new Error('Hosted help domain refresh transaction ownership invalid'), {
                ...getBoundedRuntimeStringContext('tenantId', params.scope.tenantId),
                ...getBoundedRuntimeStringContext('storeId', params.scope.storeId),
                ...getBoundedRuntimeStringContext('domain', domain),
                registryExists: Boolean(currentSnapshots[invalidCurrentIndex]?.exists),
            });
            throw new HostedHelpRegistryOwnershipError();
        }
        params.config.domains.forEach((domain, index) => {
            const registryDoc = registryDocs.get(domain);
            if (!registryDoc) throw new Error('Invalid hosted help registry document');
            transaction.set(registryRefs[index], registryDoc, { merge: true });
        });
    });
    params.config.domains.forEach(domain => revalidateAnswerlatticeHostedHelpDomain(domain));
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

        const storeData = storeSnap.data() || {};
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const config = normalizeHostedHelpConfig(storeData.hostedHelpConfig);
        const refreshDomains = request.nextUrl.searchParams.get('refreshDomains') === '1';
        let domainStatuses;

        if (refreshDomains) {
            const rateLimitConfig = { limit: 10, window: 60 };
            const rateLimitResult = await checkRateLimit({
                key: buildAnswerlatticeRateLimitKey('answerlattice-hosted-help-domain-refresh', scope.storeId),
                limit: rateLimitConfig.limit,
                window: rateLimitConfig.window,
                failClosedOnProviderError: true,
            });
            if (!rateLimitResult.allowed && rateLimitResult.reason === 'provider_unavailable') {
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
            domainStatuses = await getHostedHelpDomainStatuses(db, config.domains, scope);
        }

        return NextResponse.json({ config, domainStatuses });
    } catch (error) {
        if (error instanceof HostedHelpRegistryOwnershipError) {
            return NextResponse.json(
                { error: HOSTED_HELP_DOMAIN_OWNERSHIP_REVIEW_MESSAGE },
                { status: 409, headers: { 'Cache-Control': 'no-store' } },
            );
        }
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
        failClosedOnProviderError: true,
    });
    if (!rateLimitResult.allowed && rateLimitResult.reason === 'provider_unavailable') {
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
        const body = bodyResult.data;
        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            throw new Error('Invalid hosted help settings');
        }
        const bodyRecord = body as Record<string, unknown>;
        const configInput = Object.prototype.hasOwnProperty.call(bodyRecord, 'config')
            ? bodyRecord.config
            : bodyRecord;
        if (Object.prototype.hasOwnProperty.call(bodyRecord, 'config') && Object.keys(bodyRecord).length !== 1) {
            throw new Error('Invalid hosted help settings');
        }
        config = parseHostedHelpConfigSaveInput(configInput);
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
        if (!isAnswerlatticeStoreInScope(storeData, scope, storeSnap.id)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const previousConfig = normalizeHostedHelpConfig(storeData.hostedHelpConfig);
        const previousDomains = previousConfig.domains;
        const nextDomains = config.domains;
        const removedDomains = previousDomains.filter(domain => !nextDomains.includes(domain));

        if (config.enabled && nextDomains.length === 0) {
            return NextResponse.json({ error: 'Add at least one help domain before enabling hosted help.' }, { status: 400 });
        }

        const unsupportedDomain = nextDomains.find(domain => !isAnswerlatticeHostedHelpCandidateHostname(domain));
        if (unsupportedDomain) {
            return NextResponse.json(
                { error: 'Use a help, docs, support, kb, knowledge, or answers domain.' },
                { status: 400 },
            );
        }

        const reservedDomain = nextDomains.find(domain => isReservedCustomDomainClaimCandidate(domain));
        if (reservedDomain) {
            return NextResponse.json({ error: 'This domain is reserved for a product service.' }, { status: 409 });
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

        const domainsToProvision = nextDomains.filter(domain => !registryByDomain.has(domain));
        if ((domainsToProvision.length > 0 || removedDomains.length > 0) && !isVercelDomainManagementConfigured()) {
            return NextResponse.json({ error: 'Domain provisioning is not configured.' }, { status: 503 });
        }
        for (const domain of removedDomains) {
            const registrySnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(domain).get();
            if (registrySnap.exists && !registryScopeMatches(registrySnap.data() || {}, scope)) {
                return NextResponse.json(
                    { error: HOSTED_HELP_DOMAIN_OWNERSHIP_REVIEW_MESSAGE },
                    { status: 409, headers: { 'Cache-Control': 'no-store' } },
                );
            }
        }

        const provisionedStatuses = new Map<string, AnswerlatticeHostedHelpRegistryStatus>();
        const providerAddedDomains: string[] = [];
        const providerRemovedDomains: string[] = [];
        for (const domain of domainsToProvision) {
            let addResult: Awaited<ReturnType<typeof addDomainToVercelProject>>;
            try {
                addResult = await addDomainToVercelProject(domain);
            } catch (error) {
                logRuntimeFailure('answerlattice_hosted_help_domain_add_failed', error, {
                    ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                    ...getBoundedRuntimeStringContext('domain', domain),
                });
                await compensateHostedHelpProviderChanges({
                    db,
                    addedDomains: providerAddedDomains,
                    removedDomains: providerRemovedDomains,
                    scope,
                });
                return NextResponse.json(
                    { error: getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_ADD_FAILED_MESSAGE) },
                    { status: 502, headers: { 'Cache-Control': 'no-store' } },
                );
            }
            if (!addResult.ok) {
                logRuntimeFailure('answerlattice_hosted_help_domain_add_failed', new Error('Hosted help domain provider add failed'), {
                    ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                    domainPresent: domain.length > 0,
                    domainLength: domain.length,
                    status: addResult.status,
                    ...getHostedHelpProviderErrorContext(addResult.data),
                });
                await compensateHostedHelpProviderChanges({
                    db,
                    addedDomains: providerAddedDomains,
                    removedDomains: providerRemovedDomains,
                    scope,
                });
                return NextResponse.json(
                    {
                        error: addResult.status === 409
                            ? HOSTED_HELP_DOMAIN_OWNERSHIP_REVIEW_MESSAGE
                            : getHostedHelpClientErrorMessage(HOSTED_HELP_DOMAIN_ADD_FAILED_MESSAGE),
                    },
                    { status: addResult.status === 409 ? 409 : 502 },
                );
            }
            providerAddedDomains.push(domain);

            const now = new Date().toISOString();
            let configResult: Awaited<ReturnType<typeof getVercelDomainConfig>>;
            try {
                configResult = await getVercelDomainConfig(domain);
            } catch (error) {
                logRuntimeFailure('answerlattice_hosted_help_domain_status_failed', error, {
                    ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                    ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                    ...getBoundedRuntimeStringContext('domain', domain),
                });
                configResult = { ok: false, status: 502, data: {} };
            }
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

        for (const domain of removedDomains) {
            const removed = await removeHostedHelpProviderDomain({
                domain,
                scope,
                failureCode: 'answerlattice_hosted_help_domain_removal_failed',
            });
            if (!removed) {
                await compensateHostedHelpProviderChanges({
                    db,
                    addedDomains: providerAddedDomains,
                    removedDomains: providerRemovedDomains,
                    scope,
                });
                return NextResponse.json(
                    { error: 'Failed to remove hosted help domain.' },
                    { status: 502, headers: { 'Cache-Control': 'no-store' } },
                );
            }
            providerRemovedDomains.push(domain);
        }

        const registryDomains = Array.from(new Set([...nextDomains, ...removedDomains]));
        const registryRefs: FirebaseFirestore.DocumentReference[] = registryDomains.map(domain => (
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_PUBLIC_HELP_SITES).doc(domain)
        ));
        const previousConfigVersion = normalizeHostedHelpConfigVersion(storeData.hostedHelpConfigVersion);

        try {
            await db.runTransaction(async (transaction: FirebaseFirestore.Transaction) => {
                const currentStoreSnapshot = await transaction.get(storeRef);
                const currentRegistrySnapshots = await Promise.all(
                    registryRefs.map(ref => transaction.get(ref)),
                );
                if (!currentStoreSnapshot.exists) throw new HostedHelpConcurrentUpdateError();
                const currentStoreData = currentStoreSnapshot.data() || {};
                if (!isAnswerlatticeStoreInScope(currentStoreData, scope, currentStoreSnapshot.id)) {
                    throw new HostedHelpRegistryOwnershipError();
                }
                const currentConfig = normalizeHostedHelpConfig(currentStoreData.hostedHelpConfig);
                const currentConfigVersion = normalizeHostedHelpConfigVersion(currentStoreData.hostedHelpConfigVersion);
                if (
                    JSON.stringify(currentConfig) !== JSON.stringify(previousConfig)
                    || currentConfigVersion !== previousConfigVersion
                ) {
                    throw new HostedHelpConcurrentUpdateError();
                }

                const currentRegistryByDomain = new Map<string, Record<string, any>>();
                currentRegistrySnapshots.forEach((snapshot, index) => {
                    if (!snapshot.exists) return;
                    const domain = registryDomains[index];
                    const currentRegistry = snapshot.data() || {};
                    if (!registryScopeMatches(currentRegistry, scope)) {
                        logRuntimeFailure('answerlattice_hosted_help_registry_delete_scope_mismatch', new Error('Hosted help registry transaction scope mismatch'), {
                            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
                            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
                            ...getBoundedRuntimeStringContext('domain', domain),
                        });
                        throw new HostedHelpRegistryOwnershipError();
                    }
                    currentRegistryByDomain.set(domain, currentRegistry);
                });

                transaction.set(storeRef, {
                    hostedHelpConfig: config,
                    hostedHelpConfigVersion: currentConfigVersion + 1,
                    hostedHelpUpdatedAt: new Date().toISOString(),
                }, { merge: true });

                nextDomains.forEach(domain => {
                    const existingRegistry = currentRegistryByDomain.get(domain) || {};
                    const status = provisionedStatuses.get(domain) || {
                        domainStatus: existingRegistry.domainStatus || (existingRegistry.domainVerified ? 'verified' : 'pending'),
                        domainVerified: Boolean(existingRegistry.domainVerified),
                        domainVerifiedAt: existingRegistry.domainVerifiedAt || null,
                        domainLastCheckedAt: existingRegistry.domainLastCheckedAt || null,
                        domainVerification: existingRegistry.domainVerification
                            ? normalizeHostedHelpDomainVerification(existingRegistry.domainVerification)
                            : null,
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
                    if (!registryDoc) throw new Error('Invalid hosted help registry document');
                    transaction.set(registryRefs[registryDomains.indexOf(domain)], registryDoc, { merge: true });
                });

                removedDomains.forEach(domain => {
                    const refIndex = registryDomains.indexOf(domain);
                    if (refIndex >= 0 && currentRegistrySnapshots[refIndex]?.exists) {
                        transaction.delete(registryRefs[refIndex]);
                    }
                });
            });
        } catch (error) {
            await compensateHostedHelpProviderChanges({
                db,
                addedDomains: providerAddedDomains,
                removedDomains: providerRemovedDomains,
                scope,
            });
            throw error;
        }

        Array.from(new Set([...previousDomains, ...nextDomains])).forEach(domain => {
            revalidateAnswerlatticeHostedHelpDomain(domain);
        });

        logRuntimeDiagnostic('answerlattice_hosted_help_settings_saved', {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
            domainCount: nextDomains.length,
            enabled: config.enabled,
        });

        const domainStatuses = await getHostedHelpDomainStatuses(db, nextDomains, scope);
        return NextResponse.json({ config, domainStatuses });
    } catch (error) {
        if (error instanceof HostedHelpRegistryOwnershipError) {
            return NextResponse.json(
                { error: HOSTED_HELP_DOMAIN_OWNERSHIP_REVIEW_MESSAGE },
                { status: 409, headers: { 'Cache-Control': 'no-store' } },
            );
        }
        if (error instanceof HostedHelpConcurrentUpdateError) {
            return NextResponse.json(
                { error: 'Hosted help settings changed in another session. Refresh and try again.' },
                { status: 409, headers: { 'Cache-Control': 'no-store' } },
            );
        }
        logRuntimeFailure('answerlattice_hosted_help_settings_save_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', scope.storeId),
        });
        return NextResponse.json({ error: 'Failed to save hosted help settings' }, { status: 500 });
    }
});
