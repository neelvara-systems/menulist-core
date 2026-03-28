'use client'

import { Button, Flex, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { LuAlertCircle, LuRefreshCw } from 'react-icons/lu';

const { Text, Paragraph } = Typography;

interface ErrorMessageProps {
    message?: string;
    onRetry?: () => void;
}

const ErrorMessage = ({ message, onRetry }: ErrorMessageProps) => {
    const { token } = theme.useToken();

    const defaultMessage = "I apologize, but I encountered an error while processing your request. Please try again.";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: 16
            }}
        >
            <Flex gap={8} align="flex-start">
                {/* AI Avatar */}
                <div
                    style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: `linear-gradient(135deg, ${token.colorError}, ${token.colorErrorBg})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: `0 4px 12px ${token.colorError}30`
                    }}
                >
                    <LuAlertCircle size={18} color="#fff" />
                </div>

                {/* Error Card */}
                <div style={{ maxWidth: '80%' }}>
                    <div
                        style={{
                            background: token.colorErrorBg,
                            border: `1px solid ${token.colorErrorBorder}`,
                            borderRadius: 16,
                            padding: 18
                        }}
                    >
                        <Flex vertical gap={12}>
                            <div>
                                <Text strong style={{ color: token.colorError, fontSize: 13, display: 'block', marginBottom: 4 }}>
                                    Something went wrong
                                </Text>
                                <Paragraph style={{ margin: 0, whiteSpace: 'pre-wrap', color: token.colorTextSecondary, fontSize: 13 }}>
                                    {message || defaultMessage}
                                </Paragraph>
                            </div>

                            {onRetry && (
                                <Button
                                    type="primary"
                                    danger
                                    icon={<LuRefreshCw size={14} />}
                                    onClick={onRetry}
                                    size="small"
                                    style={{
                                        width: 'fit-content',
                                        borderRadius: 8
                                    }}
                                >
                                    Try Again
                                </Button>
                            )}
                        </Flex>
                    </div>
                </div>
            </Flex>
        </motion.div>
    );
};

export default ErrorMessage;
