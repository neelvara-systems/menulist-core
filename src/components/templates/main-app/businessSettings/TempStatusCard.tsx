'use client';

/**
 * TempStatusCard — Desktop Business Settings card for temporary status banners
 *
 * Allows owner to set/clear temporary status ("Closed today", "Opening late", etc.)
 * on their public pages (OBP + digital menu) with auto-expiry.
 *
 * @see __docs__/temp-status-layer/temp-status-layer_impl.md
 */

import { Button, Card, DatePicker, Flex, Input, Modal, Tag, Typography, message as antdMessage, theme } from 'antd';
import dayjs from 'dayjs';
import { useFormatter, useTimeZone } from 'next-intl';
import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { LuAlertTriangle, LuCheck, LuClock, LuX } from 'react-icons/lu';
import {
    formatDateTime,
    fromNativeDateTimeInputValue,
    toDate,
    toNativeDateTimeInputValue,
} from '@util/dateTime';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { readTempStatusResponse } from '@lib/tempStatus/clientResponse';
import { useActiveTempStatus } from '@hook/useActiveTempStatus';
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from './utils/businessSettingsDiagnostics';
import type { StoreDataType } from '@type/platform/store';

const { Text } = Typography;

const STATUS_OPTIONS = [
    { value: 'closed_today', label: 'Closed Today', icon: '🔒', defaultMsg: 'Closed today' },
    { value: 'opening_late', label: 'Opening Late', icon: '🕐', defaultMsg: 'Opening late today' },
    { value: 'closing_early', label: 'Closing Early', icon: '🕕', defaultMsg: 'Closing early today' },
    { value: 'kitchen_closed', label: 'Kitchen Closed', icon: '🍳', defaultMsg: 'Kitchen is closed' },
    { value: 'special_menu', label: 'Special Menu', icon: '🍽️', defaultMsg: 'Special menu available today' },
    { value: 'custom', label: 'Custom Message', icon: 'ℹ️', defaultMsg: '' },
] as const;

function buildTempStatusLogContext(storeDetails: Partial<StoreDataType> | null, action: string, statusType?: unknown) {
    return {
        action,
        ...getBoundedBusinessSettingsStringContext('storeId', storeDetails?.storeId),
        ...getBoundedBusinessSettingsStringContext('tenantId', storeDetails?.tenantId),
        ...getBoundedBusinessSettingsStringContext('statusType', statusType),
    };
}

interface TempStatusCardProps {
    storeDetails: StoreDataType;
    setStoreDetails: Dispatch<SetStateAction<StoreDataType | null>>;
}

