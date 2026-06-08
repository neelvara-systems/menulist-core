import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import type {
  OwnerBusinessAssistantActionOperation,
  OwnerBusinessAssistantActionResult,
} from '../types';
import type { OwnerBusinessAssistantActionRequest } from '../schemas';

const ACTION_AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

const shouldLogOwnerBusinessAssistantAction = (params: {
  operation: OwnerBusinessAssistantActionOperation;
  result: OwnerBusinessAssistantActionResult;
}) => {
  if (params.operation !== 'navigate') return true;
  return params.result.success !== true || params.result.status === 'blocked';
};

export async function logOwnerBusinessAssistantAction(params: {
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  operation: OwnerBusinessAssistantActionOperation;
  request: OwnerBusinessAssistantActionRequest;
  result: OwnerBusinessAssistantActionResult;
}): Promise<string | undefined> {
  if (!shouldLogOwnerBusinessAssistantAction(params)) return undefined;

  const actionId = params.result.actionId || randomUUID();
  await firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_ACTIONS).doc(actionId).set({
    id: actionId,
    tId: String(params.tId),
    sId: String(params.sId),
    userId: params.userId ? String(params.userId) : null,
    operation: params.operation,
    actionType: params.request.actionType,
    targetKind: params.request.targetKind || null,
    targetId: params.request.targetId || null,
    projectId: params.request.projectId || null,
    draftId: params.result.draftId || params.request.draftId || null,
    status: params.result.status,
    workflowStatus: ['reviewed', 'dismissed', 'cancelled'].includes(params.result.status)
      ? params.result.status
      : null,
    success: params.result.success,
    message: params.result.message,
    route: params.result.metrics?.route || '/api/owner-business-assistant/action',
    firestoreReadCount: params.result.metrics?.firestoreReadCount ?? null,
    firestoreWriteCount: params.result.metrics?.firestoreWriteCount ?? null,
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + ACTION_AUDIT_RETENTION_MS),
    source: 'owner_business_assistant',
  }, { merge: true });
  return actionId;
}
