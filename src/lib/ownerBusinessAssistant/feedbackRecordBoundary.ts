import { createHash } from 'node:crypto';
import type { OwnerBusinessAssistantFeedbackRequest } from './schemas';

const normalizeFeedbackIdentity = (value: string | number): string | null => {
  const normalized = String(value);
  return normalized
    && normalized === normalized.trim()
    && normalized.length <= 256
    ? normalized
    : null;
};

export function buildOwnerBusinessAssistantFeedbackDocumentId(params: {
  answerId: string;
  storeId: string | number;
  tenantId: string | number;
  userId: string | number;
}): string | null {
  const answerId = normalizeFeedbackIdentity(params.answerId);
  const storeId = normalizeFeedbackIdentity(params.storeId);
  const tenantId = normalizeFeedbackIdentity(params.tenantId);
  const userId = normalizeFeedbackIdentity(params.userId);
  if (!answerId || !storeId || !tenantId || !userId) return null;

  const identityHash = createHash('sha256')
    .update(JSON.stringify([tenantId, storeId, answerId, userId]))
    .digest('hex');
  return `v2_${identityHash}`;
}

export type OwnerBusinessAssistantFeedbackRecord<TTimestamp> = {
  answerId: string;
  createdAt: TTimestamp;
  expiresAt: TTimestamp;
  question?: string;
  rating: OwnerBusinessAssistantFeedbackRequest['rating'];
  reason?: string;
  sId: string;
  source: 'owner_business_assistant';
  tId: string;
  userId: string;
};

export function buildOwnerBusinessAssistantFeedbackRecord<TTimestamp>(params: {
  createdAt: TTimestamp;
  expiresAt: TTimestamp;
  feedback: OwnerBusinessAssistantFeedbackRequest;
  storeId: string | number;
  tenantId: string | number;
  userId: string;
}): OwnerBusinessAssistantFeedbackRecord<TTimestamp> {
  return {
    answerId: params.feedback.answerId,
    createdAt: params.createdAt,
    expiresAt: params.expiresAt,
    ...(params.feedback.question ? { question: params.feedback.question } : {}),
    rating: params.feedback.rating,
    ...(params.feedback.reason ? { reason: params.feedback.reason } : {}),
    sId: String(params.storeId),
    source: 'owner_business_assistant',
    tId: String(params.tenantId),
    userId: params.userId,
  };
}
