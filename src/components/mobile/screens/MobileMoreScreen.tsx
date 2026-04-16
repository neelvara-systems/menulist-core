'use client'

import { FEATURE_FLAGS } from '@config/features';
import { signOutSession } from '@lib/auth/client';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import {
    LuAlertTriangle,
    LuBarChart3,
    LuBuilding2,
    LuClock,
    LuCreditCard,
    LuGlobe,
    LuHelpCircle,
    LuLogOut,
    LuMapPin,
    LuMessageCircle,
    LuPalette,
    LuReceipt,
    LuSettings,
    LuShield,
    LuSparkles,
    LuTv,
    LuUsers,
} from 'react-icons/lu';
import { Avatar, Card, Dialog, Flex, List, Text, Title, Toast } from '../antd';

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
const MobileTimeSlotsScreen = dynamic(() => import('./MobileTimeSlotsScreen'), { ssr: false });
const MobileTempStatusScreen = dynamic(() => import('./MobileTempStatusScreen'), { ssr: false });
const MobileSpecialMenuScreen = dynamic(() => import('./MobileSpecialMenuScreen'), { ssr: false });
const AppSettingsSheet = dynamic(() => import('../sheets/AppSettingsSheet'), { ssr: false });
const MobileDomainSettingsScreen = dynamic(() => import('./MobileDomainSettingsScreen'), { ssr: false });
const MobileOfficialPageScreen = dynamic(() => import('./MobileOfficialPageScreen'), { ssr: false });
const MobileBusinessAttributesScreen = dynamic(() => import('./MobileBusinessAttributesScreen'), { ssr: false });
const MobileIntegrationsScreen = dynamic(() => import('./MobileIntegrationsScreen'), { ssr: false });
const MobilePosSyncScreen = dynamic(() => import('./MobilePosSyncScreen'), { ssr: false });

export type MoreSubScreen =
    | 'main'
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
    | 'seoSettings'
    | 'analyticsSettings'
    | 'socialSettings'
    | 'timeSlots'
    | 'tempStatus'
    | 'specialMenus'
    | 'domainSettings'
    | 'integrations'
    | 'posSync';

interface MobileMoreScreenProps {
    initialScreen?: MoreSubScreen;
    onRootStateChange?: (isRoot: boolean) => void;
    onScreenChange?: (screen: MoreSubScreen) => void;
}

