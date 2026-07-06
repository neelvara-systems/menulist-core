export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { PERMISSIONS } from '@constant/permissions';
import {
    approveAiMenuManagerProposal,
    getAiMenuManagerProject,
    getAiMenuManagerProposal,
    updateAiMenuManagerProposalStatus,
} from '@database/aiMenuManager/server';
import {
    applyAiMenuManagerRateLimit,
    buildAiMenuManagerInvalidRequestResponse,
    resolveAiMenuManagerSelectedStoreScope,
} from '@lib/ai-menu-manager/apiGuards';
import { buildAiMenuManagerContextBaseHash, buildAiMenuManagerContextPacket } from '@lib/ai-menu-manager/contextPacket';
import { normalizeAiMenuManagerProposalId } from '@lib/ai-menu-manager/routeIds';
import { AiMenuManagerProposalActionSchema } from '@lib/ai-menu-manager/schemas';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const AI_MENU_MANAGER_PROPOSAL_ACTION_MAX_BODY_BYTES = 16 * 1024;

export const POST = withAuth(async (
    request: NextRequest,
    session,
    params?: { proposalId?: string },
) => {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    const proposalId = normalizeAiMenuManagerProposalId(params?.proposalId);
    if (!proposalId) {
        return NextResponse.json({ error: 'Invalid proposal' }, { status: 400 });
    }

    const rateLimit = await applyAiMenuManagerRateLimit({
        request,
        session,
        feature: 'DATA_WRITE',
        keyPrefix: 'ai-menu-manager-action',
    });
    if (rateLimit) return rateLimit;

    const bodyResult = await readBoundedJsonBody(request, AI_MENU_MANAGER_PROPOSAL_ACTION_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid request',
    });
    if (bodyResult.ok === false) {
        if (bodyResult.response.status === 400) {
            return buildAiMenuManagerInvalidRequestResponse(request, session, 'proposal-action');
        }
        return bodyResult.response;
    }

    const parsed = AiMenuManagerProposalActionSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
        return buildAiMenuManagerInvalidRequestResponse(request, session, 'proposal-action');
    }

    const scope = resolveAiMenuManagerSelectedStoreScope(request, session, parsed.data.storeId);
    if ('error' in scope && scope.error) return scope.error;

    const permissionError = await requireAnyStorePermissionForStore(
        request,
        session,
        [PERMISSIONS.MANAGE_MENU],
        'AI Menu Manager proposal action',
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

    const userId = scope.userId || session?.user?.id || 'unknown';
    const getProposalActionLogContext = () => ({
        ...getBoundedRuntimeStringContext('proposalId', proposalId),
        ...getBoundedRuntimeStringContext('projectId', parsed.data.projectId),
        ...getBoundedRuntimeStringContext('actionType', parsed.data.actionType),
        ...getBoundedRuntimeStringContext('tenantId', scope.tId),
        ...getBoundedRuntimeStringContext('storeId', scope.sId),
        ...getBoundedRuntimeStringContext('userId', userId),
        action: parsed.data.action,
    });

    if (parsed.data.action === 'cancel' || parsed.data.action === 'reject' || parsed.data.action === 'mark_done') {
        if (
            parsed.data.action === 'mark_done'
            && (
                proposal.cardPayload?.kind !== 'manual_task'
                || !proposal.cardPayload.actions?.includes('mark_done')
            )
        ) {
            return NextResponse.json({ error: 'This card cannot be marked done' }, { status: 409 });
        }

        try {
            const status = parsed.data.action === 'reject'
                ? 'rejected'
                : parsed.data.action === 'mark_done'
                    ? 'manual_task'
                    : 'cancelled';
            const result = await updateAiMenuManagerProposalStatus({
                proposalId,
                tId: scope.tId,
                sId: scope.sId,
                status,
                idempotencyKey: parsed.data.idempotencyKey,
                userId,
            });
            return NextResponse.json({ data: result });
        } catch (error) {
            logRuntimeFailure('ai_menu_manager_proposal_status_update_failed', error, getProposalActionLogContext());
            return NextResponse.json({ error: 'Card could not be updated' }, { status: 409 });
        }
    }

    if (proposal.executionMode !== 'client_project_mutation') {
        return NextResponse.json({
            error: 'Action adapter not executable yet',
            message: 'This card can be handled through its existing manual flow until its adapter is connected.',
        }, { status: 409 });
    }

    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_CONFIRMED_WRITES) {
        return NextResponse.json({
            error: 'Confirmed writes disabled',
            message: 'Menu Manager preview is enabled, but approved writes are disabled by feature flag.',
        }, { status: 403 });
    }

    if (proposal.projectId && proposal.baseProjectHash) {
        const currentProject = await getAiMenuManagerProject({
            tId: scope.tId,
            sId: scope.sId,
            projectId: proposal.projectId,
        });
        if (!currentProject) {
            return NextResponse.json({ error: 'Menu changed. Prepare a new card before approval.' }, { status: 409 });
        }
        const currentContext = buildAiMenuManagerContextPacket({
            project: currentProject,
            storeName: proposal.scope.label,
        });
        if (buildAiMenuManagerContextBaseHash(currentContext) !== proposal.baseProjectHash) {
            return NextResponse.json({ error: 'Menu changed. Prepare a new card before approval.' }, { status: 409 });
        }
    }

    let result;
    try {
        result = await approveAiMenuManagerProposal({
            proposalId,
            tId: scope.tId,
            sId: scope.sId,
            idempotencyKey: parsed.data.idempotencyKey,
            userId,
        });
    } catch (error) {
        logRuntimeFailure('ai_menu_manager_proposal_approval_failed', error, getProposalActionLogContext());
        return NextResponse.json({ error: 'Card could not be approved' }, { status: 409 });
    }

    return NextResponse.json({
        data: {
            directive: result.directive,
            proposal: {
                proposalId: result.proposal.proposalId,
                actionType: result.proposal.actionType,
                status: 'executing',
            },
        },
    });
});
