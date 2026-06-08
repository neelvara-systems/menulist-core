'use client'

import { FEATURE_FLAGS } from '@config/features';
import { emitDeploymentBadgeToggle } from '@constant/deploymentDebug';
import { PERMISSIONS } from '@constant/permissions';
import { ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { setForceDesktopRoute } from '@lib/mobile/forceDesktopMode';
import { hasStarterWorkspaceAccess } from '@lib/onboarding/starterActivation';
import { hasAnyPermission } from '@lib/permissions/permissionRequirements';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { App as AntApp, theme } from 'antd';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import BrandedPageLoader from '@atoms/brandedPageLoader';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCreditCard } from 'react-icons/lu';
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
const StarterActivationBanner = dynamic(() => import('../onboarding/StarterActivationBanner'), { ssr: false });

const MOBILE_ROUTE_HASH_PREFIX = '#mobile/';
const MOBILE_BOTTOM_NAV_CLEARANCE = 'calc(env(safe-area-inset-bottom) + 88px)';
type MobileRouteState = { tab: MobileTab; todayScreen: 'main' | 'dashboard' | 'history'; moreScreen: MoreSubScreen };
const MOBILE_ROUTE_DEFAULT: MobileRouteState = { tab: 'today', todayScreen: 'main', moreScreen: 'main' };
const OWNER_PATH_TO_MOBILE_ROUTE: Record<string, MobileRouteState> = {
    '/dashboard': MOBILE_ROUTE_DEFAULT,
    '/business-health': { tab: 'more', todayScreen: 'main', moreScreen: 'businessHealth' },
    '/today': MOBILE_ROUTE_DEFAULT,
    '/today/history': { tab: 'today', todayScreen: 'history', moreScreen: 'main' },
    '/projects': { tab: 'menu', todayScreen: 'main', moreScreen: 'main' },
    '/use-menulist': { tab: 'share', todayScreen: 'main', moreScreen: 'main' },
    '/assets': { tab: 'more', todayScreen: 'main', moreScreen: 'printAssets' },
    '/use-menulist/print-assets': { tab: 'more', todayScreen: 'main', moreScreen: 'printAssets' },
    '/use-menulist/menu-card-export': { tab: 'more', todayScreen: 'main', moreScreen: 'printMenu' },
    '/qr-code': { tab: 'share', todayScreen: 'main', moreScreen: 'main' },
    '/qrCode': { tab: 'share', todayScreen: 'main', moreScreen: 'main' },
    '/feedback': { tab: 'more', todayScreen: 'main', moreScreen: 'feedback' },
    '/business-settings': { tab: 'more', todayScreen: 'main', moreScreen: 'main' },
    '/transactions': { tab: 'more', todayScreen: 'main', moreScreen: 'transactions' },
    '/billing': { tab: 'more', todayScreen: 'main', moreScreen: 'billing' },
    '/locations': { tab: 'more', todayScreen: 'main', moreScreen: 'locations' },
    '/users': { tab: 'more', todayScreen: 'main', moreScreen: 'users' },
    '/users/list': { tab: 'more', todayScreen: 'main', moreScreen: 'users' },
    '/users/permissions': { tab: 'more', todayScreen: 'main', moreScreen: 'roles' },
};
const PLATFORM_PATH_TO_MORE_SCREEN: Record<string, MoreSubScreen> = {
    '/platform': 'platformHub',
    '/platform/entity-blocks': 'entityBlocks',
    '/platform/tenants': 'platformTenants',
    '/platform/stores': 'platformStores',
    '/platform/users': 'platformUsers',
    '/platform/owner-business-assistant': 'ownerBusinessAssistantMonitor',
    '/platform/ops-control-room': 'opsControlRoom',
    '/platform/extraction-monitor': 'extractionMonitor',
    '/platform/scheduler-monitor': 'schedulerMonitor',
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
    kb: 'answerlatticeDocs',
    ticket: 'answerlatticeSupport',
    changelog: 'answerlatticeReleaseNotes',
};
const PLATFORM_MORE_SCREENS: MoreSubScreen[] = [
    'platformHub',
    'entityBlocks',
    'platformTenants',
    'platformStores',
    'platformUsers',
    'ownerBusinessAssistantMonitor',
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
    'businessHealth',
    'designEditor',
    'printAssets',
    'printMenu',
];

function normalizePathname(pathname: string) {
    if (pathname === '/') return pathname;
    return pathname.replace(/\/+$/, '');
}

