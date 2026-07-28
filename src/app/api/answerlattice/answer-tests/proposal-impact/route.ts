export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { getAnswerTestProofSummary } from '@lib/answerlattice/answerTestEvaluation';
import {
    loadAnswerlatticeAnswerTestSummary,
    runAnswerlatticeProposalImpactTests,
} from '@lib/answerlattice/answerTestServer';
import {
    AnswerlatticeGovernanceError,
    prepareAnswerlatticeProposalImpact,
} from '@lib/answerlattice/governanceServer';
import {
    AnswerlatticeProposalImpactRequestSchema,
    AnswerlatticeProposalImpactResponseSchema,
    selectAnswerlatticeProposalImpactCases,
    summarizeAnswerlatticeProposalImpact,
    type AnswerlatticeProposalImpactComparison,
} from '@lib/answerlattice/proposalImpactContracts';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../../middleware/auth';

const PROPOSAL_IMPACT_MAX_BODY_BYTES = 40 * 1024;
const PRIVATE_NO_STORE_HEADERS = ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS;

const withPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(PRIVATE_NO_STORE_HEADERS).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

export const POST = withAuth(async (request: NextRequest, session) => {
    if (
        !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TESTS
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION
    ) {
        return NextResponse.json(
            { error: 'Answer tests are not enabled.' },
            { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json(
            { error: 'Not onboarded' },
            { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }

    try {
        const rateLimit = await checkRateLimit({
            key: buildAnswerlatticeRateLimitKey(
                'answerlattice-proposal-impact',
                userId,
                sessionScope.tenantId,
                sessionScope.storeId,
            ),
            limit: 5,
            window: 60,
            failClosedOnProviderError: true,
        });
        if (!rateLimit.allowed) {
            const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
            const providerUnavailable = rateLimit.reason === 'provider_unavailable';
            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Proposal checks are temporarily unavailable. Please try again shortly.'
                        : 'Too many proposal checks. Please wait before trying again.',
                    retryAfter,
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: {
                        ...PRIVATE_NO_STORE_HEADERS,
                        'Retry-After': String(retryAfter),
                    },
                },
            );
        }

        const permission = await requireAnswerlatticePermission(
            request,
            session,
            ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
        );
        if (permission.response) {
            return withPrivateHeaders(permission.response);
        }
        if (!permission.access) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }

        const bodyResult = await readBoundedJsonBody(request, PROPOSAL_IMPACT_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid proposal impact request.',
            tooLargeMessage: 'Proposal impact request is too large.',
        });
        if (bodyResult.ok === false) {
            return NextResponse.json(
                { error: 'Invalid proposal impact request.' },
                { status: bodyResult.response.status, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const parsed = AnswerlatticeProposalImpactRequestSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid proposal impact request.' },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }

        const scope = {
            tId: permission.access.scope.tenantId,
            sId: permission.access.scope.storeId,
        };
        const [prepared, summary] = await Promise.all([
            prepareAnswerlatticeProposalImpact({
                access: permission.access,
                proposalId: parsed.data.proposalId,
                editedContent: parsed.data.editedContent,
            }),
            loadAnswerlatticeAnswerTestSummary(scope),
        ]);
        const selected = selectAnswerlatticeProposalImpactCases(
            summary.cases,
            prepared.relatedEntityIds,
            prepared.targetAnswerId,
        );

        let comparisons: AnswerlatticeProposalImpactComparison[] = [];
        let currentProofStatus = null;
        let proposedProofStatus = null;
        if (selected.cases.length > 0) {
            const impact = await runAnswerlatticeProposalImpactTests({
                candidate: prepared.candidate,
                cases: selected.cases,
                currentVersion: prepared.currentVersion,
                scope,
                targetAnswerId: prepared.targetAnswerId,
            });
            comparisons = impact.comparisons;
            currentProofStatus = getAnswerTestProofSummary(impact.currentResults).proofStatus;
            proposedProofStatus = getAnswerTestProofSummary(impact.proposedResults).proofStatus;
        }

        const warnings: string[] = [];
        if (selected.linkedTestCount === 0) {
            warnings.push('No active Answer Test is linked to this answer or its product entities.');
        }
        if (selected.testsTruncated) {
            warnings.push('Only the first 10 linked tests were checked, with critical tests evaluated first.');
        }
        if (comparisons.some(item => item.classification === 'regression')) {
            warnings.push('One or more current test contracts would regress with the proposed answer.');
        }
        warnings.push('Final approval independently rechecks entity bindings and active scope/version conflicts.');

        const response = AnswerlatticeProposalImpactResponseSchema.parse({
            requestId: parsed.data.requestId,
            proposalId: prepared.proposalId,
            candidate: prepared.candidateSummary,
            currentAnswer: prepared.currentAnswerSummary,
            linkedTestCount: selected.linkedTestCount,
            evaluatedTestCount: selected.cases.length,
            testsTruncated: selected.testsTruncated,
            ...summarizeAnswerlatticeProposalImpact(
                comparisons,
                currentProofStatus,
                proposedProofStatus,
            ),
            comparisons,
            warnings,
        });

        return NextResponse.json(response, {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
    } catch (error) {
        if (error instanceof AnswerlatticeGovernanceError) {
            return NextResponse.json(
                { error: error.publicMessage },
                { status: error.status, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        logRuntimeFailure('answerlattice_proposal_impact_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', sessionScope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', sessionScope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not check the proposed answer.' },
            { status: 500, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }
});
