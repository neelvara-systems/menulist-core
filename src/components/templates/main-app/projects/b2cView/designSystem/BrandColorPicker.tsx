/**
 * Theme Color Picker
 * 
 * Simple, non-technical UI for restaurant owners to set their menu theme color.
 * Uses preset swatches + optional custom picker.
 * 
 * UX Philosophy:
 * - Show presets first (most users won't need custom)
 * - "Use custom theme color" toggle makes it clear this is optional
 * - Visual feedback with live preview dot
 */

import { ColorPicker, Flex, Switch, Typography } from 'antd';
import { LuPalette } from 'react-icons/lu';
import { BRAND_COLOR_PRESETS, MENU_MOODS, MenuMood } from './index';

const { Text } = Typography;

interface BrandColorPickerProps {
    value?: string;
    onChange: (color: string | undefined) => void;
    currentMood: MenuMood;
}

const BrandColorPicker: React.FC<BrandColorPickerProps> = ({
    value,
    onChange,
    currentMood,
}) => {
    const isEnabled = !!value;
    const defaultMoodColor = MENU_MOODS[currentMood]?.accentColor || MENU_MOODS[MenuMood.CLEAN].accentColor;
    const activeColor = value || defaultMoodColor;

    const handleToggle = (enabled: boolean) => {
        if (enabled) {
            onChange(defaultMoodColor);
        } else {
            onChange(undefined);
        }
    };

    const handlePresetClick = (color: string) => {
        onChange(color);
    };

    const handleCustomChange = (color: any) => {
        onChange(color.toHexString());
    };

    return (
        <Flex vertical gap={12}>
            <Flex align="center" justify="space-between">
                <Flex align="center" gap={8}>
                    <LuPalette size={16} />
                    <Text>Use custom theme color</Text>
                </Flex>
                <Switch
                    aria-label="Use custom theme color"
                    checked={isEnabled}
                    onChange={handleToggle}
                    size="small"
                />
            </Flex>

            {isEnabled && (
                <Flex vertical gap={12} style={{ paddingLeft: 24 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Pick a highlight color for this menu
                    </Text>

                    <Flex gap={8} wrap="wrap">
                        {BRAND_COLOR_PRESETS.map((preset) => (
                            <button
                                key={preset.color}
                                onClick={() => handlePresetClick(preset.color)}
                                title={preset.name}
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: activeColor === preset.color
                                        ? '2px solid #fff'
                                        : '2px solid transparent',
                                    background: preset.color,
                                    cursor: 'pointer',
                                    transition: 'transform 0.15s, border-color 0.15s',
                                    transform: activeColor === preset.color ? 'scale(1.1)' : 'scale(1)',
                                    boxShadow: activeColor === preset.color
                                        ? `0 0 0 2px ${preset.color}40`
                                        : 'none',
                                }}
                            />
                        ))}

                        <ColorPicker
                            value={activeColor}
                            onChange={handleCustomChange}
                            size="small"
                            showText={false}
                        >
                            <button
                                title="Custom color"
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 8,
                                    border: '2px dashed rgba(255,255,255,0.3)',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'rgba(255,255,255,0.5)',
                                    fontSize: 16,
                                }}
                            >
                                +
                            </button>
                        </ColorPicker>
                    </Flex>

                    <Flex align="center" gap={8}>
                        <div
                            style={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                background: activeColor,
                            }}
                        />
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {activeColor.toUpperCase()}
                        </Text>
                    </Flex>
                </Flex>
            )}
        </Flex>
    );
};

export default BrandColorPicker;
