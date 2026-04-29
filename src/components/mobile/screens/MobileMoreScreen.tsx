'use client'

import { FEATURE_FLAGS } from '@config/features';
import { emitDeploymentBadgeToggle } from '@constant/deploymentDebug';
import { signOutSession } from '@lib/auth/client';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { computeBusinessCopyCoverage } from '@services/ai/businessCopy/translationCoverage';
import { theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    LuAlertTriangle,
    LuBarChart3,
    LuBuilding2,
    LuClock,
    LuClock3,
    LuCreditCard,
    LuGlobe,
    LuHelpCircle,
    LuLogOut,
    LuMapPin,
    LuMessageCircle,
    LuPalette,
    LuReceipt,
    LuSearch,
    LuSettings,
    LuShield,
    LuSmartphone,
    LuSparkles,
    LuTv,
    LuUsers,
    LuX,
} from 'react-icons/lu';
import { Avatar, Card, Dialog, Flex, List, NavBar, Tag, Text, Title, Toast } from '../antd';

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

export type MoreSubScreen =
    | 'main'
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
    | 'presenceMonitor';

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
    const { storeDetails } = useContext(PlatformGlobalDataContext);
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
    const logoutLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressNextLogoutClickRef = useRef(false);

    const userName = session?.user?.name || 'User';
    const userEmail = session?.user?.email || '';
    const userImage = session?.user?.image || '';

    useEffect(() => {
        onRootStateChange?.(subScreen === 'main');
        onScreenChange?.(subScreen);
    }, [onRootStateChange, onScreenChange, subScreen]);

    useEffect(() => {
        setSubScreen(initialScreen);
    }, [initialScreen]);

    useEffect(() => {
        if (subScreen !== 'main') return;
        const shellScrollContainer = document.querySelector<HTMLElement>('[data-mobile-shell-scroll="true"]');
        if (!shellScrollContainer) return;
        requestAnimationFrame(() => {
            shellScrollContainer.scrollTop = mainScrollTopRef.current;
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

    const getBackTarget = (currentScreen: MoreSubScreen): MoreSubScreen => {
        if (['basicSettings', 'officialPage', 'socialSettings', 'businessAttributes', 'customerApp'].includes(currentScreen)) {
            return 'businessProfileHub';
        }
        if (['domainSettings', 'businessCopySetup', 'seoSettings', 'integrations', 'presenceMonitor'].includes(currentScreen)) {
            return 'searchDiscoveryHub';
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
        { key: 'dashboard', icon: <LuBarChart3 color="#4f46e5" size={20} />, keywords: ['analytics', 'stats', 'performance', 'insights'], label: t('dashboard'), description: t('dashboardDesc'), onClick: () => openSubScreen('dashboard') },
        { key: 'todayHistory', icon: <LuClock3 color="#0ea5e9" size={20} />, keywords: ['history', 'past', 'activity', 'completed', 'skipped', 'today'], label: 'Past Activity', description: 'Review today actions completed or skipped in the last 7 days.', onClick: () => openSubScreen('todayHistory') },
        { key: 'feedback', icon: <LuMessageCircle color="#16a34a" size={20} />, keywords: ['review', 'rating', 'guest feedback', 'comments', 'feedback qr'], label: tFeedback('title'), description: tFeedback('feedbackQrDesc'), onClick: () => openSubScreen('feedback') },
        ...(FEATURE_FLAGS.ENABLE_TEMP_STATUS ? [{ key: 'tempStatus', icon: <LuAlertTriangle color="#f59e0b" size={20} />, keywords: ['temporary closed', 'holiday', 'closed today', 'special hours', 'status'], label: t('tempStatus'), description: t('tempStatusDesc'), onClick: () => openSubScreen('tempStatus') }] : []),
        ...(FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING ? [{ key: 'specialMenus', icon: <LuSparkles color="#f97316" size={20} />, keywords: ['seasonal menu', 'festival menu', 'limited time', 'brunch', 'special menu'], label: t('specialMenus'), description: t('specialMenusDesc'), onClick: () => openSubScreen('specialMenus') }] : []),
        { key: 'designEditor', icon: <LuPalette color="#e11d48" size={20} />, keywords: ['theme', 'colors', 'fonts', 'layout', 'images', 'design'], label: t('menuDesign'), description: t('menuDesignDesc'), onClick: () => openSubScreen('designEditor') },
        { key: 'digitalScreens', icon: <LuTv color="#06b6d4" size={20} />, keywords: ['tv', 'screen', 'menu board', 'highlights', 'slides', 'display'], label: t('digitalScreens'), description: t('digitalScreensDesc'), onClick: () => openSubScreen('digitalScreens') },
        { key: 'billing', icon: <LuCreditCard color="#9333ea" size={20} />, keywords: ['plan', 'subscription', 'payment', 'invoice', 'upgrade'], label: t('billing'), description: t('billingDesc'), onClick: () => openSubScreen('billing') },
        { key: 'transactions', icon: <LuReceipt color="#ec4899" size={20} />, keywords: ['payments', 'receipts', 'history', 'billing history', 'charges'], label: t('transactions'), description: t('transactionsDesc'), onClick: () => openSubScreen('transactions') },
    ];

    const businessIdentityItems: MoreListItem[] = [
        { key: 'businessProfileHub', icon: <LuBuilding2 color="#f97316" size={20} />, keywords: ['brand', 'official page', 'social media', 'customer app', 'business profile'], label: 'Business Profile', description: 'Brand, public identity, social links, official page, and app branding.', onClick: () => openSubScreen('businessProfileHub') },
        { key: 'searchDiscoveryHub', icon: <LuSearch color="#0ea5e9" size={20} />, keywords: ['seo', 'search', 'discovery', 'domain', 'business copy', 'google listing'], label: 'Search & Discovery', description: 'Domain, SEO, AI copy, and discovery setup in one place.', statusTag: businessCopyCoverage.missingFieldCount > 0 ? { color: 'warning' as const, label: tBusiness('businessCopyCoverageGapCount', { count: businessCopyCoverage.missingFieldCount }) } : undefined, onClick: () => openSubScreen('searchDiscoveryHub') },
        { key: 'locale', icon: <LuGlobe color="#14b8a6" size={20} />, keywords: ['timezone', 'time zone', 'date format', 'currency', 'language', 'region'], label: t('languageRegion'), description: t('languageRegionDesc'), onClick: () => openSubScreen('locale') },
        { key: 'hoursEdit', icon: <LuClock color="#6366f1" size={20} />, keywords: ['opening hours', 'closing time', 'business hours', 'open', 'close'], label: t('editWorkingHours'), description: t('editWorkingHoursDesc'), onClick: () => openSubScreen('hoursEdit') },
        { key: 'timeSlots', icon: <LuClock color="#10b981" size={20} />, keywords: ['breakfast', 'lunch', 'dinner', 'happy hour', 'slot', 'time slot'], label: t('timeSlots'), description: t('timeSlotsDesc'), onClick: () => openSubScreen('timeSlots') },
        { key: 'locations', icon: <LuMapPin color="#f59e0b" size={20} />, keywords: ['branches', 'outlets', 'stores', 'chain', 'multi location'], label: t('locations'), description: t('locationsDesc'), onClick: () => openSubScreen('locations') },
        { key: 'users', icon: <LuUsers color="#3b82f6" size={20} />, keywords: ['staff', 'team', 'employee', 'user access', 'invite'], label: t('staff'), description: t('staffDesc'), onClick: () => openSubScreen('users') },
        { key: 'roles', icon: <LuShield color="#8b5cf6" size={20} />, keywords: ['permissions', 'access control', 'manager', 'cashier', 'role'], label: t('rolesPermissions'), description: t('rolesPermissionsDesc'), onClick: () => openSubScreen('roles') },
    ];

    const businessPresenceItems: MoreListItem[] = [
        { key: 'analyticsSettings', icon: <LuBarChart3 color="#16a34a" size={20} />, keywords: ['google analytics', 'search console', 'facebook pixel', 'tracking'], label: t('analyticsSettings'), description: t('analyticsSettingsDesc'), onClick: () => openSubScreen('analyticsSettings') },
        { key: 'feedbackSettings', icon: <LuMessageCircle color="#16a34a" size={20} />, keywords: ['feedback form', 'ask for name', 'ask for phone', 'comment form'], label: tBusiness('feedback'), description: t('feedbackSettingsDesc'), statusTag: feedbackTag, onClick: () => openSubScreen('feedbackSettings') },
        ...(FEATURE_FLAGS.ENABLE_POS_SYNC ? [{ key: 'posSync', icon: <LuShield color="#475569" size={20} />, keywords: ['pos', 'webhook', 'sync', 'integration secret', 'menu sync'], label: tPosSync('title'), description: tPosSync('enablePosSyncDesc'), onClick: () => openSubScreen('posSync') }] : []),
    ];

    const businessProfileHubItems: MoreListItem[] = [
        { key: 'basicSettings', icon: <LuSettings color="#f97316" size={20} />, keywords: ['logo', 'brand', 'business name', 'phone', 'email', 'address', 'coordinates', 'gst', 'contact person'], label: 'Brand Settings', description: 'Manage brand name, logo, contact details, and address.', onClick: () => openSubScreen('basicSettings') },
        ...(FEATURE_FLAGS.ENABLE_OBP ? [{ key: 'officialPage', icon: <LuGlobe color="#1d4ed8" size={20} />, keywords: ['official page', 'whatsapp', 'google maps', 'reviews', 'reservation link', 'order link'], label: tBusiness('officialPage'), description: tBusiness('officialPageDesc'), onClick: () => openSubScreen('officialPage') }] : []),
        { key: 'socialSettings', icon: <LuGlobe color="#f43f5e" size={20} />, keywords: ['instagram', 'facebook', 'zomato', 'swiggy', 'social links'], label: tBusiness('socialMedia'), description: t('socialSettingsDesc'), onClick: () => openSubScreen('socialSettings') },
        ...(FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? [{ key: 'businessAttributes', icon: <LuBuilding2 color="#7c3aed" size={20} />, keywords: ['amenities', 'wifi', 'parking', 'veg', 'pet friendly', 'attributes'], label: tBusiness('businessAttributes'), description: tBusiness('businessAttributesDesc'), onClick: () => openSubScreen('businessAttributes') }] : []),
        ...(FEATURE_FLAGS.ENABLE_CUSTOMER_APP_PWA ? [{ key: 'customerApp', icon: <LuSmartphone color="#8b5cf6" size={20} />, keywords: ['pwa', 'install app', 'home screen icon', 'customer app', 'mobile app'], label: 'Customer App', description: 'Installable menu app — settings and live install analytics.', onClick: () => openSubScreen('customerApp') }] : []),
    ];

    const searchDiscoveryHubItems: MoreListItem[] = [
        { key: 'domainSettings', icon: <LuGlobe color="#0f766e" size={20} />, keywords: ['domain', 'subdomain', 'custom domain', 'dns', 'website link'], label: tBusiness('domain'), description: tBusiness('customDomainDesc'), statusTag: domainTag, onClick: () => openSubScreen('domainSettings') },
        ...(FEATURE_FLAGS.ENABLE_BUSINESS_COPY_GENERATION ? [{ key: 'businessCopySetup', icon: <LuSparkles color="#2563eb" size={20} />, keywords: ['copy setup', 'generate business copy', 'seo copy', 'official page copy', 'customer app copy'], label: tBusiness('businessCopySetup'), description: tBusiness('businessCopySetupDesc'), statusTag: businessCopyCoverage.missingFieldCount > 0 ? { color: 'warning' as const, label: tBusiness('businessCopyCoverageGapCount', { count: businessCopyCoverage.missingFieldCount }) } : undefined, onClick: () => openSubScreen('businessCopySetup') }] : []),
        { key: 'seoSettings', icon: <LuGlobe color="#0ea5e9" size={20} />, keywords: ['seo', 'meta title', 'meta description', 'keywords', 'canonical', 'tagline'], label: t('seoSettings'), description: t('seoSettingsDesc'), onClick: () => openSubScreen('seoSettings') },
        ...(FEATURE_FLAGS.ENABLE_MENU_PRESENCE_MONITOR ? [{ key: 'presenceMonitor', icon: <LuSearch color="#0f766e" size={20} />, keywords: ['google business', 'instagram bio', 'whatsapp profile', 'discovery', 'easy to find', 'presence'], label: 'Discovery Setup', description: 'Set up Google, Instagram, and WhatsApp with your official page link.', onClick: () => openSubScreen('presenceMonitor') }] : []),
        ...(FEATURE_FLAGS.ENABLE_GBP_SYNC ? [{ key: 'integrations', icon: <LuGlobe color="#2563eb" size={20} />, keywords: ['google business', 'gbp', 'integration', 'google listing'], label: tBusiness('integrations'), description: 'Google Business profile connection status', onClick: () => openSubScreen('integrations') }] : []),
    ];

    const itemSections = useMemo(() => ([
        { items: moduleItems, title: 'Modules' },
        { items: businessIdentityItems, title: 'Business Settings' },
        { items: businessPresenceItems, title: 'Business Presence' },
    ]), [businessIdentityItems, businessPresenceItems, moduleItems]);

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

    if (subScreen === 'billing') return <MobileBillingScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'businessProfileHub') return <MobileMoreHubScreen description="Manage your public business identity, customer-facing links, and store branding in one place." items={businessProfileHubItems} onBack={() => setSubScreen('main')} title="Business Profile" />;
    if (subScreen === 'searchDiscoveryHub') return <MobileMoreHubScreen description="Manage how customers find you, what search engines read, and where your official links lead." items={searchDiscoveryHubItems} onBack={() => setSubScreen('main')} title="Search & Discovery" />;
    if (subScreen === 'basicSettings') return <MobileBasicSettingsScreen onBack={() => setSubScreen(getBackTarget('basicSettings'))} />;
    if (subScreen === 'locale') return <MobileLocaleSettingsScreen onBack={() => setSubScreen('main')} onOpenBusinessCopySetup={() => setSubScreen('businessCopySetup')} />;
    if (subScreen === 'hoursEdit') return <MobileWorkingHoursEditScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'roles') return <MobileRolesScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'digitalScreens') return <MobileDigitalScreensScreen onBack={() => setSubScreen('main')} onOpenDesignEditor={() => setSubScreen('designEditor')} />;
    if (subScreen === 'locations') return <MobileLocationsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'users') return <MobileUsersScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'dashboard') return <MobileDashboardScreen onBack={() => setSubScreen('main')} onOpenDesignEditor={() => setSubScreen('designEditor')} />;
    if (subScreen === 'feedback') return <MobileFeedbackScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'transactions') return <MobileTransactionsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'help') return <MobileHelpScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'advancedSettings') return <MobileAdvancedSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'contactSettings') return <MobileBasicSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'designEditor') return <MobileDesignEditorScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'businessAttributes') return <MobileBusinessAttributesScreen onBack={() => setSubScreen(getBackTarget('businessAttributes'))} />;
    if (subScreen === 'feedbackSettings') return <MobileAdvancedSettingsScreen mode="feedback" onBack={() => setSubScreen('main')} />;
    if (subScreen === 'officialPage') return <MobileOfficialPageScreen onBack={() => setSubScreen(getBackTarget('officialPage'))} />;
    if (subScreen === 'businessCopySetup') return <MobileBusinessCopySetupScreen onBack={() => setSubScreen(getBackTarget('businessCopySetup'))} />;
    if (subScreen === 'seoSettings') return <MobileSeoAnalyticsScreen mode="seo" onBack={() => setSubScreen(getBackTarget('seoSettings'))} />;
    if (subScreen === 'analyticsSettings') return <MobileSeoAnalyticsScreen mode="analytics" onBack={() => setSubScreen('main')} />;
    if (subScreen === 'socialSettings') return <MobileAdvancedSettingsScreen mode="social" onBack={() => setSubScreen(getBackTarget('socialSettings'))} />;
    if (subScreen === 'timeSlots') return <MobileTimeSlotsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'tempStatus') return <MobileTempStatusScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'specialMenus') return <MobileSpecialMenuScreen onBack={() => setSubScreen('main')} onOpenMenuTab={onOpenMenuTab} />;
    if (subScreen === 'domainSettings') return <MobileDomainSettingsScreen onBack={() => setSubScreen(getBackTarget('domainSettings'))} />;
    if (subScreen === 'integrations') return <MobileIntegrationsScreen onBack={() => setSubScreen(getBackTarget('integrations'))} />;
    if (subScreen === 'posSync') return <MobilePosSyncScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'todayHistory') return <MobileTodayHistoryScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'customerApp') return <MobileCustomerAppScreen onBack={() => setSubScreen(getBackTarget('customerApp'))} />;
    if (subScreen === 'presenceMonitor') return <MobilePresenceMonitorScreen onBack={() => setSubScreen(getBackTarget('presenceMonitor'))} />;

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

    return (
        <Flex gap={12} style={{ padding: 16 }} vertical>
            <Card>
                <Flex align="center" gap={12}>
                    {userImage ? <Avatar size={48} src={userImage} /> : <Avatar size={48}>{userName.charAt(0).toUpperCase()}</Avatar>}
                    <Flex gap={2} vertical>
                        <Title level={5} style={{ margin: 0 }}>{userName}</Title>
                        {userEmail ? <Text type="secondary">{userEmail}</Text> : null}
                    </Flex>
                </Flex>
            </Card>

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

            <Card title={t('helpCenter')}>
                <List>
                    <List.Item
                        arrow
                        description={<Text type="secondary">{t('helpCenterDesc')}</Text>}
                        onClick={() => setSubScreen('help')}
                        prefix={<LuHelpCircle color="#3b82f6" size={20} />}
                        title={<Text strong>{t('helpCenter')}</Text>}
                    />
                    <List.Item
                        arrow
                        description={<Text type="secondary">{t('contactSupportDesc')}</Text>}
                        onClick={() => window.open('https://wa.me/917042916884?text=Hi%2C%20I%20need%20help%20with%20MenuList.ai', '_blank')}
                        prefix={<LuMessageCircle color="#22c55e" size={20} />}
                        title={<Text strong>{t('contactSupport')}</Text>}
                    />
                </List>
            </Card>

            <Card>
                <List>
                    <List.Item
                        arrow
                        description={<Text type="secondary">{t('appSettingsDesc')}</Text>}
                        onClick={() => setIsAppSettingsOpen(true)}
                        prefix={<LuSettings color="#64748b" size={20} />}
                        title={<Text strong>{t('appSettings')}</Text>}
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

function MobileMoreHubScreen({
    description,
    items,
    onBack,
    title,
}: {
    description: string;
    items: MoreListItem[];
    onBack: () => void;
    title: string;
}) {
    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={6} vertical>
                        <Title level={4} style={{ margin: 0 }}>{title}</Title>
                        <Text type="secondary">{description}</Text>
                    </Flex>
                </Card>
                <Card>
                    <List>
                        {items.map((item) => (
                            <List.Item
                                key={item.key}
                                arrow
                                description={item.description}
                                prefix={item.icon}
                                title={item.label}
                                onClick={item.onClick}
                            >
                                {item.statusTag ? <Tag color={item.statusTag.color}>{item.statusTag.label}</Tag> : null}
                            </List.Item>
                        ))}
                    </List>
                </Card>
            </Flex>
        </Flex>
    );
}
