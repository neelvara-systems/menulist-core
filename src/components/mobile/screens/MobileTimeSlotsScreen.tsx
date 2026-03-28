'use client'

import { removePresetFromAllCategories } from '@database/projects';
import { generatePresetId, updateTimeSlotPresets } from '@database/stores';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { TimeSlotPreset } from '@type/platform/store';
import { Button, Card, Dialog, DotLoading, Empty, Input, NavBar, Popup, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useContext, useEffect, useState } from 'react';
import { LuArrowLeft, LuCheck, LuClock, LuPencil, LuPlus, LuTrash2, LuX } from 'react-icons/lu';

// Preset colors (same as desktop DEFAULT_PRESET_COLORS from antdTagsColorCodes)
const PRESET_COLORS = [
    '#f50', '#2db7f5', '#87d068', '#108ee9',
    '#531dab', '#c41d7f', '#d4380d', '#096dd9',
    '#7cb305', '#cf1322', '#08979c', '#d46b08',
];

interface MobileTimeSlotsScreenProps {
    onBack: () => void;
}

export default function MobileTimeSlotsScreen({ onBack }: MobileTimeSlotsScreenProps) {
    const t = useTranslations('MobileTimeSlots');
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [presets, setPresets] = useState<TimeSlotPreset[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingPreset, setEditingPreset] = useState<TimeSlotPreset | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // ── Form state ───────────────────────────────────────────────
    const [formLabel, setFormLabel] = useState('');
    const [formStart, setFormStart] = useState('09:00');
    const [formEnd, setFormEnd] = useState('17:00');
    const [formColor, setFormColor] = useState(PRESET_COLORS[0]);

    // ── Load presets ─────────────────────────────────────────────
    useEffect(() => {
        if (storeDetails) {
            setPresets(storeDetails.timeSlotPresets || []);
            setIsLoading(false);
        }
    }, [storeDetails]);

    // ── Open add/edit form ───────────────────────────────────────
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

    // ── Save ─────────────────────────────────────────────────────
    const handleSave = async () => {
        const label = formLabel.trim();
        if (!label) {
            Toast.show({ content: t('enterName'), duration: 1500 });
            return;
        }

        // Duplicate check
        const isDuplicate = presets.some(
            p => p.label.toLowerCase() === label.toLowerCase() && p.id !== editingPreset?.id
        );
        if (isDuplicate) {
            Toast.show({ content: t('duplicateName'), duration: 1500 });
            return;
        }

        // Time validation
        const startMin = parseInt(formStart.split(':')[0]) * 60 + parseInt(formStart.split(':')[1]);
        const endMin = parseInt(formEnd.split(':')[0]) * 60 + parseInt(formEnd.split(':')[1]);
        if (startMin >= endMin) {
            Toast.show({ content: t('endAfterStart'), duration: 1500 });
            return;
        }

        setIsSaving(true);
        try {
            let updated: TimeSlotPreset[];

            if (editingPreset) {
                const updatedPreset: TimeSlotPreset = {
                    ...editingPreset,
                    label,
                    startTime: formStart,
                    endTime: formEnd,
                    color: formColor,
                };
                updated = presets.map(p => p.id === editingPreset.id ? updatedPreset : p);
            } else {
                const newPreset: TimeSlotPreset = {
                    id: generatePresetId(storeDetails?.tenantId, storeDetails?.storeId),
                    label,
                    startTime: formStart,
                    endTime: formEnd,
                    color: formColor,
                };
                updated = [...presets, newPreset];
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

    // ── Delete ───────────────────────────────────────────────────
    const handleDelete = (preset: TimeSlotPreset) => {
        Dialog.confirm({
            content: t('deleteConfirm', { name: preset.label }),
            confirmText: t('delete'),
            cancelText: t('cancel'),
            onConfirm: async () => {
                try {
                    const updated = presets.filter(p => p.id !== preset.id);
                    await updateTimeSlotPresets(storeDetails?.storeId, updated);
                    await removePresetFromAllCategories(preset.id);
                    setPresets(updated);
                    Toast.show({ content: t('deleted'), icon: 'success', duration: 1500 });
                } catch {
                    Toast.show({ content: t('failedToDelete'), duration: 1500 });
                }
            },
        });
    };

    // ── Format time for display ──────────────────────────────────
    const formatTime = (t: string) => {
        const [h, m] = t.split(':').map(Number);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
    };

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <NavBar onBack={onBack} backIcon={<LuArrowLeft size={20} />}>{t('title')}</NavBar>
                <div className="flex-1 flex items-center justify-center"><DotLoading /></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
            <NavBar
                onBack={onBack}
                backIcon={<LuArrowLeft size={20} />}
                right={
                    <button onClick={openAdd} className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                        <LuPlus size={16} /> {t('add')}
                    </button>
                }
            >
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pb-6">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    {t('subtitle')}
                </p>

                {presets.length === 0 ? (
                    <div className="pt-16 flex flex-col items-center gap-4">
                        <Empty description={t('noTimeSlotsYet')} />
                        <Button color="primary" onClick={openAdd}>
                            <span className="flex items-center gap-1.5"><LuPlus size={16} /> {t('createFirstSlot')}</span>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {presets.map((preset) => (
                            <Card key={preset.id} className="rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-2 h-10 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: preset.color || PRESET_COLORS[0] }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{preset.label}</p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1">
                                            <LuClock size={12} />
                                            {formatTime(preset.startTime)} – {formatTime(preset.endTime)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => openEdit(preset)}
                                        className="p-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
                                    >
                                        <LuPencil size={16} className="text-gray-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(preset)}
                                        className="p-2 rounded-lg active:bg-red-50 dark:active:bg-red-900/20"
                                    >
                                        <LuTrash2 size={16} className="text-red-500" />
                                    </button>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Add/Edit Popup ───────────────────────────────── */}
            <Popup
                visible={isFormOpen}
                onMaskClick={() => setIsFormOpen(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
            >
                <NavBar
                    onBack={() => setIsFormOpen(false)}
                    backIcon={<LuX size={20} />}
                    right={
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-1 text-blue-600 text-sm font-medium disabled:opacity-50"
                        >
                            <LuCheck size={16} /> {isSaving ? t('saving') : t('save')}
                        </button>
                    }
                >
                    {editingPreset ? t('editTimeSlot') : t('newTimeSlot')}
                </NavBar>
                <div className="px-4 pb-6 space-y-5">
                    {/* Name */}
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{t('name')}</p>
                        <Input
                            value={formLabel}
                            onChange={setFormLabel}
                            placeholder={t('namePlaceholder')}
                            maxLength={30}
                            style={{ '--font-size': '15px' } as React.CSSProperties}
                        />
                    </div>

                    {/* Times */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{t('startTime')}</p>
                            <input
                                type="time"
                                value={formStart}
                                onChange={(e) => setFormStart(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">{t('endTime')}</p>
                            <input
                                type="time"
                                value={formEnd}
                                onChange={(e) => setFormEnd(e.target.value)}
                                className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100"
                            />
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{t('color')}</p>
                        <div className="flex gap-2 flex-wrap">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setFormColor(color)}
                                    className="w-8 h-8 rounded-full flex items-center justify-center"
                                    style={{
                                        backgroundColor: color,
                                        boxShadow: formColor === color ? `0 0 0 3px white, 0 0 0 5px ${color}` : 'none',
                                    }}
                                >
                                    {formColor === color && <LuCheck size={14} className="text-white" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Popup>
        </div>
    );
}
