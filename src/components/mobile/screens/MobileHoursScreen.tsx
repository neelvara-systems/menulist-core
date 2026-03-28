'use client'

import { updateStore } from '@database/stores';
import { generateProjectUrl } from '@lib/utils/slugify';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, Dialog, DotLoading, List, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useMemo, useState } from 'react';
import { LuClock, LuMessageCircle, LuPower, LuPowerOff } from 'react-icons/lu';

type DayHours = {
    day: string;
    open: string;
    close: string;
    isClosed: boolean;
};

type TodayStatus = 'open' | 'closed_today';

// Desktop stores workingHours as Record<string, string> with 3-letter day keys
// Format: { sun: '09:00-22:00', mon: '09:00-22:00', ... }
const DAYS: { key: string; label: string }[] = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
];

// Get today's 3-letter day key to match desktop workingHours keys
const getTodayKey = () => {
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return days[new Date().getDay()];
};

// Parse 24h format "09:00-22:00" to display as "9:00 AM - 10:00 PM"
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
    // Track original hours for today so we can restore on reopen
    const [originalTodayHours, setOriginalTodayHours] = useState<string | null>(null);

    // Derive today's status from workingHours
    // Desktop convention: valid hours = "HH:mm-HH:mm", no hours/empty = closed/not set
    const todayKey = getTodayKey();
    const todayStatus = useMemo((): TodayStatus => {
        if (!storeDetails?.workingHours) return 'closed_today';
        const todayValue = storeDetails.workingHours?.[todayKey];
        // Empty, missing, or explicit 'closed' means closed for today
        if (!todayValue || todayValue.toLowerCase() === 'closed') return 'closed_today';
        // Has a valid time range
        return 'open';
    }, [storeDetails, todayKey]);

    // Parse weekly hours from store data (workingHours is Record<string, string>)
    // Desktop format: { mon: '09:00-22:00', tue: '09:00-22:00', ... }
    const weeklyHours = useMemo((): DayHours[] => {
        if (!storeDetails?.workingHours) {
            return DAYS.map(({ key, label }) => ({ day: label, open: '', close: '', isClosed: false }));
        }
        return DAYS.map(({ key, label }) => {
            const hoursStr = storeDetails.workingHours?.[key];
            if (!hoursStr || hoursStr.toLowerCase() === 'closed') {
                return { day: label, open: '', close: '', isClosed: true };
            }
            // Desktop format: "HH:mm-HH:mm" (24h, dash separator, no spaces)
            const parts = hoursStr.split('-');
            const open24 = parts[0]?.trim() || '';
            const close24 = parts[1]?.trim() || '';
            return {
                day: label,
                open: open24 ? format24to12(open24) : '',
                close: close24 ? format24to12(close24) : '',
                isClosed: false,
            };
        });
    }, [storeDetails]);

    // Close for today — sets today's workingHours to "Closed" (Law 8: optimistic)
    const handleCloseToday = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsUpdating(true);

        // Save original hours so we can restore
        const currentHours = storeDetails.workingHours?.[todayKey] || '';
        setOriginalTodayHours(currentHours);

        // Optimistic update — set today's hours to empty (desktop convention for closed)
        const updatedHours = { ...storeDetails.workingHours, [todayKey]: '' };
        setStoreDetails((prev: any) => ({ ...prev, workingHours: updatedHours }));
        Toast.show({ content: t('closedForToday'), duration: 1500 });

        try {
            await updateStore({ ...storeDetails, workingHours: updatedHours } as any);
        } catch {
            // Revert
            const revertHours = { ...storeDetails.workingHours, [todayKey]: currentHours };
            setStoreDetails((prev: any) => ({ ...prev, workingHours: revertHours }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdating(false);
        }
    }, [storeDetails, setStoreDetails, todayKey]);

    // Reopen today — restores original hours or sets a default
    const handleReopenToday = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsUpdating(true);

        const restoreValue = originalTodayHours || '09:00-22:00';
        const updatedHours = { ...storeDetails.workingHours, [todayKey]: restoreValue };
        setStoreDetails((prev: any) => ({ ...prev, workingHours: updatedHours }));
        Toast.show({ content: t('reopened'), duration: 1500 });

        try {
            await updateStore({ ...storeDetails, workingHours: updatedHours } as any);
        } catch {
            const revertHours = { ...storeDetails.workingHours, [todayKey]: '' };
            setStoreDetails((prev: any) => ({ ...prev, workingHours: revertHours }));
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        } finally {
            setIsUpdating(false);
        }
    }, [storeDetails, setStoreDetails, todayKey, originalTodayHours]);

    if (!storeDetails) {
        return (
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    const statusConfig = {
        open: {
            color: 'text-green-600',
            bg: 'bg-green-50 dark:bg-green-900/20',
            icon: '🟢',
            label: t('open'),
            sublabel: storeDetails?.name || 'Your business',
        },
        closed_today: {
            color: 'text-red-600',
            bg: 'bg-red-50 dark:bg-red-900/20',
            icon: '🔴',
            label: t('closedToday'),
            sublabel: t('customersSee'),
        },
    };

    const status = statusConfig[todayStatus];

    return (
        <div className="px-4 pt-3 pb-4 space-y-4">
            {/* Page Title */}
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {t('title')}
            </h1>

            {/* Today Status Card */}
            <Card className={`${status.bg} rounded-xl`}>
                <div className="flex flex-col items-center py-4 gap-3">
                    <span className="text-3xl">{status.icon}</span>
                    <span className={`text-lg font-bold ${status.color}`}>
                        {status.label}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {status.sublabel}
                    </span>

                    {todayStatus === 'open' && (
                        <Button
                            color="danger"
                            fill="solid"
                            size="large"
                            className="w-full mt-2"
                            loading={isUpdating}
                            onClick={() => {
                                Dialog.confirm({
                                    content: t('closeConfirm'),
                                    confirmText: t('close'),
                                    cancelText: t('cancel'),
                                    onConfirm: handleCloseToday,
                                });
                            }}
                            style={{ minHeight: '44px' }}
                        >
                            <LuPowerOff size={16} className="inline mr-2" />
                            {t('closeForToday')}
                        </Button>
                    )}

                    {todayStatus === 'closed_today' && (
                        <Button
                            color="primary"
                            fill="solid"
                            size="large"
                            className="w-full mt-2"
                            loading={isUpdating}
                            onClick={handleReopenToday}
                            style={{ minHeight: '44px' }}
                        >
                            <LuPower size={16} className="inline mr-2" />
                            {t('reopenToday')}
                        </Button>
                    )}

                </div>
            </Card>

            {/* Today Actions — Quick share status on WhatsApp */}
            <Card className="rounded-xl">
                <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t('quickShare')}
                    </h3>
                    <Button
                        block
                        fill="outline"
                        size="middle"
                        onClick={() => {
                            const statusText = todayStatus === 'open'
                                ? `We're open today! Visit us at ${storeDetails?.name || 'our restaurant'}.`
                                : `We're closed today. See you tomorrow at ${storeDetails?.name || 'our restaurant'}!`;
                            const url = generateProjectUrl(
                                storeDetails?.subdomain,
                                storeDetails?.customDomain,
                                undefined, true
                            );
                            const fullText = encodeURIComponent(`${statusText}${url ? `\n\nMenu: ${url}` : ''}`);
                            window.open(`https://wa.me/?text=${fullText}`, '_blank');
                        }}
                        style={{ minHeight: '44px', backgroundColor: '#25D366', borderColor: '#25D366', color: '#fff' }}
                    >
                        <LuMessageCircle size={16} className="inline mr-2" />
                        {t('shareStatusWhatsApp')}
                    </Button>
                </div>
            </Card>

            {/* Weekly Hours */}
            <div>
                <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <LuClock size={16} />
                    {t('weeklyHours')}
                </h2>
                <List style={{ '--border-inner': '1px solid var(--adm-color-border, #eee)' } as React.CSSProperties}>
                    {weeklyHours.map((dayHours) => (
                        <List.Item
                            key={dayHours.day}
                            title={
                                <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100">
                                    {dayHours.day}
                                </span>
                            }
                            description={
                                dayHours.isClosed ? (
                                    <span className="text-sm text-red-500">{t('closed')}</span>
                                ) : (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                        {dayHours.open} - {dayHours.close}
                                    </span>
                                )
                            }
                            style={{ minHeight: '48px' }}
                        />
                    ))}
                </List>
            </div>
        </div>
    );
}
