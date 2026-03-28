'use client';

import { Flex, Typography, theme } from 'antd';
import { motion } from 'framer-motion';

const { Text } = Typography;

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2,
        },
    },
};

const digitVariants = {
    hidden: { x: 30, opacity: 0 },
    visible: {
        x: 0,
        opacity: 1,
        transition: {
            type: 'spring',
            damping: 12,
            stiffness: 100,
        },
    },
};

interface AnimatedVersionNumberProps {
    version: string;
}

const AnimatedVersionNumber: React.FC<AnimatedVersionNumberProps> = ({ version }) => {
    const { token } = theme.useToken();

    if (!version) {
        return null;
    }

    const digits = version.split('.');

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            style={{ position: 'absolute', bottom: -10, right: 0 }}
        >
            <Flex vertical align='center'>
                {digits.map((digit, index) => (
                    <motion.div key={index} variants={digitVariants}>
                        <Text
                            style={{
                                fontSize: 80,
                                fontWeight: 'bold',
                                color: token.colorTextDescription,
                                lineHeight: 1,
                                opacity: 0.2,
                            }}
                        >
                            {digit}
                        </Text>
                    </motion.div>
                ))}
            </Flex>
        </motion.div>
    );
};

export default AnimatedVersionNumber;
