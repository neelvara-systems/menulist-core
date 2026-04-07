'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { buildClockTimeOptions, formatClockTime } from '@util/dateTime';
import { Button, Card, DotLoading, Flex, NavBar, Select, Switch, Text, Toast } from '../antd';
import { LuClock3 } from 'react-icons/lu';
import MobileScreenIntro from '../components/MobileScreenIntro';

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

    const pickerOptions = buildClockTimeOptions();

    const allDaysTemplate = DAYS.reduce<DaySchedule | null>((found, { key }) => {
        if (found) return found;
        return schedule[key]?.isClosed ? null : schedule[key];
    }, null) || { open: '09:00', close: '22:00', isClosed: false };

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);
        const workingHours: Record<string, string> = {};
        DAYS.forEach(({ key }) => { workingHours[key] = serializeDay(schedule[key]); });

        setStoreDetails((previous: any) => ({ ...previous, workingHours }));
        Toast.show({ content: t('hoursSaved'), duration: 1000 });

        try {
            await updateStore({ ...storeDetails, workingHours } as any);
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, workingHours: storeDetails.workingHours }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [schedule, setStoreDetails, storeDetails, t]);

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
            <NavBar onBack={onBack} />
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle')}
                    title={t('title')}
                />

                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Text strong>{t('setSameHoursAllDays')}</Text>
                            <Button fill="none" onClick={handleApplyAllDaysHours} size="small">
                                {t('applyToAllDays')}
                            </Button>
                        </Flex>
                        <Flex gap={8}>
                            <Select
                                onChange={(value) => setSchedule((previous) => {
                                    const next: Record<string, DaySchedule> = {};
                                    DAYS.forEach(({ key }) => {
                                        next[key] = { ...previous[key], open: value };
                                    });
                                    return next;
                                })}
                                options={pickerOptions}
                                placeholder={t('selectOpeningTime')}
                                value={allDaysTemplate.open}
                            />
                            <Select
                                onChange={(value) => setSchedule((previous) => {
                                    const next: Record<string, DaySchedule> = {};
                                    DAYS.forEach(({ key }) => {
                                        next[key] = { ...previous[key], close: value };
                                    });
                                    return next;
                                })}
                                options={pickerOptions}
                                placeholder={t('selectClosingTime')}
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
                                        <Select
                                            onChange={(value) => setSchedule((previous) => ({
                                                ...previous,
                                                [key]: { ...previous[key], open: value },
                                            }))}
                                            options={pickerOptions}
                                            placeholder={t('selectOpeningTime')}
                                            value={day.open}
                                        />
                                        <Select
                                            onChange={(value) => setSchedule((previous) => ({
                                                ...previous,
                                                [key]: { ...previous[key], close: value },
                                            }))}
                                            options={pickerOptions}
                                            placeholder={t('selectClosingTime')}
                                            value={day.close}
                                        />
                                    </Flex>
                                ) : null}
                            </Flex>
                        </Card>
                    );
                })}

                <Button block loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                    {t('saveHours')}
                </Button>
            </Flex>
        </Flex>
    );
}
