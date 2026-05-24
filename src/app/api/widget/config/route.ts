export const dynamic = 'force-dynamic';

/**
 * Canonica Widget Runtime Config
 *
 * Public read-only endpoint used by the loader script. Returns only the public
 * widget configuration subset; no workspace details, origins, or secrets.
 */

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import {
    buildWidgetRuntimeStatusWrite,
    getWidgetRuntimeStatusFromStoreData,
    sanitizeWidgetRuntimeTelemetry,
    shouldUpdateWidgetRuntimeStatus,
} from '@lib/canonica/widgetRuntimeStatus';
import { getCanonicaBundleManifestDocId } from '@lib/canonica/compiledContext';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import {
    CANONICA_WIDGET_CONFIG_SCHEMA_VERSION,
    CANONICA_WIDGET_REMOTE_CONFIG_TTL_SECONDS,
    normalizeWidgetConfig,
} from '@lib/canonica/widgetConfig';
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
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';

const WIDGET_AUTH_CACHE_TTL_MS = 15_000;
const CONFIG_CACHE_TTL_MS = CANONICA_WIDGET_REMOTE_CONFIG_TTL_SECONDS * 1000;
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
                'Cache-Control': `private, max-age=${CANONICA_WIDGET_REMOTE_CONFIG_TTL_SECONDS}`,
            },
        }), request);
    }

    return withPublicApiCors(NextResponse.json(body, {
        headers: {
            ETag: etag,
            'Cache-Control': `private, max-age=${CANONICA_WIDGET_REMOTE_CONFIG_TTL_SECONDS}`,
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
    if (!FEATURE_FLAGS.ENABLE_CANONICA_PREDICTIVE_SUPPORT) return false;
    const snap = await db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(`predictiveTriggers_${tId}_${sId}`)
        .get();
    if (!snap.exists) return false;
    const data = snap.data() || {};
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

const getReadyPublicBundleConfig = async (
    db: any,
    tId: number,
    sId: number,
) => {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_BUNDLES || !FEATURE_FLAGS.ENABLE_CANONICA_WIDGET_BUNDLE_BOOTSTRAP) {
        return null;
    }
    const snap = await db
        .collection(DB_COLLECTIONS.PLATFORM_SUMMARY)
        .doc(getCanonicaBundleManifestDocId(tId, sId))
        .get();
    if (!snap.exists) return null;
    const manifest = snap.data() || {};
    if (manifest.status !== 'ready' || !manifest.publicBundleId || !manifest.activeVersion) return null;
    const basePath = `/api/canonica/bundles/public/${manifest.publicBundleId}/v${manifest.activeVersion}`;
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

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function GET(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_WIDGET) {
        return withPublicApiCors(NextResponse.json({ error: 'Widget not enabled' }, { status: 404 }), request);
    }

    try {
        const apiKey = request.headers.get('x-api-key')?.trim();
        if (!apiKey || !apiKey.startsWith('cn_')) {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
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
        const rateLimitConfig = getRateLimitForFeature('PUBLIC_API');
        const rateLimitResult = await checkRateLimit({
            key: `widget-config:${apiKeyRateLimitId}`,
            limit: rateLimitConfig.limit,
            window: rateLimitConfig.window,
        });
        if (!rateLimitResult.allowed) {
            const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
            return withPublicApiCors(NextResponse.json(
                { error: 'Rate limit exceeded' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(Math.max(retryAfter, 1)) },
                }
            ), request);
        }

        const authResult = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            cacheTtlMs: WIDGET_AUTH_CACHE_TTL_MS,
            includeCanonicaWidgetApi: true,
            preferCanonicaWidgetApi: true,
        });
        if (!authResult) {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }

        const credential = authResult.credential || {};
        if (credential.productId && credential.productId !== 'CN') {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }
        if (credential.purpose && !String(credential.purpose).startsWith('canonica')) {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }
        if (!hasPublicApiCredentialScope(credential, 'widget:config')) {
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }

        const { storeData, storeId } = authResult;
        const tId = Number(storeData.tenantId || storeData.tId);
        const sId = Number(storeData.id || storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            secureError(
                '[Widget Config] Invalid API key workspace context',
                new Error('Authenticated API key does not resolve to a valid tenant/store'),
                { storeId }
            );
            return withPublicApiCors(NextResponse.json({ error: 'Invalid API key' }, { status: 401 }), request);
        }

        if (!isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)) {
            return withPublicApiCors(NextResponse.json({ error: 'Origin not allowed' }, { status: 403 }), request);
        }

        const runtimeStatus = getWidgetRuntimeStatusFromStoreData(storeData);
        const nextRuntimeStatus = sanitizeWidgetRuntimeTelemetry(request);
        const db = canonicaFirestoreAdmin as any;
        if (
            db
            && typeof db.collection === 'function'
            && shouldUpdateWidgetRuntimeStatus(runtimeStatus, nextRuntimeStatus)
        ) {
            try {
                await canonicaFirestoreAdmin
                    .collection(DB_COLLECTIONS.STORES)
                    .doc(String(sId))
                    .set(buildWidgetRuntimeStatusWrite(nextRuntimeStatus), { merge: true });
            } catch (telemetryError) {
                secureError('[Widget Config] Runtime telemetry write failed', telemetryError as Error, {
                    storeId: sId,
                    tenantId: tId,
                });
            }
        }

        const [predictiveSupport, bundleConfig] = await Promise.all([
            hasActivePredictiveTriggers(db, tId, sId).catch(() => false),
            getReadyPublicBundleConfig(db, tId, sId).catch(() => null),
        ]);
        const body = {
            schemaVersion: CANONICA_WIDGET_CONFIG_SCHEMA_VERSION,
            cacheTtlSeconds: CANONICA_WIDGET_REMOTE_CONFIG_TTL_SECONDS,
            configVersion: Number(storeData.widgetConfigVersion || 0),
            config: normalizeWidgetConfig(storeData.widgetConfig),
            capabilities: {
                predictiveSupport,
                contextBundles: Boolean(bundleConfig),
            },
            bundles: bundleConfig,
        };
        const etag = generateETag(body);

        rememberRuntimeConfig(cacheKey, body, etag);

        return buildResponse(request, body, etag);
    } catch (error) {
        secureError('[Widget Config] Error', error as Error);
        return withPublicApiCors(NextResponse.json({ error: 'Something went wrong' }, { status: 500 }), request);
    }
}
