'use client'

/**
 * MobileTempStatusScreen — Mobile screen for setting/clearing temporary status
 *
 * Quick 2-tap flow: pick status type → set expiry → done.
 * Optimistic update pattern (UI updates instantly, backend syncs after).
 *
 * @see __docs__/temp-status-layer/temp-status-layer_impl.md
 */

import {
    MOBILE_TEMP_STATUS_EXPIRY_OPTIONS,
    MOBILE_TEMP_STATUS_OPTIONS,
    getDefaultTempStatusDateTime,
    default as MobileTempStatusConfigurator,
} from '../components/MobileTempStatusConfigurator';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { Card, DotLoading, Flex, NavBar, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileTempStatusScreenProps {
    onBack: () => void;
}

export default function MobileTempStatusScreen({ onBack }: MobileTempStatusScreenProps) {
    const t = useTranslations('MobileTempStatus');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);

    const currentStatus = storeDetails?.tempStatus;
    const isActive = currentStatus && new Date(currentStatus.expiresAt).getTime() > Date.now();

    const [statusType, setStatusType] = useState<string>('closed_today');
    const [customMessage, setCustomMessage] = useState('');
    const [selectedExpiryHours, setSelectedExpiryHours] = useState<number | null>(24);
    const [exactExpiryAt, setExactExpiryAt] = useState<string>(() => getDefaultTempStatusDateTime(24));
    const [isLoading, setIsLoading] = useState(false);

    const previewMessage = statusType === 'custom'
        ? (customMessage.trim() || 'Temporary notice')
        : (MOBILE_TEMP_STATUS_OPTIONS.find((option) => option.value === statusType)?.defaultMsg || statusType);

    const handleSet = useCallback(async () => {
        setIsLoading(true);

        const exactExpiryDate = new Date(exactExpiryAt);
        if (!exactExpiryAt || Number.isNaN(exactExpiryDate.getTime()) || exactExpiryDate.getTime() <= Date.now()) {
            Toast.show({ content: 'Choose a future end date and time.', duration: 2000 });
            setIsLoading(false);
            return;
        }

        const expiresAt = exactExpiryDate.toISOString();
        const selectedOption = MOBILE_TEMP_STATUS_OPTIONS.find((option) => option.value === statusType);
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
    }, [exactExpiryAt, customMessage, setStoreDetails, statusType, storeDetails?.tempStatus, t]);

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
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                title={t('title')}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <Card>
                    <MobileTempStatusConfigurator
                        activeStatusLabel={t('activeStatus')}
                        activeTagLabel="Active"
                        bannerNotice={isActive ? undefined : t('bannerNotice')}
                        clearStatusLabel={t('clearStatus')}
                        exactExpiryAt={exactExpiryAt}
                        exactExpiryLabel="Ends At"
                        currentStatus={currentStatus}
                        customMessage={customMessage}
                        customMessageLabel={t('customMessage')}
                        customPlaceholder={t('customPlaceholder')}
                        expiryLabel={t('expiresAfter')}
                        expiresLabel={t('expires')}
                        expiryOptions={MOBILE_TEMP_STATUS_EXPIRY_OPTIONS}
                        isActive={Boolean(isActive)}
                        isLoading={isLoading}
                        onClear={() => void handleClear()}
                        onExactExpiryAtChange={(value) => {
                            setExactExpiryAt(value);
                            setSelectedExpiryHours(null);
                        }}
                        onCustomMessageChange={setCustomMessage}
                        onExpiryHoursChange={(value) => {
                            setSelectedExpiryHours(value);
                            setExactExpiryAt(getDefaultTempStatusDateTime(value));
                        }}
                        onSet={() => void handleSet()}
                        onStatusTypeChange={setStatusType}
                        previewLabel={t('preview')}
                        previewMessage={previewMessage}
                        selectedExpiryHours={selectedExpiryHours}
                        setStatusLabel={t('setStatus')}
                        statusOptions={MOBILE_TEMP_STATUS_OPTIONS}
                        statusType={statusType}
                        statusTypeLabel={t('statusType')}
                    />
                </Card>
            </Flex>
        </Flex>
    );
}
