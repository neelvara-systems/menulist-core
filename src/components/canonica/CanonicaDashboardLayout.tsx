'use client'

/**
 * Canonica — Dashboard Layout Wrapper
 * 
 * Renders the Canonica sidebar + header + content area.
 * Separate from MenuList's AntdLayoutWrapper — different product, different layout.
 * 
 * Shares: AntdThemeProvider, NetworkStatusProvider
 * Does NOT share: MenuList sidebar, MenuList header, mobile shell
 * 
 * @see src/components/canonica/CanonicaSidebar.tsx
 */

import {
    CANONICA_MANAGEMENT_ROUTES,
    CANONICA_ROUTES,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import { ensureFirebaseAuthForSession } from '@lib/auth/firebaseAuthSync';
import { canUseCanonicaManagement } from '@lib/canonica/sessionScope';
import AntdThemeProvider from '@providers/antdThemeProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import { Alert, Drawer, Grid, Layout, Spin, theme } from 'antd';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import CanonicaSidebar from './CanonicaSidebar';
import CanonicaHeader from './CanonicaHeader';

const { Content } = Layout;
const SIDEBAR_WIDTH = 240;
const CANONICA_MOBILE_BOTTOM_CLEARANCE = 'calc(24px + env(safe-area-inset-bottom))';
const AppSettingsSheet = dynamic(() => import('@/components/mobile/sheets/AppSettingsSheet'), { ssr: false });

export default function CanonicaDashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AntdThemeProvider>
            <CanonicaDashboardLayoutContent>{children}</CanonicaDashboardLayoutContent>
        </AntdThemeProvider>
    );
}

function CanonicaDashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isDesktop = screens.lg === true;
    const isMobile = !isDesktop;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [appSettingsOpen, setAppSettingsOpen] = useState(false);
    const [firebaseAuthReady, setFirebaseAuthReady] = useState(false);
    const [firebaseAuthError, setFirebaseAuthError] = useState(false);
    const layoutBackground = token.colorBgLayout;
    const canUseManagementSurfaces = canUseCanonicaManagement(session);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);
    const isAdminRoute = useMemo(() => (
        CANONICA_MANAGEMENT_ROUTES.some((route) => normalizedPathname === route || normalizedPathname.startsWith(`${route}/`))
    ), [normalizedPathname]);

    useEffect(() => {
        if (status === 'loading') return;
        if (isAdminRoute && !canUseManagementSurfaces) {
            router.replace(toCanonicaDashboardRoute(CANONICA_ROUTES.HELP, currentHostname));
        }
    }, [canUseManagementSurfaces, currentHostname, isAdminRoute, router, status]);

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

    const shouldRedirectAway = isAdminRoute && !canUseManagementSurfaces;
    const shouldShowAuthError = !shouldRedirectAway && firebaseAuthError;
    const shouldShowContentLoader = status === 'loading' || (!shouldRedirectAway && !firebaseAuthReady);

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
                        minHeight: '100dvh',
                        minWidth: 0,
                    }}
                >
                    {isDesktop && <CanonicaSidebar />}
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
                            marginLeft: isDesktop ? SIDEBAR_WIDTH : 0,
                            minWidth: 0,
                            background: layoutBackground,
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
                                minHeight: isDesktop ? 'calc(100dvh - 56px)' : 'calc(100dvh - 56px - env(safe-area-inset-top))',
                                overflowX: 'hidden',
                                padding: isDesktop ? 24 : `12px 12px ${CANONICA_MOBILE_BOTTOM_CLEARANCE}`,
                                scrollPaddingBottom: isMobile ? CANONICA_MOBILE_BOTTOM_CLEARANCE : undefined,
                                WebkitOverflowScrolling: isMobile ? 'touch' : undefined,
                            }}
                        >
                            {shouldRedirectAway ? null : shouldShowAuthError ? (
                                <Alert
                                    message="Canonica access could not be prepared."
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
                <AppSettingsSheet
                    onClose={() => setAppSettingsOpen(false)}
                    visible={appSettingsOpen}
                />
            </NetworkStatusProvider>
        </>
    );
}
