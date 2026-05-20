'use client'

import { FEATURE_FLAGS } from '@config/features';
import { APP_THEME_COLOR } from '@constant/common';
import { PRODUCT_IDS } from '@constant/product';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';

const WIDGET_SCRIPT_ID = 'menulist-canonica-widget-test-script';
const WIDGET_LAUNCHER_ID = 'canonica-widget-launcher';
const WIDGET_CONTAINER_ID = 'canonica-widget-container';
const WIDGET_KEY_CACHE_PREFIX = 'canonica-widget-test-key';

type WidgetKeyPayload = {
    apiKey: string;
    keyPrefix?: string;
    widgetScriptSrc?: string;
};

const normalizeContextPart = (value: string, fallback: string) => {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80);

    return normalized || fallback;
};

const workflowByTopLevelRoute: Record<string, string> = {
    billing: 'manage_billing',
    dashboard: 'review_dashboard',
    feedback: 'review_feedback',
    locations: 'manage_locations',
    projects: 'manage_menu',
    'qr-code': 'share_qr_code',
    qrCode: 'share_qr_code',
    today: 'review_today',
    transactions: 'review_transactions',
    users: 'manage_team',
    'use-menulist': 'use_menulist',
};

const cleanupWidgetDom = () => {
    document.getElementById(WIDGET_SCRIPT_ID)?.remove();
    document.getElementById(WIDGET_LAUNCHER_ID)?.remove();
    document.getElementById(WIDGET_CONTAINER_ID)?.remove();

    const widgetWindow = window as any;
    delete widgetWindow.CanonicaWidget;
    delete widgetWindow.__canonicaWidget;
};

const getCachedWidgetKey = (cacheKey: string): WidgetKeyPayload | null => {
    try {
        const parsed = JSON.parse(window.sessionStorage.getItem(cacheKey) || 'null');
        if (!parsed || typeof parsed.apiKey !== 'string' || !parsed.apiKey.startsWith('cn_')) return null;
        return {
            apiKey: parsed.apiKey,
            keyPrefix: typeof parsed.keyPrefix === 'string' ? parsed.keyPrefix : undefined,
            widgetScriptSrc: typeof parsed.widgetScriptSrc === 'string' ? parsed.widgetScriptSrc : undefined,
        };
    } catch {
        return null;
    }
};

const cacheWidgetKey = (cacheKey: string, payload: WidgetKeyPayload) => {
    try {
        window.sessionStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
        // Session cache is an optimization only; widget mounting still works without it.
    }
};

const applyContextAttributes = (
    script: HTMLScriptElement,
    context: {
        entityHints: string[];
        feature: string;
        page: string;
        userRole?: string;
        workflow: string;
    },
) => {
    script.setAttribute('data-feature', context.feature);
    script.setAttribute('data-page', context.page);
    script.setAttribute('data-workflow', context.workflow);
    script.setAttribute('data-entity-hints', context.entityHints.join(','));

    if (context.userRole) {
        script.setAttribute('data-user-role', context.userRole);
    } else {
        script.removeAttribute('data-user-role');
    }
};

