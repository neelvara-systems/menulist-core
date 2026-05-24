export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { getCanonicaContextBundleManifestServer } from '@lib/canonica/contextBundleBuilderServer';
import {
    canIssueCanonicaMcpSession,
    createCanonicaMcpSessionToken,
} from '@lib/canonica/mcpSession';
import {
    apiError,
    hashApiKey,
    hasPublicApiCredentialScope,
    validatePublicApiKey,
} from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';

const MCP_SESSION_TTL_SECONDS = 15 * 60;

export async function POST(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_MCP || !FEATURE_FLAGS.ENABLE_CANONICA_CONTEXT_BUNDLES) {
        return apiError('MCP_DISABLED', 'Canonica MCP is not enabled', 404);
    }
    if (!canIssueCanonicaMcpSession()) {
        return apiError('MCP_NOT_CONFIGURED', 'Canonica MCP session signing is not configured', 503);
    }

    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
    if (!apiKey || !apiKey.startsWith('cn_')) {
        return apiError('INVALID_API_KEY', 'Invalid API key', 401);
    }

    const rateLimit = await checkRateLimit({
        key: `canonica-mcp-session:${hashApiKey(apiKey).slice(0, 16)}`,
        limit: 20,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return apiError('RATE_LIMITED', 'Rate limit exceeded', 429);
    }

    try {
        const auth = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            includeCanonicaWidgetApi: false,
            includePublicApi: true,
            cacheTtlMs: 30_000,
        });
        if (!auth || !hasPublicApiCredentialScope(auth.credential, 'public:read')) {
            return apiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const tId = Number(auth.storeData.tenantId || auth.storeData.tId);
        const sId = Number(auth.storeData.id || auth.storeData.storeId || auth.storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            return apiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const manifest = await getCanonicaContextBundleManifestServer(tId, sId).catch(() => null);
        const bundleVersion = Number(manifest?.activeVersion || manifest?.bundleVersion || 0);
        const token = createCanonicaMcpSessionToken({
            tId,
            sId,
            scope: ['context:read', 'signals:write'],
            bundleVersion,
            revocationVersion: Number(auth.credential?.revocationVersion || 0),
            ttlSeconds: MCP_SESSION_TTL_SECONDS,
        });

        return NextResponse.json({
            token,
            tokenType: 'Bearer',
            expiresIn: MCP_SESSION_TTL_SECONDS,
            bundleVersion,
            bundleStatus: manifest?.status || 'missing',
        }, {
            headers: {
                'Cache-Control': 'private, no-store',
            },
        });
    } catch (error) {
        secureError('[Canonica MCP] Session creation failed', error as Error);
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
