/**
 * Home Style Selector
 * 
 * A simple, confidence-inspiring selector for home page styles.
 * Users choose a vibe, not design parameters.
 */

import { Card, Flex, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { LuCheck, LuCrown, LuSparkles, LuZap } from 'react-icons/lu';
import { HOME_STYLES, HomeStyle } from './index';

const { Text } = Typography;

interface HomeStyleSelectorProps {
    value: HomeStyle;
    onChange: (style: HomeStyle) => void;
}

const STYLE_ICONS: Record<string, typeof LuSparkles> = {
    'simple': LuSparkles,
    'premium': LuCrown,
    'bold': LuZap,
};

const HomeStyleSelector: React.FC<HomeStyleSelectorProps> = ({ value, onChange }) => {
    const { token } = theme.useToken();

    return (
        <Flex vertical gap={12}>
            <Text type="secondary" style={{ fontSize: 13 }}>
                Choose how your menu feels to customers
            </Text>
            <Flex gap={12} wrap="wrap">
                {Object.entries(HOME_STYLES).map(([key, config]) => {
                    const styleKey = key as HomeStyle;
                    const isSelected = value === styleKey;
                    const Icon = STYLE_ICONS[styleKey];

                    return (
                        <motion.div
                            key={key}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{ flex: 1, minWidth: 100 }}
                        >
                            <Card
                                hoverable
                                onClick={() => onChange(styleKey)}
                                style={{
                                    cursor: 'pointer',
                                    borderColor: isSelected ? token.colorPrimary : token.colorBorderSecondary,
                                    borderWidth: isSelected ? 2 : 1,
                                    background: isSelected
                                        ? token.colorPrimaryBg
                                        : token.colorBgContainer,
                                    transition: 'all 0.2s ease',
                                }}
                                styles={{
                                    body: { padding: 16 }
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

export default HomeStyleSelector;
