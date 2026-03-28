/**
 * Menu Mood Selector
 * 
 * Users choose a vibe for their menu, not design parameters.
 */

import { Card, Flex, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { LuCheck, LuFlame, LuSparkles, LuZap } from 'react-icons/lu';
import { MENU_MOODS, MenuMood } from './index';

const { Text } = Typography;

interface MenuMoodSelectorProps {
    value: MenuMood;
    onChange: (mood: MenuMood) => void;
}

const MOOD_ICONS: Record<string, typeof LuSparkles> = {
    'clean': LuSparkles,
    'elegant': LuZap,
    'vibrant': LuFlame,
};

const MenuMoodSelector: React.FC<MenuMoodSelectorProps> = ({ value, onChange }) => {
    const { token } = theme.useToken();

    return (
        <Flex vertical gap={12}>
            <Text type="secondary" style={{ fontSize: 13 }}>
                Choose how your menu feels
            </Text>
            <Flex gap={12} wrap="wrap">
                {Object.entries(MENU_MOODS).map(([key, config]) => {
                    const moodKey = key as MenuMood;
                    const isSelected = value === moodKey;
                    const Icon = MOOD_ICONS[moodKey];

                    return (
                        <motion.div
                            key={key}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{ flex: 1, minWidth: 100 }}
                        >
                            <Card
                                hoverable
                                onClick={() => onChange(moodKey)}
                                style={{
                                    cursor: 'pointer',
                                    height: '100%',
                                    borderColor: isSelected ? token.colorPrimary : token.colorBorderSecondary,
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
                                            color: isSelected ? token.colorPrimary : token.colorText
                                        }}
                                    >
                                        {config.label}
                                    </Text>
                                    <Text
                                        type="secondary"
                                        style={{
                                            fontSize: 12,
                                            textAlign: 'center'
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

export default MenuMoodSelector;
