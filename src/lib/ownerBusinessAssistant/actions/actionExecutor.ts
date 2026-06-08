import type { NextRequest } from 'next/server';
import { FEATURE_FLAGS } from '@config/features';
import type { OwnerBusinessAssistantActionRequest } from '../schemas';
import type {
  OwnerBusinessAssistantActionResult,
  OwnerBusinessAssistantActionTargetKind,
  OwnerBusinessAssistantRouteMetrics,
} from '../types';
import { getOwnerBusinessAssistantActionDefinition, isOwnerBusinessAssistantActionEnabled } from './actionRegistry';
import { requireOwnerBusinessAssistantActionAccess } from './actionAccess';
import { prepareOwnerBusinessAssistantDraft } from './actionDraftBuilder';
import { logOwnerBusinessAssistantAction } from './actionAuditLogger';
import {
  resolveOwnerBusinessAssistantHref,
  validateOwnerBusinessAssistantProjectScope,
} from './actionTargetResolver';
import {
  canRunOwnerBusinessAssistantPublicTruthAction,
  getPublicTruthBlockedMessage,
} from './publicTruthActionGuard';
import { updateOwnerBusinessHealthCheckWorkflow } from './checkWorkflowService';

const PROJECT_AWARE_TARGET_KINDS = new Set(['project', 'menu_item', 'category']);
const CONCRETE_PROJECT_TARGET_KINDS = new Set(['menu_item', 'category']);

const buildActionMetrics = (params: {
  firestoreReadCount?: number;
  firestoreWriteCount?: number;
  publicTruthGuardBlocked?: boolean;
} = {}): OwnerBusinessAssistantRouteMetrics => ({
  route: '/api/owner-business-assistant/action',
  cacheSource: 'fresh_firestore',
  firestoreReadCount: params.firestoreReadCount ?? 0,
  firestoreWriteCount: params.firestoreWriteCount ?? 0,
  unsupportedReason: params.publicTruthGuardBlocked ? 'public_truth_guard_blocked' : undefined,
});

const resolveRequestProjectId = (body: OwnerBusinessAssistantActionRequest) => {
  if (body.projectId) return body.projectId;
  if (body.targetKind === 'project' && body.targetId) return body.targetId;
  if (body.clientContext?.selectedProjectId) return body.clientContext.selectedProjectId;
  const payloadProjectId = body.payload?.projectId;
  return typeof payloadProjectId === 'string' && payloadProjectId.trim() ? payloadProjectId.trim() : undefined;
};

