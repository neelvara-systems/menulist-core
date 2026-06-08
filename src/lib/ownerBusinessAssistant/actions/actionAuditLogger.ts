import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import type {
  OwnerBusinessAssistantActionOperation,
  OwnerBusinessAssistantActionResult,
} from '../types';
import type { OwnerBusinessAssistantActionRequest } from '../schemas';

export async function logOwnerBusinessAssistantAction(params: {
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  operation: OwnerBusinessAssistantActionOperation;
  request: OwnerBusinessAssistantActionRequest;
  result: OwnerBusinessAssistantActionResult;
}) {
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
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 180 * 24 * 60 * 60 * 1000),
    source: 'owner_business_assistant',
  }, { merge: true });
  return actionId;
}
