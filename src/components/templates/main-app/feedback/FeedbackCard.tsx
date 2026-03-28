'use client';

/**
 * FeedbackCard Component
 * 
 * Individual feedback card for the owner inbox.
 * Displays rating, message, contact info, and actions.
 * 
 * @see __docs__/projects/internal-feedback-system/
 */

import { StarDisplay } from '@atoms/GuestFeedbackForm/StarRating';
import { formatPhoneForDisplay, generateWhatsAppLink, isValidWhatsAppNumber } from '@lib/utils/whatsappLink';
import { GuestFeedback } from '@type/guestFeedback';
import { toDate } from '@util/dateTime';
import { timeAgo } from '@util/dateTime/timeAgo';
import { Button, Card, Tag, Tooltip, message } from 'antd';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import {
    FaCheck,
    FaEnvelope,
    FaPhone,
    FaUndo,
    FaUser,
    FaWhatsapp,
} from 'react-icons/fa';

interface FeedbackCardProps {
    /** Feedback data */
    feedback: GuestFeedback;
    /** Callback when status is updated */
    onStatusUpdate?: (feedbackId: string, status: 'new' | 'resolved') => Promise<void>;
    /** Store name (for multi-outlet display) */
    storeName?: string;
}

export const FeedbackCard: React.FC<FeedbackCardProps> = ({
    feedback,
    onStatusUpdate,
    storeName,
}) => {
    const t = useTranslations('FeedbackInbox');
    const [isUpdating, setIsUpdating] = useState(false);

    const hasContactInfo = feedback.customerPhone || feedback.customerEmail || feedback.customerName;
    const isResolved = feedback.status === 'resolved';
    const needsAttention = feedback.rating <= 3 && !isResolved;

    const handleStatusToggle = async () => {
        if (!onStatusUpdate) return;

        setIsUpdating(true);
        try {
            const newStatus = isResolved ? 'new' : 'resolved';
            await onStatusUpdate(feedback.id!, newStatus);
        } catch (error) {
            message.error(t('failedToUpdate'));
        } finally {
            setIsUpdating(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = toDate(timestamp);
        return timeAgo(date);
    };

    return (
        <Card
            className={`
                feedback-card mb-4 transition-all
                ${needsAttention ? 'border-l-4 border-l-red-400' : ''}
                ${isResolved ? 'opacity-75' : ''}
            `}
            size="small"
        >
            {/* Header Row */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <StarDisplay rating={feedback.rating} size={18} />

                    {/* Contact Indicator Badge */}
                    {hasContactInfo && (
                        <Tooltip title={t('contactProvided' as any)}>
                            <Tag color="blue" className="flex items-center gap-1">
                                <FaPhone size={10} />
                                {t('contact' as any)}
                            </Tag>
                        </Tooltip>
                    )}

                    {/* Status Badge */}
                    {isResolved && (
                        <Tag color="green">{t('resolved')}</Tag>
                    )}
                    {needsAttention && (
                        <Tag color="red">{t('needsAttention' as any)}</Tag>
                    )}
                </div>

                <div className="text-xs text-gray-400">
                    {formatDate(feedback.createdOn)}
                </div>
            </div>

            {/* Store Name (for HQ multi-outlet view) */}
            {storeName && (
                <div className="text-xs text-gray-500 mb-2">
                    {storeName}
                </div>
            )}

            {/* Message */}
            {feedback.message && (
                <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                    {feedback.message}
                </p>
            )}

            {/* Contact Info Section */}
            {hasContactInfo && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <div className="flex flex-wrap gap-4">
                        {feedback.customerName && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <FaUser size={12} className="text-gray-400" />
                                {feedback.customerName}
                            </div>
                        )}

                        {feedback.customerPhone && (
                            <div className="flex items-center gap-2">
                                <FaPhone size={12} className="text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    {formatPhoneForDisplay(feedback.customerPhone)}
                                </span>

                                {/* WhatsApp Button */}
                                {isValidWhatsAppNumber(feedback.customerPhone) && (
                                    <Tooltip title="Open WhatsApp">
                                        <a
                                            href={generateWhatsAppLink(
                                                feedback.customerPhone,
                                                `Hi${feedback.customerName ? ` ${feedback.customerName}` : ''}, thank you for your feedback. We'd love to make things right.`
                                            )}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                                        >
                                            <FaWhatsapp size={14} />
                                        </a>
                                    </Tooltip>
                                )}
                            </div>
                        )}

                        {feedback.customerEmail && (
                            <div className="flex items-center gap-2">
                                <FaEnvelope size={12} className="text-gray-400" />
                                <a
                                    href={`mailto:${feedback.customerEmail}`}
                                    className="text-sm text-blue-600 hover:underline"
                                >
                                    {feedback.customerEmail}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                    via {feedback.source === 'feedback_qr' ? 'QR Code' : 'Menu'}
                </div>

                <Button
                    size="small"
                    type={isResolved ? 'default' : 'primary'}
                    icon={isResolved ? <FaUndo size={12} /> : <FaCheck size={12} />}
                    loading={isUpdating}
                    onClick={handleStatusToggle}
                >
                    {isResolved ? t('markNew') : t('markResolved')}
                </Button>
            </div>

            {/* Owner Note (if resolved with note) */}
            {feedback.ownerNote && (
                <div className="mt-3 pt-3 border-t text-sm text-gray-500 italic">
                    Note: {feedback.ownerNote}
                </div>
            )}
        </Card>
    );
};

export default FeedbackCard;
