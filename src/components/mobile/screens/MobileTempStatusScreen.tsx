'use client'

/**
 * MobileTempStatusScreen — Mobile screen for setting/clearing temporary status
 *
 * Quick 2-tap flow: pick status type → set expiry → done.
 * Optimistic update pattern (UI updates instantly, backend syncs after).
 *
 * @see __docs__/temp-status-layer/temp-status-layer_impl.md
 */

import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuClock, LuX } from 'react-icons/lu';
import { Button, Card, DotLoading, Flex, Input, NavBar, Space, Tag, Text, Title, Toast } from '../antd';

interface MobileTempStatusScreenProps {
    onBack: () => void;
}

const STATUS_OPTIONS = [
    { value: 'closed_today', label: 'Closed Today', icon: '🔒', defaultMsg: 'Closed today' },
    { value: 'opening_late', label: 'Opening Late', icon: '🕐', defaultMsg: 'Opening late today' },
    { value: 'closing_early', label: 'Closing Early', icon: '🕕', defaultMsg: 'Closing early today' },
    { value: 'kitchen_closed', label: 'Kitchen Closed', icon: '🍳', defaultMsg: 'Kitchen is closed' },
    { value: 'special_menu', label: 'Special Menu', icon: '🍽️', defaultMsg: 'Special menu available today' },
    { value: 'custom', label: 'Custom', icon: 'ℹ️', defaultMsg: '' },
] as const;

const EXPIRY_OPTIONS = [
    { hours: 4, label: '4 hours' },
    { hours: 8, label: '8 hours' },
    { hours: 12, label: '12 hours' },
    { hours: 24, label: '24 hours' },
    { hours: 48, label: '2 days' },
];

