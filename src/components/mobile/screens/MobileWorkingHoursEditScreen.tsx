'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { Button, Card, DotLoading, Flex, NavBar, Picker, Switch, Text, Title, Toast } from '../antd';
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

const TIME_OPTIONS = (() => {
    const options: { label: string; value: string }[] = [];
    for (let h = 0; h < 24; h++) {
        for (const m of [0, 30]) {
            const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const ampm = h < 12 ? 'AM' : 'PM';
            options.push({
                label: `${hour12}:${m === 0 ? '00' : '30'} ${ampm}`,
                value: `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`,
            });
        }
    }
    return options;
})();

const format24to12 = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time24;
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

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
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [activePicker, setActivePicker] = useState<{ day: string; field: 'open' | 'close' } | null>(null);
    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(() => {
        const result: Record<string, DaySchedule> = {};
        DAYS.forEach(({ key }) => {
            result[key] = parseDayValue(storeDetails?.workingHours?.[key]);
        });
        return result;
    });

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

                {DAYS.map(({ key, label }) => {
                    const day = schedule[key];
                    return (
                        <Card key={key}>
                            <Flex gap={12} vertical>
                                <Flex align="center" justify="space-between">
                                    <Text strong>{label}</Text>
                                    <Flex align="center" gap={8}>
                                        <Text style={{ color: day.isClosed ? '#dc2626' : '#16a34a' }}>{day.isClosed ? t('closed') : t('open')}</Text>
                                        <Switch checked={!day.isClosed} onChange={() => setSchedule((previous) => ({ ...previous, [key]: { ...previous[key], isClosed: !previous[key].isClosed } }))} />
                                    </Flex>
                                </Flex>
                                {!day.isClosed ? (
                                    <Flex gap={8}>
                                        <Button block fill="outline" onClick={() => setActivePicker({ day: key, field: 'open' })}>
                                            {t('opens')}: {format24to12(day.open)}
                                        </Button>
                                        <Button block fill="outline" onClick={() => setActivePicker({ day: key, field: 'close' })}>
                                            {t('closes')}: {format24to12(day.close)}
                                        </Button>
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

            <Picker
                columns={[TIME_OPTIONS]}
                onClose={() => setActivePicker(null)}
                onConfirm={(value) => {
                    if (activePicker && value[0]) {
                        setSchedule((previous) => ({
                            ...previous,
                            [activePicker.day]: { ...previous[activePicker.day], [activePicker.field]: value[0] as string },
                        }));
                    }
                }}
                value={activePicker ? [schedule[activePicker.day][activePicker.field]] : []}
                visible={!!activePicker}
            />
        </Flex>
    );
}
