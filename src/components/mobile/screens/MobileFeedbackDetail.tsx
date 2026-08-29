'use client'

import {
    assertFeedbackStatusUpdateSucceeded,
    updateFeedbackStatus,
    type GuestFeedbackExpectedScope,
} from '@database/guestFeedback';
import { buildFeedbackReplyTemplates } from '@lib/feedback/feedbackReplyTemplates';
import { copyRuntimeTextToClipboard } from '@lib/runtime/runtimeDiagnostics';
import { generateWhatsAppLink, isValidWhatsAppNumber } from '@lib/utils/whatsappLink';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { formatDateTime } from '@util/dateTime';
import { theme } from 'antd';
import { useFormatter, useTranslations } from 'next-intl';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuCopy, LuMail, LuMessageCircle, LuPhone, LuStar } from 'react-icons/lu';
import { Button, Card, Flex, NavBar, Tag, Text, TextArea, Title, Toast } from '../antd';
import type { MobileFeedbackItemType } from '../types';
import {
    getBoundedMobileOwnerStringContext,
    getMobileOwnerStoreLogContext,
    logMobileOwnerFailure,
} from '../utils/mobileOwnerDiagnostics';

interface MobileFeedbackDetailProps {
    expectedScope: GuestFeedbackExpectedScope | null;
    feedback: MobileFeedbackItemType;
    onBack: () => void;
    onStatusUpdate: (feedbackId: string, status: 'new' | 'resolved') => void;
}

