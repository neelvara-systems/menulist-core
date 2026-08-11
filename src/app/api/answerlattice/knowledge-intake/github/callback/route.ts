export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/routes';
import { getProductDeploymentTarget } from '@constant/deploymentTargets';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { verifyAnswerlatticeGitHubSetupState } from '@lib/answerlattice/githubChangeIntakeContracts';
import {
    exchangeAnswerlatticeGitHubUserCode,
    getAnswerlatticeGitHubStateSecret,
    listAnswerlatticeGitHubInstallationRepositories,
    saveAnswerlatticeGitHubPendingConnection,
    verifyAnswerlatticeGitHubUserInstallation,
} from '@lib/answerlattice/githubChangeIntakeServer';
import { hasActiveAnswerlatticeKnowledgeIntakeLicense } from '@lib/answerlattice/knowledgeIntakeApi';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { checkRateLimit } from '@lib/rateLimit';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const CALLBACK_PATH = '/api/answerlattice/knowledge-intake/github/callback';
const ANSWERLATTICE_APP_ORIGIN = new URL(getProductDeploymentTarget('answerlattice').url).origin;
const ANSWERLATTICE_APP_HOSTNAME = new URL(ANSWERLATTICE_APP_ORIGIN).hostname;

const returnToKnowledgeIntake = (result: 'ready' | 'error') => {
    const route = toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.KNOWLEDGE_INTAKE, ANSWERLATTICE_APP_HOSTNAME);
    const url = new URL(route, ANSWERLATTICE_APP_ORIGIN);
    url.searchParams.set('github', result);
    const response = NextResponse.redirect(url, 303);
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => response.headers.set(name, value));
    return response;
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (
        !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_INTAKE
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_NATIVE_CONNECTORS
    ) return returnToKnowledgeIntake('error');

    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS,
    );
    if (permission.response || !permission.access) return returnToKnowledgeIntake('error');

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-github-callback',
                permission.access.user.id,
                permission.access.scope.tenantId,
                permission.access.scope.storeId,
            ),
            limit: 6,
            window: 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) return returnToKnowledgeIntake('error');

        const state = verifyAnswerlatticeGitHubSetupState({
            expectedPurpose: 'verify_installation',
            secret: getAnswerlatticeGitHubStateSecret(),
            token: request.nextUrl.searchParams.get('state'),
        });
        const code = request.nextUrl.searchParams.get('code') || '';
        if (
            !state
            || state.actorId !== permission.access.user.id
            || state.tId !== permission.access.scope.tenantId
            || state.sId !== permission.access.scope.storeId
            || !state.installationId
            || !/^[A-Za-z0-9_-]{8,500}$/.test(code)
        ) return returnToKnowledgeIntake('error');

        const license = await hasActiveAnswerlatticeKnowledgeIntakeLicense(state.tId, state.sId);
        if (!license.allowed) return returnToKnowledgeIntake('error');

        const callbackUrl = new URL(CALLBACK_PATH, ANSWERLATTICE_APP_ORIGIN).toString();
        const userAccessToken = await exchangeAnswerlatticeGitHubUserCode({ code, redirectUri: callbackUrl });
        const installation = await verifyAnswerlatticeGitHubUserInstallation({
            installationId: state.installationId,
            userAccessToken,
        });
        const repositories = await listAnswerlatticeGitHubInstallationRepositories(state.installationId);
        await saveAnswerlatticeGitHubPendingConnection({
            accountLogin: installation.account.login,
            accountType: installation.account.type,
            actorId: permission.access.user.id,
            installationId: state.installationId,
            repositories,
            scope: { tId: state.tId, sId: state.sId },
        });
        return returnToKnowledgeIntake('ready');
    } catch (error) {
        logRuntimeFailure('answerlattice_github_callback_failed', error, {
            endpoint: CALLBACK_PATH,
        });
        return returnToKnowledgeIntake('error');
    }
});
