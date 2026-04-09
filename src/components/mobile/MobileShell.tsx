'use client'

import { getFeedbackCount } from '@database/guestFeedback';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { theme } from 'antd';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuCreditCard } from 'react-icons/lu';
import { Button, Card, Flex, SafeArea, Text, Title } from './antd';
import MobileNavigation, { type MobileTab } from './MobileNavigation';
import MobileProjectsProvider from './providers/MobileProjectsProvider';

const MobileMenuScreen = dynamic(() => import('./screens/MobileMenuScreen'), { ssr: false });
const MobileHoursScreen = dynamic(() => import('./screens/MobileHoursScreen'), { ssr: false });
const MobileDashboardScreen = dynamic(() => import('./screens/MobileDashboardScreen'), { ssr: false });
const MobileShareScreen = dynamic(() => import('./screens/MobileShareScreen'), { ssr: false });
const MobileMoreScreen = dynamic(() => import('./screens/MobileMoreScreen'), { ssr: false });

export default function MobileShell() {
    const { activeSubscription } = useContext(PlatformGlobalDataContext);
    const { token } = theme.useToken();
    const [activeTab, setActiveTab] = useState<MobileTab>('today');
    const [todayScreen, setTodayScreen] = useState<'main' | 'dashboard'>('main');
    const [isMoreRootScreen, setIsMoreRootScreen] = useState(true);
    const [feedbackBadgeCount, setFeedbackBadgeCount] = useState<number>(0);
    const [isOffline, setIsOffline] = useState(false);
    const hasSubscription = hasValidSubscriptionAccess(activeSubscription);

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
        const fetchCount = async () => {
            try {
                const result = await getFeedbackCount('needs_attention');
                setFeedbackBadgeCount(typeof result === 'number' ? result : 0);
            } catch {
                setFeedbackBadgeCount(0);
            }
        };
        void fetchCount();
    }, []);

    const handleTabChange = useCallback((tab: MobileTab) => {
        setActiveTab(tab);
        if (tab !== 'today') {
            setTodayScreen('main');
        }
        if (tab !== 'more') {
            setIsMoreRootScreen(true);
        }
        if (tab === 'more') {
            setFeedbackBadgeCount(0);
        }
    }, []);

    const screen = activeTab === 'today'
        ? (
            todayScreen === 'dashboard'
                ? <MobileDashboardScreen onBack={() => setTodayScreen('main')} />
                : <MobileHoursScreen onOpenDashboard={() => setTodayScreen('dashboard')} />
        )
        : activeTab === 'share'
            ? <MobileShareScreen />
            : activeTab === 'more'
                ? <MobileMoreScreen onRootStateChange={setIsMoreRootScreen} />
                : <MobileMenuScreen />;

    if (!hasSubscription) {
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
                                    localStorage.setItem('forceDesktopMode', 'true');
                                    window.location.href = '/billing';
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
        <MobileProjectsProvider>
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
                <Flex
                    data-mobile-shell-scroll="true"
                    flex={1}
                    style={{
                        overflowY: 'auto',
                        paddingBottom: 88,
                        paddingTop:
                            activeTab === 'menu' ||
                            activeTab === 'share' ||
                            (activeTab === 'today' && todayScreen === 'main') ||
                            (activeTab === 'more' && isMoreRootScreen)
                                ? 'calc(env(safe-area-inset-top) + 8px)'
                                : 0,
                    }}
                    vertical
                >
                    {screen}
                </Flex>
                <MobileNavigation
                    activeTab={activeTab}
                    feedbackCount={feedbackBadgeCount}
                    onTabChange={handleTabChange}
                />
                <SafeArea position="bottom" />
            </Flex>
        </MobileProjectsProvider>
    );
}
