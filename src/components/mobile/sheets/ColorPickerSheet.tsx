'use client'

import { BRAND_COLOR_PRESETS } from '@config/designSystem';
import { ColorPicker, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LuCheck } from 'react-icons/lu';
import { Button, Card, Flex, Input, NavBar, Popup, Text } from '../antd';
import { MENU_SHEET_BODY_STYLE, MENU_SHEET_CONTAINER_STYLE } from './menuSheetLayout';

interface ColorPickerSheetProps {
    businessBrandColor?: string;
    currentToneLabel?: string;
    defaultMoodColor: string;
    onChange: (color: string | undefined) => void;
    onClose: () => void;
    showDefaultColorOption?: boolean;
    value?: string;
    visible: boolean;
}

const normalizeHexColor = (color?: string) => {
    const raw = color?.trim();
    if (!raw) return '';
    const withHash = raw.startsWith('#') ? raw : `#${raw}`;
    return /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash.toUpperCase() : '';
};

export default function ColorPickerSheet({
    businessBrandColor,
    currentToneLabel,
    defaultMoodColor,
    onChange,
    onClose,
    showDefaultColorOption = true,
    value,
    visible,
}: ColorPickerSheetProps) {
    const t = useTranslations('MobileDesignEditor');
    const { token } = theme.useToken();
    const [hexInput, setHexInput] = useState(value || '');
    const activeColor = value || defaultMoodColor;
    const normalizedActiveColor = normalizeHexColor(activeColor) || activeColor.toUpperCase();
    const normalizedBusinessBrandColor = normalizeHexColor(businessBrandColor);
    const isBusinessBrandColorSelected = Boolean(value && normalizedBusinessBrandColor && normalizeHexColor(value) === normalizedBusinessBrandColor);
    const isToneStyleColorSelected = !value;
    const toneLabel = currentToneLabel || t('menuMood');
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 18,
    } as const;

    useEffect(() => {
        setHexInput(value || '');
    }, [value, visible]);

    const handleHexInputChange = (nextValue: string) => {
        setHexInput(nextValue);
        const normalized = normalizeHexColor(nextValue);
        if (normalized) {
            onChange(normalized);
        }
    };

    const renderSwatch = (color: string, size = 40) => {
        return (
            <span
                aria-hidden
                style={{
                    backgroundColor: color,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    borderRadius: 12,
                    display: 'inline-block',
                    flex: `0 0 ${size}px`,
                    height: size,
                    width: size,
                }}
            />
        );
    };

    return (
        <Popup
            bodyStyle={MENU_SHEET_BODY_STYLE}
            destroyOnClose
            onMaskClick={onClose}
            position="bottom"
            visible={visible}
        >
            <Flex style={MENU_SHEET_CONTAINER_STYLE} vertical>
                <NavBar onBack={onClose}>{t('brandColor')}</NavBar>

                <Flex gap={16} style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 12px 12px' }} vertical>
                    <Card
                        style={{
                            backgroundColor: token.colorFillQuaternary,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 18,
                        }}
                    >
                        <Flex align="center" gap={12}>
                            {renderSwatch(normalizedActiveColor, 44)}
                            <Flex gap={2} vertical>
                                <Text strong>{t('currentSelectedColor')}</Text>
                                <Text type="secondary">{normalizedActiveColor}</Text>
                            </Flex>
                        </Flex>
                    </Card>

                    {normalizedBusinessBrandColor ? (
                        <Card
                            onClick={() => {
                                setHexInput(normalizedBusinessBrandColor);
                                onChange(normalizedBusinessBrandColor);
                            }}
                            style={{
                                ...sectionCardStyle,
                                borderColor: isBusinessBrandColorSelected ? token.colorPrimary : token.colorBorderSecondary,
                                cursor: 'pointer',
                            }}
                        >
                            <Flex align="center" gap={12}>
                                {renderSwatch(normalizedBusinessBrandColor)}
                                <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                    <Text strong>{t('useBusinessBrandColor')}</Text>
                                    <Text type="secondary">{t('useBusinessBrandColorDesc')}</Text>
                                </Flex>
                                {isBusinessBrandColorSelected ? <LuCheck color={token.colorPrimary} size={18} /> : null}
                            </Flex>
                        </Card>
                    ) : null}

                    {showDefaultColorOption ? (
                        <Card
                            onClick={() => {
                                setHexInput('');
                                onChange(undefined);
                            }}
                            style={{
                                ...sectionCardStyle,
                                borderColor: isToneStyleColorSelected ? token.colorPrimary : token.colorBorderSecondary,
                                cursor: 'pointer',
                            }}
                        >
                            <Flex align="center" gap={12}>
                                {renderSwatch(normalizeHexColor(defaultMoodColor) || defaultMoodColor)}
                                <Flex gap={2} style={{ flex: 1, minWidth: 0 }} vertical>
                                    <Text strong>{t('useMoodDefault', { tone: toneLabel })}</Text>
                                    <Text type="secondary">{t('useMoodDefaultDesc', { tone: toneLabel })}</Text>
                                </Flex>
                                {isToneStyleColorSelected ? <LuCheck color={token.colorPrimary} size={18} /> : null}
                            </Flex>
                        </Card>
                    ) : null}

                    <Card style={sectionCardStyle} title={t('presetColors')}>
                        <div
                            style={{
                                display: 'grid',
                                gap: '18px 8px',
                                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                            }}
                        >
                            {BRAND_COLOR_PRESETS.map((preset) => {
                                const isSelected = Boolean(value && normalizeHexColor(value) === normalizeHexColor(preset.color));
                                return (
                                    <Button
                                        key={preset.color}
                                        fill="none"
                                        onClick={() => { setHexInput(preset.color); onChange(preset.color); }}
                                        style={{ minHeight: 44, padding: 0, width: '100%' }}
                                    >
                                        <Flex align="center" gap={6} style={{ minWidth: 0, width: '100%' }} vertical>
                                            <Card style={{ alignItems: 'center', backgroundColor: preset.color, borderRadius: '50%', display: 'flex', height: 40, justifyContent: 'center', width: 40 }}>
                                                {isSelected ? <LuCheck color="#fff" size={18} /> : null}
                                            </Card>
                                            <Text
                                                style={{
                                                    display: 'block',
                                                    fontSize: 10,
                                                    lineHeight: 1.2,
                                                    maxWidth: '100%',
                                                    textAlign: 'center',
                                                    whiteSpace: 'normal',
                                                    width: '100%',
                                                }}
                                            >
                                                {preset.name}
                                            </Text>
                                        </Flex>
                                    </Button>
                                );
                            })}
                        </div>
                    </Card>

                    <Card style={sectionCardStyle} title={t('customColor')}>
                        <Flex gap={8} vertical>
                            <Text type="secondary">{t('customColorHint')}</Text>
                            <Flex align="center" gap={8}>
                            <Input onChange={handleHexInputChange} placeholder="#FF5500" style={{ flex: 1 }} value={hexInput} />
                            <ColorPicker
                                onChange={(color) => {
                                    const nextHex = color.toHexString().toUpperCase();
                                    setHexInput(nextHex);
                                    onChange(nextHex);
                                }}
                                value={activeColor}
                            />
                            </Flex>
                        </Flex>
                    </Card>
                </Flex>
            </Flex>
        </Popup>
    );
}
