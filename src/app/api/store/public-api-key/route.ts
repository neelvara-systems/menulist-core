export const dynamic = 'force-dynamic';
/**
 * POST /api/store/public-api-key — Generate or regenerate public API key
 *
 * Allows store owner to create a read-only API key for external systems
 * to pull business and menu data from MenuList.
 *
 * Actions:
 * - generate: Create new API key (or regenerate, invalidating old one)
 * - revoke: Remove API key entirely
 *
 * @see __docs__/platform-pull-api/platform-pull-api_impl.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { DB_COLLECTIONS } from "@constant/database";
import { PERMISSIONS } from "@constant/permissions";
import { resolveCurrentSessionUserDocumentId } from "@lib/auth/currentPlatformUser";
import { isValidFirestoreDocumentId } from "@lib/firebase/firestoreDocumentId";
import { admin } from "@lib/firebase/firebaseAdmin";
import {
    requireAnyStorePermissionForStoreData,
    resolveStorePermissionSessionScope,
} from "@lib/permissions/server";
import { hashApiKey } from "@lib/publicApi/auth";
import {
    isMenuListPublicApiProductEntity,
    isMenuListPublicApiStoreIdentityConsistent,
    isMenuListPublicApiTenantIdentityConsistent,
    resolveMenuListPublicApiTenantDocumentId,
} from '@lib/publicApi/menuListScope';
import { isMenuListPublicApiEntityEligible } from "@lib/publicApi/targetEligibility";
import { checkRateLimit } from "@lib/rateLimit";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityStringContext, logSecurityDiagnostic, logSecurityFailure } from "@lib/security/securityDiagnostics";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { z } from "zod";
import { withAuth } from "../../../../middleware/auth";

const PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES = 1024;
const PUBLIC_API_KEY_SESSION_DOCUMENT_ID_MAX_LENGTH = 160;
const PUBLIC_API_KEY_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
};
const RequestSchema = z.object({
    action: z.enum(['generate', 'revoke']),
    storeId: z.string().min(1).max(PUBLIC_API_KEY_SESSION_DOCUMENT_ID_MAX_LENGTH),
    tenantId: z.string().min(1).max(PUBLIC_API_KEY_SESSION_DOCUMENT_ID_MAX_LENGTH),
}).strict();

function getPublicApiKeyRateLimitResponse(result: {
    reason?: 'limit_exceeded' | 'provider_unavailable';
    resetAt: number;
}): NextResponse {
    const providerUnavailable = result.reason === 'provider_unavailable';
    return NextResponse.json(
        { error: providerUnavailable ? "Service temporarily unavailable" : "Too many requests" },
        {
            status: providerUnavailable ? 503 : 429,
            headers: {
                ...PUBLIC_API_KEY_RESPONSE_HEADERS,
                'Retry-After': String(Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1)),
            },
        },
    );
}

function withPublicApiKeyResponseHeaders(response: NextResponse): NextResponse {
    for (const [name, value] of Object.entries(PUBLIC_API_KEY_RESPONSE_HEADERS)) {
        response.headers.set(name, value);
    }
    return response;
}

function publicApiKeyJson(
    body: unknown,
    init: ResponseInit = {},
): NextResponse {
    const headers = new Headers(init.headers);
    for (const [name, value] of Object.entries(PUBLIC_API_KEY_RESPONSE_HEADERS)) {
        headers.set(name, value);
    }
    return NextResponse.json(body, { ...init, headers });
}

function normalizeSessionDocumentId(value: unknown): string | null {
    const raw = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const documentId = raw.trim();
    return documentId === raw
        && documentId.length > 0
        && documentId.length <= PUBLIC_API_KEY_SESSION_DOCUMENT_ID_MAX_LENGTH
        && isValidFirestoreDocumentId(documentId)
        ? documentId
        : null;
}

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_API) {
        return publicApiKeyJson({ error: "Feature disabled" }, { status: 403 });
    }

    const sessionScope = resolveStorePermissionSessionScope(session);
    const actorId = normalizeSessionDocumentId(resolveCurrentSessionUserDocumentId(session));
    if (!sessionScope || !actorId) {
        return publicApiKeyJson({ error: "Not onboarded" }, { status: 400 });
    }
    const tenantId = sessionScope.tenantScope.documentId;
    const storeId = sessionScope.storeScope.documentId;

    const actorRateLimitHash = hashPublicRateLimitValue(actorId);
    const storeRateLimitHash = hashPublicRateLimitValue(storeId);
    const rlResult = await checkRateLimit({
        key: `api-key-mgmt:${actorRateLimitHash}:${storeRateLimitHash}`,
        limit: 5,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rlResult.allowed) {
        return getPublicApiKeyRateLimitResponse(rlResult);
    }

    const bodyResult = await readBoundedJsonBody(request, PUBLIC_API_KEY_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: "Invalid input",
    });
    if (bodyResult.ok === false) return withPublicApiKeyResponseHeaders(bodyResult.response);
    const body = bodyResult.data;
    const validation = RequestSchema.safeParse(body);
    if (!validation.success) {
        return publicApiKeyJson({ error: "Invalid input" }, { status: 400 });
    }
    const requestedTenantId = normalizeSessionDocumentId(validation.data.tenantId);
    const requestedStoreId = normalizeSessionDocumentId(validation.data.storeId);
    if (requestedTenantId !== tenantId || requestedStoreId !== storeId) {
        return publicApiKeyJson(
            { error: "Store context changed" },
            { status: 409 },
        );
    }

    const db = admin.firestore();
    const storeRef = db.collection(DB_COLLECTIONS.STORES).doc(storeId);
    const tenantRef = db.collection(DB_COLLECTIONS.TENANTS).doc(tenantId);
    const action = validation.data.action;
    const diagnosticContext = {
        action,
        ...getBoundedSecurityStringContext('tenantId', tenantId),
        ...getBoundedSecurityStringContext('storeId', storeId),
        ...getBoundedSecurityStringContext('userId', actorId),
    };

    try {
        const apiKey = action === 'generate'
            ? `ml_${randomUUID().replace(/-/g, '')}`
            : null;
        const apiKeyHash = apiKey ? hashApiKey(apiKey) : null;
        const transactionResult = await db.runTransaction(async (transaction) => {
            const [tenantSnapshot, storeSnapshot] = await Promise.all([
                transaction.get(tenantRef),
                transaction.get(storeRef),
            ]);
            const tenantData = tenantSnapshot.data();
            const storeData = storeSnapshot.data();
            if (
                !tenantSnapshot.exists
                || !isMenuListPublicApiEntityEligible(tenantData)
                || !isMenuListPublicApiProductEntity(tenantData)
                || !isMenuListPublicApiTenantIdentityConsistent(tenantData, tenantId)
                || !storeSnapshot.exists
                || !isMenuListPublicApiEntityEligible(storeData)
                || !isMenuListPublicApiProductEntity(storeData)
                || !isMenuListPublicApiStoreIdentityConsistent(storeData, storeId)
                || resolveMenuListPublicApiTenantDocumentId(storeData) !== tenantId
            ) {
                return {
                    permissionError: publicApiKeyJson({ error: "Forbidden" }, { status: 403 }),
                };
            }

            const permissionError = await requireAnyStorePermissionForStoreData(
                request,
                session,
                storeData,
                [PERMISSIONS.MANAGE_INTEGRATIONS],
                "Public API key",
                storeId,
                tenantId,
            );
            if (permissionError) {
                return { permissionError: withPublicApiKeyResponseHeaders(permissionError) };
            }

            if (apiKey && apiKeyHash) {
                transaction.update(storeRef, {
                    publicApi: {
                        apiKeyHash,
                        keyPrefix: apiKey.slice(0, 7),
                        createdAt: new Date().toISOString(),
                        productId: 'ML',
                        purpose: 'menulist_public_api',
                        scopes: ['public:read'],
                    },
                });
            } else {
                transaction.update(storeRef, {
                    publicApi: admin.firestore.FieldValue.delete(),
                });
            }
            return { permissionError: null };
        });
        if (transactionResult.permissionError) return transactionResult.permissionError;

        if (apiKey) {
            logSecurityDiagnostic('public_api_key_generated', diagnosticContext);
            return publicApiKeyJson(
                { apiKey, storeId, tenantId },
            );
        }

        logSecurityDiagnostic('public_api_key_revoked', diagnosticContext);
        return publicApiKeyJson(
            { success: true, storeId, tenantId },
        );
    } catch (error) {
        logSecurityFailure('public_api_key_management_failed', error, diagnosticContext);
        return publicApiKeyJson({ error: "Failed to manage API key" }, { status: 500 });
    }
});
