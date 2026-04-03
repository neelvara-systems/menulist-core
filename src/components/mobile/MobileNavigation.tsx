'use client'

import { Badge, Button, Card, Flex, Text } from './antd';
import { LuClock, LuMessageSquare, LuMoreHorizontal, LuUtensilsCrossed } from 'react-icons/lu';

export type MobileTab = 'menu' | 'hours' | 'feedback' | 'more';

interface MobileNavigationProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    feedbackCount?: number;
    isDarkMode?: boolean;
}

const tabs = [
    { key: 'menu' as MobileTab, title: 'Menu', icon: <LuUtensilsCrossed size={20} /> },
    { key: 'hours' as MobileTab, title: 'Hours', icon: <LuClock size={20} /> },
    { key: 'feedback' as MobileTab, title: 'Feedback', icon: <LuMessageSquare size={20} /> },
    { key: 'more' as MobileTab, title: 'More', icon: <LuMoreHorizontal size={20} /> },
];

export default function MobileNavigation({ activeTab, onTabChange, feedbackCount, isDarkMode }: MobileNavigationProps) {
    return (
        <Card
            style={{
                backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                borderRadius: 0,
                borderTop: `1px solid ${isDarkMode ? '#1e293b' : '#e2e8f0'}`,
                bottom: 0,
                left: 0,
                margin: 0,
                position: 'fixed',
                right: 0,
                zIndex: 50,
            }}
        >
            <Flex align="center" justify="space-around">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    const iconNode = tab.key === 'feedback' && feedbackCount
                        ? <Badge count={feedbackCount} size="small">{tab.icon}</Badge>
                        : tab.icon;

                    return (
                        <Button
                            key={tab.key}
                            fill="none"
                            onClick={() => onTabChange(tab.key)}
                            style={{
                                color: isActive ? '#1677ff' : (isDarkMode ? '#e2e8f0' : '#475569'),
                                height: 56,
                                minWidth: 72,
                            }}
                        >
                            <Flex align="center" gap={4} vertical>
                                {iconNode}
                                <Text style={{ color: 'inherit', fontSize: 12 }}>{tab.title}</Text>
                            </Flex>
                        </Button>
                    );
                })}
            </Flex>
        </Card>
    );
}
