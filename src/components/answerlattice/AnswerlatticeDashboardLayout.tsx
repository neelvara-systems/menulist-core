'use client'

/**
 * Answerlattice — Dashboard Layout Wrapper
 * 
 * Renders the Answerlattice sidebar + header + content area.
 * 
 * Shares: AntdThemeProvider, NetworkStatusProvider
 * Shares dashboard shell chrome with MenuList while keeping Answerlattice routes and guards separate.
 * 
 * @see src/components/answerlattice/AnswerlatticeSidebar.tsx
 */

import {
    DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
} from '@/components/shared/dashboardShell/DashboardSidebarShell';
import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
    ANSWERLATTICE_MANAGEMENT_ROUTES,
    ANSWERLATTICE_ROUTES,
    normalizeAnswerlatticeRoutePathname,
    toAnswerlatticeDashboardRoute,
} from '@constant/answerlattice/navigations';
import { ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX, isAnswerlatticeProductHostname } from '@constant/answerlattice/domains';
import { ANSWERLATTICE_PERMISSION_KEYS, getAnswerlatticeRouteRequiredPermission } from '@constant/answerlattice/permissions';
import { useAppSelector } from '@hook/useAppSelector';
import { ensureFirebaseAuthForSession } from '@lib/auth/firebaseAuthSync';
import { canUseAnswerlatticeManagement } from '@lib/answerlattice/sessionScope';
import {
    getFirebaseAuthSessionLogContext,
    logFirebaseBootstrapFailure,
} from '@lib/firebase/firebaseDiagnostics';
import AntdThemeProvider from '@providers/antdThemeProvider';
import { AnswerlatticeAccessProvider, useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import { getSidebarState } from '@reduxSlices/clientThemeConfig';
import { Alert, Button, Drawer, Grid, Layout, Spin, theme, unstableSetRender } from 'antd';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LuX } from 'react-icons/lu';
import AnswerlatticeSidebar from './AnswerlatticeSidebar';
import AnswerlatticeHeader from './AnswerlatticeHeader';

const { Content } = Layout;
const ANSWERLATTICE_MOBILE_BOTTOM_CLEARANCE = 'calc(24px + env(safe-area-inset-bottom))';
type AnswerlatticeAntdRenderContainer = (Element | DocumentFragment) & { _answerlatticeReactRoot?: Root };

// Ant Design v5 uses the legacy ReactDOM renderer for static message, modal,
// notification, and wave roots unless the host registers the React 19 renderer.
// Keep the compatibility bridge at the Answerlattice client entry so every
// management action uses the same supported root lifecycle without adding a
// dependency outside the frozen runtime.
unstableSetRender((node, container) => {
    const renderContainer = container as AnswerlatticeAntdRenderContainer;
    renderContainer._answerlatticeReactRoot ||= createRoot(container);
    const root = renderContainer._answerlatticeReactRoot;
    root.render(node);

    return async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
        root.unmount();
        delete renderContainer._answerlatticeReactRoot;
    };
});

const AppSettingsPanel = dynamic(() => import('@organisms/sidebar/appSettingsPanel'), { ssr: false });
const AppSettingsSheet = dynamic(() => import('@/components/mobile/sheets/AppSettingsSheet'), { ssr: false });
const ANSWERLATTICE_CUSTOMER_ROUTE_OWNER_FALLBACKS: Partial<Record<string, string>> = {
    [ANSWERLATTICE_ROUTES.HELP]: ANSWERLATTICE_ROUTES.KNOWLEDGE_BASE,
    [ANSWERLATTICE_ROUTES.DOCS]: ANSWERLATTICE_ROUTES.KNOWLEDGE_BASE,
    [ANSWERLATTICE_ROUTES.RELEASE_NOTES]: ANSWERLATTICE_ROUTES.CHANGELOG,
    [ANSWERLATTICE_ROUTES.SUPPORT]: ANSWERLATTICE_ROUTES.TICKETS,
};

export default function AnswerlatticeDashboardLayout({
    children,
    globalOverlays,
}: {
    children: React.ReactNode;
    globalOverlays?: React.ReactNode;
}) {
    return (
        <AntdThemeProvider>
            {globalOverlays}
            <AnswerlatticeAccessProvider>
                <AnswerlatticeDashboardLayoutContent>{children}</AnswerlatticeDashboardLayoutContent>
            </AnswerlatticeAccessProvider>
        </AntdThemeProvider>
    );
}

function AnswerlatticeDashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isCollapsed = useAppSelector(getSidebarState);
    const isDesktop = screens.lg === true;
    const isMobile = !isDesktop;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [appSettingsOpen, setAppSettingsOpen] = useState(false);
    const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
    const [firebaseAuthError, setFirebaseAuthError] = useState(false);
    const { access, error: accessError, errorCode: accessErrorCode, loading: accessLoading } = useAnswerlatticeAccess();
    const layoutBackground = token.colorBgLayout;
    const canUseManagementSurfaces = access?.canUseManagement ?? canUseAnswerlatticeManagement(session);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeAnswerlatticeRoutePathname(pathname ?? '');
    const isAdminRoute = useMemo(() => (
        ANSWERLATTICE_MANAGEMENT_ROUTES.some((route) => normalizedPathname === route || normalizedPathname.startsWith(`${route}/`))
    ), [normalizedPathname]);
    const requiredPermission = useMemo(() => getAnswerlatticeRouteRequiredPermission(normalizedPathname), [normalizedPathname]);
    const canEvaluateRoutePermission = !requiredPermission || Boolean(access);
    const hasRoutePermission = !requiredPermission || access?.isPlatformAdmin || access?.permissions?.[requiredPermission] === true;
    const managementFallbackRoute = useMemo(() => {
        if (access?.isPlatformAdmin) return ANSWERLATTICE_ROUTES.ACTIVATION;

        const permissions = access?.permissions;
        if (permissions?.[ANSWERLATTICE_PERMISSION_KEYS.VIEW_READINESS]) return ANSWERLATTICE_ROUTES.ACTIVATION;
        if (permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_SUPPORT]) {
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT) return ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT;
            return FEATURE_FLAGS.ENABLE_ANSWERLATTICE_SUPPORT_BOARD ? ANSWERLATTICE_ROUTES.SUPPORT_BOARD : ANSWERLATTICE_ROUTES.TICKETS;
        }
        if (permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_KNOWLEDGE]) return ANSWERLATTICE_ROUTES.KNOWLEDGE_BASE;
        if (permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_WIDGET]) return ANSWERLATTICE_ROUTES.WIDGET;
        if (permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_INTEGRATIONS]) {
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) return ANSWERLATTICE_ROUTES.WORKFLOW_NOTIFICATIONS;
            if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API) return ANSWERLATTICE_ROUTES.PUBLIC_API;
        }
        if (permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_TEAM]) return ANSWERLATTICE_ROUTES.TEAM;
        if (permissions?.[ANSWERLATTICE_PERMISSION_KEYS.MANAGE_BILLING]) return ANSWERLATTICE_ROUTES.BILLING;

        return ANSWERLATTICE_ROUTES.HELP;
    }, [access]);
    const ownerCustomerRouteFallback = useMemo(() => {
        const fallbackRoute = ANSWERLATTICE_CUSTOMER_ROUTE_OWNER_FALLBACKS[normalizedPathname];
        if (!fallbackRoute) return null;

        const fallbackPermission = getAnswerlatticeRouteRequiredPermission(fallbackRoute);
        if (!fallbackPermission || access?.isPlatformAdmin || access?.permissions?.[fallbackPermission] === true) {
            return fallbackRoute;
        }

        return managementFallbackRoute;
    }, [access?.isPlatformAdmin, access?.permissions, managementFallbackRoute, normalizedPathname]);
    const answerlatticePublicPricingRoute = useMemo(() => (
        isAnswerlatticeProductHostname(currentHostname)
            ? '/pricing'
            : `${ANSWERLATTICE_LOCAL_DEV_PATH_PREFIX}/pricing`
    ), [currentHostname]);
    const shouldRedirectToPublicPricing = status === 'authenticated'
        && !accessLoading
        && accessErrorCode === 'ANSWERLATTICE_ACCOUNT_REQUIRED'
        && isAdminRoute;

    useEffect(() => {
        if (status === 'loading') return;
        if (accessLoading) return;
        if (shouldRedirectToPublicPricing) {
            router.replace(answerlatticePublicPricingRoute);
            return;
        }
        if (accessError) return;
        if (canEvaluateRoutePermission && canUseManagementSurfaces && ownerCustomerRouteFallback) {
            router.replace(toAnswerlatticeDashboardRoute(ownerCustomerRouteFallback, currentHostname));
            return;
        }
        if (canEvaluateRoutePermission && isAdminRoute && !canUseManagementSurfaces) {
            router.replace(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.HELP, currentHostname));
            return;
        }
        if (canEvaluateRoutePermission && !hasRoutePermission) {
            router.replace(toAnswerlatticeDashboardRoute(managementFallbackRoute, currentHostname));
        }
    }, [accessError, accessLoading, canEvaluateRoutePermission, canUseManagementSurfaces, answerlatticePublicPricingRoute, currentHostname, hasRoutePermission, isAdminRoute, managementFallbackRoute, ownerCustomerRouteFallback, router, shouldRedirectToPublicPricing, status]);

    useEffect(() => {
        if (status === 'loading') {
            setFirebaseAuthReady(false);
            setFirebaseAuthError(false);
            return;
        }
        if (status !== 'authenticated' || !session?.user?.email) {
            setFirebaseAuthReady(true);
            setFirebaseAuthError(false);
            return;
        }

        let cancelled = false;
        setFirebaseAuthReady(false);
        setFirebaseAuthError(false);
        ensureFirebaseAuthForSession(session)
            .then((result) => {
                if (!cancelled) setFirebaseAuthReady(result.ready !== false);
            })
            .catch((error) => {
                logFirebaseBootstrapFailure('answerlattice_dashboard_firebase_auth_sync_failed', error, getFirebaseAuthSessionLogContext(session));
                if (!cancelled) {
                    setFirebaseAuthError(true);
                    setFirebaseAuthReady(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [session, status]);

    const shouldRedirectOwnerCustomerRoute = canUseManagementSurfaces && Boolean(ownerCustomerRouteFallback);
    const shouldRedirectAway = shouldRedirectToPublicPricing || (
        !accessError && canEvaluateRoutePermission && (
            shouldRedirectOwnerCustomerRoute ||
            (isAdminRoute && !canUseManagementSurfaces) ||
            !hasRoutePermission
        )
    );
    const shouldShowAuthError = !shouldRedirectAway && (
        firebaseAuthError ||
        Boolean(accessError) ||
        (!accessLoading && Boolean(requiredPermission) && !access)
    );
    const shouldShowContentLoader = status === 'loading' || accessLoading || (!shouldRedirectAway && !firebaseAuthReady);
    const sidebarOffset = isCollapsed
        ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH
        : ANSWERLATTICE_DASHBOARD_SIDEBAR_EXPANDED_WIDTH;

    return (
        <>
            {isMobile ? (
                <style jsx global>{`
                    [data-answerlattice-dashboard-mobile="true"],
                    [data-answerlattice-dashboard-mobile="true"] .ant-layout,
                    [data-answerlattice-dashboard-mobile="true"] .ant-flex,
                    [data-answerlattice-dashboard-mobile="true"] .ant-space,
                    [data-answerlattice-dashboard-mobile="true"] .ant-card,
                    [data-answerlattice-dashboard-mobile="true"] .ant-card-body,
                    [data-answerlattice-dashboard-mobile="true"] .ant-card-head {
                        max-width: 100%;
                        min-width: 0;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-card {
                        border-radius: 8px;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-card-body,
                    [data-answerlattice-dashboard-mobile="true"] .ant-card-head {
                        padding-left: 12px;
                        padding-right: 12px;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-space {
                        flex-wrap: wrap;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-table-wrapper,
                    [data-answerlattice-dashboard-mobile="true"] .ant-table-content,
                    [data-answerlattice-dashboard-mobile="true"] .ant-segmented,
                    [data-answerlattice-dashboard-mobile="true"] .ant-tabs-nav {
                        max-width: 100%;
                        overflow-x: auto;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-form .ant-flex {
                        align-items: stretch !important;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-form-item {
                        margin-bottom: 14px;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-btn:not(.ant-btn-sm) {
                        min-height: 44px;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-btn-sm {
                        min-height: 44px;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-btn-icon-only:not(.ant-btn-sm) {
                        min-width: 44px;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-modal {
                        margin: calc(env(safe-area-inset-top) + 12px) auto calc(env(safe-area-inset-bottom) + 12px);
                        max-width: calc(100vw - 24px);
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-drawer-body {
                        overscroll-behavior: contain;
                    }

                    [data-answerlattice-dashboard-mobile="true"] .ant-typography {
                        overflow-wrap: anywhere;
                    }
                `}</style>
            ) : null}
            <NetworkStatusProvider>
                <Layout
                    data-answerlattice-dashboard-mobile={isMobile ? 'true' : undefined}
                    style={{
                        background: layoutBackground,
                        height: '100dvh',
                        minHeight: '100dvh',
                        minWidth: 0,
                        overflow: 'hidden',
                    }}
                >
                    {isDesktop && (
                        <AnswerlatticeSidebar />
                    )}
                    <Drawer
                        title={null}
                        placement="left"
                        open={!isDesktop && mobileNavOpen}
                        onClose={() => setMobileNavOpen(false)}
                        width={280}
                        styles={{
                            body: { padding: 0 },
                            content: { overflow: 'hidden' },
                            header: { display: 'none' },
                        }}
                    >
                        <div style={{ height: '100%', position: 'relative' }}>
                            <AnswerlatticeSidebar
                                mobile
                                onNavigate={() => setMobileNavOpen(false)}
                                onOpenAppSettings={() => setAppSettingsOpen(true)}
                            />
                            <Button
                                aria-label="Close navigation"
                                icon={<LuX size={20} />}
                                onClick={() => setMobileNavOpen(false)}
                                style={{
                                    background: token.colorBgBase,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    color: token.colorTextBase,
                                    height: 44,
                                    minWidth: 44,
                                    padding: 0,
                                    position: 'absolute',
                                    right: 12,
                                    top: 'calc(env(safe-area-inset-top) + 12px)',
                                    zIndex: 13,
                                }}
                                type="text"
                            />
                        </div>
                    </Drawer>
                    <Layout
                        style={{
                            marginLeft: isDesktop ? sidebarOffset : 0,
                            minWidth: 0,
                            background: layoutBackground,
                            height: '100dvh',
                            overflow: 'hidden',
                            transition: 'margin-left 0.2s ease',
                        }}
                    >
                        <AnswerlatticeHeader
                            showMenuButton={!isDesktop}
                            onMenuClick={() => setMobileNavOpen(true)}
                            onOpenAppSettings={() => setAppSettingsOpen(true)}
                        />
                        <Content
                            style={{
                                background: layoutBackground,
                                boxSizing: 'border-box',
                                height: isDesktop ? 'calc(100dvh - var(--header-Height))' : 'calc(100dvh - var(--header-Height) - env(safe-area-inset-top))',
                                minHeight: isDesktop ? 'calc(100dvh - var(--header-Height))' : 'calc(100dvh - var(--header-Height) - env(safe-area-inset-top))',
                                overflowX: 'hidden',
                                overflowY: 'auto',
                                padding: isDesktop ? 24 : `12px 12px ${ANSWERLATTICE_MOBILE_BOTTOM_CLEARANCE}`,
                                scrollPaddingBottom: isMobile ? ANSWERLATTICE_MOBILE_BOTTOM_CLEARANCE : undefined,
                                WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
                            }}
                        >
                            {shouldRedirectAway ? null : shouldShowAuthError ? (
                                <Alert
                                    message={accessError || "Answerlattice access could not be prepared."}
                                    showIcon
                                    type="error"
                                />
                            ) : shouldShowContentLoader ? (
                                <div style={{ display: 'grid', minHeight: 240, placeItems: 'center' }}>
                                    <Spin />
                                </div>
                            ) : children}
                        </Content>
                    </Layout>
                </Layout>
                {isDesktop ? <AppSettingsPanel /> : null}
                <AppSettingsSheet
                    onClose={() => setAppSettingsOpen(false)}
                    visible={appSettingsOpen}
                />
            </NetworkStatusProvider>
        </>
    );
}
