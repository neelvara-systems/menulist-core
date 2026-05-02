'use client';

/**
 * ReviewReplyTool — Standalone AI reply suggestion tool
 *
 * Owner pastes a customer review + selects rating → gets professional reply.
 * Works WITHOUT GBP API access (standalone tool).
 *
 * @see __docs__/reputation-protection/reputation-protection_impl.md
 * @see src/app/api/reviews/suggest/route.ts
 */

import { FEATURE_FLAGS } from '@config/features';
import { Alert, Button, Card, Input, Rate, Space, Tag, Typography, notification } from 'antd';
import axios from 'axios';
import { useState } from 'react';
import { LuCheck, LuCopy, LuMessageSquare, LuRefreshCw, LuSparkles } from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

interface ReviewReplyToolProps {
    businessType?: string;
}

export default function ReviewReplyTool({ businessType }: ReviewReplyToolProps) {
    const [reviewText, setReviewText] = useState('');
    const [rating, setRating] = useState<number>(3);
    const [reply, setReply] = useState<string | null>(null);
    const [replySource, setReplySource] = useState<'ai' | 'fallback' | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [attempts, setAttempts] = useState(0);

    if (!FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST) {
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
            const res = await axios.post('/api/reviews/suggest', {
                reviewText: reviewText.trim(),
                rating,
                businessType,
            });

            if (res.data?.success && res.data?.reply) {
                setReply(res.data.reply);
                setReplySource(res.data.source || 'ai');
                setAttempts(prev => prev + 1);
            } else {
                notification.error({ message: 'Could not generate a reply. Please try again.' });
            }
        } catch (err: any) {
            if (err.response?.status === 429) {
                notification.warning({ message: 'Too many requests. Please wait a moment.' });
            } else {
                notification.error({ message: err.response?.data?.error || 'Failed to generate reply.' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        await handleGenerate();
    };

    const handleCopy = () => {
        if (!reply) return;
        navigator.clipboard.writeText(reply);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        notification.success({ message: 'Reply copied to clipboard.' });
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
                        <Tag color={replySource === 'ai' ? 'blue' : 'default'} style={{ fontSize: 11 }}>
                            {replySource === 'ai' ? 'Generated' : 'Template'}
                        </Tag>
                    </div>

                    <Card
                        size="small"
                        style={{
                            background: '#f6ffed',
                            border: '1px solid #b7eb8f',
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
