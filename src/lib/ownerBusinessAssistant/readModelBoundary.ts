import { z } from 'zod';
import type {
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessHealthCurrentDoc,
} from './types';

const finiteNumber = z.number().finite();
const nonNegativeInteger = finiteNumber.int().nonnegative();
const stringArray = z.array(z.string());
const unsupportedReasonSchema = z.enum(['not_available', 'not_enabled', 'insufficient_data']);

const sourceRefSchema = z.object({
  id: z.string(),
  source: z.string(),
  docId: z.string().optional(),
  generatedAt: z.string().optional(),
  freshnessLabel: z.string().optional(),
});

const healthBlockStatusSchema = z.enum([
  'stable',
  'watch',
  'needs_review',
  'insufficient_data',
  'not_enabled',
]);

const healthStatusSchema = z.enum([
  'stable',
  'watch',
  'needs_review',
  'insufficient_data',
  'stale',
  'not_ready',
]);

const healthBlockSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: healthBlockStatusSchema,
  message: z.string(),
  sourceFactIds: stringArray,
  actionType: z.string().optional(),
});

const healthCheckSchema = z.object({
  id: z.string(),
  title: z.string(),
  message: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  status: healthBlockStatusSchema,
  actionType: z.string().optional(),
  sourceFactIds: stringArray,
});

const healthQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  question: z.string(),
  intent: z.string(),
  domain: z.string(),
});

const analyticsTeaserValueSchema = z.object({
  label: z.string(),
  value: z.string(),
  deltaLabel: z.string().optional(),
  sourceFactId: z.string().optional(),
});

const feedbackPeriodSchema = z.object({
  key: z.string(),
  label: z.string(),
  rangeLabel: z.string(),
  totalCount: nonNegativeInteger,
  needsAttentionCount: nonNegativeInteger,
  sourceFactIds: stringArray,
});

const feedbackThemeSchema = z.object({
  key: z.enum([
    'wrong_price',
    'hours',
    'unavailable_item',
    'service',
    'quality',
    'cleanliness',
    'delivery',
    'payment',
    'other',
  ]),
  label: z.string(),
  count: nonNegativeInteger,
});

