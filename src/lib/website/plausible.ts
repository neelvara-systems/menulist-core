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

function normalizeEventName(eventName?: string | null): string | undefined {
    const normalized = eventName?.trim();
    return normalized || undefined;
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

function hasAcceptedPublicWebsiteAnalyticsConsent(): boolean {
    try {
        return window.localStorage.getItem(getActivePublicWebsiteConsentKey()) === 'accepted';
    } catch {
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

    analyticsWindow.gtag('event', normalizedEventName, params);
}

export function trackWebsiteMarketingEvent(
    eventName?: string | null,
    params?: MarketingEventParams,
) {
    trackPlausibleEvent(eventName);
    trackGoogleMarketingEvent(eventName, params);
}
