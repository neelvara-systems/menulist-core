'use client';

/**
 * TempStatusCard — Desktop Business Settings card for temporary status banners
 * 
 * Allows owner to set/clear temporary status ("Closed today", "Opening late", etc.)
 * on their public pages (OBP + digital menu) with auto-expiry.
 * 
 * @see __docs__/temp-status-layer/temp-status-layer_impl.md
 */

import { Button, Card, DatePicker, Input, Radio, Space, Tag, Typography } from 'antd';
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
        <Card
            size="small"
            style={{ marginBottom: 16 }}
            title={
                <Space>
                    <LuAlertTriangle size={16} style={{ color: '#faad14' }} />
                    <span>Temporary Status</span>
                    {isActive && (
                        <Tag color="warning" style={{ marginLeft: 8 }}>Active</Tag>
                    )}
                </Space>
            }
        >
            {isActive ? (
                <div>
                    <div style={{
                        background: '#fff8e1',
                        border: '1px solid #ffe082',
                        borderRadius: 8,
                        padding: '12px 16px',
                        marginBottom: 12,
                    }}>
                        <Text strong style={{ color: '#6d4c00' }}>
                            {STATUS_OPTIONS.find(o => o.value === currentStatus.type)?.icon || 'ℹ️'}{' '}
                            {currentStatus.message}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            <LuClock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            Expires: {dayjs(currentStatus.expiresAt).format('MMM D, YYYY h:mm A')}
                        </Text>
                    </div>
                    <Button
                        danger
                        icon={<LuX size={14} />}
                        onClick={handleClear}
                        loading={isLoading}
                        size="small"
                    >
                        Clear Status
                    </Button>
                </div>
            ) : (
                <div>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }}>
                        Set a temporary notice on your public page. Customers will see a banner until it expires.
                    </Text>

                    <Space direction="vertical" style={{ width: '100%' }} size={12}>
                        <div>
                            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Status Type</Text>
                            <Radio.Group
                                value={statusType}
                                onChange={(e) => setStatusType(e.target.value)}
                                optionType="button"
                                buttonStyle="solid"
                                size="small"
                            >
                                {STATUS_OPTIONS.map((opt) => (
                                    <Radio.Button key={opt.value} value={opt.value}>
                                        {opt.icon} {opt.label}
                                    </Radio.Button>
                                ))}
                            </Radio.Group>
                        </div>

                        {statusType === 'custom' && (
                            <div>
                                <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Message</Text>
                                <Input
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    placeholder="e.g., Private event tonight"
                                    maxLength={100}
                                    showCount
                                    size="small"
                                />
                            </div>
                        )}

                        <div>
                            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>Expires At</Text>
                            <DatePicker
                                showTime
                                value={expiresAt}
                                onChange={(val) => setExpiresAt(val)}
                                format="MMM D, YYYY h:mm A"
                                size="small"
                                disabledDate={(current) => current && current.isBefore(dayjs(), 'day')}
                                style={{ width: '100%' }}
                            />
                        </div>

                        {error && (
                            <Text type="danger" style={{ fontSize: 12 }}>{error}</Text>
                        )}

                        <Button
                            type="primary"
                            icon={<LuCheck size={14} />}
                            onClick={handleSet}
                            loading={isLoading}
                            size="small"
                            style={{ background: '#faad14', borderColor: '#faad14' }}
                        >
                            Set Status
                        </Button>
                    </Space>
                </div>
            )}
        </Card>
    );
}
