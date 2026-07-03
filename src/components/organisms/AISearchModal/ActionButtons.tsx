'use client';
import { updateAiSearchHistoryWithFeedback } from '@database/aiSearchHistory';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
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

const AI_SEARCH_ANSWER_COPY_CLIPBOARD_UNAVAILABLE = 'ai_search_answer_copy_clipboard_unavailable';
const AI_SEARCH_ANSWER_COPY_FALLBACK_FAILED = 'ai_search_answer_copy_fallback_failed';

const copyAiSearchAnswerToClipboard = async (answer: string): Promise<void> => {
    await copyAnswerlatticeSupportTextToClipboard(answer, {
        unavailable: AI_SEARCH_ANSWER_COPY_CLIPBOARD_UNAVAILABLE,
        fallbackFailed: AI_SEARCH_ANSWER_COPY_FALLBACK_FAILED,
    });
};

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

    const handleCopy = async () => {
        try {
            await copyAiSearchAnswerToClipboard(answer);
            message.success('Answer copied to clipboard');
        } catch (err) {
            logRuntimeFailure('ai_search_answer_copy_failed', err, {
                answerLength: answer?.length || 0,
                hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                hasSearchHistoryId: Boolean(searchHistoryId),
            });
            message.error('Failed to copy answer');
        }
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
