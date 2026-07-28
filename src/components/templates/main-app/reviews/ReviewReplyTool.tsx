'use client';

/**
 * ReviewReplyTool — Standalone AI reply suggestion tool
 *
 * Dormant reply-assist component. Owner-pasted review suggestions stay disabled
 * until the reviews reputation parent flag and GBP-backed ingestion are enabled.
 *
 * @see __docs__/reputation-protection/reputation-protection_impl.md
 * @see src/app/api/reviews/suggest/route.ts
 */

import { FEATURE_FLAGS } from '@config/features';
import { syncBalanceFromResponse } from '@services/ai/balanceSync';
import { getBoundedAiServiceStringContext, logAiServiceFailure } from '@services/ai/aiServiceDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { getBoundedErrorNumberAtPath, getBoundedErrorStatus } from '@lib/monitoring/boundedLogContext';
import { Alert, Button, Card, Input, Rate, Space, Tag, Typography, theme, notification } from 'antd';
import { useState } from 'react';
import { LuCheck, LuCopy, LuMessageSquare, LuRefreshCw, LuSparkles } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;
const REVIEW_REPLY_CAPACITY_MESSAGE = 'Additional enhancements needed. Add more from Billing.';
const REVIEW_REPLY_RESPONSE_JSON_MAX_BYTES = 16 * 1024;
const REVIEW_REPLY_REQUEST_POLICY = {
    cache: 'no-store' as RequestCache,
    credentials: 'same-origin' as RequestCredentials,
    redirect: 'manual' as RequestRedirect,
};
const DESKTOP_REVIEW_REPLY_COPY_UNAVAILABLE = 'desktop_review_reply_copy_unavailable';
const DESKTOP_REVIEW_REPLY_COPY_FALLBACK_FAILED = 'desktop_review_reply_copy_fallback_failed';

type ReviewReplySource = 'ai' | 'fallback';
type ReviewReplySuggestionResponse = {
    success?: unknown;
    reply?: unknown;
    source?: unknown;
    remainingBalance?: unknown;
    transaction?: unknown;
};
type AcknowledgedReviewReplySuggestionResponse = ReviewReplySuggestionResponse & {
    success: true;
    reply: string;
    source: ReviewReplySource;
};

function createReviewReplyError(failureCode: string, status?: number): Error & { code: string; statusCode?: number } {
    return Object.assign(new Error(failureCode), {
        code: failureCode,
        statusCode: status,
    });
}

function getReviewReplyStatus(error: unknown): number | undefined {
    return getBoundedErrorStatus(error)
        ?? getBoundedErrorNumberAtPath(error, ['response', 'status']);
}

function isAcknowledgedReviewReplySuggestionResponse(
    value: ReviewReplySuggestionResponse | null,
): value is AcknowledgedReviewReplySuggestionResponse {
    return Boolean(
        value
        && value.success === true
        && typeof value.reply === 'string'
        && value.reply.trim().length > 0
        && (value.source === 'ai' || value.source === 'fallback'),
    );
}

const hasDesktopReviewReplyClipboardWrite = (): boolean => (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
);

const hasDesktopReviewReplyCopyFallback = (): boolean => (
    typeof document !== 'undefined'
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function'
    && Boolean(document.body)
);

const copyDesktopReviewReplyText = async (value: string): Promise<void> => {
    let clipboardWriteError: unknown;

    if (hasDesktopReviewReplyClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
        }
    }

    if (!hasDesktopReviewReplyCopyFallback()) {
        throw clipboardWriteError || new Error(DESKTOP_REVIEW_REPLY_COPY_UNAVAILABLE);
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw new Error(DESKTOP_REVIEW_REPLY_COPY_FALLBACK_FAILED);
        }
    } finally {
        document.body.removeChild(textarea);
    }
};

interface ReviewReplyToolProps {
    businessType?: string;
}

