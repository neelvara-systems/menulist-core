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
import { buildFeedbackReplyTemplates, type FeedbackReplyTemplate } from '@lib/feedback/feedbackReplyTemplates';
import { formatPhoneForDisplay, generateWhatsAppLink, isValidWhatsAppNumber } from '@lib/utils/whatsappLink';
import { GuestFeedback } from '@type/guestFeedback';
import { toDate } from '@util/dateTime';
import { timeAgo } from '@util/dateTime/timeAgo';
import { Button, Card, Tag, Tooltip, theme, App } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import React, { useState } from 'react';
import {
    LuCheck,
    LuCopy,
    LuMail,
    LuMessageCircle,
    LuPhone,
    LuRotateCcw,
    LuUser,
} from 'react-icons/lu';
import { getBoundedFeedbackInboxStringContext, logFeedbackInboxFailure } from './feedbackInboxDiagnostics';

const DESKTOP_FEEDBACK_REPLY_COPY_UNAVAILABLE = 'desktop_feedback_reply_copy_unavailable';
const DESKTOP_FEEDBACK_REPLY_COPY_FALLBACK_FAILED = 'desktop_feedback_reply_copy_fallback_failed';

const hasFeedbackReplyClipboardWrite = () =>
    typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function';

const hasFeedbackReplyCopyFallback = () =>
    typeof document !== 'undefined'
    && Boolean(document.body)
    && typeof document.createElement === 'function'
    && typeof document.execCommand === 'function';

async function copyFeedbackReplyToClipboard(value: string): Promise<void> {
    let clipboardWriteError: unknown;

    if (hasFeedbackReplyClipboardWrite()) {
        try {
            await navigator.clipboard.writeText(value);
            return;
        } catch (error) {
            clipboardWriteError = error;
        }
    }

    if (!hasFeedbackReplyCopyFallback()) {
        throw Object.assign(new Error(DESKTOP_FEEDBACK_REPLY_COPY_UNAVAILABLE), {
            code: DESKTOP_FEEDBACK_REPLY_COPY_UNAVAILABLE,
            clipboardWriteRejected: Boolean(clipboardWriteError),
        });
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.readOnly = true;
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';

    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
        const copied = document.execCommand('copy');
        if (!copied) {
            throw Object.assign(new Error(DESKTOP_FEEDBACK_REPLY_COPY_FALLBACK_FAILED), {
                code: DESKTOP_FEEDBACK_REPLY_COPY_FALLBACK_FAILED,
            });
        }
    } finally {
        document.body.removeChild(textarea);
    }
}

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
    const { message: messageApi } = App.useApp();
    const t = useTranslations('FeedbackInbox');
    const locale = useLocale();
    const { token } = theme.useToken();
    const [isUpdating, setIsUpdating] = useState(false);

    const hasContactInfo = feedback.customerPhone || feedback.customerEmail || feedback.customerName;
    const isResolved = feedback.status === 'resolved';
    const needsAttention = feedback.rating <= 3 && !isResolved;
    const replyTemplates = buildFeedbackReplyTemplates({
        customerName: feedback.customerName,
        rating: feedback.rating,
        storeName,
    });
    const primaryReplyTemplate = replyTemplates[0];
    const canOpenWhatsApp = Boolean(feedback.customerPhone && isValidWhatsAppNumber(feedback.customerPhone));

    const handleStatusToggle = async () => {
        if (!onStatusUpdate) return;

        setIsUpdating(true);
        try {
            const newStatus = isResolved ? 'new' : 'resolved';
            await onStatusUpdate(feedback.id!, newStatus);
        } catch (error) {
            messageApi.error(t('failedToUpdate'));
        } finally {
            setIsUpdating(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = toDate(timestamp);
        return timeAgo(date, locale);
    };

    const handleCopyReply = async (replyTemplate: FeedbackReplyTemplate) => {
        try {
            await copyFeedbackReplyToClipboard(replyTemplate.message);
            messageApi.success('Reply copied');
        } catch (error) {
            logFeedbackInboxFailure('desktop_feedback_reply_copy_failed', error, {
                ...getBoundedFeedbackInboxStringContext('feedbackId', feedback.id),
                ...getBoundedFeedbackInboxStringContext('templateId', replyTemplate.id),
                ...getBoundedFeedbackInboxStringContext('templateTitle', replyTemplate.title),
                replyMessageLength: replyTemplate.message.length,
                hasClipboardWrite: hasFeedbackReplyClipboardWrite(),
                hasCopyFallback: hasFeedbackReplyCopyFallback(),
            });
            messageApi.error('Could not copy reply');
        }
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
                                {canOpenWhatsApp && (
                                    <Tooltip title="Open WhatsApp">
                                        <a
                                            href={generateWhatsAppLink(
                                                feedback.customerPhone,
                                                primaryReplyTemplate.message
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

            {needsAttention && (
                <div
                    className="rounded-lg p-3 mb-4"
                    style={{ backgroundColor: token.colorFillTertiary, border: `1px solid ${token.colorBorderSecondary}` }}
                >
                    <div className="text-sm font-medium mb-2" style={{ color: token.colorText }}>
                        Reply drafts
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                        {replyTemplates.map((replyTemplate) => (
                            <div
                                key={replyTemplate.id}
                                className="rounded-md p-2 flex flex-col gap-2 min-w-0"
                                style={{ backgroundColor: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` }}
                            >
                                <div className="text-xs font-medium" style={{ color: token.colorText }}>
                                    {replyTemplate.title}
                                </div>
                                <div
                                    className="text-xs whitespace-pre-wrap"
                                    style={{ color: token.colorTextSecondary, lineHeight: 1.45 }}
                                >
                                    {replyTemplate.message}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button
                                        icon={<LuCopy size={12} />}
                                        onClick={() => void handleCopyReply(replyTemplate)}
                                        size="small"
                                    >
                                        Copy
                                    </Button>
                                    {canOpenWhatsApp && feedback.customerPhone && (
                                        <Button
                                            href={generateWhatsAppLink(feedback.customerPhone, replyTemplate.message)}
                                            icon={<LuMessageCircle size={12} />}
                                            rel="noopener noreferrer"
                                            size="small"
                                            target="_blank"
                                            type="link"
                                        >
                                            WhatsApp
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
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
