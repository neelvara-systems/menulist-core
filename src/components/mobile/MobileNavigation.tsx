'use client'

import { theme } from 'antd';
import { useEffect, useRef } from 'react';
import { Button, Flex, Text } from './antd';
import { LuCalendarCheck, LuMessageCircle, LuMoreHorizontal, LuQrCode, LuUtensilsCrossed } from 'react-icons/lu';
import useViewportInfo from '../../hooks/useViewportInfo';

export type MobileTab = 'today' | 'menu' | 'aiMenuManager' | 'share' | 'more';

interface MobileNavigationProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    feedbackCount?: number;
    onMoreTabLongPress?: () => void;
    visibleTabs?: MobileTab[];
}

const tabs = [
    { key: 'today' as MobileTab, title: 'Today', icon: <LuCalendarCheck size={20} /> },
    { key: 'menu' as MobileTab, title: 'Menu', icon: <LuUtensilsCrossed size={20} /> },
    { key: 'aiMenuManager' as MobileTab, title: 'Menu help', icon: <LuMessageCircle size={20} /> },
    { key: 'share' as MobileTab, title: 'Share', icon: <LuQrCode size={20} /> },
    { key: 'more' as MobileTab, title: 'More', icon: <LuMoreHorizontal size={20} /> },
];

export default function MobileNavigation({ activeTab, onTabChange, feedbackCount, onMoreTabLongPress, visibleTabs }: MobileNavigationProps) {
    const { token } = theme.useToken();
    const { isCompactHandheld } = useViewportInfo();
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const suppressNextMoreClickRef = useRef(false);

    const clearLongPressTimer = () => {
        if (!longPressTimerRef.current) return;
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    };

    const startMoreLongPress = () => {
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
            suppressNextMoreClickRef.current = true;
            onMoreTabLongPress?.();
        }, 700);
    };

    useEffect(() => {
        return () => {
            clearLongPressTimer();
        };
    }, []);

    return (
        <div
            aria-label="Primary mobile navigation"
            role="navigation"
            style={{
                backgroundColor: token.colorBgElevated,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)',
                bottom: 0,
                left: 0,
                paddingBottom: 'env(safe-area-inset-bottom)',
                position: 'fixed',
                right: 0,
                zIndex: 50,
            }}
        >
            <Flex
                align="center"
                gap={0}
                justify="space-between"
                style={{
                    padding: isCompactHandheld ? '2px 6px 6px' : '4px 8px 8px',
                    width: '100%',
                }}
            >
                {tabs.filter((tab) => !visibleTabs || visibleTabs.includes(tab.key)).map((tab) => {
                    const isActive = activeTab === tab.key;
                    const isMoreTab = tab.key === 'more';
                    const tabButton = (
                        <Button
                            aria-label={tab.title}
                            aria-pressed={isActive}
                            key={tab.key}
                            fill="none"
                            onClick={() => {
                                if (isMoreTab && suppressNextMoreClickRef.current) {
                                    suppressNextMoreClickRef.current = false;
                                    return;
                                }
                                onTabChange(tab.key);
                            }}
                            style={{
                                borderRadius: 16,
                                color: isActive ? token.colorPrimary : token.colorTextSecondary,
                                flex: 1,
                                height: 'auto',
                                minWidth: 0,
                                paddingBlock: isCompactHandheld ? 4 : 6,
                                paddingInline: isCompactHandheld ? 2 : 4,
                                width: '100%',
                            }}
                        >
                            <Flex
                                align="center"
                                gap={4}
                                style={{
                                    backgroundColor: isActive ? token.colorPrimaryBg : 'transparent',
                                    borderRadius: 14,
                                    minWidth: 0,
                                    width: '100%',
                                    paddingBlock: isCompactHandheld ? 5 : 6,
                                    paddingInline: isCompactHandheld ? 4 : 6,
                                }}
                                vertical
                            >
                                <Flex align="center" justify="center" style={{ color: 'inherit', lineHeight: 1 }}>
                                    {tab.icon}
                                </Flex>
                                <Text
                                    style={{
                                        color: 'inherit',
                                        fontSize: isCompactHandheld ? 11 : 12,
                                        fontWeight: isActive ? 600 : 500,
                                        lineHeight: 1.1,
                                    }}
                                >
                                    {tab.title}
                                </Text>
                            </Flex>
                        </Button>
                    );

                    if (!isMoreTab) {
                        return tabButton;
                    }

                    return (
                        <div
                            key={tab.key}
                            onMouseDown={startMoreLongPress}
                            onMouseLeave={clearLongPressTimer}
                            onMouseUp={clearLongPressTimer}
                            onTouchCancel={clearLongPressTimer}
                            onTouchEnd={clearLongPressTimer}
                            onTouchStart={startMoreLongPress}
                            style={{ display: 'flex', flex: 1, minWidth: 0 }}
                        >
                            {tabButton}
                        </div>
                    );
                })}
            </Flex>
        </div>
    );
}
