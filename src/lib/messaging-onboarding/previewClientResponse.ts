import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
  isMessagingPreviewViewableState,
  normalizeMessagingPreviewCounter,
  normalizeMessagingPreviewMenuData,
  normalizeMessagingPreviewPublishedResult,
  normalizeMessagingPreviewScore,
  type MessagingPreviewMenuData,
  type MessagingPreviewPublishedResult,
  type MessagingPreviewViewableState,
} from './previewResponseBoundary';

export type {
  MessagingPreviewLocalizedText,
  MessagingPreviewPublishedResult,
} from './previewResponseBoundary';

export const MESSAGING_PREVIEW_RESPONSE_JSON_MAX_BYTES = 2 * 1024 * 1024;

export type MessagingPreviewData = {
  address: string;
  businessCategory: string;
  businessName: string;
  businessType: string;
  correctionCount: number;
  maxCorrections: number;
  menuData?: MessagingPreviewMenuData;
  phone: string;
  publishedResult?: MessagingPreviewPublishedResult | null;
  qualityScore?: number | null;
  sessionId: string;
  state: MessagingPreviewViewableState;
};

export type MessagingPreviewApproveResponse = {
  publishedResult: MessagingPreviewPublishedResult;
  success: true;
};

export type MessagingPreviewFixResponse = {
  correctionNumber: number;
  maxCorrections: number;
  message: string;
  success: true;
};

type MessagingPreviewResponseKind = 'preview_load' | 'approve' | 'fix';
type MessagingPreviewResponseLogContext = Record<string, boolean | number | string | undefined>;
class MessagingPreviewClientError extends Error {
  code?: string;
  maxReached?: boolean;
  retryAfter?: number;
  status?: number;

