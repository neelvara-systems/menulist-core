export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { PERMISSIONS } from '@constant/permissions';
import { getAiMenuManagerProject, getAiMenuManagerProposal, persistAiMenuManagerCommand } from '@database/aiMenuManager/server';
import { buildAiMenuManagerContextBaseHash, buildAiMenuManagerContextPacket } from '@lib/ai-menu-manager/contextPacket';
import { resolveAiMenuManagerCommand } from '@lib/ai-menu-manager/commandResolver';
import { buildDailySessionId, buildProposalId, hashStableValue, todaySessionDate } from '@lib/ai-menu-manager/idempotency';
import { isAiMenuManagerActionEnabled, getAiMenuManagerActionDefinition } from '@lib/ai-menu-manager/actionRegistry';
import {
    applyAiMenuManagerRateLimit,
    buildAiMenuManagerInvalidRequestResponse,
    resolveAiMenuManagerSelectedStoreScope,
} from '@lib/ai-menu-manager/apiGuards';
import { AiMenuManagerCommandRequestSchema } from '@lib/ai-menu-manager/schemas';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import { requireAnyStorePermissionForStore } from '@lib/permissions/server';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import type { AiMenuManagerProposalDoc } from '@type/aiMenuManager';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';

const AI_MENU_MANAGER_COMMAND_MAX_BODY_BYTES = 64 * 1024;

function getStoreName(store: Record<string, any> | null | undefined, fallback: string | number) {
    return store?.businessName || store?.name || store?.storeName || `Store ${fallback}`;
}

