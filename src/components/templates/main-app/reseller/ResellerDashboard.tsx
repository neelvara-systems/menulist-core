'use client';

import { calculateOfflineAmount, calculateOfflineLocationTopup, RESELLER_COMMITMENT_OPTIONS } from "@config/resellerPricing";
import { useResellerDashboard } from "@hook/useResellerDashboard";
import { normalizeRazorpaySubscriptionCheckoutUrl } from "@lib/razorpay/checkoutUrl";
import type { ResellerClientRecord } from "@lib/reseller/resellerClientRecord";
import { readJsonResponseWithLimit } from "@lib/security/boundedResponseBody";
import { formatDateTime, type IntlFormatter } from "@util/dateTime";
import { formatInrPaise } from "@util/formatters";
import { Badge, Button, Card, Col, Empty, Flex, InputNumber, message, Modal, Row, Select, Spin, Statistic, Table, Tag, Typography, theme } from "antd";
import { useSession } from "next-auth/react";
import { useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LuCopy, LuExternalLink, LuPlus, LuRefreshCw, LuUsers } from "react-icons/lu";
import {
    clearResellerOperationId,
    copyResellerTextToClipboard,
    createResellerStatusError,
    getBoundedResellerStringContext,
    getOrCreateResellerOperationId,
    hasResellerClipboardWrite,
    hasResellerCopyFallback,
    logResellerFailure,
    RESELLER_REQUEST_POLICY,
    type ResellerLogContext,
} from "./resellerDiagnostics";

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

const RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const RESELLER_RENEW_RESPONSE_JSON_MAX_BYTES = 8 * 1024;

type ResellerAddLocationCapacityResponse = {
    amountExpected?: unknown;
    locationCount?: unknown;
    storeId?: unknown;
    success?: unknown;
    tenantId?: unknown;
};

type ResellerAddLocationCapacityExpectation = {
    locationCount: number;
    storeId: unknown;
    tenantId: unknown;
};

type ResellerRenewResponse = {
    amountExpected?: unknown;
    locationCount?: unknown;
    storeId?: unknown;
    subscriptionId?: unknown;
    success?: unknown;
    tenantId?: unknown;
    transactionId?: unknown;
    validUntil?: unknown;
};

function formatDate(value: string | null, formatter: IntlFormatter) {
    if (!value) return 'Auto-renew';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Auto-renew';
    return formatDateTime(date, 'date', formatter);
}

function isMatchingResellerEntityId(value: unknown, expected: unknown) {
    const normalizedValue = String(value ?? '').trim();
    const normalizedExpected = String(expected ?? '').trim();
    return normalizedValue.length > 0 && normalizedValue === normalizedExpected;
}

function isValidAddLocationCapacityResponse(
    data: ResellerAddLocationCapacityResponse | null,
    expected: ResellerAddLocationCapacityExpectation,
): data is ResellerAddLocationCapacityResponse & { amountExpected: number; success: true } {
    return data?.success === true
        && typeof data.amountExpected === 'number'
        && Number.isFinite(data.amountExpected)
        && data.amountExpected > 0
        && data.locationCount === expected.locationCount
        && isMatchingResellerEntityId(data.storeId, expected.storeId)
        && isMatchingResellerEntityId(data.tenantId, expected.tenantId);
}

function buildAddLocationResponseShapeContext(
    data: ResellerAddLocationCapacityResponse | null,
    expected: ResellerAddLocationCapacityExpectation,
): ResellerLogContext {
    return {
        amountExpectedValid: typeof data?.amountExpected === 'number'
            && Number.isFinite(data.amountExpected)
            && data.amountExpected > 0,
        hasExpectedLocationCount: data?.locationCount === expected.locationCount,
        hasExpectedStoreId: isMatchingResellerEntityId(data?.storeId, expected.storeId),
        hasExpectedTenantId: isMatchingResellerEntityId(data?.tenantId, expected.tenantId),
        success: data?.success === true,
    };
}

