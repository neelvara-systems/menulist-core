'use client'

import OutletContextBanner from '@atoms/OutletContextBanner';
import BrandedPageLoader from '@atoms/brandedPageLoader';
import { FEATURE_FLAGS } from '@config/features';
import { SKIP_CLIENT_APP_LAYOUT_ROUTINGS } from '@constant/navigations';
import { useAppSelector } from '@hook/useAppSelector';
import useDeviceType from '@hook/useDeviceType';
import { isRtlLocale } from '@lib/localization/config';
import { clearForceDesktopMode, shouldForceDesktopForPath } from '@lib/mobile/forceDesktopMode';
import {
    hasRecoveryOnlyWorkspaceAccess,
    hasStarterWorkspaceAccess,
    isStarterRecoveryRoute,
    isStarterWorkspaceRoute,
} from '@lib/onboarding/starterActivation';
import HorizontalSidebar from '@organisms/sidebar/horizontalSidebar';
import AntdThemeProvider from '@providers/antdThemeProvider';
import GlobalKeyboardShortcutsProvider from '@providers/GlobalKeyboardShortcutsProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getDarkModeState, getRTLDirectionState, getSidebarLayoutState, getSidebarState } from '@reduxSlices/clientThemeConfig';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import SkipToContentLink from '@/components/shared/accessibility/SkipToContentLink';
import { Layout, theme } from 'antd';
import dynamic from 'next/dynamic';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Fragment, useContext, useEffect, useState } from 'react';
import styles from './layoutWrapper.module.scss';
import {
    DASHBOARD_SIDEBAR_COLLAPSED_WIDTH,
    DASHBOARD_SIDEBAR_EXPANDED_WIDTH,
} from '@/components/shared/dashboardShell/DashboardSidebarShell';

const AppSettingsPanel = dynamic(() => import('@organisms/sidebar/appSettingsPanel'), { ssr: false });
const HeaderComponent = dynamic(() => import('@organisms/headerComponent'), { ssr: false });
const SidebarComponent = dynamic(() => import('@organisms/sidebar'), { ssr: false });
const MobileShell = dynamic(() => import('../../mobile/MobileShell'), { ssr: false });
const StarterActivationBanner = dynamic(() => import('../../onboarding/StarterActivationBanner'), { ssr: false });

const { Content } = Layout;
const DESKTOP_ONLY_ROUTE_PREFIXES: string[] = [];
const DESKTOP_ONLY_ROUTES = [
    '/platform/test-sentry',
];

