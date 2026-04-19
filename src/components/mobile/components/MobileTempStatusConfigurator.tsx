'use client'

import { theme } from 'antd';
import dayjs from 'dayjs';
import { LuAlertTriangle, LuCheck, LuClock, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Input, Space, Tag, Text, Toast } from '../antd';

export type TempStatusOption = {
    defaultMsg: string;
    icon: string;
    label: string;
    value: string;
};

export type TempStatusExpiryOption = {
    hours: number;
    label: string;
};

export const MOBILE_TEMP_STATUS_OPTIONS: TempStatusOption[] = [
    { value: 'closed_today', label: 'Closed Today', icon: '🔒', defaultMsg: 'Closed today' },
    { value: 'opening_late', label: 'Opening Late', icon: '🕐', defaultMsg: 'Opening late today' },
    { value: 'closing_early', label: 'Closing Early', icon: '🕕', defaultMsg: 'Closing early today' },
    { value: 'kitchen_closed', label: 'Kitchen Closed', icon: '🍳', defaultMsg: 'Kitchen is closed' },
    { value: 'special_menu', label: 'Special Menu', icon: '🍽️', defaultMsg: 'Special menu available today' },
    { value: 'custom', label: 'Custom', icon: 'ℹ️', defaultMsg: '' },
];

export const MOBILE_TEMP_STATUS_EXPIRY_OPTIONS: TempStatusExpiryOption[] = [
    { hours: 2, label: '2 hours' },
    { hours: 4, label: '4 hours' },
    { hours: 8, label: '8 hours' },
    { hours: 12, label: '12 hours' },
    { hours: 24, label: '24 hours' },
    { hours: 48, label: '2 days' },
];

export function getDefaultTempStatusDateTime(hoursFromNow: number): string {
    const date = new Date(Date.now() + (hoursFromNow * 60 * 60 * 1000));
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return date.toISOString().slice(0, 16);
}

function getMinTempStatusDateTime(): string {
    const date = new Date();
    date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
    return date.toISOString().slice(0, 16);
}

type ActiveStatus = {
    expiresAt: string;
    message?: string;
    type: string;
};

interface MobileTempStatusConfiguratorProps {
    activeStatusLabel: string;
    activeTagLabel?: string;
    bannerNotice?: string;
    clearStatusLabel: string;
    exactExpiryAt: string;
    exactExpiryLabel: string;
    currentStatus?: ActiveStatus | null;
    customMessage: string;
    customMessageLabel: string;
    customPlaceholder: string;
    expiryLabel: string;
    expiresLabel: string;
    selectedExpiryHours: number | null;
    isActive: boolean;
    isLoading: boolean;
    onClear: () => void;
    onExactExpiryAtChange: (value: string) => void;
    onCustomMessageChange: (value: string) => void;
    onExpiryHoursChange: (value: number) => void;
    onSet: () => void;
    onStatusTypeChange: (value: string) => void;
    previewLabel: string;
    previewMessage: string;
    setStatusLabel: string;
    showActiveHeader?: boolean;
    statusOptions?: TempStatusOption[];
    statusType: string;
    statusTypeLabel: string;
    expiryOptions?: TempStatusExpiryOption[];
}

