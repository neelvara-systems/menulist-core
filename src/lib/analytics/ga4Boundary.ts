import {
  ANALYTICS_DECISION_BLOCK_TYPES,
  ANALYTICS_ENTRY_SOURCES,
  ANALYTICS_MENU_ACTIONS,
  ANALYTICS_MENU_KIT_ACTIONS,
  ANALYTICS_MENU_RESOLUTION_LAYERS,
  ANALYTICS_OBP_ACTIONS,
  ANALYTICS_OBP_LINKS,
  ANALYTICS_OBP_SURFACES,
  ANALYTICS_OPEN_HOURS_STATES,
  ANALYTICS_PROJECT_SWITCH_SOURCES,
  ANALYTICS_PWA_INSTALL_SOURCES,
  ANALYTICS_PWA_INSTALL_SURFACES,
  ANALYTICS_PWA_PLATFORMS,
  ANALYTICS_SHARE_CONTENT_TYPES,
  ANALYTICS_SHARE_METHODS,
  normalizeAnalyticsCount,
  normalizeAnalyticsEnum,
} from './eventPayload';

export type GA4EventParameter = string | number | boolean | string[];

const DEFAULT_GA4_STRING_LIMIT = 120;

const normalizeString = (value: unknown, maxLength = DEFAULT_GA4_STRING_LIMIT): string | undefined => {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  if (typeof value === 'number' && !Number.isFinite(value)) return undefined;
  const normalized = String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
  return normalized || undefined;
};

const normalizeNumber = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isFinite(value) ? value : undefined
);

const normalizeNonNegativeNumber = (value: unknown): number | undefined => {
  const normalized = normalizeNumber(value);
  return normalized !== undefined && normalized >= 0 ? normalized : undefined;
};

const normalizePositiveInteger = (value: unknown): number | undefined => (
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
);

const normalizeCurrency = (value: unknown): string | undefined => {
  const normalized = normalizeString(value, 3)?.toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : undefined;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = Array.from(new Set(value
    .map((entry) => normalizeString(entry, 48))
    .filter((entry): entry is string => Boolean(entry))))
    .slice(0, 10);
  return normalized.length > 0 ? normalized : undefined;
};

export function buildGA4DefaultEventParameters(
  data: Record<string, unknown>,
  timestamp: string = new Date().toISOString(),
): Record<string, GA4EventParameter> {
  const candidates: Record<string, GA4EventParameter | undefined> = {
    item_id: normalizeString(data.itemId),
    item_name: normalizeString(data.itemName),
    item_category: normalizeString(data.itemCategory),
    category_id: normalizeString(data.categoryId ?? data.itemCategoryId),
    price: normalizeNonNegativeNumber(data.price),
    quantity: normalizePositiveInteger(data.quantity),
    currency: normalizeCurrency(data.currency),
    transaction_id: normalizeString(data.transactionId),
    value: normalizeNonNegativeNumber(data.revenue),
    tax: normalizeNonNegativeNumber(data.tax),
    shipping: normalizeNonNegativeNumber(data.shipping),
    coupon: normalizeString(data.coupon, 80),
    store_id: normalizeString(data.storeId),
    store_name: normalizeString(data.storeName),
    project_id: normalizeString(data.projectId),
    search_term: normalizeString(data.searchTerm, 64),
    search_results_count: normalizeAnalyticsCount(data.searchResults),
    menu_action: normalizeAnalyticsEnum(data.menuAction, ANALYTICS_MENU_ACTIONS),
    open_hours_state: normalizeAnalyticsEnum(data.openHoursState, ANALYTICS_OPEN_HOURS_STATES),
    block_type: normalizeAnalyticsEnum(data.blockType, ANALYTICS_DECISION_BLOCK_TYPES),
    blocks_shown: normalizeStringArray(data.blocksShown),
    recommendation_position: normalizeAnalyticsCount(data.recommendationPosition, 100),
    share_method: normalizeAnalyticsEnum(data.shareMethod, ANALYTICS_SHARE_METHODS),
    share_content_type: normalizeAnalyticsEnum(data.shareContentType, ANALYTICS_SHARE_CONTENT_TYPES),
    obp_action: normalizeAnalyticsEnum(data.obpAction, ANALYTICS_OBP_ACTIONS),
    obp_link: normalizeAnalyticsEnum(data.obpLink, ANALYTICS_OBP_LINKS),
    obp_surface: normalizeAnalyticsEnum(data.obpSurface, ANALYTICS_OBP_SURFACES),
    menu_language: normalizeString(data.menuLanguage ?? data.language, 16),
    previous_menu_language: normalizeString(data.previousMenuLanguage, 16),
    obp_language: normalizeString(data.obpLanguage, 16),
    previous_obp_language: normalizeString(data.previousOBPLanguage, 16),
    language_adoption_reason: normalizeString(data.languageAdoptionReason, 32),
    pwa_platform: normalizeAnalyticsEnum(data.pwaPlatform, ANALYTICS_PWA_PLATFORMS),
    pwa_install_source: normalizeAnalyticsEnum(data.pwaInstallSource, ANALYTICS_PWA_INSTALL_SOURCES),
    pwa_install_surface: normalizeAnalyticsEnum(data.pwaInstallSurface, ANALYTICS_PWA_INSTALL_SURFACES),
    menu_resolution_layer: normalizeAnalyticsEnum(data.menuResolutionLayer, ANALYTICS_MENU_RESOLUTION_LAYERS),
    switch_source: normalizeAnalyticsEnum(data.switchSource, ANALYTICS_PROJECT_SWITCH_SOURCES),
    from_project_id: normalizeString(data.fromProjectId),
    menu_kit_action: normalizeAnalyticsEnum(data.menuKitAction, ANALYTICS_MENU_KIT_ACTIONS),
    entry_source: normalizeAnalyticsEnum(data.entrySource, ANALYTICS_ENTRY_SOURCES),
    city: normalizeString(data.city, 80),
    region: normalizeString(data.region, 80),
    country: normalizeString(data.country, 80),
    utm_source: normalizeString(data.utm_source, 80),
    utm_medium: normalizeString(data.utm_medium, 80),
    utm_campaign: normalizeString(data.utm_campaign, 80),
    utm_content: normalizeString(data.utm_content, 80),
    timestamp,
  };

  return Object.fromEntries(
    Object.entries(candidates).filter((entry): entry is [string, GA4EventParameter] => (
      entry[1] !== undefined
    )),
  );
}

export function normalizeGA4CommerceItems(value: unknown): Array<Record<string, GA4EventParameter>> {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 100).flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const itemId = normalizeString(entry.item_id ?? entry.itemId);
    const itemName = normalizeString(entry.item_name ?? entry.itemName);
    if (!itemId && !itemName) return [];

    const candidates: Record<string, GA4EventParameter | undefined> = {
      item_id: itemId,
      item_name: itemName,
      item_category: normalizeString(entry.item_category ?? entry.itemCategory),
      price: normalizeNonNegativeNumber(entry.price),
      quantity: normalizePositiveInteger(entry.quantity),
      currency: normalizeCurrency(entry.currency),
    };
    return [Object.fromEntries(
      Object.entries(candidates).filter((candidate): candidate is [string, GA4EventParameter] => (
        candidate[1] !== undefined
      )),
    )];
  });
}