async function readAddLocationCapacityResponse(
    response: Response,
    context: ResellerLogContext,
): Promise<ResellerAddLocationCapacityResponse | null> {
    try {
        return await readJsonResponseWithLimit<ResellerAddLocationCapacityResponse>(
            response,
            RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logResellerFailure('desktop_reseller_dashboard_add_location_response_parse_failed', error, {
            ...context,
            maxBytes: RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return null;
    }
}

function isValidRenewResponse(
    data: ResellerRenewResponse | null,
    expected: { operationId: string; storeId: unknown; subscriptionId: string; tenantId: unknown },
): data is ResellerRenewResponse & { amountExpected: number; success: true; validUntil: string } {
    return data?.success === true
        && typeof data.amountExpected === 'number'
        && Number.isFinite(data.amountExpected)
        && data.amountExpected > 0
        && isMatchingResellerEntityId(data.storeId, expected.storeId)
        && data.subscriptionId === expected.subscriptionId
        && isMatchingResellerEntityId(data.tenantId, expected.tenantId)
        && data.transactionId === expected.operationId
        && typeof data.validUntil === 'string'
        && Number.isFinite(new Date(data.validUntil).getTime());
}

async function readRenewResponse(
    response: Response,
    context: ResellerLogContext,
): Promise<ResellerRenewResponse | null> {
    try {
        return await readJsonResponseWithLimit<ResellerRenewResponse>(response, RESELLER_RENEW_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logResellerFailure('desktop_reseller_dashboard_renew_response_parse_failed', error, {
            ...context,
            maxBytes: RESELLER_RENEW_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return null;
    }
}

function ResellerDashboard() {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const { data: session } = useSession();
    const router = useRouter();
    const resellerId = session?.user?.id || '';
    const resellerEmail = session?.user?.email || '';
    const isPlatform = session?.platformRole === 'PLATFORM' || session?.user?.platformRole === 'PLATFORM';

    const {
        profile,
        monthlySummary,
        transactions,
        stats,
        invalidClientRowCount,
        isClientListPartial,
        isLoading,
        refresh,
    } = useResellerDashboard(resellerId, isPlatform, resellerEmail);
    const [selectedClient, setSelectedClient] = useState<ResellerClientRecord | null>(null);
    const [locationCount, setLocationCount] = useState(1);
    const [addingLocation, setAddingLocation] = useState(false);
    const [renewalClient, setRenewalClient] = useState<ResellerClientRecord | null>(null);
    const [renewalMonths, setRenewalMonths] = useState<number>(3);
    const [renewing, setRenewing] = useState(false);
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
    const renewalAmount = renewalClient
        ? (() => {
            try {
                return calculateOfflineAmount(
                    renewalClient.pricingTier,
                    renewalMonths,
                    renewalClient.subscriptionQuantity || renewalClient.locationCount || 1,
                );
            } catch {
                return null;
            }
        })()
        : null;

    const handleAddLocationCapacity = async () => {
        if (!selectedClient) return;
        setAddingLocation(true);
        const operationIntentKey = `add-location:${selectedClient.subscriptionId}:${locationCount}`;
        const operationId = getOrCreateResellerOperationId(operationIntentKey);
        const addLocationLogContext: ResellerLogContext = {
            action: 'add_location_capacity',
            locationCount,
            ...getBoundedResellerStringContext('resellerId', resellerId),
            ...getBoundedResellerStringContext('storeId', selectedClient.storeId),
            ...getBoundedResellerStringContext('tenantId', selectedClient.tenantId),
        };
        try {
            const response = await fetch('/api/reseller/add-location-capacity', {
                ...RESELLER_REQUEST_POLICY,
                body: JSON.stringify({
                    locationCount,
                    operationId,
                    storeId: selectedClient.storeId,
                    tenantId: selectedClient.tenantId,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await readAddLocationCapacityResponse(response, addLocationLogContext);
            if (!response.ok) throw createResellerStatusError('desktop_reseller_dashboard_add_location_rejected', response.status);
            const expectedAddLocationResponse: ResellerAddLocationCapacityExpectation = {
                locationCount,
                storeId: selectedClient.storeId,
                tenantId: selectedClient.tenantId,
            };
            if (!isValidAddLocationCapacityResponse(data, expectedAddLocationResponse)) {
                logResellerFailure(
                    'desktop_reseller_dashboard_add_location_response_invalid',
                    createResellerStatusError('desktop_reseller_dashboard_add_location_response_invalid', response.status),
                    {
                        ...addLocationLogContext,
                        ...buildAddLocationResponseShapeContext(data, expectedAddLocationResponse),
                        responseOk: response.ok,
                        responseStatus: response.status,
                    },
                );
                throw createResellerStatusError('desktop_reseller_dashboard_add_location_response_invalid', response.status);
            }
            message.success(`Location capacity added. Collect ${formatInrPaise(data.amountExpected)}.`);
            clearResellerOperationId(operationIntentKey);
            setSelectedClient(null);
            setLocationCount(1);
            refresh();
        } catch (error) {
            logResellerFailure('desktop_reseller_dashboard_add_location_failed', error, addLocationLogContext);
            message.error('Failed to add location');
        } finally {
            setAddingLocation(false);
        }
    };

    const handleRenew = async () => {
        if (!renewalClient || !renewalAmount) return;
        setRenewing(true);
        const operationIntentKey = `renew:${renewalClient.subscriptionId}:${renewalClient.pricingTier}:${renewalMonths}`;
        const operationId = getOrCreateResellerOperationId(operationIntentKey);
        const context: ResellerLogContext = {
            action: 'renew_manual_subscription',
            durationMonths: renewalMonths,
            ...getBoundedResellerStringContext('resellerId', resellerId),
            ...getBoundedResellerStringContext('storeId', renewalClient.storeId),
            ...getBoundedResellerStringContext('tenantId', renewalClient.tenantId),
        };
        try {
            const response = await fetch('/api/reseller/renew', {
                ...RESELLER_REQUEST_POLICY,
                body: JSON.stringify({
                    durationMonths: renewalMonths,
                    operationId,
                    paymentMode: 'offline',
                    pricingTier: renewalClient.pricingTier,
                    storeId: renewalClient.storeId,
                    tenantId: renewalClient.tenantId,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await readRenewResponse(response, context);
            if (!response.ok) throw createResellerStatusError('desktop_reseller_dashboard_renew_rejected', response.status);
            if (!isValidRenewResponse(data, {
                operationId,
                storeId: renewalClient.storeId,
                subscriptionId: renewalClient.subscriptionId,
                tenantId: renewalClient.tenantId,
            })) {
                throw createResellerStatusError('desktop_reseller_dashboard_renew_response_invalid', response.status);
            }
            clearResellerOperationId(operationIntentKey);
            message.success(`Renewed. Collect ${formatInrPaise(data.amountExpected)}.`);
            setRenewalClient(null);
            setRenewalMonths(3);
            refresh();
        } catch (error) {
            logResellerFailure('desktop_reseller_dashboard_renew_failed', error, context);
            message.error('Failed to renew client');
        } finally {
            setRenewing(false);
        }
    };

    const buildResellerDashboardHandoffLogContext = (
        action: string,
        record?: ResellerClientRecord | null,
        metadata: ResellerLogContext = {},
    ): ResellerLogContext => ({
        action,
        isPlatform,
        transactionCount: transactions.length,
        ...getBoundedResellerStringContext('resellerId', resellerId),
        ...getBoundedResellerStringContext('storeId', record?.storeId),
        ...getBoundedResellerStringContext('tenantId', record?.tenantId),
        ...getBoundedResellerStringContext('subscriptionId', record?.subscriptionId),
        ...getBoundedResellerStringContext('pricingTier', record?.pricingTier),
        ...getBoundedResellerStringContext('paymentMode', record?.paymentMode),
        ...getBoundedResellerStringContext('transactionStatus', record?.status),
        ...metadata,
    });

    const copyPaymentLink = async (link?: string | null, record?: ResellerClientRecord | null) => {
        const checkoutUrl = normalizeRazorpaySubscriptionCheckoutUrl(link);
        if (!checkoutUrl) {
            message.error('Payment link is unavailable.');
            return;
        }
        try {
            await copyResellerTextToClipboard(checkoutUrl);
            message.success('Payment link copied.');
        } catch (error) {
            logResellerFailure('desktop_reseller_dashboard_payment_link_copy_failed', error, buildResellerDashboardHandoffLogContext('copy_payment_link', record, {
                ...getBoundedResellerStringContext('paymentLink', link),
                hasClipboardWrite: hasResellerClipboardWrite(),
                hasCopyFallback: hasResellerCopyFallback(),
            }));
            message.error('Could not copy payment link.');
        }
    };

    const openPaymentLink = (link?: string | null, record?: ResellerClientRecord | null) => {
        const checkoutUrl = normalizeRazorpaySubscriptionCheckoutUrl(link);
        if (!checkoutUrl) {
            message.error('Payment link is unavailable.');
            return;
        }
        try {
            const opened = window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('desktop_reseller_dashboard_payment_link_open_blocked');
            }
        } catch (error) {
            logResellerFailure('desktop_reseller_dashboard_payment_link_open_failed', error, buildResellerDashboardHandoffLogContext('open_payment_link', record, {
                ...getBoundedResellerStringContext('paymentLink', link),
            }));
            message.error('Could not open payment link.');
        }
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
            render: (_: number, record: ResellerClientRecord) => (
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
            render: (val: string | null) => {
                if (!val) return <Text type="secondary">Auto-renew</Text>;
                const date = new Date(val);
                const daysLeft = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysLeft > 0 && daysLeft <= 30;
                return (
                    <Text type={daysLeft <= 0 ? 'danger' : isExpiringSoon ? 'warning' : undefined}>
                        {formatDate(val, formatter)}
                        {daysLeft > 0 && ` (${daysLeft}d)`}
                    </Text>
                );
            },
        },
        {
            title: 'Created',
            dataIndex: 'createdOn',
            key: 'createdOn',
            render: (val: string | null) => {
                if (!val) return '-';
                return <Text type="secondary">{formatDateTime(val, 'date', formatter)}</Text>;
            },
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: unknown, record: ResellerClientRecord) => {
                const isManual = record.paymentMode === 'offline' || record.subscriptionBillingMode === 'manual';
                const canAddLocation = isManual && record.status === 'active';
                const canRenew = isManual && ['active', 'expired'].includes(record.status);
                const hasPendingPaymentLink = record.paymentMode === 'online'
                    && record.status === 'pending_payment'
                    && Boolean(record.subscriptionShortUrl);
                return isManual ? (
                    <Flex gap={8} wrap="wrap">
                        {canRenew ? (
                            <Button size="small" onClick={() => {
                                setRenewalClient(record);
                                setRenewalMonths(3);
                            }}>
                                Renew
                            </Button>
                        ) : null}
                        {canAddLocation ? (
                            <Button size="small" onClick={() => {
                                setSelectedClient(record);
                                setLocationCount(1);
                            }}>
                                Add location
                            </Button>
                        ) : null}
                    </Flex>
                ) : hasPendingPaymentLink ? (
                    <Flex gap={8}>
                        <Button icon={<LuCopy />} size="small" onClick={() => void copyPaymentLink(record.subscriptionShortUrl, record)}>
                            Copy link
                        </Button>
                        <Button icon={<LuExternalLink />} size="small" onClick={() => openPaymentLink(record.subscriptionShortUrl, record)}>
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
                    {monthlySummary.isPartial ? (
                        <Text type="warning">
                            This report is incomplete{monthlySummary.invalidRowCount > 0
                                ? `; ${monthlySummary.invalidRowCount} invalid transaction ${monthlySummary.invalidRowCount === 1 ? 'row was' : 'rows were'} excluded`
                                : ' because the monthly limit was reached'}.
                        </Text>
                    ) : null}
                    <Row gutter={[16, 16]}>
                        <Col xs={12} sm={6}>
                            <Statistic title="Clients" value={monthlySummary.totals.clientCount} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Transactions" value={monthlySummary.totals.transactionCount} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Collected" value={formatInrPaise(monthlySummary.totals.recognizedRevenuePaise)} />
                        </Col>
                        <Col xs={12} sm={6}>
                            <Statistic title="Pending Online" value={formatInrPaise(monthlySummary.totals.onlinePendingPaise)} />
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
                            Lifetime sales: {formatInrPaise(profile.totalRevenueCollectedPaise)}
                        </Text>
                    </Flex>
                </Card>
            )}

            {/* Clients Table */}
            {isClientListPartial ? (
                <Card size="small" style={{ marginBottom: 16 }}>
                    <Text type="warning">
                        This client list is incomplete{invalidClientRowCount > 0
                            ? `; ${invalidClientRowCount} invalid subscription ${invalidClientRowCount === 1 ? 'row was' : 'rows were'} excluded`
                            : ' because the list limit was reached'}.
                    </Text>
                </Card>
            ) : null}
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
                destroyOnHidden
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
                                <Text strong>{formatInrPaise(locationTopup?.amountPaise)}</Text>
                                <Text type="secondary">
                                    Valid until {formatDate(selectedClient.validUntil, formatter)} ({locationTopup?.daysRemaining || 0} days remaining).
                                </Text>
                            </Flex>
                        </Card>
                    </Flex>
                ) : null}
            </Modal>
            <Modal
                destroyOnHidden
                okButtonProps={{ disabled: !renewalAmount, loading: renewing }}
                okText="Confirm prepaid renewal"
                onCancel={() => setRenewalClient(null)}
                onOk={handleRenew}
                open={Boolean(renewalClient)}
                title="Renew Manual Access"
            >
                {renewalClient ? (
                    <Flex gap={12} vertical>
                        <Text>{renewalClient.storeName || `Store ${renewalClient.storeId}`}</Text>
                        <Select
                            onChange={(value) => setRenewalMonths(Number(value))}
                            options={RESELLER_COMMITMENT_OPTIONS.map((months) => ({
                                label: `${months} months`,
                                value: months,
                            }))}
                            value={renewalMonths}
                        />
                        <Card size="small">
                            <Flex gap={4} vertical>
                                <Text type="secondary">Collect before confirming</Text>
                                <Text strong>{formatInrPaise(renewalAmount)}</Text>
                                <Text type="secondary">
                                    Covers {renewalClient.subscriptionQuantity || renewalClient.locationCount || 1} paid location{(renewalClient.subscriptionQuantity || renewalClient.locationCount || 1) > 1 ? 's' : ''}.
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
