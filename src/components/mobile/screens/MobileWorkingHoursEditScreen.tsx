'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { Button, Card, DotLoading, Flex, Input, NavBar, Switch, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

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
    if (!value || value.toLowerCase() === 'closed') {
        return { close: '22:00', isClosed: true, open: '09:00' };
    }
    const parts = value.split('-');
    return {
        close: parts[1]?.trim() || '22:00',
        isClosed: false,
        open: parts[0]?.trim() || '09:00',
    };
};

const serializeDay = (schedule: DaySchedule) => schedule.isClosed ? '' : `${schedule.open}-${schedule.close}`;

const toMinutes = (value: string): number | null => {
    const [hoursText, minutesText] = value.split(':');
    const hours = Number(hoursText);
    const minutes = Number(minutesText);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return (hours * 60) + minutes;
};

export default function MobileWorkingHoursEditScreen({ onBack }: MobileWorkingHoursEditScreenProps) {
    const t = useTranslations('MobileWorkingHoursEdit');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(() => {
        const result: Record<string, DaySchedule> = {};
        DAYS.forEach(({ key }) => {
            result[key] = parseDayValue(storeDetails?.workingHours?.[key]);
        });
        return result;
    });
    const [originalSchedule, setOriginalSchedule] = useState<Record<string, DaySchedule>>(() => {
        const result: Record<string, DaySchedule> = {};
        DAYS.forEach(({ key }) => {
            result[key] = parseDayValue(storeDetails?.workingHours?.[key]);
        });
        return result;
    });

    const allDaysTemplate = DAYS.reduce<DaySchedule | null>((found, { key }) => {
        if (found) return found;
        return schedule[key]?.isClosed ? null : schedule[key];
    }, null) || { open: '09:00', close: '22:00', isClosed: false };
    const isDirty = JSON.stringify(schedule) !== JSON.stringify(originalSchedule);

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;

        for (const { key } of DAYS) {
            const daySchedule = schedule[key];
            if (daySchedule.isClosed) continue;

            const openMinutes = toMinutes(daySchedule.open);
            const closeMinutes = toMinutes(daySchedule.close);
            if (openMinutes === null || closeMinutes === null || openMinutes === closeMinutes) {
                Toast.show({ content: 'Open and close times must be valid and different.', duration: 1800 });
                return;
            }
        }

        setIsSaving(true);
        const workingHours: Record<string, string> = {};
        DAYS.forEach(({ key }) => { workingHours[key] = serializeDay(schedule[key]); });

        setStoreDetails((previous: any) => ({ ...previous, workingHours }));
        Toast.show({ content: t('hoursSaved'), duration: 1000 });

        try {
            await updateStore({ ...storeDetails, workingHours } as any);
            setOriginalSchedule(schedule);
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, workingHours: storeDetails.workingHours }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [schedule, setStoreDetails, storeDetails, t]);

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
