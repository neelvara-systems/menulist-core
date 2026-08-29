'use client'

import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { assertTimeSlotPresetUpdateSucceeded, generatePresetId, updateTimeSlotPresets } from '@database/stores';
import { isValidClockRange } from '@lib/menu/timeSlotPresetBoundary';
import { reconcileTimeSlotPresetCascade } from '@lib/menu/reconcileTimeSlotPresetCascade';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { TimeSlotPreset } from '@type/platform/store';
import { formatClockTime } from '@util/dateTime';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useRef, useState } from 'react';
import { LuCheck, LuClock, LuPencil, LuPlus, LuTrash2, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Empty, Flex, Input, NavBar, Popup, Text, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';
import { MOBILE_BOTTOM_NAV_CLEARANCE } from '../MobileNavigation';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

const PRESET_COLORS = ['#f50', '#2db7f5', '#87d068', '#108ee9', '#531dab', '#c41d7f', '#d4380d', '#096dd9', '#7cb305', '#cf1322', '#08979c', '#d46b08'];

interface MobileTimeSlotsScreenProps {
    onBack: () => void;
}

function MobileTimeSlotsScreenContent({ onBack }: MobileTimeSlotsScreenProps) {
    const t = useTranslations('MobileTimeSlots');
    const { token } = theme.useToken();
    const { storeDetails, setStoreDetails } = useContext(PlatformGlobalDataContext);
    const [presets, setPresets] = useState<TimeSlotPreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<TimeSlotPreset | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formLabel, setFormLabel] = useState('');
    const [formStart, setFormStart] = useState('09:00');
    const [formEnd, setFormEnd] = useState('17:00');
    const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
    const actionInFlightRef = useRef(false);
    const scopeKey = `${String(storeDetails?.tenantId ?? '')}::${String(storeDetails?.storeId ?? '')}`;
    const activeScopeRef = useRef(scopeKey);
    const componentActiveRef = useRef(true);
    const recoveryAttemptedOperationRef = useRef<string | null>(null);

    activeScopeRef.current = scopeKey;
    useEffect(() => {
        if (storeDetails) {
            setPresets(storeDetails.timeSlotPresets || []);
            setIsLoading(false);
        }
    }, [storeDetails?.storeId, storeDetails?.timeSlotPresets]);
    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);
    useEffect(() => {
        const pendingCascade = storeDetails?.timeSlotPresetCascadePending;
        const expectedTenantId = Number(storeDetails?.tenantId);
        const expectedStoreId = Number(storeDetails?.storeId);
        if (
            !pendingCascade
            || recoveryAttemptedOperationRef.current === pendingCascade.operationId
            || actionInFlightRef.current
            || !Number.isSafeInteger(expectedTenantId)
            || expectedTenantId <= 0
            || !Number.isSafeInteger(expectedStoreId)
            || expectedStoreId <= 0
        ) {
            return;
        }
        recoveryAttemptedOperationRef.current = pendingCascade.operationId;
        const requestScopeKey = scopeKey;
        actionInFlightRef.current = true;
        setIsSaving(true);
        void reconcileTimeSlotPresetCascade(
            { tenantId: expectedTenantId, storeId: expectedStoreId },
            pendingCascade,
        )
            .then(({ operationId }) => {
                if (!componentActiveRef.current || activeScopeRef.current !== requestScopeKey) return;
                setStoreDetails((previous: any) => {
                    if (
                        String(previous?.tenantId ?? '') !== String(expectedTenantId)
                        || String(previous?.storeId ?? '') !== String(expectedStoreId)
                        || previous?.timeSlotPresetCascadePending?.operationId !== operationId
                    ) {
                        return previous;
                    }
                    const { timeSlotPresetCascadePending: _pendingCascade, ...rest } = previous;
                    return rest;
                });
            })
            .catch((error) => {
                logMobileOwnerFailure('mobile_time_slot_preset_recovery_failed', error, {
                    ...getMobileOwnerStoreLogContext(expectedStoreId, expectedTenantId),
                    ...getBoundedMobileOwnerStringContext('operationId', pendingCascade.operationId),
                });
            })
            .finally(() => {
                actionInFlightRef.current = false;
                if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                    setIsSaving(false);
                }
            });
    }, [
        scopeKey,
        setStoreDetails,
        storeDetails?.storeId,
        storeDetails?.tenantId,
        storeDetails?.timeSlotPresetCascadePending,
    ]);

    const openAdd = () => {
        setEditingPreset(null);
        setFormLabel('');
        setFormStart('09:00');
        setFormEnd('17:00');
        setFormColor(PRESET_COLORS[presets.length % PRESET_COLORS.length]);
        setIsFormOpen(true);
    };

    const openEdit = (preset: TimeSlotPreset) => {
        setEditingPreset(preset);
        setFormLabel(preset.label);
        setFormStart(preset.startTime);
        setFormEnd(preset.endTime);
        setFormColor(preset.color || PRESET_COLORS[0]);
        setIsFormOpen(true);
    };

    const handleResetForm = () => {
        if (editingPreset) {
            setFormLabel(editingPreset.label);
            setFormStart(editingPreset.startTime);
            setFormEnd(editingPreset.endTime);
            setFormColor(editingPreset.color || PRESET_COLORS[0]);
            return;
        }

        setFormLabel('');
        setFormStart('09:00');
        setFormEnd('17:00');
        setFormColor(PRESET_COLORS[presets.length % PRESET_COLORS.length]);
    };

    const handleSave = async () => {
        const label = formLabel.trim();
        if (!label) return Toast.show({ content: t('enterName'), duration: 1500 });

        const isDuplicate = presets.some((preset) => preset.label.toLowerCase() === label.toLowerCase() && preset.id !== editingPreset?.id);
        if (isDuplicate) return Toast.show({ content: t('duplicateName'), duration: 1500 });

        if (!isValidClockRange(formStart, formEnd)) {
            return Toast.show({
                content: 'Enter valid, different start and end times.',
                duration: 1500,
            });
        }

        const expectedTenantId = Number(storeDetails?.tenantId);
        const expectedStoreId = Number(storeDetails?.storeId);
        const requestScopeKey = scopeKey;
        if (
            !Number.isSafeInteger(expectedTenantId)
            || expectedTenantId <= 0
            || !Number.isSafeInteger(expectedStoreId)
            || expectedStoreId <= 0
            || actionInFlightRef.current
        ) {
            return;
        }
        actionInFlightRef.current = true;
        setIsSaving(true);
        try {
            let updated: TimeSlotPreset[];
            if (editingPreset) {
                updated = presets.map((preset) => preset.id === editingPreset.id ? { ...editingPreset, color: formColor, endTime: formEnd, label, startTime: formStart } : preset);
            } else {
                updated = [...presets, { color: formColor, endTime: formEnd, id: generatePresetId(expectedTenantId, expectedStoreId), label, startTime: formStart }];
            }
            const updatedPresetForCascade = editingPreset
                ? updated.find((preset) => preset.id === editingPreset.id)
                : undefined;
            if (editingPreset && !updatedPresetForCascade) {
                throw new Error('mobile_time_slot_preset_cascade_update_rejected');
            }
            const writeResult = await updateTimeSlotPresets(
                expectedStoreId,
                updated,
                updatedPresetForCascade
                    ? { type: 'update', preset: updatedPresetForCascade }
                    : undefined,
            );
            assertTimeSlotPresetUpdateSucceeded(writeResult);
            if (editingPreset) {
                if (!writeResult.pendingCascade) {
                    throw new Error('mobile_time_slot_preset_cascade_update_rejected');
                }
                await reconcileTimeSlotPresetCascade(
                    { tenantId: expectedTenantId, storeId: expectedStoreId },
                    writeResult.pendingCascade,
                );
            }
            if (!componentActiveRef.current || activeScopeRef.current !== requestScopeKey) return;
            setPresets(updated);
            setStoreDetails((previous: any) => (
                String(previous?.tenantId ?? '') === String(expectedTenantId)
                && String(previous?.storeId ?? '') === String(expectedStoreId)
                    ? { ...previous, timeSlotPresets: updated }
                    : previous
            ));
            setIsFormOpen(false);
            Toast.show({ content: editingPreset ? t('updated') : t('created'), icon: 'success', duration: 1500 });
        } catch (error) {
            logMobileOwnerFailure('mobile_time_slot_preset_save_failed', error, {
                ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
                ...getBoundedMobileOwnerStringContext('presetId', editingPreset?.id),
                ...getBoundedMobileOwnerStringContext('presetLabel', label),
                ...getBoundedMobileOwnerStringContext('startTime', formStart),
                ...getBoundedMobileOwnerStringContext('endTime', formEnd),
                isEdit: Boolean(editingPreset),
                presetCount: presets.length,
                hasColor: Boolean(formColor),
                shouldCascadeCategoryUpdate: Boolean(editingPreset),
            });
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                Toast.show({ content: t('failedToSave'), duration: 1500 });
            }
        } finally {
            actionInFlightRef.current = false;
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                setIsSaving(false);
            }
        }
    };

    const handleDelete = async (preset: TimeSlotPreset) => {
        const expectedTenantId = Number(storeDetails?.tenantId);
        const expectedStoreId = Number(storeDetails?.storeId);
        const requestScopeKey = scopeKey;
        if (
            !componentActiveRef.current
            || activeScopeRef.current !== requestScopeKey
            || !Number.isSafeInteger(expectedTenantId)
            || expectedTenantId <= 0
            || !Number.isSafeInteger(expectedStoreId)
            || expectedStoreId <= 0
            || actionInFlightRef.current
        ) {
            return;
        }
        actionInFlightRef.current = true;
        setIsSaving(true);
        try {
            const updated = presets.filter((item) => item.id !== preset.id);
            const writeResult = await updateTimeSlotPresets(
                expectedStoreId,
                updated,
                { type: 'remove', presetId: preset.id },
            );
            assertTimeSlotPresetUpdateSucceeded(writeResult);
            if (!writeResult.pendingCascade) {
                throw new Error('mobile_time_slot_preset_cascade_delete_rejected');
            }
            await reconcileTimeSlotPresetCascade(
                { tenantId: expectedTenantId, storeId: expectedStoreId },
                writeResult.pendingCascade,
            );
            if (!componentActiveRef.current || activeScopeRef.current !== requestScopeKey) return;
            setPresets(updated);
            setStoreDetails((previous: any) => (
                String(previous?.tenantId ?? '') === String(expectedTenantId)
                && String(previous?.storeId ?? '') === String(expectedStoreId)
                    ? { ...previous, timeSlotPresets: updated }
                    : previous
            ));
            Toast.show({ content: t('deleted'), icon: 'success', duration: 1500 });
        } catch (error) {
            logMobileOwnerFailure('mobile_time_slot_preset_delete_failed', error, {
                ...getMobileOwnerStoreLogContext(expectedStoreId, expectedTenantId),
                ...getBoundedMobileOwnerStringContext('presetId', preset.id),
                ...getBoundedMobileOwnerStringContext('presetLabel', preset.label),
                presetCount: presets.length,
                remainingPresetCount: Math.max(presets.length - 1, 0),
                shouldCascadeCategoryDelete: true,
            });
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                Toast.show({ content: t('failedToDelete'), duration: 1500 });
            }
        } finally {
            actionInFlightRef.current = false;
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                setIsSaving(false);
            }
        }
    };

    if (isLoading) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle')}
                    onBack={onBack}
                    right={<Button fill="none" onClick={openAdd}><Flex align="center" gap={4}><LuPlus size={16} /><Text>{t('add')}</Text></Flex></Button>}
                    title={t('title')}
                />
                <Flex align="center" flex={1} justify="center"><DotLoading /></Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                right={<Button fill="none" onClick={openAdd}><Flex align="center" gap={4}><LuPlus size={16} /><Text>{t('add')}</Text></Flex></Button>}
                title={t('title')}
            />

            <Flex gap={12} style={{ padding: 16 }} vertical>
                {presets.length === 0 ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <Empty
                                description={t('noTimeSlotsYet')}
                                image={(
                                    <ContextualStateIllustration
                                        color={token.colorPrimary}
                                        size={88}
                                        treatment="softHalo"
                                        variant="scheduleContext"
                                    />
                                )}
                                styles={{ image: { height: 88 } }}
                            />
                            <Button onClick={openAdd}><Flex align="center" gap={6}><LuPlus size={16} /><Text>{t('createFirstSlot')}</Text></Flex></Button>
                        </Flex>
                    </Card>
                ) : (
                    <Flex gap={8} vertical>
                        {presets.map((preset) => (
                            <Card key={preset.id}>
                                <Flex align="center" gap={12} justify="space-between">
                                    <Flex align="center" gap={12}>
                                        <div
                                            style={{
                                                backgroundColor: preset.color || PRESET_COLORS[0],
                                                borderRadius: 999,
                                                height: 40,
                                                minWidth: 8,
                                                width: 8,
                                            }}
                                        />
                                        <Flex gap={2} vertical>
                                            <Text strong>{preset.label}</Text>
                                            <Text type="secondary">{formatClockTime(preset.startTime)} - {formatClockTime(preset.endTime)}</Text>
                                        </Flex>
                                    </Flex>
                                    <Flex gap={4}>
                                        <Button aria-label={t('editTimeSlot')} fill="none" onClick={() => openEdit(preset)} style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}><LuPencil color={token.colorTextSecondary} size={16} /></Button>
                                        <Button aria-label={t('delete')} fill="none" onClick={() => {
                                            void Dialog.confirm({
                                                cancelText: t('cancel'),
                                                confirmText: t('delete'),
                                                content: t('deleteConfirm', { name: preset.label }),
                                                onConfirm: () => handleDelete(preset),
                                                title: t('delete'),
                                            });
                                        }} style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}><LuTrash2 color={token.colorError} size={16} /></Button>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                )}
            </Flex>

            <Popup
                aria-label={editingPreset ? t('editTimeSlot') : t('newTimeSlot')}
                bodyStyle={{ maxHeight: '84vh', overflow: 'hidden', padding: 0 }}
                onMaskClick={() => setIsFormOpen(false)}
                visible={isFormOpen}
            >
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar
                        right={(
                            <Button
                                aria-label="Close time slot form"
                                fill="none"
                                onClick={() => setIsFormOpen(false)}
                                style={{ minHeight: 44, minWidth: 44, paddingInline: 0 }}
                            >
                                <LuX size={18} />
                            </Button>
                        )}
                    >
                        {editingPreset ? t('editTimeSlot') : t('newTimeSlot')}
                    </NavBar>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text strong>{t('name')}</Text>
                                <Text type="secondary">Choose a short label customers and staff can understand quickly, like Lunch, Happy Hour, or Dinner.</Text>
                                <Input aria-label={t('name')} maxLength={30} onChange={setFormLabel} placeholder={t('namePlaceholder')} value={formLabel} />
                            </Flex>
                        </Card>

                        <Card>
                            <Flex gap={10}>
                                <Flex style={{ flex: 1 }} vertical>
                                    <Text strong>{t('startTime')}</Text>
                                    <Text type="secondary">When this slot begins.</Text>
                                    <Input aria-label={t('startTime')} onChange={setFormStart} type="time" value={formStart} />
                                </Flex>
                                <Flex style={{ flex: 1 }} vertical>
                                    <Text strong>{t('endTime')}</Text>
                                    <Text type="secondary">When this slot ends.</Text>
                                    <Input aria-label={t('endTime')} onChange={setFormEnd} type="time" value={formEnd} />
                                </Flex>
                            </Flex>
                        </Card>

                        <Card title={t('color')}>
                            <Flex gap={8} wrap>
                                {PRESET_COLORS.map((color) => (
                                    <Button
                                        aria-label={`${t('color')} ${color}`}
                                        aria-pressed={formColor === color}
                                        fill="none"
                                        key={color}
                                        onClick={() => setFormColor(color)}
                                        style={{ minHeight: 44, minWidth: 44, padding: 2 }}
                                    >
                                        <div
                                            style={{
                                                alignItems: 'center',
                                                backgroundColor: color,
                                                borderRadius: 999,
                                                display: 'flex',
                                                height: 32,
                                                justifyContent: 'center',
                                                width: 32,
                                            }}
                                        >
                                            {formColor === color ? <LuCheck color="#fff" size={14} /> : null}
                                        </div>
                                    </Button>
                                ))}
                            </Flex>
                        </Card>
                    </Flex>

                    <Flex
                        gap={8}
                        style={{
                            backdropFilter: 'blur(10px)',
                            backgroundColor: token.colorBgContainer,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            bottom: MOBILE_BOTTOM_NAV_CLEARANCE,
                            padding: '12px 16px',
                            position: 'sticky',
                            zIndex: 20,
                        }}
                    >
                        <Button block disabled={isSaving} fill="outline" onClick={handleResetForm} size="large" style={{ minHeight: 44 }}>
                            Reset
                        </Button>
                        <Button block loading={isSaving} onClick={() => void handleSave()} size="large" style={{ minHeight: 44 }}>
                            {t('save')}
                        </Button>
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}

export default function MobileTimeSlotsScreen(props: MobileTimeSlotsScreenProps) {
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const scopeKey = `${String(storeDetails?.tenantId ?? '')}:${String(storeDetails?.storeId ?? '')}`;
    return <MobileTimeSlotsScreenContent key={scopeKey} {...props} />;
}
