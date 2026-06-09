import { z } from 'zod';

const OwnerBusinessAssistantStoreIdSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}, z.string().min(1).max(80).regex(/^\d+$/).optional());

export const OwnerBusinessAssistantScopeSchema = z.object({
  projectId: z.string().min(1).max(160).optional(),
  storeId: OwnerBusinessAssistantStoreIdSchema,
  packetProfile: z.enum([
    'health_card',
    'analytics_periods',
    'owner_question_basic',
    'owner_question_actionable',
    'multi_location_summary',
    'dashboard',
    'page',
    'answer',
  ]).optional(),
});

export const OwnerBusinessAssistantClientContextSchema = z.object({
  currentRoute: z.string().max(240).optional(),
  mobileTab: z.enum(['today', 'menu', 'share', 'more']).optional(),
  selectedProjectId: z.string().max(160).optional(),
  selectedItemId: z.string().max(160).optional(),
  selectedCategoryId: z.string().max(160).optional(),
  selectedOutletId: z.string().max(160).optional(),
  visibleEntityRefs: z.array(z.object({
    kind: z.enum(['project', 'menu_item', 'category', 'store', 'screen', 'feedback', 'review']),
    id: z.string().max(160),
    label: z.string().max(180),
  })).max(20).optional(),
}).strict();

const OwnerBusinessAssistantThreadIdSchema = z.string().min(1).max(160).regex(/^[A-Za-z0-9_-]+$/);
const OwnerBusinessAssistantActionTargetKindSchema = z.enum([
  'project',
  'menu_item',
  'category',
  'store',
  'media',
  'feedback',
  'review',
  'outlet',
  'billing',
  'domain',
  'screen',
  'customer_app',
  'qr',
  'pos',
  'team',
  'compliance',
]);

export const OwnerBusinessAssistantAnswerRequestSchema = z.object({
  question: z.string().min(1).max(800),
  projectId: z.string().min(1).max(160).optional(),
  storeId: OwnerBusinessAssistantStoreIdSchema,
  packetSignature: z.string().max(240).optional(),
  clientContext: OwnerBusinessAssistantClientContextSchema.optional(),
  suggestedQuestionId: z.string().max(120).optional(),
  threadId: OwnerBusinessAssistantThreadIdSchema.optional(),
}).strict();

export const OwnerBusinessAssistantActionRequestSchema = z.object({
  operation: z.enum(['navigate', 'prepare', 'confirm', 'cancel', 'mark_reviewed', 'dismiss', 'assign']),
  actionType: z.string().min(1).max(120),
  projectId: z.string().min(1).max(160).optional(),
  storeId: OwnerBusinessAssistantStoreIdSchema,
  targetKind: OwnerBusinessAssistantActionTargetKindSchema.optional(),
  targetId: z.string().max(180).optional(),
  draftId: z.string().max(180).optional(),
  actionId: z.string().max(180).optional(),
  payload: z.record(z.unknown()).optional(),
  clientContext: OwnerBusinessAssistantClientContextSchema.optional(),
}).strict();

export const OwnerBusinessAssistantFeedbackRequestSchema = z.object({
  answerId: z.string().min(1).max(180),
  storeId: OwnerBusinessAssistantStoreIdSchema,
  rating: z.enum(['helpful', 'not_helpful']),
  reason: z.string().max(800).optional(),
  question: z.string().max(800).optional(),
}).strict();

export const OwnerBusinessAssistantThreadParamsSchema = z.object({
  threadId: OwnerBusinessAssistantThreadIdSchema,
});

export type OwnerBusinessAssistantAnswerRequest = z.infer<typeof OwnerBusinessAssistantAnswerRequestSchema>;
export type OwnerBusinessAssistantActionRequest = z.infer<typeof OwnerBusinessAssistantActionRequestSchema>;
export type OwnerBusinessAssistantFeedbackRequest = z.infer<typeof OwnerBusinessAssistantFeedbackRequestSchema>;
