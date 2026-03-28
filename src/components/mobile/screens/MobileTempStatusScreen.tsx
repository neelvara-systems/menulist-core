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
import { Button, Card, DotLoading, Input, NavBar, Space, Tag, Toast } from 'antd-mobile';
import dayjs from 'dayjs';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuAlertTriangle, LuCheck, LuClock, LuX } from 'react-icons/lu';

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

export default function MobileTempStatusScreen({ onBack }: MobileTempStatusScreenProps) {
    const t = useTranslations('MobileTempStatus');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);

    const currentStatus = storeDetails?.tempStatus;
    const isActive = currentStatus && new Date(currentStatus.expiresAt).getTime() > Date.now();

    const [statusType, setStatusType] = useState<string>('closed_today');
    const [customMessage, setCustomMessage] = useState('');
    const [expiryHours, setExpiryHours] = useState<number>(24);
    const [isLoading, setIsLoading] = useState(false);

    const handleSet = useCallback(async () => {
        setIsLoading(true);

        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
        const selectedOption = STATUS_OPTIONS.find(o => o.value === statusType);
        const message = statusType === 'custom'
            ? (customMessage.trim() || 'Temporary notice')
            : (selectedOption?.defaultMsg || statusType);

        // Optimistic update
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
            // Revert optimistic update
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: t('failedToSet'), duration: 2000 });
        } finally {
            setIsLoading(false);
        }
    }, [statusType, customMessage, expiryHours, storeDetails, setStoreDetails]);

    const handleClear = useCallback(async () => {
        setIsLoading(true);

        // Optimistic update
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
            // Revert optimistic update
            setStoreDetails((prev: any) => ({ ...prev, tempStatus: prevStatus }));
            Toast.show({ content: t('failedToClear'), duration: 2000 });
        } finally {
            setIsLoading(false);
        }
    }, [storeDetails, setStoreDetails]);

    if (!storeDetails) {
        return (
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} className="border-b border-gray-200 dark:border-gray-700">
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-4">
                {/* Current Status */}
                {isActive ? (
                    <Card className="rounded-xl">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <LuAlertTriangle size={16} className="text-amber-500" />
                                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    {t('activeStatus')}
                                </span>
                                <Tag color="warning" fill="outline" style={{ fontSize: 11 }}>Active</Tag>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-sm font-medium text-amber-900">
                                    {STATUS_OPTIONS.find(o => o.value === currentStatus.type)?.icon || 'ℹ️'}{' '}
                                    {currentStatus.message}
                                </p>
                                <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                                    <LuClock size={11} />
                                    {t('expires')} {dayjs(currentStatus.expiresAt).format('MMM D, h:mm A')}
                                </p>
                            </div>

                            <Button
                                block
                                color="danger"
                                fill="outline"
                                size="middle"
                                loading={isLoading}
                                onClick={handleClear}
                                style={{ minHeight: '44px' }}
                            >
                                <span className="flex items-center justify-center gap-2">
                                    <LuX size={14} />
                                    {t('clearStatus')}
                                </span>
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Set New Status */}
                        <Card className="rounded-xl">
                            <div className="space-y-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {t('bannerNotice')}
                                </p>

                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
                                        {t('statusType')}
                                    </label>
                                    <Space wrap>
                                        {STATUS_OPTIONS.map((opt) => (
                                            <Tag
                                                key={opt.value}
                                                color={statusType === opt.value ? 'primary' : 'default'}
                                                fill={statusType === opt.value ? 'solid' : 'outline'}
                                                onClick={() => setStatusType(opt.value)}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '6px 12px',
                                                    fontSize: 13,
                                                    minHeight: 36,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {opt.icon} {opt.label}
                                            </Tag>
                                        ))}
                                    </Space>
                                </div>

                                {statusType === 'custom' && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                                            {t('customMessage')}
                                        </label>
                                        <Input
                                            value={customMessage}
                                            onChange={(val) => setCustomMessage(val)}
                                            placeholder={t('customPlaceholder')}
                                            maxLength={100}
                                            style={{ '--font-size': '14px' } as React.CSSProperties}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
                                        {t('expiresAfter')}
                                    </label>
                                    <Space wrap>
                                        {[
                                            { hours: 4, label: '4 hours' },
                                            { hours: 8, label: '8 hours' },
                                            { hours: 12, label: '12 hours' },
                                            { hours: 24, label: '24 hours' },
                                            { hours: 48, label: '2 days' },
                                        ].map((opt) => (
                                            <Tag
                                                key={opt.hours}
                                                color={expiryHours === opt.hours ? 'primary' : 'default'}
                                                fill={expiryHours === opt.hours ? 'solid' : 'outline'}
                                                onClick={() => setExpiryHours(opt.hours)}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '6px 12px',
                                                    fontSize: 13,
                                                    minHeight: 36,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                }}
                                            >
                                                {opt.label}
                                            </Tag>
                                        ))}
                                    </Space>
                                </div>
                            </div>
                        </Card>

                        {/* Preview */}
                        <Card className="rounded-xl">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                    {t('preview')}
                                </label>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                                    <p className="text-sm font-medium text-amber-900">
                                        {STATUS_OPTIONS.find(o => o.value === statusType)?.icon || 'ℹ️'}{' '}
                                        {statusType === 'custom'
                                            ? (customMessage.trim() || 'Temporary notice')
                                            : STATUS_OPTIONS.find(o => o.value === statusType)?.defaultMsg
                                        }
                                    </p>
                                </div>
                            </div>
                        </Card>

                        {/* Set Button */}
                        <Button
                            block
                            color="warning"
                            fill="solid"
                            size="large"
                            loading={isLoading}
                            onClick={handleSet}
                            style={{ minHeight: '44px' }}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <LuCheck size={16} />
                                {t('setStatus')}
                            </span>
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
