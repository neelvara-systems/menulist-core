import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';

export const MESSAGING_PREVIEW_RESPONSE_JSON_MAX_BYTES = 2 * 1024 * 1024;

export type MessagingPreviewPublishedResult = {
  dashboardUrl: string;
  projectId?: string;
  publicUrl: string;
  storeId?: number;
  tenantId?: number;
};

export type MessagingPreviewData = {
  address: string;
  businessCategory: string;
  businessName: string;
  businessType: string;
  correctionCount: number;
  maxCorrections: number;
  menuData?: any;
  phone: string;
  publishedResult?: MessagingPreviewPublishedResult | null;
  qualityScore?: number | null;
  sessionId: string;
  state: string;
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
type MessagingPreviewClientError = Error & {
  code?: string;
  maxReached?: boolean;
  retryAfter?: number;
  status?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isNullableRecord = (value: unknown): value is Record<string, unknown> | null => (
  value === null || isRecord(value)
);

const isPublishedResult = (value: unknown): value is MessagingPreviewPublishedResult => (
  isRecord(value)
  && typeof value.publicUrl === 'string'
  && typeof value.dashboardUrl === 'string'
);

const isPreviewData = (value: unknown): value is MessagingPreviewData => (
  isRecord(value)
  && typeof value.sessionId === 'string'
  && typeof value.state === 'string'
  && typeof value.businessName === 'string'
  && typeof value.businessType === 'string'
  && typeof value.businessCategory === 'string'
  && typeof value.phone === 'string'
  && typeof value.address === 'string'
  && (value.menuData === undefined || isNullableRecord(value.menuData))
  && (value.qualityScore === undefined || value.qualityScore === null || Number.isFinite(Number(value.qualityScore)))
  && (value.publishedResult === undefined || value.publishedResult === null || isPublishedResult(value.publishedResult))
  && Number.isFinite(Number(value.correctionCount))
  && Number.isFinite(Number(value.maxCorrections))
);

const isApproveResponse = (value: unknown): value is MessagingPreviewApproveResponse => (
  isRecord(value)
  && value.success === true
  && isPublishedResult(value.publishedResult)
);

const isFixResponse = (value: unknown): value is MessagingPreviewFixResponse => (
  isRecord(value)
  && value.success === true
  && Number.isFinite(Number(value.correctionNumber))
  && Number.isFinite(Number(value.maxCorrections))
  && typeof value.message === 'string'
);

const isExpectedResponse = (
  kind: MessagingPreviewResponseKind,
  payload: unknown,
): payload is MessagingPreviewData | MessagingPreviewApproveResponse | MessagingPreviewFixResponse => {
  if (kind === 'preview_load') return isPreviewData(payload);
  if (kind === 'approve') return isApproveResponse(payload);
  return isFixResponse(payload);
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
  const retryAfter = Number(payload.retryAfter);
  return Number.isFinite(retryAfter) ? retryAfter : undefined;
};

const createMessagingPreviewClientError = (
  response: Response,
  code: string,
  payload: unknown = null,
): MessagingPreviewClientError => {
  const error = new Error('Messaging preview request failed') as MessagingPreviewClientError;
  error.code = code.slice(0, 64);
  error.status = response.status;
  error.maxReached = isRecord(payload) && payload.maxReached === true;
  error.retryAfter = getRetryAfter(payload);
  return error;
};

export const getMessagingPreviewClientStatus = (error: unknown): number | undefined => {
  const status = Number((error as MessagingPreviewClientError | undefined)?.status);
  return Number.isFinite(status) ? status : undefined;
};

export const isMessagingPreviewMaxReachedError = (error: unknown): boolean => (
  Boolean((error as MessagingPreviewClientError | undefined)?.maxReached)
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

const readMessagingPreviewResponse = async <T extends MessagingPreviewData | MessagingPreviewApproveResponse | MessagingPreviewFixResponse>(
  response: Response,
  kind: MessagingPreviewResponseKind,
): Promise<T> => {
  const payload = await readMessagingPreviewJson(response, kind);

  if (!response.ok) {
    throw createMessagingPreviewClientError(response, getRejectedResponseCode(payload), payload);
  }

  if (!isExpectedResponse(kind, payload)) {
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

  return payload as T;
};

export const readMessagingPreviewDataResponse = (
  response: Response,
): Promise<MessagingPreviewData> => readMessagingPreviewResponse<MessagingPreviewData>(response, 'preview_load');

export const readMessagingPreviewApproveResponse = (
  response: Response,
): Promise<MessagingPreviewApproveResponse> => readMessagingPreviewResponse<MessagingPreviewApproveResponse>(response, 'approve');

export const readMessagingPreviewFixResponse = (
  response: Response,
): Promise<MessagingPreviewFixResponse> => readMessagingPreviewResponse<MessagingPreviewFixResponse>(response, 'fix');
