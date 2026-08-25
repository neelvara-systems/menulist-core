'use client'

import { FEATURE_FLAGS } from '@config/features';
import { emitDeploymentBadgeToggle } from '@constant/deploymentDebug';
import { PERMISSIONS } from '@constant/permissions';
import { MENULIST_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasStarterWorkspaceAccess, isStarterActivationStore } from '@lib/onboarding/starterActivation';
import { signOutSession } from '@lib/auth/client';
import { hasAnyPermission } from '@lib/permissions/permissionRequirements';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { App as AntApp, theme } from 'antd';
import { useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import BrandedPageLoader from '@atoms/brandedPageLoader';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCreditCard, LuLogOut } from 'react-icons/lu';
import { Button, Card, Flex, MobileAntdAppBridge, Text, Title } from './antd';
import MobileNavigation, { type MobileTab } from './MobileNavigation';
import MobileProjectsProvider from './providers/MobileProjectsProvider';
import type { MoreSubScreen } from './screens/MobileMoreScreen';

const MobileMenuScreen = dynamic(() => import('./screens/MobileMenuScreen'), { ssr: false });
const MobileHoursScreen = dynamic(() => import('./screens/MobileHoursScreen'), { ssr: false });
const MobileDashboardScreen = dynamic(() => import('./screens/MobileDashboardScreen'), { ssr: false });
const MobileTodayHistoryScreen = dynamic(() => import('./screens/MobileTodayHistoryScreen'), { ssr: false });
const MobileShareScreen = dynamic(() => import('./screens/MobileShareScreen'), { ssr: false });
const MobileAiMenuManagerScreen = dynamic(() => import('./ai-menu-manager/MobileAiMenuManagerScreen'), { ssr: false });
const MobileMoreScreen = dynamic(() => import('./screens/MobileMoreScreen'), { ssr: false });
const MobileBusinessHealthScreen = dynamic(() => import('./screens/MobileBusinessHealthScreen'), { ssr: false });
const StarterActivationBanner = dynamic(() => import('../onboarding/StarterActivationBanner'), { ssr: false });