export default function TempStatusCard({ storeDetails, setStoreDetails }: TempStatusCardProps) {
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const timeZone = useTimeZone();
    const storedStatus = storeDetails?.tempStatus;
    const currentStatus = useActiveTempStatus(storedStatus);
    const isActive = Boolean(currentStatus);

    const [statusType, setStatusType] = useState<(typeof STATUS_OPTIONS)[number]['value']>('closed_today');
    const [customMessage, setCustomMessage] = useState('');
    const [expiresAt, setExpiresAt] = useState<dayjs.Dayjs | null>(() => dayjs(
        toNativeDateTimeInputValue(new Date(Date.now() + 24 * 60 * 60 * 1000), timeZone),
    ).startOf('hour'));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const currentScopeRef = useRef({ storeId: storeDetails.storeId, tenantId: storeDetails.tenantId });
    const actionInFlightRef = useRef(false);
    currentScopeRef.current = { storeId: storeDetails.storeId, tenantId: storeDetails.tenantId };
    const isExpectedScope = useCallback((tenantId: unknown, storeId: unknown) => (
        String(currentScopeRef.current.tenantId ?? '') === String(tenantId ?? '')
        && String(currentScopeRef.current.storeId ?? '') === String(storeId ?? '')
    ), []);
    const resolveExpiryInstant = useCallback((value: dayjs.Dayjs | null): string => (
        value
            ? fromNativeDateTimeInputValue(value.format('YYYY-MM-DDTHH:mm'), timeZone)
            : ''
    ), [timeZone]);

    const handleSet = useCallback(() => {
        const expectedTenantId = storeDetails.tenantId;
        const expectedStoreId = storeDetails.storeId;
        if (!expiresAt) {
            setError('Please set an expiry time');
            return;
        }
        const expiryInstant = resolveExpiryInstant(expiresAt);
        const expiryDate = toDate(expiryInstant);
        if (!expiryInstant || Number.isNaN(expiryDate.getTime()) || expiryDate.getTime() <= Date.now()) {
            setError('Expiry must be in the future');
            return;
        }

        setError(null);

        const selectedOption = STATUS_OPTIONS.find(o => o.value === statusType);
        const message = statusType === 'custom'
            ? (customMessage.trim() || 'Temporary notice')
            : (selectedOption?.defaultMsg || statusType);
        const newStatus = {
            type: statusType,
            message,
            expiresAt: expiryInstant,
            createdAt: new Date().toISOString(),
        };

        Modal.confirm({
            title: 'Show this status to customers?',
            content: `Customers will see "${message}" until ${formatDateTime(newStatus.expiresAt, 'datetime', formatter)}.`,
            okText: 'Show to customers',
            cancelText: 'Cancel',
            onOk: async () => {
                if (actionInFlightRef.current || !isExpectedScope(expectedTenantId, expectedStoreId)) return;
                actionInFlightRef.current = true;
                setIsLoading(true);
                setError(null);

                // Optimistic update
                setStoreDetails((prev) => prev
                    && String(prev.tenantId) === String(expectedTenantId)
                    && String(prev.storeId) === String(expectedStoreId)
                    ? { ...prev, tempStatus: newStatus }
                    : prev);

                try {
                    const res = await fetch('/api/store/temp-status', {
                        ...AUTH_BROWSER_REQUEST_POLICY,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'set',
                            expectedStoreId: String(expectedStoreId),
                            expectedTenantId: String(expectedTenantId),
                            type: statusType,
                            message: statusType === 'custom' ? customMessage.trim() : undefined,
                            expiresAt: expiryInstant,
                        }),
                    });

                    const result = await readTempStatusResponse(res, 'set', buildTempStatusLogContext(storeDetails, 'set_temp_status', statusType));
                    if (!isExpectedScope(expectedTenantId, expectedStoreId)) return;
                    if (result.effectsPending) {
                        antdMessage.warning('Status saved. Customer pages may take a moment to refresh.');
                    } else {
                        antdMessage.success('Temporary status is live.');
                    }
                } catch (err) {
                    // Revert optimistic update
                    if (!isExpectedScope(expectedTenantId, expectedStoreId)) return;
                    setStoreDetails((prev) => prev
                        && String(prev.tenantId) === String(expectedTenantId)
                        && String(prev.storeId) === String(expectedStoreId)
                        ? { ...prev, tempStatus: storedStatus }
                        : prev);
                    logBusinessSettingsFailure(
                        'desktop_temp_status_set_failed',
                        err,
                        buildTempStatusLogContext(storeDetails, 'set_temp_status', statusType),
                    );
                    setError('Failed to set status');
                } finally {
                    actionInFlightRef.current = false;
                    if (isExpectedScope(expectedTenantId, expectedStoreId)) setIsLoading(false);
                }
            },
        });
    }, [statusType, customMessage, expiresAt, setStoreDetails, storedStatus, storeDetails, formatter, isExpectedScope, resolveExpiryInstant]);

    const handleClear = useCallback(() => {
        const expectedTenantId = storeDetails.tenantId;
        const expectedStoreId = storeDetails.storeId;
        const prevStatus = storeDetails?.tempStatus;

        Modal.confirm({
            title: 'Clear customer status?',
            content: prevStatus?.message
                ? `Customers will no longer see "${prevStatus.message}" on your public page.`
                : 'Customers will no longer see the temporary status on your public page.',
            okText: 'Clear status',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                if (actionInFlightRef.current || !isExpectedScope(expectedTenantId, expectedStoreId)) return;
                actionInFlightRef.current = true;
                setIsLoading(true);
                setError(null);

                // Optimistic update
                setStoreDetails((prev) => {
                    if (!prev || String(prev.tenantId) !== String(expectedTenantId) || String(prev.storeId) !== String(expectedStoreId)) return prev;
                    const { tempStatus, ...rest } = prev || {};
                    return rest;
                });

                try {
                    const res = await fetch('/api/store/temp-status', {
                        ...AUTH_BROWSER_REQUEST_POLICY,
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'clear',
                            expectedStoreId: String(expectedStoreId),
                            expectedTenantId: String(expectedTenantId),
                        }),
                    });

                    const result = await readTempStatusResponse(res, 'clear', buildTempStatusLogContext(storeDetails, 'clear_temp_status', prevStatus?.type));
                    if (!isExpectedScope(expectedTenantId, expectedStoreId)) return;
                    if (result.effectsPending) {
                        antdMessage.warning('Status cleared. Customer pages may take a moment to refresh.');
                    } else {
                        antdMessage.success('Temporary status cleared.');
                    }
                } catch (err) {
                    // Revert optimistic update
                    if (!isExpectedScope(expectedTenantId, expectedStoreId)) return;
                    setStoreDetails((prev) => prev
                        && String(prev.tenantId) === String(expectedTenantId)
                        && String(prev.storeId) === String(expectedStoreId)
                        ? { ...prev, tempStatus: prevStatus }
                        : prev);
                    logBusinessSettingsFailure(
                        'desktop_temp_status_clear_failed',
                        err,
                        buildTempStatusLogContext(storeDetails, 'clear_temp_status', prevStatus?.type),
                    );
                    setError('Failed to clear status');
                } finally {
                    actionInFlightRef.current = false;
                    if (isExpectedScope(expectedTenantId, expectedStoreId)) setIsLoading(false);
                }
            },
        });
    }, [storeDetails, setStoreDetails, isExpectedScope]);

    const selectedOption = STATUS_OPTIONS.find(o => o.value === statusType);
    const previewMessage = statusType === 'custom'
        ? (customMessage.trim() || 'Temporary notice')
        : (selectedOption?.defaultMsg || statusType);
    const previewExpiryInstant = resolveExpiryInstant(expiresAt);
    const previewExpiry = previewExpiryInstant
        ? formatDateTime(previewExpiryInstant, 'datetime', formatter)
        : 'the selected time';

    return (
        <Card style={{ marginBottom: 16 }}>
            {/* Header */}
            <Flex align="center" gap={10} style={{ marginBottom: 16 }}>
                    <Flex
                        align="center" justify="center"
                        style={{ width: 38, height: 38, borderRadius: 10, background: token.colorWarningBg, flexShrink: 0 }}
                    >
                        <LuAlertTriangle size={18} style={{ color: token.colorWarningText }} />
                    </Flex>
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                    <Flex align="center" gap={8}>
                        <Text strong style={{ fontSize: 15 }}>Temporary Status</Text>
                        {isActive && <Tag color="warning">Active</Tag>}
                    </Flex>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        {isActive ? 'Customers see this banner on your public page' : 'Post a notice on your public page for customers'}
                    </Text>
                </Flex>
            </Flex>

            {currentStatus ? (
                <Flex vertical gap={12}>
                    <div style={{
                        background: token.colorWarningBg,
                        border: `1px solid ${token.colorWarningBorder}`,
                        borderRadius: 10,
                        padding: '14px 16px',
                    }}>
                        <Text strong style={{ fontSize: 15, color: token.colorWarningText }}>
                            {STATUS_OPTIONS.find(o => o.value === currentStatus.type)?.icon || 'ℹ️'}{' '}
                            {currentStatus.message}
                        </Text>
                        <Flex align="center" gap={6} style={{ marginTop: 6 }}>
                            <LuClock size={12} style={{ color: token.colorWarningText, flexShrink: 0 }} />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                Expires {formatDateTime(currentStatus.expiresAt, 'datetime', formatter)}
                            </Text>
                        </Flex>
                    </div>
                    <div>
                        <Button
                            danger
                            icon={<LuX size={14} />}
                            onClick={handleClear}
                            loading={isLoading}
                        >
                            Clear Status
                        </Button>
                    </div>
                </Flex>
            ) : (
                <Flex vertical gap={16}>
                    {/* Status type pills */}
                    <Flex gap={8} wrap="wrap">
                        {STATUS_OPTIONS.map((opt) => (
                            <Button
                                key={opt.value}
                                aria-pressed={statusType === opt.value}
                                onClick={() => setStatusType(opt.value)}
                                type={statusType === opt.value ? 'primary' : 'default'}
                                style={{
                                    background: statusType === opt.value ? token.colorWarning : token.colorBgContainer,
                                    borderColor: statusType === opt.value ? token.colorWarningText : token.colorBorderSecondary,
                                    borderRadius: 20,
                                    color: statusType === opt.value ? token.colorTextLightSolid : token.colorText,
                                    fontWeight: statusType === opt.value ? 600 : 400,
                                    minHeight: 38,
                                }}
                            >
                                {opt.icon} {opt.label}
                            </Button>
                        ))}
                    </Flex>

                    {statusType === 'custom' && (
                        <Input
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="e.g., Private event tonight"
                            maxLength={100}
                            showCount
                        />
                    )}

                    <Flex align="center" gap={12}>
                        <Flex vertical style={{ flex: 1 }}>
                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 4 }}>Expires at</Text>
                            <DatePicker
                                showTime
                                value={expiresAt}
                                onChange={(val) => setExpiresAt(val)}
                                format="MMM D, YYYY h:mm A"
                                disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
                                style={{ width: '100%' }}
                            />
                        </Flex>
                    </Flex>

                    <div style={{
                        background: token.colorWarningBg,
                        border: `1px solid ${token.colorWarningBorder}`,
                        borderRadius: 10,
                        padding: '12px 14px',
                    }}>
                        <Flex gap={4} vertical>
                            <Text strong>Customer preview</Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                Customers will see &quot;{previewMessage}&quot; until {previewExpiry}.
                            </Text>
                        </Flex>
                    </div>

                    {error && (
                        <Text type="danger" style={{ fontSize: 13 }}>{error}</Text>
                    )}

                    <Button
                        type="primary"
                        icon={<LuCheck size={15} />}
                        onClick={handleSet}
                        loading={isLoading}
                        size="large"
                        block
                        style={{ background: token.colorWarning, borderColor: token.colorWarning, color: token.colorTextLightSolid }}
                    >
                        Show to customers
                    </Button>
                </Flex>
            )}
        </Card>
    );
}
