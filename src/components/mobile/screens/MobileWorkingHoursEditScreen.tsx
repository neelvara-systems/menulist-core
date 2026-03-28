'use client'

import { updateStore } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { Button, Card, DotLoading, NavBar, Picker, Switch, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useCallback, useContext, useState } from 'react';
import { LuClock } from 'react-icons/lu';

interface MobileWorkingHoursEditScreenProps {
    onBack: () => void;
}

// Desktop stores workingHours with 3-letter day keys: { sun, mon, tue, wed, thu, fri, sat }
const DAYS = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
];

// Generate time options (every 30 minutes)
// Value is 24h format "HH:mm" to match desktop, label is 12h for display
const TIME_OPTIONS = (() => {
    const options: { label: string; value: string }[] = [];
    for (let h = 0; h < 24; h++) {
        for (const m of [0, 30]) {
            const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
            const ampm = h < 12 ? 'AM' : 'PM';
            const label = `${hour12}:${m === 0 ? '00' : '30'} ${ampm}`;
            const value = `${h.toString().padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
            options.push({ label, value });
        }
    }
    return options;
})();

// Convert 24h "HH:mm" to display "h:mm AM/PM"
const format24to12 = (time24: string): string => {
    const [h, m] = time24.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return time24;
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

type DaySchedule = {
    isClosed: boolean;
    open: string;
    close: string;
};

// Desktop format: "HH:mm-HH:mm" (24h, dash separator, no spaces)
function parseDayValue(value: string | undefined): DaySchedule {
    if (!value || value.toLowerCase() === 'closed') {
        return { isClosed: true, open: '09:00', close: '22:00' };
    }
    const parts = value.split('-');
    return {
        isClosed: false,
        open: parts[0]?.trim() || '09:00',
        close: parts[1]?.trim() || '22:00',
    };
}

// Serialize back to desktop format: "HH:mm-HH:mm" (24h, no spaces)
function serializeDay(schedule: DaySchedule): string {
    if (schedule.isClosed) return '';
    return `${schedule.open}-${schedule.close}`;
}

export default function MobileWorkingHoursEditScreen({ onBack }: MobileWorkingHoursEditScreenProps) {
    const t = useTranslations('MobileWorkingHoursEdit');
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [isSaving, setIsSaving] = useState(false);
    const [activePicker, setActivePicker] = useState<{ day: string; field: 'open' | 'close' } | null>(null);

    // Parse existing working hours into editable state
    const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(() => {
        const result: Record<string, DaySchedule> = {};
        DAYS.forEach(({ key }) => {
            result[key] = parseDayValue(storeDetails?.workingHours?.[key]);
        });
        return result;
    });

    const handleToggleDay = (dayKey: string) => {
        setSchedule(prev => ({
            ...prev,
            [dayKey]: { ...prev[dayKey], isClosed: !prev[dayKey].isClosed },
        }));
    };

    const handleTimeChange = (dayKey: string, field: 'open' | 'close', value: string) => {
        setSchedule(prev => ({
            ...prev,
            [dayKey]: { ...prev[dayKey], [field]: value },
        }));
    };

    const handleSave = useCallback(async () => {
        if (!storeDetails?.storeId) return;
        setIsSaving(true);

        // Build workingHours Record<string, string>
        const workingHours: Record<string, string> = {};
        DAYS.forEach(({ key }) => {
            workingHours[key] = serializeDay(schedule[key]);
        });

        // Optimistic update
        setStoreDetails((prev: any) => ({ ...prev, workingHours }));
        Toast.show({ content: t('hoursSaved'), duration: 1000 });

        try {
            await updateStore({ ...storeDetails, workingHours } as any);
        } catch {
            // Revert
            setStoreDetails((prev: any) => ({
                ...prev,
                workingHours: storeDetails.workingHours,
            }));
            Toast.show({ content: t('failedToSave'), duration: 2000 });
        } finally {
            setIsSaving(false);
        }
    }, [storeDetails, schedule, setStoreDetails]);

    if (!storeDetails) {
        return (
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} className="border-b border-gray-200 dark:border-gray-700">
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-3">
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <LuClock size={14} />
                    {t('subtitle')}
                </p>

                {DAYS.map(({ key, label }) => {
                    const day = schedule[key];
                    return (
                        <Card key={key} className="rounded-xl">
                            <div className="space-y-3">
                                {/* Day header with toggle */}
                                <div className="flex items-center justify-between">
                                    <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100">
                                        {label}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${day.isClosed ? 'text-red-500' : 'text-green-600'}`}>
                                            {day.isClosed ? t('closed') : t('open')}
                                        </span>
                                        <Switch
                                            checked={!day.isClosed}
                                            onChange={() => handleToggleDay(key)}
                                            style={{ '--height': '26px', '--width': '44px' } as React.CSSProperties}
                                        />
                                    </div>
                                </div>

                                {/* Time pickers (only shown when open) */}
                                {!day.isClosed && (
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-400 mb-1 block">{t('opens')}</label>
                                            <div
                                                className="py-2 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 min-h-[40px] flex items-center"
                                                onClick={() => setActivePicker({ day: key, field: 'open' })}
                                            >
                                                {day.open ? format24to12(day.open) : t('setTime')}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-400 mb-1 block">{t('closes')}</label>
                                            <div
                                                className="py-2 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 min-h-[40px] flex items-center"
                                                onClick={() => setActivePicker({ day: key, field: 'close' })}
                                            >
                                                {day.close ? format24to12(day.close) : t('setTime')}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}

                {/* Save */}
                <Button
                    block
                    color="primary"
                    fill="solid"
                    size="large"
                    loading={isSaving}
                    onClick={handleSave}
                    style={{ minHeight: '44px' }}
                >
                    {t('saveHours')}
                </Button>
            </div>

            {/* Shared Time Picker */}
            <Picker
                columns={[TIME_OPTIONS]}
                visible={!!activePicker}
                onClose={() => setActivePicker(null)}
                onConfirm={(val) => {
                    if (activePicker && val[0]) {
                        handleTimeChange(activePicker.day, activePicker.field, val[0] as string);
                    }
                }}
                value={activePicker ? [schedule[activePicker.day][activePicker.field]] : []}
            />
        </div>
    );
}
