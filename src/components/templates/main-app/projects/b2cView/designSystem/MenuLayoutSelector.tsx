/**
 * Menu Layout Selector
 * 
 * Layout selection with mood compatibility guardrails.
 */

import { Card, Flex, Tooltip, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { LuCheck, LuLayoutGrid, LuLayoutList, LuLayoutPanelTop, LuSquare } from 'react-icons/lu';
import { getCompatibleLayouts, MENU_LAYOUTS, MenuLayout, MenuMood } from './index';

const { Text } = Typography;

interface MenuLayoutSelectorProps {
    value: MenuLayout;
    onChange: (layout: MenuLayout) => void;
    currentMood?: MenuMood;
}

const LAYOUT_ICONS: Record<string, typeof LuLayoutList> = {
    'list': LuLayoutList,
    'card': LuSquare,
    'grid': LuLayoutGrid,
    'tabs': LuLayoutPanelTop,
};

const MenuLayoutSelector: React.FC<MenuLayoutSelectorProps> = ({
    value,
    onChange,
    currentMood,
}) => {
    const { token } = theme.useToken();
    const t = useTranslations('MobileDesignEditor');
    const compatibleLayouts: string[] = currentMood ? getCompatibleLayouts(currentMood) : Object.keys(MENU_LAYOUTS);

    return (
        <Flex vertical gap={12}>
            <Text type="secondary" style={{ fontSize: 13 }}>
                {t('menuLayoutHelper')}
            </Text>
            <Flex gap={12} wrap="wrap">
                {Object.entries(MENU_LAYOUTS).map(([key, config]) => {
                    const layoutKey = key as MenuLayout;
                    const isSelected = value === layoutKey;
                    const isCompatible = compatibleLayouts.includes(layoutKey);
                    const Icon = LAYOUT_ICONS[layoutKey];

                    const card = (
                        <motion.div
                            key={key}
                            whileHover={isCompatible ? { scale: 1.02 } : undefined}
                            whileTap={isCompatible ? { scale: 0.98 } : undefined}
                            style={{ flex: 1, minWidth: 100 }}
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
                                    body: { padding: 16, height: '100%' }
                                }}
                            >
                                <Flex vertical align="center" gap={8}>
                                    <Flex
                                        align="center"
                                        justify="center"
                                        style={{
                                            width: 40,
                                            height: 40,
                                            borderRadius: '50%',
                                            background: isSelected
                                                ? token.colorPrimary
                                                : token.colorFillSecondary,
                                            color: isSelected
                                                ? '#fff'
                                                : token.colorTextSecondary,
                                            transition: 'all 0.2s ease',
                                        }}
                                    >
                                        {isSelected ? <LuCheck size={20} /> : Icon ? <Icon size={20} /> : null}
                                    </Flex>
                                    <Text
                                        strong
                                        style={{
                                            fontSize: 14,
                                            color: isSelected
                                                ? token.colorPrimary
                                                : token.colorText
                                        }}
                                    >
                                        {config.label}
                                    </Text>
                                    <Text
                                        type="secondary"
                                        style={{
                                            fontSize: 12,
                                            textAlign: 'center',
                                        }}
                                    >
                                        {config.description}
                                    </Text>
                                </Flex>
                            </Card>
                        </motion.div>
                    );

                    return isCompatible ? card : (
                        <Tooltip key={key} title={t('layoutIncompatibleHint')}>
                            {card}
                        </Tooltip>
                    );
                })}
            </Flex>
        </Flex>
    );
};

export default MenuLayoutSelector;
