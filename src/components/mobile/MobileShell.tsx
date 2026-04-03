'use client'

import { getFeedbackCount } from '@database/guestFeedback';
import { useAppSelector } from '@hook/useAppSelector';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { getDarkModeState } from '@reduxSlices/clientThemeConfig';
import { hasValidSubscriptionAccess } from '@util/razorpay';
import { Button, SafeArea } from 'antd-mobile';
import dynamic from 'next/dynamic';
import { useCallback, useContext, useEffect, useState } from 'react';
import { LuCreditCard } from 'react-icons/lu';
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

    // Online/offline detection for PWA
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

    // Fetch unread feedback count for badge display
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const result = await getFeedbackCount('needs_attention');
                setFeedbackBadgeCount(typeof result === 'number' ? result : 0);
            } catch {
                // Silently fail — badge is non-critical
            }
        };
        fetchCount();
    }, []);

    // Clear badge when user visits feedback tab
    const handleTabChange = useCallback((tab: MobileTab) => {
        setActiveTab(tab);
        if (tab === 'feedback') {
            setFeedbackBadgeCount(0);
        }
    }, []);

    const renderScreen = () => {
        switch (activeTab) {
            case 'menu':
                return <MobileMenuScreen />;
            case 'hours':
                return <MobileHoursScreen />;
            case 'feedback':
                return <MobileFeedbackScreen />;
            case 'more':
                return <MobileMoreScreen />;
            default:
                return <MobileMenuScreen />;
        }
    };

    // No subscription — show upgrade prompt instead of shell
    if (!hasSubscription) {
        return (
            <div className={`flex flex-col h-[100dvh] bg-white dark:bg-[#141414] ${isDarkMode ? 'dark' : ''}`}>
                <SafeArea position="top" />
                <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
                    <LuCreditCard size={48} className="text-blue-500" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Subscribe to Get Started
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                        Choose a plan to start creating your digital menu and managing your business.
                    </p>
                    <Button
                        color="primary"
                        fill="solid"
                        size="large"
                        onClick={() => {
                            // Switch to desktop for pricing page (mobile pricing not yet available)
                            localStorage.setItem('forceDesktopMode', 'true');
                            window.location.href = '/billing';
                        }}
                        style={{ minHeight: '44px', minWidth: '200px' }}
                    >
                        View Plans
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col h-[100dvh] bg-white dark:bg-[#141414] ${isDarkMode ? 'dark' : ''}`}>
            <SafeArea position="top" />
            {isOffline && (
                <div className="bg-yellow-500 text-white text-center text-xs py-1.5 px-4 font-medium">
                    You&apos;re offline. Some features may be limited.
                </div>
            )}
            <div className="flex-1 overflow-y-auto pb-14">
                {renderScreen()}
            </div>
            <MobileNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
                feedbackCount={feedbackBadgeCount}
            />
        </div>
    );
}
