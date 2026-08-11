export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { getProductDeploymentTarget } from '@constant/deploymentTargets';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import {
    createAnswerlatticeGitHubSetupState,
    verifyAnswerlatticeGitHubSetupState,
} from '@lib/answerlattice/githubChangeIntakeContracts';
import {
    buildAnswerlatticeGitHubAuthorizationUrl,
    getAnswerlatticeGitHubStateSecret,
} from '@lib/answerlattice/githubChangeIntakeServer';
import { hasActiveAnswerlatticeKnowledgeIntakeLicense } from '@lib/answerlattice/knowledgeIntakeApi';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const CALLBACK_PATH = '/api/answerlattice/knowledge-intake/github/callback';
const ANSWERLATTICE_APP_ORIGIN = new URL(getProductDeploymentTarget('answerlattice').url).origin;

const privateJson = (body: unknown, status: number) => NextResponse.json(body, {
    status,
    headers: ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
});

const parseInstallationId = (value: string | null): number | null => {
    if (!value || !/^\d{1,16}$/.test(value)) return null;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

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
        const secret = getAnswerlatticeGitHubStateSecret();
        const installationId = parseInstallationId(request.nextUrl.searchParams.get('installation_id'));
        const installState = verifyAnswerlatticeGitHubSetupState({
            expectedPurpose: 'install',
            secret,
            token: request.nextUrl.searchParams.get('state'),
        });
        if (
            !installationId
            || !installState
            || installState.actorId !== permission.access.user.id
            || installState.tId !== permission.access.scope.tenantId
            || installState.sId !== permission.access.scope.storeId
        ) return privateJson({ error: 'GitHub setup could not be verified.' }, 400);

        const license = await hasActiveAnswerlatticeKnowledgeIntakeLicense(
            installState.tId,
            installState.sId,
        );
        if (!license.allowed) return privateJson({ error: license.message }, license.status);

        const callbackUrl = new URL(CALLBACK_PATH, ANSWERLATTICE_APP_ORIGIN).toString();
        const verifyState = createAnswerlatticeGitHubSetupState({
            actorId: permission.access.user.id,
            purpose: 'verify_installation',
            scope: { tId: installState.tId, sId: installState.sId },
            installationId,
            secret,
        });
        const response = NextResponse.redirect(buildAnswerlatticeGitHubAuthorizationUrl({
            redirectUri: callbackUrl,
            state: verifyState,
        }), 303);
        Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => response.headers.set(name, value));
        return response;
    } catch (error) {
        logRuntimeFailure('answerlattice_github_setup_handoff_failed', error, {
            endpoint: '/api/answerlattice/knowledge-intake/github/setup',
        });
        return privateJson({ error: 'GitHub setup is temporarily unavailable.' }, 503);
    }
});
