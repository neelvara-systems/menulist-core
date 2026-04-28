'use client';

/**
 * OBP Analytics — Client Island for Page View Tracking
 * 
 * Tiny client component embedded in the server-rendered OBP page.
 * Fires OBP_VIEW on mount. Action click tracking is handled by OBPActions.tsx.
 * Uses projectId='obp' as virtual project for analytics storage.
 * 
 * @see __docs__/official-business-page/official-business-page_impl.md
 */

import { getSessionId } from '@lib/analytics/session';
import { trackOBPView } from '@lib/analytics/unified';
import { useEffect } from 'react';

interface OBPAnalyticsProps {
    tenantId: number;
    storeId: number;
    trackViews?: boolean;
    includeLocation?: boolean;
}

export default function OBPAnalytics({ tenantId, storeId, trackViews = true, includeLocation = true }: OBPAnalyticsProps) {
    useEffect(() => {
        if (!trackViews || !tenantId || !storeId) return;

        try {
            const sessionId = getSessionId();

            const urlParams = new URLSearchParams(window.location.search);
            const utm_source = urlParams.get('utm_source') || undefined;
            const utm_medium = urlParams.get('utm_medium') || undefined;
            const utm_campaign = urlParams.get('utm_campaign') || undefined;

            trackOBPView(storeId, {
                tenantId,
                sessionId,
                includeLocation,
                utm_source,
                utm_medium,
                utm_campaign,
            }).catch(err => {
                console.error('OBP view tracking failed:', err);
            });
        } catch (error) {
            console.error('OBP analytics setup failed:', error);
        }
    }, [tenantId, storeId, trackViews]);

    return null;
}
