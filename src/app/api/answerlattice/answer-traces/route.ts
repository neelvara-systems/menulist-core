export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { loadAnswerlatticeAnswerTraces } from '@lib/answerlattice/answerTraceServer';
import { getBoundedAnswerlatticeStringContext } from '@lib/answerlattice/diagnostics';
import { normalizeAnswerlatticeSearchHistoryId } from '@lib/answerlattice/searchHistoryIdBoundary';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const PRIVATE_HEADERS = ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS;

export const GET = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TRACE) {
        return NextResponse.json(
            { error: 'Answer trace is not enabled.' },
            { status: 403, headers: PRIVATE_HEADERS },
        );
    }

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(request, session, 'answer-traces');
    if (rateLimitResponse) return rateLimitResponse;

    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT,
    );
    if (permission.response) return permission.response;
    if (!permission.access) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: PRIVATE_HEADERS });
    }

    const allowedKeys = new Set(['searchHistoryId']);
    if (Array.from(request.nextUrl.searchParams.keys()).some(key => !allowedKeys.has(key))) {
        return NextResponse.json(
            { error: 'Invalid answer trace request.' },
            { status: 400, headers: PRIVATE_HEADERS },
        );
    }
    const rawIds = request.nextUrl.searchParams.getAll('searchHistoryId');
    if (rawIds.length > 1) {
        return NextResponse.json(
            { error: 'Invalid answer trace request.' },
            { status: 400, headers: PRIVATE_HEADERS },
        );
    }
    const rawId = rawIds[0];
    const searchHistoryId = rawId === undefined
        ? null
        : normalizeAnswerlatticeSearchHistoryId(rawId);
    if (rawId !== undefined && !searchHistoryId) {
        return NextResponse.json(
            { error: 'Invalid answer trace request.' },
            { status: 400, headers: PRIVATE_HEADERS },
        );
    }

    try {
        const result = await loadAnswerlatticeAnswerTraces({
            tId: permission.access.scope.tenantId,
            sId: permission.access.scope.storeId,
        }, searchHistoryId);
        if (searchHistoryId && result.traces.length === 0) {
            return NextResponse.json(
                { error: 'Answer trace is no longer available.' },
                { status: 404, headers: PRIVATE_HEADERS },
            );
        }
        return NextResponse.json(result, { headers: PRIVATE_HEADERS });
    } catch (error) {
        logRuntimeFailure('answerlattice_answer_trace_load_failed', error, {
            ...getBoundedAnswerlatticeStringContext('tenantId', permission.access.scope.tenantId),
            ...getBoundedAnswerlatticeStringContext('storeId', permission.access.scope.storeId),
            hasExactTraceId: Boolean(searchHistoryId),
        });
        return NextResponse.json(
            { error: 'Could not load answer trace.' },
            { status: 500, headers: PRIVATE_HEADERS },
        );
    }
});
