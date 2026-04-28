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
    trackLocation: resolveInheritedToggle(trackMenuViews, analytics?.trackLocation),
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