const feedbackItemSchema = z.object({
  feedbackId: z.string(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  rating: finiteNumber,
  source: z.enum(['menu_footer', 'feedback_qr', 'direct_link']).optional(),
  snippet: z.string().optional(),
  createdAt: z.string().optional(),
  localDate: z.string().optional(),
  sourceFactId: z.string(),
});

const feedbackProjectSchema = z.object({
  projectId: z.string(),
  projectName: z.string().optional(),
  totalCount: nonNegativeInteger,
  needsAttentionCount: nonNegativeInteger,
  latestFeedbackAt: z.string().optional(),
  sourceFactIds: stringArray,
});

const feedbackSummarySchema = z.object({
  version: z.literal(1),
  status: healthBlockStatusSchema,
  localDate: z.string(),
  generatedAt: z.string(),
  windowDays: nonNegativeInteger,
  sampledCount: nonNegativeInteger,
  truncated: z.boolean(),
  latestFeedbackAt: z.string().optional(),
  latestNeedsAttentionAt: z.string().optional(),
  periods: z.record(feedbackPeriodSchema),
  topThemes: z.array(feedbackThemeSchema),
  latestNeedsAttention: z.array(feedbackItemSchema),
  latestFeedback: z.array(feedbackItemSchema),
  projectBreakdown: z.record(feedbackProjectSchema),
  sourceFactIds: stringArray,
});

export const ownerBusinessHealthCurrentDocSchema = z.object({
  version: z.literal(1),
  tId: z.string(),
  sId: z.string(),
  localDate: z.string(),
  generatedAt: z.string(),
  validThrough: z.string().optional(),
  sourceWindow: z.object({
    today: z.string().optional(),
    lastSettledDate: z.string().optional(),
    last7Days: z.object({ start: z.string(), end: z.string() }).optional(),
    last30Days: z.object({ start: z.string(), end: z.string() }).optional(),
    timeZone: z.string().optional(),
  }),
  status: healthStatusSchema,
  summary: z.object({
    headline: z.string(),
    ownerMessage: z.string(),
    noActionNeeded: z.boolean(),
    actionCount: nonNegativeInteger,
  }),
  analyticsTeaser: z.object({
    today: analyticsTeaserValueSchema.optional(),
    thisWeek: analyticsTeaserValueSchema.optional(),
    topItem: analyticsTeaserValueSchema.optional(),
    analyticsIndexDocId: z.string(),
  }).optional(),
  feedbackSummary: feedbackSummarySchema.optional(),
  blocks: z.record(healthBlockSchema),
  suggestedChecks: z.array(healthCheckSchema),
  suggestedQuestions: z.array(healthQuestionSchema),
  supportedIntents: stringArray,
  supportedDomains: z.array(z.object({
    domain: z.string(),
    status: z.enum(['supported', 'summary_only', 'unsupported']),
    reason: z.string().optional(),
    sourceFactIds: stringArray,
  })).optional(),
  unsupportedData: z.record(unsupportedReasonSchema),
  sourceRefs: z.array(sourceRefSchema),
  cost: z.object({
    builderReadCount: nonNegativeInteger,
    builderWriteCount: nonNegativeInteger,
    chatHotPathReadCount: nonNegativeInteger,
  }),
});

export const ownerBusinessAnalyticsPeriodSchema = z.object({
  key: z.string(),
  label: z.string(),
  rangeLabel: z.string(),
  scope: z.enum(['store', 'project']).optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  indexedProjectCount: nonNegativeInteger.optional(),
  status: z.enum(['available', 'partial', 'not_available']),
  metrics: z.object({
    menuVisits: finiteNumber.optional(),
    itemClicks: finiteNumber.optional(),
    menuSessions: finiteNumber.optional(),
    engagedSessions: finiteNumber.optional(),
    actionSessions: finiteNumber.optional(),
    searches: finiteNumber.optional(),
    unavailableItemTaps: finiteNumber.optional(),
  }),
  topItems: z.array(z.object({
    itemId: z.string(),
    name: z.string().optional(),
    projectId: z.string().optional(),
    projectName: z.string().optional(),
    value: finiteNumber,
    signal: z.enum(['views', 'clicks', 'attention']),
  })).optional(),
  topCategories: z.array(z.object({
    categoryId: z.string(),
    name: z.string().optional(),
    projectId: z.string().optional(),
    projectName: z.string().optional(),
    value: finiteNumber,
  })).optional(),
  topSearches: z.array(z.object({
    term: z.string(),
    count: finiteNumber,
  })).optional(),
  sourceQuality: z.array(z.object({
    source: z.string(),
    visits: finiteNumber,
    actionRate: finiteNumber.optional(),
  })).optional(),
  freshnessLabel: z.string(),
  sourceFactIds: stringArray,
});

const projectAnalyticsSummarySchema = z.object({
  projectId: z.string(),
  projectName: z.string().optional(),
  isDefault: z.boolean().optional(),
  active: z.boolean().optional(),
  periods: z.record(ownerBusinessAnalyticsPeriodSchema),
  unsupportedPeriods: z.record(unsupportedReasonSchema),
  sourceRefs: z.array(sourceRefSchema),
});

export const ownerBusinessAnalyticsIndexDocSchema = z.object({
  version: z.literal(1),
  tId: z.string(),
  sId: z.string(),
  localDate: z.string(),
  generatedAt: z.string(),
  lastSettledLocalDate: z.string().optional(),
  projectScope: z.object({
    totalActiveProjects: nonNegativeInteger,
    indexedProjectCount: nonNegativeInteger,
    indexedProjectIds: stringArray,
    overflowProjectCount: nonNegativeInteger.optional(),
    defaultProjectId: z.string().optional(),
  }).optional(),
  periods: z.record(ownerBusinessAnalyticsPeriodSchema),
  projectSummaries: z.record(projectAnalyticsSummarySchema).optional(),
  unsupportedPeriods: z.record(unsupportedReasonSchema),
  sourceRefs: z.array(sourceRefSchema),
  cost: z.object({
    builderReadCount: nonNegativeInteger,
    hotPathReadCount: nonNegativeInteger,
  }),
});

export const ownerBusinessAnalyticsResponseDataSchema = ownerBusinessAnalyticsIndexDocSchema.pick({
  periods: true,
  unsupportedPeriods: true,
  sourceRefs: true,
  projectScope: true,
});

const hasExpectedIdentity = (
  value: { tId: string; sId: string },
  expected?: { tId: string | number; sId: string | number },
) => !expected || (
  value.tId === String(expected.tId)
  && value.sId === String(expected.sId)
);

const isOwnerBusinessHealthCurrentDoc = (
  value: unknown,
): value is OwnerBusinessHealthCurrentDoc => (
  ownerBusinessHealthCurrentDocSchema.safeParse(value).success
);

const isOwnerBusinessAnalyticsIndexDoc = (
  value: unknown,
): value is OwnerBusinessAnalyticsIndexDoc => (
  ownerBusinessAnalyticsIndexDocSchema.safeParse(value).success
);

export const parseOwnerBusinessHealthCurrentDoc = (
  value: unknown,
  expected?: { tId: string | number; sId: string | number },
): OwnerBusinessHealthCurrentDoc | null => {
  const parsed = ownerBusinessHealthCurrentDocSchema.safeParse(value);
  if (
    !parsed.success
    || !isOwnerBusinessHealthCurrentDoc(parsed.data)
    || !hasExpectedIdentity(parsed.data, expected)
  ) return null;
  return parsed.data;
};

export const parseOwnerBusinessAnalyticsIndexDoc = (
  value: unknown,
  expected?: { tId: string | number; sId: string | number },
): OwnerBusinessAnalyticsIndexDoc | null => {
  const parsed = ownerBusinessAnalyticsIndexDocSchema.safeParse(value);
  if (
    !parsed.success
    || !isOwnerBusinessAnalyticsIndexDoc(parsed.data)
    || !hasExpectedIdentity(parsed.data, expected)
  ) return null;
  return parsed.data;
};
