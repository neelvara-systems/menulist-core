'use client';

import { MENULIST_PLATFORM_STORE_ID } from '@constant/user';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { Alert, Card, Space, Spin, Typography } from 'antd';
import { useContext, useEffect, useState } from 'react';
import DateRangeSelector from './DateRangeSelector';
import LocationInsights from './LocationInsights';
import MenuPerformance from './MenuPerformance';
import QuickStats from './QuickStats';
import TrendAnalysis from './TrendAnalysis';

const { Title } = Typography;

const GoogleAnalyticsDashboard = () => {

    const { storeDetails } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const [loading, setLoading] = useState(true);
    const [hasAnalytics, setHasAnalytics] = useState(false);
    const [dateRange, setDateRange] = useState(storeDetails?.analytics?.dashboardPreferences?.dateRange ? {
        startDate: storeDetails.analytics.dashboardPreferences.dateRange,
        endDate: 'today'
    } : {
        startDate: '7daysAgo',
        endDate: 'today'
    });
    const propertyId = storeDetails?.analytics?.googleAnalyticsId?.trim();

    useEffect(() => {
        if (storeDetails?.storeId || storeDetails?.storeId == MENULIST_PLATFORM_STORE_ID) {
            setHasAnalytics(!!storeDetails?.analytics?.googleAnalyticsId);
            setLoading(false);
        }
    }, [storeDetails]);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px' }}>
                <Spin size="large" />
            </div>
        );
    }

    if (!hasAnalytics || !propertyId) {
        return (
            <Alert
                message="Analytics Not Configured"
                description={
                    <Space direction="vertical">
                        <span>You haven&apos;t set up analytics for your restaurant yet.</span>
                        <span>Go to Settings → Analytics to get started!</span>
                    </Space>
                }
                type="info"
                showIcon
            />
        );
    }

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card>
                <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>Analytics Dashboard</Title>
                        <DateRangeSelector value={dateRange} onChange={setDateRange} />
                    </div>
                </Space>
            </Card>

            <QuickStats propertyId={propertyId} dateRange={dateRange} />

            <Space direction="horizontal" size="large" style={{ width: '100%' }}>
                <Card style={{ flex: 2 }}>
                    <TrendAnalysis propertyId={propertyId} dateRange={dateRange} />
                </Card>
                <Card style={{ flex: 1 }}>
                    <LocationInsights propertyId={propertyId} dateRange={dateRange} />
                </Card>
            </Space>

            <MenuPerformance propertyId={propertyId} dateRange={dateRange} />
        </Space>
    );
};

export default GoogleAnalyticsDashboard;
