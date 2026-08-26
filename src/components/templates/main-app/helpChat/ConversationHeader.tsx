'use client'

import { Button, Flex, Input, theme, Typography } from 'antd';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { LuMessageSquare, LuSearch, LuSparkles, LuX } from 'react-icons/lu';
import { ChatMode } from './types';

const { Title } = Typography;

interface ConversationHeaderProps {
    sessionTitle?: string;
    firstMessageContent?: string;
    mode: ChatMode;
    onSearch?: (query: string) => void;
    isMobile?: boolean;
}

const ConversationHeader = ({ sessionTitle, firstMessageContent, mode, onSearch, isMobile = false }: ConversationHeaderProps) => {
    const { token } = theme.useToken();
    const [conversationSearchQuery, setConversationSearchQuery] = useState('');
    const [showConversationSearch, setShowConversationSearch] = useState(false);

    const handleSearchChange = (value: string) => {
        setConversationSearchQuery(value);
        onSearch?.(value);
    };

    const closeSearch = () => {
        setShowConversationSearch(false);
        setConversationSearchQuery('');
        onSearch?.('');
    };

    return (
        <div
            style={{
                padding: isMobile ? '10px 12px' : '16px 20px',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                background: token.colorBgContainer
            }}
        >
            <Flex justify="space-between" align="center" gap={12}>
                <Title level={5} ellipsis style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 600, flex: 1, minWidth: 0 }}>
                    {sessionTitle || (firstMessageContent ? firstMessageContent.substring(0, 50) + (firstMessageContent.length > 50 ? '...' : '') : '')}
                </Title>
                
                {/* Conversation Search with Animation */}
                <AnimatePresence mode="wait">
                    {showConversationSearch ? (
                        <motion.div
                            key="search-input"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: isMobile ? 180 : 300, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            style={{ overflow: 'hidden' }}
                        >
                            <Flex gap={8} style={{ width: '100%' }}>
                                <Input
                                    placeholder="Search in this chat..."
                                    prefix={<LuSearch size={14} />}
                                    value={conversationSearchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    onBlur={() => {
                                        // Auto-collapse search if empty when focus is lost
                                        if (!conversationSearchQuery.trim()) {
                                            closeSearch();
                                        }
                                    }}
                                    allowClear
                                    autoFocus
                                    size="small"
                                    style={{ borderRadius: 6 }}
                                />
                                <Button
                                    aria-label="Close conversation search"
                                    type="text"
                                    size="small"
                                    icon={<LuX size={14} />}
                                    onClick={closeSearch}
                                />
                            </Flex>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="search-button"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <Button
                                aria-label="Search this conversation"
                                type="text"
                                size="small"
                                icon={<LuSearch size={16} />}
                                onClick={() => setShowConversationSearch(true)}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Mode Badge */}
                {!isMobile && (
                    <Flex
                        align="center"
                        gap={6}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            background: mode === 'qna' ? token.colorPrimaryBg : token.colorInfoBg,
                            border: `1px solid ${mode === 'qna' ? token.colorPrimaryBorder : token.colorInfoBorder}`,
                            fontSize: 12,
                            fontWeight: 500,
                            color: mode === 'qna' ? token.colorPrimary : token.colorInfo
                        }}
                    >
                        {mode === 'qna'
                            ? <LuMessageSquare size={14} />
                            : <LuSparkles size={14} />
                        }
                        <span>{mode === 'qna' ? 'QnA Mode' : 'Assistant Mode'}</span>
                    </Flex>
                )}
            </Flex>
        </div>
    );
};

export default ConversationHeader;
