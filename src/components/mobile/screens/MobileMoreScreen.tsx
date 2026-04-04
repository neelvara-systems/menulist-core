'use client'

import { FEATURE_FLAGS } from '@config/features';
import { signOutSession } from '@lib/auth/client';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import {
    LuAlertTriangle,
    LuBarChart3,
    LuBuilding2,
    LuCalendarCheck,
    LuClock,
    LuCreditCard,
    LuGlobe,
    LuHelpCircle,
    LuLogOut,
    LuMapPin,
    LuMessageCircle,
    LuMonitor,
    LuPalette,
    LuQrCode,
    LuReceipt,
    LuSettings,
    LuSettings2,
    LuShield,
    LuSparkles,
    LuTv,
    LuUsers,
} from 'react-icons/lu';
import { Avatar, Card, Dialog, Flex, List, Text, Title, Toast } from '../antd';

const MobileShareScreen = dynamic(() => import('./MobileShareScreen'), { ssr: false });
const MobilePublicInfoScreen = dynamic(() => import('./MobilePublicInfoScreen'), { ssr: false });
const MobileBillingScreen = dynamic(() => import('./MobileBillingScreen'), { ssr: false });
const MobileBasicSettingsScreen = dynamic(() => import('./MobileBasicSettingsScreen'), { ssr: false });
const MobileLocaleSettingsScreen = dynamic(() => import('./MobileLocaleSettingsScreen'), { ssr: false });
const MobileWorkingHoursEditScreen = dynamic(() => import('./MobileWorkingHoursEditScreen'), { ssr: false });
const MobileRolesScreen = dynamic(() => import('./MobileRolesScreen'), { ssr: false });
const MobileDigitalScreensScreen = dynamic(() => import('./MobileDigitalScreensScreen'), { ssr: false });
const MobileLocationsScreen = dynamic(() => import('./MobileLocationsScreen'), { ssr: false });
const MobileTodayScreen = dynamic(() => import('./MobileTodayScreen'), { ssr: false });
const MobileUsersScreen = dynamic(() => import('./MobileUsersScreen'), { ssr: false });
const MobileDashboardScreen = dynamic(() => import('./MobileDashboardScreen'), { ssr: false });
const MobileTransactionsScreen = dynamic(() => import('./MobileTransactionsScreen'), { ssr: false });
const MobileHelpScreen = dynamic(() => import('./MobileHelpScreen'), { ssr: false });
const MobileAdvancedSettingsScreen = dynamic(() => import('./MobileAdvancedSettingsScreen'), { ssr: false });
const MobileDesignEditorScreen = dynamic(() => import('./MobileDesignEditorScreen'), { ssr: false });
const MobileSeoAnalyticsScreen = dynamic(() => import('./MobileSeoAnalyticsScreen'), { ssr: false });
const MobileTimeSlotsScreen = dynamic(() => import('./MobileTimeSlotsScreen'), { ssr: false });
const MobileTempStatusScreen = dynamic(() => import('./MobileTempStatusScreen'), { ssr: false });
const MobileSpecialMenuScreen = dynamic(() => import('./MobileSpecialMenuScreen'), { ssr: false });
const AppSettingsSheet = dynamic(() => import('../sheets/AppSettingsSheet'), { ssr: false });
const MobileSubdomainScreen = dynamic(() => import('./MobileSubdomainScreen'), { ssr: false });
const MobileCustomDomainScreen = dynamic(() => import('./MobileCustomDomainScreen'), { ssr: false });

type MoreSubScreen =
    | 'main'
    | 'share'
    | 'publicInfo'
    | 'billing'
    | 'basicSettings'
    | 'locale'
    | 'hoursEdit'
    | 'roles'
    | 'digitalScreens'
    | 'locations'
    | 'today'
    | 'users'
    | 'dashboard'
    | 'transactions'
    | 'help'
    | 'advancedSettings'
    | 'designEditor'
    | 'seoAnalytics'
    | 'timeSlots'
    | 'tempStatus'
    | 'specialMenus'
    | 'subdomain'
    | 'customDomain';