export default function MobileTempStatusScreen({ onBack }: MobileTempStatusScreenProps) {
    const t = useTranslations('MobileTempStatus');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);

    const currentStatus = storeDetails?.tempStatus;
    const isActive = currentStatus && new Date(currentStatus.expiresAt).getTime() > Date.now();

    const [statusType, setStatusType] = useState<string>('closed_today');
    const [customMessage, setCustomMessage] = useState('');
    const [expiryHours, setExpiryHours] = useState<number>(24);
    const [isLoading, setIsLoading] = useState(false);

    const previewMessage = statusType === 'custom'
        ? (customMessage.trim() || 'Temporary notice')
        : (STATUS_OPTIONS.find((option) => option.value === statusType)?.defaultMsg || statusType);

    const handleSet = useCallback(async () => {
        setIsLoading(true);

        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
        const selectedOption = STATUS_OPTIONS.find((option) => option.value === statusType);
        const message = statusType === 'custom'
            ? (customMessage.trim() || 'Temporary notice')
            : (selectedOption?.defaultMsg || statusType);

        const newStatus = {
            type: statusType,
            message,
            expiresAt,
            createdAt: new Date().toISOString(),
        };
        const prevStatus = storeDetails?.tempStatus;
        setStoreDetails((prev: any) => ({ ...prev, tempStatus: newStatus }));
        Toast.show({ content: t('statusSet'), icon: 'success', duration: 1500 });

        try {
            const res = await fetch('/api/store/temp-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set',
                    type: statusType,
                    message: statusType === 'custom' ? customMessage.trim() : undefined,
                    expiresAt,
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to set status');
            }
        } catch {
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: t('failedToSet'), duration: 2000 });
        } finally {
            setIsLoading(false);
        }
    }, [customMessage, expiryHours, setStoreDetails, statusType, storeDetails?.tempStatus, t]);

    const handleClear = useCallback(async () => {
        setIsLoading(true);

        const prevStatus = storeDetails?.tempStatus;
        setStoreDetails((prev: any) => {
            const { tempStatus, ...rest } = prev;
            return rest;
        });
        Toast.show({ content: t('statusCleared'), icon: 'success', duration: 1500 });

        try {
            const res = await fetch('/api/store/temp-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' }),
            });

            if (!res.ok) {
                throw new Error('Failed to clear status');
            }
        } catch {
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: t('failedToClear'), duration: 2000 });
        } finally {
            setIsLoading(false);
        }
    }, [setStoreDetails, storeDetails?.tempStatus, t]);

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ height: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={onBack}>
                {t('title')}
            </NavBar>

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                {isActive ? (
                    <Card>
                        <Flex gap={16} vertical>
                            <Flex align="center" gap={8} wrap="wrap">
                                <LuAlertTriangle color="#d97706" size={16} />
                                <Text strong>{t('activeStatus')}</Text>
                                <Tag color="warning">Active</Tag>
                            </Flex>

                            <Card size="small" style={{ backgroundColor: '#fff7e6', borderColor: '#ffd591' }}>
                                <Flex gap={8} vertical>
                                    <Text strong>{`${STATUS_OPTIONS.find((option) => option.value === currentStatus.type)?.icon || 'ℹ️'} ${currentStatus.message}`}</Text>
                                    <Flex align="center" gap={6}>
                                        <LuClock color="#ad6800" size={12} />
                                        <Text type="secondary">{`${t('expires')} ${dayjs(currentStatus.expiresAt).format('MMM D, h:mm A')}`}</Text>
                                    </Flex>
                                </Flex>
                            </Card>

                            <Button
                                block
                                color="danger"
                                fill="outline"
                                loading={isLoading}
                                onClick={handleClear}
                                size="large"
                            >
                                <Flex align="center" gap={8} justify="center">
                                    <LuX size={14} />
                                    <Text>{t('clearStatus')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>
                ) : (
                    <>
                        <Card>
                            <Flex gap={16} vertical>
                                <Text type="secondary">{t('bannerNotice')}</Text>

                                <Flex gap={8} vertical>
                                    <Text strong>{t('statusType')}</Text>
                                    <Space size={[8, 8]} wrap>
                                        {STATUS_OPTIONS.map((option) => (
                                            <Tag
                                                key={option.value}
                                                color={statusType === option.value ? 'processing' : 'default'}
                                                onClick={() => setStatusType(option.value)}
                                                style={{ cursor: 'pointer', padding: '6px 12px' }}
                                            >
                                                {`${option.icon} ${option.label}`}
                                            </Tag>
                                        ))}
                                    </Space>
                                </Flex>

                                {statusType === 'custom' ? (
                                    <Flex gap={6} vertical>
                                        <Text strong>{t('customMessage')}</Text>
                                        <Input
                                            maxLength={100}
                                            onChange={setCustomMessage}
                                            placeholder={t('customPlaceholder')}
                                            value={customMessage}
                                        />
                                    </Flex>
                                ) : null}

                                <Flex gap={8} vertical>
                                    <Text strong>{t('expiresAfter')}</Text>
                                    <Space size={[8, 8]} wrap>
                                        {EXPIRY_OPTIONS.map((option) => (
                                            <Tag
                                                key={option.hours}
                                                color={expiryHours === option.hours ? 'processing' : 'default'}
                                                onClick={() => setExpiryHours(option.hours)}
                                                style={{ cursor: 'pointer', padding: '6px 12px' }}
                                            >
                                                {option.label}
                                            </Tag>
                                        ))}
                                    </Space>
                                </Flex>
                            </Flex>
                        </Card>

                        <Card>
                            <Flex gap={8} vertical>
                                <Text strong>{t('preview')}</Text>
                                <Card size="small" style={{ backgroundColor: '#fff7e6', borderColor: '#ffd591' }}>
                                    <Text strong>{`${STATUS_OPTIONS.find((option) => option.value === statusType)?.icon || 'ℹ️'} ${previewMessage}`}</Text>
                                </Card>
                            </Flex>
                        </Card>

                        <Button
                            block
                            color="warning"
                            loading={isLoading}
                            onClick={handleSet}
                            size="large"
                        >
                            <Flex align="center" gap={8} justify="center">
                                <LuCheck size={16} />
                                <Text>{t('setStatus')}</Text>
                            </Flex>
                        </Button>
                    </>
                )}
            </Flex>
        </Flex>
    );
}
