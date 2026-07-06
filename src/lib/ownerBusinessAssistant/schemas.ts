import { z } from 'zod';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import { normalizeOwnerBusinessAssistantProjectId } from './projectIdBoundary';
import { normalizeOwnerBusinessAssistantThreadId } from './threadIdBoundary';

const OwnerBusinessAssistantProjectIdSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'string') return value;
  return value;
}, z.string()
  .refine((value) => normalizeOwnerBusinessAssistantProjectId(value) === value, 'Invalid project ID')
  .optional());

const OwnerBusinessAssistantStoreIdSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}, z.string().min(1).max(80).regex(/^\d+$/).optional());

export const OwnerBusinessAssistantScopeSchema = z.object({
  projectId: OwnerBusinessAssistantProjectIdSchema,
  storeId: OwnerBusinessAssistantStoreIdSchema,
  packetProfile: z.enum([
    'health_card',
    'analytics_periods',
    'owner_question_basic',
    'multi_location_summary',
    'dashboard',
    'page',
    'answer',
  ]).optional(),
});

export const OwnerBusinessAssistantClientContextSchema = z.object({
  currentRoute: z.string().max(240).optional(),
  mobileTab: z.enum(['today', 'menu', 'share', 'more']).optional(),
  selectedProjectId: OwnerBusinessAssistantProjectIdSchema,
  selectedItemId: z.string().max(160).optional(),
  selectedCategoryId: z.string().max(160).optional(),
  selectedOutletId: z.string().max(160).optional(),
  visibleEntityRefs: z.array(z.object({
    kind: z.enum(['project', 'menu_item', 'category', 'store', 'screen', 'feedback', 'review']),
    id: z.string().max(160),
    label: z.string().max(180),
  })).max(20).optional(),
}).strict();

const OwnerBusinessAssistantThreadIdSchema = z.string()
  .refine((value) => normalizeOwnerBusinessAssistantThreadId(value) === value);

const OwnerBusinessAssistantAnswerIdSchema = z.string()
  .min(1)
  .max(180)
  .refine((value) => value === value.trim() && isValidFirestoreDocumentId(value), 'Invalid answer ID');

export const OwnerBusinessAssistantAnswerRequestSchema = z.object({
  question: z.string().min(1).max(800),
  projectId: OwnerBusinessAssistantProjectIdSchema,
  storeId: OwnerBusinessAssistantStoreIdSchema,
  packetSignature: z.string().max(240).optional(),
  clientContext: OwnerBusinessAssistantClientContextSchema.optional(),
  suggestedQuestionId: z.string().max(120).optional(),
  threadId: OwnerBusinessAssistantThreadIdSchema.optional(),
}).strict();

export const OwnerBusinessAssistantFeedbackRequestSchema = z.object({
  answerId: OwnerBusinessAssistantAnswerIdSchema,
  storeId: OwnerBusinessAssistantStoreIdSchema,
  rating: z.enum(['helpful', 'not_helpful']),
  reason: z.string().max(800).optional(),
  question: z.string().max(800).optional(),
}).strict();

export const OwnerBusinessAssistantThreadParamsSchema = z.object({
  threadId: OwnerBusinessAssistantThreadIdSchema,
});

export type OwnerBusinessAssistantAnswerRequest = z.infer<typeof OwnerBusinessAssistantAnswerRequestSchema>;
export type OwnerBusinessAssistantFeedbackRequest = z.infer<typeof OwnerBusinessAssistantFeedbackRequestSchema>;