export default function MobileMoreScreen() {
    const t = useTranslations('MobileMore');
    const tBusiness = useTranslations('BusinessSettings');
    const [subScreen, setSubScreen] = useState<MoreSubScreen>('main');
    const { data: session } = useSession();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);

    const userName = session?.user?.name || 'User';
    const userEmail = session?.user?.email || '';
    const userImage = session?.user?.image || '';

    if (subScreen === 'share') return <MobileShareScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'publicInfo') return <MobilePublicInfoScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'billing') return <MobileBillingScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'basicSettings') return <MobileBasicSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'locale') return <MobileLocaleSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'hoursEdit') return <MobileWorkingHoursEditScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'roles') return <MobileRolesScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'digitalScreens') return <MobileDigitalScreensScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'locations') return <MobileLocationsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'today') return <MobileTodayScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'users') return <MobileUsersScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'dashboard') return <MobileDashboardScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'transactions') return <MobileTransactionsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'help') return <MobileHelpScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'advancedSettings') return <MobileAdvancedSettingsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'designEditor') return <MobileDesignEditorScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'seoAnalytics') return <MobileSeoAnalyticsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'timeSlots') return <MobileTimeSlotsScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'tempStatus') return <MobileTempStatusScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'specialMenus') return <MobileSpecialMenuScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'subdomain') return <MobileSubdomainScreen onBack={() => setSubScreen('main')} />;
    if (subScreen === 'customDomain') return <MobileCustomDomainScreen onBack={() => setSubScreen('main')} />;

    const menuItems = [
        { key: 'dashboard', icon: <LuBarChart3 color="#4f46e5" size={20} />, label: t('dashboard'), description: t('dashboardDesc'), onClick: () => setSubScreen('dashboard') },
        { key: 'today', icon: <LuCalendarCheck color="#10b981" size={20} />, label: t('today'), description: t('todayDesc'), onClick: () => setSubScreen('today') },
        { key: 'share', icon: <LuQrCode color="#2563eb" size={20} />, label: t('shareQr'), description: t('shareQrDesc'), onClick: () => setSubScreen('share') },
        ...(FEATURE_FLAGS.ENABLE_TEMP_STATUS ? [{ key: 'tempStatus', icon: <LuAlertTriangle color="#f59e0b" size={20} />, label: t('tempStatus'), description: t('tempStatusDesc'), onClick: () => setSubScreen('tempStatus') }] : []),
        ...(FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING ? [{ key: 'specialMenus', icon: <LuSparkles color="#f97316" size={20} />, label: t('specialMenus'), description: t('specialMenusDesc'), onClick: () => setSubScreen('specialMenus') }] : []),
        { key: 'designEditor', icon: <LuPalette color="#e11d48" size={20} />, label: t('menuDesign'), description: t('menuDesignDesc'), onClick: () => setSubScreen('designEditor') },
        { key: 'publicInfo', icon: <LuBuilding2 color="#16a34a" size={20} />, label: t('publicInfo'), description: t('publicInfoDesc'), onClick: () => setSubScreen('publicInfo') },
        { key: 'billing', icon: <LuCreditCard color="#9333ea" size={20} />, label: t('billing'), description: t('billingDesc'), onClick: () => setSubScreen('billing') },
        { key: 'transactions', icon: <LuReceipt color="#ec4899" size={20} />, label: t('transactions'), description: t('transactionsDesc'), onClick: () => setSubScreen('transactions') },
    ];

    const settingsItems = [
        { key: 'basicSettings', icon: <LuSettings color="#f97316" size={20} />, label: t('basicSettings'), description: t('basicSettingsDesc'), onClick: () => setSubScreen('basicSettings') },
        { key: 'subdomain', icon: <LuGlobe color="#0f766e" size={20} />, label: tBusiness('subdomain'), description: tBusiness('subdomainHelp'), onClick: () => setSubScreen('subdomain') },
        { key: 'customDomain', icon: <LuGlobe color="#2563eb" size={20} />, label: tBusiness('customDomain'), description: tBusiness('customDomainDesc'), onClick: () => setSubScreen('customDomain') },
        { key: 'locale', icon: <LuGlobe color="#14b8a6" size={20} />, label: t('languageRegion'), description: t('languageRegionDesc'), onClick: () => setSubScreen('locale') },
        { key: 'hoursEdit', icon: <LuClock color="#6366f1" size={20} />, label: t('editWorkingHours'), description: t('editWorkingHoursDesc'), onClick: () => setSubScreen('hoursEdit') },
        { key: 'roles', icon: <LuShield color="#8b5cf6" size={20} />, label: t('rolesPermissions'), description: t('rolesPermissionsDesc'), onClick: () => setSubScreen('roles') },
        { key: 'digitalScreens', icon: <LuTv color="#06b6d4" size={20} />, label: t('digitalScreens'), description: t('digitalScreensDesc'), onClick: () => setSubScreen('digitalScreens') },
        { key: 'locations', icon: <LuMapPin color="#f59e0b" size={20} />, label: t('locations'), description: t('locationsDesc'), onClick: () => setSubScreen('locations') },
        { key: 'users', icon: <LuUsers color="#3b82f6" size={20} />, label: t('staff'), description: t('staffDesc'), onClick: () => setSubScreen('users') },
        { key: 'timeSlots', icon: <LuClock color="#10b981" size={20} />, label: t('timeSlots'), description: t('timeSlotsDesc'), onClick: () => setSubScreen('timeSlots') },
        { key: 'seoAnalytics', icon: <LuGlobe color="#0ea5e9" size={20} />, label: t('seoAnalytics'), description: t('seoAnalyticsDesc'), onClick: () => setSubScreen('seoAnalytics') },
        { key: 'advancedSettings', icon: <LuSettings2 color="#6b7280" size={20} />, label: t('advancedSettings'), description: t('advancedSettingsDesc'), onClick: () => setSubScreen('advancedSettings') },
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

            <Card title={t('dashboard')}>
                <List>
                    {menuItems.map((item) => (
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

            <Card title={t('basicSettings')}>
                <List>
                    {settingsItems.map((item) => (
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
                        arrow
                        description={<Text type="secondary">{t('switchToDesktopDesc')}</Text>}
                        onClick={() => {
                            localStorage.setItem('forceDesktopMode', 'true');
                            window.location.reload();
                        }}
                        prefix={<LuMonitor color="#64748b" size={20} />}
                        title={<Text strong>{t('switchToDesktop')}</Text>}
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
