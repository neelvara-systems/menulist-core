export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { AnswerlatticeGitHubConnectionUpdateSchema } from '@lib/answerlattice/githubChangeIntakeContracts';
import {
    disconnectAnswerlatticeGitHubConnection,
    getAnswerlatticeGitHubConnection,
    saveAnswerlatticeGitHubConnection,
} from '@lib/answerlattice/githubChangeIntakeServer';
import { hasActiveAnswerlatticeKnowledgeIntakeLicense } from '@lib/answerlattice/knowledgeIntakeApi';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../../../readRateLimit';

const CONNECTION_BODY_MAX_BYTES = 16 * 1024;

const privateJson = (body: unknown, status = 200) => NextResponse.json(body, {
    status,
    headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
});

const isEnabled = () => FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE
    && FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS;

const requireAccess = async (request: NextRequest, session: unknown) => {
    if (!isEnabled()) return { response: privateJson({ error: 'GitHub change intake is not enabled.' }, 404) };
    return requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS,
    );
};

const applyMutationRateLimit = async (params: {
    action: string;
    access: NonNullable<Awaited<ReturnType<typeof requireAnswerlatticePermission>>['access']>;
}) => checkRateLimit({
    key: buildAnswerlatticeRateLimitKey(
        `answerlattice-github-${params.action}`,
        params.access.user.id,
        params.access.scope.tenantId,
        params.access.scope.storeId,
    ),
    limit: 10,
    window: 60,
    failClosedOnProviderError: true,
});

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!isEnabled()) return privateJson({ error: 'GitHub change intake is not enabled.' }, 404);
    const readLimit = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'github-change-intake');
    if (readLimit) return readLimit;
    const permission = await requireAccess(request, session);
    if (permission.response) return permission.response;
    if (!permission.access) return privateJson({ error: 'Forbidden' }, 403);

    try {
        const connection = await getAnswerlatticeGitHubConnection({
            tId: permission.access.scope.tenantId,
            sId: permission.access.scope.storeId,
        });
        return privateJson({ connection });
    } catch (error) {
        logRuntimeFailure('answerlattice_github_connection_load_failed', error, {
            endpoint: '/api/answerlattice/knowledge-intake/github/connection',
        });
        return privateJson({ error: 'GitHub connection could not be loaded.' }, 500);
    }
});

export const PUT = withAuth(async (request: NextRequest, session) => {
    const permission = await requireAccess(request, session);
    if (permission.response) return permission.response;
    if (!permission.access) return privateJson({ error: 'Forbidden' }, 403);

    try {
        const rateLimit = await applyMutationRateLimit({ action: 'connection-save', access: permission.access });
        if (!rateLimit.allowed) {
            return privateJson(
                { error: rateLimit.reason === 'provider_unavailable' ? 'GitHub settings are temporarily unavailable.' : 'Too many GitHub settings changes.' },
                rateLimit.reason === 'provider_unavailable' ? 503 : 429,
            );
        }
        const license = await hasActiveAnswerlatticeKnowledgeIntakeLicense(
            permission.access.scope.tenantId,
            permission.access.scope.storeId,
        );
        if (!license.allowed) return privateJson({ error: license.message }, license.status);
        const body = await readBoundedJsonBody(request, CONNECTION_BODY_MAX_BYTES);
        if (body.ok === false) return privateJson({ error: 'Invalid GitHub settings.' }, body.response.status);
        const input = AnswerlatticeGitHubConnectionUpdateSchema.parse(body.data);
        const connection = await saveAnswerlatticeGitHubConnection({
            actorId: permission.access.user.id,
            input,
            scope: {
                tId: permission.access.scope.tenantId,
                sId: permission.access.scope.storeId,
            },
        });
        return privateJson({ connection });
    } catch (error) {
        if (error instanceof z.ZodError) return privateJson({ error: 'Invalid GitHub settings.' }, 400);
        logRuntimeFailure('answerlattice_github_connection_save_failed', error, {
            endpoint: '/api/answerlattice/knowledge-intake/github/connection',
        });
        return privateJson({ error: 'GitHub settings could not be saved.' }, 500);
    }
});

export const DELETE = withAuth(async (request: NextRequest, session) => {
    const permission = await requireAccess(request, session);
    if (permission.response) return permission.response;
    if (!permission.access) return privateJson({ error: 'Forbidden' }, 403);

    try {
        const rateLimit = await applyMutationRateLimit({ action: 'connection-delete', access: permission.access });
        if (!rateLimit.allowed) {
            return privateJson(
                { error: rateLimit.reason === 'provider_unavailable' ? 'GitHub settings are temporarily unavailable.' : 'Too many GitHub settings changes.' },
                rateLimit.reason === 'provider_unavailable' ? 503 : 429,
            );
        }
        const connection = await disconnectAnswerlatticeGitHubConnection({
            actorId: permission.access.user.id,
            scope: {
                tId: permission.access.scope.tenantId,
                sId: permission.access.scope.storeId,
            },
        });
        return privateJson({ connection });
    } catch (error) {
        logRuntimeFailure('answerlattice_github_connection_disconnect_failed', error, {
            endpoint: '/api/answerlattice/knowledge-intake/github/connection',
        });
        return privateJson({ error: 'GitHub could not be disconnected.' }, 500);
    }
});
