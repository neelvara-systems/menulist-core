'use client'
import { getLocalizedText, getPrimaryLocalizedLanguage } from '@lib/localization/text';
import { getResolvedAnalyticsPreferences } from '@lib/analytics/preferences';
import { getSessionId, refreshSession } from '@lib/analytics/session';
import { trackItemView, trackMenuView, trackProjectSwitch } from '@lib/analytics/unified';
import { StoreDataType } from '@type/platform/store';
import React, { createContext, useCallback, useEffect, useRef } from 'react';

export interface MenuItemViewData {
  itemId: string;
  name: string; // Using 'name' to match existing code patterns
  category?: string;
  categoryId?: string;
  categoryName?: string;
  price?: number;
  currency?: string;
  attributes?: Record<string, string>;
}

interface AnalyticsContextType {
  trackMenuItemView: (data: MenuItemViewData) => void;
}

export const AnalyticsContext = createContext<AnalyticsContextType>({
  trackMenuItemView: () => { },
});

interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  entrySource?: string;
  source?: string;
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
  storeDetails?: StoreDataType;
  projectId?: string;  // Required for project-wise analytics
  // T5-N-01: R5 Layer resolution analytics — 'layer1' for claimed-slug match,
  // 'layer2' for /menu universal alias fallback.
  menuResolutionLayer?: 'layer1' | 'layer2';
}

const getUtmParams = () => {
  if (typeof window === 'undefined') return {};

  const urlParams = new URLSearchParams(window.location.search);
  return {
    utm_source: urlParams.get('utm_source') || '',
    utm_medium: urlParams.get('utm_medium') || '',
    utm_campaign: urlParams.get('utm_campaign') || '',
    entrySource: urlParams.get('entry_source') || '',
    source: urlParams.get('source') || '',
  };
};

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children, storeDetails, projectId, menuResolutionLayer }) => {
  const analyticsPreferences = getResolvedAnalyticsPreferences(storeDetails?.analytics);
  const isEnabled = analyticsPreferences.trackMenuViews;
  const includeLocation = analyticsPreferences.trackLocation;
  const trackedMenuViewKeyRef = useRef<string | null>(null);

  // Keep the session alive while analytics are enabled on the public menu.
  useEffect(() => {
    if (!storeDetails || !isEnabled) return;

    const intervalId = setInterval(() => {
      refreshSession();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [storeDetails, isEnabled]);

  // Track a menu view once per menu/project/location state instead of on every rerender.
  useEffect(() => {
    if (!storeDetails || !isEnabled || !projectId) return;

    try {
      // Ensure we have valid tenant and store IDs
      const tenantId = storeDetails.tenantId || (storeDetails as any).tId;
      const storeId = storeDetails.storeId || (storeDetails as any)._id;
      if (!tenantId || !storeId) return;

      const contentLanguage = storeDetails.defaultLanguage || storeDetails.activeLanguages?.[0] || storeDetails.language || 'en';
      const storeName = getLocalizedText(
        storeDetails.publicPresence?.displayName,
        contentLanguage,
        getPrimaryLocalizedLanguage(storeDetails.publicPresence?.displayName, contentLanguage),
        storeDetails.name || (storeDetails as any).storeName || 'Store Menu'
      );
      const utmParams = getUtmParams();
      const routeKey = typeof window === 'undefined'
        ? ''
        : `${window.location.pathname}${window.location.search}`;
      const trackingKey = [tenantId, storeId, projectId, menuResolutionLayer || 'layer1', routeKey].join('|');

      if (trackedMenuViewKeyRef.current === trackingKey) {
        return;
      }
      trackedMenuViewKeyRef.current = trackingKey;

      // Get the session ID for all tracking events
      const sessionId = getSessionId();

      trackMenuView(storeId, storeName, { sessionId, tenantId, projectId, storeTimeZone: storeDetails.timeZone, menuResolutionLayer, includeLocation, ...utmParams }).catch(error => {
        console.error('Error tracking menu page view:', error);
      });
      // T5-N-04: If resolved via Layer 2 /menu alias, fire a latent PROJECT_SWITCH
      // so we can measure how often customers "switch" via typing /menu vs explicit UI.
      if (menuResolutionLayer === 'layer2') {
        trackProjectSwitch(storeId, projectId, null, 'menu_alias_layer2', {
          sessionId,
          tenantId,
          storeTimeZone: storeDetails.timeZone,
          includeLocation,
          ...utmParams,
        }).catch(error => {
          console.error('Error tracking project switch for Layer 2 alias:', error);
        });
      }
    } catch (error) {
      console.error('Error in analytics tracking setup:', error);
    }
  }, [storeDetails, isEnabled, projectId, menuResolutionLayer, includeLocation]);

  const trackMenuItemView = useCallback((data: MenuItemViewData) => {
    if (!isEnabled || !storeDetails) return;

    try {
      // Ensure we have valid tenant and store IDs
      const tenantId = storeDetails.tenantId || (storeDetails as any).tId;
      const storeId = storeDetails.storeId || (storeDetails as any)._id;

      // Skip tracking if we don't have valid IDs
      if (!tenantId || !storeId) {
        console.warn('Item view tracking skipped: Missing tenant or store ID');
        return;
      }

      // Get the session ID for consistent tracking
      const sessionId = getSessionId();
      const utmParams = getUtmParams();

      trackItemView(data.itemId, data.name, data.categoryName || data.category, data.price, data.currency, {
        sessionId,
        tenantId,
        storeId,
        projectId,
        storeTimeZone: storeDetails.timeZone,
        includeLocation,
        categoryId: data.categoryId,
        categoryName: data.categoryName || data.category,
        ...utmParams,
      })
        .catch(error => {
          console.error('Error tracking specific menu item view:', error);
        });

      // Track in Facebook Pixel if available
      if (typeof window !== 'undefined' && window.fbq) {
        const params = {
          content_ids: [data.itemId],
          content_name: data.name,
          content_category: data.category,
          value: data.price,
          currency: data.currency,
          ...utmParams
        };
        window.fbq('track', 'ViewContent', params);
      }
    } catch (error) {
      console.error('Error in item view tracking:', error);
    }
  }, [isEnabled, storeDetails, projectId, includeLocation]);

  return (
    <AnalyticsContext.Provider value={{ trackMenuItemView }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsProvider;
