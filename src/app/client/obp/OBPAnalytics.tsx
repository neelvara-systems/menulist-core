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
import { secureError } from '@lib/security/secureLogger';
import { useEffect } from 'react';

const OBP_LANGUAGE_STORAGE_PREFIX = 'menulist_obp_language_v1';
type OBPAnalyticsFailureType = 'view_tracking' | 'setup' | 'language_adoption';

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

const buildOBPAnalyticsLogContext = (
    failureType: OBPAnalyticsFailureType,
    metadata: {
        tenantId?: number | null;
        storeId?: number | null;
        activeLanguage?: string | null;
        previousLanguage?: string | null;
        includeLocation?: boolean;
        hasStoreTimeZone?: boolean;
        hasBusinessDayEndTime?: boolean;
        error?: unknown;
    },
) => {
    const tenantId = String(metadata.tenantId ?? '').trim();
    const storeId = String(metadata.storeId ?? '').trim();
    const activeLanguage = String(metadata.activeLanguage ?? '').trim();
    const previousLanguage = String(metadata.previousLanguage ?? '').trim();

    return {
        failureType,
        tenantIdPresent: Boolean(tenantId),
        tenantIdLength: tenantId.length,
        storeIdPresent: Boolean(storeId),
        storeIdLength: storeId.length,
        activeLanguagePresent: Boolean(activeLanguage),
        activeLanguageLength: activeLanguage.length,
        previousLanguagePresent: Boolean(previousLanguage),
        previousLanguageLength: previousLanguage.length,
        includeLocation: Boolean(metadata.includeLocation),
        hasStoreTimeZone: Boolean(metadata.hasStoreTimeZone),
        hasBusinessDayEndTime: Boolean(metadata.hasBusinessDayEndTime),
        errorName: metadata.error instanceof Error ? metadata.error.name : typeof metadata.error,
    };
};

const logOBPAnalyticsFailure = (
    failureType: OBPAnalyticsFailureType,
    metadata: Parameters<typeof buildOBPAnalyticsLogContext>[1],
) => {
    secureError(
        '[OBP Analytics] Tracking failed',
        new Error(`obp_analytics_${failureType}`),
        buildOBPAnalyticsLogContext(failureType, metadata),
    );
};

export default function OBPAnalytics({
    tenantId,
    storeId,
    storeTimeZone,
    businessDayEndTime,
    trackViews = true,
    includeLocation = false,
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
            const utm_content = urlParams.get('utm_content') || undefined;
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
                utm_content,
                entrySource,
                obpLanguage: trackLanguageUsage ? activeLanguage : undefined,
                obpLanguageName: trackLanguageUsage ? activeLanguageName : undefined,
            }).catch(err => {
                logOBPAnalyticsFailure('view_tracking', {
                    tenantId,
                    storeId,
                    activeLanguage,
                    includeLocation,
                    hasStoreTimeZone: Boolean(storeTimeZone),
                    hasBusinessDayEndTime: Boolean(businessDayEndTime),
                    error: err,
                });
            });
        } catch (error) {
            logOBPAnalyticsFailure('setup', {
                tenantId,
                storeId,
                activeLanguage,
                includeLocation,
                hasStoreTimeZone: Boolean(storeTimeZone),
                hasBusinessDayEndTime: Boolean(businessDayEndTime),
                error,
            });
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
                    utm_content: urlParams.get('utm_content') || undefined,
                    entrySource: urlParams.get('entry_source') || undefined,
                }).catch((error) => {
                    logOBPAnalyticsFailure('language_adoption', {
                        tenantId,
                        storeId,
                        activeLanguage,
                        previousLanguage,
                        includeLocation,
                        hasStoreTimeZone: Boolean(storeTimeZone),
                        hasBusinessDayEndTime: Boolean(businessDayEndTime),
                        error,
                    });
                });
            } catch (error) {
                logOBPAnalyticsFailure('language_adoption', {
                    tenantId,
                    storeId,
                    activeLanguage,
                    previousLanguage,
                    includeLocation,
                    hasStoreTimeZone: Boolean(storeTimeZone),
                    hasBusinessDayEndTime: Boolean(businessDayEndTime),
                    error,
                });
            }
        }, 10000);

        return () => window.clearTimeout(timerId);
    }, [tenantId, storeId, storeTimeZone, businessDayEndTime, trackViews, includeLocation, activeLanguage, activeLanguageName, trackLanguageUsage]);

    return null;
}
