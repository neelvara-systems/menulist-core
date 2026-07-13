export const dynamic = 'force-dynamic';

/**
 * Answerlattice Widget Runtime Config
 *
 * Public read-only endpoint used by the loader script. Returns only the public
 * widget configuration subset; no workspace details, origins, or secrets.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PRODUCT_IDS } from '@constant/product';
import {
    buildWidgetRuntimeStatusWrite,
    getWidgetRuntimeStatusFromStoreData,
    sanitizeWidgetRuntimeTelemetry,
    shouldUpdateWidgetRuntimeStatus,
} from '@lib/answerlattice/widgetRuntimeStatus';
import { getAnswerlatticeContextBundleManifestServer } from '@lib/answerlattice/contextBundleBuilderServer';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import {
    ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
    ANSWERLATTICE_WIDGET_REMOTE_CONFIG_TTL_SECONDS,
    normalizeWidgetConfig,
} from '@lib/answerlattice/widgetConfig';
import { createAnswerlatticeWidgetRuntimeAuthorization } from '@lib/answerlattice/widgetRuntimeTokenServer';
import {
    generateETag,
    handlePublicApiCorsPreflight,
    hashApiKey,
    hasPublicApiCredentialScope,
    isRequestOriginAllowed,
    validatePublicApiKey,
    withPublicApiCors,
} from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

const WIDGET_AUTH_CACHE_TTL_MS = 15_000;
const CONFIG_CACHE_TTL_MS = Math.min(
    ANSWERLATTICE_WIDGET_REMOTE_CONFIG_TTL_SECONDS * 1000,
    WIDGET_AUTH_CACHE_TTL_MS,
);
const MAX_RUNTIME_CONFIG_CACHE_ENTRIES = 500;

type RuntimeConfigCacheEntry = {
    body: Record<string, any>;
    etag: string;
    expiresAt: number;
};

const runtimeConfigCache = new Map<string, RuntimeConfigCacheEntry>();

const buildCacheKey = (apiKey: string, origin: string | null): string => (
    `${hashApiKey(apiKey)}:${origin || 'no-origin'}`
);

const buildResponse = (
    request: NextRequest,
    body: Record<string, any>,
    etag: string,
): NextResponse => {
    if (request.headers.get('if-none-match') === etag) {
        return withPublicApiCors(new NextResponse(null, {
            status: 304,
            headers: {
                ETag: etag,
                'Cache-Control': `private, max-age=${ANSWERLATTICE_WIDGET_REMOTE_CONFIG_TTL_SECONDS}`,
            },
        }), request);
    }

    return withPublicApiCors(NextResponse.json(body, {
        headers: {
            ETag: etag,
            'Cache-Control': `private, max-age=${ANSWERLATTICE_WIDGET_REMOTE_CONFIG_TTL_SECONDS}`,
        },
    }), request);
};

const rememberRuntimeConfig = (
    cacheKey: string,
    body: Record<string, any>,
    etag: string,
): void => {
    if (runtimeConfigCache.size >= MAX_RUNTIME_CONFIG_CACHE_ENTRIES) {
        const oldestKey = runtimeConfigCache.keys().next().value;
        if (oldestKey) runtimeConfigCache.delete(oldestKey);
    }

    runtimeConfigCache.set(cacheKey, {
        body,
        etag,
        expiresAt: Date.now() + CONFIG_CACHE_TTL_MS,
    });
};

const hasActivePredictiveTriggers = async (
    db: any,
    tId: number,
    sId: number,
): Promise<boolean> => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PREDICTIVE_SUPPORT) return false;
    const snap = await db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`predictiveTriggers_${tId}_${sId}`)
        .get();
    if (!snap.exists) return false;
    const data = snap.data() || {};
    if (data.pId !== PRODUCT_IDS.ANSWERLATTICE || data.tId !== tId || data.sId !== sId) return false;
    if (Number(data.activeTriggerCount || 0) > 0) return true;
    if (data.activeTriggerCount === undefined && data.triggers && typeof data.triggers === 'object') {
        return Object.values(data.triggers).some((trigger: any) => trigger?.status === 'active');
    }
    return false;
};

const toIsoTimestamp = (value: any): string | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const getReadyPublicBundleConfig = async (tId: number, sId: number) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET_BUNDLE_BOOTSTRAP) {
        return null;
    }
    const manifest = await getAnswerlatticeContextBundleManifestServer(tId, sId);
    if (!manifest) return null;
    if (manifest.status !== 'ready' || !manifest.publicBundleId || !manifest.activeVersion) return null;
    const basePath = `/api/answerlattice/bundles/public/${manifest.publicBundleId}/v${manifest.activeVersion}`;
    return {
        status: manifest.status,
        bundleVersion: Number(manifest.activeVersion || manifest.bundleVersion || 0),
        generatedAt: toIsoTimestamp(manifest.generatedAt),
        basePath,
        files: {
            widgetBootstrap: `${basePath}/widget-bootstrap.json`,
            contextIndex: `${basePath}/context-index.json`,
            docsNav: `${basePath}/docs-nav.json`,
            canonicalLite: `${basePath}/canonical-lite.json`,
        },
        stats: manifest.stats || {},
    };
};

const getPredictiveSupportCapability = async (
    db: any,
    tId: number,
    sId: number,
): Promise<boolean> => {
    try {
        return await hasActivePredictiveTriggers(db, tId, sId);
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_config_predictive_summary_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tId),
            ...getBoundedRuntimeStringContext('storeId', sId),
        });
        return false;
    }
};

const getWidgetPublicBundleConfig = async (
    tId: number,
    sId: number,
) => {
    try {
        return await getReadyPublicBundleConfig(tId, sId);
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_config_bundle_manifest_load_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tId),
            ...getBoundedRuntimeStringContext('storeId', sId),
        });
        return null;
    }
};

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function GET(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WIDGET) {
        return withPublicApiCors(NextResponse.json({ error: 'Widget not enabled' }, { status: 404 }), request);
    }

    try {
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey || !apiKey.startsWith('al_')) {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }

        const rateLimitConfig = getRateLimitForFeature('PUBLIC_API');
        const preAuthRateLimit = await checkRateLimit({
            key: `widget-config-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
            limit: Math.max(rateLimitConfig.limit * 4, 120),
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!preAuthRateLimit.allowed) {
            const providerUnavailable = preAuthRateLimit.reason === 'provider_unavailable';
            const retryAfter = Math.max(Math.ceil((preAuthRateLimit.resetAt - Date.now()) / 1000), 1);
            return withPublicApiCors(NextResponse.json(
                { error: providerUnavailable ? 'Widget config temporarily unavailable' : 'Rate limit exceeded' },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: { 'Cache-Control': 'no-store', 'Retry-After': String(retryAfter) },
                },
            ), request);
        }

        const requestOrigin = request.headers.get('origin') || request.nextUrl.origin;
        const cacheKey = buildCacheKey(apiKey, requestOrigin);
        const cached = runtimeConfigCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return buildResponse(request, cached.body, cached.etag);
        }
        if (cached) {
            runtimeConfigCache.delete(cacheKey);
        }

        const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
        const rateLimitResult = await checkRateLimit({
            key: `widget-config:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            const retryAfter = Math.max(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000), 1);
            return withPublicApiCors(NextResponse.json(
                { error: providerUnavailable ? 'Widget config temporarily unavailable' : 'Rate limit exceeded' },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: {
                        'Cache-Control': 'no-store',
                        'Retry-After': String(retryAfter),
                    },
                }
            ), request);
        }

        const authResult = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            cacheTtlMs: WIDGET_AUTH_CACHE_TTL_MS,
            includeAnswerlatticeWidgetApi: true,
            includePublicApi: false,
            preferAnswerlatticeWidgetApi: true,
        });
        if (!authResult) {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }

        const credential = authResult.credential || {};
        if (credential.productId && credential.productId !== PRODUCT_IDS.ANSWERLATTICE) {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }
        if (credential.purpose && credential.purpose !== 'answerlattice_widget') {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }
        if (!hasPublicApiCredentialScope(credential, 'widget:config')) {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }

        const { storeData, storeId } = authResult;
        const tId = Number(storeData.tId ?? storeData.tenantId);
        const sId = Number(storeData.sId ?? storeData.storeId ?? storeData.id ?? storeId);
        if (
            !Number.isSafeInteger(tId)
            || !Number.isSafeInteger(sId)
            || tId <= 0
            || sId <= 0
            || String(sId) !== storeId
        ) {
            logRuntimeFailure('answerlattice_widget_config_invalid_workspace_context', undefined, {
                ...getBoundedRuntimeStringContext('storeId', storeId),
            });
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }

        if (!isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)) {
            return withPublicApiCors(NextResponse.json({ error: 'Origin not allowed' }, { status: 403 }), request);
        }

        const runtimeAuthorizationRequired = Array.isArray(storeData.widgetAllowedOrigins)
            && storeData.widgetAllowedOrigins.length > 0;
        let runtimeAuthorization: { token: string; expiresAt: number } | null = null;
        if (runtimeAuthorizationRequired) {
            try {
                const authorization = createAnswerlatticeWidgetRuntimeAuthorization({
                    apiKey,
                    tId,
                    sId,
                    origin: requestOrigin,
                });
                runtimeAuthorization = {
                    token: authorization.token,
                    expiresAt: authorization.expiresAt,
                };
            } catch (authorizationError) {
                logRuntimeFailure('answerlattice_widget_runtime_authorization_failed', authorizationError, {
                    ...getBoundedRuntimeStringContext('tenantId', tId),
                    ...getBoundedRuntimeStringContext('storeId', sId),
                });
                return withPublicApiCors(NextResponse.json(
                    { error: 'Widget config temporarily unavailable' },
                    { status: 503, headers: { 'Cache-Control': 'no-store' } },
                ), request);
            }
        }

        const runtimeStatus = getWidgetRuntimeStatusFromStoreData(storeData);
        const nextRuntimeStatus = sanitizeWidgetRuntimeTelemetry(request);
        const db = answerlatticeFirestoreAdmin as any;
        if (
            db
            && typeof db.collection === 'function'
            && shouldUpdateWidgetRuntimeStatus(runtimeStatus, nextRuntimeStatus)
        ) {
            try {
                await answerlatticeFirestoreAdmin
                    .collection(DB_COLLECTIONS.STORES)
                    .doc(String(sId))
                    .set(buildWidgetRuntimeStatusWrite(nextRuntimeStatus), { merge: true });
            } catch (telemetryError) {
                logRuntimeFailure('answerlattice_widget_config_runtime_status_write_failed', telemetryError, {
                    ...getBoundedRuntimeStringContext('tenantId', tId),
                    ...getBoundedRuntimeStringContext('storeId', sId),
                });
            }
        }

        const [predictiveSupport, bundleConfig] = await Promise.all([
            getPredictiveSupportCapability(db, tId, sId),
            getWidgetPublicBundleConfig(tId, sId),
        ]);
        const body = {
            schemaVersion: ANSWERLATTICE_WIDGET_CONFIG_SCHEMA_VERSION,
            cacheTtlSeconds: ANSWERLATTICE_WIDGET_REMOTE_CONFIG_TTL_SECONDS,
            configVersion: Number(storeData.widgetConfigVersion || 0),
            config: normalizeWidgetConfig(storeData.widgetConfig),
            capabilities: {
                predictiveSupport,
                contextBundles: Boolean(bundleConfig),
            },
            runtimeAuthorization: runtimeAuthorizationRequired
                ? {
                    required: true,
                    token: runtimeAuthorization?.token,
                    expiresAt: runtimeAuthorization?.expiresAt,
                }
                : { required: false },
            bundles: bundleConfig,
        };
        const etag = generateETag(body);

        rememberRuntimeConfig(cacheKey, body, etag);

        return buildResponse(request, body, etag);
    } catch (error) {
        logRuntimeFailure('answerlattice_widget_config_failed', error);
        return withPublicApiCors(NextResponse.json({ error: 'Something went wrong' }, { status: 500 }), request);
    }
}
