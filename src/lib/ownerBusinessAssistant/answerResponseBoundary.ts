import { z } from 'zod';
import { isValidFirestoreDocumentId } from '@lib/firebase/firestoreDocumentId';
import {
  OWNER_BUSINESS_ASSISTANT_DOMAINS,
  OWNER_BUSINESS_ASSISTANT_INTENTS,
} from './constants';
import { normalizeOwnerBusinessAssistantThreadId } from './threadIdBoundary';
import type { OwnerBusinessAssistantAnswer } from './types';

const exactBoundedString = (maxLength: number) => z.string()
  .min(1)
  .max(maxLength)
  .refine((value) => value === value.trim(), 'Whitespace-normalized value required');

const sourceFactIdSchema = exactBoundedString(240);
const finiteNumberSchema = z.number().finite();

const ownerBusinessHealthQuestionSchema = z.object({
  id: exactBoundedString(120),
  label: exactBoundedString(120),
  question: exactBoundedString(240),
  intent: z.enum(OWNER_BUSINESS_ASSISTANT_INTENTS),
  domain: z.enum(OWNER_BUSINESS_ASSISTANT_DOMAINS),
}).strict();

const answerArtifactSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    body: z.string().max(2400),
  }).strict(),
  z.object({
    type: z.literal('metric_row'),
    metrics: z.array(z.object({
      label: exactBoundedString(120),
      value: z.string().max(240),
      deltaLabel: z.string().max(240).optional(),
    }).strict()).max(20),
  }).strict(),
  z.object({
    type: z.literal('compact_table'),
    columns: z.array(exactBoundedString(120)).min(1).max(12),
    rows: z.array(z.array(z.string().max(500)).max(12)).max(20),
    maxRows: z.number().int().min(0).max(20),
  }).strict(),
  z.object({
    type: z.literal('trend_series'),
    label: exactBoundedString(120),
    points: z.array(z.object({
      label: exactBoundedString(120),
      value: finiteNumberSchema,
    }).strict()).max(100),
  }).strict(),
]);

const routeMetricsSchema = z.object({
  route: z.string().max(240).optional(),
  packetProfile: z.enum([
    'health_card',
    'analytics_periods',
    'owner_question_basic',
    'multi_location_summary',
    'dashboard',
    'page',
    'answer',
  ]).optional(),
  cacheSource: z.enum(['browser', 'server', 'fresh_firestore']),
  firestoreReadCount: z.number().int().min(0),
  firestoreWriteCount: z.number().int().min(0),
  packetAgeMinutes: z.number().int().min(0).optional(),
  packetValidUntil: z.string().max(80).optional(),
  sourceFactCount: z.number().int().min(0).optional(),
  providerUsed: z.boolean().optional(),
  answerEventWritten: z.boolean().optional(),
  threadWritten: z.boolean().optional(),
  unsupportedReason: z.string().max(160).optional(),
  domainCoverage: z.array(z.object({
    domain: z.enum(OWNER_BUSINESS_ASSISTANT_DOMAINS),
    status: z.enum(['supported', 'summary_only', 'unsupported']),
    reason: z.string().max(500).optional(),
  }).strict()).max(OWNER_BUSINESS_ASSISTANT_DOMAINS.length).optional(),
}).strict();

const ownerBusinessAssistantAnswerSchema = z.object({
  answerId: exactBoundedString(180)
    .refine(isValidFirestoreDocumentId, 'Invalid answer ID'),
  threadId: z.string()
    .refine((value) => normalizeOwnerBusinessAssistantThreadId(value) === value, 'Invalid thread ID')
    .optional(),
  status: z.enum(['answered', 'needs_more_data', 'unsupported']),
  text: z.string().min(1).max(2400),
  freshnessLabel: z.string().min(1).max(500),
  sourceFactIds: z.array(sourceFactIdSchema).max(100)
    .refine((values) => new Set(values).size === values.length, 'Duplicate source fact ID'),
  artifacts: z.array(answerArtifactSchema).max(20).optional(),
  suggestedQuestions: z.array(ownerBusinessHealthQuestionSchema).max(3).optional(),
  confidence: z.enum(['high', 'medium', 'low']),
  cache: z.object({
    source: z.enum(['browser', 'server', 'fresh_firestore']),
    cacheKey: z.string().max(500).optional(),
    generatedAt: z.string().max(80).optional(),
  }).strict().optional(),
  metrics: routeMetricsSchema.optional(),
}).strict();

const ownerBusinessAssistantAnswerResponseSchema = z.object({
  data: ownerBusinessAssistantAnswerSchema,
}).strict();

export type OwnerBusinessAssistantAnswerResponse = {
  data: OwnerBusinessAssistantAnswer;
};

export const projectOwnerBusinessAssistantAnswerResponse = (
  value: unknown,
): OwnerBusinessAssistantAnswerResponse | null => {
  const parsed = ownerBusinessAssistantAnswerResponseSchema.safeParse(value);
  return parsed.success
    ? parsed.data as OwnerBusinessAssistantAnswerResponse
    : null;
};
