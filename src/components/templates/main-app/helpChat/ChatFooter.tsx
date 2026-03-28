'use client'

import { UserUploadedFileType } from '@type/common';
import { theme, Typography } from 'antd';
import ChatInput from './ChatInput';
import { ChatMode } from './types';

const { Text } = Typography;

interface ChatFooterProps {
    hasMessages: boolean;
    mode: ChatMode;
    disabled: boolean;
    sessionId?: string | null;
    searchQuery?: string; // For controlled input clearing
    showQnAActions?: boolean;
    onSendMessage: (message: string, image?: UserUploadedFileType) => void;
    onSearchQueryChange: (query: string) => void;
    onStartFollowUp?: () => void;
    onNewQuestion?: () => void;
}

const ChatFooter = ({
    hasMessages,
    mode,
    disabled,
    sessionId,
    searchQuery,
    showQnAActions,
    onSendMessage,
    onSearchQueryChange,
    onStartFollowUp,
    onNewQuestion
}: ChatFooterProps) => {
    const { token } = theme.useToken();

    return (
        <>
            {/* AI Disclaimer - Show when has messages */}
            {hasMessages && (
                <div style={{ textAlign: 'center', padding: '12px 24px' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        AI can make mistakes. If you don&apos;t find the correct answer, you can still explore our documentation{' '}
                        <a href="/kb" target="_blank" rel="noopener noreferrer">here</a>.
                    </Text>
                </div>
            )}

            {/* Chat Input - Always Visible */}
            <ChatInput
                onSendMessage={onSendMessage}
                onInputChange={(value) => onSearchQueryChange(value)}
                onImageUpload={(file) => {
                    // Image upload callback - handled internally by ChatInput
                    if (process.env.NODE_ENV === 'development') {
                        console.log('Image uploaded:', file.name, file.size);
                    }
                }}
                mode={mode}
                disabled={disabled}
                sessionId={sessionId}
                value={searchQuery} // Pass for controlled clearing
                hasMessages={hasMessages} // For contextual placeholder
                showQnAActions={showQnAActions}
                onStartFollowUp={onStartFollowUp}
                onNewQuestion={onNewQuestion}
            />
        </>
    );
};

export default ChatFooter;
