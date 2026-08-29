export interface StoreAnalyticsPreferences {
  enhancedEcommerce?: boolean;
  facebookPixelId?: string;
  googleAnalyticsId?: string;
  googleSearchConsole?: string;
  trackCustomerApp?: boolean;
  trackDecisionBlocks?: boolean;
  trackLocation?: boolean;
  trackMenuViews?: boolean;
  trackOfficialBusinessPage?: boolean;
}

export interface ResolvedAnalyticsPreferences {
  enhancedEcommerce: boolean;
  trackCustomerApp: boolean;
  trackDecisionBlocks: boolean;
  trackLocation: boolean;
  trackMenuViews: boolean;
  trackOfficialBusinessPage: boolean;
}

const GOOGLE_SEARCH_CONSOLE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{6,256}$/;
const GOOGLE_SEARCH_CONSOLE_INPUT_MAX_LENGTH = 2048;
const GA4_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;
const META_PIXEL_ID_PATTERN = /^\d{5,32}$/;

export function normalizeGoogleAnalyticsMeasurementId(value: unknown): string | undefined {
  const normalized = String(value || '').trim().toUpperCase();
  return GA4_MEASUREMENT_ID_PATTERN.test(normalized) ? normalized : undefined;
}

export function normalizeMetaPixelId(value: unknown): string | undefined {
  const normalized = String(value || '').trim();
  return META_PIXEL_ID_PATTERN.test(normalized) ? normalized : undefined;
}

export function normalizeGoogleSearchConsoleVerification(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > GOOGLE_SEARCH_CONSOLE_INPUT_MAX_LENGTH || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return undefined;
  }

  let token = trimmed;
  if (trimmed.includes('<')) {
    if (!/^<meta\b[^>]*>$/i.test(trimmed)) return undefined;
    if (!/\bname\s*=\s*(?:["']google-site-verification["']|google-site-verification)(?:\s|\/?>)/i.test(trimmed)) {
      return undefined;
    }
    const contentMatch = trimmed.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    token = (contentMatch?.[1] ?? contentMatch?.[2] ?? contentMatch?.[3] ?? '').trim();
  }

  return GOOGLE_SEARCH_CONSOLE_TOKEN_PATTERN.test(token) ? token : undefined;
}

function resolveInheritedToggle(masterEnabled: boolean, value?: boolean): boolean {
  return masterEnabled && value !== false;
}

export function getResolvedAnalyticsPreferences(
  analytics?: StoreAnalyticsPreferences | null,
): ResolvedAnalyticsPreferences {
  const trackMenuViews = analytics?.trackMenuViews !== false;

  return {
    enhancedEcommerce: analytics?.enhancedEcommerce === true,
    trackCustomerApp: resolveInheritedToggle(trackMenuViews, analytics?.trackCustomerApp),
    trackDecisionBlocks: resolveInheritedToggle(trackMenuViews, analytics?.trackDecisionBlocks),
    trackLocation: trackMenuViews && analytics?.trackLocation === true,
    trackMenuViews,
    trackOfficialBusinessPage: resolveInheritedToggle(trackMenuViews, analytics?.trackOfficialBusinessPage),
  };
}

export function isMenuAnalyticsEnabled(analytics?: StoreAnalyticsPreferences | null): boolean {
  return getResolvedAnalyticsPreferences(analytics).trackMenuViews;
}

export function isLocationAnalyticsEnabled(analytics?: StoreAnalyticsPreferences | null): boolean {
  return getResolvedAnalyticsPreferences(analytics).trackLocation;
}

export function isDecisionBlockAnalyticsEnabled(analytics?: StoreAnalyticsPreferences | null): boolean {
  return getResolvedAnalyticsPreferences(analytics).trackDecisionBlocks;
}

export function isOBPAnalyticsEnabled(analytics?: StoreAnalyticsPreferences | null): boolean {
  return getResolvedAnalyticsPreferences(analytics).trackOfficialBusinessPage;
}

export function isCustomerAppAnalyticsEnabled(analytics?: StoreAnalyticsPreferences | null): boolean {
  return getResolvedAnalyticsPreferences(analytics).trackCustomerApp;
}
