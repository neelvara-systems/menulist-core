'use client'

/**
 * Canonica — Dashboard Layout Wrapper
 * 
 * Renders the Canonica sidebar + header + content area.
 * 
 * Shares: AntdThemeProvider, NetworkStatusProvider
 * Shares dashboard shell chrome with MenuList while keeping Canonica routes and guards separate.
 * 
 * @see src/components/canonica/CanonicaSidebar.tsx
 */

import {
    DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
} from '@/components/shared/dashboardShell/DashboardSidebarShell';
import {
    CANONICA_DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
    CANONICA_MANAGEMENT_ROUTES,
    CANONICA_ROUTES,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import { getCanonicaRouteRequiredPermission } from '@constant/canonica/permissions';
import { useAppSelector } from '@hook/useAppSelector';
import { ensureFirebaseAuthForSession } from '@lib/auth/firebaseAuthSync';
import { canUseCanonicaManagement } from '@lib/canonica/sessionScope';
import AntdThemeProvider from '@providers/antdThemeProvider';
import { CanonicaAccessProvider, useCanonicaAccess } from '@providers/canonicaAccessProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import { getSidebarState } from '@reduxSlices/clientThemeConfig';
import { Alert, Drawer, Grid, Layout, Spin, theme } from 'antd';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import CanonicaSidebar from './CanonicaSidebar';
import CanonicaHeader from './CanonicaHeader';

const { Content } = Layout;
const CANONICA_MOBILE_BOTTOM_CLEARANCE = 'calc(24px + env(safe-area-inset-bottom))';
const AppSettingsPanel = dynamic(() => import('@organisms/sidebar/appSettingsPanel'), { ssr: false });
const AppSettingsSheet = dynamic(() => import('@/components/mobile/sheets/AppSettingsSheet'), { ssr: false });

export default function CanonicaDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AntdThemeProvider>
            <CanonicaAccessProvider>
                <CanonicaDashboardLayoutContent>{children}</CanonicaDashboardLayoutContent>
            </CanonicaAccessProvider>
        </AntdThemeProvider>
    );
}

function CanonicaDashboardLayoutContent({ children }: { children: React.ReactNode }) {
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
    const [sidebarShellExpanded, setSidebarShellExpanded] = useState(false);
    const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
    const [firebaseAuthError, setFirebaseAuthError] = useState(false);
    const { access, error: accessError, loading: accessLoading } = useCanonicaAccess();
    const layoutBackground = token.colorBgLayout;
    const canUseManagementSurfaces = access?.canUseManagement ?? canUseCanonicaManagement(session);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);
    const isAdminRoute = useMemo(() => (
        CANONICA_MANAGEMENT_ROUTES.some((route) => normalizedPathname === route || normalizedPathname.startsWith(`${route}/`))
    ), [normalizedPathname]);
    const requiredPermission = useMemo(() => getCanonicaRouteRequiredPermission(normalizedPathname), [normalizedPathname]);
    const canEvaluateRoutePermission = !requiredPermission || Boolean(access);
    const hasRoutePermission = !requiredPermission || access?.isPlatformAdmin || access?.permissions?.[requiredPermission] === true;

    useEffect(() => {
        if (status === 'loading') return;
        if (accessLoading) return;
        if (accessError) return;
        if (canEvaluateRoutePermission && ((isAdminRoute && !canUseManagementSurfaces) || !hasRoutePermission)) {
            router.replace(toCanonicaDashboardRoute(CANONICA_ROUTES.HELP, currentHostname));
        }
    }, [accessError, accessLoading, canEvaluateRoutePermission, canUseManagementSurfaces, currentHostname, hasRoutePermission, isAdminRoute, router, status]);

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
                if (process.env.NODE_ENV !== 'production') {
                    console.error('[Canonica] Firebase Auth sync failed', error);
                }
                if (!cancelled) {
                    setFirebaseAuthError(true);
                    setFirebaseAuthReady(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [pathname, session, status]);

    const shouldRedirectAway = !accessError && canEvaluateRoutePermission && ((isAdminRoute && !canUseManagementSurfaces) || !hasRoutePermission);
    const shouldShowAuthError = !shouldRedirectAway && (
        firebaseAuthError ||
        Boolean(accessError) ||
        (!accessLoading && Boolean(requiredPermission) && !access)
    );
    const shouldShowContentLoader = status === 'loading' || accessLoading || (!shouldRedirectAway && !firebaseAuthReady);
    const sidebarOffset = isCollapsed && !sidebarShellExpanded
        ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH
        : CANONICA_DASHBOARD_SIDEBAR_EXPANDED_WIDTH;

    return (
        <>
            {isMobile ? (
                <style jsx global>{`
                    [data-canonica-dashboard-mobile="true"],
                    [data-canonica-dashboard-mobile="true"] .ant-layout,
                    [data-canonica-dashboard-mobile="true"] .ant-flex,
                    [data-canonica-dashboard-mobile="true"] .ant-space,
                    [data-canonica-dashboard-mobile="true"] .ant-card,
                    [data-canonica-dashboard-mobile="true"] .ant-card-body,
                    [data-canonica-dashboard-mobile="true"] .ant-card-head {
                        max-width: 100%;
                        min-width: 0;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-card {
                        border-radius: 8px;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-card-body,
                    [data-canonica-dashboard-mobile="true"] .ant-card-head {
                        padding-left: 12px;
                        padding-right: 12px;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-space {
                        flex-wrap: wrap;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-table-wrapper,
                    [data-canonica-dashboard-mobile="true"] .ant-table-content,
                    [data-canonica-dashboard-mobile="true"] .ant-segmented,
                    [data-canonica-dashboard-mobile="true"] .ant-tabs-nav {
                        max-width: 100%;
                        overflow-x: auto;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-form .ant-flex {
                        align-items: stretch !important;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-form-item {
                        margin-bottom: 14px;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-btn:not(.ant-btn-sm) {
                        min-height: 44px;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-btn-sm {
                        min-height: 44px;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-btn-icon-only:not(.ant-btn-sm) {
                        min-width: 44px;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-modal {
                        margin: calc(env(safe-area-inset-top) + 12px) auto calc(env(safe-area-inset-bottom) + 12px);
                        max-width: calc(100vw - 24px);
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-drawer-body {
                        overscroll-behavior: contain;
                    }

                    [data-canonica-dashboard-mobile="true"] .ant-typography {
                        overflow-wrap: anywhere;
                    }
                `}</style>
            ) : null}
            <NetworkStatusProvider>
                <Layout
                    data-canonica-dashboard-mobile={isMobile ? 'true' : undefined}
                    style={{
                        background: layoutBackground,
                        height: '100dvh',
                        minHeight: '100dvh',
                        minWidth: 0,
                        overflow: 'hidden',
                    }}
                >
                    {isDesktop && (
                        <CanonicaSidebar onExpandedChange={setSidebarShellExpanded} />
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
                        <CanonicaSidebar
                            mobile
                            onNavigate={() => setMobileNavOpen(false)}
                            onOpenAppSettings={() => setAppSettingsOpen(true)}
                        />
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
                        <CanonicaHeader
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
                                padding: isDesktop ? 24 : `12px 12px ${CANONICA_MOBILE_BOTTOM_CLEARANCE}`,
                                scrollPaddingBottom: isMobile ? CANONICA_MOBILE_BOTTOM_CLEARANCE : undefined,
                                WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
                            }}
                        >
                            {shouldRedirectAway ? null : shouldShowAuthError ? (
                                <Alert
                                    message={accessError || "Canonica access could not be prepared."}
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
