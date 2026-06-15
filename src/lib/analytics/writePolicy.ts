export type AnalyticsWriteValue = string | number | boolean | null;

const ANALYTICS_SCALAR_FIELDS = new Set([
  'actionSessions',
  'date',
  'engagedSessions',
  'intentSessions',
  'languageTrackingEnabled',
  'menuSessions',
  'obpLanguageTrackingEnabled',
  'totalAppOpens',
  'totalClicks',
  'totalDecisionBlocksRendered',
  'totalInstalled',
  'totalInstallStarted',
  'totalItemViews',
  'totalMenuActionClicks',
  'totalOBPActionClicks',
  'totalOBPLinkClicks',
  'totalOBPMenuClicks',
  'totalOBPShares',
  'totalOBPViews',
  'totalPromptDismissed',
  'totalPromptShown',
  'totalRecommendationClicks',
  'totalSearches',
  'totalSessions',
  'totalUnavailableItemTaps',
  'totalViews',
  'uniqueInstallSessions',
  'zeroResultSearches',
]);

export const TWO_LEVEL_ANALYTICS_MAP_FIELDS = new Set([
  'actionSessionsBySource',
  'appOpensByPlatform',
  'appOpensBySurface',
  'attributeFilterActionClicks',
  'attributeFilterInteractions',
  'attributeFilterItemTaps',
  'attributeFilterItemViews',
  'attributeFilterNames',
  'attributeFilterSearches',
  'attributeFilterUnavailableTaps',
  'categoryNames',
  'clicksByCategory',
  'clicksByDevice',
  'clicksByItem',
  'clicksByLocation',
  'decisionBlocksRendered',
  'hourlyAppOpens',
  'hourlyClicks',
  'hourlyDecisionBlocksRendered',
  'hourlyItemViews',
  'hourlyMenuActionClicks',
  'hourlyOBPActionClicks',
  'hourlyOBPLinkClicks',
  'hourlyOBPMenuClicks',
  'hourlyPromptShown',
  'hourlyRecommendationClicks',
  'hourlySearches',
  'hourlyUnavailableItemTaps',
  'hourlyViews',
  'installsByDevice',
  'installsByLocation',
  'installsByPlatform',
  'installsBySource',
  'installsBySurface',
  'itemNames',
  'languageAdoptions',
  'languageNames',
  'menuActionClicks',
  'menuActionClicksBySource',
  'menuResolutionLayer',
  'menuSessionsByLanguage',
  'menuSessionsBySource',
  'menuViewsByLanguage',
  'obpActionClicks',
  'obpActionClicksBySource',
  'obpLanguageAdoptions',
  'obpLanguageNames',
  'obpLinkClicks',
  'obpLinkClicksBySource',
  'obpMenuClicksBySource',
  'obpMenuClicksBySurface',
  'obpSessionsByLanguage',
  'obpShares',
  'obpViewsByLanguage',
  'recommendationClicks',
  'recommendationClicksByItem',
  'searchTerms',
  'shortcutClicks',
  'unavailableItemTapsByItem',
  'viewsByCampaign',
  'viewsByCategory',
  'viewsByContent',
  'viewsByDevice',
  'viewsByEntrySource',
  'viewsByItem',
  'viewsByLocation',
  'viewsByMedium',
  'viewsBySource',
  'zeroResultSearchTerms',
]);

const THREE_LEVEL_ANALYTICS_MAP_FIELDS = new Set([
  'hourlyClicksByItem',
]);

const DENIED_ANALYTICS_FIELDS = new Set([
  'sessionId',
]);

const SAFE_FIELD_SEGMENT = /^[A-Za-z0-9_:-]{1,120}$/;
const SAFE_HOUR_KEY = /^(?:[01]\d|2[0-3]|\d)$/;

const sanitizeAnalyticsValue = (key: string, value: unknown): AnalyticsWriteValue | undefined => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 && value <= 1000 ? value : undefined;
  }

  if (typeof value === 'boolean') return value;
  if (value === null) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const maxLength = key.startsWith('itemNames.')
      || key.startsWith('categoryNames.')
      || key.startsWith('languageNames.')
      || key.startsWith('obpLanguageNames.')
      || key.startsWith('attributeFilterNames.')
      ? 120
      : 300;
    return trimmed.slice(0, maxLength);
  }

  return undefined;
};

function isAllowedAnalyticsKey(key: string): boolean {
  if (DENIED_ANALYTICS_FIELDS.has(key)) return false;
  if (key.includes('__')) return false;

  const parts = key.split('.');
  if (parts.length === 1) {
    return ANALYTICS_SCALAR_FIELDS.has(key);
  }

  if (parts.length === 2) {
    const [parent, child] = parts;
    return TWO_LEVEL_ANALYTICS_MAP_FIELDS.has(parent) && SAFE_FIELD_SEGMENT.test(child);
  }

  if (parts.length === 3) {
    const [parent, itemId, hour] = parts;
    return THREE_LEVEL_ANALYTICS_MAP_FIELDS.has(parent)
      && SAFE_FIELD_SEGMENT.test(itemId)
      && SAFE_HOUR_KEY.test(hour);
  }

  return false;
}

export function filterAnalyticsUpdateData<T extends Record<string, unknown>>(
  updateData: T,
): Record<string, AnalyticsWriteValue> {
  const filtered: Record<string, AnalyticsWriteValue> = {};

  Object.entries(updateData || {}).forEach(([key, value]) => {
    if (!isAllowedAnalyticsKey(key)) return;
    const sanitized = sanitizeAnalyticsValue(key, value);
    if (sanitized === undefined) return;
    filtered[key] = sanitized;
  });

  return filtered;
}
