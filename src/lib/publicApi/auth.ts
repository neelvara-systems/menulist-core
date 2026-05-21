/**
 * Platform Pull API — API Key Authentication
 *
 * Validates X-API-Key header and returns associated store data.
 * Used by public read-only API routes.
 *
 * Security: API keys are stored as SHA-256 hashes in Firestore.
 * Raw keys are never persisted after generation.
 *
 * @see __docs__/platform-pull-api/platform-pull-api_impl.md
 */

import { DB_COLLECTIONS } from "@constant/database";
import { canonicaFirestoreAdmin } from "@lib/firebase/canonicaFirebaseAdmin";
import { shouldUseSharedCanonicaFirebase } from "@lib/firebase/canonicaConfig";
import { admin } from "@lib/firebase/firebaseAdmin";
import { secureLog } from "@lib/security/secureLogger";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

/** Current schema version for pull API responses */
export const PULL_API_SCHEMA_VERSION = "1.0";
const PUBLIC_API_KEY_PATTERN = /^(ml|cn)_[A-Za-z0-9_-]{20,128}$/;

function normalizePublicApiKey(apiKey: string | null): string | null {
    const normalizedApiKey = apiKey?.trim();
    if (!normalizedApiKey || normalizedApiKey.length < 10) return null;
    if (!PUBLIC_API_KEY_PATTERN.test(normalizedApiKey)) return null;
    return normalizedApiKey;
}

export function normalizeRequestOrigin(origin: string | null | undefined): string | null {
    const trimmed = origin?.trim();
    if (!trimmed || trimmed === 'null') return null;

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.origin;
    } catch {
        return null;
    }
}

export function isRequestOriginAllowed(
    requestOrigin: string | null | undefined,
    allowedOrigins: unknown,
): boolean {
    if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) return true;

    const normalizedAllowed = allowedOrigins
        .filter((origin): origin is string => typeof origin === 'string')
        .map(normalizeRequestOrigin)
        .filter((origin): origin is string => Boolean(origin));

    if (normalizedAllowed.length === 0) return false;

    const normalizedRequestOrigin = normalizeRequestOrigin(requestOrigin);
    return Boolean(normalizedRequestOrigin && normalizedAllowed.includes(normalizedRequestOrigin));
}

/**
 * Hash an API key using SHA-256.
 * Used for both storage and validation.
 */
export function hashApiKey(apiKey: string): string {
    return createHash('sha256').update(apiKey.trim()).digest('hex');
}

/**
 * Generate a deterministic ETag from a JSON-serializable payload.
 * Uses SHA-256 hash of the stringified response.
 */
export function generateETag(payload: Record<string, any>): string {
    const json = JSON.stringify(payload);
    return createHash('sha256').update(json).digest('hex').slice(0, 32);
}

/**
 * Build a structured error response following the standard format.
 */
export function apiError(
    code: string,
    message: string,
    status: number,
    headers?: Record<string, string>,
): NextResponse {
    return NextResponse.json(
        { error: { code, message } },
        { status, headers },
    );
}

/**
 * Log minimal abuse-detection metadata for a pull API request.
 * No dashboards — only for detecting leaked keys or abnormal patterns.
 */
export function logApiRequest(
    request: NextRequest,
    storeId: string,
    endpoint: string,
): void {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    secureLog(`[Public API] ${endpoint}`, {
        storeId,
        ip,
        userAgent: userAgent.slice(0, 120),
    });
}

/**
 * Validate an API key and return the associated store data.
 *
 * Lookup strategy:
 * 1. Hash the incoming key → query by publicApi.apiKeyHash (secure path)
 * 2. Fallback: query by publicApi.apiKey (backward compat for pre-hash keys)
 *
 * @returns Store data if valid key, null if invalid
 */
export type PublicApiCredentialSource = 'publicApi' | 'canonicaWidgetApi' | 'canonicaWidgetTestApi';
export type PublicApiCredentialScope =
    | 'public:read'
    | 'widget:config'
    | 'widget:search'
    | 'widget:feedback'
    | 'widget:predictive';

export type PublicApiKeyValidationResult = {
    credential?: Record<string, any>;
    credentialSource: PublicApiCredentialSource;
    storeData: any;
    storeId: string;
};

export type PublicApiKeyValidationOptions = {
    allowLegacyRawFallback?: boolean;
    includePublicApi?: boolean;
    includeCanonicaWidgetApi?: boolean;
    cacheTtlMs?: number;
    includeCanonicaWidgetTestApi?: boolean;
    preferCanonicaWidgetApi?: boolean;
    preferCanonicaWidgetTestApi?: boolean;
};

