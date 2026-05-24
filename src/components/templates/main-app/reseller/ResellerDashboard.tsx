'use client';

import { calculateOfflineLocationTopup } from "@config/resellerPricing";
import { useResellerDashboard } from "@hook/useResellerDashboard";
import { ResellerTransaction } from "@type/reseller";
import { Badge, Button, Card, Col, Empty, Flex, InputNumber, message, Modal, Row, Spin, Statistic, Table, Tag, Typography, theme } from "antd";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuCopy, LuExternalLink, LuPlus, LuRefreshCw, LuUsers } from "react-icons/lu";

const { Title, Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
    active: 'green',
    pending_payment: 'gold',
    expired: 'red',
    cancelled: 'default',
};

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    pending_payment: 'Pending Payment',
    expired: 'Expired',
    cancelled: 'Cancelled',
};

function formatMoney(paise?: number) {
    return `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;
}

function formatDate(value: any) {
    if (!value) return 'Auto-renew';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Auto-renew';
    return date.toLocaleDateString();
}

function ResellerDashboard() {
    const { token } = theme.useToken();
    const { data: session } = useSession();
    const router = useRouter();
    const resellerId = (session as any)?.user?.id || '';
    const resellerEmail = (session as any)?.user?.email || '';
    const isPlatform = (session as any)?.platformRole === 'PLATFORM' || (session?.user as any)?.platformRole === 'PLATFORM';

    const { profile, monthlySummary, transactions, stats, isLoading, refresh } = useResellerDashboard(resellerId, isPlatform, resellerEmail);
    const [selectedClient, setSelectedClient] = useState<ResellerTransaction | null>(null);
    const [locationCount, setLocationCount] = useState(1);
    const [addingLocation, setAddingLocation] = useState(false);
    const locationTopup = selectedClient
        ? (() => {
            try {
                return calculateOfflineLocationTopup({
                    locationCount,
                    pricingTier: selectedClient.pricingTier,
                    validUntil: selectedClient.validUntil,
                });
            } catch {
                return null;
            }
        })()
        : null;

    const handleAddLocationCapacity = async () => {
        if (!selectedClient) return;
        setAddingLocation(true);
        try {
            const response = await fetch('/api/reseller/add-location-capacity', {
                body: JSON.stringify({
                    locationCount,
                    storeId: selectedClient.storeId,
                    tenantId: selectedClient.tenantId,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to add location');
            message.success(`Location capacity added. Collect ${formatMoney(data.amountExpected)}.`);
            setSelectedClient(null);
            setLocationCount(1);
            refresh();
        } catch (error: any) {
            message.error(error?.message || 'Failed to add location');
        } finally {
            setAddingLocation(false);
        }
    };

    const copyPaymentLink = async (link?: string | null) => {
        if (!link) return;
        await navigator.clipboard.writeText(link);
        message.success('Payment link copied.');
    };

    const openPaymentLink = (link?: string | null) => {
        if (!link) return;
        window.open(link, '_blank', 'noopener,noreferrer');
    };

    if (isLoading) {
        return (
            <Flex justify="center" align="center" style={{ minHeight: 400 }}>
                <Spin size="large" />
            </Flex>
        );
    }

    const columns = [
        {
            title: 'Business',
            dataIndex: 'storeName',
            key: 'storeName',
            render: (name: string) => <Text strong>{name}</Text>,
        },
        {
            title: 'Tier',
            dataIndex: 'pricingTier',
            key: 'pricingTier',
            render: (tier: string) => {
                const labels: Record<string, string> = {
                    FOUNDER_400: 'Founder A',
                    FOUNDER_500: 'Founder B',
                    STANDARD: 'Standard',
                };
                return <Tag>{labels[tier] || tier}</Tag>;
            },
        },
        {
            title: 'Mode',
            dataIndex: 'paymentMode',
            key: 'paymentMode',
            render: (mode: string) => (
                <Tag color={mode === 'online' ? 'blue' : 'purple'}>
                    {mode === 'online' ? 'Online' : 'Offline'}
                </Tag>
            ),
        },
        {
            title: 'Locations',
            dataIndex: 'subscriptionQuantity',
            key: 'subscriptionQuantity',
            render: (_: number, record: ResellerTransaction) => (
                <Text>{record.subscriptionQuantity || record.locationCount || 1}</Text>
            ),
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => (
                <Badge
                    status={status === 'active' ? 'success' : status === 'pending_payment' ? 'warning' : status === 'expired' ? 'error' : 'default'}
                    text={STATUS_LABELS[status] || status}
                />
            ),
        },
        {
            title: 'Expires',
            dataIndex: 'validUntil',
            key: 'validUntil',
            render: (val: any) => {
                if (!val) return <Text type="secondary">Auto-renew</Text>;
                const date = val?.toDate ? val.toDate() : new Date(val);
                const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;
                return (
                    <Text type={daysLeft <= 0 ? 'danger' : isExpiringSoon ? 'warning' : undefined}>
                        {formatDate(val)}
                        {daysLeft > 0 && ` (${daysLeft}d)`}
                    </Text>
                );
            },
        },
        {
            title: 'Created',
            dataIndex: 'createdOn',
            key: 'createdOn',
            render: (val: any) => {
                if (!val) return '-';
                const date = val?.toDate ? val.toDate() : new Date(val);
                return <Text type="secondary">{date.toLocaleDateString()}</Text>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: ResellerTransaction) => {
                const isManual = record.paymentMode === 'offline' || record.subscriptionBillingMode === 'manual';
                const canAddLocation = isManual && record.status === 'active';
                const hasPendingPaymentLink = record.paymentMode === 'online'
                    && record.status === 'pending_payment'
                    && Boolean(record.subscriptionShortUrl);
                return canAddLocation ? (
                    <Button size="small" onClick={() => {
                        setSelectedClient(record);
                        setLocationCount(1);
                    }}>
                        Add location
                    </Button>
                ) : hasPendingPaymentLink ? (
                    <Flex gap={8}>
                        <Button icon={<LuCopy />} size="small" onClick={() => copyPaymentLink(record.subscriptionShortUrl)}>
                            Copy link
                        </Button>
                        <Button icon={<LuExternalLink />} size="small" onClick={() => openPaymentLink(record.subscriptionShortUrl)}>
                            Open
                        </Button>
                    </Flex>
                ) : null;
            },
        },
    ];

    return (
        <div style={{ padding: '24px', maxWidth: 1200 }}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>
                        {isPlatform ? 'Reseller Management' : 'Reseller Dashboard'}
                    </Title>
                    <Text type="secondary">
                        {isPlatform ? 'View all resellers and their clients' : 'Onboard and manage your clients'}
                    </Text>
                </div>
                <Flex gap={8}>
                    <Button icon={<LuRefreshCw />} onClick={refresh}>Refresh</Button>
                    <Button type="primary" icon={<LuPlus />} onClick={() => router.push('/reseller/onboard')}>
                        Onboard New Client
                    </Button>
                </Flex>
            </Flex>

            {/* Stats Cards */}
            {stats && (
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic title="Total Clients" value={stats.total} prefix={<LuUsers />} />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic title="Active" value={stats.active} valueStyle={{ color: token.colorSuccess }} />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic title="Expiring Soon" value={stats.expiringSoon} valueStyle={{ color: stats.expiringSoon > 0 ? token.colorWarning : undefined }} />
                        </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                        <Card>
                            <Statistic title="Expired" value={stats.expired} valueStyle={{ color: stats.expired > 0 ? token.colorError : undefined }} />
                        </Card>
                    </Col>
                </Row>
            )}

            {monthlySummary && (
                <Card
                    size="small"
                    title={`This Month (${monthlySummary.month})`}
                    style={{ marginBottom: 16 }}
                >
                    <Row gutter={[16, 16]}>
                        <Col xs={12} sm={6}>
                            <Statistic title="Clients" value={monthlySummary.totals.clientCount} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Transactions" value={monthlySummary.totals.transactionCount} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Collected" value={monthlySummary.totals.recognizedRevenuePaise / 100} prefix="₹" precision={0} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Pending Online" value={monthlySummary.totals.onlinePendingPaise / 100} prefix="₹" precision={0} />
                        </Col>
                    </Row>
                </Card>
            )}

            {/* Profile Info (reseller only, not platform) */}
            {!isPlatform && profile && (
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Flex justify="space-between" align="center">
                        <Text type="secondary">
                            Offline cap: {profile.currentActiveOfflineStores} / {profile.maxOfflineActivations} used
                        </Text>
                        <Text type="secondary">
                            Total onboarded: {profile.totalStoresOnboarded}
                        </Text>
                        <Text type="secondary">
                            Lifetime sales: {formatMoney(profile.totalRevenueCollectedPaise)}
                        </Text>
                    </Flex>
                </Card>
            )}

            {/* Clients Table */}
            {transactions.length === 0 ? (
                <Card>
                    <Empty
                        description="No clients onboarded yet"
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                    >
                        <Button type="primary" icon={<LuPlus />} onClick={() => router.push('/reseller/onboard')}>
                            Onboard Your First Client
                        </Button>
                    </Empty>
                </Card>
            ) : (
                <Card title={`Clients (${transactions.length})`}>
                    <Table
                        dataSource={transactions}
                        columns={columns}
                        rowKey="id"
                        pagination={{ pageSize: 20 }}
                        size="middle"
                    />
                </Card>
            )}
            <Modal
                destroyOnClose
                okButtonProps={{ disabled: !locationTopup || locationTopup.daysRemaining <= 0, loading: addingLocation }}
                okText="Record prepaid location"
                onCancel={() => setSelectedClient(null)}
                onOk={handleAddLocationCapacity}
                open={Boolean(selectedClient)}
                title="Add Prepaid Location"
            >
                {selectedClient ? (
                    <Flex gap={12} vertical>
                        <Text>
                            {selectedClient.storeName || `Store ${selectedClient.storeId}`} currently has {selectedClient.subscriptionQuantity || selectedClient.locationCount || 1} paid location{(selectedClient.subscriptionQuantity || selectedClient.locationCount || 1) > 1 ? 's' : ''}.
                        </Text>
                        <InputNumber
                            min={1}
                            max={30}
                            onChange={(value) => setLocationCount(Math.max(1, Number(value || 1)))}
                            style={{ width: '100%' }}
                            value={locationCount}
                        />
                        <Card size="small">
                            <Flex gap={4} vertical>
                                <Text type="secondary">Collect from client</Text>
                                <Text strong>{formatMoney(locationTopup?.amountPaise)}</Text>
                                <Text type="secondary">
                                    Valid until {formatDate(selectedClient.validUntil)} ({locationTopup?.daysRemaining || 0} days remaining).
                                </Text>
                            </Flex>
                        </Card>
                    </Flex>
                ) : null}
            </Modal>
        </div>
    );
}

export default ResellerDashboard;