export default function MobileTempStatusConfigurator({
    activeStatusLabel,
    activeTagLabel = 'Active',
    bannerNotice,
    clearStatusLabel,
    exactExpiryAt,
    exactExpiryLabel,
    currentStatus,
    customMessage,
    customMessageLabel,
    customPlaceholder,
    expiryLabel,
    expiresLabel,
    selectedExpiryHours,
    isActive,
    isLoading,
    onClear,
    onExactExpiryAtChange,
    onCustomMessageChange,
    onExpiryHoursChange,
    onSet,
    onStatusTypeChange,
    previewLabel,
    previewMessage,
    setStatusLabel,
    showActiveHeader = true,
    statusOptions = MOBILE_TEMP_STATUS_OPTIONS,
    statusType,
    statusTypeLabel,
    expiryOptions = MOBILE_TEMP_STATUS_EXPIRY_OPTIONS,
}: MobileTempStatusConfiguratorProps) {
    const { token } = theme.useToken();
    const minExpiryAt = getMinTempStatusDateTime();

    if (isActive && currentStatus) {
        return (
            <Flex gap={16} vertical>
                {showActiveHeader ? (
                    <Flex align="center" gap={8} wrap="wrap">
                        <LuAlertTriangle color={token.colorWarning} size={16} />
                        <Text strong>{activeStatusLabel}</Text>
                        <Tag color="warning">{activeTagLabel}</Tag>
                    </Flex>
                ) : null}

                <Card
                    size="small"
                    style={{
                        backgroundColor: token.colorWarningBg,
                        borderColor: token.colorWarningBorder,
                    }}
                >
                    <Flex gap={8} vertical>
                        <Text strong>{`${statusOptions.find((option) => option.value === currentStatus.type)?.icon || 'ℹ️'} ${currentStatus.message || 'Temporary notice'}`}</Text>
                        <Flex align="center" gap={6}>
                            <LuClock color={token.colorWarningText} size={12} />
                            <Text type="secondary">{`${expiresLabel} ${dayjs(currentStatus.expiresAt).format('MMM D, h:mm A')}`}</Text>
                        </Flex>
                    </Flex>
                </Card>

                <Button
                    block
                    color="danger"
                    fill="outline"
                    loading={isLoading}
                    onClick={onClear}
                    size="large"
                >
                    <Flex align="center" gap={8} justify="center">
                        <LuX size={14} />
                        <Text>{clearStatusLabel}</Text>
                    </Flex>
                </Button>
            </Flex>
        );
    }

    return (
        <Flex gap={16} vertical>
            {bannerNotice ? <Text type="secondary">{bannerNotice}</Text> : null}

            <Flex gap={8} vertical>
                <Text strong>{statusTypeLabel}</Text>
                <Space size={[8, 8]} wrap>
                    {statusOptions.map((option) => (
                        <Tag
                            key={option.value}
                            color={statusType === option.value ? 'processing' : 'default'}
                            onClick={() => onStatusTypeChange(option.value)}
                            style={{ cursor: 'pointer', padding: '6px 12px' }}
                        >
                            {`${option.icon} ${option.label}`}
                        </Tag>
                    ))}
                </Space>
            </Flex>

            {statusType === 'custom' ? (
                <Flex gap={6} vertical>
                    <Text strong>{customMessageLabel}</Text>
                    <Input
                        maxLength={100}
                        onChange={onCustomMessageChange}
                        placeholder={customPlaceholder}
                        value={customMessage}
                    />
                </Flex>
            ) : null}

            <Flex gap={10} vertical>
                <Text strong>{expiryLabel}</Text>
                <Flex gap={8} wrap="wrap">
                    {expiryOptions.map((option) => (
                        <Tag
                            key={option.hours}
                            color={selectedExpiryHours === option.hours ? 'processing' : 'default'}
                            onClick={() => onExpiryHoursChange(option.hours)}
                            style={{ cursor: 'pointer', padding: '6px 12px' }}
                        >
                            {option.label}
                        </Tag>
                    ))}
                    <div style={{ flex: '0 0 auto', width: 'max-content', maxWidth: '100%' }}>
                        <input
                            min={minExpiryAt}
                            onChange={(event) => onExactExpiryAtChange(event.target.value)}
                            style={{
                                backgroundColor: token.colorBgContainer,
                                border: `1px solid ${token.colorBorder}`,
                                borderRadius: 8,
                                color: token.colorText,
                                font: 'inherit',
                                maxWidth: '100%',
                                minHeight: 36,
                                padding: '0 12px',
                                width: 'max-content',
                            }}
                            type="datetime-local"
                            value={exactExpiryAt}
                        />
                    </div>
                </Flex>
            </Flex>

            <Flex gap={8} vertical>
                <Text strong>{previewLabel}</Text>
                <Card size="small" style={{ backgroundColor: token.colorWarningBg, borderColor: token.colorWarningBorder }}>
                    <Flex align="center" justify="center">
                        <Text strong style={{ textAlign: 'center' }}>
                            {`${statusOptions.find((option) => option.value === statusType)?.icon || 'ℹ️'} ${previewMessage}`}
                        </Text>
                    </Flex>
                </Card>
            </Flex>

            <Button block color="warning" loading={isLoading} onClick={onSet} size="large">
                <Flex align="center" gap={8} justify="center">
                    <LuCheck size={16} />
                    <Text>{setStatusLabel}</Text>
                </Flex>
            </Button>
        </Flex>
    );
}
