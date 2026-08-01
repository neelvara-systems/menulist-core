import { getBoundedAnalyticsStringContext, logAnalyticsFailure } from '@lib/analytics/analyticsDiagnostics';
import {
    getPublicAnalyticsAttributionToken,
    getPublicAnalyticsPath,
    getPublicAnalyticsUrl,
} from '@lib/website/publicAnalyticsContext';

type PlausibleWindow = Window & {
    gtag?: (...args: unknown[]) => void;
    plausible?: PlausibleFunction;
};

type MarketingEventParams = Record<string, string | number | boolean | undefined>;
type PublicWebsiteAnalyticsConsentChoice = 'accepted' | 'declined';
type PublicWebsiteKind = 'answerlattice' | 'menulist';
type PlausibleFunction = ((eventName: string, options?: { interactive?: boolean }) => void) & {
    q?: IArguments[];
};

const MENULIST_ANALYTICS_CONSENT_KEY = 'menulist_website_analytics_consent_v1';
const ANSWERLATTICE_ANALYTICS_CONSENT_KEY = 'answerlattice_website_analytics_consent_v1';
const DEFAULT_MARKETING_EVENT_PARAM_MAX_LENGTH = 160;
const MARKETING_EVENT_PARAM_MAX_LENGTH_BY_KEY: Record<string, number> = {
    destination: 320,
    entry_page: 320,
    link_url: 320,
    page_path: 320,
    target_url: 320,
    utm_medium: 80,
    utm_source: 80,
};
const PUBLIC_ANALYTICS_URL_PARAM_KEYS = new Set(['destination', 'link_url', 'target_url']);
const PUBLIC_ANALYTICS_PATH_PARAM_KEYS = new Set(['entry_page', 'page_path']);
const PUBLIC_ANALYTICS_ATTRIBUTION_PARAM_KEYS = new Set([
    'referrer_group',
    'utm_medium',
    'utm_source',
]);
const OMITTED_PUBLIC_ANALYTICS_PARAM_KEYS = new Set(['referrer', 'referrer_host']);
const reportedPlausibleConsentStorageFailures = new Set<string>();
const runtimeConsentByWebsite: Partial<Record<PublicWebsiteKind, PublicWebsiteAnalyticsConsentChoice>> = {};
const MAX_PLAUSIBLE_SCRIPT_SOURCE_LENGTH = 2048;

export function normalizePlausibleScriptSource(value: unknown): string | undefined {
    if (typeof value !== 'string' || !value || value.length > MAX_PLAUSIBLE_SCRIPT_SOURCE_LENGTH) {
        return undefined;
    }

    try {
        if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) {
            const relativeUrl = new URL(value, 'https://public-analytics.invalid');
            return `${relativeUrl.pathname}${relativeUrl.search}`;
        }
        const url = new URL(value);
        if (url.protocol !== 'https:' || url.username || url.password) return undefined;
        return url.toString();
    } catch {
        return undefined;
    }
}

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

function normalizeMarketingEventStringParam(key: string, value: string): string | undefined {
    if (OMITTED_PUBLIC_ANALYTICS_PARAM_KEYS.has(key)) return undefined;
    if (PUBLIC_ANALYTICS_URL_PARAM_KEYS.has(key)) return getPublicAnalyticsUrl(value);
    if (PUBLIC_ANALYTICS_PATH_PARAM_KEYS.has(key)) return getPublicAnalyticsPath(value);
    if (PUBLIC_ANALYTICS_ATTRIBUTION_PARAM_KEYS.has(key)) {
        return getPublicAnalyticsAttributionToken(value);
    }

    const boundedValue = stripAnalyticsControlCharacters(value)
        .slice(0, getMarketingEventParamMaxLength(key));
    return boundedValue || undefined;
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

            const boundedValue = normalizeMarketingEventStringParam(key, value);
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

function getActivePublicWebsiteKind(): PublicWebsiteKind {
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

export function setPublicWebsiteAnalyticsRuntimeConsent(
    choice: PublicWebsiteAnalyticsConsentChoice,
): void {
    if (typeof window === 'undefined') return;
    runtimeConsentByWebsite[getActivePublicWebsiteKind()] = choice;
}

export function hasAcceptedPublicWebsiteAnalyticsConsent(): boolean {
    if (typeof window === 'undefined') return false;
    const websiteKind = getActivePublicWebsiteKind();
    const runtimeChoice = runtimeConsentByWebsite[websiteKind];
    if (runtimeChoice) return runtimeChoice === 'accepted';

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
    if (!hasAcceptedPublicWebsiteAnalyticsConsent()) return;

    const normalizedEventName = normalizeEventName(eventName);
    if (!normalizedEventName) return;

    const analyticsWindow = window as PlausibleWindow;
    getOrCreatePlausibleQueue(analyticsWindow)(normalizedEventName);
}

export function trackGoogleMarketingEvent(
    eventName?: string | null,
    params?: MarketingEventParams,
) {
    if (typeof window === 'undefined') return;
    if (!hasAcceptedPublicWebsiteAnalyticsConsent()) return;

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