export async function executeOwnerBusinessAssistantAction(params: {
  request: NextRequest;
  session: any;
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  body: OwnerBusinessAssistantActionRequest;
}): Promise<OwnerBusinessAssistantActionResult> {
  let firestoreReadCount = 0;

  if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_ACTION_SUPPORT) {
    return { success: false, status: 'blocked', message: 'Action Support is disabled.', metrics: buildActionMetrics() };
  }

  const definition = getOwnerBusinessAssistantActionDefinition(params.body.actionType);
  if (!definition) {
    return { success: false, status: 'blocked', message: 'That action is not supported.', metrics: buildActionMetrics() };
  }

  if (!isOwnerBusinessAssistantActionEnabled(definition)) {
    return { success: false, status: 'blocked', message: 'That action is disabled.', metrics: buildActionMetrics() };
  }

  if (
    params.body.targetKind
    && !definition.targetKinds.includes(params.body.targetKind as OwnerBusinessAssistantActionTargetKind)
  ) {
    return { success: false, status: 'blocked', message: 'That target is not supported for this action.', metrics: buildActionMetrics() };
  }

  const permissionError = await requireOwnerBusinessAssistantActionAccess({
    request: params.request,
    session: params.session,
    definition,
  });
  if (permissionError) {
    return { success: false, status: 'blocked', message: 'You do not have permission for this action.', metrics: buildActionMetrics() };
  }

  const projectAwareAction = definition.targetKinds.some((targetKind) => PROJECT_AWARE_TARGET_KINDS.has(targetKind))
    || definition.cacheImpact === 'project_public';
  const scopedProjectId = projectAwareAction ? resolveRequestProjectId(params.body) : undefined;
  const needsConcreteProject = CONCRETE_PROJECT_TARGET_KINDS.has(params.body.targetKind || '')
    || definition.cacheImpact === 'project_public';
  if (needsConcreteProject && !scopedProjectId) {
    return { success: false, status: 'blocked', message: 'Choose a menu first.', metrics: buildActionMetrics() };
  }

  if (scopedProjectId) {
    const projectScope = await validateOwnerBusinessAssistantProjectScope({
      tId: params.tId,
      sId: params.sId,
      projectId: scopedProjectId,
    });
    firestoreReadCount += projectScope.readCount;
    if (!projectScope.valid) {
      return {
        success: false,
        status: 'blocked',
        message: 'That menu is not available for this store.',
        metrics: buildActionMetrics({ firestoreReadCount }),
      };
    }
  }

  const body = scopedProjectId && !params.body.projectId
    ? { ...params.body, projectId: scopedProjectId }
    : params.body;

  if (body.operation === 'navigate') {
    const href = resolveOwnerBusinessAssistantHref({
      actionType: body.actionType,
      projectId: body.projectId,
      targetId: body.targetId,
    });
    const result: OwnerBusinessAssistantActionResult = {
      success: Boolean(href),
      status: href ? 'navigated' : 'blocked',
      message: href ? 'Opening the right screen.' : 'No screen is available for this action yet.',
      href,
      metrics: buildActionMetrics({ firestoreReadCount }),
    };
    const actionId = await logOwnerBusinessAssistantAction({ ...params, operation: 'navigate', request: body, result });
    return {
      ...result,
      actionId,
      metrics: buildActionMetrics({
        firestoreReadCount,
        firestoreWriteCount: actionId ? 1 : 0,
      }),
    };
  }

  if (body.operation === 'prepare') {
    if (definition.riskLevel !== 'draft') {
      return {
        success: false,
        status: 'blocked',
        message: 'This action cannot prepare a draft.',
        metrics: buildActionMetrics({ firestoreReadCount }),
      };
    }
    const publicTruthBlocked = !canRunOwnerBusinessAssistantPublicTruthAction(definition);
    const draftId = await prepareOwnerBusinessAssistantDraft({
      tId: params.tId,
      sId: params.sId,
      userId: params.userId,
      definition,
      request: body,
    });
    const result: OwnerBusinessAssistantActionResult = {
      success: true,
      status: 'draft_prepared',
      message: publicTruthBlocked ? getPublicTruthBlockedMessage() : 'Draft prepared for review.',
      draftId,
      requiresConfirmation: !publicTruthBlocked,
      affectedSurface: definition.cacheImpact,
      metrics: buildActionMetrics({
        firestoreReadCount,
        firestoreWriteCount: 1,
        publicTruthGuardBlocked: publicTruthBlocked,
      }),
    };
    const actionId = await logOwnerBusinessAssistantAction({ ...params, operation: 'prepare', request: body, result });
    return {
      ...result,
      actionId,
      metrics: buildActionMetrics({
        firestoreReadCount,
        firestoreWriteCount: actionId ? 2 : 1,
        publicTruthGuardBlocked: publicTruthBlocked,
      }),
    };
  }

  if (body.operation === 'mark_reviewed') {
    const result = await updateOwnerBusinessHealthCheckWorkflow({ ...params, request: body, status: 'reviewed' });
    const actionId = await logOwnerBusinessAssistantAction({ ...params, operation: 'mark_reviewed', request: body, result });
    return { ...result, actionId: actionId || result.actionId, metrics: buildActionMetrics({ firestoreReadCount, firestoreWriteCount: actionId ? 1 : 0 }) };
  }

  if (body.operation === 'dismiss') {
    const result = await updateOwnerBusinessHealthCheckWorkflow({ ...params, request: body, status: 'dismissed' });
    const actionId = await logOwnerBusinessAssistantAction({ ...params, operation: 'dismiss', request: body, result });
    return { ...result, actionId: actionId || result.actionId, metrics: buildActionMetrics({ firestoreReadCount, firestoreWriteCount: actionId ? 1 : 0 }) };
  }

  if (body.operation === 'cancel') {
    const result = await updateOwnerBusinessHealthCheckWorkflow({ ...params, request: body, status: 'cancelled' });
    const actionId = await logOwnerBusinessAssistantAction({ ...params, operation: 'cancel', request: body, result });
    return { ...result, actionId: actionId || result.actionId, metrics: buildActionMetrics({ firestoreReadCount, firestoreWriteCount: actionId ? 1 : 0 }) };
  }

  return {
    success: false,
    status: 'blocked',
    message: 'This action needs to be completed in the existing MenuList screen.',
    metrics: buildActionMetrics({ firestoreReadCount }),
  };
}
