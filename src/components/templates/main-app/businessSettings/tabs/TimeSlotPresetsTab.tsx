import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import TimeSlotPresetForm, { DEFAULT_PRESET_COLORS } from '@atoms/timeSlotPresetForm';
import { isValidClockRange } from '@lib/menu/timeSlotPresetBoundary';
import { assertTimeSlotPresetUpdateSucceeded, generatePresetId, updateTimeSlotPresets } from '@database/stores';
import { reconcileTimeSlotPresetCascade } from '@lib/menu/reconcileTimeSlotPresetCascade';
import { TimeSlotPreset, TimeSlotPresetCascadePending } from '@type/platform/store';
import { formatClockTime } from '@util/dateTime';
import { Button, Card, Divider, Empty, Flex, message, Modal, Popconfirm, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LuClock, LuPen, LuPlus, LuTrash2 } from 'react-icons/lu';
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from '../utils/businessSettingsDiagnostics';

const { Title, Text } = Typography;

interface TimeSlotPresetsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement | null>;
    tenantId: number;
    storeId: number;
    presets: TimeSlotPreset[];
    pendingCascade?: TimeSlotPresetCascadePending;
    onPresetsChange: (presets: TimeSlotPreset[]) => void;
    onCascadeRecovered: (operationId: string) => void;
}

