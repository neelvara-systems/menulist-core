'use client'

import { TabBar } from 'antd-mobile';
import { LuClock, LuMessageSquare, LuMoreHorizontal, LuUtensilsCrossed } from 'react-icons/lu';

export type MobileTab = 'menu' | 'hours' | 'feedback' | 'more';

interface MobileNavigationProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    feedbackCount?: number;
    isDarkMode?: boolean;
}

const tabs = [
    { key: 'menu' as MobileTab, title: 'Menu', icon: <LuUtensilsCrossed size={22} /> },
    { key: 'hours' as MobileTab, title: 'Hours', icon: <LuClock size={22} /> },
    { key: 'feedback' as MobileTab, title: 'Feedback', icon: <LuMessageSquare size={22} /> },
    { key: 'more' as MobileTab, title: 'More', icon: <LuMoreHorizontal size={22} /> },
];

export default function MobileNavigation({ activeTab, onTabChange, feedbackCount, isDarkMode }: MobileNavigationProps) {
    return (
        <div
            className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
            style={{
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                borderTop: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`
            }}
        >
            <TabBar
                activeKey={activeTab}
                onChange={(key) => onTabChange(key as MobileTab)}
                style={{
                    '--adm-color-primary': '#2563eb',
                    '--adm-color-background': isDarkMode ? '#1e293b' : '#ffffff',
                    '--adm-color-text': isDarkMode ? '#f1f5f9' : '#0f172a',
                } as React.CSSProperties}
            >
                {tabs.map((tab) => (
                    <TabBar.Item
                        key={tab.key}
                        icon={tab.icon}
                        title={tab.title}
                        badge={tab.key === 'feedback' && feedbackCount ? feedbackCount : undefined}
                    />
                ))}
            </TabBar>
        </div>
    );
}
