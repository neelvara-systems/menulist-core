'use client';
import { updateAiSearchHistoryWithFeedback } from '@database/aiSearchHistory';
import { Button, message, Space, Tooltip } from 'antd';
import { useState } from 'react';
import { LuCopy, LuRefreshCw, LuThumbsDown, LuThumbsUp } from 'react-icons/lu';
import FeedbackModal from './FeedbackModal';

interface ActionButtonsProps {
    answer: string;
    onRegenerate: () => void;
    isTyping: boolean;
    searchHistoryId: string | null;
}

export default function ActionButtons({ answer, onRegenerate, isTyping, searchHistoryId }: ActionButtonsProps) {
    const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
    const [feedbackData, setFeedbackData] = useState({
        isGood: false,
        reasons: [],
        comments: ''
    });

    const handleFeedback = (feedback: 'up' | 'down') => {
        if (feedback === 'up') {
            if (!searchHistoryId) {
                message.error('Cannot submit feedback: search history ID not found.');
                return;
            }
            message.info('Thank you for your feedback!');
            updateAiSearchHistoryWithFeedback({ id: searchHistoryId, isGood: true });
            setFeedbackData({ isGood: true, reasons: [], comments: '' });
        } else {
            setFeedbackModalVisible(true);
        }
    };

    const handleFeedbackSubmit = async (values: { reasons: any[], comments: string }) => {
        if (!searchHistoryId) {
            message.error('Cannot submit feedback: search history ID not found.');
            return;
        }
        const feedbackPayload = { isGood: false, ...values };
        await updateAiSearchHistoryWithFeedback({ id: searchHistoryId, ...feedbackPayload });
        setFeedbackData({ ...feedbackPayload });
        setFeedbackModalVisible(false);
        message.success('Thank you for your feedback!');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(answer)
            .then(() => {
                message.success('Answer copied to clipboard');
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                message.error('Failed to copy answer');
            });
    };

    if (isTyping) {
        return null;
    }

    return (
        <>
            <div style={{ marginTop: '16px', textAlign: 'right' }}>
                <Space>
                    <Tooltip title="Copy answer">
                        <Button icon={<LuCopy />} onClick={handleCopy} />
                    </Tooltip>
                    <Tooltip title="Regenerate response">
                        <Button icon={<LuRefreshCw />} onClick={() => onRegenerate()} />
                    </Tooltip>
                    <Tooltip title="Good response">
                        <Button
                            disabled={feedbackData.isGood}
                            type={feedbackData.isGood ? 'primary' : 'default'}
                            icon={<LuThumbsUp />} onClick={() => handleFeedback('up')} />
                    </Tooltip>
                    <Tooltip title="Bad response">
                        <Button
                            type={feedbackData.reasons.length ? 'primary' : 'default'}
                            icon={<LuThumbsDown />} onClick={() => handleFeedback('down')} />
                    </Tooltip>
                </Space>
            </div>
            <FeedbackModal
                feedbackData={feedbackData}
                visible={feedbackModalVisible}
                onClose={() => setFeedbackModalVisible(false)}
                onSubmit={handleFeedbackSubmit}
            />
        </>
    );
}
