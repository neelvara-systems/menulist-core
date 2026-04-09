'use client'

import { removePresetFromAllCategories } from '@database/projects';
import { generatePresetId, updateTimeSlotPresets } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { TimeSlotPreset } from '@type/platform/store';
import { buildClockTimeOptions, formatClockTime } from '@util/dateTime';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';
import { LuCheck, LuClock, LuPencil, LuPlus, LuTrash2, LuX } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Empty, Flex, Input, NavBar, Popup, Select, Text, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

const PRESET_COLORS = ['#f50', '#2db7f5', '#87d068', '#108ee9', '#531dab', '#c41d7f', '#d4380d', '#096dd9', '#7cb305', '#cf1322', '#08979c', '#d46b08'];

interface MobileTimeSlotsScreenProps {
    onBack: () => void;
}

export default function MobileTimeSlotsScreen({ onBack }: MobileTimeSlotsScreenProps) {
    const t = useTranslations('MobileTimeSlots');
    const { token } = theme.useToken();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [presets, setPresets] = useState<TimeSlotPreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<TimeSlotPreset | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [formLabel, setFormLabel] = useState('');
    const [formStart, setFormStart] = useState('09:00');
    const [formEnd, setFormEnd] = useState('17:00');
    const [formColor, setFormColor] = useState(PRESET_COLORS[0]);
    const pickerOptions = buildClockTimeOptions();

    useEffect(() => {
        if (storeDetails) {
            setPresets(storeDetails.timeSlotPresets || []);
            setIsLoading(false);
        }
    }, [storeDetails]);

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

    const handleSave = async () => {
        const label = formLabel.trim();
        if (!label) return Toast.show({ content: t('enterName'), duration: 1500 });

        const isDuplicate = presets.some((preset) => preset.label.toLowerCase() === label.toLowerCase() && preset.id !== editingPreset?.id);
        if (isDuplicate) return Toast.show({ content: t('duplicateName'), duration: 1500 });

        const startMin = parseInt(formStart.split(':')[0]) * 60 + parseInt(formStart.split(':')[1]);
        const endMin = parseInt(formEnd.split(':')[0]) * 60 + parseInt(formEnd.split(':')[1]);
        if (startMin >= endMin) return Toast.show({ content: t('endAfterStart'), duration: 1500 });

        setIsSaving(true);
        try {
            let updated: TimeSlotPreset[];
            if (editingPreset) {
                updated = presets.map((preset) => preset.id === editingPreset.id ? { ...editingPreset, color: formColor, endTime: formEnd, label, startTime: formStart } : preset);
            } else {
                updated = [...presets, { color: formColor, endTime: formEnd, id: generatePresetId(storeDetails?.tenantId, storeDetails?.storeId), label, startTime: formStart }];
            }
            await updateTimeSlotPresets(storeDetails?.storeId, updated);
            setPresets(updated);
            setIsFormOpen(false);
            Toast.show({ content: editingPreset ? t('updated') : t('created'), icon: 'success', duration: 1500 });
        } catch {
            Toast.show({ content: t('failedToSave'), duration: 1500 });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <Flex style={{ minHeight: '100%' }} vertical>
                <NavBar onBack={onBack} />
                <Flex align="center" flex={1} justify="center"><DotLoading /></Flex>
            </Flex>
        );
    }

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar
                onBack={onBack}
                right={<Button fill="none" onClick={openAdd}><Flex align="center" gap={4}><LuPlus size={16} /><Text>{t('add')}</Text></Flex></Button>}
            />

            <Flex gap={12} style={{ padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle')}
                    title={t('title')}
                />
                {presets.length === 0 ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <Empty description={t('noTimeSlotsYet')} />
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
                                        <Button fill="none" onClick={() => openEdit(preset)}><LuPencil color="#64748b" size={16} /></Button>
                                        <Button fill="none" onClick={() => {
                                            void Dialog.confirm({
                                                cancelText: t('cancel'),
                                                confirmText: t('delete'),
                                                content: t('deleteConfirm', { name: preset.label }),
                                                onConfirm: async () => {
                                                    try {
                                                        const updated = presets.filter((item) => item.id !== preset.id);
                                                        await updateTimeSlotPresets(storeDetails?.storeId, updated);
                                                        await removePresetFromAllCategories(preset.id);
                                                        setPresets(updated);
                                                        Toast.show({ content: t('deleted'), icon: 'success', duration: 1500 });
                                                    } catch {
                                                        Toast.show({ content: t('failedToDelete'), duration: 1500 });
                                                    }
                                                },
                                            });
                                        }}><LuTrash2 color="#ef4444" size={16} /></Button>
                                    </Flex>
                                </Flex>
                            </Card>
                        ))}
                    </Flex>
                )}
            </Flex>

            <Popup bodyStyle={{ maxHeight: '84vh', overflow: 'hidden', padding: 0 }} onMaskClick={() => setIsFormOpen(false)} visible={isFormOpen}>
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar
                        backIcon={<LuX size={20} />}
                        onBack={() => setIsFormOpen(false)}
                        right={<Button fill="none" onClick={() => void handleSave()}><Flex align="center" gap={4}><LuCheck size={16} /><Text>{isSaving ? t('saving') : t('save')}</Text></Flex></Button>}
                    >
                        {editingPreset ? t('editTimeSlot') : t('newTimeSlot')}
                    </NavBar>

                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Card>
                            <Flex gap={8} vertical>
                                <Text strong>{t('name')}</Text>
                                <Input maxLength={30} onChange={setFormLabel} placeholder={t('namePlaceholder')} value={formLabel} />
                            </Flex>
                        </Card>

                        <Card>
                            <Flex gap={8} vertical>
                                <Text strong>{t('startTime')}</Text>
                                <Select
                                    onChange={setFormStart}
                                    options={pickerOptions}
                                    placeholder={t('selectStartTime')}
                                    value={formStart}
                                />
                            </Flex>
                        </Card>

                        <Card>
                            <Flex gap={8} vertical>
                                <Text strong>{t('endTime')}</Text>
                                <Select
                                    onChange={setFormEnd}
                                    options={pickerOptions}
                                    placeholder={t('selectEndTime')}
                                    value={formEnd}
                                />
                            </Flex>
                        </Card>

                        <Card title={t('color')}>
                            <Flex gap={8} wrap>
                                {PRESET_COLORS.map((color) => (
                                    <Button key={color} fill="none" onClick={() => setFormColor(color)} style={{ height: 'auto', padding: 2 }}>
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
                </Flex>
            </Popup>
        </Flex>
    );
}