export default function MenuListCanonicaWidgetTestHost() {
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [scriptReady, setScriptReady] = useState(false);
    const activeStoreId = storeDetails?.storeId || (session?.user as any)?.storeId || (session as any)?.sId;
    const sourceProductId = (session as any)?.pId
        || (session?.user as any)?.pId
        || (session?.user as any)?.productId
        || PRODUCT_IDS.MENULIST;
    const lastMountedStoreRef = useRef<string | number | null>(null);
    const lastContextPageRef = useRef<string | null>(null);

    const shouldLoadWidget = Boolean(
        FEATURE_FLAGS.ENABLE_MENULIST_CANONICA_WIDGET_TEST_HOST
        && status === 'authenticated'
        && sourceProductId === PRODUCT_IDS.MENULIST
        && activeStoreId
        && !pathname.startsWith('/widget')
        && !pathname.startsWith('/canonica')
        && !pathname.startsWith('/help-center')
    );

    const productContext = useMemo(() => {
        const segments = pathname.split('/').filter(Boolean);
        const topLevel = segments[0] || 'dashboard';
        const secondLevel = segments[1] || 'home';
        const normalizedTopLevel = normalizeContextPart(topLevel, 'dashboard');
        const normalizedSecondLevel = normalizeContextPart(secondLevel, 'home');
        const role = (session?.user as any)?.role || (session as any)?.role;

        return {
            contextVersion: 1,
            entityHints: ['menulist', 'owner_app', normalizedTopLevel, normalizedSecondLevel],
            feature: `menulist_${normalizedTopLevel}`,
            page: `menulist_${normalizedTopLevel}_${normalizedSecondLevel}`,
            userRole: role ? normalizeContextPart(String(role), 'owner') : undefined,
            workflow: workflowByTopLevelRoute[topLevel] || `use_${normalizedTopLevel}`,
        };
    }, [pathname, session]);

    useEffect(() => {
        if (!shouldLoadWidget) {
            cleanupWidgetDom();
            lastMountedStoreRef.current = null;
            lastContextPageRef.current = null;
            setScriptReady(false);
            return;
        }

        let cancelled = false;
        const storeKey = String(activeStoreId);
        const keyCacheKey = `${WIDGET_KEY_CACHE_PREFIX}:${storeKey}:${window.location.origin}`;
        if (lastMountedStoreRef.current === storeKey && document.getElementById(WIDGET_SCRIPT_ID)) {
            return;
        }

        cleanupWidgetDom();
        setScriptReady(false);
        lastMountedStoreRef.current = storeKey;

        const mountWidget = async () => {
            try {
                let data = getCachedWidgetKey(keyCacheKey);
                if (!data) {
                    const response = await fetch('/api/canonica/menulist-widget-test-key', {
                        cache: 'no-store',
                        credentials: 'same-origin',
                        method: 'POST',
                    });
                    data = await response.json().catch(() => null);
                    if (!response.ok || !data?.apiKey || cancelled) {
                        if (!cancelled) {
                            console.warn('[Canonica Widget Test Host] Unable to resolve widget key');
                        }
                        return;
                    }
                    cacheWidgetKey(keyCacheKey, data);
                } else if (cancelled) {
                    return;
                }

                const script = document.createElement('script');
                script.id = WIDGET_SCRIPT_ID;
                script.async = true;
                script.src = data.widgetScriptSrc || '/widget/canonica-widget.js';
                script.setAttribute('data-api-key', data.apiKey);
                script.setAttribute('data-accent-color', APP_THEME_COLOR);
                script.setAttribute('data-display', 'icon');
                script.setAttribute('data-label', '?');
                script.setAttribute('data-position', 'bottom-right');
                script.setAttribute('data-size', 'medium');
                script.setAttribute('data-offset-y', '84');
                script.setAttribute('data-history', 'session');
                applyContextAttributes(script, productContext);
                script.onload = () => {
                    if (!cancelled) {
                        setScriptReady(true);
                    }
                };
                script.onerror = () => {
                    if (!cancelled) {
                        console.warn('[Canonica Widget Test Host] Widget script failed to load');
                    }
                };

                document.body.appendChild(script);
            } catch {
                if (!cancelled) {
                    console.warn('[Canonica Widget Test Host] Widget test host failed to mount');
                }
            }
        };

        void mountWidget();

        return () => {
            cancelled = true;
            cleanupWidgetDom();
            lastMountedStoreRef.current = null;
            lastContextPageRef.current = null;
            setScriptReady(false);
        };
    }, [activeStoreId, shouldLoadWidget]);

    useEffect(() => {
        if (!scriptReady || !shouldLoadWidget) return;

        const widget = (window as any).CanonicaWidget;
        const script = document.getElementById(WIDGET_SCRIPT_ID);
        if (script instanceof HTMLScriptElement) {
            applyContextAttributes(script, productContext);
        }

        const previousPage = lastContextPageRef.current;
        if (previousPage && previousPage !== productContext.page && widget?.clearHistory) {
            widget.clearHistory();
        }
        lastContextPageRef.current = productContext.page;

        if (widget?.page) {
            widget.page(productContext);
        } else if (widget?.setContext) {
            widget.setContext(productContext);
        }
    }, [productContext, scriptReady, shouldLoadWidget]);

    return null;
}
