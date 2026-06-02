'use client'

import { calculateOfflineLocationTopup } from '@config/resellerPricing';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { useResellerDashboard } from '@hook/useResellerDashboard';
import type { ResellerTransaction } from '@type/reseller';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import { formatInrPaise } from '@util/formatters';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useState } from 'react';
import { LuCopy, LuExternalLink, LuPlus, LuRefreshCw, LuUsers, LuX } from 'react-icons/lu';
import { Button, Card, Empty, Flex, Input, NavBar, Popup, Spin, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    pending_payment: 'Pending payment',
    expired: 'Expired',
    cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
    active: 'success',
    pending_payment: 'warning',
    expired: 'error',
    cancelled: 'default',
};

function formatDate(value: any, formatter: IntlFormatter) {
    if (!value) return 'Auto-renew';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Auto-renew';
    return formatDateTime(date, 'date', formatter);
}

function getDaysLeft(value: any) {
    if (!value) return null;
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ClientCard({
    onAddLocation,
    onCopyPaymentLink,
    onOpenPaymentLink,
    transaction,
}: {
    onAddLocation: (transaction: ResellerTransaction) => void;
    onCopyPaymentLink: (link: string) => void;
    onOpenPaymentLink: (link: string) => void;
    transaction: ResellerTransaction;
}) {
    const formatter = useFormatter();
    const daysLeft = getDaysLeft(transaction.validUntil);
    const statusColor = STATUS_COLORS[transaction.status] || 'default';
    const isManual = transaction.paymentMode === 'offline' || transaction.subscriptionBillingMode === 'manual';
    const canAddLocation = isManual && transaction.status === 'active';
    const hasPendingPaymentLink = transaction.paymentMode === 'online'
        && transaction.status === 'pending_payment'
        && Boolean(transaction.subscriptionShortUrl);

    return (
        <Card>
            <Flex gap={10} vertical>
                <Flex align="flex-start" justify="space-between">
                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                        <Text strong>{transaction.storeName || `Store ${transaction.storeId}`}</Text>
                        <Text type="secondary">Store {transaction.storeId} · Tenant {transaction.tenantId}</Text>
                    </Flex>
                    <Tag color={statusColor}>{STATUS_LABELS[transaction.status] || transaction.status}</Tag>
                </Flex>
                <Flex gap={8} wrap="wrap">
                    <Tag>{transaction.paymentMode === 'online' ? 'Online' : 'Offline'}</Tag>
                    <Tag>{transaction.pricingTier}</Tag>
                    <Tag>{formatInrPaise(transaction.amountExpected)}</Tag>
                    <Tag>{transaction.subscriptionQuantity || transaction.locationCount || 1} location{(transaction.subscriptionQuantity || transaction.locationCount || 1) > 1 ? 's' : ''}</Tag>
                </Flex>
                <Flex align="center" justify="space-between">
                    <Text type="secondary">Expires</Text>
                    <Text strong>{formatDate(transaction.validUntil, formatter)}{daysLeft && daysLeft > 0 ? ` (${daysLeft}d)` : ''}</Text>
                </Flex>
                {canAddLocation ? (
                    <Button block fill="outline" onClick={() => onAddLocation(transaction)} style={{ minHeight: 44 }}>
                        Add prepaid location
                    </Button>
                ) : null}
                {hasPendingPaymentLink ? (
                    <Flex gap={8}>
                        <Button block fill="outline" onClick={() => onCopyPaymentLink(transaction.subscriptionShortUrl || '')} style={{ minHeight: 44 }}>
                            <Flex align="center" gap={6} justify="center"><LuCopy size={16} /> Copy link</Flex>
                        </Button>
                        <Button block onClick={() => onOpenPaymentLink(transaction.subscriptionShortUrl || '')} style={{ minHeight: 44 }}>
                            <Flex align="center" gap={6} justify="center"><LuExternalLink size={16} /> Open</Flex>
                        </Button>
                    </Flex>
                ) : null}
            </Flex>
        </Card>
    );
}

export default function MobileResellerDashboardScreen({
    onBack,
    onOpenManagement,
    onOpenOnboarding,
}: {
    onBack: () => void;
    onOpenManagement?: () => void;
    onOpenOnboarding: () => void;
}) {
    const { data: session } = useSession();
    const resellerId = (session as any)?.user?.id || '';
    const resellerEmail = (session as any)?.user?.email || '';
    const platformRole = (session as any)?.platformRole || (session?.user as any)?.platformRole;
    const isPlatform = platformRole === ECOMSAI_PLATFORM_USER_ROLE;
    const { profile, monthlySummary, transactions, stats, isLoading, refresh } = useResellerDashboard(resellerId, isPlatform, resellerEmail);
    const [selectedClient, setSelectedClient] = useState<ResellerTransaction | null>(null);
    const [locationCount, setLocationCount] = useState('1');
    const [addingLocation, setAddingLocation] = useState(false);
    const parsedLocationCount = Math.max(1, Number(locationCount || 1));
    const locationTopup = selectedClient
        ? (() => {
            try {
                return calculateOfflineLocationTopup({
                    locationCount: parsedLocationCount,
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
                    locationCount: parsedLocationCount,
                    storeId: selectedClient.storeId,
                    tenantId: selectedClient.tenantId,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Could not add location');
            Toast.show({ content: `Collect ${formatInrPaise(data.amountExpected)}`, duration: 2200, icon: 'success' });
            setSelectedClient(null);
            setLocationCount('1');
            refresh();
        } catch (error: any) {
            Toast.show({ content: error?.message || 'Could not add location', duration: 2600 });
        } finally {
            setAddingLocation(false);
        }
    };

    const copyPaymentLink = async (link: string) => {
        if (!link) return;
        await navigator.clipboard.writeText(link);
        Toast.show({ content: 'Payment link copied', duration: 1600, icon: 'success' });
    };

    const openPaymentLink = (link: string) => {
        if (!link) return;
        window.open(link, '_blank', 'noopener,noreferrer');
    };

    if (isLoading) {
        return (
            <Flex style={{ minHeight: '70dvh' }} vertical>
                <MobileSettingsScreenHeader description="View reseller clients, status, and onboarding activity." onBack={onBack} title="Reseller Dashboard" />
                <Flex align="center" flex={1} justify="center">
                    <Spin />
                </Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={isPlatform ? 'View reseller clients across the platform.' : 'View your clients and license status.'}
                onBack={onBack}
                right={(
                    <Button aria-label="Refresh reseller dashboard" fill="none" onClick={() => refresh()} style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}>
                        <LuRefreshCw size={18} />
                    </Button>
                )}
                title="Reseller Dashboard"
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex gap={2} vertical>
                                <Title level={5} style={{ margin: 0 }}>{isPlatform ? 'All reseller clients' : 'Your clients'}</Title>
                                <Text type="secondary">{transactions.length} client records</Text>
                            </Flex>
                            <Button onClick={onOpenOnboarding} style={{ minHeight: 44 }}>
                                <Flex align="center" gap={6}><LuPlus size={16} /> Onboard</Flex>
                            </Button>
                        </Flex>
                        {isPlatform && onOpenManagement ? (
                            <Button block fill="outline" onClick={onOpenManagement} style={{ minHeight: 44 }}>
                                <Flex align="center" gap={6} justify="center"><LuUsers size={16} /> Manage Resellers</Flex>
                            </Button>
                        ) : null}
                    </Flex>
                </Card>

                {stats ? (
                    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                        {[
                            ['Total', stats.total],
                            ['Active', stats.active],
                            ['Expiring', stats.expiringSoon],
                            ['Expired', stats.expired],
                        ].map(([label, value]) => (
                            <Card key={label as string}>
                                <Flex gap={2} vertical>
                                    <Text type="secondary">{label}</Text>
                                    <Title level={4} style={{ margin: 0 }}>{value}</Title>
                                </Flex>
                            </Card>
                        ))}
                    </div>
                ) : null}

                {monthlySummary ? (
                    <Card title={`This month (${monthlySummary.month})`}>
                        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                            {[
                                ['Clients', monthlySummary.totals.clientCount],
                                ['Txns', monthlySummary.totals.transactionCount],
                                ['Collected', formatInrPaise(monthlySummary.totals.recognizedRevenuePaise)],
                                ['Online pending', formatInrPaise(monthlySummary.totals.onlinePendingPaise)],
                            ].map(([label, value]) => (
                                <Flex key={label as string} gap={2} vertical>
                                    <Text type="secondary">{label}</Text>
                                    <Text strong>{value}</Text>
                                </Flex>
                            ))}
                        </div>
                    </Card>
                ) : null}

                {!isPlatform && profile ? (
                    <Card title="Profile">
                        <Flex gap={8} vertical>
                            <Flex justify="space-between"><Text type="secondary">Offline cap</Text><Text strong>{profile.currentActiveOfflineStores || 0} / {profile.maxOfflineActivations || 0}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Total onboarded</Text><Text strong>{profile.totalStoresOnboarded || 0}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Revenue tracked</Text><Text strong>{formatInrPaise(profile.totalRevenueCollectedPaise)}</Text></Flex>
                        </Flex>
                    </Card>
                ) : null}

                {transactions.length === 0 ? (
                    <Card>
                        <Empty description="No clients onboarded yet" />
                        <Button block onClick={onOpenOnboarding} style={{ marginTop: 12, minHeight: 44 }}>Onboard First Client</Button>
                    </Card>
                ) : (
                    <Flex gap={10} vertical>
                        <Title level={5} style={{ margin: 0 }}>Clients</Title>
                        {transactions.map((transaction) => (
                            <ClientCard
                                key={transaction.id}
                                onAddLocation={(client) => {
                                    setSelectedClient(client);
                                    setLocationCount('1');
                                }}
                                onCopyPaymentLink={copyPaymentLink}
                                onOpenPaymentLink={openPaymentLink}
                                transaction={transaction}
                            />
                        ))}
                    </Flex>
                )}
            </Flex>
            <Popup
                bodyStyle={{ maxHeight: '70vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={addingLocation ? undefined : () => setSelectedClient(null)}
                position="bottom"
                visible={Boolean(selectedClient)}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setSelectedClient(null)}>
                        Add prepaid location
                    </NavBar>
                    {selectedClient ? (
                        <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                            <Text strong>{selectedClient.storeName || `Store ${selectedClient.storeId}`}</Text>
                            <Text type="secondary">
                                Current paid locations: {selectedClient.subscriptionQuantity || selectedClient.locationCount || 1}
                            </Text>
                            <Input
                                inputMode="numeric"
                                onChange={(value) => setLocationCount(value.replace(/[^0-9]/g, ''))}
                                placeholder="1"
                                type="number"
                                value={locationCount}
                            />
                            <Card size="small">
                                <Flex gap={4} vertical>
                                    <Text type="secondary">Collect from client</Text>
                                    <Text strong>{formatInrPaise(locationTopup?.amountPaise)}</Text>
                                    <Text type="secondary">{locationTopup?.daysRemaining || 0} days remaining.</Text>
                                </Flex>
                            </Card>
                            <Flex gap={10}>
                                <Button block fill="outline" onClick={() => setSelectedClient(null)} style={{ minHeight: 44 }}>Cancel</Button>
                                <Button
                                    block
                                    disabled={!locationTopup || locationTopup.daysRemaining <= 0}
                                    loading={addingLocation}
                                    onClick={handleAddLocationCapacity}
                                    style={{ minHeight: 44 }}
                                >
                                    Record payment
                                </Button>
                            </Flex>
                        </Flex>
                    ) : null}
                </Flex>
            </Popup>
        </Flex>
    );
}
