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
            color: '#52c41a',
            bg: 'var(--adm-color-success-bg, #f6ffed)',
            icon: '🟢',
            label: t('open'),
            sublabel: storeDetails?.name || 'Your business',
        },
        closed_today: {
            color: '#ff4d4f',
            bg: 'var(--adm-color-danger-bg, #fff2f0)',
            icon: '🔴',
            label: t('closedToday'),
            sublabel: t('customersSee'),
        },
    };

    const status = statusConfig[todayStatus];

    return (
        <div style={{ padding: '12px 16px' }}>
            {/* Page Title */}
            <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>
                {t('title')}
            </h1>

            {/* Today Status Card */}
            <Card style={{ backgroundColor: status.bg, borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '12px' }}>
                    <span style={{ fontSize: '30px' }}>{status.icon}</span>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: status.color, marginBottom: '4px' }}>
                            {status.label}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--adm-color-weak, #999)' }}>
                            {status.sublabel}
                        </div>
                    </div>

                    {todayStatus === 'open' && (
                        <Button
                            color="danger"
                            fill="solid"
                            size="large"
                            loading={isUpdating}
                            onClick={() => {
                                Dialog.confirm({
                                    content: t('closeConfirm'),
                                    confirmText: t('close'),
                                    cancelText: t('cancel'),
                                    onConfirm: handleCloseToday,
                                });
                            }}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            <LuPowerOff size={16} style={{ marginRight: '8px', display: 'inline' }} />
                            {t('closeForToday')}
                        </Button>
                    )}

                    {todayStatus === 'closed_today' && (
                        <Button
                            color="primary"
                            fill="solid"
                            size="large"
                            loading={isUpdating}
                            onClick={handleReopenToday}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            <LuPower size={16} style={{ marginRight: '8px', display: 'inline' }} />
                            {t('reopenToday')}
                        </Button>
                    )}
                </div>
            </Card>

            {/* Today Actions — Quick share status on WhatsApp */}
            <Card style={{ borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--adm-color-secondary, #666)' }}>
                        {t('quickShare')}
                    </h3>
                    <Button
                        block
                        fill="solid"
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
                        style={{ backgroundColor: '#25D366', color: '#fff' }}
                    >
                        <LuMessageCircle size={16} style={{ marginRight: '8px', display: 'inline' }} />
                        {t('shareStatusWhatsApp')}
                    </Button>
                </div>
            </Card>

            {/* Weekly Hours */}
            <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <LuClock size={16} />
                    {t('weeklyHours')}
                </h2>
                <List>
                    {weeklyHours.map((dayHours) => (
                        <List.Item
                            key={dayHours.day}
                            title={dayHours.day}
                            description={
                                dayHours.isClosed ? (
                                    <span style={{ color: '#ff4d4f' }}>{t('closed')}</span>
                                ) : (
                                    `${dayHours.open} - ${dayHours.close}`
                                )
                            }
                        />
                    ))}
                </List>
            </div>
        </div>
    );
}
