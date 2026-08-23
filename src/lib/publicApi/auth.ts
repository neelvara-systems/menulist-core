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
import { getAnswerlatticeWidgetKeyRecordByHash } from "@lib/answerlattice/widgetKeyManager";
import {
    isAnswerlatticeActiveStoreInScope,
    normalizeConsistentAnswerlatticeScopeDocumentIds,
} from "@lib/answerlattice/sessionScope";
import {
    answerlatticeAdminApp,
    answerlatticeFirestoreAdmin,
} from "@lib/firebase/answerlatticeFirebaseAdmin";
import { shouldUseSharedAnswerlatticeFirebase } from "@lib/firebase/answerlatticeConfig";
import { admin } from "@lib/firebase/firebaseAdmin";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import {
    isMenuListPublicApiProductEntity,
    isMenuListPublicApiStoreIdentityConsistent,
    isMenuListPublicApiTenantIdentityConsistent,
    resolveMenuListPublicApiTenantDocumentId,
} from '@lib/publicApi/menuListScope';
import { isMenuListPublicApiEntityEligible } from "@lib/publicApi/targetEligibility";
import { buildPullApiETagPayload } from "@lib/publicApi/responseIdentity";
import { getBoundedSecurityStringContext } from "@lib/security/securityDiagnostics";
import { isRequestOriginAllowed, normalizeRequestOrigin } from '@lib/security/requestOrigin';
import { secureLog } from "@lib/security/secureLogger";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";
import type { StorePublicApiCredentialScope } from "@type/platform/store";

/** Current schema version for pull API responses */
export const PULL_API_SCHEMA_VERSION = "1.0";
export const PULL_API_RESPONSE_CACHE_CONTROL = "private, max-age=60, stale-while-revalidate=300";
export const PULL_API_ERROR_CACHE_CONTROL = "private, no-store";
export const PULL_API_RESPONSE_VARY = "X-API-Key";
export const PULL_API_CONTENT_TYPE_OPTIONS = "nosniff";
export const PULL_API_KEY_RATE_LIMIT = 60;
export const PULL_API_PREAUTH_RATE_LIMIT = PULL_API_KEY_RATE_LIMIT * 4;
export const PULL_API_RATE_LIMIT_WINDOW_SECONDS = 60;
const PUBLIC_API_KEY_PATTERN = /^(ml|cn|al)_[A-Za-z0-9_-]{20,128}$/;
const PULL_API_ERROR_RESOLUTIONS: Readonly<Record<string, string>> = Object.freeze({
    FEATURE_DISABLED: 'Keep the integration disabled and contact the MenuList account owner before retrying.',
    MISSING_API_KEY: 'Send the store\'s current API key in X-API-Key from a trusted server.',
    INVALID_API_KEY: 'Verify or rotate the key in Business Settings, then update the trusted server secret.',
    NO_MENU: 'Publish a current default menu for this store before retrying.',
    RATE_LIMIT_EXCEEDED: 'Wait for the Retry-After interval before retrying.',
    SERVICE_UNAVAILABLE: 'Wait for the Retry-After interval and retry later; MenuList fails closed while admission is unavailable.',
    INTERNAL_ERROR: 'Retry later. If the error continues, contact MenuList support with the request time and endpoint.',
});
const DEFAULT_PULL_API_ERROR_RESOLUTION = 'Review the HTTP status and request contract before retrying.';

export function normalizePublicApiDocumentId(value: unknown): string | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    return documentId === raw && isValidFirestoreDocumentId(documentId) ? documentId : null;
}

export function normalizeMenuListPublicApiNumericId(value: unknown): number | null {
    const documentId = normalizePublicApiDocumentId(value);
    if (!documentId) return null;

    const numericId = Number(documentId);
    return Number.isSafeInteger(numericId) && numericId > 0 && String(numericId) === documentId
        ? numericId
        : null;
}

export type AnswerlatticeWidgetStoreScope = {
    tenantId: number;
    storeId: number;
};

export function resolveAnswerlatticeWidgetStoreScope(
    storeData: unknown,
    storeDocumentId: unknown,
): AnswerlatticeWidgetStoreScope | null {
    if (!storeData || typeof storeData !== 'object' || Array.isArray(storeData)) return null;
    const store = storeData as Record<string, unknown>;
    const documentStoreId = normalizeMenuListPublicApiNumericId(storeDocumentId);
    const tenantId = normalizeConsistentAnswerlatticeScopeDocumentIds([
        store.tId,
        store.tenantId,
    ]);
    const storeId = normalizeConsistentAnswerlatticeScopeDocumentIds([
        store.sId,
        store.storeId,
        store.id,
        storeDocumentId,
    ]);
    if (!documentStoreId || !tenantId || !storeId || storeId !== documentStoreId) return null;

    return isAnswerlatticeActiveStoreInScope(store, { tenantId, storeId }, storeDocumentId)
        ? { tenantId, storeId }
        : null;
}

