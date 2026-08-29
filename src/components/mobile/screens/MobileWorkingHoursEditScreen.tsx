'use client'

import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { getStoreDeepDifference } from '@lib/store/storeNestedUpdateProjection';
import { isValidClockRange } from '@lib/menu/timeSlotPresetBoundary';
import { parseWorkingHoursRanges } from '@lib/hours/hoursEngine';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button, Card, Dialog, DotLoading, Flex, Input, NavBar, Switch, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { MOBILE_BOTTOM_NAV_CLEARANCE } from '../MobileNavigation';
import MobileSpecialHoursManager from '../components/MobileSpecialHoursManager';
import {
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobileWorkingHoursEditScreenProps {
    onBack: () => void;
}

const DAYS = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
];

type DaySchedule = {
    close: string;
    isClosed: boolean;
    open: string;
};

const parseDayValue = (value: string | undefined): DaySchedule => {
    const range = parseWorkingHoursRanges(value)[0];
    if (!range) {
        return { close: '22:00', isClosed: true, open: '09:00' };
    }
    return {
        close: range.endTime,
        isClosed: false,
        open: range.startTime,
    };
};

const serializeDay = (schedule: DaySchedule) => schedule.isClosed ? '' : `${schedule.open}-${schedule.close}`;

const buildSchedule = (workingHours?: Record<string, string>): Record<string, DaySchedule> => {
    const result: Record<string, DaySchedule> = {};
    DAYS.forEach(({ key }) => {
        result[key] = parseDayValue(workingHours?.[key]);
    });
    return result;
};

