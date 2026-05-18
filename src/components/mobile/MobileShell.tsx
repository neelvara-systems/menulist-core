'use client'

import { emitDeploymentBadgeToggle } from '@constant/deploymentDebug';
import { ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { setForceDesktopRoute } from '@lib/mobile/forceDesktopMode';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { App as AntApp, theme } from 'antd';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ServerSidePageLoader from '../../app/loading';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { LuArrowLeft, LuCreditCard } from 'react-icons/lu';
import { Button, Card, Flex, MobileAntdAppBridge, Text, Title } from './antd';
import MobileNavigation, { type MobileTab } from './MobileNavigation';
import MobileProjectsProvider from './providers/MobileProjectsProvider';
import type { MoreSubScreen } from './screens/MobileMoreScreen';

const MobileMenuScreen = dynamic(() => import('./screens/MobileMenuScreen'), { ssr: false });
const MobileHoursScreen = dynamic(() => import('./screens/MobileHoursScreen'), { ssr: false });
const MobileDashboardScreen = dynamic(() => import('./screens/MobileDashboardScreen'), { ssr: false });
const MobileTodayHistoryScreen = dynamic(() => import('./screens/MobileTodayHistoryScreen'), { ssr: false });
const MobileShareScreen = dynamic(() => import('./screens/MobileShareScreen'), { ssr: false });
const MobileMoreScreen = dynamic(() => import('./screens/MobileMoreScreen'), { ssr: false });

const MOBILE_ROUTE_HASH_PREFIX = '#mobile/';
const MOBILE_BOTTOM_NAV_CLEARANCE = 'calc(env(safe-area-inset-bottom) + 88px)';
const PLATFORM_PATH_TO_MORE_SCREEN: Record<string, MoreSubScreen> = {
    '/platform': 'platformHub',
    '/platform/entity-blocks': 'entityBlocks',
    '/platform/tenants': 'platformTenants',
    '/platform/stores': 'platformStores',
    '/platform/users': 'platformUsers',
    '/platform/ops-control-room': 'opsControlRoom',
    '/platform/extraction-monitor': 'extractionMonitor',
    '/platform/scheduler-monitor': 'schedulerMonitor',
    '/platform/support-tickets': 'supportTickets',
    '/platform/feedback-admin': 'feedbackAdmin',
    '/platform/knowledge-base': 'knowledgeBase',
    '/platform/kb-generation': 'kbGeneration',
    '/platform/changelog': 'changelog',
    '/platform/chat-management': 'chatManagement',
    '/platform/chat-insights': 'chatInsights',
    '/platform/chat-backfill': 'chatBackfill',
    '/platform/chat-weekly-digest': 'chatWeeklyDigest',
    '/platform/chat-roi-calculator': 'chatRoiCalculator',
};
const OPS_PATH_TO_MORE_SCREEN: Record<string, MoreSubScreen> = {
    '/ops': 'opsControlRoom',
    '/ops/extraction': 'extractionMonitor',
    '/ops/scheduler': 'schedulerMonitor',
};
const RESELLER_PATH_TO_MORE_SCREEN: Record<string, MoreSubScreen> = {
    '/reseller': 'resellerHub',
    '/reseller/manage': 'resellerManagement',
    '/reseller/onboard': 'resellerOnboarding',
};
const HELP_CENTER_TAB_TO_MORE_SCREEN: Record<string, MoreSubScreen> = {
    kb: 'canonicaDocs',
    ticket: 'canonicaSupport',
    changelog: 'canonicaReleaseNotes',
};
const PLATFORM_MORE_SCREENS: MoreSubScreen[] = [
    'platformHub',
    'canonicaHub',
    'entityBlocks',
    'platformTenants',
    'platformStores',
    'platformUsers',
    'supportTickets',
    'feedbackAdmin',
    'knowledgeBase',
    'kbGeneration',
    'changelog',
    'chatManagement',
    'chatInsights',
    'chatBackfill',
    'chatWeeklyDigest',
    'chatRoiCalculator',
    'opsControlRoom',
    'extractionMonitor',
    'schedulerMonitor',
];
const RESELLER_MORE_SCREENS: MoreSubScreen[] = [
    'resellerHub',
    'resellerDashboard',
    'resellerManagement',
    'resellerOnboarding',
];
const SELECTED_PROJECT_DATA_MORE_SCREENS: MoreSubScreen[] = [
    'dashboard',
    'designEditor',
];

function normalizePathname(pathname: string) {
    if (pathname === '/') return pathname;
    return pathname.replace(/\/+$/, '');
}

function getHelpCenterMoreScreen(pathname: string, search: string) {
    const segments = normalizePathname(pathname).split('/').filter(Boolean);
    const pathTab = segments[0] === 'help-center' ? segments[1] || '' : '';
    const tab = new URLSearchParams(search).get('tab') || pathTab;
    return HELP_CENTER_TAB_TO_MORE_SCREEN[tab] || 'canonicaHelp';
}

function parseMobileRouteHash(hash: string): { tab: MobileTab; todayScreen: 'main' | 'dashboard' | 'history'; moreScreen: MoreSubScreen } {
    const fallback = { tab: 'today' as MobileTab, todayScreen: 'main' as const, moreScreen: 'main' as MoreSubScreen };
    if (!hash.startsWith(MOBILE_ROUTE_HASH_PREFIX)) {
        return fallback;
    }

    const parts = hash.slice(MOBILE_ROUTE_HASH_PREFIX.length).split('/').filter(Boolean);
    const tab = parts[0] as MobileTab | undefined;

    if (!tab || !['today', 'menu', 'share', 'more'].includes(tab)) {
        return fallback;
    }

    if (tab === 'today') {
        return {
            tab,
            todayScreen: parts[1] === 'dashboard' ? 'dashboard' : parts[1] === 'history' ? 'history' : 'main',
            moreScreen: 'main' as MoreSubScreen,
        };
    }

    if (tab === 'more') {
        return {
            tab,
            todayScreen: 'main',
            moreScreen: (parts[1] || 'main') as MoreSubScreen,
        };
    }

    return {
        tab,
        todayScreen: 'main',
        moreScreen: 'main' as MoreSubScreen,
    };
}

function parseMobileRoutePathname(pathname: string, search = ''): { tab: MobileTab; todayScreen: 'main' | 'dashboard' | 'history'; moreScreen: MoreSubScreen } | null {
    const normalizedPathname = normalizePathname(pathname);
    const platformScreen = PLATFORM_PATH_TO_MORE_SCREEN[normalizedPathname];
    const opsScreen = OPS_PATH_TO_MORE_SCREEN[normalizedPathname];
    const resellerScreen = RESELLER_PATH_TO_MORE_SCREEN[normalizedPathname];

    if (normalizedPathname === '/help-center' || normalizedPathname.startsWith('/help-center/')) {
        return {
            tab: 'more',
            todayScreen: 'main',
            moreScreen: getHelpCenterMoreScreen(normalizedPathname, search),
        };
    }

    if (platformScreen) {
        return {
            tab: 'more',
            todayScreen: 'main',
            moreScreen: platformScreen,
        };
    }

    if (opsScreen) {
        return {
            tab: 'more',
            todayScreen: 'main',
            moreScreen: opsScreen,
        };
    }

    if (resellerScreen) {
        return {
            tab: 'more',
            todayScreen: 'main',
            moreScreen: resellerScreen,
        };
    }

    if (normalizedPathname.startsWith('/platform/')) {
        return {
            tab: 'more',
            todayScreen: 'main',
            moreScreen: 'platformHub',
        };
    }

    return null;
}

function parseInitialMobileRoute(pathname: string, hash: string, search = '') {
    return parseMobileRoutePathname(pathname, search)
        || (hash.startsWith(MOBILE_ROUTE_HASH_PREFIX) ? parseMobileRouteHash(hash) : parseMobileRouteHash(''));
}

function buildMobileRouteHash(tab: MobileTab, todayScreen: 'main' | 'dashboard' | 'history', moreScreen: MoreSubScreen) {
    if (tab === 'today' && todayScreen !== 'main') {
        return `${MOBILE_ROUTE_HASH_PREFIX}today/${todayScreen}`;
    }
    if (tab === 'more' && moreScreen !== 'main') {
        return `${MOBILE_ROUTE_HASH_PREFIX}more/${moreScreen}`;
    }
    return `${MOBILE_ROUTE_HASH_PREFIX}${tab}`;
}

export default function MobileShell() {
    const {
        activeStoreContext,
        activeSubscription,
        activeSubscriptionLoading,
        isMasterUser,
        setActiveStoreContext,
        tenantDetails,
    } = useContext(PlatformGlobalDataContext);
    const { token } = theme.useToken();
    const { data: session } = useSession();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const searchParamKey = searchParams.toString();
    const initialRoute = typeof window === 'undefined' ? { tab: 'today' as MobileTab, todayScreen: 'main' as const, moreScreen: 'main' as MoreSubScreen } : parseInitialMobileRoute(pathname, window.location.hash, window.location.search);
    const [activeTab, setActiveTab] = useState<MobileTab>(initialRoute.tab);
    const [todayScreen, setTodayScreen] = useState<'main' | 'dashboard' | 'history'>(initialRoute.todayScreen);
    const [moreScreen, setMoreScreen] = useState<MoreSubScreen>(initialRoute.moreScreen);
    const [isMoreRootScreen, setIsMoreRootScreen] = useState(initialRoute.moreScreen === 'main');
    const [isOffline, setIsOffline] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const hasSubscription = hasValidSubscriptionAccess(activeSubscription);
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatformAdmin = platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const isResellerAccount = platformRole === RESELLER_USER_ROLE;
    const isPlatformMobileScreen = activeTab === 'more' && PLATFORM_MORE_SCREENS.includes(moreScreen);
    const isResellerMobileScreen = activeTab === 'more' && RESELLER_MORE_SCREENS.includes(moreScreen);
    const shouldEagerLoadSelectedProject = activeTab === 'today'
        || activeTab === 'menu'
        || (activeTab === 'more' && SELECTED_PROJECT_DATA_MORE_SCREENS.includes(moreScreen));
    const shouldBypassSubscriptionGate = (isPlatformAdmin && (isPlatformMobileScreen || isResellerMobileScreen)) || (isResellerAccount && isResellerMobileScreen);
    const activeOutletSummary = isMasterUser && activeStoreContext
        ? tenantDetails?.storesList?.find((store: any) => store.storeId === activeStoreContext)
        : null;
    const activeOutletName = activeOutletSummary
        ? getStoreContextName(activeOutletSummary, `Store ${activeStoreContext}`)
        : '';

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        setIsOffline(!navigator.onLine);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const nextRoute = parseMobileRoutePathname(window.location.pathname, window.location.search) || parseMobileRouteHash(window.location.hash);
            setActiveTab(nextRoute.tab);
            setTodayScreen(nextRoute.todayScreen);
            setMoreScreen(nextRoute.moreScreen);
            setIsMoreRootScreen(nextRoute.moreScreen === 'main');
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => {
            window.removeEventListener('hashchange', handleHashChange);
        };
    }, []);

    useEffect(() => {
        const nextRoute = parseMobileRoutePathname(pathname, searchParamKey);
        if (!nextRoute) {
            if (window.location.hash.startsWith(MOBILE_ROUTE_HASH_PREFIX)) return;
            return;
        }

        setActiveTab(nextRoute.tab);
        setTodayScreen(nextRoute.todayScreen);
        setMoreScreen(nextRoute.moreScreen);
        setIsMoreRootScreen(nextRoute.moreScreen === 'main');
    }, [pathname, searchParamKey]);

    useEffect(() => {
        const nextHash = buildMobileRouteHash(activeTab, todayScreen, moreScreen);
        if (window.location.hash !== nextHash) {
            window.history.replaceState(null, '', nextHash);
        }
    }, [activeTab, moreScreen, todayScreen]);

    const scrollActiveScreenToTop = useCallback(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const handleTabChange = useCallback((tab: MobileTab) => {
        if (tab === activeTab) {
            if (tab === 'more' && moreScreen !== 'main') {
                setMoreScreen('main');
                setIsMoreRootScreen(true);
                requestAnimationFrame(scrollActiveScreenToTop);
                return;
            }
            scrollActiveScreenToTop();
            return;
        }
        setActiveTab(tab);
        if (tab !== 'today') {
            setTodayScreen('main');
        }
        if (tab !== 'more') {
            setIsMoreRootScreen(true);
            setMoreScreen('main');
        }
    }, [activeTab, moreScreen, scrollActiveScreenToTop]);

    const handleOpenMenuTab = useCallback(() => {
        setActiveTab('menu');
        setMoreScreen('main');
        setIsMoreRootScreen(true);
    }, []);

    const handleOpenDesignEditor = useCallback(() => {
        setActiveTab('more');
        setMoreScreen('designEditor');
        setIsMoreRootScreen(false);
        setTodayScreen('main');
    }, []);

    const screen = activeTab === 'today'
        ? (
            todayScreen === 'dashboard'
                ? <MobileDashboardScreen onBack={() => setTodayScreen('main')} onOpenDesignEditor={handleOpenDesignEditor} />
                : todayScreen === 'history'
                    ? <MobileTodayHistoryScreen onBack={() => setTodayScreen('main')} />
                    : (
                        <MobileHoursScreen
                            onOpenDashboard={() => setTodayScreen('dashboard')}
                            onOpenHistory={() => setTodayScreen('history')}
                            onOpenMenuTab={handleOpenMenuTab}
                            onOpenShare={() => {
                                setActiveTab('share');
                                setTodayScreen('main');
                            }}
                        />
                    )
        )
        : activeTab === 'share'
            ? <MobileShareScreen onOpenDesignEditor={handleOpenDesignEditor} />
        : activeTab === 'more'
            ? <MobileMoreScreen initialScreen={moreScreen} onOpenMenuTab={handleOpenMenuTab} onRootStateChange={setIsMoreRootScreen} onScreenChange={setMoreScreen} />
                : <MobileMenuScreen onOpenDesignEditor={handleOpenDesignEditor} />;

    if (activeSubscriptionLoading && !hasSubscription && !shouldBypassSubscriptionGate) {
        return <ServerSidePageLoader page="Mobile App" />;
    }

    if (!hasSubscription && !shouldBypassSubscriptionGate) {
        return (
            <Flex
                style={{
                    background: token.colorBgLayout,
                    minHeight: '100dvh',
                    padding: 16,
                    paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
                }}
                vertical
            >
                <Flex align="center" flex={1} justify="center" vertical>
                    <Card style={{ maxWidth: 420, width: '100%' }}>
                        <Flex align="center" gap={16} vertical>
                            <LuCreditCard color={token.colorPrimary} size={48} />
                            <Title level={4} style={{ margin: 0, textAlign: 'center' }}>Subscribe to Get Started</Title>
                            <Text style={{ textAlign: 'center' }}>
                                Choose a plan to start creating your digital menu and managing your business.
                            </Text>
                            <Button
                                block
                                onClick={() => {
                                    setForceDesktopRoute('/billing');
                                    router.push('/billing');
                                }}
                                size="large"
                                style={{ minHeight: 44 }}
                            >
                                View Plans
                            </Button>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>
        );
    }

    return (
        <AntApp>
            <MobileAntdAppBridge />
            <MobileProjectsProvider eagerLoadSelectedProject={shouldEagerLoadSelectedProject}>
            <Flex
                style={{
                    background: token.colorBgLayout,
                    minHeight: '100dvh',
                }}
                vertical
            >
                {isOffline ? (
                    <Card style={{ background: token.colorWarning, borderRadius: 0, color: token.colorTextLightSolid, margin: 0 }}>
                        <Text style={{ color: token.colorTextLightSolid }}>You&apos;re offline. Some features may be limited.</Text>
                    </Card>
                ) : null}
                {activeOutletSummary ? (
                    <Flex
                        align="center"
                        gap={8}
                        justify="space-between"
                        style={{
                            background: '#fff7e6',
                            borderBottom: '1px solid #ffd591',
                            padding: '8px 12px',
                            paddingTop: 'calc(env(safe-area-inset-top) + 8px)',
                        }}
                    >
                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                            <Text strong style={{ color: '#ad6800' }}>{activeOutletName}</Text>
                            <Text style={{ color: '#ad6800', fontSize: 12 }}>Changes apply to this location.</Text>
                        </Flex>
                        <Button
                            fill="outline"
                            onClick={() => setActiveStoreContext(null)}
                            size="small"
                            style={{ minHeight: 36 }}
                        >
                            <Flex align="center" gap={4}>
                                <LuArrowLeft size={14} />
                                <Text>HQ</Text>
                            </Flex>
                        </Button>
                    </Flex>
                ) : null}
                <Flex
                    data-mobile-shell-scroll="true"
                    flex={1}
                    ref={scrollContainerRef}
                    style={{
                        overflowY: 'auto',
                        paddingBottom: MOBILE_BOTTOM_NAV_CLEARANCE,
                        paddingTop:
                            activeTab === 'menu' ||
                            activeTab === 'share' ||
                            (activeTab === 'today' && todayScreen === 'main') ||
                            (activeTab === 'more' && isMoreRootScreen)
                                ? activeOutletSummary ? 8 : 'calc(env(safe-area-inset-top) + 8px)'
                                : 0,
                        scrollPaddingBottom: MOBILE_BOTTOM_NAV_CLEARANCE,
                    }}
                    vertical
                >
                    {screen}
                </Flex>
                <MobileNavigation
                    activeTab={activeTab}
                    feedbackCount={0}
                    onTabChange={handleTabChange}
                    onMoreTabLongPress={emitDeploymentBadgeToggle}
                />
            </Flex>
            </MobileProjectsProvider>
        </AntApp>
    );
}