export default function MobileFeedbackDetail({ expectedScope, feedback, onBack, onStatusUpdate }: MobileFeedbackDetailProps) {
    const t = useTranslations('MobileFeedbackDetail');
    const { token } = theme.useToken();
    const format = useFormatter();
    const { storeDetails } = useContext(PlatformGlobalDataContext);
    const [replyText, setReplyText] = useState('');
    const [isCopying, setIsCopying] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const isMountedRef = useRef(true);
    const resolveInFlightRef = useRef(false);
    const copyInFlightRef = useRef(false);
    const currentFeedbackRef = useRef(feedback);
    currentFeedbackRef.current = feedback;
    const isExpectedOperation = (
        sourceScope: GuestFeedbackExpectedScope,
        sourceFeedback: MobileFeedbackItemType,
    ) => (
        isMountedRef.current
        && currentFeedbackRef.current === sourceFeedback
        && Number(storeDetails?.tenantId) === sourceScope.tenantId
        && Number(storeDetails?.storeId) === sourceScope.storeId
    );
    const replyTemplates = useMemo(() => buildFeedbackReplyTemplates({
        customerName: feedback.customerName,
        rating: feedback.rating,
        storeName: storeDetails?.name,
    }), [feedback.customerName, feedback.rating, storeDetails?.name]);
    const canOpenWhatsApp = Boolean(feedback.phone && isValidWhatsAppNumber(feedback.phone));

    useEffect(() => () => {
        isMountedRef.current = false;
    }, []);

    const getFeedbackWriteLogContext = (nextStatus: 'new' | 'resolved', replyLength?: number) => ({
        ...getMobileOwnerStoreLogContext(storeDetails?.storeId, storeDetails?.tenantId),
        ...getBoundedMobileOwnerStringContext('feedbackId', feedback.id),
        previousStatus: feedback.status,
        nextStatus,
        needsAttention: Boolean(feedback.needsAttention),
        rating: Number.isFinite(Number(feedback.rating)) ? Number(feedback.rating) : undefined,
        ...(replyLength === undefined ? {} : {
            hasReplyText: replyLength > 0,
            replyLength,
        }),
    });

    const statusTag = feedback.status === 'resolved'
        ? <Tag color="success">{t('resolve')}</Tag>
        : <Tag color={feedback.needsAttention ? 'warning' : 'primary'}>{feedback.needsAttention ? t('needsAttention') : t('statusNew')}</Tag>;

    const handleResolve = async () => {
        const sourceScope = expectedScope;
        const sourceFeedback = feedback;
        if (
            !sourceScope
            || !isExpectedOperation(sourceScope, sourceFeedback)
            || resolveInFlightRef.current
        ) return;
        resolveInFlightRef.current = true;
        setIsResolving(true);
        try {
            const updated = await updateFeedbackStatus(
                sourceFeedback.id,
                'resolved',
                undefined,
                sourceScope,
            );
            assertFeedbackStatusUpdateSucceeded(
                updated,
                sourceFeedback.id,
                'resolved',
                'mobile_feedback_status_update_rejected',
            );
            if (!isExpectedOperation(sourceScope, sourceFeedback)) return;
            onStatusUpdate(sourceFeedback.id, 'resolved');
            Toast.show({ content: t('markedResolved'), duration: 1000 });
        } catch (error) {
            if (isExpectedOperation(sourceScope, sourceFeedback)) {
                logMobileOwnerFailure('mobile_feedback_status_update_failed', error, getFeedbackWriteLogContext('resolved'));
                Toast.show({ content: t('failedToUpdate'), duration: 2000 });
            }
        } finally {
            resolveInFlightRef.current = false;
            if (isExpectedOperation(sourceScope, sourceFeedback)) {
                setIsResolving(false);
            }
        }
    };

    const handleCopyReply = async () => {
        const trimmedReply = replyText.trim();
        const sourceScope = expectedScope;
        const sourceFeedback = feedback;
        if (
            !trimmedReply
            || !sourceScope
            || !isExpectedOperation(sourceScope, sourceFeedback)
            || copyInFlightRef.current
        ) return;
        copyInFlightRef.current = true;
        setIsCopying(true);
        try {
            await copyRuntimeTextToClipboard(trimmedReply);
            if (!isExpectedOperation(sourceScope, sourceFeedback)) return;
            Toast.show({ content: t('replyCopied'), duration: 1500 });
        } catch (error) {
            if (isExpectedOperation(sourceScope, sourceFeedback)) {
                logMobileOwnerFailure('mobile_feedback_reply_copy_failed', error, getFeedbackWriteLogContext(sourceFeedback.status, trimmedReply.length));
                Toast.show({ content: t('failedToCopy'), duration: 2000 });
            }
        } finally {
            copyInFlightRef.current = false;
            if (isExpectedOperation(sourceScope, sourceFeedback)) {
                setIsCopying(false);
            }
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
                                <Text type="secondary">{feedback.createdAt ? formatDateTime(feedback.createdAt, 'date', format) : ''}</Text>
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
                                    <LuStar
                                        color={star <= feedback.rating ? token.colorWarning : token.colorTextDisabled}
                                        fill={star <= feedback.rating ? token.colorWarning : 'none'}
                                        key={star}
                                        size={18}
                                    />
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
                            <Flex gap={8} vertical>
                                <Text strong>{t('replyDrafts')}</Text>
                                <Flex gap={8} wrap="wrap">
                                    {replyTemplates.map((replyTemplate) => (
                                        <Button
                                            fill={replyText === replyTemplate.message ? 'solid' : 'outline'}
                                            key={replyTemplate.id}
                                            onClick={() => setReplyText(replyTemplate.message)}
                                            size="small"
                                            style={{ minHeight: 44 }}
                                        >
                                            {replyTemplate.title}
                                        </Button>
                                    ))}
                                </Flex>
                            </Flex>
                            <TextArea
                                aria-label={t('writeReply')}
                                maxLength={500}
                                onChange={setReplyText}
                                placeholder={t('writeReply')}
                                rows={4}
                                showCount
                                style={{ borderRadius: 16 }}
                                value={replyText}
                            />
                            <Flex gap={8}>
                                <Button block disabled={!replyText.trim() || isResolving} loading={isCopying} onClick={() => void handleCopyReply()}>
                                    <Flex align="center" gap={6} justify="center">
                                        <LuCopy size={16} />
                                        <Text>{t('copyReply')}</Text>
                                    </Flex>
                                </Button>
                                {canOpenWhatsApp && feedback.phone ? (
                                    <Button
                                        block
                                        disabled={!replyText.trim() || isResolving}
                                        fill="outline"
                                        onClick={() => {
                                            window.location.href = generateWhatsAppLink(feedback.phone!, replyText.trim());
                                        }}
                                    >
                                        <Flex align="center" gap={6} justify="center">
                                            <LuMessageCircle size={16} />
                                            <Text>{t('openWhatsApp')}</Text>
                                        </Flex>
                                    </Button>
                                ) : null}
                            </Flex>
                            <Button block disabled={isCopying} fill="outline" loading={isResolving} onClick={() => void handleResolve()} style={{ borderColor: token.colorSuccess, color: token.colorSuccess }}>
                                    <Flex align="center" gap={6} justify="center">
                                        <LuCheck size={16} />
                                        <Text style={{ color: token.colorSuccess }}>{t('resolve')}</Text>
                                    </Flex>
                            </Button>
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
