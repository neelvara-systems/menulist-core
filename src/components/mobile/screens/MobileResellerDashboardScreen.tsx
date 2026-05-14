'use client'

import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { useResellerDashboard } from '@hook/useResellerDashboard';
import type { ResellerTransaction } from '@type/reseller';
import { useSession } from 'next-auth/react';
import { LuPlus, LuRefreshCw, LuUsers } from 'react-icons/lu';
import { Button, Card, Empty, Flex, Spin, Tag, Text, Title } from '../antd';
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

function formatMoney(paise?: number) {
    return `₹${Math.round((paise || 0) / 100).toLocaleString('en-IN')}`;
}

function formatDate(value: any) {
    if (!value) return 'Auto-renew';
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Auto-renew';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDaysLeft(value: any) {
    if (!value) return null;
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function ClientCard({ transaction }: { transaction: ResellerTransaction }) {
    const daysLeft = getDaysLeft(transaction.validUntil);
    const statusColor = STATUS_COLORS[transaction.status] || 'default';

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
                    <Tag>{formatMoney(transaction.amountExpected)}</Tag>
                </Flex>
                <Flex align="center" justify="space-between">
                    <Text type="secondary">Expires</Text>
                    <Text strong>{formatDate(transaction.validUntil)}{daysLeft && daysLeft > 0 ? ` (${daysLeft}d)` : ''}</Text>
                </Flex>
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
    const { profile, transactions, stats, isLoading, refresh } = useResellerDashboard(resellerId, isPlatform, resellerEmail);

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
                    <Button aria-label="Refresh reseller dashboard" fill="none" onClick={() => refresh()} style={{ minHeight: 40, minWidth: 40, paddingInline: 0 }}>
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

                {!isPlatform && profile ? (
                    <Card title="Profile">
                        <Flex gap={8} vertical>
                            <Flex justify="space-between"><Text type="secondary">Offline cap</Text><Text strong>{profile.currentActiveOfflineStores || 0} / {profile.maxOfflineActivations || 0}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Total onboarded</Text><Text strong>{profile.totalStoresOnboarded || 0}</Text></Flex>
                            <Flex justify="space-between"><Text type="secondary">Revenue tracked</Text><Text strong>{formatMoney(profile.totalRevenueCollectedPaise)}</Text></Flex>
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
                        {transactions.map((transaction) => <ClientCard key={transaction.id} transaction={transaction} />)}
                    </Flex>
                )}
            </Flex>
        </Flex>
    );
}
