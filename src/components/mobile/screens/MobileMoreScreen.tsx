'use client'

import { FEATURE_FLAGS } from '@config/features';
import { useAppSelector } from '@hook/useAppSelector';
import { signOutSession } from '@lib/auth/client';
import { getDarkModeState } from '@reduxSlices/clientThemeConfig';
import { Card, Dialog, List, Toast } from 'antd-mobile';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { LuAlertTriangle, LuBarChart3, LuBuilding2, LuCalendarCheck, LuChevronRight, LuClock, LuCreditCard, LuGlobe, LuHelpCircle, LuLogOut, LuMapPin, LuMessageCircle, LuMonitor, LuPalette, LuQrCode, LuReceipt, LuSettings, LuSettings2, LuShield, LuSparkles, LuTv, LuUsers } from 'react-icons/lu';

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

type MoreSubScreen = 'main' | 'share' | 'publicInfo' | 'billing' | 'basicSettings' | 'locale' | 'hoursEdit' | 'roles' | 'digitalScreens' | 'locations' | 'today' | 'users' | 'dashboard' | 'transactions' | 'help' | 'advancedSettings' | 'designEditor' | 'seoAnalytics' | 'timeSlots' | 'tempStatus' | 'specialMenus';

export default function MobileMoreScreen() {
    const t = useTranslations('MobileMore');
    const [subScreen, setSubScreen] = useState<MoreSubScreen>('main');
    const { data: session } = useSession();
    const isDarkMode = useAppSelector(getDarkModeState);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const userName = session?.user?.name || 'User';
    const userEmail = session?.user?.email || '';
    const userImage = session?.user?.image || '';

    if (subScreen === 'share') {
        return <MobileShareScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'publicInfo') {
        return <MobilePublicInfoScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'billing') {
        return <MobileBillingScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'basicSettings') {
        return <MobileBasicSettingsScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'locale') {
        return <MobileLocaleSettingsScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'hoursEdit') {
        return <MobileWorkingHoursEditScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'roles') {
        return <MobileRolesScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'digitalScreens') {
        return <MobileDigitalScreensScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'locations') {
        return <MobileLocationsScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'today') {
        return <MobileTodayScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'users') {
        return <MobileUsersScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'dashboard') {
        return <MobileDashboardScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'transactions') {
        return <MobileTransactionsScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'help') {
        return <MobileHelpScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'advancedSettings') {
        return <MobileAdvancedSettingsScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'designEditor') {
        return <MobileDesignEditorScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'seoAnalytics') {
        return <MobileSeoAnalyticsScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'timeSlots') {
        return <MobileTimeSlotsScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'tempStatus') {
        return <MobileTempStatusScreen onBack={() => setSubScreen('main')} />;
    }
    if (subScreen === 'specialMenus') {
        return <MobileSpecialMenuScreen onBack={() => setSubScreen('main')} />;
    }

    const menuItems = [
        {
            key: 'dashboard',
            icon: <LuBarChart3 size={20} className="text-indigo-600" />,
            label: t('dashboard'),
            description: t('dashboardDesc'),
            onClick: () => setSubScreen('dashboard'),
        },
        {
            key: 'today',
            icon: <LuCalendarCheck size={20} className="text-emerald-500" />,
            label: t('today'),
            description: t('todayDesc'),
            onClick: () => setSubScreen('today'),
        },
        {
            key: 'share',
            icon: <LuQrCode size={20} className="text-blue-600" />,
            label: t('shareQr'),
            description: t('shareQrDesc'),
            onClick: () => setSubScreen('share'),
        },
        ...(FEATURE_FLAGS.ENABLE_TEMP_STATUS ? [{
            key: 'tempStatus',
            icon: <LuAlertTriangle size={20} className="text-amber-500" />,
            label: t('tempStatus'),
            description: t('tempStatusDesc'),
            onClick: () => setSubScreen('tempStatus'),
        }] : []),
        ...(FEATURE_FLAGS.ENABLE_SPECIAL_MENU_SWITCHING ? [{
            key: 'specialMenus',
            icon: <LuSparkles size={20} className="text-orange-500" />,
            label: t('specialMenus'),
            description: t('specialMenusDesc'),
            onClick: () => setSubScreen('specialMenus' as MoreSubScreen),
        }] : []),
        {
            key: 'designEditor',
            icon: <LuPalette size={20} className="text-rose-500" />,
            label: t('menuDesign'),
            description: t('menuDesignDesc'),
            onClick: () => setSubScreen('designEditor'),
        },
        {
            key: 'publicInfo',
            icon: <LuBuilding2 size={20} className="text-green-600" />,
            label: t('publicInfo'),
            description: t('publicInfoDesc'),
            onClick: () => setSubScreen('publicInfo'),
        },
        {
            key: 'billing',
            icon: <LuCreditCard size={20} className="text-purple-600" />,
            label: t('billing'),
            description: t('billingDesc'),
            onClick: () => setSubScreen('billing'),
        },
        {
            key: 'transactions',
            icon: <LuReceipt size={20} className="text-pink-500" />,
            label: t('transactions'),
            description: t('transactionsDesc'),
            onClick: () => setSubScreen('transactions'),
        },
    ];

    const settingsItems = [
        {
            key: 'basicSettings',
            icon: <LuSettings size={20} className="text-orange-500" />,
            label: t('basicSettings'),
            description: t('basicSettingsDesc'),
            onClick: () => setSubScreen('basicSettings'),
        },
        {
            key: 'locale',
            icon: <LuGlobe size={20} className="text-teal-500" />,
            label: t('languageRegion'),
            description: t('languageRegionDesc'),
            onClick: () => setSubScreen('locale'),
        },
        {
            key: 'hoursEdit',
            icon: <LuClock size={20} className="text-indigo-500" />,
            label: t('editWorkingHours'),
            description: t('editWorkingHoursDesc'),
            onClick: () => setSubScreen('hoursEdit'),
        },
        {
            key: 'roles',
            icon: <LuShield size={20} className="text-violet-500" />,
            label: t('rolesPermissions'),
            description: t('rolesPermissionsDesc'),
            onClick: () => setSubScreen('roles'),
        },
        {
            key: 'digitalScreens',
            icon: <LuTv size={20} className="text-cyan-500" />,
            label: t('digitalScreens'),
            description: t('digitalScreensDesc'),
            onClick: () => setSubScreen('digitalScreens'),
        },
        {
            key: 'locations',
            icon: <LuMapPin size={20} className="text-amber-500" />,
            label: t('locations'),
            description: t('locationsDesc'),
            onClick: () => setSubScreen('locations'),
        },
        {
            key: 'users',
            icon: <LuUsers size={20} className="text-blue-500" />,
            label: t('staff'),
            description: t('staffDesc'),
            onClick: () => setSubScreen('users'),
        },
        {
            key: 'timeSlots',
            icon: <LuClock size={20} className="text-emerald-500" />,
            label: t('timeSlots'),
            description: t('timeSlotsDesc'),
            onClick: () => setSubScreen('timeSlots'),
        },
        {
            key: 'seoAnalytics',
            icon: <LuGlobe size={20} className="text-sky-500" />,
            label: t('seoAnalytics'),
            description: t('seoAnalyticsDesc'),
            onClick: () => setSubScreen('seoAnalytics'),
        },
        {
            key: 'advancedSettings',
            icon: <LuSettings2 size={20} className="text-gray-500" />,
            label: t('advancedSettings'),
            description: t('advancedSettingsDesc'),
            onClick: () => setSubScreen('advancedSettings'),
        },
    ];

    // Theme colors
    const theme = {
        bg: isDarkMode ? '#0f172a' : '#ffffff',
        textPrimary: isDarkMode ? '#f1f5f9' : '#0f172a',
        textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
        textMuted: isDarkMode ? '#64748b' : '#94a3b8',
        border: isDarkMode ? '#334155' : '#e2e8f0',
        cardBg: isDarkMode ? '#1e293b' : '#ffffff',
    };

    const handleLogout = () => {
        Dialog.confirm({
            content: t('logoutConfirm'),
            confirmText: t('logOut'),
            cancelText: 'Cancel',
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
        <div className="px-4 pt-3 pb-4 space-y-4">
            {/* Profile Header */}
            <Card style={{ borderRadius: '12px', backgroundColor: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <div className="flex items-center gap-3">
                    {userImage ? (
                        <img
                            src={userImage}
                            alt={userName}
                            className="w-12 h-12 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-semibold"
                            style={{ backgroundColor: '#2563eb' }}>
                            {userName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold truncate" style={{ color: theme.textPrimary }}>
                            {userName}
                        </p>
                        {userEmail && (
                            <p className="text-xs truncate" style={{ color: theme.textSecondary }}>
                                {userEmail}
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Navigation Items */}
            <Card style={{ borderRadius: '12px', backgroundColor: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <List style={{ '--border-inner': `1px solid ${theme.border}` } as React.CSSProperties}>
                    {menuItems.map((item) => (
                        <List.Item
                            key={item.key}
                            prefix={item.icon}
                            onClick={item.onClick}
                            description={<span style={{ color: theme.textSecondary }}>{item.description}</span>}
                            arrow={<LuChevronRight size={18} style={{ color: theme.textMuted }} />}
                            style={{ minHeight: '48px' }}
                        >
                            <span className="text-[15px] font-medium" style={{ color: theme.textPrimary }}>{item.label}</span>
                        </List.Item>
                    ))}
                </List>
            </Card>

            {/* Settings */}
            <Card style={{ borderRadius: '12px', backgroundColor: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <List style={{ '--border-inner': `1px solid ${theme.border}` } as React.CSSProperties}>
                    {settingsItems.map((item) => (
                        <List.Item
                            key={item.key}
                            prefix={item.icon}
                            onClick={item.onClick}
                            description={<span style={{ color: theme.textSecondary }}>{item.description}</span>}
                            arrow={<LuChevronRight size={18} style={{ color: theme.textMuted }} />}
                            style={{ minHeight: '48px' }}
                        >
                            <span className="text-[15px] font-medium" style={{ color: theme.textPrimary }}>{item.label}</span>
                        </List.Item>
                    ))}
                </List>
            </Card>

            {/* Support */}
            <Card style={{ borderRadius: '12px', backgroundColor: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <List style={{ '--border-inner': `1px solid ${theme.border}` } as React.CSSProperties}>
                    <List.Item
                        prefix={<LuHelpCircle size={20} style={{ color: '#3b82f6' }} />}
                        onClick={() => setSubScreen('help')}
                        description={<span style={{ color: theme.textSecondary }}>{t('helpCenterDesc')}</span>}
                        arrow={<LuChevronRight size={18} style={{ color: theme.textMuted }} />}
                        style={{ minHeight: '48px' }}
                    >
                        <span className="text-[15px] font-medium" style={{ color: theme.textPrimary }}>{t('helpCenter')}</span>
                    </List.Item>
                    <List.Item
                        prefix={<LuMessageCircle size={20} style={{ color: '#22c55e' }} />}
                        onClick={() => {
                            window.open('https://wa.me/917042916884?text=Hi%2C%20I%20need%20help%20with%20MenuList.ai', '_blank');
                        }}
                        description={<span style={{ color: theme.textSecondary }}>{t('contactSupportDesc')}</span>}
                        arrow={<LuChevronRight size={18} style={{ color: theme.textMuted }} />}
                        style={{ minHeight: '48px' }}
                    >
                        <span className="text-[15px] font-medium" style={{ color: theme.textPrimary }}>{t('contactSupport')}</span>
                    </List.Item>
                </List>
            </Card>

            {/* Switch to Desktop + Logout */}
            <Card style={{ borderRadius: '12px', backgroundColor: theme.cardBg, border: `1px solid ${theme.border}` }}>
                <List style={{ '--border-inner': `1px solid ${theme.border}` } as React.CSSProperties}>
                    <List.Item
                        prefix={<LuMonitor size={20} style={{ color: theme.textSecondary }} />}
                        onClick={() => {
                            localStorage.setItem('forceDesktopMode', 'true');
                            window.location.reload();
                        }}
                        description={<span style={{ color: theme.textSecondary }}>{t('switchToDesktopDesc')}</span>}
                        arrow={<LuChevronRight size={18} style={{ color: theme.textMuted }} />}
                        style={{ minHeight: '48px' }}
                    >
                        <span className="text-[15px] font-medium" style={{ color: theme.textPrimary }}>{t('switchToDesktop')}</span>
                    </List.Item>
                    <List.Item
                        prefix={<LuLogOut size={20} style={{ color: '#dc2626' }} />}
                        onClick={handleLogout}
                        style={{ minHeight: '48px' }}
                    >
                        <span className="text-[15px] font-medium" style={{ color: '#dc2626' }}>
                            {isLoggingOut ? t('loggingOut') : t('logOut')}
                        </span>
                    </List.Item>
                </List>
            </Card>
        </div>
    );
}