const TimeSlotPresetsTab: React.FC<TimeSlotPresetsTabProps> = ({
    scrollRef,
    tenantId,
    storeId,
    presets = [],
    pendingCascade,
    onPresetsChange,
    onCascadeRecovered,
}) => {
    const t = useTranslations('BusinessSettings');
    const { token } = theme.useToken();
    const [messageApi, messageContextHolder] = message.useMessage();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<TimeSlotPreset | null>(null);
    const [formData, setFormData] = useState({
        label: '',
        startTime: '09:00',
        endTime: '17:00',
        color: DEFAULT_PRESET_COLORS[0]
    });
    const [loading, setLoading] = useState(false);
    const actionInFlightRef = useRef(false);
    const scopeKey = `${tenantId}::${storeId}`;
    const activeScopeRef = useRef(scopeKey);
    const componentActiveRef = useRef(true);
    const recoveryAttemptedOperationRef = useRef<string | null>(null);

    activeScopeRef.current = scopeKey;
    useEffect(() => {
        componentActiveRef.current = true;
        return () => {
            componentActiveRef.current = false;
        };
    }, []);
    useEffect(() => {
        if (
            !pendingCascade
            || recoveryAttemptedOperationRef.current === pendingCascade.operationId
            || actionInFlightRef.current
        ) {
            return;
        }
        recoveryAttemptedOperationRef.current = pendingCascade.operationId;
        const requestScopeKey = scopeKey;
        actionInFlightRef.current = true;
        setLoading(true);
        void reconcileTimeSlotPresetCascade({ tenantId, storeId }, pendingCascade)
            .then(({ operationId }) => {
                if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                    onCascadeRecovered(operationId);
                }
            })
            .catch((error) => {
                logBusinessSettingsFailure('business_settings_time_slot_preset_recovery_failed', error, {
                    ...getBoundedBusinessSettingsStringContext('tenantId', tenantId),
                    ...getBoundedBusinessSettingsStringContext('storeId', storeId),
                    ...getBoundedBusinessSettingsStringContext('operationId', pendingCascade.operationId),
                });
            })
            .finally(() => {
                actionInFlightRef.current = false;
                if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                    setLoading(false);
                }
            });
    }, [onCascadeRecovered, pendingCascade, scopeKey, storeId, tenantId]);

    const resetForm = useCallback(() => {
        setFormData({
            label: '',
            startTime: '09:00',
            endTime: '17:00',
            color: DEFAULT_PRESET_COLORS[presets.length % DEFAULT_PRESET_COLORS.length]
        });
        setEditingPreset(null);
    }, [presets.length]);

    const openAddModal = useCallback(() => {
        resetForm();
        setIsModalOpen(true);
    }, [resetForm]);

    const openEditModal = useCallback((preset: TimeSlotPreset) => {
        setEditingPreset(preset);
        setFormData({
            label: preset.label,
            startTime: preset.startTime,
            endTime: preset.endTime,
            color: preset.color || DEFAULT_PRESET_COLORS[0]
        });
        setIsModalOpen(true);
    }, []);

    const handleSave = async () => {
        if (!formData.label.trim()) {
            messageApi.error(t('enterLabel'));
            return;
        }

        // Check for duplicate labels (excluding current preset when editing)
        const isDuplicate = presets.some(p =>
            p.label.toLowerCase() === formData.label.trim().toLowerCase() &&
            p.id !== editingPreset?.id
        );
        if (isDuplicate) {
            messageApi.error(t('duplicatePreset'));
            return;
        }

        if (!isValidClockRange(formData.startTime, formData.endTime)) {
            messageApi.error(t('endAfterStart'));
            return;
        }

        const expectedScope = { tenantId, storeId };
        const requestScopeKey = scopeKey;
        if (actionInFlightRef.current) return;
        actionInFlightRef.current = true;
        setLoading(true);
        try {
            let updatedPresets: TimeSlotPreset[];
            let successMessage: string;

            if (editingPreset) {
                // Update existing preset
                const updatedPreset: TimeSlotPreset = {
                    ...editingPreset,
                    label: formData.label.trim(),
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    color: formData.color
                };
                updatedPresets = presets.map(p => p.id === updatedPreset.id ? updatedPreset : p);
                successMessage = t('timeSlotUpdated');
            } else {
                // Create new preset with generated ID
                const newPreset: TimeSlotPreset = {
                    id: generatePresetId(tenantId, storeId),
                    label: formData.label.trim(),
                    startTime: formData.startTime,
                    endTime: formData.endTime,
                    color: formData.color
                };
                updatedPresets = [...presets, newPreset];
                successMessage = t('timeSlotCreated');
            }

            // Persist to DB and update context
            const updatedPresetForCascade = editingPreset
                ? updatedPresets.find((preset) => preset.id === editingPreset.id)
                : undefined;
            if (editingPreset && !updatedPresetForCascade) {
                throw new Error('business_settings_time_slot_preset_cascade_update_rejected');
            }
            const cascadeMutation = updatedPresetForCascade
                ? { type: 'update' as const, preset: updatedPresetForCascade }
                : undefined;
            const writeResult = await updateTimeSlotPresets(storeId, updatedPresets, cascadeMutation);
            assertTimeSlotPresetUpdateSucceeded(writeResult);
            if (editingPreset) {
                if (!writeResult.pendingCascade) {
                    throw new Error('business_settings_time_slot_preset_cascade_update_rejected');
                }
                await reconcileTimeSlotPresetCascade(expectedScope, writeResult.pendingCascade);
            }
            if (!componentActiveRef.current || activeScopeRef.current !== requestScopeKey) return;
            onPresetsChange(updatedPresets);

            setIsModalOpen(false);
            resetForm();
            messageApi.success(successMessage);
        } catch (error) {
            logBusinessSettingsFailure('business_settings_time_slot_preset_save_failed', error, {
                ...getBoundedBusinessSettingsStringContext('tenantId', tenantId),
                ...getBoundedBusinessSettingsStringContext('storeId', storeId),
                ...getBoundedBusinessSettingsStringContext('presetId', editingPreset?.id),
                ...getBoundedBusinessSettingsStringContext('label', formData.label),
                ...getBoundedBusinessSettingsStringContext('startTime', formData.startTime),
                ...getBoundedBusinessSettingsStringContext('endTime', formData.endTime),
                isEditing: Boolean(editingPreset),
                presetCount: presets.length,
            });
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                messageApi.error(t('failedToSaveTimeSlot'));
            }
        } finally {
            actionInFlightRef.current = false;
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                setLoading(false);
            }
        }
    };

    const handleDelete = async (presetId: string) => {
        const expectedScope = { tenantId, storeId };
        const requestScopeKey = scopeKey;
        if (actionInFlightRef.current) return;
        actionInFlightRef.current = true;
        setLoading(true);
        try {
            // 1. Remove preset from store
            const updatedPresets = presets.filter(p => p.id !== presetId);
            const writeResult = await updateTimeSlotPresets(
                storeId,
                updatedPresets,
                { type: 'remove', presetId },
            );
            assertTimeSlotPresetUpdateSucceeded(writeResult);

            // 2. Cascade delete: Remove from all categories that use this preset
            if (!writeResult.pendingCascade) {
                throw new Error('business_settings_time_slot_preset_cascade_delete_rejected');
            }
            await reconcileTimeSlotPresetCascade(expectedScope, writeResult.pendingCascade);

            if (!componentActiveRef.current || activeScopeRef.current !== requestScopeKey) return;
            onPresetsChange(updatedPresets);
            messageApi.success(t('timeSlotDeleted'));
        } catch (error) {
            logBusinessSettingsFailure('business_settings_time_slot_preset_delete_failed', error, {
                ...getBoundedBusinessSettingsStringContext('tenantId', tenantId),
                ...getBoundedBusinessSettingsStringContext('storeId', storeId),
                ...getBoundedBusinessSettingsStringContext('presetId', presetId),
                presetCount: presets.length,
            });
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                messageApi.error(t('failedToDeleteTimeSlot'));
            }
        } finally {
            actionInFlightRef.current = false;
            if (componentActiveRef.current && activeScopeRef.current === requestScopeKey) {
                setLoading(false);
            }
        }
    };

    return (
        <Card size='small' ref={scrollRef}>
            {messageContextHolder}
            <Flex justify="space-between" align="center">
                <Title level={5} style={{ margin: "unset" }}>{t('timeSlotPresets')}</Title>
                <Button
                    type="primary"
                    icon={<LuPlus size={16} />}
                    onClick={openAddModal}
                >
                    {t('addPreset')}
                </Button>
            </Flex>
            <Divider />

            <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                {t('timeSlotPresetsDesc')}
            </Text>

            {presets.length === 0 ? (
                <Empty
                    image={(
                        <ContextualStateIllustration
                            color={token.colorPrimary}
                            size={104}
                            treatment="softHalo"
                            variant="scheduleContext"
                        />
                    )}
                    styles={{ image: { height: 104 } }}
                    description={t('noPresetsYet')}
                >
                    <Button type="primary" onClick={openAddModal}>{t('createFirstPreset')}</Button>
                </Empty>
            ) : (
                <Flex vertical gap={8}>
                    {presets.map((preset) => (
                        <Flex
                            key={preset.id}
                            align="center"
                            justify="space-between"
                            style={{
                                padding: '12px 16px',
                                background: token.colorFillAlter,
                                borderRadius: 8,
                                border: `1px solid ${token.colorBorderSecondary}`,
                            }}
                        >
                            <Flex align="center" gap={12}>
                                <div
                                    style={{
                                        width: 8,
                                        height: 32,
                                        borderRadius: 4,
                                        background: preset.color || DEFAULT_PRESET_COLORS[0]
                                    }}
                                />
                                <Flex vertical>
                                    <Text strong>{preset.label}</Text>
                                    <Flex align="center" gap={4}>
                                        <LuClock size={12} style={{ opacity: 0.5 }} />
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {formatClockTime(preset.startTime)} - {formatClockTime(preset.endTime)}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Flex>
                            <Flex gap={8}>
                                <Button
                                    aria-label={t('editTimeSlot')}
                                    type="text"
                                    size="small"
                                    icon={<LuPen size={14} />}
                                    onClick={() => openEditModal(preset)}
                                />
                                <Popconfirm
                                    title={t('deletePreset')}
                                    description={t('deletePresetDesc')}
                                    onConfirm={() => handleDelete(preset.id)}
                                    okText={t('delete' as any)}
                                    okButtonProps={{ danger: true }}
                                >
                                    <Button
                                        aria-label={t('delete' as any)}
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<LuTrash2 size={14} />}
                                    />
                                </Popconfirm>
                            </Flex>
                        </Flex>
                    ))}
                </Flex>
            )}

            <Modal
                title={editingPreset ? t('editTimeSlot') : t('createTimeSlot')}
                open={isModalOpen}
                onCancel={() => {
                    setIsModalOpen(false);
                    resetForm();
                }}
                onOk={handleSave}
                okText={editingPreset ? t('update') : t('create')}
                confirmLoading={loading}
            >
                <TimeSlotPresetForm
                    formData={formData}
                    onChange={setFormData}
                    showLabels
                    showCharCount
                />
            </Modal>
        </Card>
    );
};

export default TimeSlotPresetsTab;
