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
import { Button, Card, Tag, Tooltip, theme, message } from 'antd';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import {
    LuCheck,
    LuMail,
    LuMessageCircle,
    LuPhone,
    LuRotateCcw,
    LuUser,
} from 'react-icons/lu';

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
    const { token } = theme.useToken();
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
                ${isResolved ? 'opacity-75' : ''}
            `}
            style={{
                minWidth: 0,
                borderLeft: needsAttention ? `4px solid ${token.colorError}` : undefined,
            }}
            size="small"
        >
            {/* Header Row */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-3 gap-3">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                    <StarDisplay rating={feedback.rating} size={18} />

                    {/* Contact Indicator Badge */}
                    {hasContactInfo && (
                        <Tooltip title={t('contactProvided' as any)}>
                            <Tag color="processing" className="flex items-center gap-1">
                                <LuPhone size={10} />
                                {t('contact' as any)}
                            </Tag>
                        </Tooltip>
                    )}

                    {/* Status Badge */}
                    {isResolved && <Tag color="success">{t('resolved')}</Tag>}
                    {needsAttention && (
                        <Tag color="error">{t('needsAttention' as any)}</Tag>
                    )}
                </div>

                <div className="text-xs shrink-0" style={{ color: token.colorTextTertiary }}>
                    {formatDate(feedback.createdOn)}
                </div>
            </div>

            {/* Store Name (for HQ multi-outlet view) */}
            {storeName && (
                <div className="text-xs mb-2" style={{ color: token.colorTextSecondary }}>
                    {storeName}
                </div>
            )}

            {/* Message */}
            {feedback.message && (
                <p className="mb-4 whitespace-pre-wrap" style={{ color: token.colorText }}>
                    {feedback.message}
                </p>
            )}

            {/* Contact Info Section */}
            {hasContactInfo && (
                <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: token.colorFillSecondary, minWidth: 0 }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {feedback.customerName && (
                            <div className="flex items-center gap-2 text-sm min-w-0" style={{ color: token.colorTextSecondary }}>
                                <LuUser size={12} color={token.colorTextTertiary} />
                                <span className="truncate">{feedback.customerName}</span>
                            </div>
                        )}

                        {feedback.customerPhone && (
                            <div className="flex items-center gap-2 min-w-0">
                                <LuPhone size={12} color={token.colorTextTertiary} />
                                <span className="text-sm truncate" style={{ color: token.colorTextSecondary }}>
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
                                            className="inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors"
                                            style={{ background: token.colorSuccess, color: token.colorTextLightSolid }}
                                        >
                                            <LuMessageCircle size={14} />
                                        </a>
                                    </Tooltip>
                                )}
                            </div>
                        )}

                        {feedback.customerEmail && (
                            <div className="flex items-center gap-2 min-w-0">
                                <LuMail size={12} color={token.colorTextTertiary} />
                                <a
                                    href={`mailto:${feedback.customerEmail}`}
                                    className="text-sm truncate"
                                    style={{ color: token.colorLink }}
                                >
                                    {feedback.customerEmail}
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            )}

                {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs" style={{ color: token.colorTextTertiary }}>
                    via {feedback.source === 'feedback_qr' ? 'QR Code' : feedback.source === 'direct_link' ? 'Direct Link' : 'Menu Footer'}
                </div>

                <Button
                    size="small"
                    type={isResolved ? 'default' : 'primary'}
                    icon={isResolved ? <LuRotateCcw size={12} /> : <LuCheck size={12} />}
                    loading={isUpdating}
                    onClick={handleStatusToggle}
                >
                    {isResolved ? t('markNew') : t('markResolved')}
                </Button>
            </div>

            {/* Owner Note (if resolved with note) */}
            {feedback.ownerNote && (
                <div className="mt-3 pt-3 text-sm italic" style={{ borderTop: `1px solid ${token.colorBorder}`, color: token.colorTextSecondary }}>
                    Note: {feedback.ownerNote}
                </div>
            )}
        </Card>
    );
};

export default FeedbackCard;
