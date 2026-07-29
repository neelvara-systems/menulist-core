import { OWNER_BUSINESS_HEALTH_STATUS_LABELS } from './constants';
import {
  ownerBusinessAnalyticsResponseDataSchema,
  ownerBusinessHealthCurrentDocSchema,
} from './readModelBoundary';
import type {
  OwnerBusinessAssistantAnswer,
  OwnerBusinessAnalyticsIndexDoc,
  OwnerBusinessHealthCurrentDoc,
  OwnerBusinessHealthQuestion,
  OwnerBusinessMultiLocationStoreSummary,
} from './types';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const OWNER_BUSINESS_ASSISTANT_READ_MODEL_RESPONSE_JSON_MAX_BYTES = 256 * 1024;
export const OWNER_BUSINESS_ASSISTANT_MUTATION_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
export const OWNER_BUSINESS_ASSISTANT_REQUEST_POLICY = {
  cache: 'no-store' as RequestCache,
  credentials: 'same-origin' as RequestCredentials,
  redirect: 'manual' as RequestRedirect,
};

type RuntimeLogContext = Record<string, boolean | number | string | null | undefined>;

type ReadModelCache = {
  source?: string;
  cacheKey?: string;
  generatedAt?: string;
  metrics?: Record<string, unknown>;
};

export type OwnerBusinessAssistantCurrentResponse = {
  data: OwnerBusinessHealthCurrentDoc;
  cache?: ReadModelCache;
};

export type OwnerBusinessAssistantAnalyticsResponse = {
  data: Pick<OwnerBusinessAnalyticsIndexDoc, 'periods' | 'unsupportedPeriods' | 'sourceRefs' | 'projectScope'> | null;
  cache?: ReadModelCache;
};

export type OwnerBusinessAssistantLocationsResponse = {
  data: {
    generatedAt?: string | null;
    stores: OwnerBusinessMultiLocationStoreSummary[];
  };
  cache?: ReadModelCache;
};

export type OwnerBusinessAssistantThreadMessage = {
  id?: string;
  role?: string;
  content?: string;
  answerId?: string;
  confidence?: OwnerBusinessAssistantAnswer['confidence'];
  createdAt?: string;
  freshnessLabel?: string;
  suggestedQuestions?: OwnerBusinessHealthQuestion[];
  [key: string]: unknown;
};

export type OwnerBusinessAssistantThreadResponse = {
  data: {
    thread: Record<string, unknown> | null;
    messages: OwnerBusinessAssistantThreadMessage[];
  };
};

export type OwnerBusinessAssistantMonitorEvent = {
  id: string;
  answerId: string;
  tId: string;
  sId: string;
  intent: string;
  question: string;
  answerText: string;
  status: string;
  confidence: string;
  cacheSource?: string | null;
  packetProfile?: string | null;
  packetAgeMinutes?: number | null;
  firestoreReadCount?: number | null;
  firestoreWriteCount?: number | null;
  threadWritten?: boolean;
  unsupportedReason?: string | null;
  providerUsed: boolean;
  unitsConsumed: number;
  realCostPaise: number;
  ownerChargePaise: number;
  createdAt?: string | null;
};

export type OwnerBusinessAssistantMonitorData = {
  summary: {
    total: number;
    answered: number;
    needsMoreData: number;
    unsupported: number;
    providerCalls: number;
    serverCacheHits: number;
    freshFirestorePackets: number;
    avgFirestoreReads: number;
    maxFirestoreReads: number;
    threadWrites: number;
    unitsConsumed: number;
    realCostPaise: number;
    ownerChargePaise: number;
    byIntent: Record<string, number>;
    byStatus: Record<string, number>;
    sourceCoverage: Array<{
      domain: string;
      status: string;
      reason?: string | null;
      eventCount: number;
      supportedCount: number;
      summaryOnlyCount: number;
      unsupportedCount: number;
    }>;
  };
  events: OwnerBusinessAssistantMonitorEvent[];
  recentFeedback: Array<{
    id: string;
    answerId?: string | null;
    rating: string;
    reason?: string | null;
    createdAt?: string | null;
  }>;
  generatedAt: string;
};

export type OwnerBusinessAssistantMonitorResponse = {
  data: OwnerBusinessAssistantMonitorData;
};

export type OwnerBusinessAssistantFeedbackResponse = {
  data: {
    success: true;
  };
};

