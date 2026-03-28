'use client'

import { Flex, theme, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { LuSparkles } from 'react-icons/lu';

const { Text } = Typography;

// Fun progress messages that cycle through
const PROGRESS_MESSAGES = [
    { icon: '🔍', text: 'Searching knowledge base...' },
    { icon: '📚', text: 'Finding relevant articles...' },
    { icon: '🤖', text: 'Analyzing content...' },
    { icon: '🔍', text: 'Matching articles...' },
    { icon: '✍️', text: 'Generating answer...' },
    { icon: '✨', text: 'Crafting your answer...' },
];

const TypingIndicator = () => {
    const { token } = theme.useToken();
    const [messageIndex, setMessageIndex] = useState(0);

    const dotVariants = {
        initial: { y: 0 },
        animate: { y: -8 }
    };

    const transition = {
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse" as const,
        ease: "easeInOut"
    };

    // Cycle through progress messages every 2.5 seconds (slower, more readable)
    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % PROGRESS_MESSAGES.length);
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    const currentMessage = PROGRESS_MESSAGES[messageIndex];

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: 48,
                position: 'relative'
            }}
        >
            <Flex gap={8} align="flex-start" style={{ position: 'relative' }}>
                {/* Heartbeat/Bubble Pulse Animation */}
                <motion.div
                    animate={{
                        scale: [1, 1.15, 1],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${token.colorPrimaryBg}, ${token.colorPrimaryBgHover})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 4px 12px ${token.colorPrimary}30`
                    }}
                >
                    <LuSparkles size={16} color={token.colorPrimaryActive} />
                </motion.div>

                <div
                    style={{
                        background: token.colorBgElevated,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        borderRadius: 16,
                        padding: '16px 20px',
                        display: 'flex',
                        gap: 4
                    }}
                >
                    <motion.div
                        variants={dotVariants}
                        initial="initial"
                        animate="animate"
                        transition={{ ...transition, delay: 0 }}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: token.colorPrimary
                        }}
                    />
                    <motion.div
                        variants={dotVariants}
                        initial="initial"
                        animate="animate"
                        transition={{ ...transition, delay: 0.2 }}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: token.colorPrimary
                        }}
                    />
                    <motion.div
                        variants={dotVariants}
                        initial="initial"
                        animate="animate"
                        transition={{ ...transition, delay: 0.4 }}
                        style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: token.colorPrimary
                        }}
                    />
                </div>

                {/* Progress Message - Slides up on change */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={messageIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                        style={{
                            position: 'absolute',
                            bottom: -32,
                            left: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            minWidth: "max-content"
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 13,
                                color: token.colorTextSecondary,
                                fontWeight: 500
                            }}
                        >
                            {currentMessage.icon} {currentMessage.text}
                        </Text>
                    </motion.div>
                </AnimatePresence>
            </Flex>
        </motion.div>
    );
};

export default TypingIndicator;
