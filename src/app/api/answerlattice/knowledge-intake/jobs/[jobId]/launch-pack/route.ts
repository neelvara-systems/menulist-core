export const dynamic = 'force-dynamic';

import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import {
    AnswerlatticeProductStarterPackRequestSchema,
} from '@lib/answerlattice/firstTrustedAnswerPackContracts';
import { generateAnswerlatticeProductStarterPack } from '@lib/answerlattice/firstTrustedAnswerPackServer';
import {
    getAnswerlatticeKnowledgeIntakeLogContext,
    logAnswerlatticeKnowledgeIntakeFailure,
} from '@lib/answerlattice/knowledgeIntakeDiagnostics';
import {
    answerlatticeKnowledgeIntakeJson,
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
    withAnswerlatticeKnowledgeIntakePrivateHeaders,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { serializeIntakeValue } from '@lib/answerlattice/knowledgeIntake';
import { normalizeAnswerlatticeKnowledgeIntakeJobId } from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { secureLog } from '@lib/security/secureLogger';
import { NextRequest } from 'next/server';
import { withAuth } from '@/middleware/auth';

const PRODUCT_STARTER_PACK_MAX_BODY_BYTES = 2 * 1024;

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    if (!jobId) {
        return answerlatticeKnowledgeIntakeJson(
            { error: 'Invalid knowledge intake job.' },
            { status: 400 },
        );
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:product-starter-pack',
        rateLimit: 4,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return withAnswerlatticeKnowledgeIntakePrivateHeaders(access.response);

    const governancePermission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
    );
    if (governancePermission.response) {
        return withAnswerlatticeKnowledgeIntakePrivateHeaders(governancePermission.response);
    }
    if (
        !governancePermission.access
        || governancePermission.access.scope.tenantId !== access.context.scope.tId
        || governancePermission.access.scope.storeId !== access.context.scope.sId
    ) {
        return answerlatticeKnowledgeIntakeJson(
            { error: 'Answerlattice workspace is not available.' },
            { status: 403 },
        );
    }

    try {
        const bodyResult = await readBoundedJsonBody(request, PRODUCT_STARTER_PACK_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid product starter pack request.',
            tooLargeMessage: 'Product starter pack request is too large.',
        });
        if (bodyResult.ok === false) {
            return withAnswerlatticeKnowledgeIntakePrivateHeaders(bodyResult.response);
        }
        const parsed = AnswerlatticeProductStarterPackRequestSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return answerlatticeKnowledgeIntakeJson(
                { error: 'Invalid product starter pack request.' },
                { status: 400 },
            );
        }
        const { checkAnswerlatticeSafeMode } = await import('@lib/answerlattice/safeMode');
        const safeModeResponse = await checkAnswerlatticeSafeMode();
        if (safeModeResponse) {
            return withAnswerlatticeKnowledgeIntakePrivateHeaders(safeModeResponse);
        }

        const pack = await generateAnswerlatticeProductStarterPack(
            access.context.scope,
            jobId,
            parsed.data.requestId,
            access.context.actor,
        );
        secureLog('[Answerlattice Intake] Product starter pack ready', getAnswerlatticeKnowledgeIntakeLogContext({
            createdCount: pack.cached ? 0 : pack.reviewItems.length,
            jobId,
            scope: access.context.scope,
        }));
        return answerlatticeKnowledgeIntakeJson({ pack: serializeIntakeValue(pack) });
    } catch (error) {
        const status = getAnswerlatticeKnowledgeIntakeErrorStatus(error);
        if (status >= 500) {
            logAnswerlatticeKnowledgeIntakeFailure(
                '[Answerlattice Intake] Product starter pack failed',
                'answerlattice_product_starter_pack_failed',
                error,
                { jobId, scope: access.context.scope },
            );
        }
        return answerlatticeKnowledgeIntakeJson({
            error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Could not generate the product-specific starter pack.'),
        }, { status });
    }
});
