export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import { requireAnswerlatticePermission } from '@lib/answerlattice/accessControl';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import {
    AnswerlatticeSupportTruthExportTooLargeError,
    buildAnswerlatticeSupportTruthExport,
    recordAnswerlatticeSupportTruthExportAudit,
} from '@lib/answerlattice/supportTruthExport';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { checkRateLimit } from '@lib/rateLimit';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';

const EXPORT_RATE_LIMIT = {
    limit: 2,
    window: 60 * 60,
};

const privateNoStoreHeaders = {
    'Cache-Control': 'private, no-store, max-age=0',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
};

const withPrivateHeaders = <T extends NextResponse>(response: T): T => {
    Object.entries(privateNoStoreHeaders).forEach(([name, value]) => {
        response.headers.set(name, value);
    });
    return response;
};

const featureUnavailable = () => NextResponse.json(
    { error: 'Support truth export is not enabled.', code: 'FEATURE_DISABLED' },
    { status: 403, headers: privateNoStoreHeaders },
);

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_EXPORT) {
        return featureUnavailable();
    }

    const sessionScope = resolveAnswerlatticeSessionScope(session);
    if (!sessionScope) {
        return NextResponse.json(
            { error: 'Not onboarded', code: 'NOT_ONBOARDED' },
            { status: 400, headers: privateNoStoreHeaders },
        );
    }
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: privateNoStoreHeaders });
    }
    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey(
            'answerlattice-support-truth-export',
            userId,
            sessionScope.tenantId,
            sessionScope.storeId,
        ),
        ...EXPORT_RATE_LIMIT,
        failClosedOnProviderError: true,
    });
    if (!rateLimit.allowed) {
        const retryAfter = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
        if (rateLimit.reason === 'provider_unavailable') {
            return NextResponse.json(
                {
                    error: 'Support truth export is temporarily unavailable. Please try again shortly.',
                    code: 'RATE_LIMIT_UNAVAILABLE',
                    retryAfter,
                },
                {
                    status: 503,
                    headers: {
                        ...privateNoStoreHeaders,
                        'Retry-After': String(retryAfter),
                    },
                },
            );
        }
        return NextResponse.json(
            {
                error: 'Too many exports. Please try again later.',
                code: 'RATE_LIMITED',
                retryAfter,
            },
            {
                status: 429,
                headers: {
                    ...privateNoStoreHeaders,
                    'Retry-After': String(retryAfter),
                },
            },
        );
    }

    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.EXPORT_DATA,
    );
    if (permission.response) return withPrivateHeaders(permission.response);
    const access = permission.access;
    if (!access) {
        return NextResponse.json(
            { error: 'Forbidden', code: 'FORBIDDEN' },
            { status: 403, headers: privateNoStoreHeaders },
        );
    }

    try {
        const { json, payload } = await buildAnswerlatticeSupportTruthExport({
            db: answerlatticeFirestoreAdmin,
            productName: access.storeName,
            tId: access.scope.tenantId,
            sId: access.scope.storeId,
        });
        await recordAnswerlatticeSupportTruthExportAudit({
            actorId: access.user.id || access.user.email,
            db: answerlatticeFirestoreAdmin,
            json,
            payload,
            tId: access.scope.tenantId,
            sId: access.scope.storeId,
        });
        const date = new Date().toISOString().slice(0, 10);
        return new NextResponse(json, {
            status: 200,
            headers: {
                ...privateNoStoreHeaders,
                'Content-Disposition': `attachment; filename="answerlattice-support-truth-${date}.json"`,
                'Content-Type': 'application/json; charset=utf-8',
            },
        });
    } catch (error) {
        if (error instanceof AnswerlatticeSupportTruthExportTooLargeError) {
            return NextResponse.json(
                {
                    error: 'This workspace is larger than the safe export limit. Contact Answerlattice support for a managed export.',
                    code: 'EXPORT_TOO_LARGE',
                    section: error.section,
                },
                { status: 409, headers: privateNoStoreHeaders },
            );
        }

        logRuntimeFailure('answerlattice_support_truth_export_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', access.scope.tenantId),
            ...getBoundedRuntimeStringContext('storeId', access.scope.storeId),
        });
        return NextResponse.json(
            { error: 'Could not create the support truth export.', code: 'EXPORT_FAILED' },
            { status: 500, headers: privateNoStoreHeaders },
        );
    }
});

export const GET = async () => NextResponse.json(
    { error: 'Use POST to create a support truth export.', code: 'METHOD_NOT_ALLOWED' },
    {
        status: 405,
        headers: {
            ...privateNoStoreHeaders,
            Allow: 'POST',
        },
    },
);
