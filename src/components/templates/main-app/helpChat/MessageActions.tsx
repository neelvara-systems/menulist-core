'use client'

import DateTimeDisplay from '@atoms/DateTimeDisplay';
import { Button, Flex, Tooltip, theme } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { LuCopy, LuRefreshCw, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';

interface MessageActionsProps {
    isUser: boolean;
    createdOn?: Timestamp;
    feedbackState?: 'up' | 'down' | null;
    onCopy?: () => void;
    onRegenerate?: () => void;
    onFeedback?: (type: 'up' | 'down') => void;
}

/**
 * Message Actions Component
 * Shows timestamp and action buttons for both user and assistant messages
 */
const MessageActions = ({
    isUser,
    createdOn,
    feedbackState,
    onCopy,
    onRegenerate,
    onFeedback
}: MessageActionsProps) => {
    const { token } = theme.useToken();

    return (
        <Flex
            justify="space-between"
            align="center"
            style={{ marginTop: 8 }}
        >
            {/* Timestamp */}
            {createdOn && (
                <DateTimeDisplay
                    value={createdOn}
                    mode="fromnow"
                    style={{
                        fontSize: 11,
                        color: token.colorTextTertiary
                    }}
                />
            )}

            {/* Action Buttons */}
            <Flex gap={4} role="toolbar" aria-label="Message actions" style={{ marginLeft: "auto" }}>
                {isUser ? (
                    // User message actions
                    <Tooltip title="Copy question">
                        <Button
                            aria-label="Copy question"
                            type="text"
                            size="small"
                            icon={<LuCopy size={14} />}
                            onClick={onCopy}
                            style={{ borderRadius: 8 }}
                        />
                    </Tooltip>
                ) : (
                    // Assistant message actions
                    <>
                        <Tooltip title={feedbackState === 'up' ? 'Marked as helpful' : 'Helpful answer'}>
                            <Button
                                aria-label={feedbackState === 'up' ? 'Answer marked as helpful' : 'Mark answer as helpful'}
                                type={feedbackState === 'up' ? 'primary' : 'text'}
                                size="small"
                                icon={<LuThumbsUp size={14} />}
                                onClick={() => onFeedback?.('up')}
                                disabled={feedbackState === 'up'}
                                style={{ borderRadius: 8 }}
                            />
                        </Tooltip>
                        <Tooltip title={feedbackState === 'down' ? 'Marked as not helpful' : 'Not helpful'}>
                            <Button
                                aria-label={feedbackState === 'down' ? 'Answer marked as not helpful' : 'Mark answer as not helpful'}
                                type={feedbackState === 'down' ? 'primary' : 'text'}
                                size="small"
                                icon={<LuThumbsDown size={14} />}
                                onClick={() => onFeedback?.('down')}
                                danger={feedbackState === 'down'}
                                disabled={feedbackState === 'down'}
                                style={{ borderRadius: 8 }}
                            />
                        </Tooltip>
                        <Tooltip title="Copy answer">
                            <Button
                                aria-label="Copy answer"
                                type="text"
                                size="small"
                                icon={<LuCopy size={14} />}
                                onClick={onCopy}
                                style={{ borderRadius: 8 }}
                            />
                        </Tooltip>
                        <Tooltip title="Regenerate">
                            <Button
                                aria-label="Regenerate answer"
                                type="text"
                                size="small"
                                icon={<LuRefreshCw size={14} />}
                                onClick={onRegenerate}
                                style={{ borderRadius: 8 }}
                            />
                        </Tooltip>
                    </>
                )}
            </Flex>
        </Flex>
    );
};

export default MessageActions;
