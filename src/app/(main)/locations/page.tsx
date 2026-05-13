'use client';

/**
 * Chain Control Panel — HQ Command Center
 * Visible only when isMaster && storesList.length > 1
 * @see __docs__/multi-outlet-consistency/store-onboarding-flow_impl.md §17
 */

import { FEATURE_FLAGS } from '@config/features';
import AddOutletModal from '@organisms/AddOutletModal';
import OutletPolicyEditor from '@organisms/OutletPolicyEditor';
import OutletRenameModal from '@organisms/OutletRenameModal';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { DEFAULT_OUTLET_POLICY } from '@type/multiOutlet.types';
import { Badge, Button, Card, Empty, message, Space, Table, Tag, Typography } from 'antd';
import { useContext, useState } from 'react';
import { LuMapPin, LuPlusCircle, LuStar } from 'react-icons/lu';

const { Title, Text } = Typography;

export default function LocationsPage() {
    const {
        tenantDetails,
        storeDetails,
        userPermissions,
        isMasterUser,
        activeSubscription,
        activeStoreContext,
        setActiveStoreContext,
    } = useContext(PlatformGlobalDataContext);

    const [addOutletOpen, setAddOutletOpen] = useState(false);
    // T2-N-01: outlet rename modal state.
    const [renameTarget, setRenameTarget] = useState<any | null>(null);

    if (!FEATURE_FLAGS.ENABLE_CHAIN_CONTROL_PANEL || !isMasterUser || !userPermissions?.canManageOutlets) {
        return <Empty description="Chain Control Panel is not available" />;
    }

    const storesList = tenantDetails?.storesList || [];
    const outletCount = storesList.filter((s) => !s.isMaster).length;
    const activeCount = storesList.filter((s: any) => s.active !== false).length;

    // Billing summary
    const amount = activeSubscription?.amount || 0;
    const currency = activeSubscription?.currency || 'INR';
    const totalCost = amount * activeCount;

    const handleSwitchStore = async (targetStoreId: number) => {
        if (targetStoreId === storeDetails?.storeId) {
            setActiveStoreContext(null);
            return;
        }

        try {
            const res = await fetch('/api/auth/switch-store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId }),
            });
            if (!res.ok) {
                message.error('Store switch failed');
                return;
            }
            setActiveStoreContext(targetStoreId);
        } catch {
            message.error('Store switch failed');
        }
    };
    const columns = [
        {
            title: 'Store',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: any) => (
                <Space>
                    {record.isMaster ? <LuStar /> : <LuMapPin />}
                    <Text strong={record.isMaster}>{name || `Store ${record.storeId}`}</Text>
                    {record.isMaster && <Tag color="gold">HQ</Tag>}
                    {record.storeId === (activeStoreContext || storeDetails?.storeId) && <Tag color="blue">Current</Tag>}
                </Space>
            ),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_: any, record: any) => (
                <Badge status={record.active !== false ? 'success' : 'default'} text={record.active !== false ? 'Active' : 'Inactive'} />
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: any) => {
                if (record.isMaster) return <Text type="secondary">—</Text>;
                return (
                    <Space size="small">
                        <Button
                            size="small"
                            onClick={() => void handleSwitchStore(record.storeId)}
                        >
                            View
                        </Button>
                        {/*
                         * T2-N-01 / G-07: owner-facing outlet rename. The
                         * server endpoint handles the previousOutletSlugs[]
                         * chain; the modal just collects the new values and
                         * surfaces the 12-month redirect guarantee inline.
                         */}
                        <Button
                            size="small"
                            onClick={() => setRenameTarget(record)}
                        >
                            Rename URL
                        </Button>
                    </Space>
                );
            },
        },
    ];

    return (
        <div style={{ padding: 24, maxWidth: 900 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={3} style={{ margin: 0 }}>
                        <LuMapPin style={{ marginRight: 8 }} />
                        Locations
                    </Title>
                    {FEATURE_FLAGS.ENABLE_OUTLET_CREATION && userPermissions?.canManageOutlets && (
                        <Button
                            type="primary"
                            icon={<LuPlusCircle />}
                            onClick={() => setAddOutletOpen(true)}
                        >
                            Add Outlet
                        </Button>
                    )}
                </div>

                {/* Billing Summary */}
                <Card size="small" title="Billing Summary">
                    <Space direction="vertical">
                        <Text>Active Outlets: <Text strong>{outletCount}</Text></Text>
                        <Text>Cost per Store: <Text strong>{currency} {amount}/month</Text></Text>
                        <Text>Total Chain Cost: <Text strong>{currency} {totalCost}/month</Text> (Master + {outletCount} outlets)</Text>
                        {activeSubscription?.cycleEndDate && (
                            <Text type="secondary">
                                Next Invoice: {activeSubscription.cycleEndDate.toDate().toLocaleDateString()}
                            </Text>
                        )}
                    </Space>
                </Card>

                {/* Outlet Policy Editor */}
                {outletCount > 0 && (
                    <OutletPolicyEditor
                        storeId={storeDetails?.storeId}
                        currentPolicy={storeDetails?.outletPolicy || DEFAULT_OUTLET_POLICY}
                    />
                )}

                {/* Outlets Table */}
                <Card size="small" title="Outlets">
                    <Table
                        dataSource={storesList.map((s) => ({ ...s, key: s.storeId }))}
                        columns={columns}
                        pagination={storesList.length > 20 ? { pageSize: 20 } : false}
                        size="small"
                    />
                </Card>
            </Space>

            <AddOutletModal
                open={addOutletOpen}
                onClose={() => setAddOutletOpen(false)}
                subscription={activeSubscription}
            />

            {/*
             * T2-N-01 / G-07 PUBLIC-ROUTING-DOCTRINE: outlet slug rename modal.
             * Surfaces the `/api/outlets/rename` endpoint with the doctrinal
             * 12-month redirect warning inline. Closes when the rename
             * succeeds; onRenamed hook is available if future pages need to
             * react (e.g., refresh cached outlet lists).
             */}
            <OutletRenameModal
                open={Boolean(renameTarget)}
                outletStoreId={renameTarget?.storeId}
                currentOutletSlug={renameTarget?.outletSlug}
                currentOutletName={renameTarget?.name}
                onClose={() => setRenameTarget(null)}
            />
        </div>
    );
}
