'use client'

import { TabBar } from 'antd-mobile';
import { LuUtensilsCrossed, LuClock, LuMessageSquare, LuMoreHorizontal } from 'react-icons/lu';

export type MobileTab = 'menu' | 'hours' | 'feedback' | 'more';

interface MobileNavigationProps {
    activeTab: MobileTab;
    onTabChange: (tab: MobileTab) => void;
    feedbackCount?: number;
}

const tabs = [
    { key: 'menu' as MobileTab, title: 'Menu', icon: <LuUtensilsCrossed size={22} /> },
    { key: 'hours' as MobileTab, title: 'Hours', icon: <LuClock size={22} /> },
    { key: 'feedback' as MobileTab, title: 'Feedback', icon: <LuMessageSquare size={22} /> },
    { key: 'more' as MobileTab, title: 'More', icon: <LuMoreHorizontal size={22} /> },
];

export default function MobileNavigation({ activeTab, onTabChange, feedbackCount }: MobileNavigationProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1a1a1a] border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)]">
            <TabBar
                activeKey={activeTab}
                onChange={(key) => onTabChange(key as MobileTab)}
                style={{ '--adm-color-primary': 'var(--ant-color-primary, #1677ff)' } as React.CSSProperties}
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