const isCanonicaWidgetTestKey = (apiKey: string): boolean => /^cn_[a-f0-9]{64}$/i.test(apiKey);
const MAX_VALIDATION_CACHE_TTL_MS = 30_000;
const validationCache = new Map<string, {
    expiresAt: number;
    result: PublicApiKeyValidationResult | null;
}>();

const buildValidationCacheKey = (
    keyHash: string,
    options: {
        allowLegacyRawFallback: boolean;
        includePublicApi: boolean;
        includeCanonicaWidgetApi: boolean;
        includeCanonicaWidgetTestApi: boolean;
        preferCanonicaWidgetApi: boolean;
        preferCanonicaWidgetTestApi: boolean;
    },
) => [
    keyHash,
    options.allowLegacyRawFallback ? 'legacy' : 'hash-only',
    options.includePublicApi ? 'with-public' : 'without-public',
    options.includeCanonicaWidgetApi ? 'with-widget' : 'without-widget',
    options.includeCanonicaWidgetTestApi ? 'with-widget-test' : 'public-only',
    options.preferCanonicaWidgetApi ? 'prefer-widget' : 'prefer-non-widget',
    options.preferCanonicaWidgetTestApi ? 'prefer-widget-test' : 'prefer-public',
].join(':');

const getValidationCacheTtl = (ttlMs: number | undefined): number => {
    const ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) return 0;
    return Math.min(ttl, MAX_VALIDATION_CACHE_TTL_MS);
};