function MobileWorkingHoursEditScreenContent({ onBack }: MobileWorkingHoursEditScreenProps) {
    const t = useTranslations('MobileWorkingHoursEdit');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(() => buildSchedule(storeDetails?.workingHours));
    const [originalSchedule, setOriginalSchedule] = useState<Record<string, DaySchedule>>(() => buildSchedule(storeDetails?.workingHours));
    const scopeKey = `${String(storeDetails?.tenantId ?? '')}::${String(storeDetails?.storeId ?? '')}`;
    const activeScopeRef = useRef(scopeKey);
    const componentActiveRef = useRef(true);
    const actionInFlightRef = useRef(false);
    activeScopeRef.current = scopeKey;

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);

    useEffect(() => {
        const next = buildSchedule(storeDetails?.workingHours);
        setSchedule(next);
        setOriginalSchedule(next);
    }, [storeDetails?.storeId, storeDetails?.workingHours]);

    const allDaysTemplate = DAYS.reduce<DaySchedule | null>((found, { key }) => {
        if (found) return found;
        return schedule[key]?.isClosed ? null : schedule[key];
    }, null) || { open: '09:00', close: '22:00', isClosed: false };
    const isDirty = DAYS.some(
        ({ key }) => serializeDay(schedule[key]) !== serializeDay(originalSchedule[key]),
    );

    const saveWorkingHours = useCallback(async () => {
        const expectedStoreId = Number(storeDetails?.storeId);
        const expectedTenantId = Number(storeDetails?.tenantId);
        const requestScopeKey = scopeKey;
        if (
            !componentActiveRef.current
            || !storeDetails
            || activeScopeRef.current !== requestScopeKey
            || actionInFlightRef.current
            || !Number.isSafeInteger(expectedStoreId)
            || expectedStoreId <= 0
            || !Number.isSafeInteger(expectedTenantId)
            || expectedTenantId <= 0
        ) return;

        actionInFlightRef.current = true;
        setIsSaving(true);
        const previousWorkingHours = { ...(storeDetails.workingHours || {}) };
        const previousHoursLastUpdatedAt = (storeDetails as any).hoursLastUpdatedAt;
        const submittedSchedule = Object.fromEntries(
            Object.entries(schedule).map(([key, value]) => [key, { ...value }]),
        ) as Record<string, DaySchedule>;
        const workingHours: Record<string, string> = { ...previousWorkingHours };
        DAYS.forEach(({ key }) => {
            const serialized = serializeDay(submittedSchedule[key]);
            if (serialized === serializeDay(originalSchedule[key])) return;
            if (serialized) workingHours[key] = serialized;
            else delete workingHours[key];
        });
        const hoursLastUpdatedAt = new Date().toISOString();

        setStoreDetails((previous: any) => (
            String(previous?.tenantId ?? '') === String(expectedTenantId)
            && String(previous?.storeId ?? '') === String(expectedStoreId)
                ? { ...previous, hoursLastUpdatedAt, workingHours }
                : previous
        ));

        try {
            const writeResult = await updateStore({
                hoursLastUpdatedAt,
                storeId: expectedStoreId,
                tenantId: expectedTenantId,
                workingHours: getStoreDeepDifference(workingHours, previousWorkingHours, {
                    detectRemovedRootKeys: true,
                }),
            });
            assertStoreUpdateSucceeded(
                writeResult,
                expectedStoreId,
                'mobile_working_hours_store_update_rejected',
            );
            if (!componentActiveRef.current || activeScopeRef.current !== requestScopeKey) return;
            setOriginalSchedule(submittedSchedule);
            Toast.show({ content: t('hoursSaved'), duration: 1000 });
        } catch (error) {
            logMobileOwnerFailure('mobile_working_hours_save_failed', error, {
                ...getMobileOwnerStoreLogContext(expectedStoreId, expectedTenantId),
                changedDayCount: DAYS.filter(({ key }) => serializeDay(submittedSchedule[key]) !== (previousWorkingHours[key] || '')).length,
                closedDayCount: DAYS.filter(({ key }) => submittedSchedule[key]?.isClosed).length,
                hasPreviousWorkingHours: Object.keys(previousWorkingHours).length > 0,
            });
            setStoreDetails((previous: any) => (
                String(previous?.tenantId ?? '') === String(expectedTenantId)
                && String(previous?.storeId ?? '') === String(expectedStoreId)
                && previous?.hoursLastUpdatedAt === hoursLastUpdatedAt
                    ? {
                        ...previous,
                        hoursLastUpdatedAt: previousHoursLastUpdatedAt,
                        workingHours: previousWorkingHours,
                    }
                    : previous
            ));
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                Toast.show({ content: t('failedToSave'), duration: 2000 });
            }
        } finally {
            actionInFlightRef.current = false;
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                setIsSaving(false);
            }
        }
    }, [originalSchedule, schedule, scopeKey, setStoreDetails, storeDetails, t]);

    const handleSave = useCallback(() => {
        if (!storeDetails?.storeId) return;

        for (const { key } of DAYS) {
            const daySchedule = schedule[key];
            if (daySchedule.isClosed) continue;

            if (!isValidClockRange(daySchedule.open, daySchedule.close)) {
                Toast.show({ content: 'Open and close times must be valid and different.', duration: 1800 });
                return;
            }
        }

        const changedDays = DAYS
            .filter(({ key }) => serializeDay(schedule[key]) !== serializeDay(originalSchedule[key]))
            .map(({ label }) => label);

        void Dialog.confirm({
            cancelText: 'Cancel',
            confirmText: 'Publish hours',
            content: changedDays.length
                ? `Customers will see the new regular hours for ${changedDays.join(', ')} from now on.`
                : 'Customers will see these regular hours from now on.',
            onConfirm: saveWorkingHours,
            title: 'Publish regular hours?',
        });
    }, [originalSchedule, saveWorkingHours, schedule, storeDetails?.storeId]);

    const handleReset = useCallback(() => {
        setSchedule(originalSchedule);
    }, [originalSchedule]);

    const handleApplyAllDaysHours = useCallback(() => {
        setSchedule((previous) => {
            const next: Record<string, DaySchedule> = {};
            DAYS.forEach(({ key }) => {
                next[key] = { ...previous[key], close: allDaysTemplate.close, isClosed: false, open: allDaysTemplate.open };
            });
            return next;
        });
        Toast.show({ content: t('copiedToAllDays'), duration: 1200 });
    }, [allDaysTemplate.close, allDaysTemplate.open, t]);

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                title={t('title')}
            />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card>
                    <Flex gap={4} vertical>
                        <Text strong>Regular weekly hours</Text>
                        <Text type="secondary">
                            These repeat every week. Use Special hours below for a planned date, or Temporary Status for a live interruption.
                        </Text>
                    </Flex>
                </Card>

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Text strong>{t('setSameHoursAllDays')}</Text>
                            <Button fill="none" onClick={handleApplyAllDaysHours} size="small">
                                {t('applyToAllDays')}
                            </Button>
                        </Flex>
                        <Flex gap={8}>
                            <Input
                                aria-label={`${t('setSameHoursAllDays')}: ${t('selectOpeningTime')}`}
                                onChange={(value) => setSchedule((previous) => {
                                    const next: Record<string, DaySchedule> = {};
                                    DAYS.forEach(({ key }) => {
                                        next[key] = { ...previous[key], open: value };
                                    });
                                    return next;
                                })}
                                type="time"
                                value={allDaysTemplate.open}
                            />
                            <Input
                                aria-label={`${t('setSameHoursAllDays')}: ${t('selectClosingTime')}`}
                                onChange={(value) => setSchedule((previous) => {
                                    const next: Record<string, DaySchedule> = {};
                                    DAYS.forEach(({ key }) => {
                                        next[key] = { ...previous[key], close: value };
                                    });
                                    return next;
                                })}
                                type="time"
                                value={allDaysTemplate.close}
                            />
                        </Flex>
                        <Text type="secondary">{t('allDaysHelper')}</Text>
                    </Flex>
                </Card>

                {DAYS.map(({ key, label }) => {
                    const day = schedule[key];
                    const localizedDayLabel = t(key);
                    return (
                        <Card key={key}>
                            <Flex gap={12} vertical>
                                <Flex align="center" justify="space-between">
                                    <Text strong>{localizedDayLabel || label}</Text>
                                    <Flex align="center" gap={8}>
                                        <Text style={{ color: day.isClosed ? token.colorError : token.colorSuccess }}>
                                            {day.isClosed ? t('closed') : t('open')}
                                        </Text>
                                        <Switch aria-label={`${localizedDayLabel || label}: ${t('open')}`} checked={!day.isClosed} onChange={() => setSchedule((previous) => ({ ...previous, [key]: { ...previous[key], isClosed: !previous[key].isClosed } }))} />
                                    </Flex>
                                </Flex>
                                {!day.isClosed ? (
                                    <Flex gap={8}>
                                        <Input
                                            aria-label={`${localizedDayLabel || label}: ${t('selectOpeningTime')}`}
                                            onChange={(value) => setSchedule((previous) => ({
                                                ...previous,
                                                [key]: { ...previous[key], open: value },
                                            }))}
                                            type="time"
                                            value={day.open}
                                        />
                                        <Input
                                            aria-label={`${localizedDayLabel || label}: ${t('selectClosingTime')}`}
                                            onChange={(value) => setSchedule((previous) => ({
                                                ...previous,
                                                [key]: { ...previous[key], close: value },
                                            }))}
                                            type="time"
                                            value={day.close}
                                        />
                                    </Flex>
                                ) : null}
                            </Flex>
                        </Card>
                    );
                })}

                <MobileSpecialHoursManager />

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        bottom: MOBILE_BOTTOM_NAV_CLEARANCE,
                        marginInline: -16,
                        padding: '12px 16px',
                        position: 'sticky',
                        zIndex: 20,
                    }}
                >
                    <Button block disabled={!isDirty || isSaving} fill="outline" onClick={handleReset} size="large" style={{ minHeight: 44 }}>
                        {t('reset')}
                    </Button>
                    <Button block disabled={!isDirty || isSaving} loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                        {t('saveHours')}
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
}

export default function MobileWorkingHoursEditScreen(props: MobileWorkingHoursEditScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${String(storeDetails?.tenantId ?? '')}::${String(storeDetails?.storeId ?? '')}`;
    return <MobileWorkingHoursEditScreenContent key={scopeKey} {...props} />;
}
