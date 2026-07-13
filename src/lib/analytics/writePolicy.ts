import {
  ANALYTICS_DECISION_BLOCK_TYPES,
  ANALYTICS_DEVICE_TYPES,
  ANALYTICS_ENTRY_SOURCES,
  ANALYTICS_MENU_ACTIONS,
  ANALYTICS_MENU_RESOLUTION_LAYERS,
  ANALYTICS_OBP_ACTIONS,
  ANALYTICS_OBP_LINKS,
  ANALYTICS_OBP_SHARE_METHODS,
  ANALYTICS_OBP_SURFACES,
  ANALYTICS_OPEN_HOURS_STATES,
  ANALYTICS_PWA_INSTALL_SOURCES,
  ANALYTICS_PWA_INSTALL_SURFACES,
  ANALYTICS_PWA_PLATFORMS,
  ANALYTICS_SHORTCUT_TYPES,
} from './eventPayload';

export type AnalyticsWriteValue = string | number | boolean;

const NUMERIC_ANALYTICS_SCALAR_FIELDS = new Set([
  'actionSessions',
  'engagedSessions',
  'intentSessions',
  'menuSessions',
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

const BOOLEAN_ANALYTICS_SCALAR_FIELDS = new Set([
  'languageTrackingEnabled',
  'obpLanguageTrackingEnabled',
]);

export const TWO_LEVEL_ANALYTICS_MAP_FIELDS = new Set([
  'actionSessionsBySource',
  'actionSessionsByOpenHoursState',
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
  'menuActionClicksByOpenHoursState',
  'menuActionClicksBySource',
  'menuResolutionLayer',
  'menuSessionsByLanguage',
  'menuSessionsBySource',
  'menuViewsByLanguage',
  'obpActionClicks',
  'obpActionClicksByOpenHoursState',
  'obpActionClicksBySource',
  'obpLanguageAdoptions',
  'obpLanguageNames',
  'obpLinkClicks',
  'obpLinkClicksByOpenHoursState',
  'obpLinkClicksBySource',
  'obpMenuClicksByOpenHoursState',
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

const STRING_ANALYTICS_MAP_FIELDS = new Set([
  'attributeFilterNames',
  'categoryNames',
  'itemNames',
  'languageNames',
  'obpLanguageNames',
]);

const DENIED_ANALYTICS_FIELDS = new Set([
  'sessionId',
]);

const UNSAFE_ANALYTICS_PATH_SEGMENTS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

const SAFE_FIELD_SEGMENT = /^[A-Za-z0-9_:-]{1,120}$/;
const UNSAFE_SEARCH_TERM_SEGMENT = /[\u0000-\u001F\u007F.\/\\<>{}\[\]`$]/;
const SAFE_HOUR_KEY = /^(?:[01]\d|2[0-3]|\d)$/;
const SEARCH_TERM_MAP_FIELDS = new Set(['searchTerms', 'zeroResultSearchTerms']);
const LANGUAGE_MAP_FIELDS = new Set([
  'languageAdoptions',
  'languageNames',
  'menuSessionsByLanguage',
  'menuViewsByLanguage',
  'obpLanguageAdoptions',
  'obpLanguageNames',
  'obpSessionsByLanguage',
  'obpViewsByLanguage',
]);
const ATTRIBUTE_FILTER_MAP_FIELDS = new Set([
  'attributeFilterActionClicks',
  'attributeFilterInteractions',
  'attributeFilterItemTaps',
  'attributeFilterItemViews',
  'attributeFilterNames',
  'attributeFilterSearches',
  'attributeFilterUnavailableTaps',
]);
const SAFE_LANGUAGE_KEY = /^[a-z0-9_-]{1,16}$/;
const ALLOWED_ATTRIBUTE_FILTER_KEYS = new Set(['popular', 'veg', 'nonveg', 'forMen', 'forWomen']);
const FIXED_CHILD_VALUES = new Map<string, ReadonlySet<string>>([
  ['actionSessionsBySource', new Set(ANALYTICS_ENTRY_SOURCES)],
  ['actionSessionsByOpenHoursState', new Set(ANALYTICS_OPEN_HOURS_STATES)],
  ['appOpensByPlatform', new Set(ANALYTICS_PWA_PLATFORMS)],
  ['appOpensBySurface', new Set(ANALYTICS_PWA_INSTALL_SURFACES)],
  ['clicksByDevice', new Set(ANALYTICS_DEVICE_TYPES)],
  ['decisionBlocksRendered', new Set(ANALYTICS_DECISION_BLOCK_TYPES)],
  ['installsByDevice', new Set(ANALYTICS_DEVICE_TYPES)],
  ['installsByPlatform', new Set(ANALYTICS_PWA_PLATFORMS)],
  ['installsBySource', new Set(ANALYTICS_PWA_INSTALL_SOURCES)],
  ['installsBySurface', new Set(ANALYTICS_PWA_INSTALL_SURFACES)],
  ['menuActionClicks', new Set(ANALYTICS_MENU_ACTIONS)],
  ['menuActionClicksByOpenHoursState', new Set(ANALYTICS_OPEN_HOURS_STATES)],
  ['menuActionClicksBySource', new Set(ANALYTICS_ENTRY_SOURCES)],
  ['menuResolutionLayer', new Set(ANALYTICS_MENU_RESOLUTION_LAYERS)],
  ['menuSessionsBySource', new Set(ANALYTICS_ENTRY_SOURCES)],
  ['obpActionClicks', new Set(ANALYTICS_OBP_ACTIONS)],
  ['obpActionClicksByOpenHoursState', new Set(ANALYTICS_OPEN_HOURS_STATES)],
  ['obpActionClicksBySource', new Set(ANALYTICS_ENTRY_SOURCES)],
  ['obpLinkClicks', new Set(ANALYTICS_OBP_LINKS)],
  ['obpLinkClicksByOpenHoursState', new Set(ANALYTICS_OPEN_HOURS_STATES)],
  ['obpLinkClicksBySource', new Set(ANALYTICS_ENTRY_SOURCES)],
  ['obpMenuClicksByOpenHoursState', new Set(ANALYTICS_OPEN_HOURS_STATES)],
  ['obpMenuClicksBySource', new Set(ANALYTICS_ENTRY_SOURCES)],
  ['obpMenuClicksBySurface', new Set(ANALYTICS_OBP_SURFACES)],
  ['obpShares', new Set(ANALYTICS_OBP_SHARE_METHODS)],
  ['recommendationClicks', new Set(ANALYTICS_DECISION_BLOCK_TYPES)],
  ['shortcutClicks', new Set(ANALYTICS_SHORTCUT_TYPES)],
  ['viewsByDevice', new Set(ANALYTICS_DEVICE_TYPES)],
  ['viewsByEntrySource', new Set(ANALYTICS_ENTRY_SOURCES)],
]);

const isSafeSearchTermSegment = (value: string): boolean => (
  value.length >= 2
  && value.length <= 64
  && value.trim() === value
  && !UNSAFE_SEARCH_TERM_SEGMENT.test(value)
);

const sanitizeAnalyticsValue = (key: string, value: unknown): AnalyticsWriteValue | undefined => {
  const [parent] = key.split('.');
  const expectsNumber = NUMERIC_ANALYTICS_SCALAR_FIELDS.has(key)
    || TWO_LEVEL_ANALYTICS_MAP_FIELDS.has(parent) && !STRING_ANALYTICS_MAP_FIELDS.has(parent)
    || THREE_LEVEL_ANALYTICS_MAP_FIELDS.has(parent);
  if (expectsNumber) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000
      ? value
      : undefined;
  }

  if (BOOLEAN_ANALYTICS_SCALAR_FIELDS.has(key)) {
    return typeof value === 'boolean' ? value : undefined;
  }

  if (STRING_ANALYTICS_MAP_FIELDS.has(parent) && typeof value === 'string') {
    const trimmed = value
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, 120);
  }

  return undefined;
};

function isAllowedAnalyticsKey(key: string): boolean {
  if (DENIED_ANALYTICS_FIELDS.has(key)) return false;
  if (key.includes('__')) return false;

  const parts = key.split('.');
  if (parts.some((part) => UNSAFE_ANALYTICS_PATH_SEGMENTS.has(part))) return false;
  if (parts.length === 1) {
    return NUMERIC_ANALYTICS_SCALAR_FIELDS.has(key)
      || BOOLEAN_ANALYTICS_SCALAR_FIELDS.has(key);
  }

  if (parts.length === 2) {
    const [parent, child] = parts;
    if (!TWO_LEVEL_ANALYTICS_MAP_FIELDS.has(parent)) return false;
    if (SEARCH_TERM_MAP_FIELDS.has(parent)) return isSafeSearchTermSegment(child);
    if (parent.startsWith('hourly')) return SAFE_HOUR_KEY.test(child);
    if (LANGUAGE_MAP_FIELDS.has(parent)) return SAFE_LANGUAGE_KEY.test(child);
    if (ATTRIBUTE_FILTER_MAP_FIELDS.has(parent)) return ALLOWED_ATTRIBUTE_FILTER_KEYS.has(child);
    const fixedValues = FIXED_CHILD_VALUES.get(parent);
    return fixedValues ? fixedValues.has(child) : SAFE_FIELD_SEGMENT.test(child);
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