export default function AntdLayoutWrapper(props: any) {

    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const isRTLDirection = useAppSelector(getRTLDirectionState)
    const appLocale = useLocale();
    const tMobileShell = useTranslations('MobileShell');
    const isRTLLayout = isRTLDirection || isRtlLocale(appLocale);
    const { token } = theme.useToken();
    const pathname = usePathname() || '';
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeSubscription, activeSubscriptionLoading, storeDetails } = useContext(PlatformGlobalDataContext);
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
    const isBillingRoute = pathname === '/billing';
    const isMobileRecoveryRoute = isHelpCenterRoute || isBillingRoute;
    const isOwnerWorkspaceRoute = !isPlatformRoute
        && !isOpsRoute
        && !isResellerRoute
        && !isHelpCenterRoute
        && !isBillingRoute;
    const isLocalMobileAudit = process.env.NODE_ENV !== 'production' && Boolean(searchParams?.has('mobileAudit'));
    const routeHasMobileShell = !isDesktopOnlyRoute && (
        isLocalMobileAudit || isHandheld || (isMobile && (isPlatformRoute || isOpsRoute || isResellerRoute || isMobileRecoveryRoute))
    );
    const forceDesktop = hasMounted && !routeHasMobileShell && shouldForceDesktopForPath(pathname, isDesktopOnlyRoute);
    const shouldRenderMobileShell = hasMounted
        && FEATURE_FLAGS.ENABLE_MOBILE_UI
        && !forceDesktop
        && !isDesktopOnlyRoute
        && (isLocalMobileAudit || isHandheld || (isMobile && (isPlatformRoute || isOpsRoute || isResellerRoute || isMobileRecoveryRoute)));
    const isHandheldDesktopRoute = hasMounted && isHandheld && isDesktopOnlyRoute && FEATURE_FLAGS.ENABLE_MOBILE_UI && !forceDesktop;
    const hasPaidAccess = hasValidSubscriptionAccess(activeSubscription);
    const hasStarterAccess = hasStarterWorkspaceAccess(storeDetails, hasPaidAccess);
    const hasRecoveryOnlyAccess = hasRecoveryOnlyWorkspaceAccess(storeDetails, hasPaidAccess);
    const isResolvingOwnerWorkspaceAccess = !shouldRenderMobileShell
        && isOwnerWorkspaceRoute
        && activeSubscriptionLoading;
    const isRedirectingOwnerWorkspace = !shouldRenderMobileShell && isOwnerWorkspaceRoute && (
        (hasStarterAccess && !isStarterWorkspaceRoute(pathname))
        || (hasRecoveryOnlyAccess && !isStarterRecoveryRoute(pathname))
    );
    const [sidebarShellExpanded, setSidebarShellExpanded] = useState(false);
    const verticalSidebarOffset = isCollapsed && !sidebarShellExpanded
        ? DASHBOARD_SIDEBAR_COLLAPSED_WIDTH
        : DASHBOARD_SIDEBAR_EXPANDED_WIDTH;

    useEffect(() => {
        if (!hasMounted || hasPaidAccess || shouldRenderMobileShell) return;

        if (hasStarterAccess && !isStarterWorkspaceRoute(pathname)) {
            router.replace('/use-menulist');
            return;
        }

        if (hasRecoveryOnlyAccess && !isStarterRecoveryRoute(pathname)) {
            router.replace('/billing');
        }
    }, [
        hasMounted,
        hasPaidAccess,
        hasRecoveryOnlyAccess,
        hasStarterAccess,
        pathname,
        router,
        shouldRenderMobileShell,
    ]);

    const renderContent = () => {

        if (isResolvingOwnerWorkspaceAccess || isRedirectingOwnerWorkspace) {
            return <BrandedPageLoader page="Checking Plan Access" brand="menulist" />;
        }

        if (SKIP_CLIENT_APP_LAYOUT_ROUTINGS.includes(pathname)) {
            return <>{props.children}</>
        }

        // Long-term shell routing: keep handheld devices in the mobile shell
        // even when rotated to landscape. Internal screen layouts can respond
        // to width changes without the entire app remounting into desktop UI.
        if (shouldRenderMobileShell) {
            return <MobileShell />;
        }

        return <Layout className={`${styles.layoutWrapper}`} dir={isRTLLayout ? "rtl" : "ltr"} >
            <Fragment>
                {/* "Return to Mobile" banner — shown when mobile user forced desktop mode */}
                {hasMounted && isHandheld && forceDesktop && FEATURE_FLAGS.ENABLE_MOBILE_UI && (
                    <button
                        type="button"
                        style={{
                            backgroundColor: token.colorPrimary,
                            border: 0,
                            color: token.colorTextLightSolid,
                            textAlign: 'center',
                            padding: '8px 16px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            minHeight: 44,
                            width: '100%',
                            zIndex: 9999
                        }}
                        onClick={() => {
                            clearForceDesktopMode();
                            setForceDesktopRefreshKey((current) => current + 1);
                        }}
                    >
                        {tMobileShell('returnToMobile')}
                    </button>
                )}
                <style jsx global>{`
                  .${styles.mainContentWraper} {
                    background-image: radial-gradient(
                      ${isDarkMode
                        ? `color-mix(in srgb, ${token.colorBorderSecondary} 28%, transparent 72%)`
                        : `color-mix(in srgb, ${token.colorBorder} 70%, transparent)`}
                      1px,
                      transparent 0
                    );
                  }
                `}</style>
                <Layout
                    style={isVerticalSidebar && !isHandheldDesktopRoute ? {
                        paddingInlineStart: `${verticalSidebarOffset}px`,
                        transition: 'padding-inline-start 0.2s ease',
                    } : {}}
                >
                    {!isHandheldDesktopRoute ? <HeaderComponent /> : null}
                    {!isHandheldDesktopRoute ? (isVerticalSidebar ? (
                        <SidebarComponent onExpandedChange={setSidebarShellExpanded} />
                    ) : <HorizontalSidebar />) : null}
                    {!isHandheldDesktopRoute ? <AppSettingsPanel /> : null}
                    <Content
                        className={styles.mainContentWraper}
                        id="main-content"
                        tabIndex={-1}
                        style={{
                            minHeight: isHandheldDesktopRoute ? '100dvh' : isVerticalSidebar ? 'calc(100vh - 52px)' : 'calc(100vh - 98px)',
                            overflowX: isHandheldDesktopRoute ? 'hidden' : undefined,
                            width: "100%"
                        }}>
                        <OutletContextBanner />
                        <StarterActivationBanner />
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
            {props.globalOverlays}
            <GlobalKeyboardShortcutsProvider>
                <NetworkStatusProvider>
                    <SkipToContentLink />
                    {renderContent()}
                </NetworkStatusProvider>
            </GlobalKeyboardShortcutsProvider>
        </AntdThemeProvider>
    )
}