const OWNER_BUSINESS_ASSISTANT_READ_MODEL_FAILURE_CODES = {
  current: {
    rejected: 'owner_business_assistant_current_response_rejected',
    parseFailed: 'owner_business_assistant_current_response_parse_failed',
    invalid: 'owner_business_assistant_current_response_invalid',
  },
  analytics: {
    rejected: 'owner_business_assistant_analytics_response_rejected',
    parseFailed: 'owner_business_assistant_analytics_response_parse_failed',
    invalid: 'owner_business_assistant_analytics_response_invalid',
  },
  locations: {
    rejected: 'owner_business_assistant_locations_response_rejected',
    parseFailed: 'owner_business_assistant_locations_response_parse_failed',
    invalid: 'owner_business_assistant_locations_response_invalid',
  },
  thread: {
    rejected: 'owner_business_assistant_thread_response_rejected',
    parseFailed: 'owner_business_assistant_thread_response_parse_failed',
    invalid: 'owner_business_assistant_thread_response_invalid',
  },
  monitor: {
    rejected: 'owner_business_assistant_monitor_response_rejected',
    parseFailed: 'owner_business_assistant_monitor_response_parse_failed',
    invalid: 'owner_business_assistant_monitor_response_invalid',
  },
} as const;

type OwnerBusinessAssistantReadModelKind = keyof typeof OWNER_BUSINESS_ASSISTANT_READ_MODEL_FAILURE_CODES;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isStringArray = (value: unknown): value is string[] => (
  Array.isArray(value) && value.every((entry) => typeof entry === 'string')
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isNullableString = (value: unknown): value is string | null => (
  value === null || typeof value === 'string'
);

const isOptionalNullableString = (value: unknown): value is string | null | undefined => (
  value === undefined || isNullableString(value)
);

const isOptionalNullableNumber = (value: unknown): value is number | null | undefined => (
  value === undefined || value === null || isFiniteNumber(value)
);

const isNumberMap = (value: unknown): value is Record<string, number> => (
  isRecord(value) && Object.values(value).every(isFiniteNumber)
);

const isOwnerBusinessHealthStatus = (value: unknown) => (
  typeof value === 'string'
  && Object.prototype.hasOwnProperty.call(OWNER_BUSINESS_HEALTH_STATUS_LABELS, value)
);

const isCacheMetadata = (value: unknown): value is ReadModelCache => (
  value === undefined || isRecord(value)
);

const isOwnerBusinessHealthCurrentDoc = (value: unknown): value is OwnerBusinessHealthCurrentDoc => {
  return ownerBusinessHealthCurrentDocSchema.safeParse(value).success;
};

const isOwnerBusinessAnalyticsData = (
  value: unknown,
): value is OwnerBusinessAssistantAnalyticsResponse['data'] => {
  if (value === null) return true;
  return ownerBusinessAnalyticsResponseDataSchema.safeParse(value).success;
};

const isOwnerBusinessMultiLocationStoreSummary = (
  value: unknown,
): value is OwnerBusinessMultiLocationStoreSummary => {
  if (!isRecord(value)) return false;
  return typeof value.sId === 'string'
    && isOwnerBusinessHealthStatus(value.status)
    && typeof value.actionCount === 'number'
    && Number.isFinite(value.actionCount)
    && typeof value.lastCheckedAt === 'string'
    && typeof value.localDate === 'string'
    && isStringArray(value.sourceFactIds);
};

const isOwnerBusinessAssistantCurrentResponse = (
  value: unknown,
): value is OwnerBusinessAssistantCurrentResponse => (
  isRecord(value)
  && isOwnerBusinessHealthCurrentDoc(value.data)
  && isCacheMetadata(value.cache)
);

const isOwnerBusinessAssistantAnalyticsResponse = (
  value: unknown,
): value is OwnerBusinessAssistantAnalyticsResponse => (
  isRecord(value)
  && isOwnerBusinessAnalyticsData(value.data)
  && isCacheMetadata(value.cache)
);

const isOwnerBusinessAssistantLocationsResponse = (
  value: unknown,
): value is OwnerBusinessAssistantLocationsResponse => (
  isRecord(value)
  && isRecord(value.data)
  && (value.data.generatedAt === undefined || value.data.generatedAt === null || typeof value.data.generatedAt === 'string')
  && Array.isArray(value.data.stores)
  && value.data.stores.every(isOwnerBusinessMultiLocationStoreSummary)
  && isCacheMetadata(value.cache)
);

const isOwnerBusinessAssistantThreadResponse = (
  value: unknown,
): value is OwnerBusinessAssistantThreadResponse => (
  isRecord(value)
  && isRecord(value.data)
  && (value.data.thread === null || isRecord(value.data.thread))
  && Array.isArray(value.data.messages)
  && value.data.messages.every(isRecord)
);

const isOwnerBusinessAssistantMonitorSourceCoverage = (
  value: unknown,
): value is OwnerBusinessAssistantMonitorData['summary']['sourceCoverage'][number] => (
  isRecord(value)
  && typeof value.domain === 'string'
  && typeof value.status === 'string'
  && isOptionalNullableString(value.reason)
  && isFiniteNumber(value.eventCount)
  && isFiniteNumber(value.supportedCount)
  && isFiniteNumber(value.summaryOnlyCount)
  && isFiniteNumber(value.unsupportedCount)
);

const isOwnerBusinessAssistantMonitorSummary = (
  value: unknown,
): value is OwnerBusinessAssistantMonitorData['summary'] => (
  isRecord(value)
  && isFiniteNumber(value.total)
  && isFiniteNumber(value.answered)
  && isFiniteNumber(value.needsMoreData)
  && isFiniteNumber(value.unsupported)
  && isFiniteNumber(value.providerCalls)
  && isFiniteNumber(value.serverCacheHits)
  && isFiniteNumber(value.freshFirestorePackets)
  && isFiniteNumber(value.avgFirestoreReads)
  && isFiniteNumber(value.maxFirestoreReads)
  && isFiniteNumber(value.threadWrites)
  && isFiniteNumber(value.unitsConsumed)
  && isFiniteNumber(value.realCostPaise)
  && isFiniteNumber(value.ownerChargePaise)
  && isNumberMap(value.byIntent)
  && isNumberMap(value.byStatus)
  && Array.isArray(value.sourceCoverage)
  && value.sourceCoverage.every(isOwnerBusinessAssistantMonitorSourceCoverage)
);

const isOwnerBusinessAssistantMonitorEvent = (
  value: unknown,
): value is OwnerBusinessAssistantMonitorEvent => (
  isRecord(value)
  && typeof value.id === 'string'
  && typeof value.answerId === 'string'
  && typeof value.tId === 'string'
  && typeof value.sId === 'string'
  && typeof value.intent === 'string'
  && typeof value.question === 'string'
  && typeof value.answerText === 'string'
  && typeof value.status === 'string'
  && typeof value.confidence === 'string'
  && isOptionalNullableString(value.cacheSource)
  && isOptionalNullableString(value.packetProfile)
  && isOptionalNullableNumber(value.packetAgeMinutes)
  && isOptionalNullableNumber(value.firestoreReadCount)
  && isOptionalNullableNumber(value.firestoreWriteCount)
  && (value.threadWritten === undefined || typeof value.threadWritten === 'boolean')
  && isOptionalNullableString(value.unsupportedReason)
  && typeof value.providerUsed === 'boolean'
  && isFiniteNumber(value.unitsConsumed)
  && isFiniteNumber(value.realCostPaise)
  && isFiniteNumber(value.ownerChargePaise)
  && isOptionalNullableString(value.createdAt)
);

const isOwnerBusinessAssistantMonitorFeedback = (
  value: unknown,
): value is OwnerBusinessAssistantMonitorData['recentFeedback'][number] => (
  isRecord(value)
  && typeof value.id === 'string'
  && isOptionalNullableString(value.answerId)
  && typeof value.rating === 'string'
  && isOptionalNullableString(value.reason)
  && isOptionalNullableString(value.createdAt)
);

const isOwnerBusinessAssistantMonitorResponse = (
  value: unknown,
): value is OwnerBusinessAssistantMonitorResponse => (
  isRecord(value)
  && isRecord(value.data)
  && isOwnerBusinessAssistantMonitorSummary(value.data.summary)
  && Array.isArray(value.data.events)
  && value.data.events.every(isOwnerBusinessAssistantMonitorEvent)
  && Array.isArray(value.data.recentFeedback)
  && value.data.recentFeedback.every(isOwnerBusinessAssistantMonitorFeedback)
  && typeof value.data.generatedAt === 'string'
);

const isOwnerBusinessAssistantFeedbackResponse = (
  value: unknown,
): value is OwnerBusinessAssistantFeedbackResponse => (
  isRecord(value)
  && isRecord(value.data)
  && value.data.success === true
);

export const projectOwnerBusinessAssistantCurrentResponse = (
  value: unknown,
): OwnerBusinessAssistantCurrentResponse | null => (
  isOwnerBusinessAssistantCurrentResponse(value) ? value : null
);

export const projectOwnerBusinessAssistantAnalyticsResponse = (
  value: unknown,
): OwnerBusinessAssistantAnalyticsResponse | null => (
  isOwnerBusinessAssistantAnalyticsResponse(value) ? value : null
);

export const projectOwnerBusinessAssistantLocationsResponse = (
  value: unknown,
): OwnerBusinessAssistantLocationsResponse | null => (
  isOwnerBusinessAssistantLocationsResponse(value) ? value : null
);

const getReadModelLogContext = (
  kind: OwnerBusinessAssistantReadModelKind,
  response: Response,
  context: RuntimeLogContext = {},
): RuntimeLogContext => ({
  ...context,
  ...getBoundedRuntimeStringContext('responseKind', kind),
  responseOk: response.ok,
  responseStatus: response.status,
  maxBytes: OWNER_BUSINESS_ASSISTANT_READ_MODEL_RESPONSE_JSON_MAX_BYTES,
});

const readValidatedOwnerBusinessAssistantResponse = async <T>(
  response: Response,
  kind: OwnerBusinessAssistantReadModelKind,
  isValid: (value: unknown) => value is T,
  context?: RuntimeLogContext,
): Promise<T | null> => {
  const failureCodes = OWNER_BUSINESS_ASSISTANT_READ_MODEL_FAILURE_CODES[kind];
  const logContext = getReadModelLogContext(kind, response, context);

  if (!response.ok) {
    logRuntimeFailure(failureCodes.rejected, new Error(failureCodes.rejected), logContext);
    return null;
  }

  let payload: unknown = null;
  try {
    payload = await readJsonResponseWithLimit<unknown>(
      response,
      OWNER_BUSINESS_ASSISTANT_READ_MODEL_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure(failureCodes.parseFailed, error, logContext);
    return null;
  }

  if (!isValid(payload)) {
    logRuntimeFailure(failureCodes.invalid, new Error(failureCodes.invalid), logContext);
    return null;
  }

  return payload;
};

export const readOwnerBusinessAssistantFeedbackResponse = async (
  response: Response,
  context: RuntimeLogContext = {},
): Promise<OwnerBusinessAssistantFeedbackResponse | null> => {
  const logContext: RuntimeLogContext = {
    ...context,
    ...getBoundedRuntimeStringContext('responseKind', 'feedback'),
    responseOk: response.ok,
    responseStatus: response.status,
    maxBytes: OWNER_BUSINESS_ASSISTANT_MUTATION_RESPONSE_JSON_MAX_BYTES,
  };

  if (!response.ok) {
    logRuntimeFailure(
      'owner_business_assistant_feedback_response_rejected',
      new Error('owner_business_assistant_feedback_response_rejected'),
      logContext,
    );
    return null;
  }

  let payload: unknown = null;
  try {
    payload = await readJsonResponseWithLimit<unknown>(
      response,
      OWNER_BUSINESS_ASSISTANT_MUTATION_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure('owner_business_assistant_feedback_response_parse_failed', error, logContext);
    return null;
  }

  if (!isOwnerBusinessAssistantFeedbackResponse(payload)) {
    logRuntimeFailure(
      'owner_business_assistant_feedback_response_invalid',
      new Error('owner_business_assistant_feedback_response_invalid'),
      logContext,
    );
    return null;
  }

  return payload;
};

export const readOwnerBusinessAssistantCurrentResponse = (
  response: Response,
  context?: RuntimeLogContext,
): Promise<OwnerBusinessAssistantCurrentResponse | null> => (
  readValidatedOwnerBusinessAssistantResponse(
    response,
    'current',
    isOwnerBusinessAssistantCurrentResponse,
    context,
  )
);

export const readOwnerBusinessAssistantAnalyticsResponse = (
  response: Response,
  context?: RuntimeLogContext,
): Promise<OwnerBusinessAssistantAnalyticsResponse | null> => (
  readValidatedOwnerBusinessAssistantResponse(
    response,
    'analytics',
    isOwnerBusinessAssistantAnalyticsResponse,
    context,
  )
);

export const readOwnerBusinessAssistantLocationsResponse = (
  response: Response,
  context?: RuntimeLogContext,
): Promise<OwnerBusinessAssistantLocationsResponse | null> => (
  readValidatedOwnerBusinessAssistantResponse(
    response,
    'locations',
    isOwnerBusinessAssistantLocationsResponse,
    context,
  )
);

export const readOwnerBusinessAssistantThreadResponse = (
  response: Response,
  context?: RuntimeLogContext,
): Promise<OwnerBusinessAssistantThreadResponse | null> => (
  readValidatedOwnerBusinessAssistantResponse(
    response,
    'thread',
    isOwnerBusinessAssistantThreadResponse,
    context,
  )
);

export const readOwnerBusinessAssistantMonitorResponse = (
  response: Response,
  context?: RuntimeLogContext,
): Promise<OwnerBusinessAssistantMonitorResponse | null> => (
  readValidatedOwnerBusinessAssistantResponse(
    response,
    'monitor',
    isOwnerBusinessAssistantMonitorResponse,
    context,
  )
);
