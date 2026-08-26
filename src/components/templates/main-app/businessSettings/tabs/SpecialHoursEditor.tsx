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
import {
    App,
    Button,
    DatePicker,
    Divider,
    Flex,
    Input,
    Popconfirm,
    Segmented,
    Space,
    TimePicker,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuPencil, LuPlus, LuTrash2 } from 'react-icons/lu';

const { Text, Title } = Typography;

type SpecialHoursMode = 'open' | 'closed';

export default function SpecialHoursEditor() {
    const { message: messageApi } = App.useApp();
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [date, setDate] = useState<Dayjs | null>(null);
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const [end, setEnd] = useState<Dayjs | null>(null);
    const [label, setLabel] = useState('');
    const [mode, setMode] = useState<SpecialHoursMode>('closed');
    const [saving, setSaving] = useState(false);
    const [start, setStart] = useState<Dayjs | null>(null);
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
        setDate(null);
        setEditingDate(null);
        setEnd(null);
        setLabel('');
        setMode('closed');
        setSaving(false);
        setStart(null);
    }, [scopeKey]);

    if (!FEATURE_FLAGS.ENABLE_SPECIAL_HOURS) return null;

    const resetDraft = () => {
        setDate(null);
        setEditingDate(null);
        setEnd(null);
        setLabel('');
        setMode('closed');
        setStart(null);
    };

    const persist = async (next: StoreSpecialHours) => {
        if (actionInFlightRef.current !== null) return false;
        const storeId = Number(storeDetails?.storeId);
        const tenantId = Number(storeDetails?.tenantId);
        const requestScopeKey = scopeKey;
        if (!Number.isSafeInteger(storeId) || storeId <= 0 || !Number.isSafeInteger(tenantId) || tenantId <= 0) {
            messageApi.error('Store details are not available. Refresh and try again.');
            return false;
        }

        const attempt = Symbol('desktop-special-hours-save');
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
            assertStoreUpdateSucceeded(result, storeId, 'desktop_special_hours_store_update_rejected');
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
                messageApi.error('Special hours were not saved. Please try again.');
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
        const dateKey = date?.format('YYYY-MM-DD');
        if (!dateKey || dateKey < todayKey) {
            messageApi.error('Choose today or a future date.');
            return;
        }
        if (!editingDate && !specialHours[dateKey] && entries.length >= SPECIAL_HOURS_MAX_ENTRIES) {
            messageApi.error(`Keep at most ${SPECIAL_HOURS_MAX_ENTRIES} special dates.`);
            return;
        }
        if (mode === 'open' && (!start || !end || !isValidClockRange(start.format('HH:mm'), end.format('HH:mm')))) {
            messageApi.error('Choose different opening and closing times.');
            return;
        }

        const next = { ...specialHours };
        if (editingDate && editingDate !== dateKey) delete next[editingDate];
        next[dateKey] = {
            hours: mode === 'closed' ? '' : `${start!.format('HH:mm')}-${end!.format('HH:mm')}`,
            ...(label.trim() ? { label: label.trim() } : {}),
        };
        if (await persist(next)) {
            messageApi.success('Special hours published.');
            resetDraft();
        }
    };

    const editEntry = (dateKey: string) => {
        const entry = specialHours[dateKey];
        const [openTime, closeTime] = entry.hours.split('-');
        setDate(dayjs(dateKey));
        setEditingDate(dateKey);
        setLabel(entry.label || '');
        setMode(entry.hours ? 'open' : 'closed');
        setStart(openTime ? dayjs(`2026-01-01 ${openTime}`) : null);
        setEnd(closeTime ? dayjs(`2026-01-01 ${closeTime}`) : null);
    };

    const removeEntry = async (dateKey: string) => {
        if (saving) return;
        const next = { ...specialHours };
        delete next[dateKey];
        if (await persist(next)) {
            messageApi.success('Special date removed.');
            if (editingDate === dateKey) resetDraft();
        }
    };

    return (
        <>
            <Divider />
            <Flex gap={16} vertical>
                <div>
                    <Title level={5} style={{ margin: 0 }}>Special hours</Title>
                    <Text type="secondary">
                        Add holidays or one-day changes. This date replaces the regular weekly hours only for that day.
                    </Text>
                </div>

                <Flex gap={12} wrap="wrap">
                    <DatePicker
                        disabledDate={(current) => current.format('YYYY-MM-DD') < todayKey}
                        onChange={setDate}
                        placeholder="Choose date"
                        value={date}
                    />
                    <Input
                        maxLength={SPECIAL_HOURS_LABEL_MAX_LENGTH}
                        onChange={(event) => setLabel(event.target.value)}
                        placeholder="Occasion (optional)"
                        style={{ maxWidth: 260 }}
                        value={label}
                    />
                    <Segmented<SpecialHoursMode>
                        onChange={setMode}
                        options={[
                            { label: 'Closed all day', value: 'closed' },
                            { label: 'Different hours', value: 'open' },
                        ]}
                        value={mode}
                    />
                    {mode === 'open' ? (
                        <TimePicker.RangePicker
                            minuteStep={15}
                            onChange={(times) => {
                                setStart(times?.[0] || null);
                                setEnd(times?.[1] || null);
                            }}
                            value={start && end ? [start, end] : null}
                        />
                    ) : null}
                    <Button
                        icon={editingDate ? <LuPencil /> : <LuPlus />}
                        loading={saving}
                        onClick={saveDraft}
                        type="primary"
                    >
                        {editingDate ? 'Update date' : 'Add date'}
                    </Button>
                    {editingDate ? <Button disabled={saving} onClick={resetDraft}>Cancel</Button> : null}
                </Flex>

                {entries.length ? (
                    <Flex gap={0} vertical>
                        {entries.map(([dateKey, entry]) => {
                            const isPast = dateKey < todayKey;
                            return (
                                <Flex
                                    align="center"
                                    gap={12}
                                    justify="space-between"
                                    key={dateKey}
                                    style={{ borderTop: `1px solid ${token.colorBorderSecondary}`, minHeight: 52, padding: '8px 0' }}
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
                                    <Space style={{ flexShrink: 0 }}>
                                        {!isPast ? (
                                            <Tooltip title="Edit special hours">
                                                <Button aria-label="Edit special hours" disabled={saving} icon={<LuPencil />} onClick={() => editEntry(dateKey)} />
                                            </Tooltip>
                                        ) : null}
                                        <Popconfirm
                                            description="Regular weekly hours will apply again on this date."
                                            onConfirm={() => removeEntry(dateKey)}
                                            title="Remove this special date?"
                                        >
                                            <Tooltip title="Remove special date">
                                                <Button aria-label="Remove special date" danger disabled={saving} icon={<LuTrash2 />} />
                                            </Tooltip>
                                        </Popconfirm>
                                    </Space>
                                </Flex>
                            );
                        })}
                    </Flex>
                ) : (
                    <Text type="secondary">No special dates added.</Text>
                )}
            </Flex>
        </>
    );
}
