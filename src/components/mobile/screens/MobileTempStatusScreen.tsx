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
import { formatDateTime, fromNativeDateTimeInputValue, toDate } from '@util/dateTime';
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Card, Dialog, DotLoading, Flex, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';
import { AUTH_BROWSER_REQUEST_POLICY } from '@lib/auth/browserRequestPolicy';
import { type TempStatusAction, readTempStatusResponse } from '@lib/tempStatus/clientResponse';
import { useActiveTempStatus } from '@hook/useActiveTempStatus';

interface MobileTempStatusScreenProps {
    onBack: () => void;
}

function buildMobileTempStatusLogContext(storeDetails: any, action: string, statusType?: unknown) {
    return {
        action,
        ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
        ...getBoundedMobileOwnerStringContext('statusType', statusType),
    };
}

function hasTempStatusResponseStatus(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('status' in error)) return false;
    return Number.isFinite(Number((error as { status?: unknown }).status));
}

function getTempStatusResponseCode(error: unknown): string | undefined {
    if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
    const code = (error as { code?: unknown }).code;
    if (code === undefined || code === null) return undefined;
    return String(code).slice(0, 64);
}

function getMobileTempStatusFailureCode(
    error: unknown,
    action: TempStatusAction,
): 'mobile_temp_status_set_failed' | 'mobile_temp_status_set_rejected' | 'mobile_temp_status_clear_failed' | 'mobile_temp_status_clear_rejected' {
    const isRejectedResponse = hasTempStatusResponseStatus(error)
        && getTempStatusResponseCode(error) !== 'TEMP_STATUS_RESPONSE_INVALID';

    if (action === 'set') {
        return isRejectedResponse
            ? 'mobile_temp_status_set_rejected'
            : 'mobile_temp_status_set_failed';
    }

    return isRejectedResponse
        ? 'mobile_temp_status_clear_rejected'
        : 'mobile_temp_status_clear_failed';
}