export function normalizePublicApiKey(apiKey: string | null): string | null {
    const normalizedApiKey = apiKey?.trim();
    if (!normalizedApiKey || normalizedApiKey.length < 10) return null;
    if (!PUBLIC_API_KEY_PATTERN.test(normalizedApiKey)) return null;
    return normalizedApiKey;
}

export { isRequestOriginAllowed, normalizeRequestOrigin };

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

export function generatePullApiETag(payload: Record<string, unknown>): string {
    return generateETag(buildPullApiETagPayload(payload));
}

export function buildPullApiResponseHeaders(etag: string): Record<string, string> {
    return {
        'Cache-Control': PULL_API_RESPONSE_CACHE_CONTROL,
        'ETag': etag,
        'Vary': PULL_API_RESPONSE_VARY,
        'X-Content-Type-Options': PULL_API_CONTENT_TYPE_OPTIONS,
    };
}

export async function isMenuListPublicApiTargetAllowed(
    storeData: any,
    storeDocumentId: string,
): Promise<boolean> {
    if (
        !isMenuListPublicApiEntityEligible(storeData)
        || !isMenuListPublicApiProductEntity(storeData)
        || !isMenuListPublicApiStoreIdentityConsistent(storeData, storeDocumentId)
    ) return false;

    const tenantDocumentId = resolveMenuListPublicApiTenantDocumentId(storeData);
    if (!tenantDocumentId) return false;

    const tenantSnap = await admin.firestore()
        .collection(DB_COLLECTIONS.TENANTS)
        .doc(tenantDocumentId)
        .get();

    const tenantData = tenantSnap.data();
    return tenantSnap.exists
        && isMenuListPublicApiEntityEligible(tenantData)
        && isMenuListPublicApiProductEntity(tenantData)
        && isMenuListPublicApiTenantIdentityConsistent(tenantData, tenantDocumentId);
}

/**
 * Build a structured error response following the standard format.
 */
export function apiError(
    code: string,
    message: string,
    status: number,
    headers?: HeadersInit,
): NextResponse {
    return NextResponse.json(
        { error: { code, message } },
        { status, headers },
    );
}

export function buildPullApiErrorHeaders(headers: HeadersInit = {}): Headers {
    const responseHeaders = new Headers(headers);
    responseHeaders.set('Cache-Control', PULL_API_ERROR_CACHE_CONTROL);
    responseHeaders.set('Vary', PULL_API_RESPONSE_VARY);
    responseHeaders.set('X-Content-Type-Options', PULL_API_CONTENT_TYPE_OPTIONS);
    return responseHeaders;
}

export function pullApiError(
    code: string,
    message: string,
    status: number,
    headers: HeadersInit = {},
): NextResponse {
    return NextResponse.json(
        {
            error: {
                code,
                message,
                resolution: PULL_API_ERROR_RESOLUTIONS[code] || DEFAULT_PULL_API_ERROR_RESOLUTION,
            },
        },
        { status, headers: buildPullApiErrorHeaders(headers) },
    );
}

