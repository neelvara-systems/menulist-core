'use client'

import { updateFeedbackStatus } from '@database/guestFeedback';
import { useTranslations } from 'next-intl';
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
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleResolve = async () => {
        onStatusUpdate(feedback.id, 'resolved');
        Toast.show({ content: t('markedResolved'), duration: 1000 });
        try {
            await updateFeedbackStatus(feedback.id, 'resolved');
        } catch {
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
                <Card>
                    <Flex gap={12} vertical>
                        <Flex align="center" justify="space-between">
                            <Title level={4} style={{ margin: 0 }}>{feedback.customerName || t('anonymous')}</Title>
                            {feedback.status === 'resolved' ? <Tag color="success">{t('resolve')}</Tag> : <Tag color="primary">{feedback.status === 'new' ? 'New' : 'Seen'}</Tag>}
                        </Flex>

                        <Flex align="center" gap={4}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <LuStar color={star <= feedback.rating ? '#fbbf24' : '#d1d5db'} fill={star <= feedback.rating ? '#fbbf24' : 'none'} key={star} size={18} />
                            ))}
                        </Flex>

                        <Text>{feedback.message}</Text>
                        <Text type="secondary">{feedback.createdAt}</Text>

                        {feedback.email || feedback.phone ? (
                            <Flex gap={8} vertical>
                                {feedback.email ? (
                                    <Button fill="outline" onClick={() => window.location.href = `mailto:${feedback.email}`}>
                                        <Flex align="center" gap={6}>
                                            <LuMail size={14} />
                                            <Text>{feedback.email}</Text>
                                        </Flex>
                                    </Button>
                                ) : null}
                                {feedback.phone ? (
                                    <Button fill="outline" onClick={() => window.location.href = `tel:${feedback.phone}`}>
                                        <Flex align="center" gap={6}>
                                            <LuPhone size={14} />
                                            <Text>{feedback.phone}</Text>
                                        </Flex>
                                    </Button>
                                ) : null}
                            </Flex>
                        ) : null}
                    </Flex>
                </Card>

                {feedback.status !== 'resolved' ? (
                    <Card>
                        <Flex gap={12} vertical>
                            <Title level={5} style={{ margin: 0 }}>{t('reply')}</Title>
                            <TextArea maxLength={500} onChange={setReplyText} placeholder={t('writeReply')} rows={3} showCount value={replyText} />
                            <Flex gap={8}>
                                <Button block disabled={!replyText.trim()} loading={isSending} onClick={() => void handleSendReply()}>
                                    {t('sendReply')}
                                </Button>
                                <Button block fill="outline" onClick={() => void handleResolve()} style={{ borderColor: '#16a34a', color: '#16a34a' }}>
                                    <Flex align="center" gap={6}>
                                        <LuCheck size={16} />
                                        <Text style={{ color: '#16a34a' }}>{t('resolve')}</Text>
                                    </Flex>
                                </Button>
                            </Flex>
                        </Flex>
                    </Card>
                ) : null}
            </Flex>
        </Flex>
    );
}