const MOBILE_ROUTE_HASH_PREFIX = '#mobile/';
const MOBILE_BOTTOM_NAV_CLEARANCE = 'calc(env(safe-area-inset-bottom) + 88px)';
type MobileRouteState = { tab: MobileTab; todayScreen: 'main' | 'dashboard' | 'history'; moreScreen: MoreSubScreen };
const MOBILE_ROUTE_DEFAULT: MobileRouteState = { tab: 'today', todayScreen: 'main', moreScreen: 'main' };
const OWNER_FEATURE_TO_MOBILE_ROUTE = {
    'businessHealth': { tab: 'more', moreScreen: 'businessHealth', todayScreen: 'main' },
} satisfies Record<string, MobileRouteState>;
const OWNER_PATH_TO_MOBILE_ROUTE: Record<string, MobileRouteState> = {
    '/dashboard': MOBILE_ROUTE_DEFAULT,
    '/business-health': { tab: 'more', todayScreen: 'main', moreScreen: 'businessHealth' },
    '/today': MOBILE_ROUTE_DEFAULT,
    '/today/history': { tab: 'today', todayScreen: 'history', moreScreen: 'main' },
    '/projects': { tab: 'menu', todayScreen: 'main', moreScreen: 'main' },
    '/menu-manager': { tab: 'aiMenuManager', todayScreen: 'main', moreScreen: 'main' },
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
    '/platform/founder-monitor': 'founderMonitor',
    '/platform/owner-business-assistant': 'ownerBusinessAssistantMonitor',
    '/platform/cost-posture': 'costPosture',
    '/platform/asset-templates': 'assetTemplates',
    '/platform/pricing-plans': 'pricingPlans',
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
    '/platform/answerlattice-intake': 'answerlatticeIntake',
    '/platform/ops-control-room': 'opsControlRoom',
    '/platform/extraction-monitor': 'extractionMonitor',
    '/platform/scheduler-monitor': 'schedulerMonitor',
};
const OPS_PATH_TO_MORE_SCREEN: Record<string, MoreSubScreen> = {
    '/ops': 'opsControlRoom',
    '/ops/extraction': 'extractionMonitor',
    '/ops/scheduler': 'schedulerMonitor',
    '/ops/messaging-onboarding': 'messagingOnboardingMonitor',
    '/ops/owner-notifications': 'ownerNotificationMonitor',
    '/ops/platform-notifications': 'platformNotificationMonitor',
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
const HELP_CENTER_MORE_SCREENS: MoreSubScreen[] = [
    'answerlatticeHelp',
    'answerlatticeDocs',
    'answerlatticeSupport',
    'answerlatticeReleaseNotes',
];
const PLATFORM_MORE_SCREENS: MoreSubScreen[] = [
    'platformHub',
    'entityBlocks',
    'platformTenants',
    'platformStores',
    'platformUsers',
    'founderMonitor',
    'ownerBusinessAssistantMonitor',
    'costPosture',
    'assetTemplates',
    'pricingPlans',
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
    'answerlatticeIntake',
    'messagingOnboardingMonitor',
    'ownerNotificationMonitor',
    'platformNotificationMonitor',
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
    'main',
    'dashboard',
    'businessHealth',
    'aiMenuManager',
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

    if (!tab || !['today', 'menu', 'aiMenuManager', 'share', 'more'].includes(tab)) {
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
    const path = normalizedPathname;
    if (path.startsWith('/business-health')) {
        return OWNER_FEATURE_TO_MOBILE_ROUTE.businessHealth;
    }
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
    const t = useTranslations('MobileShell');
    const profileActionsT = useTranslations('ProfileActions');
    const starterT = useTranslations('StarterActivation');
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
    const searchParamKey = searchParams?.toString() ?? '';
    const initialRoute = typeof window === 'undefined' ? { tab: 'today' as MobileTab, todayScreen: 'main' as const, moreScreen: 'main' as MoreSubScreen } : parseInitialMobileRoute(pathname ?? '', window.location.hash, window.location.search);
    const [activeTab, setActiveTab] = useState<MobileTab>(initialRoute.tab);
    const [todayScreen, setTodayScreen] = useState<'main' | 'dashboard' | 'history'>(initialRoute.todayScreen);
    const [moreScreen, setMoreScreen] = useState<MoreSubScreen>(initialRoute.moreScreen);
    const [isMoreRootScreen, setIsMoreRootScreen] = useState(initialRoute.moreScreen === 'main');
    const [subscriptionGateConfirmingSignOut, setSubscriptionGateConfirmingSignOut] = useState(false);
    const [subscriptionGateSignOutError, setSubscriptionGateSignOutError] = useState('');
    const [subscriptionGateSigningOut, setSubscriptionGateSigningOut] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const hasSubscription = hasValidSubscriptionAccess(activeSubscription);
    const hasStarterAccess = hasStarterWorkspaceAccess(storeDetails, hasSubscription);
    const isStarterStore = isStarterActivationStore(storeDetails);
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatformAdmin = platformRole === MENULIST_PLATFORM_USER_ROLE;
    const isResellerAccount = platformRole === RESELLER_USER_ROLE;
    const isPlatformMobileScreen = activeTab === 'more' && PLATFORM_MORE_SCREENS.includes(moreScreen);
    const isResellerMobileScreen = activeTab === 'more' && RESELLER_MORE_SCREENS.includes(moreScreen);
    const isBillingRecoveryScreen = activeTab === 'more' && moreScreen === 'billing';
    const isHelpRecoveryScreen = activeTab === 'more' && HELP_CENTER_MORE_SCREENS.includes(moreScreen);
    const shouldEagerLoadSelectedProject = activeTab === 'today'
        || activeTab === 'menu'
        || activeTab === 'aiMenuManager'
        || (activeTab === 'more' && SELECTED_PROJECT_DATA_MORE_SCREENS.includes(moreScreen));
    const shouldBypassSubscriptionGate = isBillingRecoveryScreen
        || isHelpRecoveryScreen
        || (isPlatformAdmin && (isPlatformMobileScreen || isResellerMobileScreen))
        || (isResellerAccount && isResellerMobileScreen);
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
    const canUseAiMenuManagerTab = FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER
        && FEATURE_FLAGS.ENABLE_AI_MENU_MANAGER_MOBILE
        && hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_MENU]);
    const canViewAnalytics = hasAnyPermission(userPermissions, [PERMISSIONS.VIEW_ANALYTICS]);
    const visibleTabs: MobileTab[] = useMemo(() => {
        if (hasStarterAccess) {
            return [
                ...(canUseMenuTab ? ['menu' as MobileTab] : []),
                ...(canUseAiMenuManagerTab ? ['aiMenuManager' as MobileTab] : []),
                ...(canUseShareTab ? ['share' as MobileTab] : []),
                'more',
            ];
        }

        return [
            ...(canUseTodayTab ? ['today' as MobileTab] : []),
            ...(canUseMenuTab ? ['menu' as MobileTab] : []),
            ...(canUseAiMenuManagerTab ? ['aiMenuManager' as MobileTab] : []),
            ...(canUseShareTab ? ['share' as MobileTab] : []),
            'more',
        ];
    }, [canUseAiMenuManagerTab, canUseMenuTab, canUseShareTab, canUseTodayTab, hasStarterAccess]);

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

        const nextRoute = parseMobileRoutePathname(pathname ?? '', searchParamKey);
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

    const handleOpenShareTab = useCallback(() => {
        if (!canUseShareTab) {
            setActiveTab('more');
            setMoreScreen('main');
            setIsMoreRootScreen(true);
            return;
        }
        setActiveTab('share');
        setMoreScreen('main');
        setIsMoreRootScreen(true);
        setTodayScreen('main');
    }, [canUseShareTab]);

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
        if (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !canViewAnalytics) {
            return;
        }
        setActiveTab('more');
        setMoreScreen('businessHealth');
        setIsMoreRootScreen(false);
        setTodayScreen('main');
    }, [canViewAnalytics]);

    const handleOpenMoreScreen = useCallback((target: MoreSubScreen) => {
        setActiveTab('more');
        setMoreScreen(target);
        setIsMoreRootScreen(target === 'main');
        setTodayScreen('main');
    }, []);

    const handleOpenHistory = useCallback(() => {
        if (!FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {
            return;
        }
        setTodayScreen('history');
    }, []);

    const handleSubscriptionGateSignOut = useCallback(async () => {
        if (subscriptionGateSigningOut) return;

        setSubscriptionGateSignOutError('');
        setSubscriptionGateSigningOut(true);
        try {
            await signOutSession();
        } catch {
            setSubscriptionGateSignOutError(profileActionsT('logoutFailed'));
            setSubscriptionGateSigningOut(false);
        }
    }, [profileActionsT, subscriptionGateSigningOut]);

    useEffect(() => {
        if (todayScreen === 'history' && !FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {
            setTodayScreen('main');
        }
    }, [todayScreen]);

    useEffect(() => {
        if (!userPermissions) return;

        if (todayScreen === 'dashboard' && !canViewAnalytics) {
            setTodayScreen('main');
        }
        if (
            moreScreen === 'businessHealth'
            && (!FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH || !canViewAnalytics)
        ) {
            setMoreScreen('main');
            setIsMoreRootScreen(true);
        }
    }, [canViewAnalytics, moreScreen, todayScreen, userPermissions]);

    const screen = activeTab === 'today'
        ? (
            todayScreen === 'dashboard'
                ? !userPermissions
                    ? <BrandedPageLoader page={t('loadingDashboard')} />
                    : canViewAnalytics ? (
                    <MobileDashboardScreen
                        onBack={() => setTodayScreen('main')}
                        onOpenBusinessHealth={handleOpenBusinessHealth}
                        onOpenDesignEditor={handleOpenDesignEditor}
                        onOpenMenuTab={handleOpenMenuTab}
                        onOpenMoreScreen={handleOpenMoreScreen}
                        onOpenShareTab={handleOpenShareTab}
                    />
                    ) : <BrandedPageLoader page={t('loadingToday')} />
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
            ? <MobileShareScreen onOpenDigitalScreens={handleOpenDigitalScreens} onOpenDesignEditor={handleOpenDesignEditor} onOpenMenuTab={handleOpenMenuTab} onOpenOfficialPage={() => handleOpenMoreScreen('officialPage')} onOpenPosSync={handleOpenPosSync} onOpenPrintAssets={handleOpenPrintAssets} onOpenPrintMenu={handleOpenPrintMenu} />
        : activeTab === 'aiMenuManager'
            ? <MobileAiMenuManagerScreen />
        : activeTab === 'more' && moreScreen === 'businessHealth'
            ? !userPermissions
                ? <BrandedPageLoader page={t('loadingBusinessHealth')} />
                : canViewAnalytics && FEATURE_FLAGS.ENABLE_OWNER_BUSINESS_HEALTH
                    ? <MobileBusinessHealthScreen onBack={() => handleOpenMoreScreen('main')} onOpenMenuTab={handleOpenMenuTab} onOpenMoreScreen={handleOpenMoreScreen} onOpenShareTab={handleOpenShareTab} />
                    : <MobileMoreScreen initialScreen="main" onOpenMenuTab={handleOpenMenuTab} onOpenShareTab={handleOpenShareTab} onRootStateChange={setIsMoreRootScreen} onScreenChange={setMoreScreen} />
        : activeTab === 'more'
            ? <MobileMoreScreen initialScreen={moreScreen} onOpenMenuTab={handleOpenMenuTab} onOpenShareTab={handleOpenShareTab} onRootStateChange={setIsMoreRootScreen} onScreenChange={setMoreScreen} />
                : <MobileMenuScreen onOpenDesignEditor={handleOpenDesignEditor} onOpenOfficialPage={() => handleOpenMoreScreen('officialPage')} onOpenPrintMenu={handleOpenPrintMenu} onOpenShare={handleOpenShareTab} />;

    if (activeSubscriptionLoading && !hasSubscription && !hasStarterAccess && !shouldBypassSubscriptionGate) {
        return <BrandedPageLoader page={t('loadingMobileApp')} />;
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
                            <LuCreditCard aria-hidden="true" color={token.colorPrimary} size={48} />
                            <Title level={4} style={{ margin: 0, textAlign: 'center' }}>
                                {isStarterStore ? starterT('endingSoonTitle') : t('subscribeTitle')}
                            </Title>
                            <Text style={{ textAlign: 'center' }}>
                                {isStarterStore ? starterT('noSubscriptionDescription') : t('subscribeDescription')}
                            </Text>
                            <Button
                                block
                                onClick={() => {
                                    setActiveTab('more');
                                    setMoreScreen('billing');
                                    setIsMoreRootScreen(false);
                                    router.push('/billing');
                                }}
                                size="large"
                                style={{ minHeight: 44 }}
                            >
                                {t('viewPlans')}
                            </Button>
                            {subscriptionGateConfirmingSignOut ? (
                                <Flex gap={8} style={{ width: '100%' }} vertical>
                                    <Text style={{ textAlign: 'center' }}>
                                        {profileActionsT('logoutConfirm')}
                                    </Text>
                                    <Flex gap={8}>
                                        <Button
                                            block
                                            disabled={subscriptionGateSigningOut}
                                            fill="outline"
                                            onClick={() => setSubscriptionGateConfirmingSignOut(false)}
                                            size="large"
                                        >
                                            {profileActionsT('cancel')}
                                        </Button>
                                        <Button
                                            block
                                            color="danger"
                                            disabled={subscriptionGateSigningOut}
                                            icon={<LuLogOut aria-hidden="true" />}
                                            loading={subscriptionGateSigningOut}
                                            onClick={() => void handleSubscriptionGateSignOut()}
                                            size="large"
                                        >
                                            {profileActionsT('signOut')}
                                        </Button>
                                    </Flex>
                                </Flex>
                            ) : (
                                <Button
                                    block
                                    color="danger"
                                    fill="outline"
                                    icon={<LuLogOut aria-hidden="true" />}
                                    onClick={() => {
                                        setSubscriptionGateSignOutError('');
                                        setSubscriptionGateConfirmingSignOut(true);
                                    }}
                                    size="large"
                                >
                                    {profileActionsT('signOut')}
                                </Button>
                            )}
                            {subscriptionGateSignOutError ? (
                                <Text aria-live="assertive" role="alert" style={{ textAlign: 'center' }} type="danger">
                                    {subscriptionGateSignOutError}
                                </Text>
                            ) : null}
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
