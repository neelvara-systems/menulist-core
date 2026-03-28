'use client'

import { Flex, Segmented, Tooltip, Typography, theme } from 'antd';
import { LuInfo, LuMessageSquare, LuSparkles } from 'react-icons/lu';
import { ChatMode } from './types';

const { Text } = Typography;

interface ModeToggleProps {
    value: ChatMode;
    onChange: (mode: ChatMode) => void;
    disabled?: boolean;
}

const ModeToggle = ({ value, onChange, disabled }: ModeToggleProps) => {
    const { token } = theme.useToken();

    const tooltipTitle = disabled
        ? 'Mode is locked during active conversations. Start a new chat to change mode.'
        : value === 'qna'
            ? 'QnA Mode: Get quick, one-time answers to your questions'
            : 'Assistant Mode: Have a conversation with context-aware responses';

    const modeInfoContent = (
        <div style={{ maxWidth: 280 }}>
            <div style={{
                display: 'block',
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 600,
                color: '#fff'
            }}>
                Understanding Chat Modes
            </div>
            <div style={{ marginBottom: 8 }}>
                <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: token.colorPrimary,
                    marginBottom: 4
                }}>
                    💬 QnA Mode
                </div>
                <div style={{
                    fontSize: 12,
                    color: 'rgba(255, 255, 255, 0.65)',
                    lineHeight: '16px'
                }}>
                    Quick, one-time answers from our knowledge base. Perfect for specific questions.
                </div>
            </div>
            <div>
                <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: token.colorPrimary,
                    marginBottom: 4
                }}>
                    ✨ Assistant Mode
                </div>
                <div style={{
                    fontSize: 12,
                    color: 'rgba(255, 255, 255, 0.65)',
                    lineHeight: '16px'
                }}>
                    Step-by-step guidance with context-aware responses. Great for complex tasks.
                </div>
            </div>
        </div>
    );

    return (
        <div style={{ width: '100%' }}>
            {/* Mode Info Header */}
            <Flex justify="space-between" align="center" style={{ marginBottom: 8, padding: '0 17px', justifyContent: 'flex-start', gap: '10px', }}>
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 500 }}>
                    CHAT MODE
                </Text>
                <Tooltip title={modeInfoContent} placement="topRight">
                    <LuInfo
                        size={14}
                        style={{
                            color: token.colorTextTertiary,
                            cursor: 'help',
                            transition: 'color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = token.colorPrimary}
                        onMouseLeave={(e) => e.currentTarget.style.color = token.colorTextTertiary}
                    />
                </Tooltip>
            </Flex>

            {/* Mode Toggle */}
            <Tooltip title={tooltipTitle} placement="top">
                <div role="group" aria-label="Chat mode selection">
                    <Segmented
                        value={value}
                        onChange={(val) => onChange(val as ChatMode)}
                        disabled={disabled}
                        block
                        aria-label="Select chat mode: QnA or Assistant"
                        options={[
                            {
                                label: (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <LuMessageSquare size={14} />
                                        <span>QnA</span>
                                    </div>
                                ),
                                value: 'qna'
                            },
                            {
                                label: (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                        <LuSparkles size={14} />
                                        <span>Assistant</span>
                                    </div>
                                ),
                                value: 'assistant'
                            }
                        ]}
                        size="large"
                        shape='round'
                    />
                </div>
            </Tooltip>
        </div>
    );
};

export default ModeToggle;
