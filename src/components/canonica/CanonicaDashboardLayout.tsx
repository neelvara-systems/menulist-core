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

import { useAppSelector } from '@hook/useAppSelector';
import {
    CANONICA_ADMIN_ROUTES,
    CANONICA_ROUTES,
    normalizeCanonicaRoutePathname,
    toCanonicaDashboardRoute,
} from '@constant/canonica/navigations';
import { canUseCanonicaManagement } from '@lib/canonica/sessionScope';
import AntdThemeProvider from '@providers/antdThemeProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import { getDarkModeState } from '@reduxSlices/clientThemeConfig';
import { Drawer, Grid, Layout } from 'antd';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import CanonicaSidebar from './CanonicaSidebar';
import CanonicaHeader from './CanonicaHeader';

const { Content } = Layout;
const SIDEBAR_WIDTH = 240;

export default function CanonicaDashboardLayout({ children }: { children: React.ReactNode }) {
    const isDarkMode = useAppSelector(getDarkModeState);
    const { data: session, status } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const isDesktop = screens.lg === true;
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const layoutBackground = isDarkMode ? '#141414' : '#f5f5f5';
    const canUsePlatformSurfaces = canUseCanonicaManagement(session);
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const normalizedPathname = normalizeCanonicaRoutePathname(pathname);
    const isAdminRoute = useMemo(() => (
        CANONICA_ADMIN_ROUTES.some((route) => normalizedPathname === route || normalizedPathname.startsWith(`${route}/`))
    ), [normalizedPathname]);

    useEffect(() => {
        if (status === 'loading') return;
        if (isAdminRoute && !canUsePlatformSurfaces) {
            router.replace(toCanonicaDashboardRoute(CANONICA_ROUTES.HELP, currentHostname));
        }
    }, [canUsePlatformSurfaces, currentHostname, isAdminRoute, router, status]);

    return (
        <AntdThemeProvider>
            <NetworkStatusProvider>
                <Layout style={{ minHeight: '100vh', minWidth: 0, background: layoutBackground }}>
                    {isDesktop && <CanonicaSidebar />}
                    <Drawer
                        title={null}
                        placement="left"
                        open={!isDesktop && mobileNavOpen}
                        onClose={() => setMobileNavOpen(false)}
                        width={280}
                        styles={{ body: { padding: 0 }, header: { display: 'none' } }}
                    >
                        <CanonicaSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
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
                        />
                        <Content
                            style={{
                                padding: isDesktop ? 24 : 12,
                                minHeight: 'calc(100vh - 56px)',
                                overflowX: 'hidden',
                                background: layoutBackground,
                            }}
                        >
                            {status === 'loading' || (isAdminRoute && !canUsePlatformSurfaces) ? null : children}
                        </Content>
                    </Layout>
                </Layout>
            </NetworkStatusProvider>
        </AntdThemeProvider>
    );
}