export default function MobileMoreScreen({ initialScreen = 'main', onRootStateChange, onScreenChange }: MobileMoreScreenProps) {
    const t = useTranslations('MobileMore');
    const tBusiness = useTranslations('BusinessSettings');
    const tFeedback = useTranslations('FeedbackInbox');
    const tPosSync = useTranslations('PosSync');
    const [subScreen, setSubScreen] = useState<MoreSubScreen>(initialScreen);
    const mainScrollTopRef = useRef(0);
    const { data: session } = useSession();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);

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

    const openSubScreen = (nextScreen: MoreSubScreen) => {
        const shellScrollContainer = document.querySelector<HTMLElement>('[data-mobile-shell-scroll="true"]');
        if (shellScrollContainer) {
            mainScrollTopRef.current = shellScrollContainer.scrollTop;
        }
        setSubScreen(nextScreen);
    };

    if (subScreen === 'billing') return <MobileBillingScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'basicSettings') return <MobileBasicSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'locale') return <MobileLocaleSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'hoursEdit') return <MobileWorkingHoursEditScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'roles') return <MobileRolesScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'digitalScreens') return <MobileDigitalScreensScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'locations') return <MobileLocationsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'users') return <MobileUsersScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'dashboard') return <MobileDashboardScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'feedback') return <MobileFeedbackScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'transactions') return <MobileTransactionsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'help') return <MobileHelpScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'advancedSettings') return <MobileAdvancedSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'contactSettings') return <MobileBasicSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'designEditor') return <MobileDesignEditorScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'businessAttributes') return <MobileBusinessAttributesScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'feedbackSettings') return <MobileAdvancedSettingsScreen mode="feedback" onBack={() => setSubScreen('main')} />;
    if (subScreen === 'officialPage') return <MobileOfficialPageScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'seoSettings') return <MobileSeoAnalyticsScreen mode="seo" onBack={() => setSubScreen('main')} />;
    if (subScreen === 'analyticsSettings') return <MobileSeoAnalyticsScreen mode="analytics" onBack={() => setSubScreen('main')} />;
    if (subScreen === 'socialSettings') return <MobileAdvancedSettingsScreen mode="social" onBack={() => setSubScreen('main')} />;
    if (subScreen === 'timeSlots') return <MobileTimeSlotsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'tempStatus') return <MobileTempStatusScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'specialMenus') return <MobileSpecialMenuScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'domainSettings') return <MobileDomainSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'integrations') return <MobileIntegrationsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'posSync') return <MobilePosSyncScreen onBack={() => setSubScreen('main')} />;

    const moduleItems = [
        { key: 'dashboard', icon: <LuBarChart3 color="#4f46e5" size={20} />, label: t('dashboard'), description: t('dashboardDesc'), onClick: () => openSubScreen('dashboard') },
        { key: 'feedback', icon: <LuMessageCircle color="#16a34a" size={20} />, label: tFeedback('title'), description: tFeedback('feedbackQrDesc'), onClick: () => openSubScreen('feedback') },
        ...(FEATURE_FLAGS.ENABLE_TEMP_STATUS ? [{ key: 'tempStatus', icon: <LuAlertTriangle color="#f59e0b" size={20} />, label: t('tempStatus'), description: t('tempStatusDesc'), onClick: () => openSubScreen('tempStatus') }] : []),
        ...(FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING ? [{ key: 'specialMenus', icon: <LuSparkles color="#f97316" size={20} />, label: t('specialMenus'), description: t('specialMenusDesc'), onClick: () => openSubScreen('specialMenus') }] : []),
        { key: 'designEditor', icon: <LuPalette color="#e11d48" size={20} />, label: t('menuDesign'), description: t('menuDesignDesc'), onClick: () => openSubScreen('designEditor') },
        { key: 'digitalScreens', icon: <LuTv color="#06b6d4" size={20} />, label: t('digitalScreens'), description: t('digitalScreensDesc'), onClick: () => openSubScreen('digitalScreens') },
        { key: 'billing', icon: <LuCreditCard color="#9333ea" size={20} />, label: t('billing'), description: t('billingDesc'), onClick: () => openSubScreen('billing') },
        { key: 'transactions', icon: <LuReceipt color="#ec4899" size={20} />, label: t('transactions'), description: t('transactionsDesc'), onClick: () => openSubScreen('transactions') },
    ];

    const businessIdentityItems = [
        { key: 'basicSettings', icon: <LuSettings color="#f97316" size={20} />, label: t('basicSettings'), description: t('basicSettingsDesc'), onClick: () => openSubScreen('basicSettings') },
        { key: 'locale', icon: <LuGlobe color="#14b8a6" size={20} />, label: t('languageRegion'), description: t('languageRegionDesc'), onClick: () => openSubScreen('locale') },
        { key: 'hoursEdit', icon: <LuClock color="#6366f1" size={20} />, label: t('editWorkingHours'), description: t('editWorkingHoursDesc'), onClick: () => openSubScreen('hoursEdit') },
        { key: 'timeSlots', icon: <LuClock color="#10b981" size={20} />, label: t('timeSlots'), description: t('timeSlotsDesc'), onClick: () => openSubScreen('timeSlots') },
        { key: 'locations', icon: <LuMapPin color="#f59e0b" size={20} />, label: t('locations'), description: t('locationsDesc'), onClick: () => openSubScreen('locations') },
        { key: 'users', icon: <LuUsers color="#3b82f6" size={20} />, label: t('staff'), description: t('staffDesc'), onClick: () => openSubScreen('users') },
        { key: 'roles', icon: <LuShield color="#8b5cf6" size={20} />, label: t('rolesPermissions'), description: t('rolesPermissionsDesc'), onClick: () => openSubScreen('roles') },
    ];

    const businessPresenceItems = [
        { key: 'domainSettings', icon: <LuGlobe color="#0f766e" size={20} />, label: tBusiness('domain'), description: tBusiness('customDomainDesc'), onClick: () => openSubScreen('domainSettings') },
        ...(FEATURE_FLAGS.ENABLE_OBP ? [{ key: 'officialPage', icon: <LuGlobe color="#1d4ed8" size={20} />, label: tBusiness('officialPage'), description: tBusiness('officialPageDesc'), onClick: () => openSubScreen('officialPage') }] : []),
        { key: 'socialSettings', icon: <LuGlobe color="#f43f5e" size={20} />, label: tBusiness('socialMedia'), description: t('socialSettingsDesc'), onClick: () => openSubScreen('socialSettings') },
        ...(FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES ? [{ key: 'businessAttributes', icon: <LuBuilding2 color="#7c3aed" size={20} />, label: tBusiness('businessAttributes'), description: tBusiness('businessAttributesDesc'), onClick: () => openSubScreen('businessAttributes') }] : []),
        { key: 'seoSettings', icon: <LuGlobe color="#0ea5e9" size={20} />, label: t('seoSettings'), description: t('seoSettingsDesc'), onClick: () => openSubScreen('seoSettings') },
        { key: 'analyticsSettings', icon: <LuBarChart3 color="#16a34a" size={20} />, label: t('analyticsSettings'), description: t('analyticsSettingsDesc'), onClick: () => openSubScreen('analyticsSettings') },
        ...(FEATURE_FLAGS.ENABLE_GBP_SYNC ? [{ key: 'integrations', icon: <LuGlobe color="#2563eb" size={20} />, label: tBusiness('integrations'), description: 'Google Business profile connection status', onClick: () => openSubScreen('integrations') }] : []),
        { key: 'feedbackSettings', icon: <LuMessageCircle color="#16a34a" size={20} />, label: tBusiness('feedback'), description: t('feedbackSettingsDesc'), onClick: () => openSubScreen('feedbackSettings') },
        ...(FEATURE_FLAGS.ENABLE_POS_SYNC ? [{ key: 'posSync', icon: <LuShield color="#475569" size={20} />, label: tPosSync('title'), description: tPosSync('enablePosSyncDesc'), onClick: () => openSubScreen('posSync') }] : []),
    ];

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

            <Card>
                <List>
                    {moduleItems.map((item) => (
                        <List.Item
                            arrow
                            description={<Text type="secondary">{item.description}</Text>}
                            key={item.key}
                            onClick={item.onClick}
                            prefix={item.icon}
                            title={<Text strong>{item.label}</Text>}
                        />
                    ))}
                </List>
            </Card>

            <Card title="Business Settings">
                <List>
                    {businessIdentityItems.map((item) => (
                        <List.Item
                            arrow
                            description={<Text type="secondary">{item.description}</Text>}
                            key={item.key}
                            onClick={item.onClick}
                            prefix={item.icon}
                            title={<Text strong>{item.label}</Text>}
                        />
                    ))}
                </List>
            </Card>

            <Card title="Business Presence">
                <List>
                    {businessPresenceItems.map((item) => (
                        <List.Item
                            arrow
                            description={<Text type="secondary">{item.description}</Text>}
                            key={item.key}
                            onClick={item.onClick}
                            prefix={item.icon}
                            title={<Text strong>{item.label}</Text>}
                        />
                    ))}
                </List>
            </Card>

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
                    <List.Item
                        onClick={handleLogout}
                        prefix={<LuLogOut color="#dc2626" size={20} />}
                        title={<Text strong style={{ color: '#dc2626' }}>{isLoggingOut ? t('loggingOut') : t('logOut')}</Text>}
                    />
                </List>
            </Card>
            <AppSettingsSheet
                onClose={() => setIsAppSettingsOpen(false)}
                visible={isAppSettingsOpen}
            />
        </Flex>
    );
}
