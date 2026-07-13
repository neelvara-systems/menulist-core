import TimeSlotPresetForm, { DEFAULT_PRESET_COLORS } from '@atoms/timeSlotPresetForm';
import { assertProjectPresetCascadeSucceeded, removePresetFromAllCategories, updatePresetInAllCategories } from '@database/projects';
import { isValidClockRange } from '@lib/menu/timeSlotPresetBoundary';
import { assertTimeSlotPresetUpdateSucceeded, generatePresetId, updateTimeSlotPresets } from '@database/stores';
import { TimeSlotPreset } from '@type/platform/store';
import { formatClockTime } from '@util/dateTime';
import { Button, Card, Divider, Empty, Flex, message, Modal, Popconfirm, Typography, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useCallback, useState } from 'react';
import { LuClock, LuPen, LuPlus, LuTrash2 } from 'react-icons/lu';
import { getBoundedBusinessSettingsStringContext, logBusinessSettingsFailure } from '../utils/businessSettingsDiagnostics';

const { Title, Text } = Typography;

interface TimeSlotPresetsTabProps {
    scrollRef?: React.RefObject<HTMLDivElement>;
    tenantId: number;
    storeId: number;
    presets: TimeSlotPreset[];
    onPresetsChange: (presets: TimeSlotPreset[]) => void;
}

const TimeSlotPresetsTab: React.FC<TimeSlotPresetsTabProps> = ({
    scrollRef,
    tenantId,
    storeId,
    presets = [],
    onPresetsChange
}) => {
    const t = useTranslations('BusinessSettings');
    const { token } = theme.useToken();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<TimeSlotPreset | null>(null);
    const [formData, setFormData] = useState({
        label: '',
        startTime: '09:00',
        endTime: '17:00',
        color: DEFAULT_PRESET_COLORS[0]
    });
    const [loading, setLoading] = useState(false);

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
            message.error(t('enterLabel'));
            return;
        }

        // Check for duplicate labels (excluding current preset when editing)
        const isDuplicate = presets.some(p =>
            p.label.toLowerCase() === formData.label.trim().toLowerCase() &&
            p.id !== editingPreset?.id
        );
        if (isDuplicate) {
            message.error(t('duplicatePreset'));
            return;
        }

        if (!isValidClockRange(formData.startTime, formData.endTime)) {
            message.error(t('endAfterStart'));
            return;
        }

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
            const writeResult = await updateTimeSlotPresets(storeId, updatedPresets);
            assertTimeSlotPresetUpdateSucceeded(writeResult);
            if (editingPreset) {
                const updatedPreset = updatedPresets.find((preset) => preset.id === editingPreset.id);
                if (updatedPreset) {
                    const cascadeResult = await updatePresetInAllCategories(updatedPreset);
                    assertProjectPresetCascadeSucceeded(
                        cascadeResult,
                        'business_settings_time_slot_preset_cascade_update_rejected',
                    );
                }
            }
            onPresetsChange(updatedPresets);

            setIsModalOpen(false);
            resetForm();
            message.success(successMessage);
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
            message.error(t('failedToSaveTimeSlot'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (presetId: string) => {
        setLoading(true);
        try {
            // 1. Remove preset from store
            const updatedPresets = presets.filter(p => p.id !== presetId);
            const writeResult = await updateTimeSlotPresets(storeId, updatedPresets);
            assertTimeSlotPresetUpdateSucceeded(writeResult);

            // 2. Cascade delete: Remove from all categories that use this preset
            const cascadeResult = await removePresetFromAllCategories(presetId);
            assertProjectPresetCascadeSucceeded(
                cascadeResult,
                'business_settings_time_slot_preset_cascade_delete_rejected',
            );

            onPresetsChange(updatedPresets);
            message.success(t('timeSlotDeleted'));
        } catch (error) {
            logBusinessSettingsFailure('business_settings_time_slot_preset_delete_failed', error, {
                ...getBoundedBusinessSettingsStringContext('tenantId', tenantId),
                ...getBoundedBusinessSettingsStringContext('storeId', storeId),
                ...getBoundedBusinessSettingsStringContext('presetId', presetId),
                presetCount: presets.length,
            });
            message.error(t('failedToDeleteTimeSlot'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card size='small' ref={scrollRef}>
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
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
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
