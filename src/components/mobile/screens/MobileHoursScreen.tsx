'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useMemo, useState } from 'react';
import { LuClock, LuPower, LuPowerOff } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, List, Text, Title, Toast } from '../antd';

type DayHours = {
    close: string;
    day: string;
    isClosed: boolean;
    open: string;
};

type TodayStatus = 'open' | 'closed_today';

const DAYS: { key: string; label: string }[] = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
];

const getTodayKey = () => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];

const format24to12 = (time24: string): string => {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export default function MobileHoursScreen() {
    const t = useTranslations('MobileHours');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isUpdating, setIsUpdating] = useState(false);
    const [originalTodayHours, setOriginalTodayHours] = useState<string | null>(null);
    const todayKey = getTodayKey();

    const todayStatus = useMemo((): TodayStatus => {
        const todayValue = storeDetails?.workingHours?.[todayKey];
        return !todayValue || todayValue.toLowerCase() === 'closed' ? 'closed_today' : 'open';
    }, [storeDetails?.workingHours, todayKey]);

    const weeklyHours = useMemo((): DayHours[] => {
        if (!storeDetails?.workingHours) {
            return DAYS.map(({ label }) => ({ close: '', day: label, isClosed: false, open: '' }));
        }

        return DAYS.map(({ key, label }) => {
            const hours = storeDetails.workingHours?.[key];
            if (!hours || hours.toLowerCase() === 'closed') {
                return { close: '', day: label, isClosed: true, open: '' };
            }

            const [open, close] = hours.split('-');
            return {
                close: close ? format24to12(close.trim()) : '',
                day: label,
                isClosed: false,
                open: open ? format24to12(open.trim()) : '',
            };
        });
    }, [storeDetails?.workingHours]);

    const handleCloseToday = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsUpdating(true);
        const currentHours = storeDetails.workingHours?.[todayKey] || '';
        setOriginalTodayHours(currentHours);

        const updatedHours = { ...storeDetails.workingHours, [todayKey]: '' };
        setStoreDetails((previous: any) => ({ ...previous, workingHours: updatedHours }));
        Toast.show({ content: t('closedForToday'), duration: 1500 });

        try {
            await updateStore({ ...storeDetails, workingHours: updatedHours } as any);
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, workingHours: { ...storeDetails.workingHours, [todayKey]: currentHours } }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdating(false);
        }
    }, [setStoreDetails, storeDetails, t, todayKey]);

    const handleReopenToday = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsUpdating(true);
        const restoredHours = originalTodayHours || '09:00-22:00';
        const updatedHours = { ...storeDetails.workingHours, [todayKey]: restoredHours };
        setStoreDetails((previous: any) => ({ ...previous, workingHours: updatedHours }));
        Toast.show({ content: t('reopened'), duration: 1500 });

        try {
            await updateStore({ ...storeDetails, workingHours: updatedHours } as any);
        } catch {
            setStoreDetails((previous: any) => ({ ...previous, workingHours: { ...storeDetails.workingHours, [todayKey]: '' } }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdating(false);
        }
    }, [originalTodayHours, setStoreDetails, storeDetails, t, todayKey]);

    if (!storeDetails) {
        return (
            <Flex align="center" justify="center" style={{ minHeight: '100%' }}>
                <DotLoading color="primary" />
            </Flex>
        );
    }

    const status = todayStatus === 'open'
        ? { color: '#16a34a', icon: <LuPower color="#16a34a" size={18} />, label: t('open'), sublabel: storeDetails.name || 'Your business' }
        : { color: '#dc2626', icon: <LuPowerOff color="#dc2626" size={18} />, label: t('closedToday'), sublabel: t('customersSee') };

    return (
        <Flex gap={12} style={{ padding: 16 }} vertical>
            <Card>
                <Flex align="center" gap={8}>
                    <LuClock size={18} />
                    <Title level={4} style={{ margin: 0 }}>{t('title')}</Title>
                </Flex>
            </Card>

            <Card>
                <Flex align="center" gap={12} vertical>
                    <Flex align="center" gap={8}>
                        {status.icon}
                        <Title level={4} style={{ color: status.color, margin: 0 }}>{status.label}</Title>
                    </Flex>
                    <Text type="secondary">{status.sublabel}</Text>
                    {todayStatus === 'open' ? (
                        <Button
                            block
                            color="danger"
                            loading={isUpdating}
                            onClick={() => {
                                void Dialog.confirm({
                                    cancelText: t('cancel'),
                                    confirmText: t('close'),
                                    content: t('closeConfirm'),
                                    onConfirm: handleCloseToday,
                                });
                            }}
                            size="large"
                        >
                            {t('closeForToday')}
                        </Button>
                    ) : (
                        <Button block loading={isUpdating} onClick={() => void handleReopenToday()} size="large">
                            {t('reopenToday')}
                        </Button>
                    )}
                </Flex>
            </Card>

            <Card title={t('weeklyHours')}>
                <List>
                    {weeklyHours.map((day) => (
                        <List.Item
                            description={<Text type="secondary">{day.isClosed ? t('closed') : `${day.open} - ${day.close}`}</Text>}
                            key={day.day}
                            title={<Text strong>{day.day}</Text>}
                        />
                    ))}
                </List>
            </Card>
        </Flex>
    );
}
