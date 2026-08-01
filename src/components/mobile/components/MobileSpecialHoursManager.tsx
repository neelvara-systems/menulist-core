'use client';

import { FEATURE_FLAGS } from '@config/features';
import { assertStoreUpdateSucceeded, updateStore } from '@database/stores';
import {
    SPECIAL_HOURS_LABEL_MAX_LENGTH,
    SPECIAL_HOURS_MAX_ENTRIES,
    formatSpecialHoursEntry,
    getStoreLocalDateKey,
    normalizeSpecialHours,
    sortSpecialHoursEntriesForOwner,
} from '@lib/hours/specialHours';
import { isValidClockRange } from '@lib/menu/timeSlotPresetBoundary';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import type { StoreSpecialHours } from '@type/platform/store';
import { Segmented, theme } from 'antd';
import dayjs from 'dayjs';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';
import { Button, Card, Dialog, Flex, Input, Text, Toast } from '../antd';

type SpecialHoursMode = 'closed' | 'open';

export default function MobileSpecialHoursManager() {
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [date, setDate] = useState('');
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [end, setEnd] = useState('22:00');
    const [label, setLabel] = useState('');
    const [mode, setMode] = useState<SpecialHoursMode>('closed');
    const [saving, setSaving] = useState(false);
    const [start, setStart] = useState('09:00');
    const actionInFlightRef = useRef<symbol | null>(null);
    const componentActiveRef = useRef(true);
    const scopeKey = `${String(storeDetails?.tenantId ?? '')}::${String(storeDetails?.storeId ?? '')}`;
    const activeScopeRef = useRef(scopeKey);
    activeScopeRef.current = scopeKey;
    const specialHours = useMemo(
        () => normalizeSpecialHours(storeDetails?.specialHours) || {},
        [storeDetails?.specialHours],
    );
    const todayKey = getStoreLocalDateKey(storeDetails?.timeZone);
    const entries = sortSpecialHoursEntriesForOwner(specialHours, todayKey);

    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);

    useEffect(() => {
        actionInFlightRef.current = null;
        setDate('');
        setEditingDate(null);
        setEnd('22:00');
        setLabel('');
        setMode('closed');
        setSaving(false);
        setStart('09:00');
    }, [scopeKey]);

    if (!FEATURE_FLAGS.ENABLE_SPECIAL_HOURS) return null;

    const resetDraft = () => {
        setDate('');
        setEditingDate(null);
        setEnd('22:00');
        setLabel('');
        setMode('closed');
        setStart('09:00');
    };

    const persist = async (next: StoreSpecialHours) => {
        if (actionInFlightRef.current !== null) return false;
        const storeId = Number(storeDetails?.storeId);
        const tenantId = Number(storeDetails?.tenantId);
        const requestScopeKey = scopeKey;
        if (!Number.isSafeInteger(storeId) || storeId <= 0 || !Number.isSafeInteger(tenantId) || tenantId <= 0) {
            Toast.show({ content: 'Store details are not available.', duration: 1800 });
            return false;
        }

        const attempt = Symbol('mobile-special-hours-save');
        actionInFlightRef.current = attempt;
        setSaving(true);
        const hoursLastUpdatedAt = new Date().toISOString();
        try {
            const normalized = normalizeSpecialHours(next);
            if (!normalized) throw new Error('special_hours_invalid');
            const result = await updateStore({
                hoursLastUpdatedAt,
                specialHours: Object.keys(normalized).length ? normalized : null,
                storeId,
                tenantId,
            });
            assertStoreUpdateSucceeded(result, storeId, 'mobile_special_hours_store_update_rejected');
            if (
                !componentActiveRef.current
                || activeScopeRef.current !== requestScopeKey
                || actionInFlightRef.current !== attempt
            ) return false;
            setStoreDetails((current: any) => (
                String(current?.storeId) === String(storeId)
                && String(current?.tenantId) === String(tenantId)
                    ? {
                        ...current,
                        hoursLastUpdatedAt,
                        specialHours: Object.keys(normalized).length ? normalized : undefined,
                    }
                    : current
            ));
            return true;
        } catch {
            if (
                componentActiveRef.current
                && activeScopeRef.current === requestScopeKey
                && actionInFlightRef.current === attempt
            ) {
                Toast.show({ content: 'Special hours were not saved. Try again.', duration: 2000 });
            }
            return false;
        } finally {
            if (actionInFlightRef.current === attempt) {
                actionInFlightRef.current = null;
            }
            if (
                componentActiveRef.current
                && activeScopeRef.current === requestScopeKey
                && actionInFlightRef.current === null
            ) {
                setSaving(false);
            }
        }
    };

    const saveDraft = async () => {
        if (saving) return;
        if (!date || date < todayKey) {
            Toast.show({ content: 'Choose today or a future date.', duration: 1800 });
            return;
        }
        if (!editingDate && !specialHours[date] && entries.length >= SPECIAL_HOURS_MAX_ENTRIES) {
            Toast.show({ content: `Keep at most ${SPECIAL_HOURS_MAX_ENTRIES} special dates.`, duration: 1800 });
            return;
        }
        if (mode === 'open' && !isValidClockRange(start, end)) {
            Toast.show({ content: 'Opening and closing times must be different.', duration: 1800 });
            return;
        }

        const next = { ...specialHours };
        if (editingDate && editingDate !== date) delete next[editingDate];
        next[date] = {
            hours: mode === 'closed' ? '' : `${start}-${end}`,
            ...(label.trim() ? { label: label.trim() } : {}),
        };
        if (await persist(next)) {
            Toast.show({ content: 'Special hours published.', duration: 1400 });
            resetDraft();
        }
    };

    const editEntry = (dateKey: string) => {
        const entry = specialHours[dateKey];
        const [openTime, closeTime] = entry.hours.split('-');
        setDate(dateKey);
        setEditingDate(dateKey);
        setLabel(entry.label || '');
        setMode(entry.hours ? 'open' : 'closed');
        setStart(openTime || '09:00');
        setEnd(closeTime || '22:00');
    };

    const confirmRemove = (dateKey: string) => {
        if (saving) return;
        void Dialog.confirm({
            cancelText: 'Cancel',
            confirmText: 'Remove',
            content: 'Regular weekly hours will apply again on this date.',
            onConfirm: async () => {
                const next = { ...specialHours };
                delete next[dateKey];
                if (await persist(next)) {
                    Toast.show({ content: 'Special date removed.', duration: 1400 });
                    if (editingDate === dateKey) resetDraft();
                }
            },
            title: 'Remove this special date?',
        });
    };

    return (
        <Card>
            <Flex gap={14} vertical>
                <Flex gap={4} vertical>
                    <Text strong>Special hours</Text>
                    <Text type="secondary">
                        Add a holiday or one-day change. Regular weekly hours stay unchanged.
                    </Text>
                </Flex>
                <Input min={todayKey} onChange={setDate} type="date" value={date} />
                <Input
                    maxLength={SPECIAL_HOURS_LABEL_MAX_LENGTH}
                    onChange={setLabel}
                    placeholder="Occasion (optional)"
                    value={label}
                />
                <Segmented<SpecialHoursMode>
                    block
                    onChange={setMode}
                    options={[
                        { label: 'Closed all day', value: 'closed' },
                        { label: 'Different hours', value: 'open' },
                    ]}
                    value={mode}
                />
                {mode === 'open' ? (
                    <Flex gap={8}>
                        <Input onChange={setStart} type="time" value={start} />
                        <Input onChange={setEnd} type="time" value={end} />
                    </Flex>
                ) : null}
                <Flex gap={8}>
                    <Button
                        block
                        fill="solid"
                        icon={editingDate ? <LuPencil /> : <LuPlus />}
                        loading={saving}
                        onClick={() => void saveDraft()}
                    >
                        {editingDate ? 'Update date' : 'Add date'}
                    </Button>
                    {editingDate ? <Button disabled={saving} fill="outline" onClick={resetDraft}>Cancel</Button> : null}
                </Flex>

                {entries.length ? entries.map(([dateKey, entry]) => {
                    const isPast = dateKey < todayKey;
                    return (
                        <Flex
                            align="center"
                            gap={10}
                            justify="space-between"
                            key={dateKey}
                            style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, minHeight: 54, paddingTop: 10 }}
                        >
                            <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                                <Text strong>{entry.label || dayjs(dateKey).format('ddd, D MMM YYYY')}</Text>
                                <br />
                                <Text type="secondary">
                                    {entry.label ? `${dayjs(dateKey).format('ddd, D MMM YYYY')} · ` : ''}
                                    {isPast ? 'Past · ' : ''}
                                    {formatSpecialHoursEntry(entry)}
                                </Text>
                            </div>
                            <Flex gap={4} style={{ flexShrink: 0 }}>
                                {!isPast ? (
                                    <Button
                                        ariaLabel="Edit special hours"
                                        disabled={saving}
                                        fill="none"
                                        icon={<LuPencil />}
                                        onClick={() => editEntry(dateKey)}
                                        style={{ minHeight: 44, minWidth: 44 }}
                                    />
                                ) : null}
                                <Button
                                    ariaLabel="Remove special date"
                                    color="danger"
                                    disabled={saving}
                                    fill="none"
                                    icon={<LuTrash2 />}
                                    onClick={() => confirmRemove(dateKey)}
                                    style={{ color: token.colorError, minHeight: 44, minWidth: 44 }}
                                />
                            </Flex>
                        </Flex>
                    );
                }) : <Text type="secondary">No special dates added.</Text>}
            </Flex>
        </Card>
    );
}
