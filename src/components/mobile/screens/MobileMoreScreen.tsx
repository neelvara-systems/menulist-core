'use client'

import { FEATURE_FLAGS } from '@config/features';
import { emitDeploymentBadgeToggle } from '@constant/deploymentDebug';
import { PERMISSIONS } from '@constant/permissions';
import { ECOMSAI_PLATFORM_USER_ROLE, RESELLER_USER_ROLE } from '@constant/user';
import { signOutSession } from '@lib/auth/client';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { setForceDesktopRoute } from '@lib/mobile/forceDesktopMode';
import { logger } from '@lib/monitoring/logger';
import { canManageLocationSettings } from '@lib/multiOutlet/locationAccess';
import { getAccessibleStoreSummaries } from '@lib/multiOutlet/storeSwitchAccess';
import { hasAnyPermission } from '@lib/permissions/permissionRequirements';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { computeBusinessCopyCoverage } from '@services/ai/businessCopy/translationCoverage';
import { theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuActivity,
    LuAlertTriangle,
    LuBarChart3,
    LuBookOpen,
    LuBuilding2,
    LuChevronRight,
    LuClock,
    LuClock3,
    LuCreditCard,
    LuGlobe,
    LuHelpCircle,
    LuKeyRound,
    LuLogOut,
    LuMail,
    LuMapPin,
    LuMessageCircle,
    LuPalette,
    LuPencil,
    LuPhone,
    LuReceipt,
    LuRefreshCw,
    LuSearch,
    LuSettings,
    LuShield,
    LuSmartphone,
    LuSparkles,
    LuTicket,
    LuTv,
    LuUser,
    LuUsers,
    LuX,
} from 'react-icons/lu';
import { Avatar, Button, Card, Dialog, Flex, Input, List, NavBar, Popup, Select, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import type { MobilePlatformInternalScreenKey } from './MobilePlatformInternalScreen';

type ItemStatusTag = {
    color: 'success' | 'warning' | 'default';
    label: string;
};

type MoreListItem = {
    key: string;
    icon: React.ReactNode;
    keywords?: string[];
    label: string;
    description: string;
    onClick: () => void;
    statusTag?: ItemStatusTag;
};

type MoreListSection = {
    items: MoreListItem[];
    title?: string;
};

const MobileBillingScreen = dynamic(() => import('./MobileBillingScreen'), { ssr: false });
const MobileBasicSettingsScreen = dynamic(() => import('./MobileBasicSettingsScreen'), { ssr: false });
const MobileLocaleSettingsScreen = dynamic(() => import('./MobileLocaleSettingsScreen'), { ssr: false });
const MobileWorkingHoursEditScreen = dynamic(() => import('./MobileWorkingHoursEditScreen'), { ssr: false });
const MobileRolesScreen = dynamic(() => import('./MobileRolesScreen'), { ssr: false });
const MobileDigitalScreensScreen = dynamic(() => import('./MobileDigitalScreensScreen'), { ssr: false });
const MobileLocationsScreen = dynamic(() => import('./MobileLocationsScreen'), { ssr: false });
const MobileUsersScreen = dynamic(() => import('./MobileUsersScreen'), { ssr: false });
const MobileDashboardScreen = dynamic(() => import('./MobileDashboardScreen'), { ssr: false });
const MobileTransactionsScreen = dynamic(() => import('./MobileTransactionsScreen'), { ssr: false });
const MobileHelpScreen = dynamic(() => import('./MobileHelpScreen'), { ssr: false });
const MobileFeedbackScreen = dynamic(() => import('./MobileFeedbackScreen'), { ssr: false });
const MobileAdvancedSettingsScreen = dynamic(() => import('./MobileAdvancedSettingsScreen'), { ssr: false });
const MobileDesignEditorScreen = dynamic(() => import('./MobileDesignEditorScreen'), { ssr: false });
const MobileSeoAnalyticsScreen = dynamic(() => import('./MobileSeoAnalyticsScreen'), { ssr: false });
const MobileBusinessCopySetupScreen = dynamic(() => import('./MobileBusinessCopySetupScreen'), { ssr: false });
const MobileTimeSlotsScreen = dynamic(() => import('./MobileTimeSlotsScreen'), { ssr: false });
const MobileTempStatusScreen = dynamic(() => import('./MobileTempStatusScreen'), { ssr: false });
const MobileSpecialMenuScreen = dynamic(() => import('./MobileSpecialMenuScreen'), { ssr: false });
const AppSettingsSheet = dynamic(() => import('../sheets/AppSettingsSheet'), { ssr: false });
const MobileDomainSettingsScreen = dynamic(() => import('./MobileDomainSettingsScreen'), { ssr: false });
const MobileOfficialPageScreen = dynamic(() => import('./MobileOfficialPageScreen'), { ssr: false });
const MobileBusinessAttributesScreen = dynamic(() => import('./MobileBusinessAttributesScreen'), { ssr: false });
const MobileIntegrationsScreen = dynamic(() => import('./MobileIntegrationsScreen'), { ssr: false });
const MobilePosSyncScreen = dynamic(() => import('./MobilePosSyncScreen'), { ssr: false });
const MobileTodayHistoryScreen = dynamic(() => import('./MobileTodayHistoryScreen'), { ssr: false });
const MobileCustomerAppScreen = dynamic(() => import('./MobileCustomerAppScreen'), { ssr: false });
const MobilePresenceMonitorScreen = dynamic(() => import('./MobilePresenceMonitorScreen'), { ssr: false });
const MobileExtractionMonitorScreen = dynamic(() => import('./MobileExtractionMonitorScreen'), { ssr: false });
const MobileOpsControlRoomScreen = dynamic(() => import('./MobileOpsControlRoomScreen'), { ssr: false });
const MobileSchedulerMonitorScreen = dynamic(() => import('./MobileSchedulerMonitorScreen'), { ssr: false });
const MobilePlatformInternalScreen = dynamic(() => import('./MobilePlatformInternalScreen'), { ssr: false });
const MobileResellerDashboardScreen = dynamic(() => import('./MobileResellerDashboardScreen'), { ssr: false });
const MobileResellerManagementScreen = dynamic(() => import('./MobileResellerManagementScreen'), { ssr: false });
const MobileResellerOnboardingScreen = dynamic(() => import('./MobileResellerOnboardingScreen'), { ssr: false });

const platformInternalScreens: MobilePlatformInternalScreenKey[] = [
    'entityBlocks',
    'platformTenants',
    'platformStores',
    'platformUsers',
];

const canonicaInternalScreens: MobilePlatformInternalScreenKey[] = [
    'supportTickets',
    'feedbackAdmin',
    'knowledgeBase',
    'kbGeneration',
    'changelog',
    'canonicaWidget',
    'chatManagement',
    'chatInsights',
    'chatBackfill',
    'chatWeeklyDigest',
    'chatRoiCalculator',
];

const isPlatformInternalScreen = (screen: MoreSubScreen): screen is MobilePlatformInternalScreenKey => (
    platformInternalScreens.includes(screen as MobilePlatformInternalScreenKey)
);

export type MoreSubScreen =
    | 'main'
    | 'accountProfile'
    | 'accountAccess'
    | 'businessProfileHub'
    | 'searchDiscoveryHub'
    | 'billing'
    | 'basicSettings'
    | 'locale'
    | 'hoursEdit'
    | 'roles'
    | 'digitalScreens'
    | 'locations'
    | 'users'
    | 'dashboard'
    | 'feedback'
    | 'transactions'
    | 'help'
    | 'advancedSettings'
    | 'contactSettings'
    | 'designEditor'
    | 'businessAttributes'
    | 'feedbackSettings'
    | 'officialPage'
    | 'businessCopySetup'
    | 'seoSettings'
    | 'analyticsSettings'
    | 'socialSettings'
    | 'timeSlots'
    | 'tempStatus'
    | 'specialMenus'
    | 'domainSettings'
    | 'integrations'
    | 'posSync'
    | 'todayHistory'
    | 'customerApp'
    | 'presenceMonitor'
    | 'canonicaHelp'
    | 'canonicaDocs'
    | 'canonicaSupport'
    | 'canonicaReleaseNotes'
    | 'platformHub'
    | 'canonicaHub'
    | 'resellerHub'
    | 'entityBlocks'
    | 'platformTenants'
    | 'platformStores'
    | 'platformUsers'
    | 'supportTickets'
    | 'feedbackAdmin'
    | 'knowledgeBase'
    | 'kbGeneration'
    | 'changelog'
    | 'chatManagement'
    | 'chatInsights'
    | 'chatBackfill'
    | 'chatWeeklyDigest'
    | 'chatRoiCalculator'
    | 'canonicaWidget'
    | 'opsControlRoom'
    | 'extractionMonitor'
    | 'schedulerMonitor'
    | 'resellerDashboard'
    | 'resellerManagement'
    | 'resellerOnboarding';

interface MobileMoreScreenProps {
    initialScreen?: MoreSubScreen;
    onOpenMenuTab?: () => void;
    onRootStateChange?: (isRoot: boolean) => void;
    onScreenChange?: (screen: MoreSubScreen) => void;
}

export default function MobileMoreScreen({ initialScreen = 'main', onOpenMenuTab, onRootStateChange, onScreenChange }: MobileMoreScreenProps) {
    const t = useTranslations('MobileMore');
    const tBusiness = useTranslations('BusinessSettings');
    const tFeedback = useTranslations('FeedbackInbox');
    const tShare = useTranslations('MobileShare');
    const tPosSync = useTranslations('PosSync');
    const tPresence = useTranslations('MobilePresenceMonitor');
    const { token } = theme.useToken();
    const router = useRouter();
    const {
        activeStoreContext,
        setActiveStoreContext,
        tenantDetails,
        storeDetails,
        userPermissions,
        isMasterUser,
    } = useContext(PlatformGlobalDataContext);
    const businessCopyCoverage = useMemo(
        () => computeBusinessCopyCoverage(storeDetails, { includePwaShortName: FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA }),
        [storeDetails],
    );
    const [subScreen, setSubScreen] = useState<MoreSubScreen>(initialScreen);
    const mainScrollTopRef = useRef(0);
    const { data: session } = useSession();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSwitchingStore, setIsSwitchingStore] = useState(false);
    const [officialPageBackTarget, setOfficialPageBackTarget] = useState<MoreSubScreen>('businessProfileHub');
    const logoutLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressNextLogoutClickRef = useRef(false);
    const [profileOverrides, setProfileOverrides] = useState<{
        countryCode?: string;
        dialCode?: string;
        displayEmail?: string;
        name?: string;
        phoneNumber?: string;
    }>({});

    const sessionUser = (session?.user || {}) as any;
    const userName = profileOverrides.name || sessionUser.name || 'User';
    const userEmail = sessionUser.email || '';
    const userImage = sessionUser.image || '';
    const profileEmail = profileOverrides.displayEmail
        ?? sessionUser.displayEmail
        ?? (sessionUser.staffAuthMode === 'owner_passcode' ? '' : userEmail);
    const profilePhoneNumber = profileOverrides.phoneNumber ?? sessionUser.phoneNumber ?? sessionUser.phone ?? '';
    const profileDialCode = profileOverrides.dialCode ?? sessionUser.dialCode ?? '';
    const profileCountryCode = profileOverrides.countryCode ?? sessionUser.countryCode ?? '';
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatformAdmin = platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const isResellerAccount = platformRole === RESELLER_USER_ROLE;
    const canUseResellerScreens = isPlatformAdmin || isResellerAccount;
    const canViewAnalytics = hasAnyPermission(userPermissions, [PERMISSIONS.VIEW_ANALYTICS]);
    const canManageDailyActions = hasAnyPermission(userPermissions, [
        PERMISSIONS.MANAGE_MENU_SHARING,
        PERMISSIONS.PUBLISH_MENU,
        PERMISSIONS.MANAGE_MENU,
    ]);
    const canManageMenu = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_MENU]);
    const canManageMenuDesign = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_MENU_DESIGN]);
    const canManageStore = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_STORE]);
    const canManagePublicPresence = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_PUBLIC_PRESENCE]);
    const canManageIntegrations = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_INTEGRATIONS]);
    const canManageFeedback = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_FEEDBACK]);
    const canManageDigitalScreens = hasAnyPermission(userPermissions, [PERMISSIONS.MANAGE_DIGITAL_SCREENS]);
    const canAccessBilling = hasAnyPermission(userPermissions, [PERMISSIONS.ACCESS_BILLING]);
    const canManageLocations = canManageLocationSettings({
        isMasterUser,
        storeDetails,
        tenantDetails,
        userPermissions,
    });
    const canManageBusinessProfile = canManageStore || canManagePublicPresence;
    const canManageSearchDiscovery = canManagePublicPresence || canManageIntegrations;
    const userLoginLabel = sessionUser.staffAuthMode === 'owner_passcode'
        ? `Staff ID: ${sessionUser.staffLoginId || sessionUser.loginUsername || ''}`
        : profileEmail
        || sessionUser.phone
        || sessionUser.phoneUsername
        || userEmail;
    const accessibleStoreSummaries = useMemo(
        () => getAccessibleStoreSummaries({ sessionUser: session?.user as any, tenantDetails }),
        [session?.user, tenantDetails],
    );
    const loginStoreId = Number(sessionUser.storeId || 0);
    const currentStoreId = Number(activeStoreContext || storeDetails?.storeId || loginStoreId || 0);
    const currentStoreSummary = accessibleStoreSummaries.find((store: any) => Number(store.storeId) === currentStoreId)
        || tenantDetails?.storesList?.find((store: any) => Number(store.storeId) === currentStoreId)
        || null;
    const canSwitchStoreContext = Boolean(userPermissions?.canSwitchStores && accessibleStoreSummaries.length > 1);
    const storeSwitchOptions = useMemo(
        () => accessibleStoreSummaries.map((store: any) => {
            const storeId = Number(store.storeId);
            const label = `${getStoreContextName(store, `Store ${storeId}`)}${store.isMaster ? ' (HQ)' : ''}`;
            return {
                label,
                value: String(storeId),
            };
        }),
        [accessibleStoreSummaries],
    );
    const currentStoreName = currentStoreSummary
        ? getStoreContextName(currentStoreSummary, `Store ${currentStoreId}`)
        : storeDetails
            ? getStoreContextName(storeDetails as any, `Store ${currentStoreId}`)
            : 'Current branch';

    const handleStoreDropdownChange = useCallback(async (value: string) => {
        const targetStoreId = Number(value);
        if (!targetStoreId || targetStoreId === currentStoreId || isSwitchingStore) return;

        setIsSwitchingStore(true);
        try {
            if (targetStoreId === loginStoreId) {
                if (loginStoreId) {
                    await refreshFirebaseAuthClaims(loginStoreId);
                }
                setActiveStoreContext(null);
            } else {
                const res = await fetch('/api/auth/switch-store', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ targetStoreId }),
                });
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(data.error || 'Failed to switch branch');
                }
                await refreshFirebaseAuthClaims(targetStoreId);
                setActiveStoreContext(targetStoreId);
            }
            Toast.show({ content: 'Switched branch', duration: 1500, icon: 'success' });
        } catch (error: any) {
            logger.error('[MobileMore] Store switch failed', error);
            Toast.show({ content: error?.message || 'Failed to switch branch', duration: 2200 });
        } finally {
            setIsSwitchingStore(false);
        }
    }, [currentStoreId, isSwitchingStore, loginStoreId, setActiveStoreContext]);

    useEffect(() => {
        onRootStateChange?.(subScreen === 'main');
        onScreenChange?.(subScreen);
    }, [onRootStateChange, onScreenChange, subScreen]);

    useEffect(() => {
        setSubScreen(initialScreen);
    }, [initialScreen]);

    useEffect(() => {
        const shellScrollContainer = document.querySelector<HTMLElement>('[data-mobile-shell-scroll="true"]');
        if (!shellScrollContainer) return;

        requestAnimationFrame(() => {
            shellScrollContainer.scrollTop = subScreen === 'main' ? mainScrollTopRef.current : 0;
        });
    }, [subScreen]);

    useEffect(() => {
        return () => {
            if (logoutLongPressTimerRef.current) {
                clearTimeout(logoutLongPressTimerRef.current);
                logoutLongPressTimerRef.current = null;
            }
        };
    }, []);

    const openSubScreen = (nextScreen: MoreSubScreen) => {
        const shellScrollContainer = document.querySelector<HTMLElement>('[data-mobile-shell-scroll="true"]');
        if (shellScrollContainer) {
            mainScrollTopRef.current = shellScrollContainer.scrollTop;
        }
        setSubScreen(nextScreen);
    };

    const openDesktopRoute = (path: string) => {
        setForceDesktopRoute(path);
        router.push(path);
    };

    const openOfficialPage = (backTarget: MoreSubScreen) => {
        setOfficialPageBackTarget(backTarget);
        openSubScreen('officialPage');
    };

    const getBackTarget = (currentScreen: MoreSubScreen): MoreSubScreen => {
        if (currentScreen === 'officialPage') {
            return officialPageBackTarget;
        }
        if (['basicSettings', 'socialSettings', 'businessAttributes', 'customerApp'].includes(currentScreen)) {
            return 'businessProfileHub';
        }
        if (['domainSettings', 'businessCopySetup', 'seoSettings', 'integrations', 'presenceMonitor'].includes(currentScreen)) {
            return 'searchDiscoveryHub';
        }
        if (['canonicaHelp', 'canonicaDocs', 'canonicaSupport', 'canonicaReleaseNotes'].includes(currentScreen)) {
            return 'main';
        }
        if (canonicaInternalScreens.includes(currentScreen as MobilePlatformInternalScreenKey)) {
            return 'canonicaHub';
        }
        if (['resellerDashboard', 'resellerManagement', 'resellerOnboarding'].includes(currentScreen)) {
            return 'resellerHub';
        }
        if (isPlatformInternalScreen(currentScreen)) {
            return 'platformHub';
        }
        return 'main';
    };

    const domainTag: ItemStatusTag = storeDetails?.customDomain
        ? { color: (storeDetails as any).domainVerified ? 'success' : 'warning', label: (storeDetails as any).domainVerified ? tShare('customDomainLive') : tShare('customDomainPending') }
        : storeDetails?.subdomain
            ? { color: 'success', label: tShare('subdomainLive') }
            : { color: 'default', label: tShare('domainNotSet') };
    const feedbackTag: ItemStatusTag = storeDetails?.feedbackEnabled !== false
        ? { color: 'success', label: tShare('feedbackOn') }
        : { color: 'default', label: tShare('feedbackOff') };

    const moduleItems: MoreListItem[] = [
        ...(canViewAnalytics ? [{ key: 'dashboard', icon: <LuBarChart3 color="#4f46e5" size={20} />, keywords: ['analytics', 'stats', 'performance', 'insights'], label: t('dashboard'), description: t('dashboardDesc'), onClick: () => openSubScreen('dashboard') }] : []),
        ...(canManageDailyActions && FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY ? [{ key: 'todayHistory', icon: <LuClock3 color="#0ea5e9" size={20} />, keywords: ['history', 'past', 'activity', 'completed', 'skipped', 'today'], label: 'Past Activity', description: 'Review today actions completed or skipped in the last 7 days.', onClick: () => openSubScreen('todayHistory') }] : []),
        ...(canManageFeedback ? [{ key: 'feedback', icon: <LuMessageCircle color="#16a34a" size={20} />, keywords: ['review', 'rating', 'guest feedback', 'comments', 'feedback qr'], label: tFeedback('title'), description: tFeedback('feedbackQrDesc'), onClick: () => openSubScreen('feedback') }] : []),
        ...(FEATURE_FLAGS.ENABLE_TEMP_STATUS && canManageStore ? [{ key: 'tempStatus', icon: <LuAlertTriangle color="#f59e0b" size={20} />, keywords: ['temporary closed', 'holiday', 'closed today', 'special hours', 'status'], label: t('tempStatus'), description: t('tempStatusDesc'), onClick: () => openSubScreen('tempStatus') }] : []),
        ...(FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING && canManageMenu ? [{ key: 'specialMenus', icon: <LuSparkles color="#f97316" size={20} />, keywords: ['seasonal menu', 'festival menu', 'limited time', 'brunch', 'special menu'], label: t('specialMenus'), description: t('specialMenusDesc'), onClick: () => openSubScreen('specialMenus') }] : []),
        ...(canManageMenuDesign ? [{ key: 'designEditor', icon: <LuPalette color="#e11d48" size={20} />, keywords: ['theme', 'colors', 'fonts', 'layout', 'images', 'design'], label: t('menuDesign'), description: t('menuDesignDesc'), onClick: () => openSubScreen('designEditor') }] : []),
        ...(FEATURE_FLAGS.ENABLE_OBP && canManagePublicPresence ? [{ key: 'officialPageTop', icon: <LuGlobe color="#1d4ed8" size={20} />, keywords: ['official page', 'business page', 'whatsapp', 'google maps', 'reviews', 'reservation link', 'order link'], label: tBusiness('officialPage'), description: tBusiness('officialPageDesc'), onClick: () => openOfficialPage('main') }] : []),
        ...(canManageDigitalScreens ? [{ key: 'digitalScreens', icon: <LuTv color="#06b6d4" size={20} />, keywords: ['tv', 'screen', 'menu board', 'highlights', 'slides', 'display'], label: t('digitalScreens'), description: t('digitalScreensDesc'), onClick: () => openSubScreen('digitalScreens') }] : []),
        ...(canAccessBilling ? [
            { key: 'billing', icon: <LuCreditCard color="#9333ea" size={20} />, keywords: ['plan', 'subscription', 'payment', 'invoice', 'upgrade'], label: t('billing'), description: t('billingDesc'), onClick: () => openSubScreen('billing') },
            { key: 'transactions', icon: <LuReceipt color="#ec4899" size={20} />, keywords: ['payments', 'receipts', 'history', 'billing history', 'charges'], label: t('transactions'), description: t('transactionsDesc'), onClick: () => openSubScreen('transactions') },
        ] : []),
    ];

    const businessIdentityItems: MoreListItem[] = [
        ...(canManageBusinessProfile ? [{ key: 'businessProfileHub', icon: <LuBuilding2 color="#f97316" size={20} />, keywords: ['brand', 'official page', 'social media', 'customer app', 'business profile'], label: 'Business Profile', description: 'Brand, public identity, social links, official page, and app branding.', onClick: () => openSubScreen('businessProfileHub') }] : []),
        ...(canManageSearchDiscovery ? [{ key: 'searchDiscoveryHub', icon: <LuSearch color="#0ea5e9" size={20} />, keywords: ['seo', 'search', 'discovery', 'domain', 'business copy', 'google listing'], label: 'Search & Discovery', description: 'Domain, SEO, business copy, and discovery setup in one place.', statusTag: businessCopyCoverage.missingFieldCount > 0 ? { color: 'warning' as const, label: tBusiness('businessCopyCoverageGapCount', { count: businessCopyCoverage.missingFieldCount }) } : undefined, onClick: () => openSubScreen('searchDiscoveryHub') }] : []),
        ...(canManageStore ? [
            { key: 'locale', icon: <LuGlobe color="#14b8a6" size={20} />, keywords: ['timezone', 'time zone', 'date format', 'currency', 'language', 'region'], label: t('languageRegion'), description: t('languageRegionDesc'), onClick: () => openSubScreen('locale') },
            { key: 'hoursEdit', icon: <LuClock color="#6366f1" size={20} />, keywords: ['opening hours', 'closing time', 'business hours', 'open', 'close'], label: t('editWorkingHours'), description: t('editWorkingHoursDesc'), onClick: () => openSubScreen('hoursEdit') },
            { key: 'timeSlots', icon: <LuClock color="#10b981" size={20} />, keywords: ['breakfast', 'lunch', 'dinner', 'happy hour', 'slot', 'time slot'], label: t('timeSlots'), description: t('timeSlotsDesc'), onClick: () => openSubScreen('timeSlots') },
        ] : []),
        ...(canManageLocations ? [{ key: 'locations', icon: <LuMapPin color="#f59e0b" size={20} />, keywords: ['branches', 'outlets', 'stores', 'chain', 'multi location'], label: t('locations'), description: t('locationsDesc'), onClick: () => openSubScreen('locations') }] : []),
        ...(userPermissions?.canManageUsers ? [{ key: 'users', icon: <LuUsers color="#3b82f6" size={20} />, keywords: ['staff', 'team', 'employee', 'user access', 'invite'], label: t('staff'), description: t('staffDesc'), onClick: () => openSubScreen('users') }] : []),
        ...(userPermissions?.canAssignRoles ? [{ key: 'roles', icon: <LuShield color="#8b5cf6" size={20} />, keywords: ['permissions', 'access control', 'manager', 'cashier', 'role'], label: t('rolesPermissions'), description: t('rolesPermissionsDesc'), onClick: () => openSubScreen('roles') }] : []),
    ];

    const businessPresenceItems: MoreListItem[] = [
        ...(canViewAnalytics ? [{ key: 'analyticsSettings', icon: <LuBarChart3 color="#16a34a" size={20} />, keywords: ['google analytics', 'search console', 'facebook pixel', 'tracking'], label: t('analyticsSettings'), description: t('analyticsSettingsDesc'), onClick: () => openSubScreen('analyticsSettings') }] : []),
        ...(canManageFeedback ? [{ key: 'feedbackSettings', icon: <LuMessageCircle color="#16a34a" size={20} />, keywords: ['feedback form', 'ask for name', 'ask for phone', 'comment form'], label: tBusiness('feedback'), description: t('feedbackSettingsDesc'), statusTag: feedbackTag, onClick: () => openSubScreen('feedbackSettings') }] : []),
        ...(FEATURE_FLAGS.ENABLE_POS_SYNC && canManageIntegrations ? [{ key: 'posSync', icon: <LuShield color="#475569" size={20} />, keywords: ['external sync', 'connected systems', 'provider', 'pos', 'webhook', 'integration secret', 'menu sync'], label: tPosSync('title'), description: tPosSync('enablePosSyncDesc'), onClick: () => openSubScreen('posSync') }] : []),
    ];

    const businessProfileHubItems: MoreListItem[] = [
        ...(canManageStore ? [{ key: 'basicSettings', icon: <LuSettings color="#f97316" size={20} />, keywords: ['logo', 'brand', 'business name', 'phone', 'email', 'address', 'coordinates', 'gst', 'contact person'], label: 'Brand Settings', description: 'Manage brand name, logo, contact details, and address.', onClick: () => openSubScreen('basicSettings') }] : []),
        ...(FEATURE_FLAGS.ENABLE_OBP && canManagePublicPresence ? [{ key: 'officialPage', icon: <LuGlobe color="#1d4ed8" size={20} />, keywords: ['official page', 'whatsapp', 'google maps', 'reviews', 'reservation link', 'order link'], label: tBusiness('officialPage'), description: tBusiness('officialPageDesc'), onClick: () => openOfficialPage('businessProfileHub') }] : []),
        ...(canManagePublicPresence ? [{ key: 'socialSettings', icon: <LuGlobe color="#f43f5e" size={20} />, keywords: ['instagram', 'facebook', 'zomato', 'swiggy', 'social links'], label: tBusiness('socialMedia'), description: t('socialSettingsDesc'), onClick: () => openSubScreen('socialSettings') }] : []),
        ...(FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && canManageStore ? [{ key: 'businessAttributes', icon: <LuBuilding2 color="#7c3aed" size={20} />, keywords: ['amenities', 'wifi', 'parking', 'veg', 'pet friendly', 'attributes'], label: tBusiness('businessAttributes'), description: tBusiness('businessAttributesDesc'), onClick: () => openSubScreen('businessAttributes') }] : []),
        ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA && canManagePublicPresence ? [{ key: 'customerApp', icon: <LuSmartphone color="#8b5cf6" size={20} />, keywords: ['pwa', 'install app', 'home screen icon', 'customer app', 'mobile app'], label: 'Customer App', description: 'Installable menu app — settings and live install analytics.', onClick: () => openSubScreen('customerApp') }] : []),
    ];

    const searchDiscoveryHubItems: MoreListItem[] = [
        ...(canManagePublicPresence ? [
            { key: 'domainSettings', icon: <LuGlobe color="#27a8e3" size={20} />, keywords: ['domain', 'subdomain', 'custom domain', 'dns', 'website link'], label: tBusiness('domain'), description: tBusiness('customDomainDesc'), statusTag: domainTag, onClick: () => openSubScreen('domainSettings') },
            ...(FEATURE_FLAGS.ENABLE_BUSINESS_COPY_GENERATION ? [{ key: 'businessCopySetup', icon: <LuSparkles color="#0051d1" size={20} />, keywords: ['copy setup', 'generate business copy', 'seo copy', 'official page copy', 'customer app copy'], label: tBusiness('businessCopySetup'), description: tBusiness('businessCopySetupDesc'), statusTag: businessCopyCoverage.missingFieldCount > 0 ? { color: 'warning' as const, label: tBusiness('businessCopyCoverageGapCount', { count: businessCopyCoverage.missingFieldCount }) } : undefined, onClick: () => openSubScreen('businessCopySetup') }] : []),
            { key: 'seoSettings', icon: <LuGlobe color="#0ea5e9" size={20} />, keywords: ['seo', 'meta title', 'meta description', 'keywords', 'canonical', 'tagline'], label: t('seoSettings'), description: t('seoSettingsDesc'), onClick: () => openSubScreen('seoSettings') },
            ...(FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR ? [{ key: 'presenceMonitor', icon: <LuSearch color="#27a8e3" size={20} />, keywords: ['google business', 'instagram bio', 'whatsapp profile', 'discovery', 'easy to find', 'presence'], label: 'Discovery Setup', description: 'Set up Google, Instagram, and WhatsApp with your official page link.', onClick: () => openSubScreen('presenceMonitor') }] : []),
        ] : []),
        ...(FEATURE_FLAGS.ENABLE_GBP_SYNC && canManageIntegrations ? [{ key: 'integrations', icon: <LuGlobe color="#0051d1" size={20} />, keywords: ['google business', 'gbp', 'integration', 'google listing'], label: tBusiness('integrations'), description: 'Google Business profile connection status', onClick: () => openSubScreen('integrations') }] : []),
    ];

    const platformMonitoringItems: MoreListItem[] = isPlatformAdmin ? [
        { key: 'opsControlRoom', icon: <LuActivity color="#dc2626" size={20} />, keywords: ['ops', 'safe mode', 'alerts', 'republish'], label: 'Ops Control Room', description: 'SAFE_MODE, alerts, adoption pulse, integrity, and recovery controls.', onClick: () => openSubScreen('opsControlRoom') },
        { key: 'schedulerMonitor', icon: <LuClock3 color="#ea580c" size={20} />, keywords: ['scheduler', 'nightly', 'jobs', 'settlement', 'decision intelligence'], label: 'Scheduler Monitor', description: 'Nightly jobs, analytics settlement, and scheduler recovery controls.', onClick: () => openSubScreen('schedulerMonitor') },
        { key: 'extractionMonitor', icon: <LuSparkles color="#7c3aed" size={20} />, keywords: ['extraction', 'upload', 'ai', 'jobs', 'quality'], label: 'Extraction Monitor', description: 'Menu extraction health, cost, quality, and recent job failures.', onClick: () => openSubScreen('extractionMonitor') },
    ] : [];

    const platformManagementItems: MoreListItem[] = isPlatformAdmin ? [
        { key: 'platformHub', icon: <LuShield color="#dc2626" size={20} />, keywords: ['platform', 'internal', 'users', 'tenants', 'stores', 'entity blocks'], label: 'Platform Management', description: 'Internal MenuList account administration, entity blocks, stores, tenants, users, and diagnostics.', onClick: () => openSubScreen('platformHub') },
    ] : [];

    const canonicaManagementItems: MoreListItem[] = [];

    const platformHubItems: MoreListItem[] = isPlatformAdmin ? [
        ...(FEATURE_FLAGS.ENABLE_PLATFORM_ENTITY_BLOCKS ? [{ key: 'entityBlocks', icon: <LuShield color="#dc2626" size={20} />, keywords: ['block tenant', 'block store', 'block user', 'entity blocks', 'access block'], label: 'Entity Blocks', description: 'Block or unblock tenants, stores, and users with audit details.', onClick: () => openSubScreen('entityBlocks') }] : []),
        { key: 'platformTenants', icon: <LuBuilding2 color="#475569" size={20} />, keywords: ['tenants', 'business accounts', 'platform tenants'], label: 'Tenants', description: 'Manage tenant accounts and tenant-level business records.', onClick: () => openSubScreen('platformTenants') },
        { key: 'platformStores', icon: <LuMapPin color="#27a8e3" size={20} />, keywords: ['stores', 'locations', 'outlets', 'business stores'], label: 'Stores', description: 'Manage stores, outlets, and store-level business records.', onClick: () => openSubScreen('platformStores') },
        { key: 'platformUsers', icon: <LuUsers color="#0051d1" size={20} />, keywords: ['platform users', 'admins', 'roles', 'tenant users', 'store users'], label: 'Users', description: 'Manage tenant users, verification, roles, and store access.', onClick: () => openSubScreen('platformUsers') },
        { key: 'testSentry', icon: <LuAlertTriangle color="#ef4444" size={20} />, keywords: ['sentry', 'diagnostics', 'error test'], label: 'Sentry Test', description: 'Authenticated diagnostics page for error monitoring.', onClick: () => openDesktopRoute('/platform/test-sentry') },
    ] : [];

    const resellerManagementItems: MoreListItem[] = FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD && canUseResellerScreens ? [
        { key: 'resellerHub', icon: <LuBuilding2 color="#27a8e3" size={20} />, keywords: ['reseller', 'partner', 'clients', 'onboarding'], label: 'Reseller', description: isPlatformAdmin ? 'Partner onboarding, client activation, and reseller profile management.' : 'Client onboarding and license management.', onClick: () => openSubScreen('resellerHub') },
    ] : [];

    const resellerHubItems: MoreListItem[] = FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD && canUseResellerScreens ? [
        { key: 'resellerDashboard', icon: <LuBuilding2 color="#27a8e3" size={20} />, keywords: ['reseller', 'partner', 'dashboard', 'clients'], label: 'Reseller Dashboard', description: isPlatformAdmin ? 'View reseller clients across the platform.' : 'View your clients and license status.', onClick: () => openSubScreen('resellerDashboard') },
        { key: 'resellerOnboard', icon: <LuSparkles color="#f97316" size={20} />, keywords: ['reseller onboard', 'partner onboarding', 'new client'], label: 'Onboard Client', description: 'Create a client account, select a plan, and activate payment.', onClick: () => openSubScreen('resellerOnboarding') },
        ...(isPlatformAdmin ? [{ key: 'resellerManage', icon: <LuUsers color="#7c3aed" size={20} />, keywords: ['reseller manage', 'partner manage'], label: 'Reseller Management', description: 'Create and manage reseller profiles.', onClick: () => openSubScreen('resellerManagement') }] : []),
    ] : [];

    const canonicaHubItems: MoreListItem[] = [];
    const canonicaHubSections: MoreListSection[] = [];

    const canOpenSubScreen = useCallback((screen: MoreSubScreen) => {
        if (screen === 'main' || screen === 'accountProfile' || screen === 'accountAccess' || screen === 'help') return true;
        if (['billing', 'transactions'].includes(screen)) return canAccessBilling;
        if (screen === 'businessProfileHub') return canManageBusinessProfile;
        if (screen === 'searchDiscoveryHub') return canManageSearchDiscovery;
        if (['basicSettings', 'locale', 'hoursEdit', 'timeSlots', 'tempStatus', 'businessAttributes', 'contactSettings', 'advancedSettings'].includes(screen)) return canManageStore;
        if (['officialPage', 'businessCopySetup', 'seoSettings', 'socialSettings', 'customerApp', 'presenceMonitor', 'domainSettings'].includes(screen)) return canManagePublicPresence;
        if (['integrations', 'posSync'].includes(screen)) return canManageIntegrations;
        if (screen === 'roles') return userPermissions?.canAssignRoles === true;
        if (screen === 'users') return userPermissions?.canManageUsers === true;
        if (screen === 'locations') return canManageLocations;
        if (screen === 'dashboard' || screen === 'analyticsSettings') return canViewAnalytics;
        if (screen === 'feedback' || screen === 'feedbackSettings') return canManageFeedback;
        if (screen === 'designEditor') return canManageMenuDesign;
        if (screen === 'digitalScreens') return canManageDigitalScreens;
        if (screen === 'specialMenus') return canManageMenu;
        if (screen === 'todayHistory') return canManageDailyActions && FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY;
        if (canUseResellerScreens && ['resellerHub', 'resellerDashboard', 'resellerManagement', 'resellerOnboarding'].includes(screen)) return true;
        if (isPlatformAdmin && (isPlatformInternalScreen(screen) || ['platformHub', 'opsControlRoom', 'extractionMonitor', 'schedulerMonitor'].includes(screen))) return true;
        if (['canonicaHelp', 'canonicaDocs', 'canonicaSupport', 'canonicaReleaseNotes'].includes(screen)) return true;
        return false;
    }, [
        canAccessBilling,
        canManageBusinessProfile,
        canManageDailyActions,
        canManageDigitalScreens,
        canManageFeedback,
        canManageIntegrations,
        canManageMenu,
        canManageMenuDesign,
        canManagePublicPresence,
        canManageSearchDiscovery,
        canManageStore,
        canUseResellerScreens,
        canManageLocations,
        isPlatformAdmin,
        userPermissions?.canAssignRoles,
        userPermissions?.canManageUsers,
    ]);

    useEffect(() => {
        if (subScreen !== 'main' && !canOpenSubScreen(subScreen)) {
            Toast.show({ content: 'This is not available for your role.', duration: 1500 });
            setSubScreen('main');
        }
    }, [
        canOpenSubScreen,
        subScreen,
    ]);

    const itemSections = useMemo(() => ([
        { items: moduleItems, title: 'Modules' },
        { items: businessIdentityItems, title: 'Business Settings' },
        { items: businessPresenceItems, title: 'Business Presence' },
        ...(platformMonitoringItems.length ? [{ items: platformMonitoringItems, title: 'Platform Monitoring' }] : []),
        ...(resellerManagementItems.length ? [{ items: resellerManagementItems, title: 'Reseller' }] : []),
        ...(platformManagementItems.length ? [{ items: platformManagementItems, title: 'Platform Management' }] : []),
        ...(canonicaManagementItems.length ? [{ items: canonicaManagementItems, title: 'Canonica' }] : []),
    ]), [businessIdentityItems, businessPresenceItems, canonicaManagementItems, moduleItems, platformManagementItems, platformMonitoringItems, resellerManagementItems]);

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    const filteredSections = useMemo(() => {
        if (!normalizedSearchQuery) return itemSections;

        const matchesItem = (item: MoreListItem) => {
            const haystack = [
                item.label,
                item.description,
                ...(item.keywords || []),
            ].join(' ').toLowerCase();

            return normalizedSearchQuery
                .split(/\s+/)
                .every((term) => haystack.includes(term));
        };

        return itemSections
            .map((section) => ({
                ...section,
                items: section.items.filter(matchesItem),
            }))
            .filter((section) => section.items.length > 0);
    }, [itemSections, normalizedSearchQuery]);

    let subScreenContent: ReactNode = null;

    if (subScreen === 'accountProfile') subScreenContent = (
        <MobileAccountProfileScreen
            countryCode={profileCountryCode}
            dialCode={profileDialCode}
            email={profileEmail}
            onBack={() => setSubScreen('main')}
            onOpenAccountAccess={() => setSubScreen('accountAccess')}
            onProfileSaved={(updates) => setProfileOverrides((current) => ({ ...current, ...updates }))}
            phoneNumber={profilePhoneNumber}
            staffAuthMode={sessionUser.staffAuthMode}
            userImage={userImage}
            userLoginLabel={userLoginLabel}
            userName={userName}
        />
    );
    else if (subScreen === 'accountAccess') subScreenContent = <MobileAccountAccessScreen onBack={() => setSubScreen('accountProfile')} userLoginLabel={userLoginLabel} userName={userName} />;
    else if (subScreen === 'billing') subScreenContent = <MobileBillingScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'businessProfileHub') subScreenContent = <MobileMoreHubScreen description="Manage your public business identity, customer-facing links, and store branding in one place." items={businessProfileHubItems} onBack={() => setSubScreen('main')} title="Business Profile" />;
    else if (subScreen === 'searchDiscoveryHub') subScreenContent = <MobileMoreHubScreen description="Manage how customers find you, what search engines read, and where your official links lead." items={searchDiscoveryHubItems} onBack={() => setSubScreen('main')} title="Search & Discovery" />;
    else if (subScreen === 'platformHub') subScreenContent = <MobileMoreHubScreen description="Internal MenuList account administration, entity blocks, stores, tenants, users, and diagnostics." items={platformHubItems} onBack={() => setSubScreen('main')} title="Platform" />;
    else if (subScreen === 'canonicaHub') subScreenContent = <MobileMoreHubScreen description="Canonica support, knowledge base, widget, changelog, chat analytics, and backfill tools." items={canonicaHubItems} onBack={() => setSubScreen('main')} sections={canonicaHubSections} title="Canonica" />;
    else if (subScreen === 'resellerHub') subScreenContent = <MobileMoreHubScreen description="Partner onboarding, client activation, offline prepaid licenses, and reseller profile management." items={resellerHubItems} onBack={() => setSubScreen('main')} title="Reseller" />;
    else if (subScreen === 'basicSettings') subScreenContent = <MobileBasicSettingsScreen onBack={() => setSubScreen(getBackTarget('basicSettings'))} />;
    else if (subScreen === 'locale') subScreenContent = <MobileLocaleSettingsScreen onBack={() => setSubScreen('main')} onOpenBusinessCopySetup={() => setSubScreen('businessCopySetup')} />;
    else if (subScreen === 'hoursEdit') subScreenContent = <MobileWorkingHoursEditScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'roles') subScreenContent = <MobileRolesScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'digitalScreens') subScreenContent = <MobileDigitalScreensScreen onBack={() => setSubScreen('main')} onOpenDesignEditor={() => setSubScreen('designEditor')} />;
    else if (subScreen === 'locations') subScreenContent = <MobileLocationsScreen onBack={() => setSubScreen('main')} onOpenBilling={() => setSubScreen('billing')} />;
    else if (subScreen === 'users') subScreenContent = <MobileUsersScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'dashboard') subScreenContent = <MobileDashboardScreen onBack={() => setSubScreen('main')} onOpenDesignEditor={() => setSubScreen('designEditor')} />;
    else if (subScreen === 'feedback') subScreenContent = <MobileFeedbackScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'transactions') subScreenContent = <MobileTransactionsScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'help') subScreenContent = <MobileHelpScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'advancedSettings') subScreenContent = <MobileAdvancedSettingsScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'contactSettings') subScreenContent = <MobileBasicSettingsScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'designEditor') subScreenContent = <MobileDesignEditorScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'businessAttributes') subScreenContent = <MobileBusinessAttributesScreen onBack={() => setSubScreen(getBackTarget('businessAttributes'))} />;
    else if (subScreen === 'feedbackSettings') subScreenContent = <MobileAdvancedSettingsScreen mode="feedback" onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'officialPage') subScreenContent = <MobileOfficialPageScreen onBack={() => setSubScreen(getBackTarget('officialPage'))} />;
    else if (subScreen === 'businessCopySetup') subScreenContent = <MobileBusinessCopySetupScreen onBack={() => setSubScreen(getBackTarget('businessCopySetup'))} />;
    else if (subScreen === 'seoSettings') subScreenContent = <MobileSeoAnalyticsScreen mode="seo" onBack={() => setSubScreen(getBackTarget('seoSettings'))} />;
    else if (subScreen === 'analyticsSettings') subScreenContent = <MobileSeoAnalyticsScreen mode="analytics" onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'socialSettings') subScreenContent = <MobileAdvancedSettingsScreen mode="social" onBack={() => setSubScreen(getBackTarget('socialSettings'))} />;
    else if (subScreen === 'timeSlots') subScreenContent = <MobileTimeSlotsScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'tempStatus') subScreenContent = <MobileTempStatusScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'specialMenus') subScreenContent = <MobileSpecialMenuScreen onBack={() => setSubScreen('main')} onOpenMenuTab={onOpenMenuTab} />;
    else if (subScreen === 'domainSettings') subScreenContent = <MobileDomainSettingsScreen onBack={() => setSubScreen(getBackTarget('domainSettings'))} />;
    else if (subScreen === 'integrations') subScreenContent = <MobileIntegrationsScreen onBack={() => setSubScreen(getBackTarget('integrations'))} />;
    else if (subScreen === 'posSync') subScreenContent = <MobilePosSyncScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'todayHistory' && FEATURE_FLAGS.ENABLE_PAST_ACTIVITY_HISTORY) {
        subScreenContent = <MobileTodayHistoryScreen onBack={() => setSubScreen('main')} />;
    }
    else if (subScreen === 'customerApp') subScreenContent = <MobileCustomerAppScreen onBack={() => setSubScreen(getBackTarget('customerApp'))} />;
    else if (subScreen === 'presenceMonitor') subScreenContent = <MobilePresenceMonitorScreen onBack={() => setSubScreen(getBackTarget('presenceMonitor'))} />;
    else if (subScreen === 'canonicaHelp') subScreenContent = <MobileHelpScreen onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'canonicaDocs') subScreenContent = <MobileHelpScreen initialTab="kb" onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'canonicaSupport') subScreenContent = <MobileHelpScreen initialTab="ticket" onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'canonicaReleaseNotes') subScreenContent = <MobileHelpScreen initialTab="changelog" onBack={() => setSubScreen('main')} />;
    else if (subScreen === 'opsControlRoom') subScreenContent = <MobileOpsControlRoomScreen onBack={() => setSubScreen(getBackTarget('opsControlRoom'))} />;
    else if (subScreen === 'extractionMonitor') subScreenContent = <MobileExtractionMonitorScreen onBack={() => setSubScreen(getBackTarget('extractionMonitor'))} />;
    else if (subScreen === 'schedulerMonitor') subScreenContent = <MobileSchedulerMonitorScreen onBack={() => setSubScreen(getBackTarget('schedulerMonitor'))} />;
    else if (subScreen === 'resellerDashboard') subScreenContent = <MobileResellerDashboardScreen onBack={() => setSubScreen('resellerHub')} onOpenManagement={() => setSubScreen('resellerManagement')} onOpenOnboarding={() => setSubScreen('resellerOnboarding')} />;
    else if (subScreen === 'resellerManagement') subScreenContent = <MobileResellerManagementScreen onBack={() => setSubScreen('resellerHub')} />;
    else if (subScreen === 'resellerOnboarding') subScreenContent = <MobileResellerOnboardingScreen onBack={() => setSubScreen('resellerDashboard')} />;
    else if (isPlatformInternalScreen(subScreen)) subScreenContent = <MobilePlatformInternalScreen onBack={() => setSubScreen(getBackTarget(subScreen))} screen={subScreen} />;

    if (subScreenContent) {
        return (
            <Flex key={subScreen} style={{ minHeight: '100%', minWidth: 0 }} vertical>
                {subScreenContent}
            </Flex>
        );
    }

    const handleLogout = () => {
        void Dialog.confirm({
            confirmText: t('logOut'),
            content: t('logoutConfirm'),
            onConfirm: async () => {
                setIsLoggingOut(true);
                try {
                    await signOutSession();
                } catch {
                    Toast.show({ content: t('logoutFailed'), duration: 2000 });
                    setIsLoggingOut(false);
                }
            },
        });
    };

    const handleRefreshApp = () => {
        Toast.show({ content: 'Refreshing app...', duration: 800 });
        window.setTimeout(() => {
            window.location.reload();
        }, 120);
    };

    const clearLogoutLongPressTimer = () => {
        if (!logoutLongPressTimerRef.current) return;
        clearTimeout(logoutLongPressTimerRef.current);
        logoutLongPressTimerRef.current = null;
    };

    const startLogoutLongPress = () => {
        clearLogoutLongPressTimer();
        logoutLongPressTimerRef.current = setTimeout(() => {
            suppressNextLogoutClickRef.current = true;
            emitDeploymentBadgeToggle();
        }, 700);
    };

    const renderListDescription = (item: MoreListItem) => (
        <Flex align="center" gap={8} wrap="wrap">
            <Text type="secondary">{item.description}</Text>
            {item.statusTag ? <Tag color={item.statusTag.color}>{item.statusTag.label}</Tag> : null}
        </Flex>
    );

    const helpCenterCard = (
        <Card title={t('helpCenter')}>
            <List>
                <List.Item
                    arrow
                    description={<Text type="secondary">Search docs, tickets, updates, and support in one place.</Text>}
                    onClick={() => openSubScreen('canonicaHelp')}
                    prefix={<LuHelpCircle color="#3b82f6" size={20} />}
                    title={<Text strong>{t('helpCenter')}</Text>}
                />
                <List.Item
                    arrow
                    description={<Text type="secondary">Browse MenuList docs and guides.</Text>}
                    onClick={() => openSubScreen('canonicaDocs')}
                    prefix={<LuBookOpen color="#8b5cf6" size={20} />}
                    title={<Text strong>Documentation</Text>}
                />
                <List.Item
                    arrow
                    description={<Text type="secondary">Create or track support tickets.</Text>}
                    onClick={() => openSubScreen('canonicaSupport')}
                    prefix={<LuTicket color="#f59e0b" size={20} />}
                    title={<Text strong>Support Tickets</Text>}
                />
                <List.Item
                    arrow
                    description={<Text type="secondary">See recent product changes and fixes.</Text>}
                    onClick={() => openSubScreen('canonicaReleaseNotes')}
                    prefix={<LuReceipt color="#0ea5e9" size={20} />}
                    title={<Text strong>Release Notes</Text>}
                />
            </List>
        </Card>
    );

    return (
        <Flex gap={12} style={{ padding: 16 }} vertical>
            <Card onClick={() => openSubScreen('accountProfile')} style={{ cursor: 'pointer' }}>
                <Flex align="center" gap={12} justify="space-between">
                    <Flex align="center" gap={12} style={{ minWidth: 0 }}>
                        {userImage ? <Avatar size={48} src={userImage} /> : <Avatar size={48}>{userName.charAt(0).toUpperCase()}</Avatar>}
                        <Flex gap={2} style={{ minWidth: 0 }} vertical>
                            <Title level={5} style={{ margin: 0 }}>{userName}</Title>
                            {userLoginLabel ? <Text ellipsis type="secondary">{userLoginLabel}</Text> : null}
                            <Text type="secondary">Profile and account access</Text>
                        </Flex>
                    </Flex>
                    <LuChevronRight color={token.colorTextQuaternary} size={18} />
                </Flex>
            </Card>

            {canSwitchStoreContext ? (
                <Card>
                    <Flex gap={10} vertical>
                        <Flex align="center" gap={10}>
                            {currentStoreSummary?.isMaster ? (
                                <LuBuilding2 color={token.colorPrimary} size={20} />
                            ) : (
                                <LuMapPin color={token.colorPrimary} size={20} />
                            )}
                            <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                <Text strong>Branch</Text>
                                <Text ellipsis type="secondary">{currentStoreName}</Text>
                            </Flex>
                        </Flex>
                        <Select
                            disabled={isSwitchingStore}
                            onChange={handleStoreDropdownChange}
                            options={storeSwitchOptions}
                            placeholder="Select branch"
                            value={currentStoreId ? String(currentStoreId) : undefined}
                        />
                        <Text type="secondary">{accessibleStoreSummaries.length} branches available</Text>
                    </Flex>
                </Card>
            ) : null}

            <div
                style={{
                    alignItems: 'center',
                    backgroundColor: token.colorBgContainer,
                    border: `1px solid ${token.colorBorder}`,
                    borderRadius: 12,
                    display: 'flex',
                    gap: 8,
                    padding: '10px 12px',
                }}
            >
                <LuSearch color={token.colorTextQuaternary} size={16} />
                <input
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search settings"
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: token.colorText,
                        flex: 1,
                        fontSize: 15,
                        outline: 'none',
                    }}
                    value={searchQuery}
                />
                {searchQuery ? (
                    <button
                        aria-label="Clear search"
                        onClick={() => setSearchQuery('')}
                        style={{
                            alignItems: 'center',
                            background: 'transparent',
                            border: 'none',
                            color: token.colorTextQuaternary,
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'center',
                            padding: 0,
                        }}
                        type="button"
                    >
                        <LuX size={16} />
                    </button>
                ) : null}
            </div>

            {!normalizedSearchQuery ? helpCenterCard : null}

            {filteredSections.length === 0 ? (
                <Card>
                    <Flex gap={4} vertical>
                        <Text strong>No matching settings</Text>
                        <Text type="secondary">Try words like logo, hours, domain, reviews, staff, analytics, or colors.</Text>
                    </Flex>
                </Card>
            ) : (
                filteredSections.map((section) => (
                    <Card key={section.title} title={section.title}>
                        <List>
                            {section.items.map((item) => (
                                <List.Item
                                    arrow
                                    description={renderListDescription(item)}
                                    key={item.key}
                                    onClick={item.onClick}
                                    prefix={item.icon}
                                    title={<Text strong>{item.label}</Text>}
                                />
                            ))}
                        </List>
                    </Card>
                ))
            )}

            <Card>
                <List>
                    <List.Item
                        arrow
                        description={<Text type="secondary">{t('appSettingsDesc')}</Text>}
                        onClick={() => setIsAppSettingsOpen(true)}
                        prefix={<LuSettings color="#64748b" size={20} />}
                        title={<Text strong>{t('appSettings')}</Text>}
                    />
                    <List.Item
                        description={<Text type="secondary">Load the latest MenuList version on this device.</Text>}
                        onClick={handleRefreshApp}
                        prefix={<LuRefreshCw color="#0054D0" size={20} />}
                        title={<Text strong>Refresh app</Text>}
                    />
                    <div
                        onMouseDown={startLogoutLongPress}
                        onMouseLeave={clearLogoutLongPressTimer}
                        onMouseUp={clearLogoutLongPressTimer}
                        onTouchCancel={clearLogoutLongPressTimer}
                        onTouchEnd={clearLogoutLongPressTimer}
                        onTouchStart={startLogoutLongPress}
                    >
                        <List.Item
                            onClick={() => {
                                if (suppressNextLogoutClickRef.current) {
                                    suppressNextLogoutClickRef.current = false;
                                    return;
                                }
                                handleLogout();
                            }}
                            prefix={<LuLogOut color="#dc2626" size={20} />}
                            title={<Text strong style={{ color: '#dc2626' }}>{isLoggingOut ? t('loggingOut') : t('logOut')}</Text>}
                        />
                    </div>
                </List>
            </Card>
            <AppSettingsSheet
                onClose={() => setIsAppSettingsOpen(false)}
                visible={isAppSettingsOpen}
            />
        </Flex>
    );
}

