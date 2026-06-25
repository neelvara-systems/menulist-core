type PlausibleWindow = Window & {
    gtag?: (...args: unknown[]) => void;
    plausible?: PlausibleFunction;
};

type MarketingEventParams = Record<string, string | number | boolean | undefined>;
type PlausibleFunction = ((eventName: string, options?: { interactive?: boolean }) => void) & {
    q?: IArguments[];
};

const PUBLIC_WEBSITE_ANALYTICS_CONSENT_KEYS = [
    'menulist_website_analytics_consent_v1',
    'answerlattice_website_analytics_consent_v1',
];

const HAS_PLAUSIBLE_WEBSITE_ANALYTICS = Boolean(
    process.env.NEXT_PUBLIC_MENULIST_PLAUSIBLE_DOMAIN ||
    process.env.NEXT_PUBLIC_ANSWERLATTICE_PLAUSIBLE_DOMAIN,
);

function normalizeEventName(eventName?: string | null): string | undefined {
    const normalized = eventName?.trim();
    return normalized || undefined;
}

function hasAcceptedPublicWebsiteAnalyticsConsent(): boolean {
    try {
        return PUBLIC_WEBSITE_ANALYTICS_CONSENT_KEYS.some((storageKey) => (
            window.localStorage.getItem(storageKey) === 'accepted'
        ));
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
    if (!HAS_PLAUSIBLE_WEBSITE_ANALYTICS) return;

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
