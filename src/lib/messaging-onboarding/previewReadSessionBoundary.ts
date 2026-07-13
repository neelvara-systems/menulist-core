import {
  normalizeExtractedBusinessProfile,
  type ExtractedBusinessProfile,
} from '@data/shared/extractedBusinessProfile';
import { getPublicMenuDraftTimestampMillis } from '@data/shared/publicMenuDraftData';
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

type UnknownRecord = Record<string, unknown>;

export type MessagingPreviewReadSession = {
  businessAddress: string;
  businessName: string;
  correctionCount: number;
  createdAtMillis: number;
  detectedBusinessCategory: string | null;
  detectedBusinessType: string | null;
  expiresAtMillis: number;
  extractedBusinessProfile: ExtractedBusinessProfile | null;
  menuData: MessagingPreviewMenuData;
  previewToken: string;
  previewViewedAtMillis: number | null;
  provider: 'telegram' | 'whatsapp';
  providerDisplayId: string;
  providerUserId: string;
  publishedResult: MessagingPreviewPublishedResult | null;
  qualityScore: number | null;
  sessionId: string;
  state: MessagingPreviewViewableState;
};

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function boundedString(value: unknown, maxLength: number): string | null {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && value === value.trim()
    && !value.includes('\0')
    ? value
    : null;
}

function optionalString(value: unknown, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') return '';
  return boundedString(value, maxLength) || undefined;
}

function nullableString(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  return boundedString(value, maxLength) ?? undefined;
}

function hasCurrentStateHistory(value: unknown, state: MessagingPreviewViewableState): boolean {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) return false;
  const last = value[value.length - 1];
  return isRecord(last)
    && last.state === state
    && getPublicMenuDraftTimestampMillis(last.timestamp) !== null;
}

export function normalizeMessagingPreviewReadSession(
  value: unknown,
  expectedSessionId: string,
): MessagingPreviewReadSession | null {
  if (!isRecord(value) || value.sessionId !== expectedSessionId) return null;
  const state = isMessagingPreviewViewableState(value.state) ? value.state : null;
  const provider = value.provider === 'whatsapp' || value.provider === 'telegram'
    ? value.provider
    : null;
  const providerUserId = boundedString(value.providerUserId, 160);
  const providerDisplayId = boundedString(value.providerDisplayId, 160);
  const previewToken = boundedString(value.previewToken, 256);
  const createdAtMillis = getPublicMenuDraftTimestampMillis(value.createdAt);
  const expiresAtMillis = getPublicMenuDraftTimestampMillis(value.expiresAt);
  const previewViewedAtMillis = value.previewViewedAt === undefined || value.previewViewedAt === null
    ? null
    : getPublicMenuDraftTimestampMillis(value.previewViewedAt);
  const menuData = normalizeMessagingPreviewMenuData(value.extractedMenuData);
  const correctionCount = normalizeMessagingPreviewCounter(value.correctionCount);
  const qualityScore = value.qualityScore === null
    ? null
    : normalizeMessagingPreviewScore(value.qualityScore);
  const publishedResult = value.publishedResult === null
    ? null
    : normalizeMessagingPreviewPublishedResult(value.publishedResult);
  const detectedBusinessType = nullableString(value.detectedBusinessType, 50);
  const detectedBusinessCategory = nullableString(value.detectedBusinessCategory, 160);
  const embeddedProfile = isRecord(value.extractedMenuData)
    ? value.extractedMenuData.extractedBusinessProfile
    : null;
  const rawProfile = value.extractedBusinessProfile ?? embeddedProfile ?? null;
  const extractedBusinessProfile = rawProfile === null
    ? null
    : normalizeExtractedBusinessProfile(rawProfile) || undefined;
  const businessInfo = isRecord(value.extractedBusinessInfo) ? value.extractedBusinessInfo : null;
  const businessName = optionalString(businessInfo?.businessName, 100);
  const businessAddress = optionalString(businessInfo?.address, 200);
  if (
    !state
    || !hasCurrentStateHistory(value.stateHistory, state)
    || !provider
    || !providerUserId
    || !providerDisplayId
    || !previewToken
    || !/^[A-Za-z0-9_-]{20,256}$/.test(previewToken)
    || createdAtMillis === null
    || expiresAtMillis === null
    || previewViewedAtMillis === null && value.previewViewedAt !== undefined && value.previewViewedAt !== null
    || !menuData
    || correctionCount === null
    || qualityScore === null && value.qualityScore !== null
    || detectedBusinessType === undefined
    || detectedBusinessCategory === undefined
    || extractedBusinessProfile === undefined
    || (value.extractedBusinessInfo !== null && !businessInfo)
    || businessName === undefined
    || businessAddress === undefined
    || (value.publishedResult !== null && !publishedResult)
    || (state === 'LIVE' && !publishedResult)
    || (state !== 'LIVE' && publishedResult !== null)
  ) {
    return null;
  }
  return {
    businessAddress,
    businessName,
    correctionCount,
    createdAtMillis,
    detectedBusinessCategory,
    detectedBusinessType,
    expiresAtMillis,
    extractedBusinessProfile,
    menuData,
    previewToken,
    previewViewedAtMillis,
    provider,
    providerDisplayId,
    providerUserId,
    publishedResult,
    qualityScore,
    sessionId: expectedSessionId,
    state,
  };
}
