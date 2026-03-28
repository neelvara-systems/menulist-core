'use client'

import OutletContextBanner from '@atoms/OutletContextBanner';
import { FEATURE_FLAGS } from '@config/features';
import { SKIP_CLIENT_APP_LAYOUT_ROUTINGS } from '@constant/navigations';
import { useAppSelector } from '@hook/useAppSelector';
import useDeviceType from '@hook/useDeviceType';
import HeadMetaTags from '@organisms/headMetaTags';
import HorizontalSidebar from '@organisms/sidebar/horizontalSidebar';
import AntdThemeProvider from '@providers/antdThemeProvider';
import GlobalKeyboardShortcutsProvider from '@providers/GlobalKeyboardShortcutsProvider';
import NetworkStatusProvider from '@providers/NetworkStatusProvider';
import { getDarkModeState, getRTLDirectionState, getSidebarLayoutState, getSidebarState } from '@reduxSlices/clientThemeConfig';
import { Layout, theme } from 'antd';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';
import styles from './layoutWrapper.module.scss';

const AppSettingsPanel = dynamic(() => import('@organisms/sidebar/appSettingsPanel'), { ssr: false });
const HeaderComponent = dynamic(() => import('@organisms/headerComponent'), { ssr: false });
const SidebarComponent = dynamic(() => import('@organisms/sidebar'), { ssr: false });
const MobileShell = dynamic(() => import('../../mobile/MobileShell'), { ssr: false });

const { Content } = Layout;
export default function AntdLayoutWrapper(props: any) {

    const isCollapsed = useAppSelector(getSidebarState);
    const isDarkMode = useAppSelector(getDarkModeState);
    const isRTLDirection = useAppSelector(getRTLDirectionState)
    const { token } = theme.useToken();
    const pathname = usePathname();
    const isVerticalSidebar = useAppSelector(getSidebarLayoutState)
    const { isMobile, hasMounted } = useDeviceType();

    // Check for force-desktop override from localStorage (set via More > Switch to Desktop)
    const forceDesktop = typeof window !== 'undefined' && localStorage.getItem('forceDesktopMode') === 'true';

    const renderContent = () => {

        if (SKIP_CLIENT_APP_LAYOUT_ROUTINGS.includes(pathname)) {
            return <>{props.children}</>
        }

        // Mobile shell: render only on mobile devices with feature flag ON and no force-desktop override
        if (hasMounted && isMobile && FEATURE_FLAGS.ENABLE_MOBILE_UI && !forceDesktop) {
            return <MobileShell />;
        }

        return <Layout className={`${styles.layoutWrapper}`} dir={isRTLDirection ? "rtl" : "ltr"} >
            <HeadMetaTags title={undefined} description={undefined} image={undefined} siteName={undefined} storeData={undefined} />
            <Fragment>
                {/* "Return to Mobile" banner — shown when mobile user forced desktop mode */}
                {hasMounted && isMobile && forceDesktop && FEATURE_FLAGS.ENABLE_MOBILE_UI && (
                    <div
                        style={{ background: '#1677ff', color: '#fff', textAlign: 'center', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', zIndex: 9999 }}
                        onClick={() => { localStorage.removeItem('forceDesktopMode'); window.location.reload(); }}
                    >
                        You&apos;re viewing the desktop version. <strong>Tap here to return to mobile.</strong>
                    </div>
                )}
                <Layout style={isVerticalSidebar ? { paddingLeft: isCollapsed ? "62px" : "200px" } : {}}>
                    <HeaderComponent />
                    {isVerticalSidebar ? <SidebarComponent /> : <HorizontalSidebar />}
                    <AppSettingsPanel />
                    <Content className={styles.mainContentWraper}
                        style={{
                            backgroundImage: isDarkMode ? `radial-gradient(#dee1ec57 0.8px, transparent 0)` : `radial-gradient(#cbcbcb 1px, transparent 0)`,
                            // background: isDarkMode ? token.colorFillContent : token.colorBgBase,
                            minHeight: isVerticalSidebar ? 'calc(100vh - 52px)' : 'calc(100vh - 98px)',
                            width: "100%"
                        }}>
                        <OutletContextBanner />
                        {props.children}
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