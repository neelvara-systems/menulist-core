'use client'
import { StoreDataType } from '@type/platform/store';
import { useEffect, type ReactNode } from 'react';

interface EnhancedEcommerceProps {
    storeDetails?: StoreDataType;
}

/**
 * EnhancedEcommerce component
 * 
 * This component initializes enhanced ecommerce tracking for Google Analytics 4.
 * It doesn't provide any UI, just sets up the necessary configuration when mounted.
 * 
 * Note: All ecommerce tracking events should be handled through the unified analytics
 * system in src/lib/analytics/unified.ts rather than using separate tracking functions.
 */
const EnhancedEcommerce = ({ storeDetails }: EnhancedEcommerceProps): ReactNode => {
    const isEnabled = storeDetails?.analytics?.enhancedEcommerce && storeDetails?.analytics?.googleAnalyticsId;

    useEffect(() => {
        if (isEnabled && typeof window.gtag === 'function') {
            // Enable enhanced ecommerce tracking
            window.gtag('set', 'allow_enhanced_conversions', true);
        }
    }, [isEnabled]);

    return null; // This is a utility component, no UI needed
};

export default EnhancedEcommerce;
// Note: All ecommerce tracking events have been moved to the unified analytics system
// For tracking ecommerce events, import and use functions from src/lib/analytics/unified.ts
// Example: import { trackViewItem, trackAddToCart, trackPurchase } from '@lib/analytics/unified';
