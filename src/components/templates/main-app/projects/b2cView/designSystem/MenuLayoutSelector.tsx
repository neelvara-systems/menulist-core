/**
 * Menu Layout Selector
 * 
 * Layout selection with mood compatibility guardrails.
 */

import { Card, Flex, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { getOwnerSelectableMenuLayoutEntries, getOwnerSelectableMenuLayouts } from '@lib/menu/menuDesignPresets';
import { useTranslations } from 'next-intl';
import { MenuLayout, MenuMood } from './index';

const { Text } = Typography;

interface MenuLayoutSelectorProps {
    value: MenuLayout;
    onChange: (layout: MenuLayout) => void;
    currentMood?: MenuMood;
}

const MenuLayoutSelector: React.FC<MenuLayoutSelectorProps> = ({
    value,
    onChange,
    currentMood,
}) => {
    const { token } = theme.useToken();
    const t = useTranslations('MobileDesignEditor');
    const compatibleLayouts: string[] = getOwnerSelectableMenuLayouts(currentMood);
    const layoutEntries = getOwnerSelectableMenuLayoutEntries(currentMood);

    return (
        <Flex vertical gap={12}>
            <Text type="secondary" style={{ fontSize: 13 }}>
                {t('menuLayoutHelper')}
            </Text>
            <Flex gap={10} vertical>
                {layoutEntries.map(([key, config]) => {
                    const layoutKey = key as MenuLayout;
                    const isSelected = value === layoutKey;
                    const isCompatible = compatibleLayouts.includes(layoutKey);

                    const card = (
                        <motion.div
                            key={key}
                            whileHover={isCompatible ? { scale: 1.02 } : undefined}
                            whileTap={isCompatible ? { scale: 0.98 } : undefined}
                        >
                            <Card
                                hoverable={isCompatible}
                                onClick={() => {
                                    if (isCompatible) onChange(layoutKey);
                                }}
                                aria-disabled={!isCompatible}
                                aria-pressed={isSelected}
                                role="button"
                                style={{
                                    cursor: isCompatible ? 'pointer' : 'not-allowed',
                                    height: '100%',
                                    borderColor: isSelected
                                        ? token.colorPrimary
                                        : token.colorBorderSecondary,
                                    borderWidth: isSelected ? 2 : 1,
                                    background: !isCompatible
                                        ? token.colorFillAlter
                                        : isSelected
                                        ? token.colorPrimaryBg
                                        : token.colorBgContainer,
                                    opacity: isCompatible ? 1 : 0.45,
                                    transition: 'all 0.2s ease',
                                }}
                                styles={{
                                    body: { padding: 14, height: '100%' }
                                }}
                            >
                                <Flex align="center" gap={12}>
                                    <LayoutPreview layout={layoutKey} selected={isSelected} />
                                    <Flex gap={2} style={{ minWidth: 0 }} vertical>
                                        <Text
                                            strong
                                            style={{
                                                fontSize: 14,
                                                color: isSelected ? token.colorPrimary : token.colorText,
                                            }}
                                        >
                                            {config.label}
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {config.description}
                                        </Text>
                                    </Flex>
                                </Flex>
                            </Card>
                        </motion.div>
                    );

                    return card;
                })}
            </Flex>
        </Flex>
    );
};

function LayoutPreview({ layout, selected }: { layout: MenuLayout; selected: boolean }) {
    const { token } = theme.useToken();
    const accent = selected ? token.colorPrimary : token.colorTextTertiary;
    const line = selected ? token.colorPrimaryBorder : token.colorBorderSecondary;
    const fill = selected ? token.colorPrimaryBg : token.colorFillQuaternary;
    const previewWidth = 96;
    const boxStyle = {
        backgroundColor: fill,
        border: `1px solid ${line}`,
        borderRadius: 6,
    };

    if (layout === MenuLayout.GRID) {
        return (
            <div style={{ display: 'grid', gap: 4, gridTemplateColumns: 'repeat(2, 1fr)', width: previewWidth }}>
                {[0, 1].map((item) => (
                    <Flex key={item} gap={5} style={{ ...boxStyle, minHeight: 30, padding: 5 }} vertical>
                        <div style={{ backgroundColor: accent, borderRadius: 4, height: 9, opacity: 0.55 }} />
                        <div style={{ backgroundColor: line, borderRadius: 4, height: 4, width: '72%' }} />
                    </Flex>
                ))}
            </div>
        );
    }

    if (layout === MenuLayout.CARD) {
        return (
            <Flex gap={4} style={{ width: previewWidth }} vertical>
                {[0, 1].map((item) => (
                    <Flex key={item} gap={5} style={{ ...boxStyle, minHeight: 30, padding: 5 }} vertical>
                        <div style={{ backgroundColor: accent, borderRadius: 4, height: 9, opacity: 0.55 }} />
                        <div style={{ backgroundColor: line, borderRadius: 4, height: 4, width: '72%' }} />
                    </Flex>
                ))}
            </Flex>
        );
    }

    return (
        <Flex gap={4} style={{ width: previewWidth }} vertical>
            {[0, 1].map((item) => (
                <Flex key={item} gap={4} style={{ ...boxStyle, padding: 4 }}>
                    <div style={{ backgroundColor: accent, borderRadius: 4, height: 10, width: 12 }} />
                    <Flex gap={3} style={{ flex: 1 }} vertical>
                        <div style={{ backgroundColor: line, borderRadius: 4, height: 4, width: '88%' }} />
                        <div style={{ backgroundColor: line, borderRadius: 4, height: 4, width: '58%' }} />
                    </Flex>
                </Flex>
            ))}
        </Flex>
    );
}

export default MenuLayoutSelector;
