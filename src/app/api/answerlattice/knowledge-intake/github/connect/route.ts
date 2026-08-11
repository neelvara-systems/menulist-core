export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import {
    createAnswerlatticeGitHubSetupState,
} from '@lib/answerlattice/githubChangeIntakeContracts';
import {
    buildAnswerlatticeGitHubInstallUrl,
    getAnswerlatticeGitHubStateSecret,
} from '@lib/answerlattice/githubChangeIntakeServer';
import { hasActiveAnswerlatticeKnowledgeIntakeLicense } from '@lib/answerlattice/knowledgeIntakeApi';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const privateJson = (body: unknown, status: number) => NextResponse.json(body, {
    status,
    headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
});

export const GET = withAuth(async (request: NextRequest, session) => {
    if (
        !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS
    ) return privateJson({ error: 'GitHub change intake is not enabled.' }, 404);

    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS,
    );
    if (permission.response) return permission.response;
    if (!permission.access) return privateJson({ error: 'Forbidden' }, 403);

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-github-connect',
                permission.access.user.id,
                permission.access.scope.tenantId,
                permission.access.scope.storeId,
            ),
            limit: 6,
            window: 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            return privateJson(
                { error: rateLimit.reason === 'provider_unavailable' ? 'GitHub setup is temporarily unavailable.' : 'Too many setup attempts.' },
                rateLimit.reason === 'provider_unavailable' ? 503 : 429,
            );
        }

        const license = await hasActiveAnswerlatticeKnowledgeIntakeLicense(
            permission.access.scope.tenantId,
            permission.access.scope.storeId,
        );
        if (!license.allowed) return privateJson({ error: license.message }, license.status);

        const state = createAnswerlatticeGitHubSetupState({
            actorId: permission.access.user.id,
            purpose: 'install',
            scope: {
                tId: permission.access.scope.tenantId,
                sId: permission.access.scope.storeId,
            },
            secret: getAnswerlatticeGitHubStateSecret(),
        });
        const response = NextResponse.redirect(buildAnswerlatticeGitHubInstallUrl(state), 303);
        Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => response.headers.set(name, value));
        return response;
    } catch (error) {
        logRuntimeFailure('answerlattice_github_connect_failed', error, {
            endpoint: '/api/answerlattice/knowledge-intake/github/connect',
        });
        return privateJson({ error: 'GitHub setup is temporarily unavailable.' }, 503);
    }
});
