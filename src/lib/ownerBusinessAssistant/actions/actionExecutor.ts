import type { NextRequest } from 'next/server';
import { FEATURE_FLAGS } from '@config/features';
import type { OwnerBusinessAssistantActionRequest } from '../schemas';
import type { OwnerBusinessAssistantActionResult } from '../types';
import { getOwnerBusinessAssistantActionDefinition, isOwnerBusinessAssistantActionEnabled } from './actionRegistry';
import { requireOwnerBusinessAssistantActionAccess } from './actionAccess';
import { prepareOwnerBusinessAssistantDraft } from './actionDraftBuilder';
import { logOwnerBusinessAssistantAction } from './actionAuditLogger';
import { resolveOwnerBusinessAssistantHref } from './actionTargetResolver';
import {
  canRunOwnerBusinessAssistantPublicTruthAction,
  getPublicTruthBlockedMessage,
} from './publicTruthActionGuard';
import { updateOwnerBusinessHealthCheckWorkflow } from './checkWorkflowService';

export async function executeOwnerBusinessAssistantAction(params: {
  request: NextRequest;
  session: any;
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  body: OwnerBusinessAssistantActionRequest;
}): Promise<OwnerBusinessAssistantActionResult> {
  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT) {
    return { success: false, status: 'blocked', message: 'Action Support is disabled.' };
  }

  const definition = getOwnerBusinessAssistantActionDefinition(params.body.actionType);
  if (!definition) {
    return { success: false, status: 'blocked', message: 'That action is not supported.' };
  }

  if (!isOwnerBusinessAssistantActionEnabled(definition)) {
    return { success: false, status: 'blocked', message: 'That action is disabled.' };
  }

  const permissionError = await requireOwnerBusinessAssistantActionAccess({
    request: params.request,
    session: params.session,
    definition,
  });
  if (permissionError) {
    return { success: false, status: 'blocked', message: 'You do not have permission for this action.' };
  }

  if (params.body.operation === 'navigate') {
    const href = resolveOwnerBusinessAssistantHref({
      actionType: params.body.actionType,
      projectId: params.body.projectId,
      targetId: params.body.targetId,
    });
    const result: OwnerBusinessAssistantActionResult = {
      success: Boolean(href),
      status: href ? 'navigated' : 'blocked',
      message: href ? 'Opening the right screen.' : 'No screen is available for this action yet.',
      href,
    };
    const actionId = await logOwnerBusinessAssistantAction({ ...params, operation: 'navigate', request: params.body, result });
    return { ...result, actionId };
  }

  if (params.body.operation === 'prepare') {
    if (definition.riskLevel !== 'draft') {
      return { success: false, status: 'blocked', message: 'This action cannot prepare a draft.' };
    }
    const publicTruthBlocked = !canRunOwnerBusinessAssistantPublicTruthAction(definition);
    const draftId = await prepareOwnerBusinessAssistantDraft({
      tId: params.tId,
      sId: params.sId,
      userId: params.userId,
      definition,
      request: params.body,
    });
    const result: OwnerBusinessAssistantActionResult = {
      success: true,
      status: 'draft_prepared',
      message: publicTruthBlocked ? getPublicTruthBlockedMessage() : 'Draft prepared for review.',
      draftId,
      requiresConfirmation: !publicTruthBlocked,
      affectedSurface: definition.cacheImpact,
    };
    const actionId = await logOwnerBusinessAssistantAction({ ...params, operation: 'prepare', request: params.body, result });
    return { ...result, actionId };
  }

  if (params.body.operation === 'mark_reviewed') {
    const result = await updateOwnerBusinessHealthCheckWorkflow({ ...params, request: params.body, status: 'reviewed' });
    await logOwnerBusinessAssistantAction({ ...params, operation: 'mark_reviewed', request: params.body, result });
    return result;
  }

  if (params.body.operation === 'dismiss') {
    const result = await updateOwnerBusinessHealthCheckWorkflow({ ...params, request: params.body, status: 'dismissed' });
    await logOwnerBusinessAssistantAction({ ...params, operation: 'dismiss', request: params.body, result });
    return result;
  }

  if (params.body.operation === 'cancel') {
    const result = await updateOwnerBusinessHealthCheckWorkflow({ ...params, request: params.body, status: 'cancelled' });
    await logOwnerBusinessAssistantAction({ ...params, operation: 'cancel', request: params.body, result });
    return result;
  }

  return {
    success: false,
    status: 'blocked',
    message: 'This action needs to be completed in the existing MenuList screen.',
  };
}
