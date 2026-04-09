'use client'

import { BRAND_COLOR_PRESETS } from '@config/designSystem';
import { theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuCheck, LuX } from 'react-icons/lu';
import { Button, Card, Flex, Input, NavBar, Popup, Text, Toast } from '../antd';

interface ColorPickerSheetProps {
    defaultMoodColor: string;
    onChange: (color: string | undefined) => void;
    onClose: () => void;
    value?: string;
    visible: boolean;
}

export default function ColorPickerSheet({ defaultMoodColor, onChange, onClose, value, visible }: ColorPickerSheetProps) {
    const t = useTranslations('MobileDesignEditor');
    const { token } = theme.useToken();
    const [hexInput, setHexInput] = useState(value || '');
    const activeColor = value || defaultMoodColor;
    const sectionCardStyle = {
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: 18,
    } as const;

    const handleHexSubmit = () => {
        const hex = hexInput.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            onChange(hex);
        } else if (/^[0-9A-Fa-f]{6}$/.test(hex)) {
            onChange(`#${hex}`);
        } else {
            Toast.show({ content: t('brandColorInvalidHex'), duration: 2000 });
        }
    };

    return (
        <Popup bodyStyle={{ maxHeight: '70vh', padding: 12 }} onMaskClick={onClose} visible={visible}>
            <Flex gap={16} vertical>
                <NavBar backIcon={<LuX size={20} />} onBack={onClose}>{t('brandColor')}</NavBar>

                <Card style={sectionCardStyle}>
                    <Flex align="center" gap={12}>
                        <Card style={{ backgroundColor: activeColor, height: 40, minWidth: 40, width: 40 }} />
                        <Flex gap={2} vertical>
                            <Text strong>{value ? t('customBrandColor') : t('usingMoodDefault')}</Text>
                            <Text type="secondary">{activeColor.toUpperCase()}</Text>
                        </Flex>
                    </Flex>
                </Card>

                <Card style={sectionCardStyle} title={t('presetColors')}>
                    <Flex gap={8} wrap>
                        {BRAND_COLOR_PRESETS.map((preset) => {
                            const isSelected = value === preset.color;
                            return (
                                <Button key={preset.color} fill="none" onClick={() => { setHexInput(preset.color); onChange(preset.color); }} style={{ height: 'auto', padding: 4 }}>
                                    <Flex align="center" gap={6} vertical>
                                        <Card style={{ alignItems: 'center', backgroundColor: preset.color, borderRadius: '50%', display: 'flex', height: 40, justifyContent: 'center', width: 40 }}>
                                            {isSelected ? <LuCheck color="#fff" size={18} /> : null}
                                        </Card>
                                        <Text>{preset.name}</Text>
                                    </Flex>
                                </Button>
                            );
                        })}
                    </Flex>
                </Card>

                <Card style={sectionCardStyle} title={t('customColor')}>
                    <Flex gap={8}>
                        <Input onChange={setHexInput} placeholder="#FF5500" style={{ flex: 1 }} value={hexInput} />
                        <Button onClick={handleHexSubmit} size="small">{t('applyColor')}</Button>
                    </Flex>
                </Card>

                {value ? (
                    <Button block fill="outline" onClick={() => { onChange(undefined); setHexInput(''); onClose(); }}>
                        {t('useMoodDefault')}
                    </Button>
                ) : null}
            </Flex>
        </Popup>
    );
}
