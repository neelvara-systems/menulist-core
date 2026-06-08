import { randomUUID } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '@constant/database';
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import type { OwnerBusinessActionDefinition } from '../types';
import type { OwnerBusinessAssistantActionRequest } from '../schemas';
import { resolveOwnerBusinessAssistantTarget } from './actionTargetResolver';

export async function prepareOwnerBusinessAssistantDraft(params: {
  tId: string | number;
  sId: string | number;
  userId?: string | number;
  definition: OwnerBusinessActionDefinition;
  request: OwnerBusinessAssistantActionRequest;
}) {
  const draftId = randomUUID();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const target = resolveOwnerBusinessAssistantTarget(params);

  await firestoreAdmin.collection(DB_COLLECTIONS.OWNER_BUSINESS_ASSISTANT_DRAFTS).doc(draftId).set({
    id: draftId,
    tId: String(params.tId),
    sId: String(params.sId),
    projectId: params.request.projectId || null,
    actionType: params.definition.actionType,
    draftSchema: params.definition.draftSchema || null,
    target,
    payload: params.request.payload || {},
    status: 'prepared',
    createdBy: params.userId ? String(params.userId) : null,
    createdAt: now,
    expiresAt,
    source: 'owner_business_assistant',
  });

  return draftId;
}
