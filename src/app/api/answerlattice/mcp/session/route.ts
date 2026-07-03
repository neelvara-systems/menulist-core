export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PRODUCT_IDS } from '@constant/product';
import { getAnswerlatticeContextBundleManifestServer } from '@lib/answerlattice/contextBundleBuilderServer';
import {
    canIssueAnswerlatticeMcpSession,
    createAnswerlatticeMcpSessionToken,
} from '@lib/answerlattice/mcpSession';
import {
    apiError,
    hashApiKey,
    hasPublicApiCredentialScope,
    validatePublicApiKey,
} from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';

const MCP_SESSION_TTL_SECONDS = 15 * 60;

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
        return apiError('MCP_DISABLED', 'Answerlattice MCP is not enabled', 404);
    }
    if (!canIssueAnswerlatticeMcpSession()) {
        return apiError('MCP_NOT_CONFIGURED', 'Answerlattice MCP session signing is not configured', 503);
    }

    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || null;
    if (!apiKey || !apiKey.startsWith('al_')) {
        return apiError('INVALID_API_KEY', 'Invalid API key', 401);
    }

    const rateLimit = await checkRateLimit({
        key: `answerlattice-mcp-session:${hashApiKey(apiKey).slice(0, 16)}`,
        limit: 20,
        window: 60,
    });
    if (!rateLimit.allowed) {
        return apiError('RATE_LIMITED', 'Rate limit exceeded', 429);
    }

    try {
        const auth = await validatePublicApiKey(apiKey, {
            allowLegacyRawFallback: false,
            includeAnswerlatticeWidgetApi: false,
            includePublicApi: true,
            cacheTtlMs: 30_000,
        });
        if (
            !auth
            || (auth.credential?.productId && auth.credential.productId !== PRODUCT_IDS.ANSWERLATTICE)
            || (auth.credential?.purpose && auth.credential.purpose !== 'answerlattice_public_api')
            || !hasPublicApiCredentialScope(auth.credential, 'public:read')
            || !hasPublicApiCredentialScope(auth.credential, 'signals:write')
        ) {
            return apiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const tId = Number(auth.storeData.tenantId || auth.storeData.tId);
        const sId = Number(auth.storeData.id || auth.storeData.storeId || auth.storeId);
        if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
            return apiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const manifest = await getMcpSessionBundleManifest(tId, sId);
        const bundleVersion = Number(manifest?.activeVersion || manifest?.bundleVersion || 0);
        const token = createAnswerlatticeMcpSessionToken({
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
        logRuntimeFailure('answerlattice_mcp_session_creation_failed', error);
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
