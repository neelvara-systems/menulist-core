'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { AnswerlatticePageContext, AnswerlatticeWidgetRuntime } from '../../../packages/answerlattice-web/src';

const ANSWERLATTICE_WIDGET_KEY = process.env.NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY?.trim() || '';
const CONFIGURED_SCRIPT_SRC = process.env.NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_SCRIPT_SRC?.trim() || '';

type AnswerlatticeWidgetWindow = Window & {
    AnswerlatticeWidget?: AnswerlatticeWidgetRuntime;
};

const BLOCKED_ROUTES = [
    '/help-center',
    '/help-center/*',
    '/answerlattice',
    '/answerlattice/*',
    '/__answerlattice',
    '/__answerlattice/*',
    '/growth-kits',
    '/growth-kits/*',
    '/ops',
    '/ops/*',
    '/platform',
    '/platform/*',
    '/reseller',
    '/reseller/*',
];

const routeFeatureMap: Record<string, { feature: string; workflow: string; entityHints: string[] }> = {
    dashboard: { feature: 'today', workflow: 'review_daily_business', entityHints: ['today', 'business_status', 'setup_status'] },
    projects: { feature: 'projects', workflow: 'manage_menu', entityHints: ['menu', 'project', 'public_menu'] },
    today: { feature: 'today', workflow: 'review_daily_actions', entityHints: ['today', 'business_status'] },
    'menu-manager': { feature: 'ai_menu_manager', workflow: 'prepare_and_approve_menu_work', entityHints: ['menu', 'proposal', 'approval'] },
    'business-health': { feature: 'business_health', workflow: 'understand_business_health', entityHints: ['health', 'analytics', 'public_readiness'] },
    'qr-code': { feature: 'share', workflow: 'share_menu_and_place_qr', entityHints: ['qr', 'public_link', 'official_business_page'] },
    qrCode: { feature: 'share', workflow: 'share_menu_and_place_qr', entityHints: ['qr', 'public_link', 'official_business_page'] },
    'use-menulist': { feature: 'share', workflow: 'place_menu_surfaces', entityHints: ['public_link', 'qr', 'menu_kit', 'screen'] },
    assets: { feature: 'assets', workflow: 'prepare_downloadable_assets', entityHints: ['print', 'pdf', 'menu_card'] },
    users: { feature: 'users', workflow: 'manage_staff', entityHints: ['staff', 'permissions'] },
    feedback: { feature: 'feedback', workflow: 'review_customer_feedback', entityHints: ['feedback', 'reviews'] },
    'business-settings': { feature: 'business_settings', workflow: 'manage_business_profile', entityHints: ['business_profile', 'store_settings'] },
    transactions: { feature: 'transactions', workflow: 'review_billing_activity', entityHints: ['billing', 'transactions'] },
    locations: { feature: 'locations', workflow: 'manage_locations', entityHints: ['outlets', 'locations'] },
    billing: { feature: 'billing', workflow: 'manage_subscription', entityHints: ['subscription', 'plan'] },
};

function normalizeConfiguredWidgetScriptSrc(value: string): string {
    if (!value) return '';
    try {
        const url = new URL(value);
        if (
            url.protocol !== 'https:'
            || !url.hostname
            || url.username
            || url.password
            || url.hash
        ) {
            return '';
        }
        return url.toString();
    } catch {
        return '';
    }
}

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
    const configuredScriptSrc = normalizeConfiguredWidgetScriptSrc(CONFIGURED_SCRIPT_SRC);
    if (configuredScriptSrc) return configuredScriptSrc;
    if (typeof window === 'undefined') return 'https://answerlattice.com/widget/v1/answerlattice-widget.js';

    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${origin}/widget/v1/answerlattice-widget.js`;
    }
    if (hostname === 'menulist.digital' || hostname.endsWith('.menulist.digital') || hostname.endsWith('.vercel.app')) {
        return 'https://canonica.app/widget/v1/answerlattice-widget.js';
    }
    return 'https://answerlattice.com/widget/v1/answerlattice-widget.js';
}

function buildPageContext(pathname: string): AnswerlatticePageContext | null {
    const routeSegments = pathname
        .replace(/^\/+/, '')
        .split('/')
        .filter(Boolean);
    const [firstSegment = 'dashboard'] = routeSegments;
    const routeKey = firstSegment || 'dashboard';
    const routeConfig = routeFeatureMap[routeKey];
    if (!routeConfig) return null;
    const contextRouteKey = routeKey === 'qrCode' ? 'qr-code' : routeKey;
    const contextSuffix = routeSegments.length > 1 ? '_detail' : '';

    return {
        contextVersion: 1,
        contextKey: `menulist_owner_${contextRouteKey}${contextSuffix}`,
        feature: routeConfig.feature,
        page: contextRouteKey,
        workflow: routeConfig.workflow,
        userRole: 'owner',
        entityHints: routeConfig.entityHints,
    };
}

export default function MenuListAnswerlatticeWidgetEmbed() {
    const pathname = normalizePathname(usePathname());
    const [runtimeReady, setRuntimeReady] = useState(false);
    const scriptSrc = useMemo(() => resolveWidgetScriptSrc(), []);
    const pageContext = useMemo(() => buildPageContext(pathname), [pathname]);
    const blockedRoute = isBlockedRoute(pathname);
    const shouldSuppressWidget = blockedRoute || !pageContext;

    useEffect(() => {
        setRuntimeReady(true);
    }, []);

    useEffect(() => {
        if (!ANSWERLATTICE_WIDGET_KEY || !runtimeReady) return;
        const widget = (window as AnswerlatticeWidgetWindow).AnswerlatticeWidget;

        if (shouldSuppressWidget) {
            widget?.hide?.();
            widget?.close?.();
            widget?.setContext?.(null);
            return;
        }

        widget?.show?.();
        if (pageContext) widget?.page?.(pageContext);
    }, [pageContext, runtimeReady, shouldSuppressWidget]);

    if (!ANSWERLATTICE_WIDGET_KEY || !runtimeReady || shouldSuppressWidget || !pageContext) return null;

    return (
        <Script
            id="menulist-answerlattice-widget"
            src={scriptSrc}
            strategy="afterInteractive"
            data-answerlattice-key={ANSWERLATTICE_WIDGET_KEY}
            data-context-key={pageContext.contextKey}
            data-feature={pageContext.feature}
            data-page={pageContext.page}
            data-workflow={pageContext.workflow}
            data-user-role="owner"
            data-entity-hints={(pageContext.entityHints || []).join(',')}
            data-blocked-routes={BLOCKED_ROUTES.join(',')}
        />
    );
}
