import type { OwnerBusinessAssistantFeedbackRequest } from './schemas';

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