export async function validatePublicApiKey(
    apiKey: string | null,
    options: PublicApiKeyValidationOptions = {},
): Promise<PublicApiKeyValidationResult | null> {
    const normalizedApiKey = normalizePublicApiKey(apiKey);
    if (!normalizedApiKey) return null;

    const db = admin.firestore();
    const keyHash = hashApiKey(normalizedApiKey);

    let credentialSource: PublicApiCredentialSource = 'publicApi';
    const allowLegacyRawFallback = options.allowLegacyRawFallback !== false;
    const includePublicApi = options.includePublicApi !== false;
    const includeCanonicaWidgetApi = Boolean(options.includeCanonicaWidgetApi);
    const includeCanonicaWidgetTestApi = Boolean(options.includeCanonicaWidgetTestApi);
    const dedicatedCanonicaDb = !shouldUseSharedCanonicaFirebase
        && normalizedApiKey.startsWith('cn_')
        && includeCanonicaWidgetApi
        && canonicaFirestoreAdmin
        && typeof (canonicaFirestoreAdmin as any).collection === 'function'
        ? canonicaFirestoreAdmin
        : null;
    const preferCanonicaWidgetApi = Boolean(options.preferCanonicaWidgetApi && includeCanonicaWidgetApi);
    const preferCanonicaWidgetTestApi = Boolean(
        options.preferCanonicaWidgetTestApi
        && includeCanonicaWidgetTestApi
        && isCanonicaWidgetTestKey(normalizedApiKey)
    );
    const cacheTtl = getValidationCacheTtl(options.cacheTtlMs);
    const cacheKey = cacheTtl
        ? buildValidationCacheKey(keyHash, {
            allowLegacyRawFallback,
            includePublicApi,
            includeCanonicaWidgetApi,
            includeCanonicaWidgetTestApi,
            preferCanonicaWidgetApi,
            preferCanonicaWidgetTestApi,
        })
        : '';

    if (cacheKey) {
        const cached = validationCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.result;
        }
        if (cached) {
            validationCache.delete(cacheKey);
        }
    }

    const queryCanonicaWidgetTestApi = async () => db
        .collection(DB_COLLECTIONS.STORES)
        .where('canonicaWidgetTestApi.apiKeyHash', '==', keyHash)
        .limit(1)
        .get();

    const queryCanonicaWidgetApi = async () => {
        const primaryDb = dedicatedCanonicaDb || db;
        const primarySnapshot = await primaryDb
            .collection(DB_COLLECTIONS.STORES)
            .where('canonicaWidgetApi.apiKeyHash', '==', keyHash)
            .limit(1)
            .get();

        if (!primarySnapshot.empty || !dedicatedCanonicaDb) {
            return primarySnapshot;
        }

        // Compatibility fallback for legacy MenuList-hosted test installs that
        // stored a real Canonica widget key before the dedicated project split.
        return db.collection(DB_COLLECTIONS.STORES)
            .where('canonicaWidgetApi.apiKeyHash', '==', keyHash)
            .limit(1)
            .get();
    };

    if (preferCanonicaWidgetTestApi) {
        const widgetSnapshot = await queryCanonicaWidgetTestApi();
        if (!widgetSnapshot.empty) {
            const doc = widgetSnapshot.docs[0];
            const storeData = doc.data();
            const result: PublicApiKeyValidationResult = {
                credential: storeData.canonicaWidgetTestApi,
                credentialSource: 'canonicaWidgetTestApi',
                storeData,
                storeId: doc.id,
            };
            if (cacheKey && cacheTtl) {
                validationCache.set(cacheKey, {
                    expiresAt: Date.now() + cacheTtl,
                    result,
                });
            }
            return result;
        }
    }

    if (preferCanonicaWidgetApi) {
        const widgetSnapshot = await queryCanonicaWidgetApi();
        if (!widgetSnapshot.empty) {
            const doc = widgetSnapshot.docs[0];
            const storeData = doc.data();
            const result: PublicApiKeyValidationResult = {
                credential: storeData.canonicaWidgetApi,
                credentialSource: 'canonicaWidgetApi',
                storeData,
                storeId: doc.id,
            };
            if (cacheKey && cacheTtl) {
                validationCache.set(cacheKey, {
                    expiresAt: Date.now() + cacheTtl,
                    result,
                });
            }
            return result;
        }
    }

    let snapshot: FirebaseFirestore.QuerySnapshot | null = null;

    if (includePublicApi) {
        // Primary: lookup by hash (secure)
        snapshot = await db
            .collection(DB_COLLECTIONS.STORES)
            .where('publicApi.apiKeyHash', '==', keyHash)
            .limit(1)
            .get();

        // Fallback: lookup by raw key (backward compat for pre-migration keys)
        if (snapshot.empty && allowLegacyRawFallback) {
            snapshot = await db
                .collection(DB_COLLECTIONS.STORES)
                .where('publicApi.apiKey', '==', normalizedApiKey)
                .limit(1)
                .get();
        }
    }

    if (
        (!snapshot || snapshot.empty)
        && includeCanonicaWidgetApi
        && normalizedApiKey.startsWith('cn_')
        && !preferCanonicaWidgetApi
    ) {
        snapshot = await queryCanonicaWidgetApi();
        credentialSource = 'canonicaWidgetApi';
    }

    if (
        (!snapshot || snapshot.empty)
        && includeCanonicaWidgetTestApi
        && normalizedApiKey.startsWith('cn_')
        && !preferCanonicaWidgetTestApi
    ) {
        snapshot = await queryCanonicaWidgetTestApi();
        credentialSource = 'canonicaWidgetTestApi';
    }

    if (!snapshot || snapshot.empty) {
        secureLog('[Public API] Invalid API key attempt');
        if (cacheKey && cacheTtl) {
            validationCache.set(cacheKey, {
                expiresAt: Date.now() + cacheTtl,
                result: null,
            });
        }
        return null;
    }

    const doc = snapshot.docs[0];
    const storeData = doc.data();
    const result: PublicApiKeyValidationResult = {
        credential: credentialSource === 'publicApi'
            ? storeData.publicApi
            : credentialSource === 'canonicaWidgetApi'
                ? storeData.canonicaWidgetApi
                : storeData.canonicaWidgetTestApi,
        credentialSource,
        storeData,
        storeId: doc.id,
    };

    if (cacheKey && cacheTtl) {
        validationCache.set(cacheKey, {
            expiresAt: Date.now() + cacheTtl,
            result,
        });
    }

    return result;
}

export function hasPublicApiCredentialScope(
    credential: Record<string, any> | undefined,
    requiredScope: PublicApiCredentialScope,
): boolean {
    if (!credential) return false;
    if (Array.isArray(credential.scopes)) {
        return credential.scopes.includes(requiredScope);
    }

    const purpose = typeof credential.purpose === 'string' ? credential.purpose : '';
    if (requiredScope.startsWith('widget:')) {
        return purpose === 'canonica_widget' || purpose === 'canonica_widget_test_host';
    }

    if (requiredScope === 'public:read') {
        return purpose !== 'canonica_widget' && purpose !== 'canonica_widget_test_host';
    }

    return false;
}

export function buildPublicApiCorsHeaders(request: NextRequest): Record<string, string> {
    const origin = normalizeRequestOrigin(request.headers.get('origin'));
    if (!origin) return {};

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin',
    };
}

export function withPublicApiCors(response: NextResponse, request: NextRequest): NextResponse {
    const headers = buildPublicApiCorsHeaders(request);
    Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
    return response;
}

export function handlePublicApiCorsPreflight(request: NextRequest): NextResponse {
    return new NextResponse(null, {
        status: 204,
        headers: buildPublicApiCorsHeaders(request),
    });
}
