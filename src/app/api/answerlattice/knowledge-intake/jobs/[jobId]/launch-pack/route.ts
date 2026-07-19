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
    getAnswerlatticeKnowledgeIntakeClientErrorMessage,
    getAnswerlatticeKnowledgeIntakeErrorStatus,
    requireAnswerlatticeKnowledgeIntakeContext,
} from '@lib/answerlattice/knowledgeIntakeApi';
import { serializeIntakeValue } from '@lib/answerlattice/knowledgeIntake';
import { normalizeAnswerlatticeKnowledgeIntakeJobId } from '@lib/answerlattice/knowledgeIntakeIdBoundary';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { secureLog } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const PRODUCT_STARTER_PACK_MAX_BODY_BYTES = 2 * 1024;
const PRIVATE_NO_STORE_HEADERS = {
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
};

const withPrivateHeaders = <T extends NextResponse>(response: T): T => {
    response.headers.set('Cache-Control', PRIVATE_NO_STORE_HEADERS['Cache-Control']);
    response.headers.set('X-Content-Type-Options', PRIVATE_NO_STORE_HEADERS['X-Content-Type-Options']);
    return response;
};

export const POST = withAuth(async (request: NextRequest, session, params: { jobId: string }) => {
    const jobId = normalizeAnswerlatticeKnowledgeIntakeJobId(params.jobId);
    if (!jobId) {
        return NextResponse.json(
            { error: 'Invalid knowledge intake job.' },
            { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }

    const access = await requireAnswerlatticeKnowledgeIntakeContext(request, session, {
        rateLimitKey: 'answerlattice-intake:product-starter-pack',
        rateLimit: 4,
        rateWindow: 60,
        requireActiveLicense: true,
    });
    if (access.response) return withPrivateHeaders(access.response);

    const governancePermission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
    );
    if (governancePermission.response) return withPrivateHeaders(governancePermission.response);
    if (
        !governancePermission.access
        || governancePermission.access.scope.tenantId !== access.context.scope.tId
        || governancePermission.access.scope.storeId !== access.context.scope.sId
    ) {
        return NextResponse.json(
            { error: 'Answerlattice workspace is not available.' },
            { status: 403, headers: PRIVATE_NO_STORE_HEADERS },
        );
    }

    try {
        const bodyResult = await readBoundedJsonBody(request, PRODUCT_STARTER_PACK_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid product starter pack request.',
            tooLargeMessage: 'Product starter pack request is too large.',
        });
        if (bodyResult.ok === false) return withPrivateHeaders(bodyResult.response);
        const parsed = AnswerlatticeProductStarterPackRequestSchema.safeParse(bodyResult.data);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid product starter pack request.' },
                { status: 400, headers: PRIVATE_NO_STORE_HEADERS },
            );
        }
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return withPrivateHeaders(safeModeResponse);

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
        return NextResponse.json({ pack: serializeIntakeValue(pack) }, {
            headers: PRIVATE_NO_STORE_HEADERS,
        });
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
        return NextResponse.json({
            error: getAnswerlatticeKnowledgeIntakeClientErrorMessage(error, 'Could not generate the product-specific starter pack.'),
        }, { status, headers: PRIVATE_NO_STORE_HEADERS });
    }
});
