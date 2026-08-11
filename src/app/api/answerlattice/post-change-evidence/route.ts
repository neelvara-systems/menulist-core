export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { ANSWERLATTICE_PERMISSION_KEYS } from '@constant/answerlattice/permissions';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
    requireAnswerlatticePermission,
} from '@lib/answerlattice/accessControl';
import { getBoundedAnswerlatticeStringContext } from '@lib/answerlattice/diagnostics';
import { AnswerlatticePostChangeTypeSchema } from '@lib/answerlattice/postChangeEvidence';
import {
    AnswerlatticePostChangeEvidenceError,
    loadAnswerlatticePostChangeCandidates,
    loadAnswerlatticePostChangeReview,
} from '@lib/answerlattice/postChangeEvidenceServer';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '../../../../middleware/auth';
import { applyAnswerlatticeDashboardReadRateLimit } from '../readRateLimit';

const PRIVATE_HEADERS = ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS;
const ALLOWED_QUERY_KEYS = new Set(['mode', 'changeType', 'changeId']);

type ParsedRequest =
    | { mode: 'list' }
    | {
        mode: 'review';
        changeType: 'release' | 'knowledge_correction';
        changeId: string;
    };

const parseRequest = (request: NextRequest): ParsedRequest | null => {
    const searchParams = request.nextUrl.searchParams;
    if (Array.from(searchParams.keys()).some(key => !ALLOWED_QUERY_KEYS.has(key))) return null;
    const modeValues = searchParams.getAll('mode');
    const changeTypeValues = searchParams.getAll('changeType');
    const changeIdValues = searchParams.getAll('changeId');
    if (modeValues.length !== 1 || changeTypeValues.length > 1 || changeIdValues.length > 1) return null;
    if (modeValues[0] === 'list') {
        return changeTypeValues.length === 0 && changeIdValues.length === 0
            ? { mode: 'list' }
            : null;
    }
    if (modeValues[0] !== 'review'
        || changeTypeValues.length !== 1
        || changeIdValues.length !== 1) {
        return null;
    }
    const parsedType = AnswerlatticePostChangeTypeSchema.safeParse(changeTypeValues[0]);
    const changeId = changeIdValues[0];
    if (!parsedType.success
        || typeof changeId !== 'string'
        || changeId.trim() !== changeId
        || changeId.length < 1
        || changeId.length > 180) {
        return null;
    }
    return {
        mode: 'review',
        changeType: parsedType.data,
        changeId,
    };
};

export const GET = withAuth(async (request: NextRequest, session) => {
    if (
        !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_POST_CHANGE_EVIDENCE_REVIEW
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
        || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SIGNAL_MUTATION
    ) {
        return NextResponse.json(
            { error: 'Post-change support evidence review is not enabled.' },
            { status: 403, headers: PRIVATE_HEADERS },
        );
    }

    const rateLimitResponse = await applyAnswerlatticeDashboardReadRateLimit(
        request,
        session,
        'post-change-evidence',
    );
    if (rateLimitResponse) return rateLimitResponse;

    const parsedRequest = parseRequest(request);
    if (!parsedRequest) {
        return NextResponse.json(
            { error: 'Invalid support evidence review request.' },
            { status: 400, headers: PRIVATE_HEADERS },
        );
    }

    const permission = await requireAnswerlatticePermission(
        request,
        session,
        ANSWERLATTICE_PERMISSION_KEYS.MANAGE_GOVERNANCE,
    );
    if (permission.response) return permission.response;
    if (!permission.access) {
        return NextResponse.json(
            { error: 'Forbidden' },
            { status: 403, headers: PRIVATE_HEADERS },
        );
    }

    const scope = {
        tId: permission.access.scope.tenantId,
        sId: permission.access.scope.storeId,
    };
    try {
        const result = parsedRequest.mode === 'list'
            ? await loadAnswerlatticePostChangeCandidates(scope)
            : await loadAnswerlatticePostChangeReview(
                scope,
                parsedRequest.changeType,
                parsedRequest.changeId,
            );
        return NextResponse.json(result, { headers: PRIVATE_HEADERS });
    } catch (error) {
        if (error instanceof AnswerlatticePostChangeEvidenceError) {
            return NextResponse.json(
                { error: error.publicMessage },
                { status: error.status, headers: PRIVATE_HEADERS },
            );
        }
        logRuntimeFailure('answerlattice_post_change_evidence_load_failed', error, {
            ...getBoundedAnswerlatticeStringContext('tenantId', scope.tId),
            ...getBoundedAnswerlatticeStringContext('storeId', scope.sId),
            ...getBoundedAnswerlatticeStringContext('mode', parsedRequest.mode),
            ...(parsedRequest.mode === 'review' ? {
                ...getBoundedAnswerlatticeStringContext('changeType', parsedRequest.changeType),
                changeIdLength: parsedRequest.changeId.length,
            } : {}),
        });
        return NextResponse.json(
            { error: 'Could not load support evidence for this change.' },
            { status: 500, headers: PRIVATE_HEADERS },
        );
    }
});