  constructor() {
    super('Messaging preview request failed');
    this.name = 'MessagingPreviewClientError';
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeClientString = (value: unknown, maxLength: number): string | null => (
  typeof value === 'string' && value.length <= maxLength && !value.includes('\0')
    ? value
    : null
);

const normalizeApproveResponse = (
  payload: unknown,
): MessagingPreviewApproveResponse | null => {
  if (!isRecord(payload)) return null;
  const publishedResult = normalizeMessagingPreviewPublishedResult(payload.publishedResult);
  return payload.success === true && publishedResult
    ? { publishedResult, success: true }
    : null;
};

const normalizeFixResponse = (
  payload: unknown,
): MessagingPreviewFixResponse | null => {
  if (!isRecord(payload)) return null;
  const correctionNumber = normalizeMessagingPreviewCounter(payload.correctionNumber);
  const maxCorrections = normalizeMessagingPreviewCounter(payload.maxCorrections);
  const message = normalizeClientString(payload.message, 500);
  return payload.success === true
    && correctionNumber !== null
    && maxCorrections !== null
    && message !== null
    ? { correctionNumber, maxCorrections, message, success: true }
    : null;
};

const normalizePreviewData = (payload: unknown): MessagingPreviewData | null => {
  if (!isRecord(payload)) return null;
  const sessionId = normalizeClientString(payload.sessionId, 160);
  const businessName = normalizeClientString(payload.businessName, 100);
  const businessType = normalizeClientString(payload.businessType, 50);
  const businessCategory = normalizeClientString(payload.businessCategory, 160);
  const phone = normalizeClientString(payload.phone, 80);
  const address = normalizeClientString(payload.address, 200);
  const correctionCount = normalizeMessagingPreviewCounter(payload.correctionCount);
  const maxCorrections = normalizeMessagingPreviewCounter(payload.maxCorrections);
  const state = isMessagingPreviewViewableState(payload.state) ? payload.state : null;
  const menuData = payload.menuData === undefined
    ? undefined
    : normalizeMessagingPreviewMenuData(payload.menuData);
  const qualityScore: number | null | undefined = payload.qualityScore === undefined
    ? undefined
    : payload.qualityScore === null
      ? null
      : normalizeMessagingPreviewScore(payload.qualityScore);
  const publishedResult: MessagingPreviewPublishedResult | null | undefined =
    payload.publishedResult === undefined
      ? undefined
      : payload.publishedResult === null
        ? null
        : normalizeMessagingPreviewPublishedResult(payload.publishedResult);

  if (
    sessionId === null
    || businessName === null
    || businessType === null
    || businessCategory === null
    || phone === null
    || address === null
    || correctionCount === null
    || maxCorrections === null
    || state === null
    || menuData === null
    || qualityScore === null && payload.qualityScore !== null
    || publishedResult === null && payload.publishedResult !== null
    || state === 'LIVE' && !publishedResult
  ) {
    return null;
  }

  return {
    address,
    businessCategory,
    businessName,
    businessType,
    correctionCount,
    maxCorrections,
    ...(menuData ? { menuData } : {}),
    phone,
    ...(publishedResult ? { publishedResult } : {}),
    ...(qualityScore !== undefined ? { qualityScore } : {}),
    sessionId,
    state,
  };
};

const getMessagingPreviewResponseLogContext = (
  response: Response,
  kind: MessagingPreviewResponseKind,
): MessagingPreviewResponseLogContext => ({
  maxBytes: MESSAGING_PREVIEW_RESPONSE_JSON_MAX_BYTES,
  responseKind: kind,
  responseOk: response.ok,
  responseStatus: response.status,
});

const getRejectedResponseCode = (payload: unknown): string => {
  if (isRecord(payload) && typeof payload.code === 'string') {
    return payload.code;
  }
  return 'MESSAGING_PREVIEW_RESPONSE_REJECTED';
};

const getRetryAfter = (payload: unknown): number | undefined => {
  if (!isRecord(payload)) return undefined;
  return typeof payload.retryAfter === 'number'
    && Number.isSafeInteger(payload.retryAfter)
    && payload.retryAfter > 0
    ? payload.retryAfter
    : undefined;
};

const createMessagingPreviewClientError = (
  response: Response,
  code: string,
  payload: unknown = null,
): MessagingPreviewClientError => {
  const error = new MessagingPreviewClientError();
  error.code = code.slice(0, 64);
  error.status = response.status;
  error.maxReached = isRecord(payload) && payload.maxReached === true;
  error.retryAfter = getRetryAfter(payload);
  return error;
};

export const getMessagingPreviewClientStatus = (error: unknown): number | undefined => {
  const status = error instanceof MessagingPreviewClientError ? error.status : undefined;
  return typeof status === 'number' && Number.isSafeInteger(status) ? status : undefined;
};

export const isMessagingPreviewMaxReachedError = (error: unknown): boolean => (
  error instanceof MessagingPreviewClientError && error.maxReached === true
);

const readMessagingPreviewJson = async (
  response: Response,
  kind: MessagingPreviewResponseKind,
): Promise<unknown> => {
  try {
    return await readJsonResponseWithLimit<unknown>(
      response,
      MESSAGING_PREVIEW_RESPONSE_JSON_MAX_BYTES,
    );
  } catch (error) {
    logRuntimeFailure(
      'messaging_preview_response_parse_failed',
      error,
      getMessagingPreviewResponseLogContext(response, kind),
    );
    return null;
  }
};

const readMessagingPreviewResponse = async <T>(
  response: Response,
  kind: MessagingPreviewResponseKind,
  normalize: (payload: unknown) => T | null,
): Promise<T> => {
  const payload = await readMessagingPreviewJson(response, kind);

  if (!response.ok) {
    throw createMessagingPreviewClientError(response, getRejectedResponseCode(payload), payload);
  }

  const normalizedPayload = normalize(payload);
  if (!normalizedPayload) {
    const error = createMessagingPreviewClientError(
      response,
      'MESSAGING_PREVIEW_RESPONSE_INVALID',
      payload,
    );
    logRuntimeFailure(
      'messaging_preview_response_invalid',
      error,
      {
        ...getMessagingPreviewResponseLogContext(response, kind),
        ...getBoundedRuntimeStringContext('responseKind', kind),
      },
    );
    throw error;
  }

  return normalizedPayload;
};

export const readMessagingPreviewDataResponse = (
  response: Response,
): Promise<MessagingPreviewData> => readMessagingPreviewResponse(
  response,
  'preview_load',
  normalizePreviewData,
);

export const readMessagingPreviewApproveResponse = (
  response: Response,
): Promise<MessagingPreviewApproveResponse> => readMessagingPreviewResponse(
  response,
  'approve',
  normalizeApproveResponse,
);

export const readMessagingPreviewFixResponse = (
  response: Response,
): Promise<MessagingPreviewFixResponse> => readMessagingPreviewResponse(
  response,
  'fix',
  normalizeFixResponse,
);
