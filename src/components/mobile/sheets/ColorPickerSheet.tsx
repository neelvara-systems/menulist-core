'use client'

import { BRAND_COLOR_PRESETS } from '@config/designSystem';
import { Button, Input, NavBar, Popup, Toast } from 'antd-mobile';
import { useState } from 'react';
import { LuCheck, LuX } from 'react-icons/lu';

interface ColorPickerSheetProps {
    visible: boolean;
    onClose: () => void;
    value?: string;
    onChange: (color: string | undefined) => void;
    defaultMoodColor: string;
}

export default function ColorPickerSheet({ visible, onClose, value, onChange, defaultMoodColor }: ColorPickerSheetProps) {
    const [hexInput, setHexInput] = useState(value || '');
    const activeColor = value || defaultMoodColor;

    const handlePresetSelect = (color: string) => {
        setHexInput(color);
        onChange(color);
    };

    const handleHexSubmit = () => {
        const hex = hexInput.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            onChange(hex);
        } else if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
            onChange(`#${hex}`);
        } else {
            Toast.show({ content: 'Enter a valid hex color (e.g. #FF5500)', duration: 2000 });
        }
    };

    const handleClearBrandColor = () => {
        onChange(undefined);
        setHexInput('');
        onClose();
    };

    return (
        <Popup
            visible={visible}
            onMaskClick={onClose}
            position="bottom"
            bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, maxHeight: '70vh' }}
        >
            <NavBar onBack={onClose} backIcon={<LuX size={20} />}>
                Brand Color
            </NavBar>
            <div className="px-4 pb-6 space-y-5">
                {/* Current Color Preview */}
                <div className="flex items-center gap-3 py-2">
                    <div
                        className="w-10 h-10 rounded-lg border-2 border-gray-200 dark:border-gray-700 flex-shrink-0"
                        style={{ backgroundColor: activeColor }}
                    />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {value ? 'Custom brand color' : 'Using mood default'}
                        </p>
                        <p className="text-xs text-gray-500">{activeColor.toUpperCase()}</p>
                    </div>
                </div>

                {/* Preset Colors */}
                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Presets</p>
                    <div className="grid grid-cols-4 gap-3">
                        {BRAND_COLOR_PRESETS.map((preset) => {
                            const isSelected = value === preset.color;
                            return (
                                <button
                                    key={preset.color}
                                    onClick={() => handlePresetSelect(preset.color)}
                                    className="flex flex-col items-center gap-1.5 py-2 rounded-lg active:bg-gray-100 dark:active:bg-gray-800"
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{
                                            backgroundColor: preset.color,
                                            boxShadow: isSelected ? `0 0 0 3px white, 0 0 0 5px ${preset.color}` : 'none',
                                        }}
                                    >
                                        {isSelected && <LuCheck size={18} className="text-white" />}
                                    </div>
                                    <span className="text-[11px] text-gray-600 dark:text-gray-400">{preset.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Custom Hex Input */}
                <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Custom Color</p>
                    <div className="flex gap-2">
                        <Input
                            value={hexInput}
                            onChange={setHexInput}
                            placeholder="#FF5500"
                            style={{ '--font-size': '15px' } as React.CSSProperties}
                            className="flex-1"
                        />
                        <Button
                            color="primary"
                            size="small"
                            onClick={handleHexSubmit}
                            style={{ height: 36, paddingInline: 16 }}
                        >
                            Apply
                        </Button>
                    </div>
                </div>

                {/* Use Default / Clear */}
                {value && (
                    <Button
                        block
                        fill="none"
                        onClick={handleClearBrandColor}
                        className="text-gray-500"
                    >
                        Use mood default color instead
                    </Button>
                )}
            </div>
        </Popup>
    );
}
