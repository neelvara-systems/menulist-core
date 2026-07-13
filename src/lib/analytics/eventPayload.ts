export const ANALYTICS_ENTRY_SOURCES = [
  'copy_link',
  'qr',
  'whatsapp',
  'instagram',
  'facebook',
  'google',
  'obp',
  'menu_kit',
  'native_share',
  'shortcut',
  'direct',
  'other',
] as const;

export const ANALYTICS_MENU_ACTIONS = [
  'call',
  'whatsapp',
  'directions',
  'reserve',
  'order',
] as const;

export const ANALYTICS_OBP_ACTIONS = [
  ...ANALYTICS_MENU_ACTIONS,
  'feedback',
] as const;

export const ANALYTICS_OBP_SHARE_METHODS = [
  'whatsapp',
  'copy_link',
  'copy_message',
] as const;

export const ANALYTICS_OBP_LINKS = [
  'google_review',
  'instagram',
  'facebook',
  'twitter',
  'linkedin',
  'youtube',
  'whatsapp',
  'website',
] as const;

export const ANALYTICS_DECISION_BLOCK_TYPES = [
  'popular',
  'quickPick',
  'bestValue',
] as const;

export const ANALYTICS_OPEN_HOURS_STATES = ['open', 'closed', 'unknown'] as const;
export const ANALYTICS_OBP_SURFACES = ['brand', 'outlet'] as const;
export const ANALYTICS_PWA_PLATFORMS = ['ios', 'android', 'desktop', 'other'] as const;
export const ANALYTICS_PWA_INSTALL_SOURCES = ['native', 'ios-inferred', 'ios-standalone', 'unknown'] as const;
export const ANALYTICS_PWA_INSTALL_SURFACES = ['obp', 'menu-alias', 'project', 'unknown'] as const;
export const ANALYTICS_MENU_RESOLUTION_LAYERS = ['layer1', 'layer2'] as const;
export const ANALYTICS_PROJECT_SWITCH_SOURCES = ['in_menu', 'obp_secondary_card', 'menu_alias_layer2'] as const;
export const ANALYTICS_MENU_KIT_ACTIONS = [
  'zip_download',
  'share_instagram',
  'share_whatsapp',
  'share_google_maps',
] as const;
export const ANALYTICS_SHARE_METHODS = ['native_share', 'copy_link'] as const;
export const ANALYTICS_SHARE_CONTENT_TYPES = ['menu_item', 'menu', 'obp'] as const;
export const ANALYTICS_SHORTCUT_TYPES = ['menu', 'call', 'directions', 'whatsapp', 'reservation', 'order'] as const;
export const ANALYTICS_DEVICE_TYPES = ['desktop', 'mobile', 'tablet', 'unknown'] as const;

export type AnalyticsEntrySource = typeof ANALYTICS_ENTRY_SOURCES[number];
export type AnalyticsDecisionBlockType = typeof ANALYTICS_DECISION_BLOCK_TYPES[number];

export function normalizeAnalyticsEnum<const TValues extends readonly string[]>(
  value: unknown,
  allowedValues: TValues,
): TValues[number] | undefined {
  if (typeof value !== 'string') return undefined;
  return allowedValues.find((candidate) => candidate === value);
}

export function normalizeAnalyticsCount(
  value: unknown,
  maximum = 1_000_000,
): number | undefined {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    && value <= maximum
    ? value
    : undefined;
}

/** Explicit event arguments always outrank caller-supplied context. */
export function buildAuthoritativeAnalyticsPayload<
  TContext extends object,
  const TAuthoritative extends object,
>(
  context: TContext,
  authoritative: TAuthoritative,
): TContext & TAuthoritative {
  return { ...context, ...authoritative };
}
