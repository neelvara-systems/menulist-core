export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import {
    completeAiMenuManagerProposal,
    getAiMenuManagerProposal,
} from '@database/aiMenuManager/server';
import {
    applyAiMenuManagerRateLimit,
    buildAiMenuManagerInvalidRequestResponse,
    resolveAiMenuManagerSelectedStoreScope,
} from '@lib/ai-menu-manager/apiGuards';
import { AiMenuManagerProposalCompleteSchema } from '@lib/ai-menu-manager/schemas';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const AI_MENU_MANAGER_PROPOSAL_COMPLETE_MAX_BODY_BYTES = 16 * 1024;

export const POST = withAuth(async (
    request: NextRequest,
    session,
    params?: { proposalId?: string },
) => {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    const proposalId = params?.proposalId;
    if (!proposalId) {
        return NextResponse.json({ error: 'Invalid proposal' }, { status: 400 });
    }

    const rateLimit = await applyAiMenuManagerRateLimit({
        request,
        session,
        feature: 'DATA_WRITE',
        keyPrefix: 'ai-menu-manager-complete',
    });
    if (rateLimit) return rateLimit;

    const bodyResult = await readBoundedJsonBody(request, AI_MENU_MANAGER_PROPOSAL_COMPLETE_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid request',
    });
    if (bodyResult.ok === false) {
        if (bodyResult.response.status === 400) {
            return buildAiMenuManagerInvalidRequestResponse(request, session, 'proposal-complete');
        }
        return bodyResult.response;
    }

    const parsed = AiMenuManagerProposalCompleteSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
        return buildAiMenuManagerInvalidRequestResponse(request, session, 'proposal-complete');
    }

    const scope = resolveAiMenuManagerSelectedStoreScope(request, session, parsed.data.storeId);
    if ('error' in scope && scope.error) return scope.error;

    const permissionError = await requireAnyStorePermissionForStore(
        request,
        session,
        [PERMISSIONS.MANAGE_MENU],
        'AI Menu Manager proposal complete',
        scope.sId,
        scope.tId,
    );
    if (permissionError) return permissionError;

    const proposal = await getAiMenuManagerProposal(proposalId);
    if (!proposal || String(proposal.tId) !== String(scope.tId) || String(proposal.sId) !== String(scope.sId)) {
        return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }
    if (proposal.projectId && String(proposal.projectId) !== String(parsed.data.projectId || '')) {
        return NextResponse.json({ error: 'Proposal no longer matches the selected menu' }, { status: 409 });
    }
    if (parsed.data.actionType && parsed.data.actionType !== proposal.actionType) {
        return NextResponse.json({ error: 'Proposal no longer matches the selected action' }, { status: 409 });
    }

    try {
        const result = await completeAiMenuManagerProposal({
            proposalId,
            tId: scope.tId,
            sId: scope.sId,
            projectId: parsed.data.projectId,
            actionType: parsed.data.actionType,
            executionId: parsed.data.executionId,
            patchHash: parsed.data.patchHash,
            result: parsed.data.result,
            message: parsed.data.message,
            idempotencyKey: parsed.data.idempotencyKey,
        });

        return NextResponse.json({ data: result });
    } catch {
        return NextResponse.json({ error: 'Completion failed' }, { status: 400 });
    }
});
