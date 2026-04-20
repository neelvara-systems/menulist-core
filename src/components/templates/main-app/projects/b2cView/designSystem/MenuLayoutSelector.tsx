/**
 * Menu Layout Selector
 * 
 * Layout selection - users can choose any layout.
 */

import { Card, Flex, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { LuCheck, LuLayoutGrid, LuList, LuSquare } from 'react-icons/lu';
import { MENU_LAYOUTS, MenuLayout } from './index';

const { Text } = Typography;

interface MenuLayoutSelectorProps {
    value: MenuLayout;
    onChange: (layout: MenuLayout) => void;
}

const LAYOUT_ICONS: Record<string, typeof LuList> = {
    'list': LuList,
    'card': LuSquare,
    'grid': LuLayoutGrid,
};

const MenuLayoutSelector: React.FC<MenuLayoutSelectorProps> = ({
    value,
    onChange,
}) => {
    const { token } = theme.useToken();
    const t = useTranslations('MobileDesignEditor');

    return (
        <Flex vertical gap={12}>
            <Text type="secondary" style={{ fontSize: 13 }}>
                {t('menuLayoutHelper')}
            </Text>
            <Flex gap={12} wrap="wrap">
                {Object.entries(MENU_LAYOUTS).map(([key, config]) => {
                    const layoutKey = key as MenuLayout;
                    const isSelected = value === layoutKey;
                    const Icon = LAYOUT_ICONS[layoutKey];

                    return (
                        <motion.div
                            key={key}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{ flex: 1, minWidth: 100 }}
                        >
                            <Card
                                hoverable
                                onClick={() => onChange(layoutKey)}
                                style={{
                                    cursor: 'pointer',
                                    height: '100%',
                                    borderColor: isSelected
                                        ? token.colorPrimary
                                        : token.colorBorderSecondary,
                                    borderWidth: isSelected ? 2 : 1,
                                    background: isSelected
                                        ? token.colorPrimaryBg
                                        : token.colorBgContainer,
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
                })}
            </Flex>
        </Flex>
    );
};

export default MenuLayoutSelector;
