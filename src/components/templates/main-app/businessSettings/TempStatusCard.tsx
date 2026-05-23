'use client';

/**
 * TempStatusCard — Desktop Business Settings card for temporary status banners
 * 
 * Allows owner to set/clear temporary status ("Closed today", "Opening late", etc.)
 * on their public pages (OBP + digital menu) with auto-expiry.
 * 
 * @see __docs__/temp-status-layer/temp-status-layer_impl.md
 */

import { Button, Card, DatePicker, Flex, Input, Tag, Typography, theme } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuClock, LuX } from 'react-icons/lu';

const { Text } = Typography;

const STATUS_OPTIONS = [
    { value: 'closed_today', label: 'Closed Today', icon: '🔒', defaultMsg: 'Closed today' },
    { value: 'opening_late', label: 'Opening Late', icon: '🕐', defaultMsg: 'Opening late today' },
    { value: 'closing_early', label: 'Closing Early', icon: '🕕', defaultMsg: 'Closing early today' },
    { value: 'kitchen_closed', label: 'Kitchen Closed', icon: '🍳', defaultMsg: 'Kitchen is closed' },
    { value: 'special_menu', label: 'Special Menu', icon: '🍽️', defaultMsg: 'Special menu available today' },
    { value: 'custom', label: 'Custom Message', icon: 'ℹ️', defaultMsg: '' },
] as const;

interface TempStatusCardProps {
    storeDetails: any;
    setStoreDetails: (fn: (prev: any) => any) => void;
}

export default function TempStatusCard({ storeDetails, setStoreDetails }: TempStatusCardProps) {
    const { token } = theme.useToken();
    const currentStatus = storeDetails?.tempStatus;
    const isActive = currentStatus && new Date(currentStatus.expiresAt).getTime() > Date.now();

    const [statusType, setStatusType] = useState<string>('closed_today');
    const [customMessage, setCustomMessage] = useState('');
    const [expiresAt, setExpiresAt] = useState<dayjs.Dayjs | null>(dayjs().add(1, 'day').startOf('hour'));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSet = useCallback(async () => {
        if (!expiresAt) {
            setError('Please set an expiry time');
            return;
        }
        if (expiresAt.isBefore(dayjs())) {
            setError('Expiry must be in the future');
            return;
        }

        setIsLoading(true);
        setError(null);

        const selectedOption = STATUS_OPTIONS.find(o => o.value === statusType);
        const message = statusType === 'custom'
            ? (customMessage.trim() || 'Temporary notice')
            : (selectedOption?.defaultMsg || statusType);

        // Optimistic update
        const newStatus = {
            type: statusType,
            message,
            expiresAt: expiresAt.toISOString(),
            createdAt: new Date().toISOString(),
        };
        setStoreDetails((prev: any) => ({ ...prev, tempStatus: newStatus }));

        try {
            const res = await fetch('/api/store/temp-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set',
                    type: statusType,
                    message: statusType === 'custom' ? customMessage.trim() : undefined,
                    expiresAt: expiresAt.toISOString(),
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to set status');
            }
        } catch (err: any) {
            // Revert optimistic update
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: currentStatus }));
            setError(err.message || 'Failed to set status');
        } finally {
            setIsLoading(false);
        }
    }, [statusType, customMessage, expiresAt, setStoreDetails, currentStatus]);

    const handleClear = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        // Optimistic update
        const prevStatus = storeDetails?.tempStatus;
        setStoreDetails((prev: any) => {
            const { tempStatus, ...rest } = prev;
            return rest;
        });

        try {
            const res = await fetch('/api/store/temp-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to clear status');
            }
        } catch (err: any) {
            // Revert optimistic update
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            setError(err.message || 'Failed to clear status');
        } finally {
            setIsLoading(false);
        }
    }, [storeDetails, setStoreDetails]);

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

            {isActive ? (
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
                                Expires {dayjs(currentStatus.expiresAt).format('MMM D, YYYY [at] h:mm A')}
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
                            <Tag
                                key={opt.value}
                                color={statusType === opt.value ? 'warning' : 'default'}
                                onClick={() => setStatusType(opt.value)}
                                style={{
                                    cursor: 'pointer',
                                    padding: '6px 14px',
                                    fontSize: 13,
                                    borderRadius: 20,
                                    border: statusType === opt.value ? `1.5px solid ${token.colorWarningText}` : `1.5px solid ${token.colorBorderSecondary}`,
                                    fontWeight: statusType === opt.value ? 600 : 400,
                                    userSelect: 'none',
                                }}
                            >
                                {opt.icon} {opt.label}
                            </Tag>
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
                        Set Status
                    </Button>
                </Flex>
            )}
        </Card>
    );
}
