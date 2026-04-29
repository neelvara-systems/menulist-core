'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    getOBPDashboardData,
    type OBPActionBreakdown,
} from '@database/ownerDashboard';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useContext } from 'react';
import { LuExternalLink, LuGlobe, LuMapPin, LuMessageSquare, LuPhone, LuTrendingUp } from 'react-icons/lu';
import useSWR from 'swr';
import { Card, DotLoading, Flex, Tag, Text, Title } from '../../antd';

function renderActionRows(actions: OBPActionBreakdown) {
    const rows = [
        { key: 'call', label: 'Call', value: actions.call, icon: <LuPhone color="#16a34a" size={14} /> },
        { key: 'whatsapp', label: 'WhatsApp', value: actions.whatsapp, icon: <LuMessageSquare color="#16a34a" size={14} /> },
        { key: 'directions', label: 'Directions', value: actions.directions, icon: <LuMapPin color="#f59e0b" size={14} /> },
        { key: 'reserve', label: 'Reserve', value: actions.reserve, icon: <LuMessageSquare color="#7c3aed" size={14} /> },
        { key: 'order', label: 'Order', value: actions.order, icon: <LuExternalLink color="#1d4ed8" size={14} /> },
    ].filter((row) => row.value > 0);

    if (rows.length === 0) return null;

    return (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                Action breakdown
            </Text>
            <Flex gap={6} vertical>
                {rows.map((row) => (
                    <Flex key={row.key} align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            {row.icon}
                            <Text type="secondary" style={{ fontSize: 12 }}>{row.label}</Text>
                        </Flex>
                        <Text style={{ fontSize: 12 }}>{row.value}</Text>
                    </Flex>
                ))}
            </Flex>
        </div>
    );
}

export default function MobileOBPMetricsCard() {
    const { storeDetails } = useContext(PlatformGlobalDataContext);

    const tId = storeDetails?.tenantId ? String(storeDetails.tenantId) : null;
    const sId = storeDetails?.storeId ? String(storeDetails.storeId) : null;
    const canFetch = FEATURE_FLAGS.ENABLE_OBP && !!tId && !!sId;

    const { data, isLoading } = useSWR(
        canFetch ? ['obpDashboard', tId, sId, 'mobile'] : null,
        () => getOBPDashboardData(tId!, sId!),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            revalidateOnMount: true,
            dedupingInterval: 3600000,
            errorRetryCount: 1,
        },
    );

    if (!FEATURE_FLAGS.ENABLE_OBP) return null;

    if (isLoading && !data) {
        return (
            <Card size="small" title={<Text strong>Official Business Page</Text>}>
                <Flex align="center" justify="center" style={{ padding: 16 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Card>
        );
    }

    const overview = data?.overview;
    const overall = data?.overall;

    if (!overview && !overall) return null;
    if (overview?.status === 'no_data' && !overall) return null;

    const statusTag = overview?.status === 'working'
        ? <Tag color="success">Active</Tag>
        : overview?.status === 'low_activity'
            ? <Tag color="warning">Low activity</Tag>
            : <Tag>No data</Tag>;

    return (
        <Card
            size="small"
            title={(
                <Flex align="center" justify="space-between">
                    <Flex align="center" gap={8}>
                        <LuGlobe color="#1d4ed8" size={16} />
                        <Text strong>Official Business Page</Text>
                    </Flex>
                    {statusTag}
                </Flex>
            )}
        >
            {overview?.wtd ? (
                <>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
                        This week
                    </Text>
                    <Flex gap={12} wrap>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuGlobe color="#1d4ed8" size={14} />
                                <Text type="secondary">Page Views</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{overview.wtd.views.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuExternalLink color="#0ea5e9" size={14} />
                                <Text type="secondary">View Menu Clicks</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{overview.wtd.menuClicks.toLocaleString()}</Title>
                        </Card>
                        <Card size="small" style={{ flex: '1 1 45%' }}>
                            <Flex align="center" gap={8}>
                                <LuTrendingUp color="#16a34a" size={14} />
                                <Text type="secondary">Actions</Text>
                            </Flex>
                            <Title level={3} style={{ margin: 0 }}>{overview.wtd.actionClicks.toLocaleString()}</Title>
                        </Card>
                    </Flex>

                    {renderActionRows(overview.wtd.actions)}
                </>
            ) : null}

            {overview?.mtd ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                        {overview.mtd.monthName}
                    </Text>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {`${overview.mtd.views.toLocaleString()} views, ${overview.mtd.menuClicks.toLocaleString()} View Menu clicks, ${overview.mtd.actionClicks.toLocaleString()} actions`}
                    </Text>
                </div>
            ) : null}

            {overall ? (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                    <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                        {`Lifetime: ${overall.lifetimeViews.toLocaleString()} views, ${overall.lifetimeMenuClicks.toLocaleString()} View Menu clicks, ${overall.lifetimeActionClicks.toLocaleString()} actions`}
                    </Text>
                    {overall.firstDataDate ? (
                        <Text type="secondary" style={{ display: 'block', fontSize: 12, marginTop: 4 }}>
                            {`Since ${overall.firstDataDate}`}
                        </Text>
                    ) : null}
                </div>
            ) : null}
        </Card>
    );
}