function getStoreFromSession(session: any, storeId: string | number) {
    const stores = [
        ...(Array.isArray(session?.user?.stores) ? session.user.stores : []),
        ...(Array.isArray(session?.stores) ? session.stores : []),
    ];
    return stores.find((store) => {
        const candidateIds = [store?.storeId, store?.sId, store?.id]
            .filter((value) => value !== undefined && value !== null)
            .map(String);
        return candidateIds.includes(String(storeId));
    }) || null;
}

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    const rateLimit = await applyAiMenuManagerRateLimit({
        request,
        session,
        feature: 'DATA_WRITE',
        keyPrefix: 'ai-menu-manager-command',
    });
    if (rateLimit) return rateLimit;

    const bodyResult = await readBoundedJsonBody(request, AI_MENU_MANAGER_COMMAND_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid request',
    });
    if (bodyResult.ok === false) {
        if (bodyResult.response.status === 400) {
            return buildAiMenuManagerInvalidRequestResponse(request, session, 'command');
        }
        return bodyResult.response;
    }

    const parsed = AiMenuManagerCommandRequestSchema.safeParse(bodyResult.data);
    if (!parsed.success) {
        return buildAiMenuManagerInvalidRequestResponse(request, session, 'command');
    }

    if (parsed.data.inputType !== 'upload' && !parsed.data.text?.trim()) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const scope = resolveAiMenuManagerSelectedStoreScope(request, session, parsed.data.storeId);
    if ('error' in scope && scope.error) return scope.error;

    const permissionError = await requireAnyStorePermissionForStore(
        request,
        session,
        [PERMISSIONS.MANAGE_MENU],
        'AI Menu Manager command',
        scope.sId,
        scope.tId,
    );
    if (permissionError) return permissionError;

    const project = await getAiMenuManagerProject({
        tId: scope.tId,
        sId: scope.sId,
        projectId: parsed.data.projectId,
    });
    if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const sessionStore = getStoreFromSession(session, scope.sId);
    const needsStoreRead = !sessionStore
        || (!sessionStore.businessType && !sessionStore.businessCategory)
        || (!sessionStore.businessName && !sessionStore.name && !sessionStore.storeName);
    const store = needsStoreRead
        ? await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(scope.sId).get()
            .then((storeSnap) => (storeSnap.exists ? storeSnap.data() as Record<string, any> : null))
        : sessionStore;
    const storeName = getStoreName(store, scope.sId);
    const context = buildAiMenuManagerContextPacket({
        project,
        storeName,
        businessType: store?.businessType || store?.businessCategory,
    });

    const sessionDate = todaySessionDate();
    const sessionId = parsed.data.sessionId || buildDailySessionId({
        tId: scope.tId,
        sId: scope.sId,
        projectId: parsed.data.projectId,
        sessionDate,
    });
    const messageId = `amm_msg_${hashStableValue(`${sessionId}:${parsed.data.idempotencyKey}`).slice(0, 20)}`;
    const preliminaryCardId = `amm_card_${hashStableValue(`${messageId}:card`).slice(0, 20)}`;
    const resolvedResult = resolveAiMenuManagerCommand({
        text: parsed.data.text || 'Uploaded menu file',
        tId: scope.tId,
        sId: scope.sId,
        projectId: parsed.data.projectId,
        context,
        composerContext: parsed.data.composerContext,
        cardId: preliminaryCardId,
        createdAt: new Date().toISOString(),
    });

    const actionType = resolvedResult.resolved?.actionType || resolvedResult.card.actionType;
    if (!isAiMenuManagerActionEnabled(actionType)) {
        return NextResponse.json({ error: 'Action disabled' }, { status: 403 });
    }

    const proposalId = buildProposalId({
        tId: scope.tId,
        sId: scope.sId,
        projectId: parsed.data.projectId,
        idempotencyKey: parsed.data.idempotencyKey,
        actionType,
        patchHash: resolvedResult.resolved?.patchHash,
    });
    const existingProposal = await getAiMenuManagerProposal(proposalId);
    if (
        existingProposal
        && String(existingProposal.tId) === String(scope.tId)
        && String(existingProposal.sId) === String(scope.sId)
        && String(existingProposal.projectId || '') === String(parsed.data.projectId || '')
    ) {
        return NextResponse.json({
            sessionId: existingProposal.sessionId,
            messageId,
            cards: [existingProposal.cardPayload],
            nextRequiredAction: existingProposal.cardPayload.kind === 'clarification'
                ? 'clarification'
                : existingProposal.cardPayload.status === 'pending_approval'
                    ? 'owner_approval'
                    : 'none',
        });
    }
    const card = {
        ...resolvedResult.card,
        cardId: proposalId,
    };
    const definition = resolvedResult.resolved?.definition || getAiMenuManagerActionDefinition(actionType);
    const proposal: AiMenuManagerProposalDoc = {
        proposalId,
        sessionId,
        tId: scope.tId,
        sId: scope.sId,
        projectId: parsed.data.projectId,
        actionType,
        status: card.status,
        risk: card.risk,
        approvalPolicy: card.approvalPolicy,
        entityRefs: card.entityRefs,
        scope: card.scope,
        beforeAfterSummary: card.beforeAfterSummary,
        cardPayload: card,
        executionMode: resolvedResult.resolved?.executionMode || definition.executionMode,
        executionStatus: 'not_started',
        patch: resolvedResult.resolved?.patch,
        patchHash: resolvedResult.resolved?.patchHash,
        baseProjectUpdatedAt: context.projectUpdatedAt,
        baseProjectHash: buildAiMenuManagerContextBaseHash(context),
        idempotencyKeys: [parsed.data.idempotencyKey],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await persistAiMenuManagerCommand({
        sessionId,
        sessionDate,
        storageMode: FEATURE_FLAGS.AI_MENU_MANAGER_SESSION_STORAGE_MODE,
        tId: scope.tId,
        sId: scope.sId,
        projectId: parsed.data.projectId,
        ownerText: parsed.data.text || 'Uploaded menu file',
        messageId,
        card,
        proposal,
        replaceOperationId: parsed.data.replaceOperationId,
    });

    return NextResponse.json({
        sessionId,
        messageId,
        cards: [card],
        nextRequiredAction: card.kind === 'clarification'
            ? 'clarification'
            : card.status === 'pending_approval'
                ? 'owner_approval'
                : 'none',
    });
});