function MobileTempStatusScreenContent({ onBack }: MobileTempStatusScreenProps) {
    const t = useTranslations('MobileTempStatus');
    const formatter = useFormatter();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);

    const storedStatus = storeDetails?.tempStatus;
    const currentStatus = useActiveTempStatus(storedStatus);
    const isActive = Boolean(currentStatus);

    const [statusType, setStatusType] = useState<string>('closed_today');
    const [customMessage, setCustomMessage] = useState('');
    const [selectedExpiryHours, setSelectedExpiryHours] = useState<number | null>(24);
    const [exactExpiryAt, setExactExpiryAt] = useState<string>(() => getDefaultTempStatusDateTime(24));
    const [isLoading, setIsLoading] = useState(false);
    const isMountedRef = useRef(true);
    const tempStatusActionInFlightRef = useRef(false);
    const currentStoreScopeRef = useRef({
        storeId: storeDetails?.storeId,
        tenantId: storeDetails?.tenantId,
    });
    currentStoreScopeRef.current = {
        storeId: storeDetails?.storeId,
        tenantId: storeDetails?.tenantId,
    };
    const isExpectedStoreScope = useCallback((tenantId: unknown, storeId: unknown) => (
        isMountedRef.current
        && String(currentStoreScopeRef.current.tenantId ?? '') === String(tenantId ?? '')
        && String(currentStoreScopeRef.current.storeId ?? '') === String(storeId ?? '')
    ), []);

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const previewMessage = statusType === 'custom'
        ? (customMessage.trim() || 'Temporary notice')
        : (MOBILE_TEMP_STATUS_OPTIONS.find((option) => option.value === statusType)?.defaultMsg || statusType);

    const handleSet = useCallback(async () => {
        if (
            !storeDetails?.tenantId
            || !storeDetails?.storeId
            || tempStatusActionInFlightRef.current
        ) return;
        const sourceStoreDetails = storeDetails;
        const expectedTenantId = sourceStoreDetails.tenantId;
        const expectedStoreId = sourceStoreDetails.storeId;
        const expiresAt = fromNativeDateTimeInputValue(exactExpiryAt);
        const exactExpiryDate = toDate(expiresAt);
        if (!exactExpiryAt || Number.isNaN(exactExpiryDate.getTime()) || exactExpiryDate.getTime() <= Date.now()) {
            Toast.show({ content: 'Choose a future end date and time.', duration: 2000 });
            return;
        }

        const selectedOption = MOBILE_TEMP_STATUS_OPTIONS.find((option) => option.value === statusType);
        const message = statusType === 'custom'
            ? (customMessage.trim() || 'Temporary notice')
            : (selectedOption?.defaultMsg || statusType);

        const confirmed = await Dialog.confirm({
            title: 'Show this status to customers?',
            content: `Customers will see "${message}" until ${formatDateTime(expiresAt, 'datetime', formatter)}.`,
            confirmText: 'Show to customers',
            cancelText: 'Cancel',
        });
        if (
            !confirmed
            || tempStatusActionInFlightRef.current
            || !isExpectedStoreScope(expectedTenantId, expectedStoreId)
        ) return;

        tempStatusActionInFlightRef.current = true;
        setIsLoading(true);

        const newStatus = {
            type: statusType,
            message,
            expiresAt,
            createdAt: new Date().toISOString(),
        };
        const prevStatus = storedStatus;
        let optimisticStoreDetails: typeof storeDetails | undefined;
        setStoreDetails((prev: any) => {
            if (
                String(prev?.tenantId ?? '') !== String(expectedTenantId)
                || String(prev?.storeId ?? '') !== String(expectedStoreId)
                || prev?.tempStatus !== prevStatus
            ) return prev;
            optimisticStoreDetails = { ...prev, tempStatus: newStatus };
            return optimisticStoreDetails;
        });

        try {
            const res = await fetch('/api/store/temp-status', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'set',
                    type: statusType,
                    message: statusType === 'custom' ? customMessage.trim() : undefined,
                    expiresAt,
                }),
            });

            const result = await readTempStatusResponse(res, 'set', {
                ...buildMobileTempStatusLogContext(sourceStoreDetails, 'set_temp_status', statusType),
                ...getBoundedMobileOwnerStringContext('expiresAt', expiresAt),
                hasPreviousStatus: Boolean(prevStatus),
            });
            if (isExpectedStoreScope(expectedTenantId, expectedStoreId)) {
                Toast.show({
                    content: result.effectsPending ? 'Saved. Customer pages may take a moment to refresh.' : t('statusSet'),
                    icon: result.effectsPending ? undefined : 'success',
                    duration: result.effectsPending ? 2200 : 1500,
                });
            }
        } catch (error) {
            logMobileOwnerFailure(
                getMobileTempStatusFailureCode(error, 'set'),
                error,
                {
                    ...buildMobileTempStatusLogContext(sourceStoreDetails, 'set_temp_status', statusType),
                    ...getBoundedMobileOwnerStringContext('expiresAt', expiresAt),
                    hasPreviousStatus: Boolean(prevStatus),
                },
            );
            setStoreDetails((prev: any) => (
                prev === optimisticStoreDetails
                    ? { ...prev, tempStatus: prevStatus }
                    : prev
            ));
            if (isExpectedStoreScope(expectedTenantId, expectedStoreId)) {
                Toast.show({ content: t('failedToSet'), duration: 2000 });
            }
        } finally {
            tempStatusActionInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [exactExpiryAt, customMessage, formatter, isExpectedStoreScope, setStoreDetails, statusType, storedStatus, storeDetails, t]);

    const handleClear = useCallback(async () => {
        if (
            !storeDetails?.tenantId
            || !storeDetails?.storeId
            || tempStatusActionInFlightRef.current
        ) return;
        const sourceStoreDetails = storeDetails;
        const expectedTenantId = sourceStoreDetails.tenantId;
        const expectedStoreId = sourceStoreDetails.storeId;
        const prevStatus = storedStatus;
        const confirmed = await Dialog.confirm({
            title: 'Clear customer status?',
            content: prevStatus?.message
                ? `Customers will no longer see "${prevStatus.message}" on your public page.`
                : 'Customers will no longer see the temporary status on your public page.',
            confirmText: 'Clear status',
            cancelText: 'Cancel',
        });
        if (
            !confirmed
            || tempStatusActionInFlightRef.current
            || !isExpectedStoreScope(expectedTenantId, expectedStoreId)
        ) return;

        tempStatusActionInFlightRef.current = true;
        setIsLoading(true);

        let optimisticStoreDetails: typeof storeDetails | undefined;
        setStoreDetails((prev: any) => {
            if (
                String(prev?.tenantId ?? '') !== String(expectedTenantId)
                || String(prev?.storeId ?? '') !== String(expectedStoreId)
                || prev?.tempStatus !== prevStatus
            ) return prev;
            const { tempStatus, ...rest } = prev || {};
            optimisticStoreDetails = rest;
            return optimisticStoreDetails;
        });
        try {
            const res = await fetch('/api/store/temp-status', {
                ...AUTH_BROWSER_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'clear' }),
            });

            const result = await readTempStatusResponse(res, 'clear', {
                ...buildMobileTempStatusLogContext(sourceStoreDetails, 'clear_temp_status', prevStatus?.type),
                hasPreviousStatus: Boolean(prevStatus),
            });
            if (isExpectedStoreScope(expectedTenantId, expectedStoreId)) {
                Toast.show({
                    content: result.effectsPending ? 'Cleared. Customer pages may take a moment to refresh.' : t('statusCleared'),
                    icon: result.effectsPending ? undefined : 'success',
                    duration: result.effectsPending ? 2200 : 1500,
                });
            }
        } catch (error) {
            logMobileOwnerFailure(
                getMobileTempStatusFailureCode(error, 'clear'),
                error,
                {
                    ...buildMobileTempStatusLogContext(sourceStoreDetails, 'clear_temp_status', prevStatus?.type),
                    hasPreviousStatus: Boolean(prevStatus),
                },
            );
            setStoreDetails((prev: any) => (
                prev === optimisticStoreDetails
                    ? { ...prev, tempStatus: prevStatus }
                    : prev
            ));
            if (isExpectedStoreScope(expectedTenantId, expectedStoreId)) {
                Toast.show({ content: t('failedToClear'), duration: 2000 });
            }
        } finally {
            tempStatusActionInFlightRef.current = false;
            if (isMountedRef.current) {
                setIsLoading(false);
            }
        }
    }, [isExpectedStoreScope, setStoreDetails, storedStatus, storeDetails, t]);

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
                        isActive={isActive}
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

export default function MobileTempStatusScreen(props: MobileTempStatusScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${storeDetails?.tenantId || 'no-tenant'}::${storeDetails?.storeId || 'no-store'}`;

    return <MobileTempStatusScreenContent key={scopeKey} {...props} />;
}
