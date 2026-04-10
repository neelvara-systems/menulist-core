'use client'

import { theme } from 'antd';
import { Badge, Button, Card, Flex, Text } from './antd';
import { LuCalendarCheck, LuMoreHorizontal, LuQrCode, LuUtensilsCrossed } from 'react-icons/lu';

export type MobileTab = 'today' | 'menu' | 'share' | 'more';

interface MobileNavigationProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    feedbackCount?: number;
}

const tabs = [
    { key: 'today' as MobileTab, title: 'Today', icon: <LuCalendarCheck size={20} /> },
    { key: 'menu' as MobileTab, title: 'Menu', icon: <LuUtensilsCrossed size={20} /> },
    { key: 'share' as MobileTab, title: 'Share', icon: <LuQrCode size={20} /> },
    { key: 'more' as MobileTab, title: 'More', icon: <LuMoreHorizontal size={20} /> },
];

export default function MobileNavigation({ activeTab, onTabChange, feedbackCount }: MobileNavigationProps) {
    const { token } = theme.useToken();

    return (
        <Card
            style={{
                backgroundColor: token.colorBgElevated,
                borderRadius: 0,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                boxShadow: '0 -8px 24px rgba(0, 0, 0, 0.08)',
                bottom: 0,
                left: 0,
                margin: 0,
                paddingBottom: 'env(safe-area-inset-bottom)',
                position: 'fixed',
                right: 0,
                zIndex: 50,
            }}
        >
            <Flex align="center" gap={0} justify="space-between" style={{ paddingBlock: 4, width: '100%' }}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const iconNode = tab.key === 'more' && feedbackCount
                        ? <Badge count={feedbackCount} size="small">{tab.icon}</Badge>
                        : tab.icon;

                    return (
                        <Button
                            key={tab.key}
                            fill="none"
                            onClick={() => onTabChange(tab.key)}
                            style={{
                                borderRadius: 16,
                                color: isActive ? token.colorPrimary : token.colorTextSecondary,
                                flex: 1,
                                height: 'auto',
                                minWidth: 0,
                                paddingBlock: 6,
                                paddingInline: 4,
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
                                    {iconNode}
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
                })}
            </Flex>
        </Card>
    );
}
