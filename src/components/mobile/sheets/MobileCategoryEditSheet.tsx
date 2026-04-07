'use client'

import type { TimeSlotPreset } from '@type/platform/store';
import { formatClockTime } from '@util/dateTime';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { LuCheck, LuClock, LuPlus, LuTrash2 } from 'react-icons/lu';
import { Button, Card, Checkbox, Flex, Input, NavBar, Popup, Switch, Tag, Text } from '../antd';
import type { MobileCategoryItem } from './CategoryManagerSheet';

type SavePayload = {
    active: boolean;
    id?: string;
    name: string;
    presetIds: string[];
};

interface MobileCategoryEditSheetProps {
    category?: MobileCategoryItem | null;
    mode: 'add' | 'edit';
    onClose: () => void;
    onDelete?: (categoryId: string) => void;
    onSave: (payload: SavePayload) => Promise<void>;
    presets: TimeSlotPreset[];
    visible: boolean;
}

export default function MobileCategoryEditSheet({
    category,
    mode,
    onClose,
    onDelete,
    onSave,
    presets,
    visible,
}: MobileCategoryEditSheetProps) {
    const t = useTranslations('MobileMenu');
    const [name, setName] = useState('');
    const [active, setActive] = useState(true);
    const [presetIds, setPresetIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!visible) return;
        setName(category?.name || '');
        setActive(category?.active ?? true);
        setPresetIds(category?.timeSlotPresetIds || []);
    }, [category, visible]);

    const selectedCount = useMemo(() => presetIds.length, [presetIds.length]);

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            await onSave({
                active,
                id: category?.id,
                name: name.trim(),
                presetIds,
            });
            onClose();
        } finally {
            setIsSaving(false);
        }
    };

    if (!visible) return null;

    return (
        <Popup
            bodyStyle={{ maxHeight: '85vh', padding: 0 }}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onClose}>
                    {mode === 'add' ? t('addCategoryLabel') : (category?.name || t('categoriesTitle'))}
                </NavBar>

                <Flex gap={12} style={{ padding: 12 }} vertical>
                    <Card size="small">
                        <Flex gap={12} vertical>
                            <Flex gap={4} vertical>
                                <Text strong>{t('categoryNamePlaceholder')}</Text>
                                <Input onChange={setName} placeholder={t('categoryNamePlaceholder')} value={name} />
                            </Flex>

                            <Flex align="center" justify="space-between">
                                <Text strong>{t('active')}</Text>
                                <Switch checked={active} onChange={setActive} />
                            </Flex>
                        </Flex>
                    </Card>

                    <Card size="small">
                        <Flex gap={10} vertical>
                            <Flex align="center" gap={8} justify="space-between">
                                <Flex align="center" gap={8}>
                                    <LuClock size={16} />
                                    <Text strong>{t('categorySchedule')}</Text>
                                </Flex>
                                {selectedCount > 0 ? <Tag color="processing">{t('selectedCount', { count: selectedCount })}</Tag> : null}
                            </Flex>

                            {presets.length === 0 ? (
                                <Text type="secondary">{t('scheduleEmpty')}</Text>
                            ) : (
                                <Flex gap={8} vertical>
                                    {presets.map((preset) => {
                                        const checked = presetIds.includes(preset.id);
                                        return (
                                            <Checkbox
                                                checked={checked}
                                                key={preset.id}
                                                onChange={(nextChecked) => {
                                                    setPresetIds((prev) => nextChecked ? [...prev, preset.id] : prev.filter((id) => id !== preset.id));
                                                }}
                                            >
                                                <Flex align="center" gap={8} wrap="wrap">
                                                    <Tag color={preset.color || 'processing'}>{preset.label}</Tag>
                                                    <Text type="secondary">{`${formatClockTime(preset.startTime)} - ${formatClockTime(preset.endTime)}`}</Text>
                                                </Flex>
                                            </Checkbox>
                                        );
                                    })}
                                </Flex>
                            )}
                        </Flex>
                    </Card>
                </Flex>

                <Card style={{ borderBottom: 0, borderLeft: 0, borderRadius: 0, borderRight: 0, marginTop: 'auto' }}>
                    <Flex gap={8} vertical>
                        <Flex gap={8}>
                            <Button block fill="outline" onClick={onClose}>
                                {t('cancel')}
                            </Button>
                            <Button block disabled={!name.trim()} loading={isSaving} onClick={() => void handleSave()}>
                                <Flex align="center" gap={6}>
                                    {mode === 'add' ? <LuPlus size={14} /> : <LuCheck size={14} />}
                                    <Text>{mode === 'add' ? t('add') : t('save')}</Text>
                                </Flex>
                            </Button>
                        </Flex>

                        {mode === 'edit' && category?.id && onDelete ? (
                            <Button block color="danger" fill="outline" onClick={() => onDelete(category.id)}>
                                <Flex align="center" gap={8}>
                                    <LuTrash2 size={16} />
                                    <Text>{t('delete')}</Text>
                                </Flex>
                            </Button>
                        ) : null}
                    </Flex>
                </Card>
            </Flex>
        </Popup>
    );
}
