'use client'

import { updateFeedbackStatus } from '@database/guestFeedback';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuCheck, LuMail, LuPhone, LuStar } from 'react-icons/lu';
import { Button, Card, Flex, NavBar, Tag, Text, TextArea, Title, Toast } from '../antd';
import type { MobileFeedbackItemType } from '../types';

interface MobileFeedbackDetailProps {
    feedback: MobileFeedbackItemType;
    onBack: () => void;
    onStatusUpdate: (feedbackId: string, status: 'new' | 'resolved') => void;
}

export default function MobileFeedbackDetail({ feedback, onBack, onStatusUpdate }: MobileFeedbackDetailProps) {
    const t = useTranslations('MobileFeedbackDetail');
    const { token } = theme.useToken();
    const format = useFormatter();
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const statusTag = feedback.status === 'resolved'
        ? <Tag color="success">{t('resolve')}</Tag>
        : <Tag color={feedback.needsAttention ? 'warning' : 'primary'}>{feedback.needsAttention ? t('needsAttention') : t('statusNew')}</Tag>;

    const handleResolve = async () => {
        onStatusUpdate(feedback.id, 'resolved');
        Toast.show({ content: t('markedResolved'), duration: 1000 });
        try {
            await updateFeedbackStatus(feedback.id, 'resolved');
        } catch {
            onStatusUpdate(feedback.id, 'new');
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setIsSending(true);
        try {
            await updateFeedbackStatus(feedback.id, 'resolved', replyText.trim());
            onStatusUpdate(feedback.id, 'resolved');
            Toast.show({ content: t('replySavedResolved'), duration: 1500 });
            setReplyText('');
        } catch {
            Toast.show({ content: t('failedToSend'), duration: 2000 });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <Flex style={{ minHeight: '100%' }} vertical>
            <NavBar onBack={onBack}>{t('title')}</NavBar>
            <Flex gap={12} style={{ padding: 16 }} vertical>
                <Card style={{ borderRadius: 20 }}>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Flex gap={4} vertical>
                                <Title level={4} style={{ margin: 0 }}>{feedback.customerName || t('anonymous')}</Title>
                                <Text type="secondary">{feedback.createdAt ? format.dateTime(new Date(feedback.createdAt), 'date') : ''}</Text>
                            </Flex>
                            {statusTag}
                        </Flex>

                        <Flex
                            align="center"
                            gap={10}
                            style={{
                                background: token.colorWarningBg,
                                border: `1px solid ${token.colorWarningBorder}`,
                                borderRadius: 16,
                                padding: '10px 12px',
                            }}
                        >
                            <Flex align="center" gap={4}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <LuStar color={star <= feedback.rating ? '#fbbf24' : '#d1d5db'} fill={star <= feedback.rating ? '#fbbf24' : 'none'} key={star} size={18} />
                                ))}
                            </Flex>
                            <Text strong>{feedback.rating}/5</Text>
                        </Flex>

                        <Flex gap={8} vertical>
                                <Text strong>{t('feedbackLabel')}</Text>
                            <div
                                style={{
                                    background: token.colorBgContainer,
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    borderRadius: 16,
                                    color: token.colorTextSecondary,
                                    lineHeight: 1.6,
                                    padding: 14,
                                    whiteSpace: 'pre-wrap',
                                }}
                            >
                                {feedback.message || 'No comment provided.'}
                            </div>
                        </Flex>
                    </Flex>
                </Card>

                {feedback.email || feedback.phone ? (
                    <Card style={{ borderRadius: 20 }}>
                        <Flex gap={10} vertical>
                            <Text strong>{t('contactLabel')}</Text>
                            {feedback.email ? (
                                <Button fill="outline" onClick={() => window.location.href = `mailto:${feedback.email}`} style={{ justifyContent: 'flex-start' }}>
                                    <Flex align="center" gap={8}>
                                        <LuMail size={14} />
                                        <Text>{feedback.email}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                            {feedback.phone ? (
                                <Button fill="outline" onClick={() => window.location.href = `tel:${feedback.phone}`} style={{ justifyContent: 'flex-start' }}>
                                    <Flex align="center" gap={8}>
                                        <LuPhone size={14} />
                                        <Text>{feedback.phone}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
                        </Flex>
                    </Card>
                ) : null}

                {feedback.status !== 'resolved' ? (
                    <Card style={{ borderRadius: 20 }}>
                        <Flex gap={12} vertical>
                            <Flex gap={4} vertical>
                                <Title level={5} style={{ margin: 0 }}>{t('reply')}</Title>
                                <Text type="secondary">{t('replyHint')}</Text>
                            </Flex>
                            <TextArea
                                maxLength={500}
                                onChange={setReplyText}
                                placeholder={t('writeReply')}
                                rows={4}
                                showCount
                                style={{ borderRadius: 16 }}
                                value={replyText}
                            />
                            <Flex gap={8}>
                                <Button block disabled={!replyText.trim()} loading={isSending} onClick={() => void handleSendReply()}>
                                    {t('sendReply')}
                                </Button>
                                <Button block fill="outline" onClick={() => void handleResolve()} style={{ borderColor: '#16a34a', color: '#16a34a' }}>
                                    <Flex align="center" gap={6} justify="center">
                                        <LuCheck size={16} />
                                        <Text style={{ color: '#16a34a' }}>{t('resolve')}</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                ) : (
                    <Card style={{ borderRadius: 20 }}>
                        <Text type="secondary">{t('alreadyResolved')}</Text>
                    </Card>
                )}
            </Flex>
        </Flex>
    );
}
