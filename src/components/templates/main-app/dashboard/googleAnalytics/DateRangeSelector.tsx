'use client';

import { DatePicker, Radio, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import React, { useContext } from 'react';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { updateStore } from '@database/stores';

const { RangePicker } = DatePicker;

interface DateRange {
    startDate: string;
    endDate: string;
}

interface DateRangeSelectorProps {
    value: DateRange;
    onChange: (range: DateRange) => void;
}

const DateRangeSelector: React.FC<DateRangeSelectorProps> = ({ value, onChange }) => {
    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext);
    const saveDashboardPreferences = async (dateRange: string) => {
        if (storeDetails?.storeId) {
            const currentPrefs = storeDetails.analytics?.dashboardPreferences || {};
            await updateStore({
                storeId: storeDetails.storeId,
                analytics: {
                    ...storeDetails.analytics,
                    dashboardPreferences: {
                        ...currentPrefs,
                        dateRange
                    }
                }
            });
        }
    };

    const handleQuickSelect = (range: string) => {
        switch (range) {
            case 'today':
                saveDashboardPreferences(range);
                onChange({
                    startDate: 'today',
                    endDate: 'today'
                });
                break;
            case '7days':
                saveDashboardPreferences(range);
                onChange({
                    startDate: '7daysAgo',
                    endDate: 'today'
                });
                break;
            case '30days':
                saveDashboardPreferences(range);
                onChange({
                    startDate: '30daysAgo',
                    endDate: 'today'
                });
                break;
            case '90days':
                saveDashboardPreferences(range);
                onChange({
                    startDate: '90daysAgo',
                    endDate: 'today'
                });
                break;
        }
    };

    const handleCustomRange = (dates: [Dayjs | null, Dayjs | null] | null) => {
        if (dates && dates[0] && dates[1]) {
            onChange({
                startDate: dates[0].format('YYYY-MM-DD'),
                endDate: dates[1].format('YYYY-MM-DD')
            });
        }
    };

    return (
        <Space size="middle">
            <Radio.Group defaultValue="7days" onChange={(e) => handleQuickSelect(e.target.value)}>
                <Radio.Button value="today">Today</Radio.Button>
                <Radio.Button value="7days">Last 7 Days</Radio.Button>
                <Radio.Button value="30days">Last 30 Days</Radio.Button>
                <Radio.Button value="90days">Last 90 Days</Radio.Button>
            </Radio.Group>

            <RangePicker
                onChange={handleCustomRange}
                format="YYYY-MM-DD"
                allowClear={false}
                disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
        </Space>
    );
};

export default DateRangeSelector;
