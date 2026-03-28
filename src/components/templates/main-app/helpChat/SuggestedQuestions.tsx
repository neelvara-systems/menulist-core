'use client'

import { Button, Flex, theme, Typography } from 'antd';
import { motion } from 'framer-motion';
import { LuSparkles } from 'react-icons/lu';

const { Text } = Typography;

interface SuggestedQuestionsProps {
    questions: string[];
    onQuestionClick: (question: string) => void;
    disabled?: boolean;
}

const SuggestedQuestions = ({ questions, onQuestionClick, disabled }: SuggestedQuestionsProps) => {
    const { token } = theme.useToken();

    if (questions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{ marginTop: 16 }}
        >
            <Flex vertical gap={8}>
                {/* Header */}
                <Flex align="center" gap={6} style={{ marginBottom: 4 }}>
                    <LuSparkles size={14} color={token.colorPrimary} />
                    <Text 
                        type="secondary" 
                        style={{ 
                            fontSize: 12, 
                            fontWeight: 500,
                            color: token.colorTextSecondary
                        }}
                    >
                        Suggested follow-ups
                    </Text>
                </Flex>

                {/* Question Pills */}
                <Flex gap={8} wrap="wrap">
                    {questions.map((question, index) => (
                        <motion.div
                            key={`question-${question.substring(0, 30).replace(/\s/g, '-')}-${index}`}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.1 * index }}
                        >
                            <Button
                                type="text"
                                size="small"
                                onClick={() => onQuestionClick(question)}
                                disabled={disabled}
                                style={{
                                    height: 'auto',
                                    padding: '6px 12px',
                                    borderRadius: 12,
                                    background: token.colorBgElevated,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    fontSize: 12,
                                    fontWeight: 400,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'normal',
                                    textAlign: 'left',
                                    lineHeight: '1.4'
                                }}
                                onMouseEnter={(e) => {
                                    if (!disabled) {
                                        e.currentTarget.style.borderColor = token.colorPrimary;
                                        e.currentTarget.style.background = token.colorPrimaryBg;
                                        e.currentTarget.style.color = token.colorPrimary;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = token.colorBorderSecondary;
                                    e.currentTarget.style.background = token.colorBgElevated;
                                    e.currentTarget.style.color = token.colorText;
                                }}
                            >
                                {question}
                            </Button>
                        </motion.div>
                    ))}
                </Flex>
            </Flex>
        </motion.div>
    );
};

export default SuggestedQuestions;
