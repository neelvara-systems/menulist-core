'use client'

import OutletContextBanner from '@atoms/OutletContextBanner';
import { FEATURE_FLAGS } from '@config/features';
import { SKIP_CLIENT_APP_LAYOUT_ROUTINGS } from '@constant/navigations';
import { useAppSelector } from '@hook/useAppSelector';
import useDeviceType from '@hook/useDeviceType';
import { clearForceDesktopMode, shouldForceDesktopForPath } from '@lib/mobile/forceDesktopMode';
import HeadMetaTags from '@organisms/headMetaTags';
import HorizontalSidebar from '@organisms/sidebar/horizontalSidebar';
import AntdThemeProvider from '@providers/antdThemeProvider';
import GlobalKeyboardShortcutsProvider from '@providers/GlobalKeyboardShortcutsProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import { getDarkModeState, getRTLDirectionState, getSidebarLayoutState, getSidebarState } from '@reduxSlices/clientThemeConfig';
import { Layout, theme } from 'antd';
import dynamic from 'next/dynamic';
import { usePathname, useSearchParams } from 'next/navigation';
import { Fragment, useState } from 'react';
import styles from './layoutWrapper.module.scss';

const AppSettingsPanel = dynamic(() => import('@organisms/sidebar/appSettingsPanel'), { ssr: false });
const HeaderComponent = dynamic(() => import('@organisms/headerComponent'), { ssr: false });
const SidebarComponent = dynamic(() => import('@organisms/sidebar'), { ssr: false });
const MobileShell = dynamic(() => import('../../mobile/MobileShell'), { ssr: false });

const { Content } = Layout;
const DESKTOP_ONLY_ROUTE_PREFIXES: string[] = [];
const DESKTOP_ONLY_ROUTES = ['/platform/test-sentry'];

export default function AntdLayoutWrapper(props: any) {

    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const isRTLDirection = useAppSelector(getRTLDirectionState)
    const { token } = theme.useToken();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const isVerticalSidebar = useAppSelector(getSidebarLayoutState)
    const { isHandheld, isMobile, hasMounted } = useDeviceType();
    const [, setForceDesktopRefreshKey] = useState(0);
    const isDesktopOnlyRoute = DESKTOP_ONLY_ROUTES.includes(pathname) || DESKTOP_ONLY_ROUTE_PREFIXES.some((routePrefix) => (
        pathname === routePrefix || pathname.startsWith(`${routePrefix}/`)
    ));
    const isPlatformRoute = pathname === '/platform' || pathname.startsWith('/platform/');
    const isOpsRoute = pathname === '/ops' || pathname.startsWith('/ops/');
    const isResellerRoute = pathname === '/reseller' || pathname.startsWith('/reseller/');
    const isHelpCenterRoute = pathname === '/help-center' || pathname.startsWith('/help-center/');
    const isLocalMobileAudit = process.env.NODE_ENV !== 'production' && searchParams.has('mobileAudit');
    const routeHasMobileShell = !isDesktopOnlyRoute && (
        isLocalMobileAudit || isHandheld || (isMobile && (isPlatformRoute || isOpsRoute || isResellerRoute || isHelpCenterRoute))
    );
    const forceDesktop = hasMounted && !routeHasMobileShell && shouldForceDesktopForPath(pathname, isDesktopOnlyRoute);
    const shouldRenderMobileShell = hasMounted
        && FEATURE_FLAGS.ENABLE_MOBILE_UI
        && !forceDesktop
        && !isDesktopOnlyRoute
        && (isLocalMobileAudit || isHandheld || (isMobile && (isPlatformRoute || isOpsRoute || isResellerRoute || isHelpCenterRoute)));
    const isHandheldDesktopRoute = hasMounted && isHandheld && isDesktopOnlyRoute && FEATURE_FLAGS.ENABLE_MOBILE_UI && !forceDesktop;

    const renderContent = () => {

        if (SKIP_CLIENT_APP_LAYOUT_ROUTINGS.includes(pathname)) {
            return <>{props.children}</>
        }

        // Long-term shell routing: keep handheld devices in the mobile shell
        // even when rotated to landscape. Internal screen layouts can respond
        // to width changes without the entire app remounting into desktop UI.
        if (shouldRenderMobileShell) {
            return <MobileShell />;
        }

        return <Layout className={`${styles.layoutWrapper}`} dir={isRTLDirection ? "rtl" : "ltr"} >
            <HeadMetaTags title={undefined} description={undefined} image={undefined} siteName={undefined} storeData={undefined} />
            <Fragment>
                {/* "Return to Mobile" banner — shown when mobile user forced desktop mode */}
                {hasMounted && isHandheld && forceDesktop && FEATURE_FLAGS.ENABLE_MOBILE_UI && (
                    <div
                        style={{ background: '#1677ff', color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', zIndex: 9999 }}
                        onClick={() => {
                            clearForceDesktopMode();
                            setForceDesktopRefreshKey((current) => current + 1);
                        }}
                    >
                        You&apos;re viewing the desktop version. <strong>Tap here to return to mobile.</strong>
                    </div>
                )}
                <Layout style={isVerticalSidebar && !isHandheldDesktopRoute ? { paddingLeft: isCollapsed ? "62px" : "200px" } : {}}>
                    {!isHandheldDesktopRoute ? <HeaderComponent /> : null}
                    {!isHandheldDesktopRoute ? (isVerticalSidebar ? <SidebarComponent /> : <HorizontalSidebar />) : null}
                    {!isHandheldDesktopRoute ? <AppSettingsPanel /> : null}
                    <Content className={styles.mainContentWraper}
                        style={{
                            backgroundImage: isDarkMode ? `radial-gradient(#dee1ec57 0.8px, transparent 0)` : `radial-gradient(#cbcbcb 1px, transparent 0)`,
                            // background: isDarkMode ? token.colorFillContent : token.colorBgBase,
                            minHeight: isHandheldDesktopRoute ? '100dvh' : isVerticalSidebar ? 'calc(100vh - 52px)' : 'calc(100vh - 98px)',
                            overflowX: isHandheldDesktopRoute ? 'hidden' : undefined,
                            width: "100%"
                        }}>
                        <OutletContextBanner />
                        {isHandheldDesktopRoute ? (
                            <div style={{ maxWidth: '100vw', overflowX: 'auto', width: '100%' }}>
                                {props.children}
                            </div>
                        ) : props.children}
                    </Content>
                </Layout>
            </Fragment>
        </Layout>
    }
    return (
        <AntdThemeProvider>
            <GlobalKeyboardShortcutsProvider>
                <NetworkStatusProvider>
                    {renderContent()}
                </NetworkStatusProvider>
            </GlobalKeyboardShortcutsProvider>
        </AntdThemeProvider>
    )
}
