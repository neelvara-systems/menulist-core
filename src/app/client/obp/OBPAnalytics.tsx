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
import { getBusinessAnalyticsDateKey } from '@lib/analytics/businessDay';
import { trackOBPLanguageAdoption, trackOBPView } from '@lib/analytics/unified';
import { useEffect } from 'react';

const OBP_LANGUAGE_STORAGE_PREFIX = 'menulist_obp_language_v1';

interface OBPAnalyticsProps {
    tenantId: number;
    storeId: number;
    storeTimeZone?: string;
    businessDayEndTime?: string;
    trackViews?: boolean;
    includeLocation?: boolean;
    activeLanguage?: string;
    activeLanguageName?: string;
    trackLanguageUsage?: boolean;
}

export default function OBPAnalytics({
    tenantId,
    storeId,
    storeTimeZone,
    businessDayEndTime,
    trackViews = true,
    includeLocation = true,
    activeLanguage,
    activeLanguageName,
    trackLanguageUsage = false,
}: OBPAnalyticsProps) {
    useEffect(() => {
        if (!trackViews || !tenantId || !storeId) return;

        try {
            const sessionId = getSessionId();

            const urlParams = new URLSearchParams(window.location.search);
            const utm_source = urlParams.get('utm_source') || undefined;
            const utm_medium = urlParams.get('utm_medium') || undefined;
            const utm_campaign = urlParams.get('utm_campaign') || undefined;
            const entrySource = urlParams.get('entry_source') || undefined;

            trackOBPView(storeId, {
                tenantId,
                sessionId,
                storeTimeZone,
                businessDayEndTime,
                includeLocation,
                utm_source,
                utm_medium,
                utm_campaign,
                entrySource,
                obpLanguage: trackLanguageUsage ? activeLanguage : undefined,
                obpLanguageName: trackLanguageUsage ? activeLanguageName : undefined,
            }).catch(err => {
                console.error('OBP view tracking failed:', err);
            });
        } catch (error) {
            console.error('OBP analytics setup failed:', error);
        }
    }, [tenantId, storeId, storeTimeZone, businessDayEndTime, trackViews, includeLocation, activeLanguage, activeLanguageName, trackLanguageUsage]);

    useEffect(() => {
        if (!trackViews || !trackLanguageUsage || !tenantId || !storeId || !activeLanguage) return;
        if (typeof window === 'undefined') return;

        const localDate = getBusinessAnalyticsDateKey(new Date(), storeTimeZone, businessDayEndTime);
        const storageKey = `${OBP_LANGUAGE_STORAGE_PREFIX}|${tenantId}|${storeId}|${localDate}`;
        let previousLanguage: string | null = null;
        try {
            previousLanguage = window.sessionStorage.getItem(storageKey);
            window.sessionStorage.setItem(storageKey, activeLanguage);
        } catch {
            previousLanguage = null;
        }

        if (!previousLanguage || previousLanguage === activeLanguage) return;

        const timerId = window.setTimeout(() => {
            try {
                const sessionId = getSessionId();
                const urlParams = new URLSearchParams(window.location.search);
                void trackOBPLanguageAdoption(storeId, activeLanguage, previousLanguage || undefined, {
                    tenantId,
                    sessionId,
                    storeTimeZone,
                    businessDayEndTime,
                    includeLocation,
                    obpLanguageName: activeLanguageName,
                    utm_source: urlParams.get('utm_source') || undefined,
                    utm_medium: urlParams.get('utm_medium') || undefined,
                    utm_campaign: urlParams.get('utm_campaign') || undefined,
                    entrySource: urlParams.get('entry_source') || undefined,
                });
            } catch (error) {
                console.error('OBP language adoption tracking failed:', error);
            }
        }, 10000);

        return () => window.clearTimeout(timerId);
    }, [tenantId, storeId, storeTimeZone, businessDayEndTime, trackViews, includeLocation, activeLanguage, activeLanguageName, trackLanguageUsage]);

    return null;
}
