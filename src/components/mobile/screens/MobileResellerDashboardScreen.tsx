'use client'

import { calculateOfflineAmount, calculateOfflineLocationTopup, RESELLER_COMMITMENT_OPTIONS } from '@config/resellerPricing';
import { ECOMSAI_PLATFORM_USER_ROLE } from '@constant/user';
import { useResellerDashboard } from '@hook/useResellerDashboard';
import { normalizeRazorpaySubscriptionCheckoutUrl } from '@lib/razorpay/checkoutUrl';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    clearResellerOperationId,
    getOrCreateResellerOperationId,
    RESELLER_REQUEST_POLICY,
} from '@template/main-app/reseller/resellerDiagnostics';
import type { ResellerTransaction } from '@type/reseller';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
import { formatInrPaise } from '@util/formatters';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useState } from 'react';
import { LuCopy, LuExternalLink, LuPlus, LuRefreshCw, LuUsers, LuX } from 'react-icons/lu';
import { Button, Card, Empty, Flex, Input, NavBar, Popup, Select, Spin, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { getBoundedMobileOwnerStringContext, logMobileOwnerFailure } from '../utils/mobileOwnerDiagnostics';

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

const MOBILE_RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const MOBILE_RESELLER_RENEW_RESPONSE_JSON_MAX_BYTES = 8 * 1024;
const MOBILE_RESELLER_DASHBOARD_COPY_UNAVAILABLE = 'mobile_reseller_dashboard_copy_unavailable';
const MOBILE_RESELLER_DASHBOARD_COPY_FALLBACK_FAILED = 'mobile_reseller_dashboard_copy_fallback_failed';

const hasMobileResellerDashboardClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasMobileResellerDashboardCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyMobileResellerDashboardText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasMobileResellerDashboardClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
            // Continue to the acknowledged textarea fallback before showing failure copy.
        }
    }

    if (!hasMobileResellerDashboardCopyFallback()) {
        throw clipboardWriteError || new Error(MOBILE_RESELLER_DASHBOARD_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(MOBILE_RESELLER_DASHBOARD_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

type MobileResellerAddLocationCapacityResponse = {
    amountExpected?: unknown;
    locationCount?: unknown;
    storeId?: unknown;
    success?: unknown;
    tenantId?: unknown;
};

type MobileResellerAddLocationCapacityExpectation = {
    locationCount: number;
    storeId: unknown;
    tenantId: unknown;
};

type MobileResellerRenewResponse = {
    amountExpected?: unknown;
    storeId?: unknown;
    subscriptionId?: unknown;
    success?: unknown;
    tenantId?: unknown;
    transactionId?: unknown;
    validUntil?: unknown;
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

function createMobileResellerStatusError(code: string, status?: number) {
    const error = new Error(code) as Error & { code?: string; status?: number };
    error.code = code;
    error.status = status;
    return error;
}

function isMatchingMobileResellerEntityId(value: unknown, expected: unknown) {
    const normalizedValue = String(value ?? '').trim();
    const normalizedExpected = String(expected ?? '').trim();
    return normalizedValue.length > 0 && normalizedValue === normalizedExpected;
}

function isValidMobileAddLocationCapacityResponse(
    data: MobileResellerAddLocationCapacityResponse | null,
    expected: MobileResellerAddLocationCapacityExpectation,
): data is MobileResellerAddLocationCapacityResponse & { amountExpected: number; success: true } {
    return data?.success === true
        && typeof data.amountExpected === 'number'
        && Number.isFinite(data.amountExpected)
        && data.amountExpected > 0
        && data.locationCount === expected.locationCount
        && isMatchingMobileResellerEntityId(data.storeId, expected.storeId)
        && isMatchingMobileResellerEntityId(data.tenantId, expected.tenantId);
}

function buildMobileAddLocationResponseShapeContext(
    data: MobileResellerAddLocationCapacityResponse | null,
    expected: MobileResellerAddLocationCapacityExpectation,
): Record<string, boolean | number | string | null | undefined> {
    return {
        amountExpectedValid: typeof data?.amountExpected === 'number'
            && Number.isFinite(data.amountExpected)
            && data.amountExpected > 0,
        hasExpectedLocationCount: data?.locationCount === expected.locationCount,
        hasExpectedStoreId: isMatchingMobileResellerEntityId(data?.storeId, expected.storeId),
        hasExpectedTenantId: isMatchingMobileResellerEntityId(data?.tenantId, expected.tenantId),
        success: data?.success === true,
    };
}

async function readMobileAddLocationCapacityResponse(
    response: Response,
    context: Record<string, boolean | number | string | null | undefined>,
): Promise<MobileResellerAddLocationCapacityResponse | null> {
    try {
        return await readJsonResponseWithLimit<MobileResellerAddLocationCapacityResponse>(
            response,
            MOBILE_RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logMobileOwnerFailure('mobile_reseller_dashboard_add_location_response_parse_failed', error, {
            ...context,
            maxBytes: MOBILE_RESELLER_ADD_LOCATION_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return null;
    }
}

function isValidMobileRenewResponse(
    data: MobileResellerRenewResponse | null,
    expected: { operationId: string; storeId: unknown; subscriptionId: string; tenantId: unknown },
): data is MobileResellerRenewResponse & { amountExpected: number; success: true; validUntil: string } {
    return data?.success === true
        && typeof data.amountExpected === 'number'
        && Number.isFinite(data.amountExpected)
        && data.amountExpected > 0
        && isMatchingMobileResellerEntityId(data.storeId, expected.storeId)
        && data.subscriptionId === expected.subscriptionId
        && isMatchingMobileResellerEntityId(data.tenantId, expected.tenantId)
        && data.transactionId === expected.operationId
        && typeof data.validUntil === 'string'
        && Number.isFinite(new Date(data.validUntil).getTime());
}

async function readMobileRenewResponse(
    response: Response,
    context: Record<string, boolean | number | string | null | undefined>,
): Promise<MobileResellerRenewResponse | null> {
    try {
        return await readJsonResponseWithLimit<MobileResellerRenewResponse>(
            response,
            MOBILE_RESELLER_RENEW_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logMobileOwnerFailure('mobile_reseller_dashboard_renew_response_parse_failed', error, {
            ...context,
            maxBytes: MOBILE_RESELLER_RENEW_RESPONSE_JSON_MAX_BYTES,
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return null;
    }
}

function ClientCard({
    onAddLocation,
    onCopyPaymentLink,
    onOpenPaymentLink,
    onRenew,
    transaction,
}: {
    onAddLocation: (transaction: ResellerTransaction) => void;
    onCopyPaymentLink: (transaction: ResellerTransaction) => void;
    onOpenPaymentLink: (transaction: ResellerTransaction) => void;
    onRenew: (transaction: ResellerTransaction) => void;
    transaction: ResellerTransaction;
}) {
    const formatter = useFormatter();
    const daysLeft = getDaysLeft(transaction.validUntil);
    const statusColor = STATUS_COLORS[transaction.status] || 'default';
    const isManual = transaction.paymentMode === 'offline' || transaction.subscriptionBillingMode === 'manual';
    const canAddLocation = isManual && transaction.status === 'active';
    const canRenew = isManual && ['active', 'expired'].includes(transaction.status);
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
                {canRenew ? (
                    <Button block onClick={() => onRenew(transaction)} style={{ minHeight: 44 }}>
                        Renew manual access
                    </Button>
                ) : null}
                {hasPendingPaymentLink ? (
                    <Flex gap={8}>
                        <Button block fill="outline" onClick={() => onCopyPaymentLink(transaction)} style={{ minHeight: 44 }}>
                            <Flex align="center" gap={6} justify="center"><LuCopy size={16} /> Copy link</Flex>
                        </Button>
                        <Button block onClick={() => onOpenPaymentLink(transaction)} style={{ minHeight: 44 }}>
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
    const { profile, monthlySummary, transactions, stats, isClientListPartial, isLoading, refresh } = useResellerDashboard(resellerId, isPlatform, resellerEmail);
    const [selectedClient, setSelectedClient] = useState<ResellerTransaction | null>(null);
    const [locationCount, setLocationCount] = useState('1');
    const [addingLocation, setAddingLocation] = useState(false);
    const [renewalClient, setRenewalClient] = useState<ResellerTransaction | null>(null);
    const [renewalMonths, setRenewalMonths] = useState('3');
    const [renewing, setRenewing] = useState(false);
    const parsedLocationCount = Math.max(1, Number(locationCount || 1));
    const buildResellerDashboardLogContext = (flow: string, metadata: Record<string, boolean | number | string | null | undefined> = {}) => ({
        surface: 'mobile_reseller_dashboard',
        flow,
        isPlatform,
        transactionCount: transactions.length,
        requestedLocationCount: parsedLocationCount,
        ...getBoundedMobileOwnerStringContext('resellerId', resellerId),
        ...getBoundedMobileOwnerStringContext('platformRole', platformRole),
        ...metadata,
    });
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
    const renewalAmount = renewalClient
        ? (() => {
            try {
                return calculateOfflineAmount(
                    renewalClient.pricingTier,
                    Number(renewalMonths),
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
        const operationIntentKey = `add-location:${selectedClient.subscriptionId}:${parsedLocationCount}`;
        const operationId = getOrCreateResellerOperationId(operationIntentKey);
        const addLocationLogContext = buildResellerDashboardLogContext('add_location_capacity', {
            ...getBoundedMobileOwnerStringContext('storeId', selectedClient.storeId),
            ...getBoundedMobileOwnerStringContext('tenantId', selectedClient.tenantId),
            ...getBoundedMobileOwnerStringContext('pricingTier', selectedClient.pricingTier),
        });
        try {
            const response = await fetch('/api/reseller/add-location-capacity', {
                ...RESELLER_REQUEST_POLICY,
                body: JSON.stringify({
                    locationCount: parsedLocationCount,
                    operationId,
                    storeId: selectedClient.storeId,
                    tenantId: selectedClient.tenantId,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await readMobileAddLocationCapacityResponse(response, addLocationLogContext);
            if (!response.ok) {
                throw createMobileResellerStatusError('mobile_reseller_dashboard_add_location_rejected', response.status);
            }
            const expectedAddLocationResponse: MobileResellerAddLocationCapacityExpectation = {
                locationCount: parsedLocationCount,
                storeId: selectedClient.storeId,
                tenantId: selectedClient.tenantId,
            };
            if (!isValidMobileAddLocationCapacityResponse(data, expectedAddLocationResponse)) {
                const invalidResponseError = createMobileResellerStatusError(
                    'mobile_reseller_dashboard_add_location_response_invalid',
                    response.status,
                );
                logMobileOwnerFailure(
                    'mobile_reseller_dashboard_add_location_response_invalid',
                    invalidResponseError,
                    {
                        ...addLocationLogContext,
                        ...buildMobileAddLocationResponseShapeContext(data, expectedAddLocationResponse),
                        responseOk: response.ok,
                        responseStatus: response.status,
                    },
                );
                throw invalidResponseError;
            }
            Toast.show({ content: `Collect ${formatInrPaise(data.amountExpected)}`, duration: 2200, icon: 'success' });
            clearResellerOperationId(operationIntentKey);
            setSelectedClient(null);
            setLocationCount('1');
            refresh();
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_dashboard_add_location_failed', error, addLocationLogContext);
            Toast.show({ content: 'Could not add location', duration: 2600 });
        } finally {
            setAddingLocation(false);
        }
    };

    const handleRenew = async () => {
        if (!renewalClient || !renewalAmount) return;
        setRenewing(true);
        const operationIntentKey = `renew:${renewalClient.subscriptionId}:${renewalClient.pricingTier}:${renewalMonths}`;
        const operationId = getOrCreateResellerOperationId(operationIntentKey);
        const context = buildResellerDashboardLogContext('renew_manual_subscription', {
            durationMonths: Number(renewalMonths),
            ...getBoundedMobileOwnerStringContext('storeId', renewalClient.storeId),
            ...getBoundedMobileOwnerStringContext('tenantId', renewalClient.tenantId),
            ...getBoundedMobileOwnerStringContext('pricingTier', renewalClient.pricingTier),
        });
        try {
            const response = await fetch('/api/reseller/renew', {
                ...RESELLER_REQUEST_POLICY,
                body: JSON.stringify({
                    durationMonths: Number(renewalMonths),
                    operationId,
                    paymentMode: 'offline',
                    pricingTier: renewalClient.pricingTier,
                    storeId: renewalClient.storeId,
                    tenantId: renewalClient.tenantId,
                }),
                headers: { 'Content-Type': 'application/json' },
                method: 'POST',
            });
            const data = await readMobileRenewResponse(response, context);
            if (!response.ok) {
                throw createMobileResellerStatusError('mobile_reseller_dashboard_renew_rejected', response.status);
            }
            if (!isValidMobileRenewResponse(data, {
                operationId,
                storeId: renewalClient.storeId,
                subscriptionId: renewalClient.subscriptionId,
                tenantId: renewalClient.tenantId,
            })) {
                throw createMobileResellerStatusError('mobile_reseller_dashboard_renew_response_invalid', response.status);
            }
            clearResellerOperationId(operationIntentKey);
            Toast.show({ content: `Renewed. Collect ${formatInrPaise(data.amountExpected)}`, duration: 2400, icon: 'success' });
            setRenewalClient(null);
            setRenewalMonths('3');
            refresh();
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_dashboard_renew_failed', error, context);
            Toast.show({ content: 'Could not renew client', duration: 2600 });
        } finally {
            setRenewing(false);
        }
    };

    const copyPaymentLink = async (transaction: ResellerTransaction) => {
        const link = normalizeRazorpaySubscriptionCheckoutUrl(transaction.subscriptionShortUrl);
        if (!link) {
            Toast.show({ content: 'Payment link is unavailable', duration: 2200 });
            return;
        }
        try {
            await copyMobileResellerDashboardText(link);
            Toast.show({ content: 'Payment link copied', duration: 1600, icon: 'success' });
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_dashboard_payment_link_copy_failed', error, buildResellerDashboardLogContext('copy_payment_link', {
                ...getBoundedMobileOwnerStringContext('paymentLink', link),
                ...getBoundedMobileOwnerStringContext('storeId', transaction.storeId),
                ...getBoundedMobileOwnerStringContext('tenantId', transaction.tenantId),
                ...getBoundedMobileOwnerStringContext('subscriptionId', transaction.subscriptionId),
                ...getBoundedMobileOwnerStringContext('pricingTier', transaction.pricingTier),
                ...getBoundedMobileOwnerStringContext('paymentMode', transaction.paymentMode),
                ...getBoundedMobileOwnerStringContext('transactionStatus', transaction.status),
                hasClipboardWrite: hasMobileResellerDashboardClipboardWrite(),
                hasCopyFallback: hasMobileResellerDashboardCopyFallback(),
            }));
            Toast.show({ content: 'Could not copy payment link', duration: 2200 });
        }
    };

    const openPaymentLink = (transaction: ResellerTransaction) => {
        const link = normalizeRazorpaySubscriptionCheckoutUrl(transaction.subscriptionShortUrl);
        if (!link) {
            Toast.show({ content: 'Payment link is unavailable', duration: 2200 });
            return;
        }
        try {
            const opened = window.open(link, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('mobile_reseller_dashboard_payment_link_open_blocked');
            }
        } catch (error) {
            logMobileOwnerFailure('mobile_reseller_dashboard_payment_link_open_failed', error, buildResellerDashboardLogContext('open_payment_link', {
                ...getBoundedMobileOwnerStringContext('paymentLink', link),
                ...getBoundedMobileOwnerStringContext('storeId', transaction.storeId),
                ...getBoundedMobileOwnerStringContext('tenantId', transaction.tenantId),
                ...getBoundedMobileOwnerStringContext('subscriptionId', transaction.subscriptionId),
                ...getBoundedMobileOwnerStringContext('pricingTier', transaction.pricingTier),
                ...getBoundedMobileOwnerStringContext('paymentMode', transaction.paymentMode),
                ...getBoundedMobileOwnerStringContext('transactionStatus', transaction.status),
            }));
            Toast.show({ content: 'Could not open payment link', duration: 2200 });
        }
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
                        {isClientListPartial ? (
                            <Card><Text type="warning">Showing a bounded client list. Monthly reporting has its own completeness indicator.</Text></Card>
                        ) : null}
                        {transactions.map((transaction) => (
                            <ClientCard
                                key={transaction.id}
                                onAddLocation={(client) => {
                                    setSelectedClient(client);
                                    setLocationCount('1');
                                }}
                                onCopyPaymentLink={copyPaymentLink}
                                onOpenPaymentLink={openPaymentLink}
                                onRenew={(client) => {
                                    setRenewalClient(client);
                                    setRenewalMonths('3');
                                }}
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
            <Popup
                bodyStyle={{ maxHeight: '70vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={renewing ? undefined : () => setRenewalClient(null)}
                position="bottom"
                visible={Boolean(renewalClient)}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setRenewalClient(null)}>
                        Renew manual access
                    </NavBar>
                    {renewalClient ? (
                        <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                            <Text strong>{renewalClient.storeName || `Store ${renewalClient.storeId}`}</Text>
                            <Select
                                onChange={setRenewalMonths}
                                options={RESELLER_COMMITMENT_OPTIONS.map((months) => ({
                                    label: `${months} months`,
                                    value: String(months),
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
                            <Flex gap={10}>
                                <Button block fill="outline" onClick={() => setRenewalClient(null)} style={{ minHeight: 44 }}>Cancel</Button>
                                <Button block disabled={!renewalAmount} loading={renewing} onClick={handleRenew} style={{ minHeight: 44 }}>
                                    Confirm renewal
                                </Button>
                            </Flex>
                        </Flex>
                    ) : null}
                </Flex>
            </Popup>
        </Flex>
    );
}