function MobileAccountProfileScreen({
    countryCode,
    dialCode,
    email,
    onBack,
    onOpenAccountAccess,
    onProfileSaved,
    phoneNumber,
    staffAuthMode,
    userImage,
    userLoginLabel,
    userName,
}: {
    countryCode?: string;
    dialCode?: string;
    email?: string;
    onBack: () => void;
    onOpenAccountAccess: () => void;
    onProfileSaved: (updates: { countryCode?: string; dialCode?: string; displayEmail?: string; name?: string; phoneNumber?: string }) => void;
    phoneNumber?: string;
    staffAuthMode?: string;
    userImage?: string;
    userLoginLabel?: string;
    userName: string;
}) {
    const [draftDialCode, setDraftDialCode] = useState(dialCode || '');
    const [draftEmail, setDraftEmail] = useState(email || '');
    const [draftName, setDraftName] = useState(userName || '');
    const [draftPhone, setDraftPhone] = useState(phoneNumber || '');
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const phoneLabel = [dialCode, phoneNumber].filter(Boolean).join(' ').trim();
    const openEditProfile = () => {
        setDraftDialCode(dialCode || '');
        setDraftEmail(email || '');
        setDraftName(userName || '');
        setDraftPhone(phoneNumber || '');
        setEditOpen(true);
    };

    const saveProfile = async () => {
        const nextName = draftName.trim();
        const nextEmail = draftEmail.trim();
        const nextPhone = draftPhone.trim();
        const nextDialCode = draftDialCode.trim();

        if (!nextName) {
            Toast.show({ content: 'Enter your name.', duration: 1500 });
            return;
        }
        if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
            Toast.show({ content: 'Enter a valid email.', duration: 1500 });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/auth/update-profile', {
                body: JSON.stringify({
                    countryCode,
                    dialCode: nextDialCode,
                    displayEmail: nextEmail,
                    name: nextName,
                    phoneNumber: nextPhone,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Could not update profile.');
            }

            onProfileSaved({
                countryCode,
                dialCode: nextDialCode,
                displayEmail: nextEmail,
                name: nextName,
                phoneNumber: nextPhone,
            });
            setEditOpen(false);
            Toast.show({ content: 'Profile updated.', duration: 1500 });
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Could not update profile.', duration: 2200 });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="View your signed-in profile and account access."
                onBack={onBack}
                title="Profile"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex align="center" gap={12}>
                        {userImage ? <Avatar size={56} src={userImage} /> : <Avatar icon={<LuUser size={22} />} size={56} />}
                        <Flex gap={3} style={{ minWidth: 0 }} vertical>
                            <Title level={4} style={{ margin: 0 }}>{userName}</Title>
                            {userLoginLabel ? <Text ellipsis type="secondary">{userLoginLabel}</Text> : null}
                            {staffAuthMode === 'owner_passcode' ? <Tag color="primary">Staff ID login</Tag> : null}
                        </Flex>
                    </Flex>
                </Card>

                <Card title="Profile details">
                    <List>
                        <List.Item prefix={<LuUser color="#9ca3af" size={16} />} title={<Text>{userName}</Text>} />
                        <List.Item prefix={<LuMail color="#9ca3af" size={16} />} title={<Text>{email || 'No email added'}</Text>} />
                        <List.Item prefix={<LuPhone color="#9ca3af" size={16} />} title={<Text>{phoneLabel || 'No phone added'}</Text>} />
                    </List>
                </Card>

                <Button block fill="outline" icon={<LuPencil size={16} />} onClick={openEditProfile} size="large">
                    Edit profile
                </Button>
                <Button block icon={<LuKeyRound size={16} />} onClick={onOpenAccountAccess} size="large">
                    Change password or passcode
                </Button>

                <Card>
                    <Text type="secondary">
                        Staff and role access for other people stays under Staff. This profile is only for the signed-in account.
                    </Text>
                </Card>
            </Flex>

            <Popup bodyStyle={{ maxHeight: '78vh', overflow: 'hidden', padding: 0 }} destroyOnClose onMaskClick={saving ? undefined : () => setEditOpen(false)} visible={editOpen}>
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setEditOpen(false)}>
                        Edit profile
                    </NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text type="secondary">Name</Text>
                                <Input onChange={setDraftName} placeholder="Your name" value={draftName} />
                            </Flex>
                        </Card>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text type="secondary">Email</Text>
                                <Text type="secondary">
                                    {staffAuthMode === 'owner_passcode'
                                        ? 'Optional contact email. Staff ID remains the sign-in ID.'
                                        : 'This updates the profile email shown in MenuList.'}
                                </Text>
                                <Input onChange={setDraftEmail} placeholder="name@example.com" type="email" value={draftEmail} />
                            </Flex>
                        </Card>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text type="secondary">Phone</Text>
                                <Input onChange={setDraftDialCode} placeholder="Dial code, e.g. +91" type="tel" value={draftDialCode} />
                                <Input onChange={setDraftPhone} placeholder="Phone number" type="tel" value={draftPhone} />
                            </Flex>
                        </Card>
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={() => setEditOpen(false)} size="large">Cancel</Button>
                            <Button block loading={saving} onClick={() => void saveProfile()} size="large">Save</Button>
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}

function MobileAccountAccessScreen({
    onBack,
    userLoginLabel,
    userName,
}: {
    onBack: () => void;
    userLoginLabel?: string;
    userName: string;
}) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);

    const resetForm = () => {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

    const changePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Toast.show({ content: 'Enter all password fields.', duration: 1800 });
            return;
        }
        if (newPassword.length < 6) {
            Toast.show({ content: 'New password must be at least 6 characters.', duration: 1800 });
            return;
        }
        if (newPassword !== confirmPassword) {
            Toast.show({ content: 'Passwords do not match.', duration: 1800 });
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                body: JSON.stringify({ currentPassword, newPassword }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Could not change password.');
            }
            resetForm();
            Toast.show({ content: 'Password changed.', duration: 1500 });
            onBack();
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Could not change password.', duration: 2200 });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description="Update the password or passcode used for this account."
                onBack={onBack}
                title="Account access"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={4} vertical>
                        <Text strong>{userName}</Text>
                        {userLoginLabel ? <Text type="secondary">{userLoginLabel}</Text> : null}
                    </Flex>
                </Card>
                <Card title="Change password">
                    <Flex gap={12} vertical>
                        <Input
                            autoComplete="current-password"
                            onChange={setCurrentPassword}
                            placeholder="Current password or passcode"
                            type="password"
                            value={currentPassword}
                        />
                        <Input
                            autoComplete="new-password"
                            onChange={setNewPassword}
                            placeholder="New password"
                            type="password"
                            value={newPassword}
                        />
                        <Input
                            autoComplete="new-password"
                            onChange={setConfirmPassword}
                            placeholder="Confirm new password"
                            type="password"
                            value={confirmPassword}
                        />
                        <Button block loading={saving} onClick={changePassword} size="large">
                            Change password
                        </Button>
                    </Flex>
                </Card>
                <Card>
                    <Text type="secondary">
                        If staff cannot sign in, the owner can create a new temporary passcode from Staff.
                    </Text>
                </Card>
            </Flex>
        </Flex>
    );
}

function MobileMoreHubScreen({
    description,
    items,
    onBack,
    sections,
    title,
}: {
    description: string;
    items: MoreListItem[];
    onBack: () => void;
    sections?: MoreListSection[];
    title: string;
}) {
    const displaySections = sections?.length ? sections : [{ items }];

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={description}
                onBack={onBack}
                title={title}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                {displaySections.map((section, sectionIndex) => (
                    <Card key={section.title || sectionIndex} title={section.title}>
                        <List>
                            {section.items.map((item) => (
                                <List.Item
                                    key={item.key}
                                    arrow
                                    description={(
                                        <Flex align="flex-start" gap={6} vertical>
                                            <Text type="secondary">{item.description}</Text>
                                            {item.statusTag ? <Tag color={item.statusTag.color}>{item.statusTag.label}</Tag> : null}
                                        </Flex>
                                    )}
                                    prefix={item.icon}
                                    style={{ cursor: 'pointer', minHeight: 64 }}
                                    title={<Text strong>{item.label}</Text>}
                                    onClick={item.onClick}
                                />
                            ))}
                        </List>
                    </Card>
                ))}
            </Flex>
        </Flex>
    );
}