function getHelpCenterMoreScreen(pathname: string, search: string) {
    const segments = normalizePathname(pathname).split('/').filter(Boolean);
    const pathTab = segments[0] === 'help-center' ? segments[1] || '' : '';
    const tab = new URLSearchParams(search).get('tab') || pathTab;
    return HELP_CENTER_TAB_TO_MORE_SCREEN[tab] || 'answerlatticeHelp';
}

function parseMobileRouteHash(hash: string): MobileRouteState {
    const fallback = MOBILE_ROUTE_DEFAULT;
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
            todayScreen: parts[1] === 'dashboard' ? 'dashboard' : parts[1] === 'history' && FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY ? 'history' : 'main',
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

function parseMobileRoutePathname(pathname: string, search = ''): MobileRouteState | null {
    const normalizedPathname = normalizePathname(pathname);
    const ownerRoute = OWNER_PATH_TO_MOBILE_ROUTE[normalizedPathname];
    const platformScreen = PLATFORM_PATH_TO_MORE_SCREEN[normalizedPathname];
    const opsScreen = OPS_PATH_TO_MORE_SCREEN[normalizedPathname];
    const resellerScreen = RESELLER_PATH_TO_MORE_SCREEN[normalizedPathname];

    if (ownerRoute) {
        if (ownerRoute.todayScreen === 'history' && !FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {
            return MOBILE_ROUTE_DEFAULT;
        }
        return ownerRoute;
    }

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
    if (hash.startsWith(MOBILE_ROUTE_HASH_PREFIX)) {
        return parseMobileRouteHash(hash);
    }

    return parseMobileRoutePathname(pathname, search) || parseMobileRouteHash('');
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
        activeSubscription,
        activeSubscriptionLoading,
        storeDetails,
        userPermissions,
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
    const hasStarterAccess = hasStarterWorkspaceAccess(storeDetails, hasSubscription);
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatformAdmin = platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const isResellerAccount = platformRole === RESELLER_USER_ROLE;
    const isPlatformMobileScreen = activeTab === 'more' && PLATFORM_MORE_SCREENS.includes(moreScreen);
    const isResellerMobileScreen = activeTab === 'more' && RESELLER_MORE_SCREENS.includes(moreScreen);
    const shouldEagerLoadSelectedProject = activeTab === 'today'
        || activeTab === 'menu'
        || (activeTab === 'more' && SELECTED_PROJECT_DATA_MORE_SCREENS.includes(moreScreen));
    const shouldBypassSubscriptionGate = (isPlatformAdmin && (isPlatformMobileScreen || isResellerMobileScreen)) || (isResellerAccount && isResellerMobileScreen);
    const canUseTodayTab = hasAnyPermission(userPermissions, [
        PERMISSIONS.MANAGE_MENU_SHARING,
        PERMISSIONS.PUBLISH_MENU,
        PERMISSIONS.MANAGE_MENU,
    ]);
    const canUseMenuTab = hasAnyPermission(userPermissions, [
        PERMISSIONS.MANAGE_MENU,
        PERMISSIONS.PUBLISH_MENU,
        PERMISSIONS.USE_MENU_EXTRACTION,
        PERMISSIONS.GENERATE_DESCRIPTIONS,
        PERMISSIONS.GENERATE_IMAGES,
    ]);
    const canUseShareTab = hasAnyPermission(userPermissions, [
        PERMISSIONS.MANAGE_MENU_SHARING,
        PERMISSIONS.PUBLISH_MENU,
    ]);
    const canViewAnalytics = hasAnyPermission(userPermissions, [PERMISSIONS.VIEW_ANALYTICS]);
    const visibleTabs: MobileTab[] = useMemo(() => {
        if (hasStarterAccess) {
            return [
                ...(canUseMenuTab ? ['menu' as MobileTab] : []),
                ...(canUseShareTab ? ['share' as MobileTab] : []),
                'more',
            ];
        }

        return [
            ...(canUseTodayTab ? ['today' as MobileTab] : []),
            ...(canUseMenuTab ? ['menu' as MobileTab] : []),
            ...(canUseShareTab ? ['share' as MobileTab] : []),
            'more',
        ];
    }, [canUseMenuTab, canUseShareTab, canUseTodayTab, hasStarterAccess]);

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
            const nextRoute = window.location.hash.startsWith(MOBILE_ROUTE_HASH_PREFIX)
                ? parseMobileRouteHash(window.location.hash)
                : parseMobileRoutePathname(window.location.pathname, window.location.search) || parseMobileRouteHash('');
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
        if (window.location.hash.startsWith(MOBILE_ROUTE_HASH_PREFIX)) {
            const nextRoute = parseMobileRouteHash(window.location.hash);
            setActiveTab(nextRoute.tab);
            setTodayScreen(nextRoute.todayScreen);
            setMoreScreen(nextRoute.moreScreen);
            setIsMoreRootScreen(nextRoute.moreScreen === 'main');
            return;
        }

        const nextRoute = parseMobileRoutePathname(pathname, searchParamKey);
        if (!nextRoute) {
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
        if (!visibleTabs.includes(tab)) return;
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
    }, [activeTab, moreScreen, scrollActiveScreenToTop, visibleTabs]);

    useEffect(() => {
        if (!visibleTabs.includes(activeTab)) {
            setActiveTab(visibleTabs[0] || 'more');
        }
    }, [activeTab, visibleTabs]);

    const handleOpenMenuTab = useCallback(() => {
        if (!canUseMenuTab) {
            setActiveTab('more');
            setMoreScreen('main');
            setIsMoreRootScreen(true);
            return;
        }
        setActiveTab('menu');
        setMoreScreen('main');
        setIsMoreRootScreen(true);
    }, [canUseMenuTab]);

    const handleOpenDesignEditor = useCallback(() => {
        setActiveTab('more');
        setMoreScreen('designEditor');
        setIsMoreRootScreen(false);
        setTodayScreen('main');
    }, []);

    const handleOpenDigitalScreens = useCallback(() => {
        setActiveTab('more');
        setMoreScreen('digitalScreens');
        setIsMoreRootScreen(false);
        setTodayScreen('main');
    }, []);

    const handleOpenPosSync = useCallback(() => {
        setActiveTab('more');
        setMoreScreen('posSync');
        setIsMoreRootScreen(false);
        setTodayScreen('main');
    }, []);

    const handleOpenPrintMenu = useCallback(() => {
        setActiveTab('more');
        setMoreScreen('printMenu');
        setIsMoreRootScreen(false);
        setTodayScreen('main');
    }, []);

    const handleOpenPrintAssets = useCallback(() => {
        setActiveTab('more');
        setMoreScreen('printAssets');
        setIsMoreRootScreen(false);
        setTodayScreen('main');
    }, []);

    const handleOpenBusinessHealth = useCallback(() => {
        if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH) {
            return;
        }
        setActiveTab('more');
        setMoreScreen('businessHealth');
        setIsMoreRootScreen(false);
        setTodayScreen('main');
    }, []);

    const handleOpenHistory = useCallback(() => {
        if (!FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {
            return;
        }
        setTodayScreen('history');
    }, []);

    useEffect(() => {
        if (todayScreen === 'history' && !FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {
            setTodayScreen('main');
        }
    }, [todayScreen]);

    const screen = activeTab === 'today'
        ? (
            todayScreen === 'dashboard'
                ? <MobileDashboardScreen onBack={() => setTodayScreen('main')} onOpenBusinessHealth={handleOpenBusinessHealth} onOpenDesignEditor={handleOpenDesignEditor} />
                : todayScreen === 'history' && FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY
                    ? <MobileTodayHistoryScreen onBack={() => setTodayScreen('main')} />
                    : (
                    <MobileHoursScreen
                            onOpenDashboard={() => {
                                if (canViewAnalytics) setTodayScreen('dashboard');
                            }}
                        onOpenHistory={handleOpenHistory}
                        onOpenMenuTab={handleOpenMenuTab}
                        onOpenShare={() => {
                                setActiveTab(canUseShareTab ? 'share' : 'more');
                                setTodayScreen('main');
                            }}
                        />
                    )
        )
        : activeTab === 'share'
            ? <MobileShareScreen onOpenDigitalScreens={handleOpenDigitalScreens} onOpenDesignEditor={handleOpenDesignEditor} onOpenPosSync={handleOpenPosSync} onOpenPrintAssets={handleOpenPrintAssets} onOpenPrintMenu={handleOpenPrintMenu} />
        : activeTab === 'more'
            ? <MobileMoreScreen initialScreen={moreScreen} onOpenMenuTab={handleOpenMenuTab} onRootStateChange={setIsMoreRootScreen} onScreenChange={setMoreScreen} />
                : <MobileMenuScreen onOpenDesignEditor={handleOpenDesignEditor} onOpenPrintMenu={handleOpenPrintMenu} />;

    if (activeSubscriptionLoading && !hasSubscription && !hasStarterAccess && !shouldBypassSubscriptionGate) {
        return <BrandedPageLoader page="Mobile App" />;
    }

    if (!hasSubscription && !hasStarterAccess && !shouldBypassSubscriptionGate) {
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
                <StarterActivationBanner />
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
                                ? 'calc(env(safe-area-inset-top) + 8px)'
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
                    visibleTabs={visibleTabs}
                />
            </Flex>
            </MobileProjectsProvider>
        </AntApp>
    );
}
