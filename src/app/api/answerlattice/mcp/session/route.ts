export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { isAnswerlatticePublicApiCredentialInScope } from '@lib/answerlattice/publicApiContracts';
import { isAnswerlatticeActiveStoreInScope, normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { getAnswerlatticeContextBundleManifestServer } from '@lib/answerlattice/contextBundleBuilderServer';
import {
    AnswerlatticeMcpSessionScope,
    canIssueAnswerlatticeMcpSession,
    createAnswerlatticeMcpSessionToken,
} from '@lib/answerlattice/mcpSession';
import {
    apiError,
    hashApiKey,
    validatePublicApiKey,
} from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

const MCP_SESSION_TTL_SECONDS = 5 * 60;
const MCP_SESSION_RESPONSE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'Vary': 'X-API-Key, Authorization, Origin',
    'X-Content-Type-Options': 'nosniff',
} as const;

const mcpSessionError = (
    code: string,
    message: string,
    status: number,
    headers: Record<string, string> = {},
) => apiError(code, message, status, {
    ...MCP_SESSION_RESPONSE_HEADERS,
    ...headers,
});

const getRateLimitResponse = (rateLimit: {
    reason?: 'limit_exceeded' | 'provider_unavailable';
    resetAt: number;
}) => mcpSessionError(
    rateLimit.reason === 'provider_unavailable' ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMITED',
    rateLimit.reason === 'provider_unavailable' ? 'MCP temporarily unavailable' : 'Rate limit exceeded',
    rateLimit.reason === 'provider_unavailable' ? 503 : 429,
    {
        'Retry-After': String(Math.max(Math.ceil((rateLimit.resetAt - Date.now()) / 1000), 1)),
    },
);

const getMcpSessionLogContext = (tId: number, sId: number) => ({
    ...getBoundedRuntimeStringContext('tenantId', tId),
    ...getBoundedRuntimeStringContext('storeId', sId),
});

const getMcpSessionBundleManifest = async (tId: number, sId: number) => {
    try {
        return await getAnswerlatticeContextBundleManifestServer(tId, sId);
    } catch (error) {
        logRuntimeFailure('answerlattice_mcp_session_bundle_manifest_load_failed', error, getMcpSessionLogContext(tId, sId));
        return null;
    }
};

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_MCP || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_CONTEXT_BUNDLES) {
        return mcpSessionError('MCP_DISABLED', 'Answerlattice MCP is not enabled', 404);
    }
    if (!canIssueAnswerlatticeMcpSession()) {
        return mcpSessionError('MCP_NOT_CONFIGURED', 'Answerlattice MCP session signing is not configured', 503);
    }
    if (request.headers.get('origin')) {
        return mcpSessionError(
            'BROWSER_ACCESS_NOT_SUPPORTED',
            'Create MCP sessions from a trusted server or desktop client',
            403,
        );
    }

    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
    if (!apiKey || !apiKey.startsWith('al_')) {
        return mcpSessionError('INVALID_API_KEY', 'Invalid API key', 401);
    }

    const preAuthRateLimit = await checkRateLimit({
        key: `answerlattice-mcp-session-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
        limit: 80,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!preAuthRateLimit.allowed) {
        return getRateLimitResponse(preAuthRateLimit);
    }

    const rateLimit = await checkRateLimit({
        key: `answerlattice-mcp-session:${hashApiKey(apiKey).slice(0, 16)}`,
        limit: 20,
        window: 60,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        return getRateLimitResponse(rateLimit);
    }

    try {
        const auth = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            includeAnswerlatticeWidgetApi: false,
            includePublicApi: true,
            cacheTtlMs: 0,
        });
        if (
            !auth
            || auth.credentialSource !== 'publicApi'
            || !isAnswerlatticePublicApiCredentialInScope(auth.credential, 'mcp:read')
        ) {
            return mcpSessionError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const tId = normalizeAnswerlatticeScopeDocumentId(auth.storeData.tenantId ?? auth.storeData.tId);
        const sId = normalizeAnswerlatticeScopeDocumentId(
            auth.storeData.id ?? auth.storeData.sId ?? auth.storeData.storeId ?? auth.storeId,
        );
        if (!tId || !sId || !isAnswerlatticeActiveStoreInScope(auth.storeData, { tenantId: tId, storeId: sId }, auth.storeId)) {
            return mcpSessionError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const manifest = await getMcpSessionBundleManifest(tId, sId);
        const bundleVersion = Number(manifest?.activeVersion || manifest?.bundleVersion || 0);
        if (
            manifest?.status !== 'ready'
            || !Number.isSafeInteger(bundleVersion)
            || bundleVersion <= 0
        ) {
            return mcpSessionError(
                'MCP_CONTEXT_NOT_READY',
                'Compiled approved context is not ready',
                503,
            );
        }
        const scope: AnswerlatticeMcpSessionScope[] = ['context:read'];
        if (isAnswerlatticePublicApiCredentialInScope(auth.credential, 'signals:write')) {
            scope.push('signals:write');
        }
        const token = createAnswerlatticeMcpSessionToken({
            tId,
            sId,
            scope,
            bundleVersion,
            ttlSeconds: MCP_SESSION_TTL_SECONDS,
        });

        return NextResponse.json({
            token,
            tokenType: 'Bearer',
            expiresIn: MCP_SESSION_TTL_SECONDS,
            bundleVersion,
            bundleStatus: manifest?.status || 'missing',
        }, {
            headers: MCP_SESSION_RESPONSE_HEADERS,
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_mcp_session_creation_failed', error);
        return mcpSessionError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
