'use client'

import { Button, Flex, theme, Typography } from 'antd';
import { motion } from 'framer-motion';
import { LuSparkles } from 'react-icons/lu';

const { Title, Text } = Typography;

interface WelcomeScreenProps {
    onSendMessage: (message: string) => boolean | void | Promise<boolean | void>;
    isMobile?: boolean;
}

const examplePrompts = [
    { icon: '🚀', text: 'How do I get started?' },
    { icon: '💎', text: 'What are the pricing plans?' },
    { icon: '🔗', text: 'How to integrate WhatsApp?' }
];

const WelcomeScreen = ({ onSendMessage, isMobile = false }: WelcomeScreenProps) => {
    const { token } = theme.useToken();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
                textAlign: 'center',
                maxWidth: 700,
                width: '100%'
            }}
        >
            {/* Gradient Icon with Glow */}
            <div
                style={{
                    width: 96,
                    height: 96,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${token.colorPrimary}15, ${token.colorPrimaryHover}25)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 32px',
                    position: 'relative'
                }}
            >
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, ${token.colorPrimary}20 0%, transparent 70%)`,
                        filter: 'blur(20px)'
                    }}
                />
                <LuSparkles size={48} color={token.colorPrimary} style={{ position: 'relative', zIndex: 1 }} />
            </div>

            {/* Clean Typography */}
            <Title level={2} style={{ marginBottom: 16, fontSize: 32, fontWeight: 600, lineHeight: 1.3 }}>
                👋 How can I help you today?
            </Title>

            <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 48, lineHeight: 1.7 }}>
                I&apos;m here to answer your questions and guide you through the platform
            </Text>

            {/* Example Prompts - Minimal Pills */}
            <Flex gap={12} justify="center" wrap="wrap" style={{ marginBottom: 24 }}>
                {examplePrompts.map((prompt, index) => (
                    <Button 
                        key={index} 
                        type="text" 
                        size="middle" 
                        onClick={() => onSendMessage(prompt.text)}
                        style={{
                            height: 'auto',
                            minHeight: 44,
                            width: isMobile ? '100%' : undefined,
                            justifyContent: 'center',
                            padding: isMobile ? '10px 14px' : '8px 16px',
                            borderRadius: 20,
                            background: token.colorBgElevated,
                            border: `1px solid ${token.colorBorderSecondary}`,
                            fontSize: isMobile ? 14 : 13,
                            fontWeight: isMobile ? 500 : 400,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = token.colorPrimary;
                            e.currentTarget.style.background = token.colorPrimaryBg;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = token.colorBorderSecondary;
                            e.currentTarget.style.background = token.colorBgElevated;
                        }}
                    >
                        <span style={{ fontSize: 16 }}>{prompt.icon}</span>
                        <span>{prompt.text}</span>
                    </Button>
                ))}
            </Flex>
        </motion.div>
    );
};

export default WelcomeScreen;
