/**
 * View Mode Tabs v2
 * 
 * Tab navigation for switching between Overview, Daily, Weekly, Monthly views.
 * Overview is visually PRIMARY (default selected).
 * Daily, Weekly, Monthly are SECONDARY.
 */

import { OwnerDashboardViewMode, VIEW_MODE_CONFIG } from '@template/main-app/projects/types';
import { Segmented } from 'antd';
import React from 'react';
import { LuBarChart3, LuCalendar, LuClock, LuLayoutDashboard, LuLineChart, LuTrophy } from 'react-icons/lu';
import styles from './OwnerDashboard.module.scss';

interface ViewModeTabsProps {
    activeMode: OwnerDashboardViewMode;
    onModeChange: (mode: OwnerDashboardViewMode) => void;
    hasToday?: boolean;
    hasOverview?: boolean;
    hasDaily?: boolean;
    hasWeekly?: boolean;
    hasMonthly?: boolean;
    hasOverall?: boolean;
}

const ViewModeTabs: React.FC<ViewModeTabsProps> = ({
    activeMode,
    onModeChange,
    hasToday = true,
    hasOverview = true,
    hasDaily = true,
    hasWeekly = true,
    hasMonthly = true,
    hasOverall = true,
}) => {
    const options = [
        {
            label: (
                <span className={activeMode === 'today' ? styles.activeTab : styles.primaryTab}>
                    <LuClock size={15} /> {VIEW_MODE_CONFIG.today.label}
                </span>
            ),
            value: 'today',
            disabled: !hasToday,
        },
        {
            label: (
                <span className={activeMode === 'overview' ? styles.activeTab : styles.secondaryTab}>
                    <LuLayoutDashboard size={15} /> {VIEW_MODE_CONFIG.overview.label}
                </span>
            ),
            value: 'overview',
            disabled: !hasOverview,
        },
        {
            label: (
                <span className={activeMode === 'daily' ? styles.activeTab : styles.secondaryTab}>
                    <LuCalendar size={15} /> {VIEW_MODE_CONFIG.daily.label}
                </span>
            ),
            value: 'daily',
            disabled: !hasDaily,
        },
        {
            label: (
                <span className={activeMode === 'weekly' ? styles.activeTab : styles.secondaryTab}>
                    <LuBarChart3 size={15} /> {VIEW_MODE_CONFIG.weekly.label}
                </span>
            ),
            value: 'weekly',
            disabled: !hasWeekly,
        },
        {
            label: (
                <span className={activeMode === 'monthly' ? styles.activeTab : styles.secondaryTab}>
                    <LuLineChart size={15} /> {VIEW_MODE_CONFIG.monthly.label}
                </span>
            ),
            value: 'monthly',
            disabled: !hasMonthly,
        },
        {
            label: (
                <span className={activeMode === 'overall' ? styles.activeTab : styles.secondaryTab}>
                    <LuTrophy size={15} /> {VIEW_MODE_CONFIG.overall.label}
                </span>
            ),
            value: 'overall',
            disabled: !hasOverall,
        },
    ];

    return (
        <div className={styles.viewModeTabs}>
            <Segmented
                options={options}
                value={activeMode}
                onChange={(value) => onModeChange(value as OwnerDashboardViewMode)}
                size="large"
                block
            />
        </div>
    );
};

export default ViewModeTabs;
