'use client'

import { updateFeedbackStatus } from '@database/guestFeedback';
import { Button, Card, NavBar, Tag, TextArea, Toast } from 'antd-mobile';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { LuCheck, LuMail, LuPhone, LuStar } from 'react-icons/lu';
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

    const renderStars = (rating: number) => (
        <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <LuStar
                    key={star}
                    size={20}
                    className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                />
            ))}
        </div>
    );

    const handleResolve = async () => {
        // Optimistic UI update
        onStatusUpdate(feedback.id, 'resolved');
        Toast.show({ content: t('markedResolved'), duration: 1000 });
        // Background sync to Firestore via DAL
        try {
            await updateFeedbackStatus(feedback.id, 'resolved');
        } catch {
            // Revert handled by parent if needed — toast is enough for mobile
            Toast.show({ content: t('failedToUpdate'), duration: 2000 });
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        setIsSending(true);
        try {
            // Save reply as ownerNote via updateFeedbackStatus DAL
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
        <div className="flex flex-col h-full">
            {/* NavBar with back button (Law 2: max 2 levels) */}
            <NavBar onBack={onBack} className="border-b border-gray-200 dark:border-gray-700">
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                {/* Customer Info */}
                <Card className="rounded-xl">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {feedback.customerName || t('anonymous')}
                            </h2>
                            {feedback.status === 'resolved' ? (
                                <Tag color="success" fill="outline">{t('resolve')}</Tag>
                            ) : (
                                <Tag color="primary" fill="outline">{feedback.status === 'new' ? 'New' : 'Read'}</Tag>
                            )}
                        </div>

                        {renderStars(feedback.rating)}

                        <p className="text-[15px] text-gray-700 dark:text-gray-300 leading-relaxed">
                            {feedback.message}
                        </p>

                        <span className="text-xs text-gray-400">{feedback.createdAt}</span>

                        {/* Contact Info */}
                        {(feedback.email || feedback.phone) && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                {feedback.email && (
                                    <a
                                        href={`mailto:${feedback.email}`}
                                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400"
                                    >
                                        <LuMail size={14} />
                                        {feedback.email}
                                    </a>
                                )}
                                {feedback.phone && (
                                    <a
                                        href={`tel:${feedback.phone}`}
                                        className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400"
                                    >
                                        <LuPhone size={14} />
                                        {feedback.phone}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </Card>

                {/* Reply Section */}
                {feedback.status !== 'resolved' && (
                    <Card className="rounded-xl">
                        <div className="space-y-3">
                            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">
                                {t('reply')}
                            </h3>
                            <TextArea
                                placeholder={t('writeReply')}
                                value={replyText}
                                onChange={setReplyText}
                                rows={3}
                                maxLength={500}
                                showCount
                            />
                            <div className="flex gap-2">
                                <Button
                                    color="primary"
                                    fill="solid"
                                    size="middle"
                                    className="flex-1"
                                    loading={isSending}
                                    onClick={handleSendReply}
                                    disabled={!replyText.trim()}
                                    style={{ minHeight: '44px' }}
                                >
                                    {t('sendReply')}
                                </Button>
                                <Button
                                    color="success"
                                    fill="outline"
                                    size="middle"
                                    onClick={handleResolve}
                                    style={{ minHeight: '44px' }}
                                >
                                    <LuCheck size={16} className="inline mr-1" />
                                    {t('resolve')}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
