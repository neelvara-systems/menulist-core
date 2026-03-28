/**
 * View Mode Tabs v2
 * 
 * Tab navigation for switching between Overview, Daily, Weekly, Monthly views.
 * Overview is visually PRIMARY (default selected).
 * Daily, Weekly, Monthly are SECONDARY.
 */

import { AppstoreOutlined, BarChartOutlined, CalendarOutlined, LineChartOutlined } from '@ant-design/icons';
import { OwnerDashboardViewMode, VIEW_MODE_CONFIG } from '@template/main-app/projects/types';
import { Segmented } from 'antd';
import React from 'react';
import styles from './OwnerDashboard.module.scss';

interface ViewModeTabsProps {
    activeMode: OwnerDashboardViewMode;
    onModeChange: (mode: OwnerDashboardViewMode) => void;
    hasOverview?: boolean;
    hasDaily?: boolean;
    hasWeekly?: boolean;
    hasMonthly?: boolean;
}

const ViewModeTabs: React.FC<ViewModeTabsProps> = ({
    activeMode,
    onModeChange,
    hasOverview = true,
    hasDaily = true,
    hasWeekly = true,
    hasMonthly = true,
}) => {
    const options = [
        {
            label: (
                <span className={activeMode === 'overview' ? styles.activeTab : styles.primaryTab}>
                    <AppstoreOutlined /> {VIEW_MODE_CONFIG.overview.label}
                </span>
            ),
            value: 'overview',
            disabled: !hasOverview,
        },
        {
            label: (
                <span className={activeMode === 'daily' ? styles.activeTab : styles.secondaryTab}>
                    <CalendarOutlined /> {VIEW_MODE_CONFIG.daily.label}
                </span>
            ),
            value: 'daily',
            disabled: !hasDaily,
        },
        {
            label: (
                <span className={activeMode === 'weekly' ? styles.activeTab : styles.secondaryTab}>
                    <BarChartOutlined /> {VIEW_MODE_CONFIG.weekly.label}
                </span>
            ),
            value: 'weekly',
            disabled: !hasWeekly,
        },
        {
            label: (
                <span className={activeMode === 'monthly' ? styles.activeTab : styles.secondaryTab}>
                    <LineChartOutlined /> {VIEW_MODE_CONFIG.monthly.label}
                </span>
            ),
            value: 'monthly',
            disabled: !hasMonthly,
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
