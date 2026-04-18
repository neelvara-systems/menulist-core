'use client'

import { theme } from 'antd';
import { useEffect, useRef } from 'react';
import { Button, Flex, Text } from './antd';
import { LuCalendarCheck, LuMoreHorizontal, LuQrCode, LuUtensilsCrossed } from 'react-icons/lu';

export type MobileTab = 'today' | 'menu' | 'share' | 'more';

interface MobileNavigationProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    feedbackCount?: number;
    onMoreTabLongPress?: () => void;
}

const tabs = [
    { key: 'today' as MobileTab, title: 'Today', icon: <LuCalendarCheck size={20} /> },
    { key: 'menu' as MobileTab, title: 'Menu', icon: <LuUtensilsCrossed size={20} /> },
    { key: 'share' as MobileTab, title: 'Share', icon: <LuQrCode size={20} /> },
    { key: 'more' as MobileTab, title: 'More', icon: <LuMoreHorizontal size={20} /> },
];

export default function MobileNavigation({ activeTab, onTabChange, feedbackCount, onMoreTabLongPress }: MobileNavigationProps) {
    const { token } = theme.useToken();
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
            <Flex align="center" gap={0} justify="space-between" style={{ padding: '4px 8px 8px', width: '100%' }}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const isMoreTab = tab.key === 'more';
                    const tabButton = (
                        <Button
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
                                paddingBlock: 6,
                                paddingInline: 4,
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
                                    paddingBlock: 6,
                                    paddingInline: 6,
                                }}
                                vertical
                            >
                                <Flex align="center" justify="center" style={{ color: 'inherit', lineHeight: 1 }}>
                                    {tab.icon}
                                </Flex>
                                <Text
                                    style={{
                                        color: 'inherit',
                                        fontSize: 12,
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
