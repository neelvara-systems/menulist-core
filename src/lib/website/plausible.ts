import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';

type PlausibleWindow = Window & {
    gtag?: (...args: unknown[]) => void;
    plausible?: PlausibleFunction;
};

type MarketingEventParams = Record<string, string | number | boolean | undefined>;
type PlausibleFunction = ((eventName: string, options?: { interactive?: boolean }) => void) & {
    q?: IArguments[];
};

const MENULIST_ANALYTICS_CONSENT_KEY = 'menulist_website_analytics_consent_v1';
const ANSWERLATTICE_ANALYTICS_CONSENT_KEY = 'answerlattice_website_analytics_consent_v1';
const DEFAULT_MARKETING_EVENT_PARAM_MAX_LENGTH = 160;
const MARKETING_EVENT_PARAM_MAX_LENGTH_BY_KEY: Record<string, number> = {
    entry_page: 320,
    link_url: 320,
    referrer: 300,
    target_url: 320,
    utm_medium: 80,
    utm_source: 80,
};
const reportedPlausibleConsentStorageFailures = new Set<string>();

function normalizeEventName(eventName?: string | null): string | undefined {
    const normalized = eventName?.trim();
    return normalized || undefined;
}

function stripAnalyticsControlCharacters(value: string): string {
    return value.replace(/[\x00-\x1F\x7F]/g, '').trim();
}

function getMarketingEventParamMaxLength(key: string): number {
    return MARKETING_EVENT_PARAM_MAX_LENGTH_BY_KEY[key] || DEFAULT_MARKETING_EVENT_PARAM_MAX_LENGTH;
}

export function getBoundedMarketingEventParams(
    params?: MarketingEventParams,
): MarketingEventParams | undefined {
    if (!params) return undefined;

    const boundedEntries = Object.entries(params)
        .map(([key, value]) => {
            if (value === undefined) return null;
            if (typeof value === 'boolean') return [key, value] as const;
            if (typeof value === 'number') {
                return Number.isFinite(value) ? ([key, value] as const) : null;
            }

            const boundedValue = stripAnalyticsControlCharacters(value)
                .slice(0, getMarketingEventParamMaxLength(key));
            return boundedValue ? ([key, boundedValue] as const) : null;
        })
        .filter((entry): entry is readonly [string, string | number | boolean] => Boolean(entry));

    return boundedEntries.length
        ? Object.fromEntries(boundedEntries)
        : undefined;
}

function isAnswerlatticePublicWebsite(): boolean {
    const hostname = window.location.hostname.replace(/^www\./, '');
    const pathname = window.location.pathname;

    return hostname.includes('answerlattice') || pathname.startsWith('/__answerlattice');
}

function hasPlausibleAnalyticsForActiveWebsite(): boolean {
    return isAnswerlatticePublicWebsite()
        ? Boolean(process.env.NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN)
        : Boolean(process.env.NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN);
}

function getActivePublicWebsiteConsentKey(): string {
    if (isAnswerlatticePublicWebsite()) {
        return ANSWERLATTICE_ANALYTICS_CONSENT_KEY;
    }

    return MENULIST_ANALYTICS_CONSENT_KEY;
}

function getActivePublicWebsiteKind(): 'answerlattice' | 'menulist' {
    return isAnswerlatticePublicWebsite() ? 'answerlattice' : 'menulist';
}

function logPlausibleConsentStorageFailure(error: unknown, consentKey: string) {
    const siteKind = getActivePublicWebsiteKind();
    const shapeKey = `${siteKind}:${consentKey.length}`;
    if (reportedPlausibleConsentStorageFailures.has(shapeKey)) return;
    reportedPlausibleConsentStorageFailures.add(shapeKey);

    logAnalyticsFailure('public_website_plausible_consent_read_failed', error, {
        fallbackPolicy: 'skip_plausible_event_until_consent_known',
        siteKind,
        ...getBoundedAnalyticsStringContext('consentKey', consentKey),
    });
}

function hasAcceptedPublicWebsiteAnalyticsConsent(): boolean {
    const consentKey = getActivePublicWebsiteConsentKey();

    try {
        return window.localStorage.getItem(consentKey) === 'accepted';
    } catch (error) {
        logPlausibleConsentStorageFailure(error, consentKey);
        return false;
    }
}

function getOrCreatePlausibleQueue(analyticsWindow: PlausibleWindow): PlausibleFunction {
    if (typeof analyticsWindow.plausible === 'function') {
        return analyticsWindow.plausible;
    }

    const plausibleQueue = function plausibleQueue() {
        const queueFn = plausibleQueue as PlausibleFunction;
        queueFn.q = queueFn.q || [];
        queueFn.q.push(arguments);
    } as PlausibleFunction;

    analyticsWindow.plausible = plausibleQueue;
    return plausibleQueue;
}

export function trackPlausibleEvent(eventName?: string | null) {
    if (typeof window === 'undefined') return;
    if (process.env.NODE_ENV === 'development') return;
    if (!hasPlausibleAnalyticsForActiveWebsite()) return;

    const normalizedEventName = normalizeEventName(eventName);
    if (!normalizedEventName) return;

    const analyticsWindow = window as PlausibleWindow;
    if (typeof analyticsWindow.plausible !== 'function' && !hasAcceptedPublicWebsiteAnalyticsConsent()) {
        return;
    }

    getOrCreatePlausibleQueue(analyticsWindow)(normalizedEventName);
}

export function trackGoogleMarketingEvent(
    eventName?: string | null,
    params?: MarketingEventParams,
) {
    if (typeof window === 'undefined') return;

    const normalizedEventName = normalizeEventName(eventName);
    if (!normalizedEventName) return;

    const analyticsWindow = window as PlausibleWindow;
    if (typeof analyticsWindow.gtag !== 'function') return;

    const boundedParams = getBoundedMarketingEventParams(params);
    analyticsWindow.gtag('event', normalizedEventName, boundedParams);
}

export function trackWebsiteMarketingEvent(
    eventName?: string | null,
    params?: MarketingEventParams,
) {
    trackPlausibleEvent(eventName);
    trackGoogleMarketingEvent(eventName, params);
}
