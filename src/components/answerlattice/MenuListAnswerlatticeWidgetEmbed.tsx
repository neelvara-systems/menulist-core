'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { AnswerlatticePageContext } from '../../../packages/answerlattice-web/src';

const MENULIST_ANSWERLATTICE_WIDGET_KEY = process.env.NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY?.trim() || '';
const CONFIGURED_SCRIPT_SRC = process.env.NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC?.trim() || '';
const MOBILE_WIDGET_MEDIA_QUERY = '(max-width: 767px), (pointer: coarse)';

const BLOCKED_ROUTES = [
    '/help-center',
    '/help-center/*',
    '/answerlattice',
    '/answerlattice/*',
    '/__answerlattice',
    '/__answerlattice/*',
];

const routeFeatureMap: Record<string, { feature: string; workflow: string; entityHints: string[] }> = {
    projects: { feature: 'projects', workflow: 'manage_menu', entityHints: ['menu', 'project', 'public_menu'] },
    today: { feature: 'today', workflow: 'review_daily_actions', entityHints: ['today', 'business_status'] },
    users: { feature: 'users', workflow: 'manage_staff', entityHints: ['staff', 'permissions'] },
    feedback: { feature: 'feedback', workflow: 'review_customer_feedback', entityHints: ['feedback', 'reviews'] },
    'business-settings': { feature: 'business_settings', workflow: 'manage_business_profile', entityHints: ['business_profile', 'store_settings'] },
    transactions: { feature: 'transactions', workflow: 'review_billing_activity', entityHints: ['billing', 'transactions'] },
    locations: { feature: 'locations', workflow: 'manage_locations', entityHints: ['outlets', 'locations'] },
    billing: { feature: 'billing', workflow: 'manage_subscription', entityHints: ['subscription', 'plan'] },
    reseller: { feature: 'reseller', workflow: 'manage_reseller_accounts', entityHints: ['reseller', 'accounts'] },
};

function normalizePathname(pathname: string | null): string {
    if (!pathname) return '/';
    const withoutQuery = pathname.split(/[?#]/)[0] || '/';
    const normalized = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
    return normalized.length > 1 && normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function isBlockedRoute(pathname: string): boolean {
    return BLOCKED_ROUTES.some((route) => {
        if (route.endsWith('/*')) {
            const base = route.slice(0, -2);
            return pathname === base || pathname.startsWith(`${base}/`);
        }
        return pathname === route;
    });
}

function resolveWidgetScriptSrc(): string {
    if (CONFIGURED_SCRIPT_SRC) return CONFIGURED_SCRIPT_SRC;
    if (typeof window === 'undefined') return 'https://answerlattice.com/widget/v1/answerlattice-widget.js';

    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${origin}/widget/v1/answerlattice-widget.js`;
    }
    if (hostname === 'menulist.online' || hostname.endsWith('.vercel.app')) {
        return 'https://answerlattice.menulist.online/widget/v1/answerlattice-widget.js';
    }
    return 'https://answerlattice.com/widget/v1/answerlattice-widget.js';
}

function buildPageContext(pathname: string): AnswerlatticePageContext {
    const [firstSegment = 'dashboard', secondSegment] = pathname
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean);
    const routeKey = firstSegment || 'dashboard';
    const routeConfig = routeFeatureMap[routeKey] || {
        feature: routeKey.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'dashboard',
        workflow: 'use_dashboard',
        entityHints: [routeKey || 'dashboard'],
    };

    return {
        contextVersion: 1,
        contextKey: `menulist_owner_${routeKey}${secondSegment ? `_${secondSegment}` : ''}`,
        feature: routeConfig.feature,
        page: routeKey,
        workflow: routeConfig.workflow,
        userRole: 'owner',
        entityHints: routeConfig.entityHints,
    };
}

export default function MenuListAnswerlatticeWidgetEmbed() {
    const pathname = normalizePathname(usePathname());
    const [runtimeState, setRuntimeState] = useState({ ready: false, mobile: false });
    const scriptSrc = useMemo(() => resolveWidgetScriptSrc(), []);
    const blockedRoute = isBlockedRoute(pathname);
    const shouldSuppressWidget = blockedRoute || runtimeState.mobile;
    const pageContext = useMemo(() => buildPageContext(pathname), [pathname]);

    useEffect(() => {
        const mediaQuery = window.matchMedia(MOBILE_WIDGET_MEDIA_QUERY);
        const syncRuntimeState = () => {
            setRuntimeState({
                ready: true,
                mobile: mediaQuery.matches,
            });
        };

        syncRuntimeState();
        mediaQuery.addEventListener('change', syncRuntimeState);

        return () => {
            mediaQuery.removeEventListener('change', syncRuntimeState);
        };
    }, []);

    useEffect(() => {
        if (!MENULIST_ANSWERLATTICE_WIDGET_KEY || !runtimeState.ready) return;

        if (shouldSuppressWidget) {
            window.AnswerlatticeWidget?.hide?.();
            window.AnswerlatticeWidget?.close?.();
            window.AnswerlatticeWidget?.setContext?.(null);
            return;
        }

        window.AnswerlatticeWidget?.show?.();
        window.AnswerlatticeWidget?.page?.(pageContext);
    }, [pageContext, runtimeState.ready, shouldSuppressWidget]);

    if (!MENULIST_ANSWERLATTICE_WIDGET_KEY || !runtimeState.ready || shouldSuppressWidget) return null;

    return (
        <Script
            id="menulist-answerlattice-widget"
            src={scriptSrc}
            strategy="afterInteractive"
            data-answerlattice-key={MENULIST_ANSWERLATTICE_WIDGET_KEY}
            data-context-key={pageContext.contextKey}
            data-feature={pageContext.feature}
            data-page={pageContext.page}
            data-workflow={pageContext.workflow}
            data-user-role="owner"
            data-entity-hints={(pageContext.entityHints || []).join(',')}
            data-blocked-routes={BLOCKED_ROUTES.join(',')}
            data-mobile-visibility="hide"
        />
    );
}
