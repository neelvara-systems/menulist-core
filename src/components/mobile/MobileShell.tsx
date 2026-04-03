'use client'

import { getFeedbackCount } from '@database/guestFeedback';
import { useAppSelector } from '@hook/useAppSelector';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getDarkModeState } from '@reduxSlices/clientThemeConfig';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuCreditCard } from 'react-icons/lu';
import { Button, Card, Flex, SafeArea, Text, Title } from './antd';
import MobileNavigation, { type MobileTab } from './MobileNavigation';

const MobileMenuScreen = dynamic(() => import('./screens/MobileMenuScreen'), { ssr: false });
const MobileHoursScreen = dynamic(() => import('./screens/MobileHoursScreen'), { ssr: false });
const MobileFeedbackScreen = dynamic(() => import('./screens/MobileFeedbackScreen'), { ssr: false });
const MobileMoreScreen = dynamic(() => import('./screens/MobileMoreScreen'), { ssr: false });

export default function MobileShell() {
    const { activeSubscription } = useContext(PlatformGlobalDataContext);
    const isDarkMode = useAppSelector(getDarkModeState);
    const [activeTab, setActiveTab] = useState<MobileTab>('menu');
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
        if (tab === 'feedback') {
            setFeedbackBadgeCount(0);
        }
    }, []);

    const screen = activeTab === 'hours'
        ? <MobileHoursScreen />
        : activeTab === 'feedback'
            ? <MobileFeedbackScreen />
            : activeTab === 'more'
                ? <MobileMoreScreen />
                : <MobileMenuScreen />;

    if (!hasSubscription) {
        return (
            <Flex style={{ background: isDarkMode ? '#141414' : '#ffffff', minHeight: '100dvh', padding: 16 }} vertical>
                <SafeArea position="top" />
                <Flex align="center" flex={1} justify="center" vertical>
                    <Card style={{ maxWidth: 420, width: '100%' }}>
                        <Flex align="center" gap={16} vertical>
                            <LuCreditCard color="#1677ff" size={48} />
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
        <Flex style={{ background: isDarkMode ? '#141414' : '#f5f5f5', minHeight: '100dvh' }} vertical>
            <SafeArea position="top" />
            {isOffline ? (
                <Card style={{ background: '#faad14', borderRadius: 0, color: '#fff', margin: 0 }}>
                    <Text style={{ color: '#fff' }}>You&apos;re offline. Some features may be limited.</Text>
                </Card>
            ) : null}
            <Flex flex={1} style={{ overflowY: 'auto', paddingBottom: 88 }} vertical>
                {screen}
            </Flex>
            <MobileNavigation
                activeTab={activeTab}
                feedbackCount={feedbackBadgeCount}
                isDarkMode={isDarkMode}
                onTabChange={handleTabChange}
            />
            <SafeArea position="bottom" />
        </Flex>
    );
}