export function pullApiRateLimitError(result: {
    reason?: 'limit_exceeded' | 'provider_unavailable';
    resetAt: number;
}): NextResponse {
    const retryAfter = String(Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1));
    if (result.reason === 'provider_unavailable') {
        return pullApiError('SERVICE_UNAVAILABLE', 'Service temporarily unavailable', 503, {
            'Retry-After': retryAfter,
        });
    }

    return pullApiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
        'Retry-After': retryAfter,
    });
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
    const userAgent = request.headers.get('user-agent') || '';

    secureLog('[Public API] Request', {
        endpoint,
        requestIpHash: hashPublicRateLimitValue(getClientIp(request)),
        ...getBoundedSecurityStringContext('storeId', storeId),
        ...getBoundedSecurityStringContext('userAgent', userAgent),
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
export type PublicApiCredentialSource = 'publicApi' | 'answerlatticeWidgetApi';
export type PublicApiCredentialScope = StorePublicApiCredentialScope;

export type PublicApiKeyValidationResult = {
    answerlatticeScope?: AnswerlatticeWidgetStoreScope;
    credential?: Record<string, any>;
    credentialSource: PublicApiCredentialSource;
    storeData: any;
    storeId: string;
};

export type PublicApiKeyValidationOptions = {
    allowLegacyRawFallback?: boolean;
    includePublicApi?: boolean;
    includeAnswerlatticeWidgetApi?: boolean;
    cacheTtlMs?: number;
    preferAnswerlatticeWidgetApi?: boolean;
};

const MAX_VALIDATION_CACHE_TTL_MS = 30_000;
const MAX_VALIDATION_CACHE_ENTRIES = 1_000;
const validationCache = new Map<string, {
    expiresAt: number;
    result: PublicApiKeyValidationResult | null;
}>();

const buildValidationCacheKey = (
    keyHash: string,
    options: {
        allowLegacyRawFallback: boolean;
        includePublicApi: boolean;
        includeAnswerlatticeWidgetApi: boolean;
        preferAnswerlatticeWidgetApi: boolean;
    },
) => [
    keyHash,
    options.allowLegacyRawFallback ? 'legacy' : 'hash-only',
    options.includePublicApi ? 'with-public' : 'without-public',
    options.includeAnswerlatticeWidgetApi ? 'with-widget' : 'without-widget',
    options.preferAnswerlatticeWidgetApi ? 'prefer-widget' : 'prefer-non-widget',
].join(':');

const getValidationCacheTtl = (ttlMs: number | undefined): number => {
    const ttl = Number(ttlMs || 0);
    if (!Number.isFinite(ttl) || ttl <= 0) return 0;
    return Math.min(ttl, MAX_VALIDATION_CACHE_TTL_MS);
};

const rememberValidationCache = (
    cacheKey: string,
    ttlMs: number,
    result: PublicApiKeyValidationResult | null,
): void => {
    if (!cacheKey || ttlMs <= 0) return;
    if (validationCache.size >= MAX_VALIDATION_CACHE_ENTRIES && !validationCache.has(cacheKey)) {
        const oldestKey = validationCache.keys().next().value;
        if (oldestKey) validationCache.delete(oldestKey);
    }
    validationCache.set(cacheKey, {
        expiresAt: Date.now() + ttlMs,
        result,
    });
};

export async function validatePublicApiKey(
    apiKey: string | null,
    options: PublicApiKeyValidationOptions = {},
): Promise<PublicApiKeyValidationResult | null> {
    const normalizedApiKey = normalizePublicApiKey(apiKey);
    if (!normalizedApiKey) return null;

    const keyHash = hashApiKey(normalizedApiKey);

    let credentialSource: PublicApiCredentialSource = 'publicApi';
    const allowLegacyRawFallback = options.allowLegacyRawFallback !== false;
    const includePublicApi = options.includePublicApi !== false;
    const includeAnswerlatticeWidgetApi = Boolean(options.includeAnswerlatticeWidgetApi);
    const shouldUseAnswerlatticeDb = !shouldUseSharedAnswerlatticeFirebase && normalizedApiKey.startsWith('al_');
    const dedicatedAnswerlatticeDb = shouldUseAnswerlatticeDb
        && answerlatticeAdminApp
        ? answerlatticeFirestoreAdmin
        : null;
    const preferAnswerlatticeWidgetApi = Boolean(options.preferAnswerlatticeWidgetApi && includeAnswerlatticeWidgetApi);
    const cacheTtl = getValidationCacheTtl(options.cacheTtlMs);
    const cacheKey = cacheTtl
        ? buildValidationCacheKey(keyHash, {
            allowLegacyRawFallback,
            includePublicApi,
            includeAnswerlatticeWidgetApi,
            preferAnswerlatticeWidgetApi,
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

    if (shouldUseAnswerlatticeDb && !dedicatedAnswerlatticeDb) {
        secureLog('[Public API] Answerlattice API key validation failed closed because Answerlattice Firestore Admin is not configured');
        rememberValidationCache(cacheKey, cacheTtl, null);
        return null;
    }

    const getCredentialDb = (): FirebaseFirestore.Firestore => shouldUseAnswerlatticeDb
        ? dedicatedAnswerlatticeDb!
        : admin.firestore();

    const queryAnswerlatticeWidgetApi = async () => {
        const multiKeySnapshot = await getCredentialDb()
            .collection(DB_COLLECTIONS.STORES)
            .where('answerlatticeWidgetApi.keyHashes', 'array-contains', keyHash)
            .limit(2)
            .get();

        if (!multiKeySnapshot.empty) return multiKeySnapshot;

        return getCredentialDb()
            .collection(DB_COLLECTIONS.STORES)
            .where('answerlatticeWidgetApi.apiKeyHash', '==', keyHash)
            .limit(2)
            .get();
    };

    if (preferAnswerlatticeWidgetApi) {
        const widgetSnapshot = await queryAnswerlatticeWidgetApi();
        if (!widgetSnapshot.empty) {
            if (widgetSnapshot.docs.length !== 1) {
                secureLog('[Public API] Ambiguous Answerlattice widget API key rejected');
                rememberValidationCache(cacheKey, cacheTtl, null);
                return null;
            }
            const doc = widgetSnapshot.docs[0];
            const storeDocumentId = normalizePublicApiDocumentId(doc.id);
            if (!storeDocumentId) {
                rememberValidationCache(cacheKey, cacheTtl, null);
                return null;
            }
            const storeData = doc.data();
            const widgetCredential = getAnswerlatticeWidgetKeyRecordByHash(storeData.answerlatticeWidgetApi, keyHash);
            const answerlatticeScope = resolveAnswerlatticeWidgetStoreScope(storeData, storeDocumentId);
            if (
                !widgetCredential
                || !answerlatticeScope
            ) {
                rememberValidationCache(cacheKey, cacheTtl, null);
                return null;
            }
            const result: PublicApiKeyValidationResult = {
                answerlatticeScope,
                credential: widgetCredential,
                credentialSource: 'answerlatticeWidgetApi',
                storeData,
                storeId: storeDocumentId,
            };
            rememberValidationCache(cacheKey, cacheTtl, result);
            return result;
        }
    }

    let snapshot: FirebaseFirestore.QuerySnapshot | null = null;

    if (includePublicApi) {
        // Read both current and legacy representations while compatibility is
        // enabled. A credential duplicated across representations on different
        // stores must fail closed instead of letting lookup order select a tenant.
        const [hashedSnapshot, legacyRawSnapshot] = await Promise.all([
            getCredentialDb()
                .collection(DB_COLLECTIONS.STORES)
                .where('publicApi.apiKeyHash', '==', keyHash)
                .limit(2)
                .get(),
            allowLegacyRawFallback
                ? getCredentialDb()
                    .collection(DB_COLLECTIONS.STORES)
                    .where('publicApi.apiKey', '==', normalizedApiKey)
                    .limit(2)
                    .get()
                : Promise.resolve(null),
        ]);
        const publicCredentialDocumentPaths = new Set([
            ...hashedSnapshot.docs.map((doc) => doc.ref.path),
            ...(legacyRawSnapshot?.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.ref.path) || []),
        ]);
        if (publicCredentialDocumentPaths.size > 1) {
            secureLog('[Public API] Ambiguous cross-representation API key rejected');
            rememberValidationCache(cacheKey, cacheTtl, null);
            return null;
        }
        snapshot = !hashedSnapshot.empty ? hashedSnapshot : legacyRawSnapshot;
    }

    if (
        (!snapshot || snapshot.empty)
        && includeAnswerlatticeWidgetApi
        && normalizedApiKey.startsWith('al_')
        && !preferAnswerlatticeWidgetApi
    ) {
        snapshot = await queryAnswerlatticeWidgetApi();
        credentialSource = 'answerlatticeWidgetApi';
    }

    if (!snapshot || snapshot.empty) {
        secureLog('[Public API] Invalid API key attempt');
        rememberValidationCache(cacheKey, cacheTtl, null);
        return null;
    }
    if (snapshot.docs.length !== 1) {
        secureLog('[Public API] Ambiguous API key rejected');
        rememberValidationCache(cacheKey, cacheTtl, null);
        return null;
    }

    const doc = snapshot.docs[0];
    const storeDocumentId = normalizePublicApiDocumentId(doc.id);
    if (!storeDocumentId) {
        rememberValidationCache(cacheKey, cacheTtl, null);
        return null;
    }
    const storeData = doc.data();
    const widgetCredential = credentialSource === 'answerlatticeWidgetApi'
        ? getAnswerlatticeWidgetKeyRecordByHash(storeData.answerlatticeWidgetApi, keyHash)
        : undefined;
    const answerlatticeScope = credentialSource === 'answerlatticeWidgetApi'
        ? resolveAnswerlatticeWidgetStoreScope(storeData, storeDocumentId)
        : undefined;
    if (
        credentialSource === 'answerlatticeWidgetApi'
        && (
            !widgetCredential
            || !answerlatticeScope
        )
    ) {
        rememberValidationCache(cacheKey, cacheTtl, null);
        return null;
    }
    const result: PublicApiKeyValidationResult = {
        ...(answerlatticeScope ? { answerlatticeScope } : {}),
        credential: credentialSource === 'publicApi'
            ? storeData.publicApi
            : widgetCredential,
        credentialSource,
        storeData,
        storeId: storeDocumentId,
    };

    rememberValidationCache(cacheKey, cacheTtl, result);

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
        return purpose === 'answerlattice_widget';
    }

    if (requiredScope === 'public:read') {
        return purpose !== 'answerlattice_widget';
    }

    if (requiredScope === 'signals:write') {
        return false;
    }

    return false;
}

export function buildPublicApiCorsHeaders(request: NextRequest): Record<string, string> {
    const origin = normalizeRequestOrigin(request.headers.get('origin'));
    if (!origin) return {};

    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Answerlattice-Widget-Runtime, Idempotency-Key',
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
