'use client'

import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import { getStoreDeepDifference } from '@lib/store/storeNestedUpdateProjection';
import { isValidClockRange } from '@lib/menu/timeSlotPresetBoundary';
import { parseWorkingHoursRanges } from '@lib/hours/hoursEngine';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useEffect, useState } from 'react';
import { Button, Card, Dialog, DotLoading, Flex, Input, NavBar, Switch, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
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

export default function MobileWorkingHoursEditScreen({ onBack }: MobileWorkingHoursEditScreenProps) {
    const t = useTranslations('MobileWorkingHoursEdit');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(() => buildSchedule(storeDetails?.workingHours));
    const [originalSchedule, setOriginalSchedule] = useState<Record<string, DaySchedule>>(() => buildSchedule(storeDetails?.workingHours));

    useEffect(() => {
        const next = buildSchedule(storeDetails?.workingHours);
        setSchedule(next);
        setOriginalSchedule(next);
    }, [storeDetails?.storeId, storeDetails?.workingHours]);

    const allDaysTemplate = DAYS.reduce<DaySchedule | null>((found, { key }) => {
        if (found) return found;
        return schedule[key]?.isClosed ? null : schedule[key];
    }, null) || { open: '09:00', close: '22:00', isClosed: false };
    const isDirty = JSON.stringify(schedule) !== JSON.stringify(originalSchedule);

    const saveWorkingHours = useCallback(async () => {
        if (!storeDetails?.storeId) return;

        setIsSaving(true);
        const workingHours: Record<string, string> = { ...(storeDetails.workingHours || {}) };
        DAYS.forEach(({ key }) => {
            const serialized = serializeDay(schedule[key]);
            if (serialized === serializeDay(originalSchedule[key])) return;
            if (serialized) workingHours[key] = serialized;
            else delete workingHours[key];
        });
        const hoursLastUpdatedAt = new Date().toISOString();

        setStoreDetails((previous: any) => ({ ...previous, hoursLastUpdatedAt, workingHours }));

        try {
            const writeResult = await updateStore({
                hoursLastUpdatedAt,
                storeId: storeDetails.storeId,
                tenantId: storeDetails.tenantId,
                workingHours: getStoreDeepDifference(workingHours, storeDetails.workingHours || {}, {
                    detectRemovedRootKeys: true,
                }),
            });
            assertStoreUpdateSucceeded(
                writeResult,
                storeDetails.storeId,
                'mobile_working_hours_store_update_rejected',
            );
            setOriginalSchedule(schedule);
            Toast.show({ content: t('hoursSaved'), duration: 1000 });
        } catch (error) {
            logMobileOwnerFailure('mobile_working_hours_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails.storeId, storeDetails.tenantId),
                changedDayCount: DAYS.filter(({ key }) => serializeDay(schedule[key]) !== (storeDetails.workingHours?.[key] || '')).length,
                closedDayCount: DAYS.filter(({ key }) => schedule[key]?.isClosed).length,
                hasPreviousWorkingHours: Boolean(storeDetails.workingHours),
            });
            setStoreDetails((previous: any) => ({
                ...previous,
                hoursLastUpdatedAt: (storeDetails as any).hoursLastUpdatedAt,
                workingHours: storeDetails.workingHours,
            }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [originalSchedule, schedule, setStoreDetails, storeDetails, t]);

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
                            These are the hours customers see every week. Use temporary status for one-day changes.
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
                                        <Switch checked={!day.isClosed} onChange={() => setSchedule((previous) => ({ ...previous, [key]: { ...previous[key], isClosed: !previous[key].isClosed } }))} />
                                    </Flex>
                                </Flex>
                                {!day.isClosed ? (
                                    <Flex gap={8}>
                                        <Input
                                            onChange={(value) => setSchedule((previous) => ({
                                                ...previous,
                                                [key]: { ...previous[key], open: value },
                                            }))}
                                            type="time"
                                            value={day.open}
                                        />
                                        <Input
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

                <Flex
                    gap={8}
                    style={{
                        backdropFilter: 'blur(10px)',
                        backgroundColor: token.colorBgContainer,
                        borderTop: `1px solid ${token.colorBorderSecondary}`,
                        bottom: 0,
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
