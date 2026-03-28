'use client'
import { getSessionId, refreshSession } from '@lib/analytics/session';
import { trackItemView, trackMenuView } from '@lib/analytics/unified';
import { StoreDataType } from '@type/platform/store';
import React, { createContext, useCallback, useEffect } from 'react';

export interface MenuItemViewData {
  itemId: string;
  name: string; // Using 'name' to match existing code patterns
  category?: string;
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
}

interface AnalyticsProviderProps {
  children: React.ReactNode;
  storeDetails?: StoreDataType;
  projectId?: string;  // Required for project-wise analytics
}

const getUtmParams = () => {
  if (typeof window === 'undefined') return {};

  const urlParams = new URLSearchParams(window.location.search);
  return {
    utm_source: urlParams.get('utm_source') || '',
    utm_medium: urlParams.get('utm_medium') || '',
    utm_campaign: urlParams.get('utm_campaign') || ''
  };
};

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({ children, storeDetails, projectId }) => {
  const isEnabled = storeDetails?.analytics?.trackMenuViews;
  const utmParams: UtmParams = getUtmParams();

  console.log("AnalyticsProvider:storeDetails", storeDetails);
  // Track both general page view and menu-specific view on component mount
  useEffect(() => {
    if (!storeDetails) return;

    try {
      // Ensure we have valid tenant and store IDs
      const tenantId = storeDetails.tenantId || (storeDetails as any).tId;
      const storeId = storeDetails.storeId || (storeDetails as any)._id;
      const storeName = storeDetails.name || (storeDetails as any).storeName || 'Store Menu';

      // Get the session ID for all tracking events
      const sessionId = getSessionId();

      // Track the menu-specific view (Firebase + GA4 via trackEvent)
      // projectId is REQUIRED for project-wise analytics storage
      if (isEnabled && projectId) {
        trackMenuView(storeId, storeName, { sessionId, tenantId, projectId, ...utmParams }).catch(error => {
          console.error('Error tracking menu page view:', error);
        });
      }
    } catch (error) {
      console.error('Error in analytics tracking setup:', error);
    }

    // Refresh session on page view
    const intervalId = setInterval(() => {
      // Refresh session every 5 minutes while the page is open
      refreshSession();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [storeDetails, utmParams]);

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

      trackItemView(data.itemId, data.name, data.category, data.price, data.currency, { sessionId, tenantId, storeId, projectId, ...utmParams })
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
  }, [isEnabled, storeDetails]);

  return (
    <AnalyticsContext.Provider value={{ trackMenuItemView }}>
      {children}
    </AnalyticsContext.Provider>
  );
};

export default AnalyticsProvider;