export default function ReviewReplyTool({ businessType }: ReviewReplyToolProps) {
    const { token } = theme.useToken();
    const [reviewText, setReviewText] = useState('');
    const [rating, setRating] = useState<number>(3);
    const [reply, setReply] = useState<string | null>(null);
    const [replySource, setReplySource] = useState<'ai' | 'fallback' | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [attempts, setAttempts] = useState(0);

    if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST) {
        return null;
    }

    const handleGenerate = async () => {
        if (!reviewText.trim()) {
            notification.error({ message: 'Please paste a review first.' });
            return;
        }

        if (attempts >= 3) {
            notification.warning({ message: 'Maximum attempts reached. Please try again later.' });
            return;
        }

        setLoading(true);
        setReply(null);
        setReplySource(null);

        try {
            const response = await fetch('/api/reviews/suggest', {
                ...REVIEW_REPLY_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reviewText: reviewText.trim(),
                    rating,
                    businessType,
                }),
            });
            let data: ReviewReplySuggestionResponse | null = null;
            try {
                data = await readJsonResponseWithLimit<ReviewReplySuggestionResponse>(
                    response,
                    REVIEW_REPLY_RESPONSE_JSON_MAX_BYTES,
                );
            } catch (error) {
                logAiServiceFailure(
                    'desktop_review_reply_response_parse_failed',
                    error,
                    {
                        rating,
                        responseOk: response.ok,
                        responseStatus: response.status,
                        maxBytes: REVIEW_REPLY_RESPONSE_JSON_MAX_BYTES,
                        ...getBoundedAiServiceStringContext('businessType', businessType),
                        ...getBoundedAiServiceStringContext('reviewText', reviewText),
                    },
                );
            }

            if (!response.ok) {
                throw createReviewReplyError('desktop_review_reply_generation_rejected', response.status);
            }

            if (!isAcknowledgedReviewReplySuggestionResponse(data)) {
                logAiServiceFailure(
                    'desktop_review_reply_response_invalid',
                    createReviewReplyError('desktop_review_reply_response_invalid', response.status),
                    {
                        rating,
                        responseStatus: response.status,
                        success: data?.success === true,
                        hasReply: typeof data?.reply === 'string' && data.reply.trim().length > 0,
                        hasExpectedSource: data?.source === 'ai' || data?.source === 'fallback',
                        ...getBoundedAiServiceStringContext('businessType', businessType),
                        ...getBoundedAiServiceStringContext('reviewText', reviewText),
                    },
                );
                throw createReviewReplyError('desktop_review_reply_response_invalid', response.status);
            }

            syncBalanceFromResponse(data);
            setReply(data.reply);
            setReplySource(data.source);
            setAttempts(prev => prev + 1);
        } catch (err: any) {
            const status = getReviewReplyStatus(err);
            logAiServiceFailure(
                'desktop_review_reply_generation_failed',
                createReviewReplyError('desktop_review_reply_generation_rejected', status),
                {
                    rating,
                    ...getBoundedAiServiceStringContext('businessType', businessType),
                    ...getBoundedAiServiceStringContext('reviewText', reviewText),
                },
            );
            if (status === 429) {
                notification.warning({ message: 'Too many requests. Please wait a moment.' });
            } else if (status === 402) {
                notification.warning({ message: REVIEW_REPLY_CAPACITY_MESSAGE });
            } else {
                notification.error({ message: 'Failed to generate reply.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        await handleGenerate();
    };

    const handleCopy = async () => {
        if (!reply) return;
        try {
            await copyDesktopReviewReplyText(reply);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            notification.success({ message: 'Reply copied to clipboard.' });
        } catch (err) {
            logAiServiceFailure('desktop_review_reply_copy_failed', err, {
                rating,
                replySource,
                attempts,
                ...getBoundedAiServiceStringContext('businessType', businessType),
                ...getBoundedAiServiceStringContext('reviewText', reviewText),
                ...getBoundedAiServiceStringContext('reply', reply),
                hasClipboardWrite: hasDesktopReviewReplyClipboardWrite(),
                hasCopyFallback: hasDesktopReviewReplyCopyFallback(),
            });
            notification.error({ message: 'Could not copy reply.' });
        }
    };

    const handleClear = () => {
        setReviewText('');
        setRating(3);
        setReply(null);
        setReplySource(null);
        setAttempts(0);
    };

    return (
        <Card size="small">
            <Title level={5} style={{ margin: '0 0 4px' }}>
                <LuMessageSquare style={{ marginRight: 6, verticalAlign: 'middle' }} />
                Review Reply Assistant
            </Title>
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                Paste a customer review to get a professional reply suggestion.
            </Paragraph>

            {/* Input Section */}
            <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                    Customer Review
                </Text>
                <Input.TextArea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    showCount
                    placeholder="Paste the customer review here..."
                    disabled={loading}
                />
            </div>

            <div style={{ marginBottom: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
                    Rating
                </Text>
                <Rate
                    value={rating}
                    onChange={(v) => setRating(v)}
                    disabled={loading}
                />
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                    {rating <= 2 ? 'Negative' : rating === 3 ? 'Neutral' : 'Positive'}
                </Text>
            </div>

            <Button
                type="primary"
                icon={<LuSparkles />}
                loading={loading}
                onClick={handleGenerate}
                disabled={!reviewText.trim() || attempts >= 3}
            >
                Generate Reply
            </Button>

            {/* Reply Output */}
            {reply && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 13 }}>Suggested Reply</Text>
                        <Tag color={replySource === 'ai' ? 'success' : 'default'} style={{ fontSize: 11 }}>
                            {replySource === 'ai' ? 'Generated' : 'Template'}
                        </Tag>
                    </div>

                    <Card
                        size="small"
                        style={{
                            background: token.colorSuccessBg,
                            border: `1px solid ${token.colorSuccessBorder}`,
                            marginBottom: 12,
                        }}
                    >
                        <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                            {reply}
                        </Text>
                    </Card>

                    <Space>
                        <Button
                            icon={copied ? <LuCheck /> : <LuCopy />}
                            onClick={handleCopy}
                        >
                            {copied ? 'Copied' : 'Copy Reply'}
                        </Button>
                        {attempts < 3 && (
                            <Button
                                icon={<LuRefreshCw />}
                                loading={loading}
                                onClick={handleRegenerate}
                            >
                                Regenerate ({3 - attempts} left)
                            </Button>
                        )}
                        <Button onClick={handleClear}>
                            Clear
                        </Button>
                    </Space>

                    <Alert
                        type="info"
                        showIcon
                        style={{ marginTop: 12 }}
                        message="Review the suggestion before posting"
                        description="Always read and adjust the reply to match your voice. Copy it and paste into Google Reviews."
                    />
                </div>
            )}
        </Card>
    );
}
