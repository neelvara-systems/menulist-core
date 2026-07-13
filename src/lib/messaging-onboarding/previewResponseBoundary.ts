import { normalizePublicMenuDraftExtractedData } from '@data/shared/publicMenuDraftData';

export const MESSAGING_PREVIEW_VIEWABLE_STATES = [
  'PREVIEW_READY',
  'AWAITING_APPROVAL',
  'PUBLISHING',
  'LIVE',
] as const;

export type MessagingPreviewViewableState = (typeof MESSAGING_PREVIEW_VIEWABLE_STATES)[number];

export type MessagingPreviewPublishedResult = {
  dashboardUrl: string;
  projectId?: string;
  publicUrl: string;
  storeId?: number;
  tenantId?: number;
};

export type MessagingPreviewLocalizedText = string | Record<string, string>;

export type MessagingPreviewCategory = {
  id?: string;
  name?: MessagingPreviewLocalizedText;
};

export type MessagingPreviewItem = {
  attributes?: Array<{
    id: string;
    name: MessagingPreviewLocalizedText;
    price: string;
  }>;
  available?: boolean;
  category?: string;
  description?: MessagingPreviewLocalizedText;
  id?: string;
  name?: MessagingPreviewLocalizedText;
  price?: number | string;
};

export type MessagingPreviewMenuData = {
  categories: MessagingPreviewCategory[];
  items: MessagingPreviewItem[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeBoundedString = (
  value: unknown,
  maxLength: number,
  allowEmpty = false,
): string | null => {
  if (typeof value !== 'string' || value.length > maxLength || value.includes('\0')) return null;
  if (!allowEmpty && value.trim().length === 0) return null;
  return value;
};

const normalizeHttpsUrl = (value: unknown): string | null => {
  const raw = normalizeBoundedString(value, 2048);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:'
      || !url.hostname
      || url.username
      || url.password
    ) return null;
    return url.toString();
  } catch {
    return null;
  }
};

const normalizeOptionalPositiveInteger = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined
);

export function normalizeMessagingPreviewPublishedResult(
  value: unknown,
): MessagingPreviewPublishedResult | null {
  if (!isRecord(value)) return null;
  const publicUrl = normalizeHttpsUrl(value.publicUrl);
  const dashboardUrl = normalizeHttpsUrl(value.dashboardUrl);
  if (!publicUrl || !dashboardUrl) return null;

  const projectId = normalizeBoundedString(value.projectId, 180) || undefined;
  const storeId = normalizeOptionalPositiveInteger(value.storeId);
  const tenantId = normalizeOptionalPositiveInteger(value.tenantId);
  if (value.projectId !== undefined && projectId === undefined) return null;
  if (value.storeId !== undefined && storeId === undefined) return null;
  if (value.tenantId !== undefined && tenantId === undefined) return null;

  return {
    dashboardUrl,
    ...(projectId ? { projectId } : {}),
    publicUrl,
    ...(storeId !== undefined ? { storeId } : {}),
    ...(tenantId !== undefined ? { tenantId } : {}),
  };
}

export function normalizeMessagingPreviewMenuData(
  value: unknown,
): MessagingPreviewMenuData | null {
  const menu = normalizePublicMenuDraftExtractedData(value);
  if (!menu) return null;

  // Preview exactly the active canonical graph that can be promoted to a
  // project. This prevents owners from approving orphaned, duplicate, or
  // over-limit provider rows that the publish boundary would later discard.
  const activeCategoryIds = new Set(
    menu.categories
      .filter((category) => category.active !== false)
      .map((category) => category.id),
  );
  const categories = menu.categories
    .filter((category) => activeCategoryIds.has(category.id))
    .map((category) => ({ id: category.id, name: category.name }));
  const items = menu.items
    .filter((item) => item.active !== false && activeCategoryIds.has(item.category))
    .map((item) => ({
      ...(item.attributes ? {
        attributes: item.attributes
          .filter((attribute) => attribute.active !== false)
          .map((attribute) => ({
            id: attribute.id,
            name: attribute.name,
            price: attribute.price,
          })),
      } : {}),
      available: item.available !== false,
      category: item.category,
      ...(item.description ? { description: item.description } : {}),
      id: item.id,
      name: item.name,
      ...(item.price !== undefined ? { price: item.price } : {}),
    }));

  return categories.length > 0 && items.length > 0 ? { categories, items } : null;
}

export function isMessagingPreviewViewableState(
  value: unknown,
): value is MessagingPreviewViewableState {
  return typeof value === 'string'
    && MESSAGING_PREVIEW_VIEWABLE_STATES.includes(value as MessagingPreviewViewableState);
}

export function normalizeMessagingPreviewCounter(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

export function normalizeMessagingPreviewScore(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}
